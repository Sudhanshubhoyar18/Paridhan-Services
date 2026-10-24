import express from 'express';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/customers - List, search, paginate
router.get('/', authenticate, (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const conditions = [];
  const params = [];

  if (search.trim()) {
    conditions.push('(name LIKE ? OR phone LIKE ? OR school_class LIKE ? OR email LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) as count FROM customers ${whereClause}`).get(...params).count;

  const customers = db.prepare(`
    SELECT c.*,
      COUNT(b.id) as total_bills,
      COALESCE(SUM(CASE WHEN b.status = 'active' THEN b.grand_total ELSE 0 END), 0) as total_spent,
      COALESCE(SUM(CASE WHEN b.status = 'active' THEN b.balance_due ELSE 0 END), 0) as total_balance_due
    FROM customers c
    LEFT JOIN bills b ON b.customer_id = c.id
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.name ASC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit, 10), offset);

  return res.json({
    success: true,
    data: customers,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    }
  });
});

// GET /api/customers/search - Fast search for POS autocomplete
router.get('/pos-search', authenticate, (req, res) => {
  const { query = '' } = req.query;
  const q = query.trim();

  let customers = [];
  if (!q) {
    customers = db.prepare(`
      SELECT id, name, phone, email, address, school_class
      FROM customers
      ORDER BY name ASC
      LIMIT 20
    `).all();
  } else {
    customers = db.prepare(`
      SELECT id, name, phone, email, address, school_class
      FROM customers
      WHERE phone LIKE ? OR name LIKE ? OR school_class LIKE ?
      ORDER BY (phone LIKE ?) DESC, name ASC
      LIMIT 20
    `).all(`%${q}%`, `%${q}%`, `%${q}%`, `${q}%`);
  }

  return res.json({
    success: true,
    data: customers
  });
});

// GET /api/customers/:id - Single customer with complete purchase history
router.get('/:id', authenticate, (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found.' });
  }

  const bills = db.prepare(`
    SELECT id, invoice_no, public_token, grand_total, paid_amount, balance_due, payment_status, payment_mode, status, created_at
    FROM bills
    WHERE customer_id = ?
    ORDER BY created_at DESC
  `).all(req.params.id);

  const stats = db.prepare(`
    SELECT
      COUNT(id) as total_bills,
      COALESCE(SUM(CASE WHEN status = 'active' THEN grand_total ELSE 0 END), 0) as total_spent,
      COALESCE(SUM(CASE WHEN status = 'active' THEN paid_amount ELSE 0 END), 0) as total_paid,
      COALESCE(SUM(CASE WHEN status = 'active' THEN balance_due ELSE 0 END), 0) as total_balance_due
    FROM bills
    WHERE customer_id = ?
  `).get(req.params.id);

  return res.json({
    success: true,
    data: {
      ...customer,
      stats,
      bills
    }
  });
});

// POST /api/customers - Create customer
router.post('/', authenticate, (req, res) => {
  const { name, phone, email, address, school_class } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Customer name and phone number are required.' });
  }

  let formattedPhone = phone.trim();
  if (!formattedPhone.startsWith('+') && formattedPhone.length === 10) {
    formattedPhone = '+91 ' + formattedPhone;
  }

  const result = db.prepare(`
    INSERT INTO customers (name, phone, email, address, school_class)
    VALUES (?, ?, ?, ?, ?)
  `).run(name.trim(), formattedPhone, email ? email.trim() : null, address ? address.trim() : null, school_class ? school_class.trim() : null);

  const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);

  return res.status(201).json({
    success: true,
    message: 'Customer added successfully.',
    data: created
  });
});

// PUT /api/customers/:id - Update customer
router.put('/:id', authenticate, (req, res) => {
  const { name, phone, email, address, school_class } = req.body;

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found.' });
  }

  db.prepare(`
    UPDATE customers SET
      name = ?, phone = ?, email = ?, address = ?, school_class = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name ? name.trim() : customer.name,
    phone ? phone.trim() : customer.phone,
    email !== undefined ? (email ? email.trim() : null) : customer.email,
    address !== undefined ? (address ? address.trim() : null) : customer.address,
    school_class !== undefined ? (school_class ? school_class.trim() : null) : customer.school_class,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);

  return res.json({
    success: true,
    message: 'Customer updated successfully.',
    data: updated
  });
});

// DELETE /api/customers/:id - Delete customer (even if invoiced; safely unlinks bills while preserving past invoice records)
router.delete('/:id', authenticate, (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found.' });
  }

  const deleteTxn = db.transaction(() => {
    // 1. Safely unlink from bills (preserving customer_name, customer_phone snapshot in the bill)
    db.prepare('UPDATE bills SET customer_id = NULL WHERE customer_id = ?').run(customer.id);

    // 2. Delete the customer
    db.prepare('DELETE FROM customers WHERE id = ?').run(customer.id);
  });

  deleteTxn();

  return res.json({
    success: true,
    message: `Customer "${customer.name}" deleted successfully. Historical invoices have been safely preserved.`
  });
});

export default router;
