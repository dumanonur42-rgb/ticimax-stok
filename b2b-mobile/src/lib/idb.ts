import type { Product } from '@shared/types'

const DB_NAME = 'yamansa-rulman-b2b'
const DB_VERSION = 1

interface StateRecord {
  key: string
  value: string
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('products')) db.createObjectStore('products', { keyPath: 'id' })
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

export async function readProducts(): Promise<Product[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction('products', 'readonly').objectStore('products').getAll()
    request.onsuccess = () => resolve(request.result as Product[])
    request.onerror = () => reject(request.error)
  })
}

export async function putProducts(products: Product[]): Promise<void> {
  if (!products.length) return
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite')
    const store = tx.objectStore('products')
    for (const product of products) store.put(product)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Katalog kaydedilemedi.'))
  })
}

export async function removeProducts(ids: number[]): Promise<void> {
  if (!ids.length) return
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite')
    const store = tx.objectStore('products')
    for (const id of ids) store.delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Katalog güncellenemedi.'))
  })
}

export async function replaceProducts(products: Product[]): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite')
    const store = tx.objectStore('products')
    store.clear()
    for (const product of products) store.put(product)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Katalog yenilenemedi.'))
  })
}

export async function getState(key: string): Promise<string | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction('state', 'readonly').objectStore('state').get(key)
    request.onsuccess = () => resolve((request.result as StateRecord | undefined)?.value ?? null)
    request.onerror = () => reject(request.error)
  })
}

export async function setState(key: string, value: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('state', 'readwrite')
    tx.objectStore('state').put({ key, value } satisfies StateRecord)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Eşitleme bilgisi kaydedilemedi.'))
  })
}
