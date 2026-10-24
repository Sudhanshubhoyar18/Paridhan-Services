import express from 'express';
import db from '../config/db.js';
import { generateInvoicePDF } from '../utils/invoicePdf.js';

const router = express.Router();

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return settings;
}

// Handler for streaming public invoice PDF
async function handlePublicInvoicePdf(req, res) {
  try {
    let token = req.params.token;
    if (token.endsWith('.pdf')) {
      token = token.slice(0, -4);
    }

    const bill = db.prepare('SELECT * FROM bills WHERE public_token = ?').get(token);
    if (!bill) {
      return res.status(404).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>Invoice Not Found</h2>
          <p>The requested invoice could not be found or the link has expired.</p>
        </div>
      `);
    }

    const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(bill.id);
    const settings = getSettings();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice-${bill.invoice_no}.pdf"`);

    await generateInvoicePDF(bill, items, settings, res);
  } catch (err) {
    console.error('Public Invoice PDF Error:', err);
    if (!res.headersSent) {
      res.status(500).send('Error generating invoice PDF.');
    }
  }
}

// Routes
router.get('/invoice/:token', handlePublicInvoicePdf);
router.get('/invoice/:token.pdf', handlePublicInvoicePdf);
router.get('/api/public/invoice/:token', handlePublicInvoicePdf);
router.get('/api/public/invoice/:token.pdf', handlePublicInvoicePdf);

export default router;
