import { createClient } from '@libsql/client';

let tursoClient = null;
let isInitialized = false;

export function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    return null;
  }

  if (!tursoClient) {
    try {
      tursoClient = createClient({
        url: url.trim(),
        authToken: authToken.trim(),
      });
      console.log(`🌐 Turso Cloud Client configured: ${url.trim().substring(0, 35)}...`);
    } catch (err) {
      console.error('⚠️ Failed to initialize Turso client:', err.message);
      return null;
    }
  }

  return tursoClient;
}

export function isTursoEnabled() {
  return !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

// Replicate a write query to Turso Cloud in the background
export function syncWriteToTurso(sql, args = []) {
  const client = getTursoClient();
  if (!client) return;

  // Normalize args
  const normalizedArgs = Array.isArray(args) ? args : [args];

  // Asynchronous background write
  client.execute({ sql, args: normalizedArgs }).catch(err => {
    // Ignore duplicate or minor conflicts in background replication
    if (!err.message?.includes('UNIQUE constraint failed')) {
      console.warn('⚠️ Turso background sync warning:', err.message);
    }
  });
}

// Schema DDL for Turso Cloud initialization
const TURSO_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    school TEXT,
    size TEXT NOT NULL,
    color TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    purchase_price REAL NOT NULL DEFAULT 0,
    selling_price REAL NOT NULL DEFAULT 0,
    gst_rate REAL NOT NULL DEFAULT 0,
    current_stock INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    school_class TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT UNIQUE NOT NULL,
    public_token TEXT UNIQUE NOT NULL,
    customer_id INTEGER,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    customer_address TEXT,
    customer_school_class TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    discount_type TEXT NOT NULL DEFAULT 'flat',
    discount_val REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    taxable_amount REAL NOT NULL DEFAULT 0,
    cgst_amount REAL NOT NULL DEFAULT 0,
    sgst_amount REAL NOT NULL DEFAULT 0,
    total_tax REAL NOT NULL DEFAULT 0,
    round_off REAL NOT NULL DEFAULT 0,
    grand_total REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    balance_due REAL NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'Paid',
    payment_mode TEXT NOT NULL DEFAULT 'Cash',
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    email_sent INTEGER NOT NULL DEFAULT 0,
    email_sent_at DATETIME,
    whatsapp_sent INTEGER NOT NULL DEFAULT 0,
    whatsapp_sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS bill_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    category TEXT,
    school TEXT,
    size TEXT,
    color TEXT,
    sku TEXT,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    discount REAL NOT NULL DEFAULT 0,
    gst_rate REAL NOT NULL DEFAULT 0,
    taxable_value REAL NOT NULL DEFAULT 0,
    cgst_amount REAL NOT NULL DEFAULT 0,
    sgst_amount REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_mode TEXT NOT NULL,
    reference_no TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reference_id TEXT,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];

const TABLES = [
  'users',
  'settings',
  'products',
  'customers',
  'bills',
  'bill_items',
  'payments',
  'stock_movements'
];

/**
 * Synchronize local SQLite with Turso Cloud on application startup.
 * If Turso has existing data, it restores it into the local container disk.
 * If Turso is empty, it pushes local initial data up to Turso Cloud.
 */
export async function syncOnStartup(rawDb) {
  const client = getTursoClient();
  if (!client) {
    console.log('ℹ️ Turso Cloud sync disabled (using local SQLite storage)');
    return;
  }

  console.log('🔄 Checking Turso Cloud database state...');

  try {
    // 1. Ensure all tables exist on Turso Cloud
    for (const ddl of TURSO_SCHEMA_STATEMENTS) {
      await client.execute(ddl);
    }

    // 2. Check if Turso has data in products or settings
    const [prodCheck, billCheck] = await Promise.all([
      client.execute('SELECT COUNT(*) as cnt FROM products').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM bills').catch(() => ({ rows: [{ cnt: 0 }] }))
    ]);

    const tursoProductsCount = Number(prodCheck.rows[0]?.cnt || 0);
    const tursoBillsCount = Number(billCheck.rows[0]?.cnt || 0);

    console.log(`📊 Turso Cloud Status: ${tursoProductsCount} products, ${tursoBillsCount} bills recorded.`);

    if (tursoProductsCount > 0 || tursoBillsCount > 0) {
      // Restore Turso Cloud data down into local SQLite (so Render wakeups have 100% of the data)
      console.log('📥 Restoring data from Turso Cloud into local container...');

      for (const table of TABLES) {
        try {
          const res = await client.execute(`SELECT * FROM ${table}`);
          if (res.rows && res.rows.length > 0) {
            const cols = Object.keys(res.rows[0]);
            const placeholders = cols.map(() => '?').join(', ');
            const insertSql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
            const stmt = rawDb.prepare(insertSql);

            rawDb.exec('BEGIN IMMEDIATE');
            for (const row of res.rows) {
              const vals = cols.map(c => row[c]);
              stmt.run(...vals);
            }
            rawDb.exec('COMMIT');
            console.log(`  ✔ Restored ${res.rows.length} rows for table '${table}'`);
          }
        } catch (tableErr) {
          try { rawDb.exec('ROLLBACK'); } catch (_) {}
          console.warn(`  ⚠️ Could not restore table '${table}':`, tableErr.message);
        }
      }

      console.log('✅ Local database fully restored from Turso Cloud!');
    } else {
      // First boot with empty Turso: push local initial records (settings & admin) to Turso Cloud
      console.log('📤 Turso Cloud is empty. Uploading initial data to Turso Cloud...');

      for (const table of ['users', 'settings', 'products']) {
        try {
          const rows = rawDb.prepare(`SELECT * FROM ${table}`).all();
          if (rows && rows.length > 0) {
            for (const r of rows) {
              const cols = Object.keys(r);
              const placeholders = cols.map(() => '?').join(', ');
              const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
              const args = cols.map(c => r[c]);
              await client.execute({ sql, args });
            }
            console.log(`  ✔ Uploaded ${rows.length} initial rows for table '${table}'`);
          }
        } catch (upErr) {
          console.warn(`  ⚠️ Initial upload warning for '${table}':`, upErr.message);
        }
      }

      console.log('✅ Initial seed data uploaded to Turso Cloud!');
    }

    isInitialized = true;
  } catch (err) {
    console.error('❌ Error during Turso Cloud startup synchronization:', err);
  }
}

