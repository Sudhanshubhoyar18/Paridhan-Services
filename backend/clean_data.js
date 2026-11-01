import db from './src/config/db.js';
import { initializeSchema } from './src/database/schema.js';

console.log('=== PARIDHAN UNIFORMS: CLEANING TRANSACTION DATA ===');

initializeSchema();

const resetTxn = db.transaction(() => {
  // Delete all data (transactions, customers, and catalog products)
  const delPayments = db.prepare('DELETE FROM payments').run();
  const delItems = db.prepare('DELETE FROM bill_items').run();
  const delBills = db.prepare('DELETE FROM bills').run();
  const delCustomers = db.prepare('DELETE FROM customers').run();
  const delMovements = db.prepare('DELETE FROM stock_movements').run();
  const delProducts = db.prepare('DELETE FROM products').run();

  // Reset auto-increment counters for all tables
  db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('bills', 'bill_items', 'payments', 'customers', 'products', 'stock_movements')").run();

  console.log(`✔ Removed ${delBills.changes} bills and ${delItems.changes} line items.`);
  console.log(`✔ Removed ${delPayments.changes} payments.`);
  console.log(`✔ Removed ${delCustomers.changes} test customers.`);
  console.log(`✔ Removed ${delProducts.changes} sample products.`);
  console.log(`✔ Removed ${delMovements.changes} stock movement audit records.`);
  console.log('✔ Reset sequential invoice numbering (new bills will start at PU-YYYY-0001).');
  console.log('✔ Entire database is completely empty: 0 products, 0 bills, 0 customers.');
});

resetTxn();

// Optimize and vacuum
db.exec('PRAGMA optimize;');
db.exec('VACUUM;');

console.log('✔ SQLite VACUUM and optimization complete.');
console.log('\n🎉 DATABASE IS NOW PRISTINE & CLEAN FOR LIVE BILLING & CUSTOMERS!\n');

