import Database from 'better-sqlite3-multiple-ciphers'
import { app } from 'electron'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { normalize, productKey } from '@shared/identity'
import { decryptAtRest, encryptAtRest, ensureAtRestAvailable } from './storage'
import { setStoredValue, SESSION_CACHE_STORAGE_KEY } from './cloud/client'

export { normalize, productKey }

export type DB = Database.Database

let db: DB | null = null

export function dbPath(): string {
  const dir = join(app.getPath('userData'), 'data')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'yamansa-b2b.sqlite')
}

function keyPath(file: string): string {
  return join(dirname(file), 'db.key')
}

function isPlaintextDatabase(file: string): boolean {
  return existsSync(file) && readFileSync(file).subarray(0, 16).toString('binary') === 'SQLite format 3\0'
}

function quarantine(file: string, reason: string): void {
  const suffix = `.unreadable.${Date.now()}`
  if (existsSync(file)) renameSync(file, `${file}${suffix}`)
  for (const ext of ['-wal', '-shm']) {
    if (existsSync(`${file}${ext}`)) renameSync(`${file}${ext}`, `${file}${suffix}${ext}`)
  }
  console.error(`Local database moved aside (${reason}).`)
}

function readKey(file: string, keyFile: string): string | null {
  if (!existsSync(keyFile)) return null
  try {
    const key = decryptAtRest(readFileSync(keyFile, 'utf8')).value
    if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error('Invalid database key')
    return key
  } catch (error) {
    if (!isPlaintextDatabase(file)) quarantine(file, 'database key could not be decrypted')
    const suffix = `.unreadable.${Date.now()}`
    if (existsSync(keyFile)) renameSync(keyFile, `${keyFile}${suffix}`)
    console.error('Local database key could not be read; starting with a new key.', error)
    return null
  }
}

function writeKey(keyFile: string): string {
  const key = randomBytes(32).toString('hex')
  const temporaryFile = `${keyFile}.tmp`
  writeFileSync(temporaryFile, encryptAtRest(key), { mode: 0o600 })
  renameSync(temporaryFile, keyFile)
  return key
}

function configureEncryptedDb(database: DB, key: string): void {
  database.pragma("cipher='sqlcipher'")
  database.pragma(`key="x'${key}'"`)
}

function hasTable(database: DB, table: string): boolean {
  return !!database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)
}

function migratePlaintextDatabase(file: string, key: string): void {
  const plaintext = new Database(file)
  const settings = hasTable(plaintext, 'settings') ? plaintext.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[] : []
  const outbox = hasTable(plaintext, 'outbox') ? plaintext.prepare('SELECT seq, id, user_id, kind, payload, created_at, attempts, failed, error FROM outbox').all() as Array<Record<string, unknown>> : []
  const sessionCache = hasTable(plaintext, 'sync_state')
    ? (plaintext.prepare("SELECT value FROM sync_state WHERE key = 'session_cache'").get() as { value: string } | undefined)?.value
    : undefined
  plaintext.close()

  const temporaryFile = `${file}.encrypted-migration.tmp`
  const backupFile = `${file}.plain-migration.bak`
  const backupWal = `${backupFile}-wal`
  const backupShm = `${backupFile}-shm`
  rmSync(temporaryFile, { force: true })
  const migrated = new Database(temporaryFile)
  configureEncryptedDb(migrated, key)
  migrate(migrated)
  migrated.transaction(() => {
    const insertSetting = migrated.prepare('INSERT OR REPLACE INTO settings(key, value) VALUES (?, ?)')
    for (const row of settings) insertSetting.run(row.key, row.value)
    const insertOutbox = migrated.prepare('INSERT INTO outbox(seq, id, user_id, kind, payload, created_at, attempts, failed, error) VALUES (@seq, @id, @user_id, @kind, @payload, @created_at, @attempts, @failed, @error)')
    for (const row of outbox) insertOutbox.run(row)
  })()
  migrated.close()

  if (sessionCache) setStoredValue(SESSION_CACHE_STORAGE_KEY, sessionCache)
  if (existsSync(backupFile)) rmSync(backupFile, { force: true })
  if (existsSync(backupWal)) rmSync(backupWal, { force: true })
  if (existsSync(backupShm)) rmSync(backupShm, { force: true })
  for (const ext of ['-wal', '-shm']) {
    if (existsSync(`${file}${ext}`)) renameSync(`${file}${ext}`, `${backupFile}${ext}`)
  }
  renameSync(file, backupFile)
  try {
    renameSync(temporaryFile, file)
  } catch (error) {
    renameSync(backupFile, file)
    for (const ext of ['-wal', '-shm']) {
      if (existsSync(`${backupFile}${ext}`)) renameSync(`${backupFile}${ext}`, `${file}${ext}`)
    }
    throw error
  }
  rmSync(backupFile, { force: true })
  rmSync(backupWal, { force: true })
  rmSync(backupShm, { force: true })
}

