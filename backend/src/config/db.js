import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'paridhan.db');
const rawDb = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys for high performance and integrity
rawDb.exec('PRAGMA foreign_keys = ON;');
rawDb.exec('PRAGMA journal_mode = WAL;');

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
