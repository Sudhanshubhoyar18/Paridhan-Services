import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../../data/paridhan.db');

// GET /api/system/diagnostics - Comprehensive system & CRM diagnostic health check
router.get('/diagnostics', authenticate, (req, res) => {
  try {
    // 1. SQLite integrity and foreign key checks
    const integrityRow = db.prepare('PRAGMA integrity_check').get();
    const integrityStatus = integrityRow ? Object.values(integrityRow)[0] : 'unknown';

    const fkViolations = db.prepare('PRAGMA foreign_key_check').all();
    const journalMode = db.prepare('PRAGMA journal_mode').get();

    // 2. Table row counts
    const billsTotal = db.prepare('SELECT COUNT(*) as count FROM bills').get().count;
    const billsActive = db.prepare("SELECT COUNT(*) as count FROM bills WHERE status = 'active'").get().count;
    const billsCancelled = db.prepare("SELECT COUNT(*) as count FROM bills WHERE status = 'cancelled'").get().count;
    const customersCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
    const productsCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const movementsCount = db.prepare('SELECT COUNT(*) as count FROM stock_movements').get().count;
    const paymentsCount = db.prepare('SELECT COUNT(*) as count FROM payments').get().count;

    // 3. Stock consistency audit (any negative stocks or inconsistencies)
    const negativeStockProducts = db.prepare('SELECT id, name, sku, current_stock FROM products WHERE current_stock < 0').all();
    const lowStockCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE current_stock <= low_stock_threshold').get().count;

    // 4. File system metrics
    let dbFileSize = 0;
    if (fs.existsSync(DB_PATH)) {
      dbFileSize = fs.statSync(DB_PATH).size;
    }

    // 5. Node runtime metrics
    const memory = process.memoryUsage();
    const uptimeSeconds = Math.floor(process.uptime());

    const isHealthy = integrityStatus === 'ok' && fkViolations.length === 0 && negativeStockProducts.length === 0;

    return res.json({
      success: true,
      healthy: isHealthy,
      data: {
        database: {
          path: DB_PATH,
          sizeBytes: dbFileSize,
          sizeFormatted: `${(dbFileSize / (1024 * 1024)).toFixed(2)} MB`,
          journalMode: journalMode ? Object.values(journalMode)[0] : 'unknown',
          integrityStatus,
          fkViolationsCount: fkViolations.length,
          fkViolations
        },
        counts: {
          billsTotal,
          billsActive,
          billsCancelled,
          customersCount,
          productsCount,
          movementsCount,
          paymentsCount,
          lowStockCount
        },
        anomalies: {
          negativeStockCount: negativeStockProducts.length,
          negativeStockProducts
        },
        runtime: {
          nodeVersion: process.version,
          platform: process.platform,
          uptimeSeconds,
          uptimeFormatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
          memoryHeapUsed: `${(memory.heapUsed / (1024 * 1024)).toFixed(2)} MB`,
          memoryRss: `${(memory.rss / (1024 * 1024)).toFixed(2)} MB`
        }
      }
    });
  } catch (err) {
    logger.error('Failed to run diagnostics', err);
    return res.status(500).json({ success: false, message: `Diagnostics failed: ${err.message}` });
  }
});

