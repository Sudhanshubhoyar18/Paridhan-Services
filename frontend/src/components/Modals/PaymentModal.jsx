import React, { useState } from 'react';
import { Loader2, DollarSign, CreditCard } from 'lucide-react';
import Modal from '../Common/Modal';
import api from '../../api/client';
import { formatINR } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';

export function PaymentModal({ isOpen, onClose, bill, onPaymentRecorded }) {
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  if (!bill) return null;

  const due = Number(bill.balance_due || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payAmt = parseFloat(amount);
    if (!payAmt || payAmt <= 0) {
      error('Please enter a valid payment amount.');
      return;
    }
    if (payAmt > due) {
      error(`Payment amount cannot exceed the pending balance of ${formatINR(due)}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/bills/${bill.id}/payments`, {
        amount: payAmt,
        payment_mode: paymentMode,
        reference_no: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined
      });
      success(res.message || 'Payment recorded successfully!');
      if (onPaymentRecorded) onPaymentRecorded(res.data);
      onClose();
    } catch (err) {
      error(err.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Payment for ${bill.invoice_no}`} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs space-y-1">
          <div className="flex justify-between font-semibold text-slate-700">
            <span>Customer:</span>
            <span className="text-slate-900 font-bold">{bill.customer_name}</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-700">
            <span>Grand Total:</span>
            <span>{formatINR(bill.grand_total)}</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-700">
            <span>Already Paid:</span>
            <span className="text-emerald-700">{formatINR(bill.paid_amount)}</span>
          </div>
          <div className="flex justify-between font-bold text-rose-700 text-sm pt-1 border-t border-amber-200">
            <span>Remaining Balance Due:</span>
            <span>{formatINR(due)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Payment Amount (₹) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={due}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder={String(due)}
              className="w-full px-3.5 py-2.5 text-base font-bold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
            <button
              type="button"
              onClick={() => setAmount(String(due))}
              className="absolute right-2 top-2 px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200"
            >
              Pay Full Due
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Payment Mode
          </label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium"
          >
            <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
            <option value="Cash">Cash</option>
            <option value="Card">Debit / Credit Card</option>
            <option value="Bank">Bank Transfer / NEFT</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Transaction / UTR Reference No <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            placeholder="e.g. UPI Ref # 3498273648"
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Notes <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Received via counter UPI QR"
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !amount}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition shadow-sm disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Record Payment</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default PaymentModal;
