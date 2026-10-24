import express from 'express';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { verifySmtpConnection, sendInvoiceEmail } from '../config/mailer.js';

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

// POST /api/settings/test-email - Test SMTP configuration
router.post('/test-email', authenticate, async (req, res) => {
  const { testRecipient } = req.body;

  const verification = await verifySmtpConnection();
  if (!verification.connected) {
    return res.json({
      success: false,
      configured: false,
      message: verification.message
    });
  }

  if (testRecipient) {
    try {
      await sendInvoiceEmail({
        to: testRecipient,
        subject: 'Test Email from Paridhan Uniforms Billing System',
        text: 'This is a test email confirming that your Nodemailer SMTP configuration is working perfectly!',
        pdfBuffer: Buffer.from('%PDF-1.4 ... demo buffer'),
        filename: 'Test.pdf'
      });
      return res.json({
        success: true,
        configured: true,
        message: `SMTP test email successfully sent to ${testRecipient}!`
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        configured: true,
        message: `Failed to deliver test email: ${err.message}`
      });
    }
  }

  return res.json({
    success: true,
    configured: true,
    message: verification.message
  });
});

export default router;
