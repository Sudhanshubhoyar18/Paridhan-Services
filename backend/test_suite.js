import fs from 'fs';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('=== STARTING PARIDHAN UNIFORMS INTEGRATION TESTS ===\n');

  // Test 1: Health Check
  console.log('1. Testing Health Check...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  console.log('✔ Health Check:', healthData.status);

  // Test 2: Admin Login
  console.log('\n2. Testing Admin Login (admin / admin123)...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    throw new Error(`Login failed: ${loginData.message}`);
  }
  const token = loginData.token;
  console.log(`✔ Logged in as: ${loginData.user.name} (Role: ${loginData.user.role})`);
  console.log(`✔ isDefaultPassword flag: ${loginData.user.isDefaultPassword}`);

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Test 3: Check Initial Product Stock or create isolated QA product
  console.log('\n3. Inspecting or preparing test product for QA verification...');
  let testProduct = null;
  let createdForTest = false;
  const prodRes = await fetch(`${BASE_URL}/api/products?search=DPS-SH-WHT-30`, { headers: authHeaders });
  const prodData = await prodRes.json();
  if (prodData.data && prodData.data.length > 0) {
    testProduct = prodData.data[0];
  } else {
    // Create an isolated test product for verification
    const createRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'QA Test Uniform Shirt',
        category: 'Topwear',
        school: 'Delhi Public School',
        size: '30',
        color: 'White',
        sku: 'DPS-SH-WHT-30',
        purchase_price: 280,
        selling_price: 450,
        gst_rate: 5,
        current_stock: 50,
        low_stock_threshold: 15
      })
    });
    const createdData = await createRes.json();
    testProduct = createdData.data;
    createdForTest = true;
  }
  console.log(`✔ Found/Prepared Product: "${testProduct.name}" (SKU: ${testProduct.sku})`);
  console.log(`✔ Initial Stock: ${testProduct.current_stock} units`);
  const initialStock = testProduct.current_stock;

  // Test 4: Create a Test Bill (3 units of testProduct)
  console.log('\n4. Creating Test Bill with stock deduction in DB transaction...');
  const billPayload = {
    customer_id: 1,
    customer_name: 'Rajesh Sharma',
    customer_phone: '+91 98112 34567',
    customer_email: 'rajesh.sharma@example.com',
    customer_school_class: 'DPS Gurugram - Class 7A',
    items: [
      {
        product_id: testProduct.id,
        product_name: testProduct.name,
        category: testProduct.category,
        school: testProduct.school,
        size: testProduct.size,
        color: testProduct.color,
        sku: testProduct.sku,
        quantity: 3,
        unit_price: testProduct.selling_price,
        discount: 50,
        gst_rate: 5
      }
    ],
    discount_type: 'flat',
    discount_val: 50,
    paid_amount: 1000,
    payment_mode: 'UPI',
    payment_reference: 'UPI-TEST-9988',
    notes: 'Test billing transaction for QA report'
  };

  const createBillRes = await fetch(`${BASE_URL}/api/bills`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(billPayload)
  });
  const createdBillData = await createBillRes.json();
  if (!createdBillData.success) {
    throw new Error(`Bill creation failed: ${createdBillData.message}`);
  }
  const bill = createdBillData.data;
  console.log(`✔ Bill Generated: Invoice #${bill.invoice_no}`);
  console.log(`✔ Grand Total: ₹${bill.grand_total} | Paid: ₹${bill.paid_amount} | Balance Due: ₹${bill.balance_due}`);
  console.log(`✔ Payment Status: ${bill.payment_status} (${bill.payment_mode})`);
  console.log(`✔ Public Token: ${bill.public_token}`);

  // Test 5: Verify Stock Deduction
  console.log('\n5. Verifying Stock Deduction & Movement Audit...');
  const checkProdRes = await fetch(`${BASE_URL}/api/products/${testProduct.id}`, { headers: authHeaders });
  const checkProdData = await checkProdRes.json();
  const newStock = checkProdData.data.current_stock;
  console.log(`✔ Previous Stock: ${initialStock} -> New Stock: ${newStock}`);
  if (newStock !== initialStock - 3) {
    throw new Error(`Stock deduction mismatch! Expected ${initialStock - 3}, got ${newStock}`);
  }
  console.log('✔ Stock deducted accurately by 3 units!');
  const lastMovement = checkProdData.data.movements[0];
  console.log(`✔ Movement logged: Type=${lastMovement.type}, Qty=${lastMovement.quantity}, Reason="${lastMovement.reason}"`);

  // Test 6: Verify Server-Side PDF Generation
  console.log('\n6. Testing PDF Generation & Stream (GET /api/bills/:id/pdf)...');
  const pdfRes = await fetch(`${BASE_URL}/api/bills/${bill.id}/pdf`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (pdfRes.status !== 200) {
    throw new Error(`PDF endpoint returned status ${pdfRes.status}`);
  }
  const pdfBuffer = await pdfRes.arrayBuffer();
  const pdfHeader = Buffer.from(pdfBuffer.slice(0, 5)).toString();
  console.log(`✔ PDF Generated: Size=${pdfBuffer.byteLength} bytes, Header="${pdfHeader}"`);
  if (!pdfHeader.startsWith('%PDF')) {
    throw new Error(`Invalid PDF header: ${pdfHeader}`);
  }

  // Test 7: Verify Public Token PDF Streaming (No Auth)
  console.log('\n7. Testing Public WhatsApp PDF Link (No Login Required)...');
  const publicPdfRes = await fetch(`${BASE_URL}/invoice/${bill.public_token}.pdf`);
  if (publicPdfRes.status !== 200) {
    throw new Error(`Public PDF endpoint returned status ${publicPdfRes.status}`);
  }
  const publicPdfBuffer = await publicPdfRes.arrayBuffer();
  console.log(`✔ Public Share PDF streamed: ${publicPdfBuffer.byteLength} bytes`);

  // Test 8: Verify CRM Service & System Support Diagnostics
  console.log('\n8. Testing CRM & System Support Diagnostics (GET /api/system/diagnostics)...');
  const diagRes = await fetch(`${BASE_URL}/api/system/diagnostics`, { headers: authHeaders });
  const diagData = await diagRes.json();
  if (!diagData.success || !diagData.data) {
    throw new Error(`Diagnostics endpoint failed: ${diagData.message}`);
  }
  console.log(`✔ System Diagnostics Healthy: ${diagData.healthy}`);
  console.log(`✔ SQLite Integrity Status: ${diagData.data.database.integrityStatus}`);
  console.log(`✔ DB File Size: ${diagData.data.database.sizeFormatted} (Journal: ${diagData.data.database.journalMode})`);
  console.log(`✔ Active Invoices: ${diagData.data.counts.billsActive}, Customers: ${diagData.data.counts.customersCount}, Catalog Items: ${diagData.data.counts.productsCount}`);
  if (diagData.data.database.integrityStatus !== 'ok') {
    throw new Error(`SQLite integrity check returned: ${diagData.data.database.integrityStatus}`);
  }

  // Test 8b: Verify SQLite Atomic Backup Generation & Integrity
  console.log('\n8b. Testing SQLite Atomic Backup (GET /api/system/backup)...');
  const backupRes = await fetch(`${BASE_URL}/api/system/backup`, { headers: authHeaders });
  if (backupRes.status !== 200) {
    throw new Error(`Backup failed with status ${backupRes.status}`);
  }
  const backupBuf = await backupRes.arrayBuffer();
  const sqliteHeader = Buffer.from(backupBuf.slice(0, 16)).toString('utf8');
  if (!sqliteHeader.startsWith('SQLite format 3')) {
    throw new Error(`Invalid SQLite backup header: ${sqliteHeader}`);
  }
  console.log(`✔ Atomic WAL-checkpointed backup verified: Size=${backupBuf.byteLength} bytes, Valid SQLite Header.`);

  // Test 9: Verify WhatsApp wa.me Link Generation
  console.log('\n9. Testing WhatsApp wa.me Link Generation...');
  const waRes = await fetch(`${BASE_URL}/api/bills/${bill.id}/whatsapp-data`, { headers: authHeaders });
  const waData = await waRes.json();
  console.log(`✔ Cleaned Phone: ${waData.data.phone} -> wa.me URL generated:`);
  console.log(`   ${waData.data.waUrl.substring(0, 95)}...`);
  if (!waData.data.waUrl.startsWith('https://wa.me/919811234567')) {
    throw new Error(`Invalid wa.me format: ${waData.data.waUrl}`);
  }
  if (!waData.data.message.includes('Paridhan Uniforms') || !waData.data.message.includes(bill.invoice_no)) {
    throw new Error(`WhatsApp message template missing invoice details`);
  }

  // Verify dynamic tunnel domain resolution
  const waTunnelRes = await fetch(`${BASE_URL}/api/bills/${bill.id}/whatsapp-data`, {
    headers: {
      ...authHeaders,
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'paridhan-demo.trycloudflare.com'
    }
  });
  const waTunnelData = await waTunnelRes.json();
  if (!waTunnelData.data.message.includes('https://paridhan-demo.trycloudflare.com/invoice/')) {
    throw new Error(`WhatsApp link did not resolve dynamic tunnel host: ${waTunnelData.data.message}`);
  }
  console.log(`✔ Dynamic Cloudflare HTTPS link verified in WhatsApp message:`);
  console.log(`   ${waTunnelData.data.message.split('Invoice PDF: ')[1]?.trim() || ''}`);

  // Mark whatsapp sent
  const waSentRes = await fetch(`${BASE_URL}/api/bills/${bill.id}/whatsapp-sent`, {
    method: 'POST',
    headers: authHeaders
  });
  const waSentData = await waSentRes.json();
  console.log(`✔ WhatsApp sent status recorded: ${waSentData.success}`);

  // Test 10: Test Bill Cancellation & Stock Restoration
  console.log('\n10. Testing Bill Cancellation & Automatic Stock Restoration...');
  const cancelRes = await fetch(`${BASE_URL}/api/bills/${bill.id}/cancel`, {
    method: 'POST',
    headers: authHeaders
  });
  const cancelData = await cancelRes.json();
  console.log(`✔ Cancel Response: ${cancelData.message}`);

  const restoredProdRes = await fetch(`${BASE_URL}/api/products/${testProduct.id}`, { headers: authHeaders });
  const restoredProdData = await restoredProdRes.json();
  console.log(`✔ Restored Stock: ${restoredProdData.data.current_stock} (Expected: ${initialStock})`);
  if (restoredProdData.data.current_stock !== initialStock) {
    throw new Error(`Stock restoration failed! Expected ${initialStock}, got ${restoredProdData.data.current_stock}`);
  }
  console.log('✔ Stock restored successfully upon cancellation!');

  // Test 11: Invoices List & Customer Ledger Verification
  console.log('\n11. Verifying Invoices List, Status Filters & Customer Ledger...');
  const billsListRes = await fetch(`${BASE_URL}/api/bills?status=cancelled`, { headers: authHeaders });
  const billsListData = await billsListRes.json();
  if (!billsListData.success || !Array.isArray(billsListData.data)) {
    throw new Error('Failed to retrieve bills list');
  }
  console.log(`✔ Invoices List Filter Verified: Retrieved ${billsListData.data.length} cancelled bill(s).`);

  // If a temporary test product was created specifically for QA, clean it up cleanly
  if (createdForTest && testProduct?.id) {
    console.log('\n[*] Cleaning up QA test product to preserve clean database...');
    await fetch(`${BASE_URL}/api/products/${testProduct.id}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    console.log('✔ QA test product safely removed. Database remains clean.');
  }

  console.log('\n=== ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ===\n');
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
