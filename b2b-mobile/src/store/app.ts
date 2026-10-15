import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Customer, PaymentType, Product, Settings, Session } from '@shared/types'
import { DEFAULT_SETTINGS } from '../lib/defaults'
import type { DimensionFilters } from '../lib/search'

export type Tab = 'home' | 'products' | 'cart' | 'orders' | 'account'

export interface CartLine {
  product_id: number
  sku: string
  name: string
  brand: string
  qty: number
  min_order: number
  stock: number
  unit_price: number
  card_price: number | null
  currency: Product['currency']
  shelf: string
  box: string
  description: string
}

interface CartState {
  lines: CartLine[]
  payment: PaymentType
  note: string
  customerId: number | null
  add: (product: Product, qty?: number) => void
  setQty: (productId: number, qty: number) => void
  remove: (productId: number) => void
  setPayment: (payment: PaymentType) => void
  setNote: (note: string) => void
  setCustomer: (id: number | null) => void
  refresh: (products: Product[]) => void
  clear: () => void
}

export const useCart = create<CartState>()(persist((set) => ({
  lines: [],
  payment: 'pesin',
  note: '',
  customerId: null,
  add: (product, qty) => set((state) => {
    const found = state.lines.find((line) => line.product_id === product.id)
    const amount = Math.max(Math.max(1, product.min_order), Math.floor(qty ?? Math.max(1, product.min_order)))
    if (found) return { lines: state.lines.map((line) => line.product_id === product.id ? { ...line, qty: line.qty + amount } : line) }
    return {
      lines: [...state.lines, {
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        qty: amount,
        min_order: Math.max(1, product.min_order),
        stock: product.stock,
        unit_price: product.price,
        card_price: product.card_price,
        currency: product.currency,
        shelf: product.shelf,
        box: product.box,
        description: product.description
      }]
    }
  }),
  setQty: (productId, qty) => set((state) => ({
    lines: state.lines.map((line) => line.product_id === productId ? { ...line, qty: Math.max(line.min_order, Math.floor(qty || line.min_order)) } : line)
  })),
  remove: (productId) => set((state) => ({ lines: state.lines.filter((line) => line.product_id !== productId) })),
  setPayment: (payment) => set({ payment }),
  setNote: (note) => set({ note }),
  setCustomer: (customerId) => set({ customerId }),
  refresh: (products) => set((state) => {
    const byId = new Map(products.map((product) => [product.id, product]))
    return {
      lines: state.lines.map((line) => {
        const product = byId.get(line.product_id)
        return product ? { ...line, name: product.name, brand: product.brand, stock: product.stock, unit_price: product.price, card_price: product.card_price, shelf: product.shelf, box: product.box, description: product.description } : line
      })
    }
  }),
  clear: () => set({ lines: [], payment: 'pesin', note: '', customerId: null })
}), { name: 'yamansa-b2b-cart', storage: createJSONStorage(() => localStorage) }))

interface AppState {
  tab: Tab
  session: Session | null
  settings: Settings
  customers: Customer[]
  products: Product[]
  catalogBrands: string[]
  catalogDimensions: DimensionFilters
  online: boolean
  syncBusy: boolean
  toast: string
  sheet: 'filters' | 'detail' | 'order' | 'update' | null
  selectedProduct: Product | null
  selectedOrderId: number | null
  setTab: (tab: Tab) => void
  setSession: (session: Session | null) => void
  setSettings: (settings: Settings) => void
  setCustomers: (customers: Customer[]) => void
  setProducts: (products: Product[]) => void
  setCatalogFilters: (brands: string[], dimensions: DimensionFilters) => void
  setOnline: (online: boolean) => void
  setSyncBusy: (busy: boolean) => void
  showToast: (toast: string) => void
  setSheet: (sheet: AppState['sheet']) => void
  setSelectedProduct: (product: Product | null) => void
  setSelectedOrderId: (id: number | null) => void
}

export const useApp = create<AppState>((set) => ({
  tab: 'home',
  session: null,
  settings: DEFAULT_SETTINGS,
  customers: [],
  products: [],
  catalogBrands: [],
  catalogDimensions: { dMin: null, dMax: null, DMin: null, DMax: null, bMin: null, bMax: null },
  online: navigator.onLine,
  syncBusy: false,
  toast: '',
  sheet: null,
  selectedProduct: null,
  selectedOrderId: null,
  setTab: (tab) => set({ tab }),
  setSession: (session) => set({ session }),
  setSettings: (settings) => set({ settings }),
  setCustomers: (customers) => set({ customers }),
  setProducts: (products) => set({ products }),
  setCatalogFilters: (catalogBrands, catalogDimensions) => set({ catalogBrands, catalogDimensions }),
  setOnline: (online) => set({ online }),
  setSyncBusy: (syncBusy) => set({ syncBusy }),
  showToast: (toast) => set({ toast }),
  setSheet: (sheet) => set({ sheet }),
  setSelectedProduct: (selectedProduct) => set({ selectedProduct }),
  setSelectedOrderId: (selectedOrderId) => set({ selectedOrderId })
}))
