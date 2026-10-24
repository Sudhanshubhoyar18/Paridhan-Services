import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/products - list, search, filter, paginate
router.get('/', authenticate, (req, res) => {
  const {
    search = '',
    category = '',
    school = '',
    size = '',
    lowStock = 'false',
    page = 1,
    limit = 20
  } = req.query;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const conditions = [];
  const params = [];

  if (search.trim()) {
    conditions.push('(name LIKE ? OR sku LIKE ? OR school LIKE ? OR category LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (category.trim()) {
    conditions.push('category = ?');
    params.push(category.trim());
  }

  if (school.trim()) {
    conditions.push('school = ?');
    params.push(school.trim());
  }

  if (size.trim()) {
    conditions.push('size = ?');
    params.push(size.trim());
  }

  if (lowStock === 'true') {
    conditions.push('current_stock <= low_stock_threshold');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countSql = `SELECT COUNT(*) as total FROM products ${whereClause}`;
  const total = db.prepare(countSql).get(...params).total;

  // Get records
  const dataSql = `
    SELECT *,
      CASE WHEN current_stock <= low_stock_threshold THEN 1 ELSE 0 END as is_low_stock
    FROM products
    ${whereClause}
    ORDER BY name ASC, size ASC
    LIMIT ? OFFSET ?
  `;
  const items = db.prepare(dataSql).all(...params, parseInt(limit, 10), offset);

  // Metadata for filter dropdowns
  const categories = db.prepare("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category ASC").all().map(r => r.category);
  const schools = db.prepare("SELECT DISTINCT school FROM products WHERE school IS NOT NULL AND school != '' ORDER BY school ASC").all().map(r => r.school);
  const sizes = db.prepare("SELECT DISTINCT size FROM products WHERE size IS NOT NULL AND size != '' ORDER BY size ASC").all().map(r => r.size);

  return res.json({
    success: true,
    data: items,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    },
    meta: {
      categories,
      schools,
      sizes
    }
  });
});

// GET /api/products/search - Fast POS autocomplete/search
router.get('/pos-search', authenticate, (req, res) => {
  const { query = '' } = req.query;
  const q = query.trim();

  let products = [];
  if (!q) {
    products = db.prepare(`
      SELECT *, CASE WHEN current_stock <= low_stock_threshold THEN 1 ELSE 0 END as is_low_stock
      FROM products
      ORDER BY name ASC
      LIMIT 25
    `).all();
  } else {
    // Check exact SKU match first or wildcard
    products = db.prepare(`
      SELECT *, CASE WHEN current_stock <= low_stock_threshold THEN 1 ELSE 0 END as is_low_stock
      FROM products
      WHERE sku = ? OR sku LIKE ? OR name LIKE ? OR school LIKE ?
      ORDER BY (sku = ?) DESC, name ASC
      LIMIT 30
    `).all(q, `%${q}%`, `%${q}%`, `%${q}%`, q);
  }

  return res.json({
    success: true,
    data: products
  });
});

// GET /api/products/export - CSV Export
router.get('/export', authenticate, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id ASC').all();

  const csvRows = products.map(p => ({
    sku: p.sku,
    name: p.name,
    category: p.category,
    school: p.school || '',
    size: p.size,
    color: p.color,
    purchase_price: p.purchase_price,
    selling_price: p.selling_price,
    gst_rate: p.gst_rate,
    current_stock: p.current_stock,
    low_stock_threshold: p.low_stock_threshold
  }));

  const csvString = stringify(csvRows, {
    header: true,
    columns: [
      { key: 'sku', header: 'SKU' },
      { key: 'name', header: 'Name' },
      { key: 'category', header: 'Category' },
      { key: 'school', header: 'School' },
      { key: 'size', header: 'Size' },
      { key: 'color', header: 'Color' },
      { key: 'purchase_price', header: 'Purchase Price' },
      { key: 'selling_price', header: 'Selling Price' },
      { key: 'gst_rate', header: 'GST Rate' },
      { key: 'current_stock', header: 'Current Stock' },
      { key: 'low_stock_threshold', header: 'Low Stock Threshold' }
    ]
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="paridhan_products.csv"');
  return res.send(csvString);
});

// POST /api/products/import - CSV Import
router.post('/import', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a CSV file.' });
  }

  try {
    const records = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    let importedCount = 0;
    let updatedCount = 0;

    const insertOrUpdate = db.transaction(() => {
      const checkStmt = db.prepare('SELECT id, current_stock FROM products WHERE sku = ?');
      const insertStmt = db.prepare(`
        INSERT INTO products (
          name, category, school, size, color, sku,
          purchase_price, selling_price, gst_rate,
          current_stock, low_stock_threshold
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const updateStmt = db.prepare(`
        UPDATE products SET
          name = ?, category = ?, school = ?, size = ?, color = ?,
          purchase_price = ?, selling_price = ?, gst_rate = ?,
          current_stock = ?, low_stock_threshold = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      const movementStmt = db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference_id, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const row of records) {
        const sku = row.SKU || row.sku;
        const name = row.Name || row.name;
        if (!sku || !name) continue;

        const category = row.Category || row.category || 'Uniform';
        const school = row.School || row.school || '';
        const size = row.Size || row.size || 'Standard';
        const color = row.Color || row.color || 'Standard';
        const purchasePrice = parseFloat(row['Purchase Price'] || row.purchase_price || 0);
        const sellingPrice = parseFloat(row['Selling Price'] || row.selling_price || 0);
        const gstRate = parseFloat(row['GST Rate'] || row.gst_rate || 0);
        const currentStock = parseInt(row['Current Stock'] || row.current_stock || 0, 10);
        const lowStockThreshold = parseInt(row['Low Stock Threshold'] || row.low_stock_threshold || 10, 10);

        const existing = checkStmt.get(sku);
        if (existing) {
          updateStmt.run(
            name, category, school, size, color,
            purchasePrice, sellingPrice, gstRate,
            currentStock, lowStockThreshold, existing.id
          );
          if (existing.current_stock !== currentStock) {
            movementStmt.run(
              existing.id,
              'adjustment',
              currentStock - existing.current_stock,
              existing.current_stock,
              currentStock,
              'CSV-IMPORT',
              'CSV Import sync'
            );
          }
          updatedCount++;
        } else {
          const res = insertStmt.run(
            name, category, school, size, color, sku,
            purchasePrice, sellingPrice, gstRate,
            currentStock, lowStockThreshold
          );
          movementStmt.run(
            res.lastInsertRowid,
            'purchase',
            currentStock,
            0,
            currentStock,
            'CSV-IMPORT',
            'Initial CSV Import'
          );
          importedCount++;
        }
      }
    });

    insertOrUpdate();

    return res.json({
      success: true,
      message: `CSV Import completed: ${importedCount} items added, ${updatedCount} items updated.`,
      importedCount,
      updatedCount
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: `Failed to process CSV file: ${err.message}`
    });
  }
});

