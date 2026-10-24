import express from 'express';
import crypto from 'crypto';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { generateInvoicePDF } from '../utils/invoicePdf.js';
import { sendInvoiceEmail } from '../config/mailer.js';
import { formatWhatsAppMessage, buildWhatsAppUrl } from '../utils/whatsapp.js';
import { generateInvoiceEmailHtml } from '../utils/invoiceEmailTemplate.js';

const router = express.Router();

// Helper to get all settings as an object
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return settings;
}

// Helper to generate sequential invoice number: PU-YYYY-0001
function getNextInvoiceNumber(prefix = 'PU') {
  const currentYear = new Date().getFullYear();
  const pattern = `${prefix}-${currentYear}-%`;

  const lastInvoice = db.prepare(`
    SELECT invoice_no FROM bills
    WHERE invoice_no LIKE ?
    ORDER BY id DESC
    LIMIT 1
  `).get(pattern);

  let seq = 1;
  if (lastInvoice && lastInvoice.invoice_no) {
    const parts = lastInvoice.invoice_no.split('-');
    if (parts.length >= 3) {
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }
  }

  const paddedSeq = String(seq).padStart(4, '0');
  return `${prefix}-${currentYear}-${paddedSeq}`;
}

// GET /api/bills - List with filters & pagination
router.get('/', authenticate, (req, res) => {
  const {
    search = '',
    startDate = '',
    endDate = '',
    paymentStatus = '',
    status = '',
    page = 1,
    limit = 20
  } = req.query;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const conditions = [];
  const params = [];

  if (search.trim()) {
    conditions.push('(invoice_no LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

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

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) as count FROM bills ${whereClause}`).get(...params).count;

  const bills = db.prepare(`
    SELECT * FROM bills
    ${whereClause}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit, 10), offset);

  return res.json({
    success: true,
    data: bills,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    }
  });
});

// GET /api/bills/:id - Bill details with items and payments
router.get('/:id', authenticate, (req, res) => {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found.' });
  }

  const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(bill.id);
  const payments = db.prepare('SELECT * FROM payments WHERE bill_id = ? ORDER BY created_at DESC').all(bill.id);
  const customer = bill.customer_id ? db.prepare('SELECT * FROM customers WHERE id = ?').get(bill.customer_id) : null;

  return res.json({
    success: true,
    data: {
      ...bill,
      items,
      payments,
      customer
    }
  });
});

