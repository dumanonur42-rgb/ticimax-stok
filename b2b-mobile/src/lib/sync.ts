import type { Product } from '@shared/types'
import type { ProductRow } from '@desktopDatabase'
import { hasPerm } from '@shared/perms'
import { getState, putProducts, readProducts, removeProducts, replaceProducts, setState } from './idb'
import { loadSettings, supabase } from './cloud'
import { useApp } from '../store/app'
import { catalogRequest, CatalogSyncAbortedError } from './catalogRequest'
import { catalogStorage } from './catalogStorage'

const PAGE_SIZE = 1000
const PRODUCT_COLUMNS = [
  'id', 'sku', 'name', 'brand', 'category', 'type', 'seal', 'd_inner', 'd_outer', 'width',
  'stock', 'unit', 'price', 'currency', 'list_price', 'card_price', 'min_order', 'shelf', 'locations',
  'box', 'barcode', 'description', 'equivalents', 'active', 'deleted', 'updated_at'
].join(',')

interface ProductStoragePolicy {
  canSeeShelf: boolean
  hidePrices: boolean
  signature: string
}

let pendingPull: Promise<{ products: Product[]; changed: number }> | null = null
let pullController: AbortController | null = null
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null
let realtimeTimer: ReturnType<typeof setTimeout> | null = null

function storagePolicy(): ProductStoragePolicy {
  const user = useApp.getState().session?.user
  const settings = useApp.getState().settings
  const canSeeShelf = user?.role === 'admin' || user?.role === 'ara' || hasPerm(user, 'shelf')
  const canSeePrices = user?.role === 'admin' ||
    settings.show_prices_to_dealers !== false ||
    hasPerm(user, 'prices')
  return {
    canSeeShelf,
    hidePrices: !!user && user.role !== 'admin' && !canSeePrices,
    signature: JSON.stringify({
      role: user?.role ?? null,
      shelf: canSeeShelf,
      prices: hasPerm(user, 'prices'),
      showPricesToDealers: settings.show_prices_to_dealers !== false
    })
  }
}

function toProduct(row: ProductRow, policy: ProductStoragePolicy): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    category: row.category,
    type: row.type,
    seal: row.seal,
    d_inner: row.d_inner == null ? null : Number(row.d_inner),
    d_outer: row.d_outer == null ? null : Number(row.d_outer),
    width: row.width == null ? null : Number(row.width),
    stock: Number(row.stock),
    unit: row.unit,
    price: policy.hidePrices ? null : Number(row.price),
    currency: row.currency,
    list_price: policy.hidePrices || row.list_price == null ? null : Number(row.list_price),
    card_price: policy.hidePrices || row.card_price == null ? null : Number(row.card_price),
    min_order: Number(row.min_order),
    shelf: policy.canSeeShelf ? row.shelf : '',
    locations: policy.canSeeShelf ? row.locations ?? [] : [],
    box: row.box,
    barcode: row.barcode,
    image: '',
    description: row.description,
    equivalents: row.equivalents,
    active: row.active ? 1 : 0,
    updated_at: row.updated_at
  }
}

async function generation(signal: AbortSignal): Promise<string> {
  const { data, error } = await catalogRequest(requestSignal => supabase.from('settings').select('value').eq('key', 'catalog_generation').abortSignal(requestSignal).maybeSingle(), signal)
  if (error) throw error
  return data ? String(data.value) : '0'
}

function cursorOf(products: Product[]): { time: string; id: number } {
  let latest: Product | null = null
  for (const product of products) {
    if (!latest || product.updated_at > latest.updated_at || (product.updated_at === latest.updated_at && product.id > latest.id)) latest = product
  }
  return latest ? { time: latest.updated_at, id: latest.id } : { time: new Date(0).toISOString(), id: 0 }
}

function assertActive(signal: AbortSignal): void {
  if (signal.aborted) throw new CatalogSyncAbortedError()
}

