import Database from 'better-sqlite3'
import { app } from 'electron'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { hashPassword, verifyPassword } from './auth'

export type DB = Database.Database

let db: DB | null = null

export function dbPath(): string {
  const dir = join(app.getPath('userData'), 'data')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'yamansa-b2b.sqlite')
}

export function getDb(): DB {
  if (db) return db
  db = new Database(dbPath())
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  db.pragma('cache_size = -65536')
  migrate(db)
  return db
}

export function closeDb(): void {
  db?.close()
  db = null
}

export function reopenDb(): DB {
  closeDb()
  return getDb()
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  sku_norm TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  name_norm TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  seal TEXT NOT NULL DEFAULT '',
  d_inner REAL, d_outer REAL, width REAL,
  stock REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'Adet',
  price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  list_price REAL,
  min_order REAL NOT NULL DEFAULT 1,
  shelf TEXT NOT NULL DEFAULT '',
  barcode TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  equivalents TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_products_sku_norm ON products(sku_norm);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_dims ON products(d_inner, d_outer, width);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  sku, name, brand, equivalents, barcode,
  content='products', content_rowid='id',
  tokenize='trigram'
);
CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, sku, name, brand, equivalents, barcode)
  VALUES (new.id, new.sku_norm, new.name_norm, new.brand, new.equivalents, new.barcode);
END;
CREATE TRIGGER IF NOT EXISTS products_ad AFTER DELETE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, sku, name, brand, equivalents, barcode)
  VALUES ('delete', old.id, old.sku_norm, old.name_norm, old.brand, old.equivalents, old.barcode);
END;
CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, sku, name, brand, equivalents, barcode)
  VALUES ('delete', old.id, old.sku_norm, old.name_norm, old.brand, old.equivalents, old.barcode);
  INSERT INTO products_fts(rowid, sku, name, brand, equivalents, barcode)
  VALUES (new.id, new.sku_norm, new.name_norm, new.brand, new.equivalents, new.barcode);
END;

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  tax_no TEXT NOT NULL DEFAULT '',
  tax_office TEXT NOT NULL DEFAULT '',
  discount_pct REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'beklemede',
  note TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'TRY',
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  vat_pct REAL NOT NULL DEFAULT 20,
  vat REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  qty REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount_pct REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'bayi',
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  active INTEGER NOT NULL DEFAULT 1,
  approved INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS import_logs (
  id INTEGER PRIMARY KEY,
  filename TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  inserted INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  unchanged INTEGER NOT NULL DEFAULT 0,
  deactivated INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'upsert'
);
`

export const DEFAULT_ADMIN = { username: 'Yamansa', password: 'Ahmet4202', displayName: 'Ahmet' }
/** Standard (non-admin) staff account created on first run alongside the administrator. */
export const DEFAULT_STAFF = { username: 'Onur', password: 'Duman4202', displayName: 'Onur', role: 'satis' as const }

function addColumnIfMissing(d: DB, table: string, column: string, ddl: string): void {
  const cols = d.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!cols.some((c) => c.name === column)) d.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`)
}

function migrate(d: DB): void {
  d.exec(SCHEMA)
  addColumnIfMissing(d, 'users', 'approved', 'INTEGER NOT NULL DEFAULT 1')
  addColumnIfMissing(d, 'users', 'created_at', "TEXT NOT NULL DEFAULT ''")
  const userCount = d.prepare('SELECT COUNT(*) c FROM users').get() as { c: number }
  const insertUser = d.prepare(`INSERT INTO users(username, password_hash, display_name, role, created_at) VALUES (?,?,?,?,datetime('now','localtime'))`)
  const exists = d.prepare(`SELECT 1 FROM users WHERE username = ? COLLATE NOCASE`)
  if (userCount.c === 0) {
    insertUser.run(DEFAULT_ADMIN.username, hashPassword(DEFAULT_ADMIN.password), DEFAULT_ADMIN.displayName, 'admin')
  }
  if (!exists.get(DEFAULT_STAFF.username)) {
    insertUser.run(DEFAULT_STAFF.username, hashPassword(DEFAULT_STAFF.password), DEFAULT_STAFF.displayName, DEFAULT_STAFF.role)
  }
  if (userCount.c === 0) return
  // Databases created by earlier builds still carry the untouched admin/admin account: replace it.
  const legacy = d
    .prepare(`SELECT id, password_hash FROM users WHERE username = 'admin' COLLATE NOCASE`)
    .get() as { id: number; password_hash: string } | undefined
  const taken = exists.get(DEFAULT_ADMIN.username)
  if (legacy && !taken && verifyPassword('admin', legacy.password_hash)) {
    d.prepare(`UPDATE users SET username = ?, password_hash = ?, display_name = ? WHERE id = ?`).run(
      DEFAULT_ADMIN.username,
      hashPassword(DEFAULT_ADMIN.password),
      DEFAULT_ADMIN.displayName,
      legacy.id
    )
  }
}

/** Uppercase, Turkish-aware, strip everything except letters/digits. Used for SKU/name matching. */
export function normalize(s: string): string {
  return s
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]+/g, '')
}

/** Normalize for name search but keep word boundaries as single spaces. */
export function normalizeText(s: string): string {
  return s
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}