// GET /api/system/logs - Retrieve recent error & event logs
router.get('/logs', authenticate, (req, res) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const logs = logger.getRecentLogs(limit);

    return res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/system/logs - Clear error log file
router.delete('/logs', authenticate, (req, res) => {
  try {
    logger.clearLogs();
    logger.info('System logs cleared by administrator', { user: req.user.username });
    return res.json({ success: true, message: 'System logs cleared successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/system/backup - Stream atomic, WAL-checkpointed .sqlite backup file download
router.get('/backup', authenticate, (req, res) => {
  let tempBackupPath = null;
  try {
    if (!fs.existsSync(DB_PATH)) {
      return res.status(404).json({ success: false, message: 'Database file not found.' });
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const downloadFilename = `paridhan-backup-${dateStr}.sqlite`;

    // 1. Create a safe atomic snapshot using SQLite VACUUM INTO after checkpointing WAL
    const tempFileName = `paridhan-snap-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.sqlite`;
    tempBackupPath = path.join(os.tmpdir(), tempFileName);

    // Checkpoint any outstanding WAL writes into database
    try {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (_) {}

    const cleanTempPath = tempBackupPath.replace(/\\/g, '/');
    db.exec(`VACUUM INTO '${cleanTempPath}';`);

    res.setHeader('Content-Type', 'application/vnd.sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);

    logger.info('Database atomic backup downloaded by administrator', { user: req.user.username });

    const stream = fs.createReadStream(tempBackupPath);
    stream.pipe(res);

    stream.on('close', () => {
      try {
        if (tempBackupPath && fs.existsSync(tempBackupPath)) {
          fs.unlinkSync(tempBackupPath);
        }
      } catch (_) {}
    });

    stream.on('error', (err) => {
      logger.error('Backup streaming error', err);
      try {
        if (tempBackupPath && fs.existsSync(tempBackupPath)) {
          fs.unlinkSync(tempBackupPath);
        }
      } catch (_) {}
    });
  } catch (err) {
    if (tempBackupPath && fs.existsSync(tempBackupPath)) {
      try { fs.unlinkSync(tempBackupPath); } catch (_) {}
    }
    logger.error('Database backup failed', err);
    return res.status(500).json({ success: false, message: `Backup failed: ${err.message}` });
  }
});

// POST /api/system/repair - Run database optimization & fix anomalies
router.post('/repair', authenticate, (req, res) => {
  try {
    const actionsTaken = [];

    // 1. Auto-fix negative stock if any
    const negativeProducts = db.prepare('SELECT id, name, sku, current_stock FROM products WHERE current_stock < 0').all();
    if (negativeProducts.length > 0) {
      const fixTxn = db.transaction(() => {
        for (const p of negativeProducts) {
          db.prepare('UPDATE products SET current_stock = 0 WHERE id = ?').run(p.id);
          db.prepare(`
            INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason)
            VALUES (?, 'adjustment', ?, ?, 0, 'Auto-repaired negative stock anomaly')
          `).run(p.id, -p.current_stock, p.current_stock);
        }
      });
      fixTxn();
      actionsTaken.push(`Clamped ${negativeProducts.length} negative stock products back to 0.`);
    }

    // 2. Re-index & Vacuum database to optimize query performance
    db.exec('PRAGMA optimize;');
    db.exec('REINDEX;');
    db.exec('VACUUM;');
    actionsTaken.push('Ran PRAGMA optimize, REINDEX, and VACUUM to defragment storage and rebuild search indexes.');

    logger.info('Database repair & optimization executed', { user: req.user.username, actions: actionsTaken });

    return res.json({
      success: true,
      message: 'Database optimization and integrity repair completed successfully!',
      actionsTaken
    });
  } catch (err) {
    logger.error('Database repair failed', err);
    return res.status(500).json({ success: false, message: `Repair failed: ${err.message}` });
  }
});

// POST /api/system/clean-data - Reset all test transactions & customers for a clean slate
router.post('/clean-data', authenticate, (req, res) => {
  try {
    const { keepCatalog = true } = req.body;

    const resetTxn = db.transaction(() => {
      // Delete transactional tables
      db.prepare('DELETE FROM payments').run();
      db.prepare('DELETE FROM bill_items').run();
      db.prepare('DELETE FROM bills').run();
      db.prepare('DELETE FROM customers').run();

      if (keepCatalog) {
        // Reset stock movements to clean state
        db.prepare("DELETE FROM stock_movements WHERE type IN ('sale', 'return')").run();
      } else {
        db.prepare('DELETE FROM stock_movements').run();
        db.prepare('DELETE FROM products').run();
      }

      // Reset auto-increment counters for cleaned tables
      db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('bills', 'bill_items', 'payments', 'customers')").run();
      if (!keepCatalog) {
        db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('products', 'stock_movements')").run();
      }
    });

    resetTxn();

    logger.info('Database transaction data cleaned for fresh onboarding', {
      user: req.user.username,
      keepCatalog
    });

    return res.json({
      success: true,
      message: keepCatalog
        ? 'All bills, payments, and customers have been wiped clean! Uniform catalog and stock remain ready for your new sales.'
        : 'Database completely reset to clean state (including catalog).'
    });
  } catch (err) {
    logger.error('Data clean failed', err);
    return res.status(500).json({ success: false, message: `Failed to clean data: ${err.message}` });
  }
});

export default router;

