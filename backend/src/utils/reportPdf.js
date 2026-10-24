import PDFDocument from 'pdfkit';

/**
 * Generate A4 PDF Report (Sales, Stock, or Customer Dues)
 * @param {string} reportType 'sales' | 'stock' | 'dues'
 * @param {Array} data 
 * @param {Object} filters 
 * @param {Object} settings 
 * @param {stream.Writable} res 
 * @returns {Promise<Buffer>}
 */
export function generateReportPDF(reportType, data, filters, settings, res = null) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: reportType === 'stock' ? 'landscape' : 'portrait',
        margin: 36
      });

      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      if (res) {
        doc.pipe(res);
      }

      const isLandscape = reportType === 'stock';
      const pageWidth = isLandscape ? 842 - 72 : 595 - 72; // Width inside margins

      const navy = '#0f172a';
      const gold = '#d97706';
      const slate = '#334155';
      const lightSlate = '#64748b';
      const tableBorder = '#cbd5e1';
      const tableBgAlt = '#f8fafc';

      // Header Bar
      doc.rect(36, 36, pageWidth, 4).fill(gold);

      // Title
      let title = 'SALES REPORT';
      if (reportType === 'stock') title = 'INVENTORY / STOCK REPORT';
      if (reportType === 'dues') title = 'CUSTOMER PENDING DUES REPORT';

      doc.fillColor(navy).font('Helvetica-Bold').fontSize(16)
        .text(settings.business_name || 'PARIDHAN UNIFORMS', 36, 48);

      doc.fillColor(gold).font('Helvetica-Bold').fontSize(12)
        .text(title, 36, 68);

      // Meta info
      doc.fillColor(lightSlate).font('Helvetica').fontSize(8);
      const generatedAt = `Generated on: ${new Date().toLocaleString('en-IN')}`;
      doc.text(generatedAt, pageWidth - 140, 48, { width: 176, align: 'right' });

      if (filters.startDate || filters.endDate) {
        const filterStr = `Period: ${filters.startDate || 'Beginning'} to ${filters.endDate || 'Today'}`;
        doc.text(filterStr, pageWidth - 140, 60, { width: 176, align: 'right' });
      }

      let startY = 90;

      if (reportType === 'sales') {
        const headers = [
          { label: 'Date', width: 65, align: 'left' },
          { label: 'Invoice No', width: 85, align: 'left' },
          { label: 'Customer', width: 110, align: 'left' },
          { label: 'Payment Mode', width: 75, align: 'left' },
          { label: 'Status', width: 55, align: 'center' },
          { label: 'Paid (₹)', width: 65, align: 'right' },
          { label: 'Total (₹)', width: 68, align: 'right' }
        ];

        doc.rect(36, startY, pageWidth, 18).fill(navy);
        let curX = 40;
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
        headers.forEach(h => {
          doc.text(h.label, curX, startY + 5, { width: h.width, align: h.align });
          curX += h.width;
        });

        startY += 18;
        let totalSales = 0;
        let totalPaid = 0;

        doc.font('Helvetica').fontSize(7.5);
        data.forEach((row, idx) => {
          if (startY > 740) {
            doc.addPage();
            startY = 40;
          }

          if (idx % 2 === 1) doc.rect(36, startY, pageWidth, 16).fill(tableBgAlt);
          doc.rect(36, startY, pageWidth, 16).strokeColor(tableBorder).stroke();

          curX = 40;
          doc.fillColor(slate);
          const dStr = row.created_at ? new Date(row.created_at).toLocaleDateString('en-IN') : '';
          doc.text(dStr, curX, startY + 4, { width: headers[0].width, align: 'left' });
          curX += headers[0].width;
          doc.text(row.invoice_no, curX, startY + 4, { width: headers[1].width, align: 'left' });
          curX += headers[1].width;
          doc.text(row.customer_name || 'Walk-in', curX, startY + 4, { width: headers[2].width, align: 'left', height: 10, ellipsis: true });
          curX += headers[2].width;
          doc.text(row.payment_mode || 'Cash', curX, startY + 4, { width: headers[3].width, align: 'left' });
          curX += headers[3].width;
          doc.text(row.payment_status || 'Paid', curX, startY + 4, { width: headers[4].width, align: 'center' });
          curX += headers[4].width;
          doc.text(Number(row.paid_amount || 0).toFixed(2), curX, startY + 4, { width: headers[5].width, align: 'right' });
          curX += headers[5].width;
          doc.font('Helvetica-Bold')
            .text(Number(row.grand_total || 0).toFixed(2), curX, startY + 4, { width: headers[6].width, align: 'right' });
          doc.font('Helvetica');

          totalSales += Number(row.grand_total || 0);
          totalPaid += Number(row.paid_amount || 0);
          startY += 16;
        });

        // Summary Row
        startY += 4;
        doc.rect(36, startY, pageWidth, 20).fill(navy);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff');
        doc.text('TOTAL REVENUE / COLLECTION:', 46, startY + 6);
        doc.text(`Paid: ₹${totalPaid.toFixed(2)}`, pageWidth - 180, startY + 6, { width: 90, align: 'right' });
        doc.fillColor(gold)
          .text(`Total: ₹${totalSales.toFixed(2)}`, pageWidth - 80, startY + 6, { width: 90, align: 'right' });
      } else if (reportType === 'stock') {
        const headers = [
          { label: 'SKU', width: 110, align: 'left' },
          { label: 'Item Name', width: 170, align: 'left' },
          { label: 'Category', width: 90, align: 'left' },
          { label: 'School', width: 120, align: 'left' },
          { label: 'Size', width: 50, align: 'center' },
          { label: 'Cost (₹)', width: 65, align: 'right' },
          { label: 'Price (₹)', width: 65, align: 'right' },
          { label: 'Stock', width: 50, align: 'right' },
          { label: 'Stock Val (₹)', width: 80, align: 'right' },
        ];

        doc.rect(36, startY, pageWidth, 18).fill(navy);
        let curX = 40;
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
        headers.forEach(h => {
          doc.text(h.label, curX, startY + 5, { width: h.width, align: h.align });
          curX += h.width;
        });

        startY += 18;
        let totalVal = 0;
        let totalQty = 0;

        doc.font('Helvetica').fontSize(7.5);
        data.forEach((row, idx) => {
          if (startY > 520) {
            doc.addPage({ layout: 'landscape' });
            startY = 40;
          }

          if (idx % 2 === 1) doc.rect(36, startY, pageWidth, 16).fill(tableBgAlt);
          doc.rect(36, startY, pageWidth, 16).strokeColor(tableBorder).stroke();

          const stockVal = (row.current_stock || 0) * (row.selling_price || 0);
          totalVal += stockVal;
          totalQty += (row.current_stock || 0);

          curX = 40;
          doc.fillColor(slate);
          doc.text(row.sku || '', curX, startY + 4, { width: headers[0].width, align: 'left' });
          curX += headers[0].width;
          doc.text(row.name, curX, startY + 4, { width: headers[1].width, align: 'left', height: 10, ellipsis: true });
          curX += headers[1].width;
          doc.text(row.category, curX, startY + 4, { width: headers[2].width, align: 'left' });
          curX += headers[2].width;
          doc.text(row.school || 'General', curX, startY + 4, { width: headers[3].width, align: 'left', height: 10, ellipsis: true });
          curX += headers[3].width;
          doc.text(row.size, curX, startY + 4, { width: headers[4].width, align: 'center' });
          curX += headers[4].width;
          doc.text(Number(row.purchase_price || 0).toFixed(2), curX, startY + 4, { width: headers[5].width, align: 'right' });
          curX += headers[5].width;
          doc.text(Number(row.selling_price || 0).toFixed(2), curX, startY + 4, { width: headers[6].width, align: 'right' });
          curX += headers[6].width;

          const isLow = (row.current_stock || 0) <= (row.low_stock_threshold || 10);
          doc.font('Helvetica-Bold').fillColor(isLow ? '#dc2626' : slate)
            .text(String(row.current_stock || 0), curX, startY + 4, { width: headers[7].width, align: 'right' });
          curX += headers[7].width;

          doc.fillColor(navy)
            .text(stockVal.toFixed(2), curX, startY + 4, { width: headers[8].width, align: 'right' });
          doc.font('Helvetica');

          startY += 16;
        });

        // Summary
        startY += 4;
        doc.rect(36, startY, pageWidth, 20).fill(navy);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff');
        doc.text('TOTAL INVENTORY VALUATION:', 46, startY + 6);
        doc.text(`Total Qty: ${totalQty} units`, pageWidth - 200, startY + 6, { width: 100, align: 'right' });
        doc.fillColor(gold)
          .text(`Value: ₹${totalVal.toFixed(2)}`, pageWidth - 90, startY + 6, { width: 100, align: 'right' });
      } else if (reportType === 'dues') {
        const headers = [
          { label: 'Customer Name', width: 140, align: 'left' },
          { label: 'Phone', width: 100, align: 'left' },
          { label: 'School / Class', width: 120, align: 'left' },
          { label: 'Bills with Dues', width: 80, align: 'center' },
          { label: 'Total Due (₹)', width: 83, align: 'right' }
        ];

        doc.rect(36, startY, pageWidth, 18).fill(navy);
        let curX = 40;
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
        headers.forEach(h => {
          doc.text(h.label, curX, startY + 5, { width: h.width, align: h.align });
          curX += h.width;
        });

        startY += 18;
        let totalDues = 0;

        doc.font('Helvetica').fontSize(7.5);
        data.forEach((row, idx) => {
          if (startY > 740) {
            doc.addPage();
            startY = 40;
          }

          if (idx % 2 === 1) doc.rect(36, startY, pageWidth, 16).fill(tableBgAlt);
          doc.rect(36, startY, pageWidth, 16).strokeColor(tableBorder).stroke();

          curX = 40;
          doc.fillColor(slate);
          doc.text(row.name, curX, startY + 4, { width: headers[0].width, align: 'left' });
          curX += headers[0].width;
          doc.text(row.phone, curX, startY + 4, { width: headers[1].width, align: 'left' });
          curX += headers[1].width;
          doc.text(row.school_class || 'N/A', curX, startY + 4, { width: headers[2].width, align: 'left' });
          curX += headers[2].width;
          doc.text(String(row.unpaid_bills_count || 1), curX, startY + 4, { width: headers[3].width, align: 'center' });
          curX += headers[3].width;
          doc.font('Helvetica-Bold').fillColor('#dc2626')
            .text(Number(row.total_due || 0).toFixed(2), curX, startY + 4, { width: headers[4].width, align: 'right' });
          doc.font('Helvetica');

          totalDues += Number(row.total_due || 0);
          startY += 16;
        });

        // Summary
        startY += 4;
        doc.rect(36, startY, pageWidth, 20).fill(navy);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff');
        doc.text('TOTAL OUTSTANDING BALANCE:', 46, startY + 6);
        doc.fillColor(gold)
          .text(`₹${totalDues.toFixed(2)}`, pageWidth - 100, startY + 6, { width: 110, align: 'right' });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export default generateReportPDF;
