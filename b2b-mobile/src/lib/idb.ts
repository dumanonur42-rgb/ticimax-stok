import type { Product } from '@shared/types'
import { secureStorage } from './secureStorage'

const DB_NAME = 'yamansa-rulman-b2b'
const DB_VERSION = 2
const BUCKET_COUNT = 32
const CATALOG_KEY = 'yamansa-b2b-catalog-key'

interface EncryptedRecord {
  iv: ArrayBuffer
  data: ArrayBuffer
}

interface BucketRecord extends EncryptedRecord {
  bucket: number
}

interface StateRecord extends EncryptedRecord {
  key: string
}

let dbPromise: Promise<IDBDatabase> | null = null
let cryptoKey: CryptoKey | null = null
let keyPromise: Promise<CryptoKey | null> | null = null
let productsLoaded = false
let productMap = new Map<number, Product>()
let locked = false
let epoch = 0
let dirty = new Set<number>()
let versions = new Map<number, number>()
let persist: Promise<void> | null = null
let timer: number | null = null
export let lastCatalogDecryptMs = 0

export function hasLegacyCatalog(): Promise<boolean> {
  return (async () => {
    if (typeof indexedDB.databases === 'function') {
      const databases = await indexedDB.databases()
      if (!databases.some((database) => database.name === DB_NAME)) return false
    }
    return new Promise<boolean>((resolve) => {
      const request = indexedDB.open(DB_NAME)
      request.onsuccess = () => {
        const db = request.result
        const legacy = db.version < DB_VERSION
        db.close()
        resolve(legacy)
      }
      request.onerror = () => resolve(false)
    })
  })()
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = request.result
      if (event.oldVersion < 2) {
        if (db.objectStoreNames.contains('products')) db.deleteObjectStore('products')
        if (db.objectStoreNames.contains('state')) db.deleteObjectStore('state')
      }
      if (!db.objectStoreNames.contains('products')) db.createObjectStore('products', { keyPath: 'bucket' })
      if (!db.objectStoreNames.contains('state')) db.createObjectStore('state', { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error ?? new Error('Yerel katalog açılamadı.'))
    }
  })
  return dbPromise
}

function hexBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function hexString(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function getKey(create: boolean): Promise<CryptoKey | null> {
  if (locked) {
    if (create) throw new Error('Yerel katalog oturum kapalıyken yazılamaz.')
    return null
  }
  if (cryptoKey) return cryptoKey
  if (keyPromise) {
    const pendingKey = await keyPromise
    return pendingKey ?? (create ? getKey(true) : null)
  }
  const pending = (async () => {
    let value = await secureStorage.getItem(CATALOG_KEY)
    if (!value && create) {
      if (locked) throw new Error('Yerel katalog oturum kapalıyken yazılamaz.')
      value = hexString(crypto.getRandomValues(new Uint8Array(32)))
      await secureStorage.setItem(CATALOG_KEY, value)
    }
    if (!value) return null
    const raw = hexBytes(value)
    cryptoKey = await crypto.subtle.importKey('raw', raw.buffer as ArrayBuffer, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
    return cryptoKey
  })()
  keyPromise = pending
  try {
    return await pending
  } finally {
    if (keyPromise === pending) keyPromise = null
  }
}

async function encrypt(value: unknown, key: CryptoKey): Promise<EncryptedRecord> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  return { iv: iv.buffer, data: await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(value))) }
}

async function decrypt<T>(record: EncryptedRecord, key: CryptoKey): Promise<T> {
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: record.iv }, key, record.data)
  return JSON.parse(new TextDecoder().decode(bytes)) as T
}

function bucketOf(id: number): number {
  return Math.abs(Math.trunc(id)) % BUCKET_COUNT
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Yerel katalog işlemi başarısız oldu.'))
  })
}

async function loadProducts(): Promise<void> {
  if (productsLoaded) return
  const key = await getKey(false)
  if (!key) {
    productMap.clear()
    await clearStores()
    productsLoaded = true
    return
  }
  const db = await openDb()
  const records = await new Promise<BucketRecord[]>((resolve, reject) => {
    const request = db.transaction('products', 'readonly').objectStore('products').getAll()
    request.onsuccess = () => resolve(request.result as BucketRecord[])
    request.onerror = () => reject(request.error)
  })
  const started = performance.now()
  try {
    const buckets = await Promise.all(records.map((record) => decrypt<Product[]>(record, key)))
    productMap = new Map(buckets.flat().map((product) => [product.id, product]))
  } catch (error) {
    productMap.clear()
    await clearStores()
    await secureStorage.removeItem(CATALOG_KEY)
    cryptoKey = null
    console.warn('Encrypted catalog could not be read; it will be downloaded again.', error)
  }
  lastCatalogDecryptMs = performance.now() - started
  productsLoaded = true
  console.info(`Encrypted catalog decrypted in ${lastCatalogDecryptMs.toFixed(1)} ms (${productMap.size} products).`)
}

