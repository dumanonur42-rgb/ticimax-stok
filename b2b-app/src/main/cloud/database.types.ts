/** Hand-maintained mirror of supabase/schema.sql for typed supabase-js queries. */
import type { Currency, OrderStatus, PaymentType, UserRole } from '@shared/types'

export type ProductRow = {
  id: number
  sku: string
  sku_norm: string
  name: string
  name_norm: string
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
  active: boolean
  deleted: boolean
  updated_at: string
}
export type ProductInsert = Omit<ProductRow, 'id' | 'updated_at' | 'deleted'> & { id?: number; deleted?: boolean }

export type CustomerRow = {
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
  active: boolean
  created_at: string
}
export type CustomerInsert = Omit<CustomerRow, 'id' | 'created_at'> & { id?: number }

export type ProfileRow = {
  id: string
  username: string
  display_name: string
  role: UserRole
  customer_id: number | null
  active: boolean
  approved: boolean
  created_at: string
}

export type OrderRow = {
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
  created_by_id: string | null
  created_at: string
  updated_at: string
}

export type OrderItemRow = {
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

export type SettingRow = {
  key: string
  value: unknown
}

export type ImportLogRow = {
  id: number
  filename: string
  created_at: string
  inserted: number
  updated: number
  unchanged: number
  deactivated: number
  mode: string
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      products: Table<ProductRow, ProductInsert>
      customers: Table<CustomerRow, CustomerInsert>
      profiles: Table<ProfileRow, ProfileRow>
      orders: Table<OrderRow>
      order_items: Table<OrderItemRow>
      settings: Table<SettingRow, SettingRow>
      import_logs: Table<ImportLogRow, Omit<ImportLogRow, 'id' | 'created_at'>>
    }
    Views: Record<string, never>
    Functions: {
      update_my_company: { Args: { p: Record<string, string> }; Returns: CustomerRow }
      adjust_stock: { Args: { p_id: number; p_delta: number }; Returns: undefined }
      create_order: {
        Args: {
          p_customer_id: number | null
          p_note: string
          p_payment: string
          p_currency: string
          p_vat_pct: number
          p_items: unknown[]
        }
        Returns: number
      }
      set_order_status: { Args: { p_id: number; p_status: string }; Returns: undefined }
      admin_set_password: { Args: { p_user: string; p_password: string }; Returns: undefined }
      admin_delete_user: { Args: { p_user: string }; Returns: undefined }
      deactivate_products_not_in: { Args: { p_norms: string[] }; Returns: number }
      soft_delete_all_products: { Args: Record<string, never>; Returns: undefined }
      purge_all_products: { Args: Record<string, never>; Returns: number }
      dashboard_orders: { Args: { p_customer: number | null }; Returns: DashboardOrdersJson }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export interface DashboardOrdersJson {
  openOrders: number
  ordersToday: number
  customerCount: number
  pendingUsers: number
  recentOrders: OrderRow[]
  lastImport: ImportLogRow | null
}