// GET /api/products/:id - single product with stock movement history
router.get('/:id', authenticate, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  const movements = db.prepare(`
    SELECT * FROM stock_movements
    WHERE product_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.params.id);

  return res.json({
    success: true,
    data: {
      ...product,
      is_low_stock: product.current_stock <= product.low_stock_threshold,
      movements
    }
  });
});

// POST /api/products - Create product
router.post('/', authenticate, (req, res) => {
  const {
    name, category, school, size, color, sku,
    purchase_price = 0, selling_price = 0, gst_rate = 0,
    current_stock = 0, low_stock_threshold = 10
  } = req.body;

  if (!name || !category || !size || !color || !sku) {
    return res.status(400).json({
      success: false,
      message: 'Name, category, size, color, and SKU are required.'
    });
  }

  // Check unique SKU
  const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku.trim());
  if (existing) {
    return res.status(400).json({
      success: false,
      message: `SKU '${sku}' already exists. Each variant must have a unique SKU.`
    });
  }

  const createTransaction = db.transaction(() => {
    const res = db.prepare(`
      INSERT INTO products (
        name, category, school, size, color, sku,
        purchase_price, selling_price, gst_rate,
        current_stock, low_stock_threshold
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(), category.trim(), school ? school.trim() : null, size.trim(), color.trim(), sku.trim(),
      parseFloat(purchase_price) || 0, parseFloat(selling_price) || 0, parseFloat(gst_rate) || 0,
      parseInt(current_stock, 10) || 0, parseInt(low_stock_threshold, 10) || 10
    );

    const productId = res.lastInsertRowid;

    if (parseInt(current_stock, 10) > 0) {
      db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference_id, reason)
        VALUES (?, 'purchase', ?, 0, ?, 'NEW-PRODUCT', 'Initial stock entry')
      `).run(productId, parseInt(current_stock, 10), parseInt(current_stock, 10));
    }

    return productId;
  });

  const newId = createTransaction();
  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(newId);

  return res.status(201).json({
    success: true,
    message: 'Product variant created successfully.',
    data: created
  });
});

// PUT /api/products/:id - Update product
router.put('/:id', authenticate, (req, res) => {
  const {
    name, category, school, size, color, sku,
    purchase_price, selling_price, gst_rate, low_stock_threshold
  } = req.body;

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  // Check SKU uniqueness
  if (sku && sku.trim() !== product.sku) {
    const existing = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(sku.trim(), req.params.id);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `SKU '${sku}' is already used by another product.`
      });
    }
  }

  db.prepare(`
    UPDATE products SET
      name = ?, category = ?, school = ?, size = ?, color = ?, sku = ?,
      purchase_price = ?, selling_price = ?, gst_rate = ?, low_stock_threshold = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name ? name.trim() : product.name,
    category ? category.trim() : product.category,
    school !== undefined ? (school ? school.trim() : null) : product.school,
    size ? size.trim() : product.size,
    color ? color.trim() : product.color,
    sku ? sku.trim() : product.sku,
    purchase_price !== undefined ? parseFloat(purchase_price) : product.purchase_price,
    selling_price !== undefined ? parseFloat(selling_price) : product.selling_price,
    gst_rate !== undefined ? parseFloat(gst_rate) : product.gst_rate,
    low_stock_threshold !== undefined ? parseInt(low_stock_threshold, 10) : product.low_stock_threshold,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

  return res.json({
    success: true,
    message: 'Product updated successfully.',
    data: updated
  });
});

