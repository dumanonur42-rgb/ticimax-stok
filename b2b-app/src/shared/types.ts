export type Currency = 'TRY' | 'USD' | 'EUR'

export interface Product {
  id: number
  sku: string
  name: string
  brand: string
  category: string
  type: string
  seal: string
  d_inner: number | null
  d_outer: number | null
  width: number | null
  stock: number
  unit: string
  price: number
  currency: Currency
  list_price: number | null
  card_price: number | null
  min_order: number
  shelf: string
  barcode: string
  image: string
  description: string
  equivalents: string
  active: number
  updated_at: string
}

export type ProductInput = Omit<Product, 'id' | 'updated_at'>

export interface ProductFilter {
  q?: string
  brand?: string[]
  category?: string[]
  type?: string[]
  seal?: string[]
  inStock?: boolean
  dInner?: [number | null, number | null]
  dOuter?: [number | null, number | null]
  width?: [number | null, number | null]
  sort?: 'relevance' | 'sku' | 'name' | 'stock' | 'price' | 'updated' | 'shelf'
  sortDir?: 'asc' | 'desc'
  offset?: number
  limit?: number
  /** Admin stock screen: list passive products too. */
  includeInactive?: boolean
}

/** One line typed into the spreadsheet-style quick entry grid. */
export interface QuickEntryRow {
  shelf: string
  sku: string
  brand: string
  stock: number
  price: number | null
  description: string
  /** What to do when the code already exists: add the quantity to its stock (default) or overwrite the stock. */
  existing: 'add' | 'set'
}

export interface QuickEntryResult {
  created: number
  updated: number
  errors: { sku: string; message: string }[]
}

/** One row of an inline/bulk edit on the stock screen; omitted fields stay unchanged. */
export interface BulkProductPatch {
  id: number
  stock?: number
  shelf?: string
  price?: number
  card_price?: number | null
  active?: boolean
}

/** Products that are certainly the same item (same designation and brand). */
export interface DuplicateGroup {
  key: string
  designation: string
  brand: string
  items: Product[]
}

/** Fields the survivor of a merge may take over; anything omitted keeps the target's value. */
export type MergePatch = Partial<
  Pick<
    Product,
    | 'sku'
    | 'name'
    | 'brand'
    | 'category'
    | 'type'
    | 'seal'
    | 'd_inner'
    | 'd_outer'
    | 'width'
    | 'stock'
    | 'price'
    | 'card_price'
    | 'list_price'
    | 'shelf'
    | 'barcode'
    | 'equivalents'
    | 'description'
  >
>

export interface MergeInput {
  targetId: number
  sourceIds: number[]
  patch: MergePatch
}

export interface ProductPage {
  items: Product[]
  total: number
}

export interface FacetValue {
  value: string
  count: number
}

export interface Facets {
  brand: FacetValue[]
  category: FacetValue[]
  type: FacetValue[]
  seal: FacetValue[]
}

export interface Customer {
  id: number
  code: string
  name: string
  contact: string
  phone: string
  email: string
  address: string
  city: string
  tax_no: string
  tax_office: string
  discount_pct: number
  currency: Currency
  notes: string
  active: number
  created_at: string
}
export type CustomerInput = Omit<Customer, 'id' | 'created_at'>
/** Fields a dealer may fill in for their own company card after approval. */
export type CustomerProfile = Pick<Customer, 'name' | 'contact' | 'phone' | 'email' | 'address' | 'city' | 'tax_no' | 'tax_office'>

export type PaymentType = 'pesin' | 'kart'

export type OrderStatus = 'taslak' | 'beklemede' | 'onaylandi' | 'hazirlaniyor' | 'teslim' | 'iptal'

export interface OrderItem {
  id: number
  order_id: number
  product_id: number | null
  sku: string
  name: string
  qty: number
  unit_price: number
  discount_pct: number
  line_total: number
}

export interface Order {
  id: number
  order_no: string
  customer_id: number | null
  customer_name: string
  status: OrderStatus
  note: string
  payment: PaymentType
  currency: Currency
  subtotal: number
  discount: number
  vat_pct: number
  vat: number
  total: number
  created_by: string
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

export interface OrderInput {
  customer_id: number | null
  note: string
  payment: PaymentType
  currency: Currency
  vat_pct: number
  items: { product_id: number | null; sku: string; name: string; qty: number; unit_price: number; discount_pct: number }[]
}

export type UserRole = 'admin' | 'bayi'

export interface User {
  /** Supabase Auth user id (uuid). */
  id: string
  username: string
  display_name: string
  role: UserRole
  customer_id: number | null
  active: number
  approved: number
  created_at: string
}

export interface Session {
  user: User
  customer: Customer | null
}

export interface SyncStatus {
  online: boolean
  lastSync: string | null
  productCount: number
  message?: string
}

export interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'installing' | 'error'
  current: string
  version?: string
  notes?: string
  percent?: number
  message?: string
}

export interface Settings {
  company_name: string
  company_phone: string
  company_email: string
  company_address: string
  company_web: string
  default_currency: Currency
  rate_usd: number
  rate_eur: number
  vat_pct: number
  low_stock_threshold: number
  show_prices_to_dealers: boolean
  card_price_pct: number
  theme: 'system' | 'light' | 'dark' | 'contrast'
  font_scale: number
  reduce_motion: boolean
  density: 'comfortable' | 'compact'
  /** Admin devices: keep running in the tray after the window closes and show a Windows notification on new orders. */
  background_notifications: boolean
}

export interface DashboardStats {
  productCount: number
  inStockCount: number
  lowStockCount: number
  outOfStockCount: number
  customerCount: number
  pendingUsers: number
  openOrders: number
  ordersToday: number
  brands: FacetValue[]
  recentOrders: Order[]
  lowStock: Product[]
  lastImport: ImportLog | null
}

export interface ImportLog {
  id: number
  filename: string
  created_at: string
  inserted: number
  updated: number
  unchanged: number
  deactivated: number
  mode: string
}

export interface ImportPreview {
  filename: string
  headers: string[]
  rows: string[][]
  totalRows: number
  suggestedMapping: Partial<Record<keyof ProductInput, string>>
  token: string
}

export interface ImportOptions {
  token: string
  mapping: Partial<Record<keyof ProductInput, string>>
  mode: 'upsert' | 'replace' | 'stock_only'
  deactivateMissing: boolean
  defaultCurrency: Currency
  defaultBrand: string
  defaultCategory: string
}

export interface ImportResult extends ImportLog {
  errors: string[]
}
