import PDFDocument from 'pdfkit';
import { numberToWordsINR } from './numberToWords.js';

/**
 * Generate A4 Tax Invoice PDF
 * @param {Object} bill 
 * @param {Array} items 
 * @param {Object} settings 
 * @param {stream.Writable} res (optional writable stream)
 * @returns {Promise<Buffer>}
 */
export function generateInvoicePDF(bill, items, settings, res = null) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36, // 0.5 inch margins
        info: {
          Title: `Invoice ${bill.invoice_no}`,
          Author: settings.business_name || 'Paridhan Uniforms',
          Subject: 'Tax Invoice'
        }
      });

      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', err => reject(err));

      if (res) {
        doc.pipe(res);
      }

      // --- COLOR PALETTE ---
      const navy = '#0f172a';
      const slate = '#334155';
      const lightSlate = '#64748b';
      const gold = '#d97706';
      const tableBorder = '#cbd5e1';
      const tableBgAlt = '#f8fafc';
      const successColor = '#16a34a';
      const warningColor = '#d97706';
      const dangerColor = '#dc2626';

      // --- HEADER ---
      // Top colored accent bar
      doc.rect(36, 36, 523, 5).fill(gold);

      // Business Info (Left)
      doc.fillColor(navy)
        .font('Helvetica-Bold')
        .fontSize(20)
        .text(settings.business_name || 'PARIDHAN UNIFORMS', 36, 50);

      doc.fillColor(slate)
        .font('Helvetica')
        .fontSize(8.5)
        .text('Premium School & Institutional Uniforms', 36, 73);

      doc.fillColor(lightSlate)
        .fontSize(8)
        .text(settings.business_address || 'Sector 14, Gurugram, Haryana', 36, 86, { width: 280 });

      const phoneEmail = `Phone: ${settings.business_phone || ''}  |  Email: ${settings.business_email || ''}`;
      doc.text(phoneEmail, 36, 108);

      if (settings.business_gstin) {
        doc.font('Helvetica-Bold').fillColor(navy)
          .text(`GSTIN: ${settings.business_gstin}`, 36, 120);
      }

      // TAX INVOICE BADGE & INVOICE DETAILS (Right)
      doc.rect(380, 50, 179, 24).fill(navy);
      doc.fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('TAX INVOICE', 380, 57, { width: 179, align: 'center' });

      // Invoice metadata box
      doc.rect(380, 78, 179, 65).strokeColor(tableBorder).stroke();

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(slate);
      doc.text('Invoice No:', 388, 86);
      doc.font('Helvetica-Bold').fillColor(gold)
        .text(bill.invoice_no, 450, 86);

      doc.font('Helvetica').fontSize(8).fillColor(slate);
      doc.text('Date:', 388, 101);
      const invoiceDate = new Date(bill.created_at || Date.now());
      const formattedDate = `${String(invoiceDate.getDate()).padStart(2, '0')}/${String(invoiceDate.getMonth() + 1).padStart(2, '0')}/${invoiceDate.getFullYear()}`;
      doc.text(formattedDate, 450, 101);

      doc.text('Payment Mode:', 388, 116);
      doc.text(bill.payment_mode || 'Cash', 450, 116);

      doc.text('Status:', 388, 130);
      let statusColor = successColor;
      if (bill.payment_status === 'Partial') statusColor = warningColor;
      if (bill.payment_status === 'Unpaid') statusColor = dangerColor;
      doc.font('Helvetica-Bold').fillColor(statusColor)
        .text(bill.payment_status ? bill.payment_status.toUpperCase() : 'PAID', 450, 130);

      // --- CUSTOMER DETAILS BOX ---
      const custBoxY = 152;
      doc.rect(36, custBoxY, 523, 54).fillColor('#f8fafc').fillAndStroke(tableBorder);

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(navy)
        .text('BILLED TO (CUSTOMER DETAILS):', 46, custBoxY + 8);

      doc.font('Helvetica-Bold').fontSize(9).fillColor(slate)
        .text(bill.customer_name || 'Walk-in Customer', 46, custBoxY + 22);

      doc.font('Helvetica').fontSize(8).fillColor(lightSlate);
      let custDetailsStr = `Phone: ${bill.customer_phone || 'N/A'}`;
      if (bill.customer_email) custDetailsStr += `   |   Email: ${bill.customer_email}`;
      if (bill.customer_school_class) custDetailsStr += `   |   School/Class: ${bill.customer_school_class}`;
      doc.text(custDetailsStr, 46, custBoxY + 34);

      if (bill.customer_address) {
        doc.text(`Address: ${bill.customer_address}`, 46, custBoxY + 44, { width: 500, height: 10, ellipsis: true });
      }

      // --- ITEMS TABLE ---
      let startY = 216;
      const headers = [
        { label: '#', x: 36, width: 20, align: 'center' },
        { label: 'Item & Description', x: 58, width: 185, align: 'left' },
        { label: 'Size', x: 245, width: 40, align: 'center' },
        { label: 'Qty', x: 287, width: 32, align: 'right' },
        { label: 'Rate (₹)', x: 321, width: 52, align: 'right' },
        { label: 'Disc (₹)', x: 375, width: 45, align: 'right' },
        { label: 'GST', x: 422, width: 45, align: 'right' },
        { label: 'Amount (₹)', x: 469, width: 90, align: 'right' },
      ];

      // Table Header Row
      doc.rect(36, startY, 523, 20).fill(navy);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff');
      headers.forEach(h => {
        doc.text(h.label, h.x, startY + 6, { width: h.width, align: h.align });
      });

      startY += 20;

      // Table Data Rows
      let rowIndex = 0;
      doc.font('Helvetica').fontSize(8);

      items.forEach(item => {
        const rowHeight = 20;
        // Alternate background
        if (rowIndex % 2 === 1) {
          doc.rect(36, startY, 523, rowHeight).fill(tableBgAlt);
        }

        doc.rect(36, startY, 523, rowHeight).strokeColor(tableBorder).stroke();

        doc.fillColor(slate);
        // #
        doc.text(String(rowIndex + 1), 36, startY + 6, { width: 20, align: 'center' });
        // Item Description
        const desc = item.school ? `${item.product_name} [${item.school}]` : item.product_name;
        doc.text(desc, 58, startY + 6, { width: 185, align: 'left', height: 12, ellipsis: true });
        // Size
        doc.text(item.size || '-', 245, startY + 6, { width: 40, align: 'center' });
        // Qty
        doc.text(String(item.quantity), 287, startY + 6, { width: 32, align: 'right' });
        // Rate
        doc.text(Number(item.unit_price).toFixed(2), 321, startY + 6, { width: 52, align: 'right' });
        // Discount
        doc.text(Number(item.discount || 0).toFixed(2), 375, startY + 6, { width: 45, align: 'right' });
        // GST %
        doc.text(`${item.gst_rate || 0}%`, 422, startY + 6, { width: 45, align: 'right' });
        // Total Amount
        doc.font('Helvetica-Bold')
          .text(Number(item.total_amount).toFixed(2), 469, startY + 6, { width: 90, align: 'right' });
        doc.font('Helvetica');

        startY += rowHeight;
        rowIndex++;
      });

      // --- SUMMARY & TOTALS SECTION ---
      startY += 8;
      const summaryLeftX = 36;
      const summaryRightX = 345;

      // Amount in Words & Notes (Left Side)
      doc.rect(summaryLeftX, startY, 300, 72).fillColor('#f8fafc').fillAndStroke(tableBorder);
      
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(navy)
        .text('AMOUNT IN WORDS:', summaryLeftX + 8, startY + 8);
      
      const words = numberToWordsINR(bill.grand_total);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(gold)
        .text(words, summaryLeftX + 8, startY + 20, { width: 284 });

      if (bill.notes) {
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(navy)
          .text('Notes / Remarks:', summaryLeftX + 8, startY + 45);
        doc.font('Helvetica').fontSize(7.5).fillColor(slate)
          .text(bill.notes, summaryLeftX + 8, startY + 56, { width: 284, height: 14, ellipsis: true });
      }

      // Payment Details Box (Left Side bottom)
      const payY = startY + 80;
      doc.rect(summaryLeftX, payY, 300, 48).strokeColor(tableBorder).stroke();
      doc.font('Helvetica-Bold').fontSize(8).fillColor(navy)
        .text('PAYMENT SUMMARY', summaryLeftX + 8, payY + 8);
      doc.font('Helvetica').fontSize(7.5).fillColor(slate);
      doc.text(`Amount Paid: ₹${Number(bill.paid_amount || 0).toFixed(2)} (${bill.payment_mode || 'Cash'})`, summaryLeftX + 8, payY + 22);
      
      const balanceDue = Number(bill.balance_due || 0);
      const balanceColor = balanceDue > 0 ? dangerColor : successColor;
      doc.font('Helvetica-Bold').fillColor(balanceColor)
        .text(`Balance Due: ₹${balanceDue.toFixed(2)}`, summaryLeftX + 8, payY + 34);

      // Totals Breakdown Table (Right Side)
      const totalsWidth = 214;
      doc.rect(summaryRightX, startY, totalsWidth, 128).strokeColor(tableBorder).stroke();

      const totalsRows = [
        { label: 'Subtotal:', value: `₹${Number(bill.subtotal || 0).toFixed(2)}`, bold: false },
        { label: `Discount ${bill.discount_type === 'percent' ? '(' + bill.discount_val + '%)' : ''}:`, value: `- ₹${Number(bill.discount_amount || 0).toFixed(2)}`, bold: false },
        { label: 'Taxable Amount:', value: `₹${Number(bill.taxable_amount || 0).toFixed(2)}`, bold: false },
        { label: 'CGST:', value: `₹${Number(bill.cgst_amount || 0).toFixed(2)}`, bold: false },
        { label: 'SGST:', value: `₹${Number(bill.sgst_amount || 0).toFixed(2)}`, bold: false },
        { label: 'Round-off:', value: `${Number(bill.round_off || 0) >= 0 ? '+' : ''}₹${Number(bill.round_off || 0).toFixed(2)}`, bold: false },
      ];

      let tY = startY + 6;
      totalsRows.forEach(r => {
        doc.font(r.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(slate);
        doc.text(r.label, summaryRightX + 10, tY);
        doc.text(r.value, summaryRightX + 100, tY, { width: 104, align: 'right' });
        tY += 15;
      });

      // Grand Total Highlight Row
      doc.rect(summaryRightX, tY, totalsWidth, 24).fill(navy);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff');
      doc.text('GRAND TOTAL:', summaryRightX + 10, tY + 6);
      doc.fillColor(gold)
        .text(`₹${Number(bill.grand_total || 0).toFixed(2)}`, summaryRightX + 100, tY + 6, { width: 104, align: 'right' });

      // --- TERMS & CONDITIONS & FOOTER ---
      const footerY = 730;
      doc.rect(36, footerY, 523, 1).strokeColor(tableBorder).stroke();

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(navy)
        .text('TERMS & CONDITIONS:', 36, footerY + 6);
      doc.font('Helvetica').fontSize(6.5).fillColor(lightSlate);
      
      const terms = settings.terms_and_conditions || '1. Goods once sold can be exchanged within 7 days.\n2. Invoice required.';
      doc.text(terms, 36, footerY + 16, { width: 340, height: 30 });

      // Authorized Signature block
      doc.font('Helvetica-Bold').fontSize(8).fillColor(navy)
        .text(`For ${settings.business_name || 'Paridhan Uniforms'}`, 390, footerY + 14, { width: 169, align: 'center' });
      doc.font('Helvetica-Oblique').fontSize(7).fillColor(lightSlate)
        .text('Authorized Signatory', 390, footerY + 42, { width: 169, align: 'center' });

      // Bottom bar
      doc.rect(36, 792, 523, 18).fill('#f1f5f9');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(navy)
        .text('Thank you for shopping with Paridhan Uniforms! Have a wonderful academic year.', 36, 797, { width: 523, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export default generateInvoicePDF;