// POST /api/products/:id/adjust-stock - Add or reduce stock with reason and stock_movements record
router.post('/:id/adjust-stock', authenticate, (req, res) => {
  const { adjustmentType, quantity, reason, referenceId } = req.body;

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ success: false, message: 'Quantity must be a positive number.' });
  }

  if (!adjustmentType || !['add', 'reduce'].includes(adjustmentType)) {
    return res.status(400).json({ success: false, message: 'Adjustment type must be either "add" or "reduce".' });
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  const previousStock = product.current_stock;
  let newStock = previousStock;
  let moveType = 'adjustment';
  let diff = qty;

  if (adjustmentType === 'add') {
    newStock = previousStock + qty;
    moveType = reason?.toLowerCase().includes('purchase') ? 'purchase' : (reason?.toLowerCase().includes('return') ? 'return' : 'adjustment');
  } else {
    if (previousStock < qty) {
      return res.status(400).json({
        success: false,
        message: `Cannot reduce ${qty} units. Current stock is only ${previousStock}.`
      });
    }
    newStock = previousStock - qty;
    diff = -qty;
  }

  const adjustTxn = db.transaction(() => {
    db.prepare('UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newStock, product.id);

    db.prepare(`
      INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference_id, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      product.id,
      moveType,
      diff,
      previousStock,
      newStock,
      referenceId || 'MANUAL-ADJUSTMENT',
      reason || (adjustmentType === 'add' ? 'Manual stock addition' : 'Manual stock reduction')
    );
  });

  adjustTxn();

  const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(product.id);

  return res.json({
    success: true,
    message: `Stock successfully adjusted to ${newStock} units.`,
    data: {
      ...updatedProduct,
      is_low_stock: updatedProduct.current_stock <= updatedProduct.low_stock_threshold
    }
  });
});

// DELETE /api/products/:id - Delete product (even if invoiced; safely unlinks bill_items while preserving invoice history)
router.delete('/:id', authenticate, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  const deleteTxn = db.transaction(() => {
    // 1. Safely unlink from bill_items (preserving all item snapshots: name, sku, price, qty in past invoices)
    db.prepare('UPDATE bill_items SET product_id = NULL WHERE product_id = ?').run(product.id);

    // 2. Delete associated stock movements
    db.prepare('DELETE FROM stock_movements WHERE product_id = ?').run(product.id);

    // 3. Delete the product itself
    db.prepare('DELETE FROM products WHERE id = ?').run(product.id);
  });

  deleteTxn();

  return res.json({
    success: true,
    message: `Product "${product.name}" (${product.sku}) deleted successfully. Existing invoice copies have been safely preserved.`
  });
});

export default router;
