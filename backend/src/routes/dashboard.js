import express from 'express';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/dashboard - Summary stats, charts, and recent activity
router.get('/', authenticate, (req, res) => {
  const { startDate, endDate } = req.query;

  // 1. KPI Cards
  // Today's Sales
  const todaySales = db.prepare(`
    SELECT
      COALESCE(SUM(grand_total), 0) as total_sales,
      COALESCE(SUM(paid_amount), 0) as total_collected,
      COUNT(id) as bills_count
    FROM bills
    WHERE status = 'active' AND date(created_at) = date('now', 'localtime')
  `).get();

  // This Month's Sales
  const thisMonthSales = db.prepare(`
    SELECT
      COALESCE(SUM(grand_total), 0) as total_sales,
      COALESCE(SUM(paid_amount), 0) as total_collected,
      COUNT(id) as bills_count
    FROM bills
    WHERE status = 'active'
      AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')
  `).get();

  // Total Pending Payments (all time active bills)
  const pendingDues = db.prepare(`
    SELECT COALESCE(SUM(balance_due), 0) as total_pending
    FROM bills
    WHERE status = 'active' AND balance_due > 0
  `).get();

  // Total Stock Value & Low Stock count
  const inventoryStats = db.prepare(`
    SELECT
      COALESCE(SUM(current_stock * selling_price), 0) as total_selling_value,
      COALESCE(SUM(current_stock * purchase_price), 0) as total_purchase_value,
      COALESCE(SUM(current_stock), 0) as total_units,
      COUNT(CASE WHEN current_stock <= low_stock_threshold THEN 1 END) as low_stock_count
    FROM products
  `).get();

  // 2. Charts Data
  // Last 30 Days Sales Trend
  const last30DaysSales = db.prepare(`
    WITH RECURSIVE dates(date) AS (
      SELECT date('now', 'localtime', '-29 days')
      UNION ALL
      SELECT date(date, '+1 day')
      FROM dates
      WHERE date < date('now', 'localtime')
    )
    SELECT
      dates.date,
      strftime('%d/%m', dates.date) as display_date,
      COALESCE(SUM(b.grand_total), 0) as sales,
      COALESCE(SUM(b.paid_amount), 0) as collected,
      COUNT(b.id) as bills_count
    FROM dates
    LEFT JOIN bills b ON date(b.created_at) = dates.date AND b.status = 'active'
    GROUP BY dates.date
    ORDER BY dates.date ASC
  `).all();

  // Top 10 Selling Items (by quantity sold)
  const topSellingItems = db.prepare(`
    SELECT
      bi.product_name as name,
      bi.size,
      SUM(bi.quantity) as total_qty,
      SUM(bi.total_amount) as total_revenue
    FROM bill_items bi
    JOIN bills b ON b.id = bi.bill_id
    WHERE b.status = 'active'
    GROUP BY bi.product_name, bi.size
    ORDER BY total_qty DESC
    LIMIT 10
  `).all();

  // Sales by Category
  const salesByCategory = db.prepare(`
    SELECT
      COALESCE(bi.category, 'Other') as category,
      SUM(bi.total_amount) as total_sales,
      SUM(bi.quantity) as total_quantity
    FROM bill_items bi
    JOIN bills b ON b.id = bi.bill_id
    WHERE b.status = 'active'
    GROUP BY bi.category
    ORDER BY total_sales DESC
  `).all();

  // Stock by Category
  const stockByCategory = db.prepare(`
    SELECT
      category,
      SUM(current_stock) as total_stock,
      SUM(current_stock * selling_price) as stock_value
    FROM products
    GROUP BY category
    ORDER BY total_stock DESC
  `).all();

  // 3. Low-Stock Alert List
  const lowStockAlerts = db.prepare(`
    SELECT id, name, sku, category, school, size, color, current_stock, low_stock_threshold, selling_price
    FROM products
    WHERE current_stock <= low_stock_threshold
    ORDER BY current_stock ASC
    LIMIT 15
  `).all();

  // 4. 10 Most Recent Bills
  const recentBills = db.prepare(`
    SELECT id, invoice_no, public_token, customer_name, customer_phone, grand_total, paid_amount, balance_due, payment_status, payment_mode, status, created_at
    FROM bills
    ORDER BY id DESC
    LIMIT 10
  `).all();

  return res.json({
    success: true,
    data: {
      cards: {
        todaySales: todaySales.total_sales,
        todayCollected: todaySales.total_collected,
        todayBillsCount: todaySales.bills_count,
        thisMonthSales: thisMonthSales.total_sales,
        thisMonthBillsCount: thisMonthSales.bills_count,
        totalPendingPayments: pendingDues.total_pending,
        totalStockValue: inventoryStats.total_selling_value,
        totalCostValue: inventoryStats.total_purchase_value,
        totalStockUnits: inventoryStats.total_units,
        lowStockItemsCount: inventoryStats.low_stock_count
      },
      charts: {
        last30DaysSales,
        topSellingItems,
        salesByCategory,
        stockByCategory
      },
      lowStockAlerts,
      recentBills
    }
  });
});

export default router;
