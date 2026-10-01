import Database from 'better-sqlite3'
import { app } from 'electron'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { normalize, productKey } from '@shared/identity'

export { normalize, productKey }

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
  sku TEXT NOT NULL,
  sku_norm TEXT NOT NULL,
  key_norm TEXT NOT NULL DEFAULT '',
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
  box TEXT NOT NULL DEFAULT '',
  barcode TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  equivalents TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_products_sku_norm ON products(sku_norm);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_key_norm ON products(key_norm);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_dims ON products(d_inner, d_outer, width);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  sku, name, brand, box, equivalents, barcode,
  content='products', content_rowid='id',
  tokenize='trigram'
);
CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, sku, name, brand, box, equivalents, barcode)
  VALUES (new.id, new.sku_norm, new.name_norm, new.brand, new.box, new.equivalents, new.barcode);
END;
CREATE TRIGGER IF NOT EXISTS products_ad AFTER DELETE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, sku, name, brand, box, equivalents, barcode)
  VALUES ('delete', old.id, old.sku_norm, old.name_norm, old.brand, old.box, old.equivalents, old.barcode);
END;
CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, sku, name, brand, box, equivalents, barcode)
  VALUES ('delete', old.id, old.sku_norm, old.name_norm, old.brand, old.box, old.equivalents, old.barcode);
  INSERT INTO products_fts(rowid, sku, name, brand, box, equivalents, barcode)
  VALUES (new.id, new.sku_norm, new.name_norm, new.brand, new.box, new.equivalents, new.barcode);
END;

CREATE TABLE IF NOT EXISTS sync_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);

-- Catalogue writes waiting to reach the cloud (offline / connection dropped); sent in order, each exactly once.
CREATE TABLE IF NOT EXISTS outbox (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
`

/**
 * Bumped when the product mirror layout changes; the cache is dropped and re-pulled from the cloud.
 * The local file is only ever a copy of the cloud catalogue: whatever a pre-cloud install left
 * behind (single-machine products, users, orders) is discarded, never shown or uploaded.
 */
const MIRROR_SCHEMA = '3'

function migrate(d: DB): void {
  d.exec('CREATE TABLE IF NOT EXISTS sync_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
  const v = (d.prepare("SELECT value FROM sync_state WHERE key = 'mirror_schema'").get() as { value: string } | undefined)?.value
  if (v !== MIRROR_SCHEMA) {
    d.exec(`
      DROP TRIGGER IF EXISTS products_ai; DROP TRIGGER IF EXISTS products_ad; DROP TRIGGER IF EXISTS products_au;
      DROP TABLE IF EXISTS products_fts; DROP TABLE IF EXISTS products;
      DELETE FROM sync_state WHERE key IN ('products_cursor', 'catalog_generation');
    `)
    for (const t of LEGACY_TABLES) d.exec(`DROP TABLE IF EXISTS ${t}`)
    d.prepare("INSERT OR REPLACE INTO sync_state(key, value) VALUES ('mirror_schema', ?)").run(MIRROR_SCHEMA)
  }
  d.exec(SCHEMA)
}

/** Tables left behind by single-machine builds (pre-cloud); dropped on the first start of a cloud build. */
const LEGACY_TABLES = ['users', 'order_items', 'orders', 'customers', 'import_logs'] as const

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
