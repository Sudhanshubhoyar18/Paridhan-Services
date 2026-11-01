import bcrypt from 'bcryptjs';
import db from '../config/db.js';
import { initializeSchema } from './schema.js';

export function seedDatabase() {
  initializeSchema();

  // 1. Seed Admin User
  const adminCheck = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminCheck) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('admin123', salt);
    db.prepare(`
      INSERT INTO users (username, password, name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin', hashedPassword, 'Store Administrator', 'admin');
    console.log('✔ Default admin user seeded (admin / admin123)');
  }

  // 2. Seed Default Settings
  const defaultSettings = [
    { key: 'business_name', value: 'Paridhan Uniforms' },
    { key: 'business_address', value: 'Shop 14-15, Uniform Plaza, Central Market, Sector 14, Gurugram, Haryana - 122001' },
    { key: 'business_phone', value: '+91 98765 43210' },
    { key: 'business_email', value: 'billing@paridhanuniforms.com' },
    { key: 'business_gstin', value: '07AAAAA1234A1Z5' },
    { key: 'invoice_prefix', value: 'PU' },
    { key: 'default_gst_rate', value: '5' },
    { key: 'terms_and_conditions', value: '1. Goods once sold can be exchanged within 7 days with original invoice intact.\n2. Items with alterations or washing will not be exchanged.\n3. Alteration facility is complimentary for 7 days from purchase.' },
    {
      key: 'whatsapp_invoice_template',
      value: `Hello {customer},
Thank you for shopping with *Paridhan Uniforms*.
🧾 Invoice: {invoice_no}
📅 Date: {date}
Items:
{items}
💰 Total: ₹{total}
✅ Paid: ₹{paid}
⏳ Balance: ₹{balance}
Invoice PDF: {pdf_link}
Regards, Paridhan Uniforms`
    },
    {
      key: 'whatsapp_reminder_template',
      value: `Hello {customer},
This is a gentle payment reminder from *Paridhan Uniforms* for Invoice {invoice_no} dated {date}.
💰 Total: ₹{total}
✅ Paid: ₹{paid}
⏳ Due Balance: ₹{balance}
Invoice PDF: {pdf_link}
Kindly clear the balance at your earliest convenience via UPI or cash.
Regards, Paridhan Uniforms`
    }
  ];

  const insertSetting = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO NOTHING
  `);

  for (const s of defaultSettings) {
    insertSetting.run(s.key, s.value);
  }
  console.log('✔ Default settings verified/seeded');

  // 3. Seed Products (only if explicitly invoked with --with-samples)
  const shouldSeedSamples = process.argv.includes('--with-samples');
  if (shouldSeedSamples) {
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    if (productCount === 0) {
    const sampleProducts = [
      {
        name: 'Boys Oxford Regular Shirt',
        category: 'Topwear',
        school: 'Delhi Public School',
        size: '30',
        color: 'White',
        sku: 'DPS-SH-WHT-30',
        purchase_price: 280,
        selling_price: 450,
        gst_rate: 5,
        current_stock: 45,
        low_stock_threshold: 15
      },
      {
        name: 'Boys Oxford Regular Shirt',
        category: 'Topwear',
        school: 'Delhi Public School',
        size: '34',
        color: 'White',
        sku: 'DPS-SH-WHT-34',
        purchase_price: 320,
        selling_price: 520,
        gst_rate: 5,
        current_stock: 8, // Low stock for alert testing
        low_stock_threshold: 15
      },
      {
        name: 'Girls Peter Pan Collar Shirt',
        category: 'Topwear',
        school: 'St. Xavier\'s High School',
        size: '32',
        color: 'Sky Blue',
        sku: 'STX-SH-SKY-32',
        purchase_price: 310,
        selling_price: 490,
        gst_rate: 5,
        current_stock: 25,
        low_stock_threshold: 10
      },
      {
        name: 'Girls Peter Pan Collar Shirt',
        category: 'Topwear',
        school: 'St. Xavier\'s High School',
        size: '36',
        color: 'Sky Blue',
        sku: 'STX-SH-SKY-36',
        purchase_price: 340,
        selling_price: 550,
        gst_rate: 5,
        current_stock: 4, // Low stock
        low_stock_threshold: 10
      },
      {
        name: 'Pleated Uniform Skirt',
        category: 'Bottomwear',
        school: 'Delhi Public School',
        size: '28',
        color: 'Forest Green',
        sku: 'DPS-SK-GRN-28',
        purchase_price: 360,
        selling_price: 580,
        gst_rate: 5,
        current_stock: 30,
        low_stock_threshold: 12
      },
      {
        name: 'Pleated Uniform Skirt',
        category: 'Bottomwear',
        school: 'St. Xavier\'s High School',
        size: '30',
        color: 'Navy Blue',
        sku: 'STX-SK-NVY-30',
        purchase_price: 370,
        selling_price: 600,
        gst_rate: 5,
        current_stock: 18,
        low_stock_threshold: 10
      },
      {
        name: 'Formal School Trousers',
        category: 'Bottomwear',
        school: 'Delhi Public School',
        size: '30',
        color: 'Forest Green',
        sku: 'DPS-TR-GRN-30',
        purchase_price: 400,
        selling_price: 650,
        gst_rate: 5,
        current_stock: 40,
        low_stock_threshold: 15
      },
      {
        name: 'Formal School Trousers',
        category: 'Bottomwear',
        school: 'Army Public School',
        size: '32',
        color: 'Steel Grey',
        sku: 'APS-TR-GRY-32',
        purchase_price: 420,
        selling_price: 680,
        gst_rate: 5,
        current_stock: 6, // Low stock
        low_stock_threshold: 12
      },
      {
        name: 'Winter Woolen Blazer with Crest',
        category: 'Winterwear',
        school: 'Delhi Public School',
        size: '34',
        color: 'Bottle Green',
        sku: 'DPS-BLZ-GRN-34',
        purchase_price: 1100,
        selling_price: 1850,
        gst_rate: 12,
        current_stock: 14,
        low_stock_threshold: 8
      },
      {
        name: 'Winter Woolen Blazer with Crest',
        category: 'Winterwear',
        school: 'St. Xavier\'s High School',
        size: '38',
        color: 'Navy Blue',
        sku: 'STX-BLZ-NVY-38',
        purchase_price: 1200,
        selling_price: 1950,
        gst_rate: 12,
        current_stock: 5, // Low stock
        low_stock_threshold: 10
      },
      {
        name: 'V-Neck Knitted Pullover Sweater',
        category: 'Winterwear',
        school: 'General / Generic',
        size: '32',
        color: 'Maroon',
        sku: 'GEN-SWT-MRN-32',
        purchase_price: 450,
        selling_price: 750,
        gst_rate: 5,
        current_stock: 35,
        low_stock_threshold: 10
      },
      {
        name: 'Woven Striped School Tie',
        category: 'Accessories',
        school: 'Delhi Public School',
        size: 'Standard',
        color: 'Green & Gold Stripe',
        sku: 'DPS-TIE-STR-01',
        purchase_price: 80,
        selling_price: 160,
        gst_rate: 5,
        current_stock: 120,
        low_stock_threshold: 30
      },
      {
        name: 'Embossed Brass Buckle Belt',
        category: 'Accessories',
        school: 'Army Public School',
        size: '32',
        color: 'Black & Khaki',
        sku: 'APS-BLT-BLK-32',
        purchase_price: 90,
        selling_price: 180,
        gst_rate: 5,
        current_stock: 80,
        low_stock_threshold: 25
      },
      {
        name: 'Cushioned Cotton Uniform Socks (Pair)',
        category: 'Footwear',
        school: 'General / Generic',
        size: 'Free Size',
        color: 'White & Navy Stripes',
        sku: 'GEN-SCK-WHT-01',
        purchase_price: 40,
        selling_price: 90,
        gst_rate: 5,
        current_stock: 150,
        low_stock_threshold: 40
      },
      {
        name: 'Black Leather School Shoes',
        category: 'Footwear',
        school: 'General / Generic',
        size: '6 UK',
        color: 'Black',
        sku: 'GEN-SHOE-BLK-06',
        purchase_price: 550,
        selling_price: 950,
        gst_rate: 12,
        current_stock: 12,
        low_stock_threshold: 8
      },
      {
        name: 'White PT Sports Canvas Shoes',
        category: 'Footwear',
        school: 'General / Generic',
        size: '7 UK',
        color: 'White',
        sku: 'GEN-PT-WHT-07',
        purchase_price: 320,
        selling_price: 550,
        gst_rate: 12,
        current_stock: 3, // Low stock
        low_stock_threshold: 10
      }
    ];

    const insertProd = db.prepare(`
      INSERT INTO products (
        name, category, school, size, color, sku,
        purchase_price, selling_price, gst_rate,
        current_stock, low_stock_threshold
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMove = db.prepare(`
      INSERT INTO stock_movements (
        product_id, type, quantity, previous_stock, new_stock, reference_id, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of sampleProducts) {
      const res = insertProd.run(
        p.name, p.category, p.school, p.size, p.color, p.sku,
        p.purchase_price, p.selling_price, p.gst_rate,
        p.current_stock, p.low_stock_threshold
      );
      insertMove.run(
        res.lastInsertRowid,
        'purchase',
        p.current_stock,
        0,
        p.current_stock,
        'INITIAL-SEED',
        'Initial store inventory setup'
      );
    }
    console.log(`✔ Seeded ${sampleProducts.length} sample uniform products with initial stock movements`);
    }
  }

  // 4. Seed 3 Sample Customers (only if explicitly invoked with --with-samples)
  if (shouldSeedSamples) {
    const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
    if (customerCount === 0) {
    const sampleCustomers = [
      {
        name: 'Rajesh Sharma',
        phone: '+91 98112 34567',
        email: 'rajesh.sharma@example.com',
        address: 'House No. 42, Pocket B, South City 1, Gurugram',
        school_class: 'DPS Gurugram - Class 7A'
      },
      {
        name: 'Meenakshi Verma',
        phone: '+91 99223 45678',
        email: 'meenakshi.verma@example.com',
        address: 'Flat 304, Green Heights, DLF Phase 4, Gurugram',
        school_class: 'St. Xavier\'s High - Class 9B'
      },
      {
        name: 'Col. Vikram Malhotra',
        phone: '+91 97334 56789',
        email: 'vikram.malhotra@example.com',
        address: 'Bungalow 18, Officer Enclave, Palam Vihar, Gurugram',
        school_class: 'Army Public School - Class 5C'
      }
    ];

    const insertCust = db.prepare(`
      INSERT INTO customers (name, phone, email, address, school_class)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const c of sampleCustomers) {
      insertCust.run(c.name, c.phone, c.email, c.address, c.school_class);
    }
    console.log(`✔ Seeded ${sampleCustomers.length} sample customers`);
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase();
  console.log('Database initialization complete.');
  process.exit(0);
}

export default seedDatabase;
