import type {
  BulkProductPatch,
  Customer,
  CustomerInput,
  CustomerProfile,
  DashboardStats,
  DealerLogin,
  DuplicateGroup,
  Facets,
  ImportLog,
  ImportOptions,
  ImportPreview,
  ImportResult,
  MergeInput,
  Order,
  OrderInput,
  OrderStatus,
  Product,
  ProductFilter,
  ProductInput,
  ProductPage,
  QuickEntryResult,
  QuickEntryRow,
  Session,
  Settings,
  SyncStatus,
  UpdateState,
  User,
  UserRole
} from './types'

/** Channel -> [args, result]. Single source of truth for main, preload and renderer. */
export interface ApiMap {
  'auth:login': [{ username: string; password: string }, Session]
  'auth:logout': [void, void]
  'auth:register': [{ username: string; display_name: string; company_name: string; password: string }, void]
  'auth:session': [void, Session | null]
  'auth:changePassword': [{ current: string; next: string }, void]

  'products:search': [ProductFilter, ProductPage]
  'products:facets': [ProductFilter, Facets]
  'products:get': [number, Product | null]
  'products:bySkus': [string[], Product[]]
  'products:save': [Partial<Product> & ProductInput, Product]
  'products:delete': [number, void]
  'products:exportExcel': [ProductFilter, string | null]
  /** Admin stock management: row-level edits, bulk delete, duplicate detection and merging. */
  'products:bulkUpdate': [BulkProductPatch[], Product[]]
  'products:bulkDelete': [number[], void]
  'products:duplicates': [void, DuplicateGroup[]]
  'products:similar': [{ sku: string; brand: string; box: string; excludeId: number | null }, Product[]]
  'products:merge': [MergeInput, Product]
  'products:quickEntry': [QuickEntryRow[], QuickEntryResult]

  'customers:list': [{ q?: string }, Customer[]]
  'customers:get': [number, Customer | null]
  'customers:save': [Partial<Customer> & CustomerInput, Customer]
  'customers:createWithLogin': [{ customer: CustomerInput; login: DealerLogin }, Customer]
  'customers:delete': [number, void]
  /** A dealer completes their own company card (name, tax and contact details). */
  'customers:profile': [CustomerProfile, Session]

  'orders:list': [{ q?: string; status?: OrderStatus; customer_id?: number; limit?: number }, Order[]]
  'orders:get': [number, Order | null]
  'orders:create': [OrderInput, Order]
  'orders:setStatus': [{ id: number; status: OrderStatus }, Order]
  'orders:exportExcel': [number, string | null]
  'orders:print': [number, void]

  'users:list': [void, User[]]
  'users:save': [
    { id?: string; username: string; display_name: string; role: UserRole; customer_id: number | null; password?: string; active: number },
    User
  ]
  'users:delete': [string, void]
  'users:approve': [string, User]

  'settings:get': [void, Settings]
  'settings:set': [Partial<Settings>, Settings]

  'dashboard:stats': [void, DashboardStats]

  'import:pick': [void, ImportPreview | null]
  'import:run': [ImportOptions, ImportResult]
  'import:logs': [void, ImportLog[]]
  'import:template': [void, string | null]

  'app:info': [void, { version: string; dbPath: string; platform: string }]
  'app:syncStatus': [void, SyncStatus]
  'app:resync': [void, number]
  'app:flushOutbox': [void, SyncStatus]
  'app:discardFailedOps': [void, number]
  'app:openPath': [string, void]
  'app:openExternal': [string, void]
  'app:seedDemo': [number, number]
  'app:purgeProducts': [void, number]

  'update:state': [void, UpdateState]
  'update:check': [void, void]
  'update:download': [void, void]
  'update:install': [void, void]
}

export type ApiChannel = keyof ApiMap
export type ApiArgs<C extends ApiChannel> = ApiMap[C][0]
export type ApiResult<C extends ApiChannel> = ApiMap[C][1]

export interface Api {
  invoke<C extends ApiChannel>(channel: C, args: ApiArgs<C>): Promise<ApiResult<C>>
  on(channel: AppEvent, cb: () => void): () => void
}

export type AppEvent =
  | 'products:changed'
  | 'orders:changed'
  | 'customers:changed'
  | 'session:changed'
  | 'settings:changed'
  | 'splash:leave'
  | 'sync:changed'
  | 'update:changed'
  | 'users:changed'
