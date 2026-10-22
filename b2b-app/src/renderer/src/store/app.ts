import type { Product, Session, Settings, PaymentType } from '@shared/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

export type Page = 'dashboard' | 'catalog' | 'cart' | 'orders' | 'stock' | 'customers' | 'import' | 'settings' | 'help' | 'activity'

export interface Toast {
  id: number
  kind: 'info' | 'success' | 'error'
  text: string
}

interface AppState {
  session: Session | null
  settings: Settings | null
  page: Page
  pageParam: number | null
  toasts: Toast[]
  sidebarCollapsed: boolean
  setSession: (s: Session | null) => void
  loadSettings: () => Promise<void>
  updateSettings: (patch: Partial<Settings>) => Promise<void>
  go: (page: Page, param?: number | null) => void
  toast: (text: string, kind?: Toast['kind']) => void
  dismissToast: (id: number) => void
  toggleSidebar: () => void
}

let toastSeq = 0
const recentToasts = new Map<string, number>()

export const useApp = create<AppState>()((set, get) => ({
  session: null,
  settings: null,
  page: 'dashboard',
  pageParam: null,
  toasts: [],
  sidebarCollapsed: false,
  setSession: (session) => set({ session }),
  loadSettings: async () => set({ settings: await api('settings:get', undefined) }),
  updateSettings: async (patch) => {
    const cur = get().settings
    if (cur) set({ settings: { ...cur, ...patch } })
    set({ settings: await api('settings:set', patch) })
  },
  go: (page, param = null) => set({ page, pageParam: param }),
  toast: (text, kind = 'info') => {
    const key = `${kind}:${text}`
    const now = Date.now()
    if (now - (recentToasts.get(key) ?? 0) < 2500) return
    recentToasts.set(key, now)
    for (const [message, at] of recentToasts) if (now - at > 10_000) recentToasts.delete(message)
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }))
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 8000 : 4000)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }))
}))

export interface CartLine {
  product_id: number
  sku: string
  name: string
  brand: string
  qty: number
  unit_price: number
  card_price: number | null
  currency: Product['currency']
  stock: number
  min_order: number
}

interface CartState {
  lines: CartLine[]
  customerId: number | null
  note: string
  payment: PaymentType
  add: (p: Product, qty?: number) => void
  setQty: (product_id: number, qty: number) => void
  remove: (product_id: number) => void
  clear: () => void
  setCustomer: (id: number | null) => void
  setNote: (n: string) => void
  setPayment: (p: PaymentType) => void
  refreshFrom: (products: Product[]) => void
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      customerId: null,
      note: '',
      payment: 'pesin',
      add: (p, qty) => {
        const step = qty ?? Math.max(1, p.min_order || 1)
        set((s) => {
          const ex = s.lines.find((l) => l.product_id === p.id)
          if (ex) return { lines: s.lines.map((l) => (l.product_id === p.id ? { ...l, qty: l.qty + step } : l)) }
          return {
            lines: [
              ...s.lines,
              {
                product_id: p.id,
                sku: p.sku,
                name: p.name,
                brand: p.brand,
                qty: step,
                unit_price: p.price ?? 0,
                card_price: p.card_price,
                currency: p.currency,
                stock: p.stock,
                min_order: p.min_order || 1
              }
            ]
          }
        })
        void api('activity:log', { kind: 'cart_add', product_id: p.id, sku: p.sku, brand: p.brand, qty: step }).catch(() => undefined)
      },
      setQty: (product_id, qty) =>
        set((s) => ({
          lines: qty <= 0 ? s.lines.filter((l) => l.product_id !== product_id) : s.lines.map((l) => (l.product_id === product_id ? { ...l, qty } : l))
        })),
      remove: (product_id) => set((s) => ({ lines: s.lines.filter((l) => l.product_id !== product_id) })),
      clear: () => set({ lines: [], note: '' }),
      setCustomer: (customerId) => set({ customerId }),
      setNote: (note) => set({ note }),
      setPayment: (payment) => set({ payment }),
      refreshFrom: (products) =>
        set((s) => {
          const byId = new Map(products.map((product) => [product.id, product]))
          const bySkuAndBrand = new Map(products.map((product) => [`${product.sku}\u0000${product.brand}`, product]))
          const bySku = new Map(products.map((product) => [product.sku, product]))
          return {
            lines: s.lines.map((line) => {
              const product = byId.get(line.product_id) ?? bySkuAndBrand.get(`${line.sku}\u0000${line.brand}`) ?? bySku.get(line.sku)
              return product
                ? { ...line, product_id: product.id, unit_price: product.price ?? 0, card_price: product.card_price, currency: product.currency, stock: product.stock, name: product.name, sku: product.sku }
                : line
            })
          }
        })
    }),
    { name: 'yamansa-cart' }
  )
)
