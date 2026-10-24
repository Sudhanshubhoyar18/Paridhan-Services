import express from 'express';
import { stringify } from 'csv-stringify/sync';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { generateReportPDF } from '../utils/reportPdf.js';

const router = express.Router();

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return settings;
}

// 1. Sales Report Data
function getSalesReportData({ startDate, endDate, paymentStatus }) {
  const conditions = ["status = 'active'"];
  const params = [];

  if (startDate) {
    conditions.push('date(created_at) >= date(?)');
    params.push(startDate);
  }
  if (endDate) {
    conditions.push('date(created_at) <= date(?)');
    params.push(endDate);
  }
  if (paymentStatus) {
    conditions.push('payment_status = ?');
    params.push(paymentStatus);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT
      id, invoice_no, customer_name, customer_phone,
      subtotal, discount_amount, taxable_amount, total_tax,
      grand_total, paid_amount, balance_due, payment_status, payment_mode,
      created_at
    FROM bills
    ${whereClause}
    ORDER BY created_at DESC
  `).all(...params);

  const summary = db.prepare(`
    SELECT
      COUNT(id) as total_bills,
      COALESCE(SUM(grand_total), 0) as total_sales,
      COALESCE(SUM(paid_amount), 0) as total_collected,
      COALESCE(SUM(balance_due), 0) as total_dues,
      COALESCE(SUM(total_tax), 0) as total_tax_collected
    FROM bills
    ${whereClause}
  `).get(...params);

  return { rows, summary };
}

// 2. Stock Report Data
function getStockReportData({ category, school, lowStockOnly }) {
  const conditions = [];
  const params = [];

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (school) {
    conditions.push('school = ?');
    params.push(school);
  }
  if (lowStockOnly === 'true') {
    conditions.push('current_stock <= low_stock_threshold');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT
      id, sku, name, category, school, size, color,
      purchase_price, selling_price, current_stock, low_stock_threshold,
      (current_stock * purchase_price) as cost_valuation,
      (current_stock * selling_price) as retail_valuation,
      CASE WHEN current_stock <= low_stock_threshold THEN 1 ELSE 0 END as is_low_stock
    FROM products
    ${whereClause}
    ORDER BY category ASC, name ASC, size ASC
  `).all(...params);

  const summary = db.prepare(`
    SELECT
      COUNT(id) as total_products,
      COALESCE(SUM(current_stock), 0) as total_units,
      COALESCE(SUM(current_stock * purchase_price), 0) as total_cost_valuation,
      COALESCE(SUM(current_stock * selling_price), 0) as total_retail_valuation,
      COUNT(CASE WHEN current_stock <= low_stock_threshold THEN 1 END) as low_stock_count
    FROM products
    ${whereClause}
  `).get(...params);

  return { rows, summary };
}

// 3. Customer Dues Report Data
function getDuesReportData({ minDue = 1 }) {
  const rows = db.prepare(`
    SELECT
      c.id, c.name, c.phone, c.email, c.school_class,
      COUNT(b.id) as unpaid_bills_count,
      SUM(b.balance_due) as total_due,
      MAX(b.created_at) as latest_bill_date
    FROM customers c
    JOIN bills b ON b.customer_id = c.id
    WHERE b.status = 'active' AND b.balance_due > 0
    GROUP BY c.id
    HAVING total_due >= ?
    ORDER BY total_due DESC
  `).all(parseFloat(minDue) || 0);

  const summary = db.prepare(`
    SELECT
      COUNT(DISTINCT customer_id) as total_defaulters,
      COALESCE(SUM(balance_due), 0) as total_pending_dues
    FROM bills
    WHERE status = 'active' AND balance_due > 0
  `).get();

  return { rows, summary };
}

// GET /api/reports/sales
router.get('/sales', authenticate, (req, res) => {
  const result = getSalesReportData(req.query);
  return res.json({ success: true, ...result });
});

