/**
 * Clean phone number to digits only with country code (defaults to 91 for India)
 * @param {string} phone 
 * @returns {string} digits only with country code
 */
export function cleanPhoneNumber(phone) {
  if (!phone) return '';
  // Remove non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // If 10 digits (standard Indian mobile), prepend 91
  if (digits.length === 10) {
    digits = '91' + digits;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = '91' + digits.substring(1);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    // already has 91
  }
  return digits;
}

/**
 * Replace placeholders in template with actual bill details
 */
export function formatWhatsAppMessage(template, bill, items, settings, publicBaseUrl) {
  const customerName = bill.customer_name || 'Valued Customer';
  const invoiceNo = bill.invoice_no || '';
  
  // Date format DD/MM/YYYY
  let dateStr = '';
  if (bill.created_at) {
    const d = new Date(bill.created_at);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    dateStr = `${day}/${month}/${year}`;
  }

  // Format items list
  let itemsSummary = '';
  if (items && items.length > 0) {
    itemsSummary = items.map((item, idx) => {
      const sizeStr = item.size ? ` (${item.size})` : '';
      return `${idx + 1}. ${item.product_name}${sizeStr} x${item.quantity} = ₹${Number(item.total_amount).toFixed(2)}`;
    }).join('\n');
  }

  const baseUrl = (publicBaseUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const pdfLink = `${baseUrl}/invoice/${bill.public_token}.pdf`;

  const total = Number(bill.grand_total || 0).toFixed(2);
  const paid = Number(bill.paid_amount || 0).toFixed(2);
  const balance = Number(bill.balance_due || 0).toFixed(2);

  let message = template
    .replace(/{customer}/g, customerName)
    .replace(/{invoice_no}/g, invoiceNo)
    .replace(/{date}/g, dateStr)
    .replace(/{items}/g, itemsSummary)
    .replace(/{total}/g, total)
    .replace(/{paid}/g, paid)
    .replace(/{balance}/g, balance)
    .replace(/{pdf_link}/g, pdfLink);

  return message;
}

/**
 * Build wa.me URL
 */
export function buildWhatsAppUrl(phone, message) {
  const cleanedPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanedPhone}?text=${encodedText}`;
}

export default {
  cleanPhoneNumber,
  formatWhatsAppMessage,
  buildWhatsAppUrl
};
