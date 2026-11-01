import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Download,
  MessageSquare,
  DollarSign,
  Ban,
  CheckCircle2,
  Copy,
  ExternalLink,
  Store,
  Calendar,
  User,
  CreditCard
} from 'lucide-react';
import api from '../api/client';
import { formatINR, formatDate, formatDateTime } from '../utils/formatters';
import { PaymentBadge, Badge } from '../components/Common/Badge';
import { ConfirmDialog } from '../components/Common/ConfirmDialog';
import { WhatsAppModal } from '../components/Modals/WhatsAppModal';
import { PaymentModal } from '../components/Modals/PaymentModal';
import { useToast } from '../context/ToastContext';

export function BillDetails() {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [whatsAppModal, setWhatsAppModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { success, error } = useToast();
  const navigate = useNavigate();

  const fetchBill = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/bills/${id}`);
      if (res.success) {
        setBill(res.data);
      }
    } catch (err) {
      error('Failed to load bill details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBill();
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!bill) return;
    try {
      const blob = await api.get(`/bills/${bill.id}/pdf`);
      api.downloadBlob(blob, `Invoice-${bill.invoice_no}.pdf`);
      success(`Invoice ${bill.invoice_no} PDF downloaded.`);
    } catch (_) {
      error('Failed to download invoice PDF.');
    }
  };

  const handleCopyPublicLink = () => {
    if (!bill) return;
    const url = `${window.location.origin}/invoice/${bill.public_token}.pdf`;
    navigator.clipboard.writeText(url);
    success('Public invoice PDF link copied to clipboard!');
  };

  const handleCancelBill = async () => {
    if (!bill) return;
    setCancelling(true);
    try {
      const res = await api.post(`/bills/${bill.id}/cancel`, {});
      success(res.message || 'Bill cancelled and stock restored!');
      setCancelDialog(false);
      fetchBill();
    } catch (err) {
      error(err.message || 'Failed to cancel bill.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !bill) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const items = bill.items || [];
  const payments = bill.payments || [];
  const isCancelled = bill.status === 'cancelled';
  const publicUrl = `${window.location.origin}/invoice/${bill.public_token}.pdf`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back and Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/bills')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download PDF */}
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          {/* Print */}
          <a
            href={api.getUrl(`/api/bills/${bill.id}/pdf`)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Print Invoice</span>
          </a>

          {/* WhatsApp */}
          <button
            onClick={() => setWhatsAppModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Send on WhatsApp</span>
          </button>

          {/* Payment */}
          {!isCancelled && bill.balance_due > 0 && (
            <button
              onClick={() => setPaymentModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-400 transition shadow-sm"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}

          {/* Cancel */}
          {!isCancelled && (
            <button
              onClick={() => setCancelDialog(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold transition"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Cancel Bill</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Invoice Card (Paper Look) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Accent Top Bar */}
        <div className="h-2 bg-amber-500 w-full" />

        {/* Invoice Header */}
        <div className="p-6 sm:p-8 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 font-extrabold flex items-center justify-center text-sm shadow">
                  PU
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Paridhan Uniforms</h1>
                  <p className="text-xs text-slate-500 font-medium">Official Tax Invoice</p>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Invoice Number</span>
              <p className="text-xl font-black font-mono text-amber-600">{bill.invoice_no}</p>
              <p className="text-xs text-slate-500 mt-0.5">Date: {formatDate(bill.created_at)}</p>
              <div className="mt-2 flex items-center sm:justify-end gap-2">
                <PaymentBadge status={bill.payment_status} />
                {isCancelled && <Badge variant="danger">Cancelled</Badge>}
              </div>
            </div>
          </div>

          {/* Customer Details Box */}
          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Billed To (Customer)</span>
              <p className="text-sm font-bold text-slate-900">{bill.customer_name}</p>
              <p className="text-slate-600 font-mono mt-0.5">Phone: {bill.customer_phone}</p>
              {bill.customer_email && <p className="text-slate-600">Email: {bill.customer_email}</p>}
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Institution &amp; Address</span>
              {bill.customer_school_class && (
                <p className="font-semibold text-slate-800">School/Class: {bill.customer_school_class}</p>
              )}
              {bill.customer_address && (
                <p className="text-slate-600 mt-0.5">{bill.customer_address}</p>
              )}
              <p className="text-slate-500 mt-1">Payment Mode: <strong className="text-slate-700">{bill.payment_mode}</strong></p>
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 pl-8">#</th>
                <th className="py-3">Item Description</th>
                <th className="py-3 text-center">Size</th>
                <th className="py-3 text-center">Qty</th>
                <th className="py-3 text-right">Rate (₹)</th>
                <th className="py-3 text-right">Disc (₹)</th>
                <th className="py-3 text-center">GST</th>
                <th className="py-3 pr-8 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/40">
                  <td className="py-3 pl-8 text-slate-400">{index + 1}</td>
                  <td className="py-3 font-semibold text-slate-800">
                    {item.product_name}
                    {item.school && <span className="text-slate-400 font-normal ml-1">[{item.school}]</span>}
                  </td>
                  <td className="py-3 text-center text-slate-600">{item.size || '-'}</td>
                  <td className="py-3 text-center font-bold text-slate-800">{item.quantity}</td>
                  <td className="py-3 text-right text-slate-700">{Number(item.unit_price).toFixed(2)}</td>
                  <td className="py-3 text-right text-slate-500">{Number(item.discount || 0).toFixed(2)}</td>
                  <td className="py-3 text-center text-slate-500">{item.gst_rate}%</td>
                  <td className="py-3 pr-8 text-right font-bold text-slate-900">{Number(item.total_amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="p-6 sm:p-8 bg-slate-50/50 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notes & Public Link */}
          <div className="space-y-3">
            {bill.notes && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-0.5">Remarks / Notes:</span>
                <p className="text-slate-600">{bill.notes}</p>
              </div>
            )}

            {/* Public PDF Share Link Box */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs space-y-1.5">
              <span className="font-bold text-amber-900 block">Public WhatsApp PDF Link:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-[11px] font-mono text-slate-700 outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyPublicLink}
                  title="Copy link"
                  className="p-1.5 bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-amber-700">Customers can open this URL directly from WhatsApp to view and download their invoice.</p>
            </div>
          </div>

          {/* Detailed Calculations */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800">{formatINR(bill.subtotal)}</span>
            </div>
            {Number(bill.discount_amount) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount:</span>
                <span>- {formatINR(bill.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span className="font-semibold text-slate-800">{formatINR(bill.taxable_amount)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>CGST:</span>
              <span>{formatINR(bill.cgst_amount)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>SGST:</span>
              <span>{formatINR(bill.sgst_amount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Round-off:</span>
              <span>{Number(bill.round_off) >= 0 ? `+${bill.round_off}` : bill.round_off}</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="text-amber-600">{formatINR(bill.grand_total)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-emerald-700">
              <span>Amount Paid:</span>
              <span>{formatINR(bill.paid_amount)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-rose-700 pt-1 border-t border-slate-200">
              <span>Balance Due:</span>
              <span>{formatINR(bill.balance_due)}</span>
            </div>
          </div>
        </div>

        {/* Payments History if any */}
        {payments.length > 0 && (
          <div className="p-6 border-t border-slate-100 bg-white">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Payment Transactions ({payments.length})
            </h4>
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{formatINR(p.amount)}</span>
                    <span className="text-slate-500 ml-2">via {p.payment_mode}</span>
                    {p.reference_no && <span className="font-mono text-slate-400 ml-2">Ref: {p.reference_no}</span>}
                  </div>
                  <span className="text-slate-400">{formatDateTime(p.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <WhatsAppModal
        isOpen={whatsAppModal}
        onClose={() => setWhatsAppModal(false)}
        bill={bill}
        onSent={fetchBill}
      />

      <PaymentModal
        isOpen={paymentModal}
        onClose={() => setPaymentModal(false)}
        bill={bill}
        onPaymentRecorded={fetchBill}
      />

      <ConfirmDialog
        isOpen={cancelDialog}
        onClose={() => setCancelDialog(false)}
        onConfirm={handleCancelBill}
        isDanger={true}
        loading={cancelling}
        title={`Cancel Invoice ${bill.invoice_no}?`}
        message="Cancelling will restore all purchased items back to the inventory stock and log this in stock movements."
        confirmText="Confirm Cancellation"
      />
    </div>
  );
}

export default BillDetails;