// POST /api/bills - Create bill in DB transaction with stock deduction and invoice generation
router.post('/', authenticate, (req, res) => {
  const {
    customer_id,
    customer_name,
    customer_phone,
    customer_email,
    customer_address,
    customer_school_class,
    items,
    discount_type = 'flat',
    discount_val = 0,
    paid_amount = 0,
    payment_mode = 'Cash',
    payment_reference = '',
    notes = ''
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one item must be added to the bill.' });
  }

  if (!customer_name || !customer_phone) {
    return res.status(400).json({ success: false, message: 'Customer name and phone number are required.' });
  }

  const settings = getSettings();
  const invoicePrefix = settings.invoice_prefix || 'PU';

  // Transaction for stock verification and bill creation
  const createBillTransaction = db.transaction(() => {
    // 1. Verify stock availability for all items
    for (const item of items) {
      if (!item.product_id) continue; // Custom or manual item

      const product = db.prepare('SELECT id, name, sku, current_stock FROM products WHERE id = ?').get(item.product_id);
      if (!product) {
        throw new Error(`Product ID ${item.product_id} not found in inventory.`);
      }

      const reqQty = parseInt(item.quantity, 10);
      if (reqQty <= 0) {
        throw new Error(`Invalid quantity for ${product.name}.`);
      }

      if (product.current_stock < reqQty) {
        throw new Error(`Insufficient stock for "${product.name}" (${product.sku}). Available: ${product.current_stock}, Requested: ${reqQty}.`);
      }
    }

    // 2. Generate sequential invoice number
    const invoiceNo = getNextInvoiceNumber(invoicePrefix);
    const publicToken = crypto.randomBytes(16).toString('hex');

    // 3. Calculate line items, GST split, and subtotal
    let subtotal = 0;
    let totalTax = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;

    const processedItems = items.map(item => {
      const qty = parseInt(item.quantity, 10);
      const unitPrice = parseFloat(item.unit_price) || 0;
      const itemDiscount = parseFloat(item.discount) || 0;
      const gstRate = parseFloat(item.gst_rate) || 0;

      // Line total before GST: (rate * qty) - discount
      const lineSubtotal = Math.max(0, (unitPrice * qty) - itemDiscount);

      // GST calculation
      const lineGst = (lineSubtotal * gstRate) / 100;
      const lineCgst = lineGst / 2;
      const lineSgst = lineGst / 2;
      const lineTotal = lineSubtotal + lineGst;

      subtotal += (unitPrice * qty) - itemDiscount;
      totalTax += lineGst;
      cgstTotal += lineCgst;
      sgstTotal += lineSgst;

      return {
        ...item,
        quantity: qty,
        unit_price: unitPrice,
        discount: itemDiscount,
        gst_rate: gstRate,
        taxable_value: lineSubtotal,
        cgst_amount: lineCgst,
        sgst_amount: lineSgst,
        total_amount: lineTotal
      };
    });

    // 4. Overall bill discount calculation
    const discVal = parseFloat(discount_val) || 0;
    let discountAmount = 0;
    if (discount_type === 'percent') {
      discountAmount = (subtotal * discVal) / 100;
    } else {
      discountAmount = discVal;
    }
    discountAmount = Math.min(discountAmount, subtotal);

    const taxableAmount = Math.max(0, subtotal - discountAmount);
    // Recalculate tax if overall discount applies
    let effectiveCgst = cgstTotal;
    let effectiveSgst = sgstTotal;
    let effectiveTotalTax = totalTax;

    if (subtotal > 0 && discountAmount > 0) {
      const discountRatio = taxableAmount / subtotal;
      effectiveCgst = cgstTotal * discountRatio;
      effectiveSgst = sgstTotal * discountRatio;
      effectiveTotalTax = effectiveCgst + effectiveSgst;
    }

    const exactGrandTotal = taxableAmount + effectiveTotalTax;
    const roundedGrandTotal = Math.round(exactGrandTotal);
    const roundOff = Number((roundedGrandTotal - exactGrandTotal).toFixed(2));

    const finalPaid = Math.max(0, parseFloat(paid_amount) || 0);
    const balanceDue = Math.max(0, roundedGrandTotal - finalPaid);

    let paymentStatus = 'Paid';
    if (finalPaid === 0) {
      paymentStatus = 'Unpaid';
    } else if (finalPaid < roundedGrandTotal) {
      paymentStatus = 'Partial';
    }

    // 5. Handle customer: if customer_id is empty, search or create customer
    let resolvedCustomerId = customer_id ? parseInt(customer_id, 10) : null;
    if (!resolvedCustomerId && customer_phone) {
      const existingCustomer = db.prepare('SELECT id FROM customers WHERE phone = ?').get(customer_phone.trim());
      if (existingCustomer) {
        resolvedCustomerId = existingCustomer.id;
      } else {
        const createCustRes = db.prepare(`
          INSERT INTO customers (name, phone, email, address, school_class)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          customer_name.trim(),
          customer_phone.trim(),
          customer_email ? customer_email.trim() : null,
          customer_address ? customer_address.trim() : null,
          customer_school_class ? customer_school_class.trim() : null
        );
        resolvedCustomerId = createCustRes.lastInsertRowid;
      }
    }

    // 6. Insert into bills table
    const insertBillStmt = db.prepare(`
      INSERT INTO bills (
        invoice_no, public_token, customer_id, customer_name, customer_phone,
        customer_email, customer_address, customer_school_class,
        subtotal, discount_type, discount_val, discount_amount,
        taxable_amount, cgst_amount, sgst_amount, total_tax,
        round_off, grand_total, paid_amount, balance_due,
        payment_status, payment_mode, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    const billInsertRes = insertBillStmt.run(
      invoiceNo,
      publicToken,
      resolvedCustomerId,
      customer_name.trim(),
      customer_phone.trim(),
      customer_email ? customer_email.trim() : null,
      customer_address ? customer_address.trim() : null,
      customer_school_class ? customer_school_class.trim() : null,
      subtotal,
      discount_type,
      discVal,
      discountAmount,
      taxableAmount,
      effectiveCgst,
      effectiveSgst,
      effectiveTotalTax,
      roundOff,
      roundedGrandTotal,
      finalPaid,
      balanceDue,
      paymentStatus,
      payment_mode,
      notes ? notes.trim() : null
    );

    const billId = billInsertRes.lastInsertRowid;

    // 7. Insert bill items and deduct stock + record stock movement
    const insertItemStmt = db.prepare(`
      INSERT INTO bill_items (
        bill_id, product_id, product_name, category, school, size, color, sku,
        quantity, unit_price, discount, gst_rate, taxable_value,
        cgst_amount, sgst_amount, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStockStmt = db.prepare(`
      UPDATE products
      SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const recordMovementStmt = db.prepare(`
      INSERT INTO stock_movements (
        product_id, type, quantity, previous_stock, new_stock, reference_id, reason
      ) VALUES (?, 'sale', ?, ?, ?, ?, ?)
    `);

    for (const item of processedItems) {
      insertItemStmt.run(
        billId,
        item.product_id || null,
        item.product_name,
        item.category || null,
        item.school || null,
        item.size || null,
        item.color || null,
        item.sku || null,
        item.quantity,
        item.unit_price,
        item.discount,
        item.gst_rate,
        item.taxable_value,
        item.cgst_amount,
        item.sgst_amount,
        item.total_amount
      );

      // Deduct stock if linked to product
      if (item.product_id) {
        const prod = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(item.product_id);
        const prevStock = prod.current_stock;
        const newStock = prevStock - item.quantity;

        updateStockStmt.run(item.quantity, item.product_id);
        recordMovementStmt.run(
          item.product_id,
          -item.quantity,
          prevStock,
          newStock,
          invoiceNo,
          `Sale Invoice ${invoiceNo}`
        );
      }
    }

    // 8. Record initial payment if paid > 0
    if (finalPaid > 0) {
      db.prepare(`
        INSERT INTO payments (bill_id, amount, payment_mode, reference_no, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(billId, finalPaid, payment_mode, payment_reference || null, 'Payment received at billing');
    }

    return billId;
  });

  try {
    const billId = createBillTransaction();
    const createdBill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);
    const createdItems = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(billId);

    return res.status(201).json({
      success: true,
      message: `Invoice ${createdBill.invoice_no} created successfully!`,
      data: {
        ...createdBill,
        items: createdItems
      }
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

// POST /api/bills/:id/payments - Record additional payment for partial / unpaid bill
router.post('/:id/payments', authenticate, (req, res) => {
  const { amount, payment_mode = 'Cash', reference_no = '', notes = '' } = req.body;
  const payAmt = parseFloat(amount);

  if (isNaN(payAmt) || payAmt <= 0) {
    return res.status(400).json({ success: false, message: 'Valid payment amount is required.' });
  }

  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found.' });
  }

  if (bill.status === 'cancelled') {
    return res.status(400).json({ success: false, message: 'Cannot add payment to a cancelled bill.' });
  }

  if (bill.balance_due <= 0) {
    return res.status(400).json({ success: false, message: 'This bill is already fully paid.' });
  }

  const paymentTxn = db.transaction(() => {
    db.prepare(`
      INSERT INTO payments (bill_id, amount, payment_mode, reference_no, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(bill.id, payAmt, payment_mode, reference_no || null, notes || null);

    const newPaid = Number(bill.paid_amount) + payAmt;
    const newBalance = Math.max(0, Number(bill.grand_total) - newPaid);
    const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';

    db.prepare(`
      UPDATE bills SET
        paid_amount = ?, balance_due = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newPaid, newBalance, newStatus, bill.id);
  });

  paymentTxn();

  const updatedBill = db.prepare('SELECT * FROM bills WHERE id = ?').get(bill.id);
  const payments = db.prepare('SELECT * FROM payments WHERE bill_id = ? ORDER BY created_at DESC').all(bill.id);

  return res.json({
    success: true,
    message: 'Payment recorded successfully.',
    data: {
      ...updatedBill,
      payments
    }
  });
});

// POST /api/bills/:id/cancel - Cancel bill and restore inventory stock inside transaction
router.post('/:id/cancel', authenticate, (req, res) => {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found.' });
  }

  if (bill.status === 'cancelled') {
    return res.status(400).json({ success: false, message: 'This bill is already cancelled.' });
  }

  const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(bill.id);

  const cancelTxn = db.transaction(() => {
    // 1. Mark bill as cancelled
    db.prepare(`UPDATE bills SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(bill.id);

    // 2. Restore stock for each item and log stock movement
    const restoreStockStmt = db.prepare(`
      UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const recordMovementStmt = db.prepare(`
      INSERT INTO stock_movements (
        product_id, type, quantity, previous_stock, new_stock, reference_id, reason
      ) VALUES (?, 'return', ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      if (item.product_id) {
        const prod = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(item.product_id);
        if (prod) {
          const prev = prod.current_stock;
          const next = prev + item.quantity;
          restoreStockStmt.run(item.quantity, item.product_id);
          recordMovementStmt.run(
            item.product_id,
            item.quantity,
            prev,
            next,
            bill.invoice_no,
            `Cancellation of bill ${bill.invoice_no}`
          );
        }
      }
    }
  });

  cancelTxn();

  const updated = db.prepare('SELECT * FROM bills WHERE id = ?').get(bill.id);

  return res.json({
    success: true,
    message: `Bill ${bill.invoice_no} cancelled successfully and inventory stock restored!`,
    data: updated
  });
});

// GET /api/bills/:id/pdf - Stream PDF invoice
router.get('/:id/pdf', authenticate, async (req, res) => {
  try {
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }

    const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(bill.id);
    const settings = getSettings();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice-${bill.invoice_no}.pdf"`);

    await generateInvoicePDF(bill, items, settings, res);
  } catch (err) {
    console.error('PDF Generation Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF.' });
    }
  }
});

// GET /api/bills/:id/email-preview - Preview the rendered HTML email before sending
router.get('/:id/email-preview', authenticate, (req, res) => {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found.' });
  }

  const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(bill.id);
  const settings = getSettings();
  const publicBaseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';

  const html = generateInvoiceEmailHtml({ bill, items, settings, publicBaseUrl });
  const subject = `Invoice ${bill.invoice_no} from ${settings.business_name || 'Paridhan Uniforms'}`;

  return res.json({
    success: true,
    data: {
      to: bill.customer_email || '',
      customerName: bill.customer_name,
      subject,
      html
    }
  });
});

// POST /api/bills/:id/email - Send invoice via email with PDF attachment & HTML layout
router.post('/:id/email', authenticate, async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }

    const targetEmail = to || bill.customer_email;
    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Recipient email address is required.' });
    }

    const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(bill.id);
    const settings = getSettings();
    const publicBaseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';

    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePDF(bill, items, settings);

    // Generate rich HTML email
    const emailHtml = generateInvoiceEmailHtml({ bill, items, settings, publicBaseUrl });

    const emailSubject = subject || `Invoice ${bill.invoice_no} from ${settings.business_name || 'Paridhan Uniforms'}`;
    const emailBody = body || `Dear ${bill.customer_name},\n\nPlease find attached the tax invoice ${bill.invoice_no} for your purchase at Paridhan Uniforms.\n\nTotal Amount: ₹${bill.grand_total}\nPaid: ₹${bill.paid_amount}\nBalance Due: ₹${bill.balance_due}\n\nThank you for choosing Paridhan Uniforms!`;

    const emailResult = await sendInvoiceEmail({
      to: targetEmail,
      subject: emailSubject,
      text: emailBody,
      html: emailHtml,
      pdfBuffer,
      filename: `Invoice-${bill.invoice_no}.pdf`
    });

    // Mark email_sent in DB
    db.prepare(`
      UPDATE bills
      SET email_sent = 1, email_sent_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(bill.id);

    return res.json({
      success: true,
      message: emailResult.message,
      previewUrl: emailResult.previewUrl || null,
      simulated: emailResult.simulated
    });
  } catch (err) {
    console.error('Email sending error:', err);
    return res.status(500).json({
      success: false,
      message: `Failed to send email: ${err.message}`
    });
  }
});

// GET /api/bills/:id/whatsapp-data - Get WhatsApp click-to-chat data
router.get('/:id/whatsapp-data', authenticate, (req, res) => {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found.' });
  }

  const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(bill.id);
  const settings = getSettings();

  const template = req.query.type === 'reminder'
    ? (settings.whatsapp_reminder_template || '')
    : (settings.whatsapp_invoice_template || '');

  const publicBaseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';
  const message = formatWhatsAppMessage(template, bill, items, settings, publicBaseUrl);
  const waUrl = buildWhatsAppUrl(bill.customer_phone, message);

  return res.json({
    success: true,
    data: {
      phone: bill.customer_phone,
      message,
      waUrl,
      publicToken: bill.public_token
    }
  });
});

// POST /api/bills/:id/whatsapp-sent - Mark whatsapp sent
router.post('/:id/whatsapp-sent', authenticate, (req, res) => {
  const bill = db.prepare('SELECT id FROM bills WHERE id = ?').get(req.params.id);
  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found.' });
  }

  db.prepare(`
    UPDATE bills
    SET whatsapp_sent = 1, whatsapp_sent_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(bill.id);

  return res.json({
    success: true,
    message: 'WhatsApp sent status recorded.'
  });
});

export default router;