function restoreInterruptedMigration(file: string): void {
  const backup = `${file}.plain-migration.bak`
  if (!existsSync(file) && existsSync(backup)) {
    renameSync(backup, file)
    for (const ext of ['-wal', '-shm']) {
      if (existsSync(`${backup}${ext}`)) renameSync(`${backup}${ext}`, `${file}${ext}`)
    }
  } else if (isPlaintextDatabase(file)) {
    for (const ext of ['-wal', '-shm']) {
      if (!existsSync(`${file}${ext}`) && existsSync(`${backup}${ext}`)) renameSync(`${backup}${ext}`, `${file}${ext}`)
    }
  }
}

function openEncryptedDatabase(file: string, key: string): DB {
  const database = new Database(file)
  try {
    configureEncryptedDb(database, key)
    database.pragma('journal_mode = WAL')
    database.pragma('synchronous = NORMAL')
    database.pragma('foreign_keys = ON')
    database.pragma('cache_size = -65536')
    migrate(database)
    return database
  } catch (error) {
    database.close()
    throw error
  }
}

export function openDatabaseForSelfCheck(file: string, keyFile: string): DB {
  ensureAtRestAvailable()
  const key = readKey(file, keyFile) ?? writeKey(keyFile)
  if (isPlaintextDatabase(file)) migratePlaintextDatabase(file, key)
  return openEncryptedDatabase(file, key)
}

export function getDb(): DB {
  if (db) return db
  ensureAtRestAvailable()
  const file = dbPath()
  restoreInterruptedMigration(file)
  const keyFile = keyPath(file)
  const key = readKey(file, keyFile) ?? writeKey(keyFile)
  if (isPlaintextDatabase(file)) migratePlaintextDatabase(file, key)
  try {
    db = openEncryptedDatabase(file, key)
  } catch (error) {
    if (!existsSync(file) || isPlaintextDatabase(file)) throw error
    quarantine(file, 'encrypted database could not be opened')
    db = openEncryptedDatabase(file, key)
  }
  const backup = `${file}.plain-migration.bak`
  rmSync(backup, { force: true })
  rmSync(`${backup}-wal`, { force: true })
  rmSync(`${backup}-shm`, { force: true })
  return db
}

export function closeDb(): void {
  db?.close()
  db = null
}

/** Remove the encrypted local catalog and key on sign-out; the next login creates fresh files. */
export function deleteLocalDatabase(): void {
  const file = dbPath()
  closeDb()
  for (const path of [file, `${file}-wal`, `${file}-shm`, keyPath(file)]) rmSync(path, { force: true })
}

export function reopenDb(): DB {
  closeDb()
  return getDb()
}

export function wipeProducts(): void {
  const database = getDb()
  database.transaction(() => {
    database.exec('DELETE FROM products')
    database.exec("INSERT INTO products_fts(products_fts) VALUES('rebuild')")
    database.exec("DELETE FROM sync_state WHERE key IN ('products_cursor', 'catalog_generation')")
  })()
  database.pragma('wal_checkpoint(TRUNCATE)')
  database.exec('VACUUM')
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
  brand_norm TEXT NOT NULL DEFAULT '',
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
  box_norm TEXT NOT NULL DEFAULT '',
  barcode TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  equivalents TEXT NOT NULL DEFAULT '',
  eq_norm TEXT NOT NULL DEFAULT '',
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
  VALUES (new.id, new.sku_norm, new.name_norm, new.brand_norm, new.box_norm, new.eq_norm, new.barcode);
END;
CREATE TRIGGER IF NOT EXISTS products_ad AFTER DELETE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, sku, name, brand, box, equivalents, barcode)
  VALUES ('delete', old.id, old.sku_norm, old.name_norm, old.brand_norm, old.box_norm, old.eq_norm, old.barcode);
END;
CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, sku, name, brand, box, equivalents, barcode)
  VALUES ('delete', old.id, old.sku_norm, old.name_norm, old.brand_norm, old.box_norm, old.eq_norm, old.barcode);
  INSERT INTO products_fts(rowid, sku, name, brand, box, equivalents, barcode)
  VALUES (new.id, new.sku_norm, new.name_norm, new.brand_norm, new.box_norm, new.eq_norm, new.barcode);
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
const MIRROR_SCHEMA = '4'

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