// GET /api/reports/sales/csv
router.get('/sales/csv', authenticate, (req, res) => {
  const { rows } = getSalesReportData(req.query);

  const csvRows = rows.map(r => ({
    date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '',
    invoice_no: r.invoice_no,
    customer: r.customer_name,
    phone: r.customer_phone,
    payment_mode: r.payment_mode,
    status: r.payment_status,
    subtotal: r.subtotal,
    discount: r.discount_amount,
    tax: r.total_tax,
    total: r.grand_total,
    paid: r.paid_amount,
    balance: r.balance_due
  }));

  const csv = stringify(csvRows, {
    header: true,
    columns: ['date', 'invoice_no', 'customer', 'phone', 'payment_mode', 'status', 'subtotal', 'discount', 'tax', 'total', 'paid', 'balance']
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sales_report.csv"');
  return res.send(csv);
});

// GET /api/reports/sales/pdf
router.get('/sales/pdf', authenticate, async (req, res) => {
  try {
    const { rows } = getSalesReportData(req.query);
    const settings = getSettings();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="sales_report.pdf"');

    await generateReportPDF('sales', rows, req.query, settings, res);
  } catch (err) {
    console.error('Sales Report PDF Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF report.' });
  }
});

// GET /api/reports/stock
router.get('/stock', authenticate, (req, res) => {
  const result = getStockReportData(req.query);
  return res.json({ success: true, ...result });
});

// GET /api/reports/stock/csv
router.get('/stock/csv', authenticate, (req, res) => {
  const { rows } = getStockReportData(req.query);

  const csvRows = rows.map(r => ({
    sku: r.sku,
    name: r.name,
    category: r.category,
    school: r.school || 'General',
    size: r.size,
    color: r.color,
    purchase_price: r.purchase_price,
    selling_price: r.selling_price,
    stock: r.current_stock,
    threshold: r.low_stock_threshold,
    cost_valuation: r.cost_valuation,
    retail_valuation: r.retail_valuation
  }));

  const csv = stringify(csvRows, {
    header: true,
    columns: ['sku', 'name', 'category', 'school', 'size', 'color', 'purchase_price', 'selling_price', 'stock', 'threshold', 'cost_valuation', 'retail_valuation']
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="stock_report.csv"');
  return res.send(csv);
});

// GET /api/reports/stock/pdf
router.get('/stock/pdf', authenticate, async (req, res) => {
  try {
    const { rows } = getStockReportData(req.query);
    const settings = getSettings();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="stock_report.pdf"');

    await generateReportPDF('stock', rows, req.query, settings, res);
  } catch (err) {
    console.error('Stock Report PDF Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF report.' });
  }
});

// GET /api/reports/dues
router.get('/dues', authenticate, (req, res) => {
  const result = getDuesReportData(req.query);
  return res.json({ success: true, ...result });
});

// GET /api/reports/dues/csv
router.get('/dues/csv', authenticate, (req, res) => {
  const { rows } = getDuesReportData(req.query);

  const csvRows = rows.map(r => ({
    customer: r.name,
    phone: r.phone,
    email: r.email || '',
    school_class: r.school_class || '',
    unpaid_bills: r.unpaid_bills_count,
    total_due: r.total_due,
    latest_bill: r.latest_bill_date ? new Date(r.latest_bill_date).toLocaleDateString('en-IN') : ''
  }));

  const csv = stringify(csvRows, {
    header: true,
    columns: ['customer', 'phone', 'email', 'school_class', 'unpaid_bills', 'total_due', 'latest_bill']
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="customer_dues_report.csv"');
  return res.send(csv);
});

// GET /api/reports/dues/pdf
router.get('/dues/pdf', authenticate, async (req, res) => {
  try {
    const { rows } = getDuesReportData(req.query);
    const settings = getSettings();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="dues_report.pdf"');

    await generateReportPDF('dues', rows, req.query, settings, res);
  } catch (err) {
    console.error('Dues Report PDF Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF report.' });
  }
});

export default router;
