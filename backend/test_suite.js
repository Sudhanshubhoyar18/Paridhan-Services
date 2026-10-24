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

  // Test 3: Check Initial Product Stock
  console.log('\n3. Inspecting Initial Product Stock for DPS-SH-WHT-30...');
  const prodRes = await fetch(`${BASE_URL}/api/products?search=DPS-SH-WHT-30`, { headers: authHeaders });
  const prodData = await prodRes.json();
  const testProduct = prodData.data[0];
  console.log(`✔ Found Product: "${testProduct.name}" (SKU: ${testProduct.sku})`);
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

  // Test 8: Verify Email Sending (Graceful simulation/fallback if no SMTP credentials)
  console.log('\n8. Testing Email Sending with PDF attachment...');
  const emailRes = await fetch(`${BASE_URL}/api/bills/${bill.id}/email`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      to: 'customer@example.com',
      subject: `Invoice ${bill.invoice_no} from Paridhan Uniforms`,
      body: 'Thank you for your purchase.'
    })
  });
  const emailData = await emailRes.json();
  console.log(`✔ Email response:`, emailData.message);
  if (!emailData.success) {
    throw new Error(`Email sending failed: ${emailData.message}`);
  }

  // Verify email_sent flag in bill details
  const updatedBillRes = await fetch(`${BASE_URL}/api/bills/${bill.id}`, { headers: authHeaders });
  const updatedBillData = await updatedBillRes.json();
  console.log(`✔ Bill email_sent flag: ${updatedBillData.data.email_sent} (Sent at: ${updatedBillData.data.email_sent_at})`);

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

  // Create an active bill for dashboard / UI showcase
  console.log('\n11. Creating active permanent bill for live showcase...');
  const liveBillRes = await fetch(`${BASE_URL}/api/bills`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      customer_id: 2,
      customer_name: 'Meenakshi Verma',
      customer_phone: '+91 99223 45678',
      customer_email: 'meenakshi.verma@example.com',
      customer_school_class: "St. Xavier's High - Class 9B",
      items: [
        {
          product_id: 3, // Girls Peter Pan Collar Shirt
          product_name: "Girls Peter Pan Collar Shirt",
          category: 'Topwear',
          school: "St. Xavier's High School",
          size: '32',
          color: 'Sky Blue',
          sku: 'STX-SH-SKY-32',
          quantity: 2,
          unit_price: 490,
          discount: 20,
          gst_rate: 5
        },
        {
          product_id: 6, // Pleated Uniform Skirt
          product_name: "Pleated Uniform Skirt",
          category: 'Bottomwear',
          school: "St. Xavier's High School",
          size: '30',
          color: 'Navy Blue',
          sku: 'STX-SK-NVY-30',
          quantity: 2,
          unit_price: 600,
          discount: 0,
          gst_rate: 5
        }
      ],
      discount_type: 'flat',
      discount_val: 50,
      paid_amount: 1500,
      payment_mode: 'Card',
      payment_reference: 'CARD-AUTH-8821',
      notes: 'Winter set with alteration request for skirt waist'
    })
  });
  const liveBillData = await liveBillRes.json();
  console.log(`✔ Permanent Showcase Invoice Created: ${liveBillData.data.invoice_no} (Total: ₹${liveBillData.data.grand_total}, Paid: ₹${liveBillData.data.paid_amount}, Balance: ₹${liveBillData.data.balance_due})`);

  console.log('\n=== ALL 11 INTEGRATION TESTS PASSED SUCCESSFULLY! ===\n');
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
