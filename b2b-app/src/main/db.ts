import Database from 'better-sqlite3'
import { app } from 'electron'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

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
  card_price REAL,
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

CREATE TABLE IF NOT EXISTS sync_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`

function migrate(d: DB): void {
  d.exec(SCHEMA)
  addColumnIfMissing(d, 'products', 'card_price', 'REAL')
}

/** Tables left behind by single-machine builds (pre-cloud); `cloud/migrate.ts` uploads and then drops them. */
export const LEGACY_TABLES = ['users', 'order_items', 'orders', 'customers', 'import_logs'] as const

export function hasTable(d: DB, name: string): boolean {
  return !!d.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?").get(name)
}

function addColumnIfMissing(d: DB, table: string, column: string, ddl: string): void {
  const cols = d.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!cols.some((c) => c.name === column)) d.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`)
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