async function clearStores(): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['products', 'state'], 'readwrite')
  tx.objectStore('products').clear()
  tx.objectStore('state').clear()
  await transactionDone(tx)
}

async function flushBuckets(operationEpoch: number): Promise<void> {
  while (dirty.size) {
    if (locked || operationEpoch !== epoch) throw new Error('Yerel katalog yazımı iptal edildi.')
    const selected = [...dirty].map((bucket) => [bucket, versions.get(bucket) ?? 0] as const)
    const key = await getKey(true)
    if (!key) throw new Error('Katalog anahtarı oluşturulamadı.')
    const records = await Promise.all(selected.map(async ([bucket, version]) => ({
      bucket, version,
      record: { bucket, ...await encrypt([...productMap.values()].filter((product) => bucketOf(product.id) === bucket), key) }
    })))
    if (locked || operationEpoch !== epoch) throw new Error('Yerel katalog yazımı iptal edildi.')
    const db = await openDb()
    if (locked || operationEpoch !== epoch) throw new Error('Yerel katalog yazımı iptal edildi.')
    const tx = db.transaction('products', 'readwrite')
    const store = tx.objectStore('products')
    for (const { record } of records) store.put(record)
    await transactionDone(tx)
    for (const { bucket, version } of records) if (versions.get(bucket) === version) dirty.delete(bucket)
  }
}

function schedulePersist(): Promise<void> {
  if (persist) return persist
  const operationEpoch = epoch
  persist = new Promise((resolve, reject) => {
    timer = window.setTimeout(() => {
      timer = null
      void flushBuckets(operationEpoch).then(resolve, reject).finally(() => { persist = null })
    }, 25)
  })
  return persist
}

function markDirty(bucket: number): void {
  dirty.add(bucket)
  versions.set(bucket, (versions.get(bucket) ?? 0) + 1)
}

export async function readProducts(): Promise<Product[]> {
  if (locked) return []
  await loadProducts()
  return [...productMap.values()]
}

export async function putProducts(products: Product[]): Promise<void> {
  if (!products.length) return
  const operationEpoch = epoch
  await loadProducts()
  if (locked || operationEpoch !== epoch) throw new Error('Yerel katalog yazımı iptal edildi.')
  for (const product of products) {
    productMap.set(product.id, product)
    markDirty(bucketOf(product.id))
  }
  await schedulePersist()
}

export async function removeProducts(ids: number[]): Promise<void> {
  if (!ids.length) return
  const operationEpoch = epoch
  await loadProducts()
  if (locked || operationEpoch !== epoch) throw new Error('Yerel katalog yazımı iptal edildi.')
  for (const id of ids) {
    productMap.delete(id)
    markDirty(bucketOf(id))
  }
  await schedulePersist()
}

export async function replaceProducts(products: Product[]): Promise<void> {
  const operationEpoch = epoch
  await loadProducts()
  if (locked || operationEpoch !== epoch) throw new Error('Yerel katalog yazımı iptal edildi.')
  productMap.clear()
  for (const product of products) productMap.set(product.id, product)
  for (let bucket = 0; bucket < BUCKET_COUNT; bucket++) markDirty(bucket)
  await schedulePersist()
}

export async function unlockCatalogStorage(): Promise<void> {
  locked = false
}

export async function clearLocalCatalog(): Promise<void> {
  locked = true
  epoch++
  if (timer !== null) window.clearTimeout(timer)
  timer = null
  await persist?.catch(() => undefined)
  await keyPromise?.catch(() => undefined)
  persist = null
  await clearStores()
  productMap.clear()
  productsLoaded = true
  dirty.clear()
  versions.clear()
  cryptoKey = null
  keyPromise = null
  await secureStorage.removeItem(CATALOG_KEY)
}

export async function getState(key: string): Promise<string | null> {
  if (locked) return null
  const cryptoKey = await getKey(false)
  if (!cryptoKey) return null
  const db = await openDb()
  const record = await new Promise<StateRecord | undefined>((resolve, reject) => {
    const request = db.transaction('state', 'readonly').objectStore('state').get(key)
    request.onsuccess = () => resolve(request.result as StateRecord | undefined)
    request.onerror = () => reject(request.error)
  })
  return record ? decrypt<string>(record, cryptoKey) : null
}

export async function setState(key: string, value: string): Promise<void> {
  const operationEpoch = epoch
  if (locked) throw new Error('Yerel katalog yazımı iptal edildi.')
  const cryptoKey = await getKey(true)
  if (!cryptoKey) throw new Error('Katalog anahtarı oluşturulamadı.')
  if (locked || operationEpoch !== epoch) throw new Error('Yerel katalog yazımı iptal edildi.')
  const record = { key, ...await encrypt(value, cryptoKey) }
  if (locked || operationEpoch !== epoch) throw new Error('Yerel katalog yazımı iptal edildi.')
  const db = await openDb()
  if (locked || operationEpoch !== epoch) throw new Error('Yerel katalog yazımı iptal edildi.')
  const tx = db.transaction('state', 'readwrite')
  tx.objectStore('state').put(record)
  await transactionDone(tx)
}
