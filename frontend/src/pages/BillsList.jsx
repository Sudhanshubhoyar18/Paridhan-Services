import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Printer,
  MessageSquare,
  DollarSign,
  Ban,
  Eye,
  RefreshCw,
  PlusCircle,
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react';
import api from '../api/client';
import { formatINR, formatDate, formatDateTime } from '../utils/formatters';
import { PaymentBadge, Badge } from '../components/Common/Badge';
import { Pagination } from '../components/Common/Pagination';
import { ConfirmDialog } from '../components/Common/ConfirmDialog';
import { WhatsAppModal } from '../components/Modals/WhatsAppModal';
import { PaymentModal } from '../components/Modals/PaymentModal';
import { useToast } from '../context/ToastContext';

export function BillsList() {
  const [bills, setBills] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [status, setStatus] = useState('');

  // Modals state
  const [selectedBillForWhatsApp, setSelectedBillForWhatsApp] = useState(null);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  const [cancelDialogBill, setCancelDialogBill] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const { success, error } = useToast();

  const fetchBills = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/bills', {
        search,
        startDate,
        endDate,
        paymentStatus,
        status,
        page,
        limit: 15
      });
      if (res.success) {
        setBills(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      error('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills(1);
  }, [startDate, endDate, paymentStatus, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBills(1);
  };

  const handleDownloadPdf = async (billId, invoiceNo) => {
    try {
      const blob = await api.get(`/bills/${billId}/pdf`);
      api.downloadBlob(blob, `Invoice-${invoiceNo}.pdf`);
      success(`Invoice ${invoiceNo} PDF downloaded.`);
    } catch (_) {
      error('Failed to download invoice PDF.');
    }
  };

  const handleCancelBillConfirm = async () => {
    if (!cancelDialogBill) return;
    setCancelling(true);
    try {
      const res = await api.post(`/bills/${cancelDialogBill.id}/cancel`, {});
      success(res.message || `Bill ${cancelDialogBill.invoice_no} cancelled and stock restored!`);
      setCancelDialogBill(null);
      fetchBills(pagination.page);
    } catch (err) {
      error(err.message || 'Failed to cancel bill.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Sales Invoices &amp; Billing History
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Search invoices, stream PDFs, send WhatsApp copies, and record payments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchBills(pagination.page)}
            title="Refresh list"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/billing"
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-sm shadow-md shadow-amber-500/20 transition transform active:scale-[0.99]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create Bill</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search box */}
          <form onSubmit={handleSearchSubmit} className="lg:col-span-2 relative">
            <input
              type="text"
              placeholder="Search by Invoice #, customer name, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>

          {/* Start Date */}
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white text-slate-700"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white text-slate-700"
            />
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium text-slate-700"
            >
              <option value="">All Payment Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial Due</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(search || startDate || endDate || paymentStatus || status) && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
            <span>Filtered results</span>
            <button
              onClick={() => {
                setSearch('');
                setStartDate('');
                setEndDate('');
                setPaymentStatus('');
                setStatus('');
              }}
              className="text-amber-700 font-bold hover:underline"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/70">
                <th className="py-3.5 pl-6">Invoice #</th>
                <th className="py-3.5">Date</th>
                <th className="py-3.5">Customer</th>
                <th className="py-3.5">Grand Total</th>
                <th className="py-3.5">Paid</th>
                <th className="py-3.5">Balance Due</th>
                <th className="py-3.5">Payment</th>
                <th className="py-3.5">Comms</th>
                <th className="py-3.5 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading invoices...</span>
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No matching invoices found.
                  </td>
                </tr>
              ) : (
                bills.map(bill => {
                  const isCancelled = bill.status === 'cancelled';

                  return (
                    <tr
                      key={bill.id}
                      className={`hover:bg-slate-50/70 transition ${isCancelled ? 'opacity-50 bg-slate-50/50' : ''}`}
                    >
                      {/* Invoice No */}
                      <td className="py-3.5 pl-6">
                        <Link
                          to={`/bills/${bill.id}`}
                          className="font-mono font-bold text-slate-900 hover:text-amber-600 block"
                        >
                          {bill.invoice_no}
                        </Link>
                        {isCancelled && (
                          <Badge variant="danger" className="text-[10px] mt-0.5">
                            Cancelled
                          </Badge>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 text-slate-600 whitespace-nowrap">
                        {formatDate(bill.created_at)}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5">
                        <p className="font-bold text-slate-900 truncate max-w-[150px]">{bill.customer_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{bill.customer_phone}</p>
                      </td>

                      {/* Grand Total */}
                      <td className="py-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {formatINR(bill.grand_total)}
                      </td>

                      {/* Paid */}
                      <td className="py-3.5 text-emerald-700 font-semibold whitespace-nowrap">
                        {formatINR(bill.paid_amount)}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3.5 whitespace-nowrap">
                        {bill.balance_due > 0 ? (
                          <span className="font-bold text-rose-600">
                            {formatINR(bill.balance_due)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">₹0.00</span>
                        )}
                      </td>

                      {/* Payment Status & Mode */}
                      <td className="py-3.5">
                        <PaymentBadge status={bill.payment_status} />
                        <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">
                          {bill.payment_mode}
                        </span>
                      </td>

                      {/* Communications Flags (WhatsApp sent icon) */}
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            title={bill.whatsapp_sent ? `WhatsApp Sent at ${formatDateTime(bill.whatsapp_sent_at)}` : 'WhatsApp not yet sent'}
                            className={`p-1 rounded ${bill.whatsapp_sent ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-300'}`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 pr-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* View */}
                          <Link
                            to={`/bills/${bill.id}`}
                            title="View Full Details"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* PDF Stream Download */}
                          <button
                            onClick={() => handleDownloadPdf(bill.id, bill.invoice_no)}
                            title="Download PDF"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Print in new window */}
                          <a
                            href={api.getUrl(`/api/bills/${bill.id}/pdf`)}
                            target="_blank"
                            rel="noreferrer"
                            title="Print Invoice"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                          >
                            <Printer className="w-4 h-4" />
                          </a>

                          {/* Send on WhatsApp */}
                          <button
                            onClick={() => setSelectedBillForWhatsApp(bill)}
                            title="Send on WhatsApp"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {/* Record Payment if partial */}
                          {!isCancelled && bill.balance_due > 0 && (
                            <button
                              onClick={() => setSelectedBillForPayment(bill)}
                              title="Record Payment"
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancel Bill */}
                          {!isCancelled && (
                            <button
                              onClick={() => setCancelDialogBill(bill)}
                              title="Cancel Bill & Restore Stock"
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          pagination={pagination}
          onPageChange={(p) => fetchBills(p)}
        />
      </div>

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={!!selectedBillForWhatsApp}
        onClose={() => setSelectedBillForWhatsApp(null)}
        bill={selectedBillForWhatsApp}
        onSent={() => fetchBills(pagination.page)}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={!!selectedBillForPayment}
        onClose={() => setSelectedBillForPayment(null)}
        bill={selectedBillForPayment}
        onPaymentRecorded={() => fetchBills(pagination.page)}
      />

      {/* Confirm Cancellation Dialog */}
      <ConfirmDialog
        isOpen={!!cancelDialogBill}
        onClose={() => setCancelDialogBill(null)}
        onConfirm={handleCancelBillConfirm}
        isDanger={true}
        loading={cancelling}
        title={`Cancel Bill ${cancelDialogBill?.invoice_no}?`}
        message="Cancelling this bill will mark it as cancelled AND automatically restore all purchased items back into your inventory stock. This action is recorded in stock movements."
        confirmText="Yes, Cancel Bill & Restore Stock"
      />
    </div>
  );
}

export default BillsList;