async function pull(signal: AbortSignal): Promise<{ products: Product[]; changed: number }> {
  useApp.getState().setSettings(await catalogRequest(requestSignal => loadSettings(requestSignal), signal))
  const currentGeneration = await generation(signal)
  const policy = storagePolicy()
  const [storedGeneration, storedTime, storedPolicy] = await catalogStorage(() => Promise.all([
    getState('catalog_generation'),
    getState('products_cursor_time'),
    getState('product_storage_policy')
  ]))
  const policyChanged = storedPolicy !== policy.signature
  assertActive(signal)
  const full = !storedTime || storedGeneration !== currentGeneration || policyChanged
  let changed = 0

  if (full) {
    const products: Product[] = []
    let afterId = 0
    for (;;) {
      const { data, error } = await catalogRequest(requestSignal => supabase.from('products')
        .select(PRODUCT_COLUMNS)
        .eq('active', true)
        .eq('deleted', false)
        .gt('id', afterId)
        .order('id')
        .limit(PAGE_SIZE).abortSignal(requestSignal), signal)
      assertActive(signal)
      if (error) throw error
      const rows = (data ?? []) as unknown as ProductRow[]
      if (!rows.length) break
      products.push(...rows.map((row) => toProduct(row, policy)))
      afterId = rows[rows.length - 1].id
    }
    assertActive(signal)
    await catalogStorage(() => replaceProducts(products))
    assertActive(signal)
    const cursor = cursorOf(products)
    await catalogStorage(() => Promise.all([
      setState('products_cursor_time', cursor.time),
      setState('products_cursor_id', String(cursor.id)),
      setState('catalog_generation', currentGeneration),
      setState('product_storage_policy', policy.signature)
    ]))
    changed = Math.max(1, products.length)
  } else {
    let time = new Date(new Date(storedTime).getTime() - 5 * 60_000).toISOString()
    let id = 0
    for (;;) {
      const { data, error } = await catalogRequest(requestSignal => supabase.from('products')
        .select(PRODUCT_COLUMNS)
        .or(`updated_at.gt.${time},and(updated_at.eq.${time},id.gt.${id})`)
        .order('updated_at')
        .order('id')
        .limit(PAGE_SIZE).abortSignal(requestSignal), signal)
      assertActive(signal)
      if (error) throw error
      const rows = (data ?? []) as unknown as ProductRow[]
      if (!rows.length) break
      const active = rows.filter((row) => row.active && !row.deleted).map((row) => toProduct(row, policy))
      const removed = rows.filter((row) => !row.active || row.deleted).map((row) => row.id)
      await catalogStorage(() => Promise.all([putProducts(active), removeProducts(removed)]))
      assertActive(signal)
      const last = rows[rows.length - 1]
      time = last.updated_at
      id = last.id
      changed += rows.length
    }
    if (changed) {
      await catalogStorage(() => Promise.all([
        setState('products_cursor_time', time),
        setState('products_cursor_id', String(id))
      ]))
    }
  }
  const products = await catalogStorage(() => readProducts())
  assertActive(signal)
  return { products, changed }
}

export function syncCatalog(): Promise<{ products: Product[]; changed: number }> {
  if (pendingPull) return pendingPull
  pullController = new AbortController()
  pendingPull = pull(pullController.signal).finally(() => { pendingPull = null; pullController = null })
  return pendingPull
}

export function abortCatalogSync(): void {
  pullController?.abort()
}

export async function refreshSettings(): Promise<void> {
  useApp.getState().setSettings(await catalogRequest(signal => loadSettings(signal)))
}

export function startRealtime(onChange: () => void): () => void {
  stopRealtime()
  realtimeChannel = supabase.channel('yamansa-b2b-android')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
      void refreshSettings().then(onChange).catch(() => undefined)
    })
    .subscribe()
  return stopRealtime
}

function stopRealtime(): void {
  if (realtimeTimer) clearTimeout(realtimeTimer)
  realtimeTimer = null
  if (realtimeChannel) void supabase.removeChannel(realtimeChannel)
  realtimeChannel = null
}

export function debounceSync(onChange: () => void): void {
  if (realtimeTimer) clearTimeout(realtimeTimer)
  realtimeTimer = setTimeout(onChange, 1500)
}
