/**
 * Generate rich, modern HTML email for invoice
 */
export function generateInvoiceEmailHtml({ bill, items, settings, publicBaseUrl }) {
  const businessName = settings.business_name || 'Paridhan Uniforms';
  const businessAddress = settings.business_address || 'Sector 14, Gurugram, Haryana';
  const businessPhone = settings.business_phone || '+91 98765 43210';
  const businessEmail = settings.business_email || 'billing@paridhanuniforms.com';
  const businessGstin = settings.business_gstin || '';

  const baseUrl = (publicBaseUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const pdfDownloadUrl = `${baseUrl}/invoice/${bill.public_token}.pdf`;

  const dateStr = bill.created_at ? new Date(bill.created_at).toLocaleDateString('en-IN') : '';

  const itemRowsHtml = (items || []).map((item, idx) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 12px 8px; font-size: 13px; color: #1e293b; font-weight: 500;">
        ${item.product_name}
        ${item.size ? `<span style="font-size: 11px; color: #64748b; display: block;">Size: ${item.size} • Color: ${item.color || 'Standard'}</span>` : ''}
      </td>
      <td style="padding: 12px 8px; font-size: 13px; color: #475569; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px 8px; font-size: 13px; color: #475569; text-align: right;">₹${Number(item.unit_price).toFixed(2)}</td>
      <td style="padding: 12px 8px; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">₹${Number(item.total_amount).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${bill.invoice_no} from ${businessName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <!-- Top Accent Line -->
          <tr>
            <td style="height: 6px; background: linear-gradient(90deg, #f59e0b, #d97706); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px; background-color: #0f172a; color: #ffffff;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(245, 158, 11, 0.2); color: #f59e0b; border-radius: 8px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Tax Invoice</span>
                    <h1 style="margin: 8px 0 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">${businessName}</h1>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">${businessAddress}</p>
                    ${businessGstin ? `<p style="margin: 2px 0 0; font-size: 11px; color: #f59e0b; font-weight: 600;">GSTIN: ${businessGstin}</p>` : ''}
                  </td>
                  <td align="right" style="vertical-align: top;">
                    <div style="background-color: #1e293b; padding: 10px 16px; border-radius: 12px; border: 1px solid #334155; text-align: right;">
                      <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600; display: block;">Invoice No</span>
                      <strong style="font-size: 14px; color: #f59e0b; font-family: monospace;">${bill.invoice_no}</strong>
                      <span style="font-size: 11px; color: #cbd5e1; display: block; margin-top: 2px;">${dateStr}</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Customer Greeting & Info -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 14px; color: #475569;">Hello <strong style="color: #0f172a;">${bill.customer_name}</strong>,</p>
              <p style="margin: 6px 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                Thank you for shopping with <strong>${businessName}</strong>. Please find your invoice summary below. The complete official PDF invoice is attached to this email.
              </p>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 24px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0; text-align: left;">
                    <th style="padding: 8px; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Item</th>
                    <th style="padding: 8px; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; text-align: center;">Qty</th>
                    <th style="padding: 8px; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; text-align: right;">Rate</th>
                    <th style="padding: 8px; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRowsHtml}
                </tbody>
              </table>

              <!-- Totals Breakdown -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                <tr>
                  <td width="60%"></td>
                  <td width="40%">
                    <table width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 4px 0; font-size: 12px; color: #64748b;">Subtotal:</td>
                        <td style="padding: 4px 0; font-size: 12px; color: #1e293b; text-align: right; font-weight: 600;">₹${Number(bill.subtotal).toFixed(2)}</td>
                      </tr>
                      ${Number(bill.discount_amount) > 0 ? `
                      <tr>
                        <td style="padding: 4px 0; font-size: 12px; color: #e11d48;">Discount:</td>
                        <td style="padding: 4px 0; font-size: 12px; color: #e11d48; text-align: right; font-weight: 600;">-₹${Number(bill.discount_amount).toFixed(2)}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding: 4px 0; font-size: 12px; color: #64748b;">GST (CGST + SGST):</td>
                        <td style="padding: 4px 0; font-size: 12px; color: #1e293b; text-align: right; font-weight: 600;">₹${Number(bill.total_tax).toFixed(2)}</td>
                      </tr>
                      <tr style="border-top: 2px solid #0f172a;">
                        <td style="padding: 10px 0; font-size: 14px; color: #0f172a; font-weight: 800;">Grand Total:</td>
                        <td style="padding: 10px 0; font-size: 18px; color: #d97706; text-align: right; font-weight: 800;">₹${Number(bill.grand_total).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 12px; color: #16a34a; font-weight: 600;">Amount Paid:</td>
                        <td style="padding: 4px 0; font-size: 12px; color: #16a34a; text-align: right; font-weight: 600;">₹${Number(bill.paid_amount).toFixed(2)}</td>
                      </tr>
                      ${Number(bill.balance_due) > 0 ? `
                      <tr>
                        <td style="padding: 4px 0; font-size: 12px; color: #dc2626; font-weight: 700;">Balance Due:</td>
                        <td style="padding: 4px 0; font-size: 12px; color: #dc2626; text-align: right; font-weight: 700;">₹${Number(bill.balance_due).toFixed(2)}</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Download PDF CTA Button -->
          <tr>
            <td align="center" style="padding: 0 32px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius: 12px; background-color: #0f172a;">
                    <a href="${pdfDownloadUrl}" target="_blank" style="font-size: 13px; font-weight: 700; color: #f59e0b; text-decoration: none; padding: 14px 28px; display: inline-block; border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.4);">
                      📄 View &amp; Download Invoice PDF &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 12px 0 0; font-size: 11px; color: #94a3b8;">
                Direct public link: <a href="${pdfDownloadUrl}" style="color: #64748b; word-break: break-all;">${pdfDownloadUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 12px; font-weight: 700; color: #334155;">${businessName}</p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">Phone: ${businessPhone} • Email: ${businessEmail}</p>
              <p style="margin: 8px 0 0; font-size: 10px; color: #94a3b8;">Thank you for your business. Have a great academic year!</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export default generateInvoiceEmailHtml;
