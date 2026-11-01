import express from 'express';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/settings - Retrieve all settings
router.get('/', authenticate, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });

  return res.json({
    success: true,
    data: settings
  });
});

// PUT /api/settings - Update settings
router.put('/', authenticate, (req, res) => {
  const newSettings = req.body;

  const updateStmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `);

  const saveTxn = db.transaction(() => {
    for (const [k, v] of Object.entries(newSettings)) {
      if (typeof v === 'string' || typeof v === 'number') {
        updateStmt.run(k, String(v));
      }
    }
  });

  saveTxn();

  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });

  return res.json({
    success: true,
    message: 'Settings updated successfully.',
    data: settings
  });
});

export default router;
