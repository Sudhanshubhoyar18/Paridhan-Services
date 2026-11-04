import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory: in Netlify serverless functions, the root filesystem is read-only, so /tmp is used.
// On Render, local machines, or Docker, local data folder or DATA_DIR is used.
const defaultDataDir = process.env.NETLIFY ? '/tmp' : path.resolve(__dirname, '../../data');
const dataDir = process.env.DATA_DIR || defaultDataDir;
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'paridhan.db');
console.log(`📁 SQLite Database path: ${dbPath}`);
const rawDb = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys with safe fallback
try {
  rawDb.exec('PRAGMA foreign_keys = ON;');
} catch (fkErr) {
  console.warn('⚠️ Foreign keys pragma warning:', fkErr.message);
}

try {
  rawDb.exec('PRAGMA journal_mode = WAL;');
} catch (walErr) {
  console.warn('⚠️ WAL mode failed, falling back to DELETE mode:', walErr.message);
  try {
    rawDb.exec('PRAGMA journal_mode = DELETE;');
  } catch (_) {}
}

function normalizeArgs(args) {
  if (args.length === 1 && Array.isArray(args[0])) {
    return args[0];
  }
  return args;
}

// Wrapper to provide 100% better-sqlite3 compatible API
export const db = {
  raw: rawDb,

  exec(sql) {
    return rawDb.exec(sql);
  },

  pragma(sql) {
    return rawDb.exec(`PRAGMA ${sql};`);
  },

  prepare(sql) {
    const stmt = rawDb.prepare(sql);
    return {
      run(...args) {
        const normalized = normalizeArgs(args);
        const res = stmt.run(...normalized);
        return {
          changes: res.changes,
          lastInsertRowid: Number(res.lastInsertRowid)
        };
      },
      get(...args) {
        const normalized = normalizeArgs(args);
        return stmt.get(...normalized);
      },
      all(...args) {
        const normalized = normalizeArgs(args);
        return stmt.all(...normalized);
      }
    };
  },

  transaction(fn) {
    return (...args) => {
      rawDb.exec('BEGIN IMMEDIATE');
      try {
        const result = fn(...args);
        rawDb.exec('COMMIT');
        return result;
      } catch (error) {
        try {
          rawDb.exec('ROLLBACK');
        } catch (_) {}
        throw error;
      }
    };
  }
};

export default db;
