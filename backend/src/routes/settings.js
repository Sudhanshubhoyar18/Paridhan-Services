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
      if (k === 'apply_to_all_products') continue;
      if (typeof v === 'string' || typeof v === 'number') {
        updateStmt.run(k, String(v));
      }
    }

    // If requested or if default_gst_rate is set to 0% (Exempt), sync all products in inventory
    if (newSettings.default_gst_rate !== undefined && (newSettings.apply_to_all_products || String(newSettings.default_gst_rate) === '0')) {
      const targetGst = parseFloat(newSettings.default_gst_rate) || 0;
      db.prepare('UPDATE products SET gst_rate = ?').run(targetGst);
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
