import type {
  Customer,
  CustomerInput,
  DashboardStats,
  Facets,
  ImportLog,
  ImportOptions,
  ImportPreview,
  ImportResult,
  Order,
  OrderInput,
  OrderStatus,
  Product,
  ProductFilter,
  ProductInput,
  ProductPage,
  Session,
  Settings,
  User,
  UserRole
} from './types'

/** Channel -> [args, result]. Single source of truth for main, preload and renderer. */
export interface ApiMap {
  'auth:login': [{ username: string; password: string }, Session]
  'auth:logout': [void, void]
  'auth:session': [void, Session | null]
  'auth:changePassword': [{ current: string; next: string }, void]

  'products:search': [ProductFilter, ProductPage]
  'products:facets': [ProductFilter, Facets]
  'products:get': [number, Product | null]
  'products:bySkus': [string[], Product[]]
  'products:save': [Partial<Product> & ProductInput, Product]
  'products:delete': [number, void]
  'products:exportExcel': [ProductFilter, string | null]

  'customers:list': [{ q?: string }, Customer[]]
  'customers:get': [number, Customer | null]
  'customers:save': [Partial<Customer> & CustomerInput, Customer]
  'customers:delete': [number, void]

  'orders:list': [{ q?: string; status?: OrderStatus; customer_id?: number; limit?: number }, Order[]]
  'orders:get': [number, Order | null]
  'orders:create': [OrderInput, Order]
  'orders:setStatus': [{ id: number; status: OrderStatus }, Order]
  'orders:exportExcel': [number, string | null]
  'orders:print': [number, void]

  'users:list': [void, User[]]
  'users:save': [
    { id?: number; username: string; display_name: string; role: UserRole; customer_id: number | null; password?: string; active: number },
    User
  ]
  'users:delete': [number, void]

  'settings:get': [void, Settings]
  'settings:set': [Partial<Settings>, Settings]

  'dashboard:stats': [void, DashboardStats]

  'import:pick': [void, ImportPreview | null]
  'import:run': [ImportOptions, ImportResult]
  'import:logs': [void, ImportLog[]]
  'import:template': [void, string | null]

  'app:info': [void, { version: string; dbPath: string; platform: string }]
  'app:openPath': [string, void]
  'app:backup': [void, string | null]
  'app:restore': [void, boolean]
  'app:seedDemo': [number, number]
}

export type ApiChannel = keyof ApiMap
export type ApiArgs<C extends ApiChannel> = ApiMap[C][0]
export type ApiResult<C extends ApiChannel> = ApiMap[C][1]

export interface Api {
  invoke<C extends ApiChannel>(channel: C, args: ApiArgs<C>): Promise<ApiResult<C>>
  on(channel: 'products:changed' | 'orders:changed' | 'session:changed', cb: () => void): () => void
}
