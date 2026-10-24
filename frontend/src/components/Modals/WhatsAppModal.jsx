import React, { useState, useEffect } from 'react';
import { MessageSquare, ExternalLink, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react';
import Modal from '../Common/Modal';
import api from '../../api/client';
import { cleanPhoneNumber } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';

export function WhatsAppModal({ isOpen, onClose, bill, onSent }) {
  const [templateType, setTemplateType] = useState('invoice'); // 'invoice' | 'reminder'
  const [message, setMessage] = useState('');
  const [waUrl, setWaUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (bill && isOpen) {
      // Default to reminder if balance is due and payment_status != Paid
      if (bill.balance_due > 0 && bill.payment_status !== 'Paid') {
        setTemplateType('reminder');
      } else {
        setTemplateType('invoice');
      }
      fetchWhatsAppContent(bill.id, bill.balance_due > 0 ? 'reminder' : 'invoice');
    }
  }, [bill, isOpen]);

  const fetchWhatsAppContent = async (billId, type) => {
    setLoading(true);
    try {
      const res = await api.get(`/bills/${billId}/whatsapp-data`, { type });
      if (res.success) {
        setMessage(res.data.message);
        setWaUrl(res.data.waUrl);
        setPhone(res.data.phone);
      }
    } catch (err) {
      error('Failed to prepare WhatsApp message.');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (type) => {
    setTemplateType(type);
    if (bill) {
      fetchWhatsAppContent(bill.id, type);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    success('Message copied to clipboard!');
  };

  const handleOpenWhatsApp = async () => {
    if (!bill) return;

    // Recalculate URL in case message was edited
    const cleaned = cleanPhoneNumber(phone || bill.customer_phone);
    const finalUrl = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;

    // Open wa.me in new tab
    window.open(finalUrl, '_blank', 'noopener,noreferrer');

    // Mark as sent in database
    try {
      await api.post(`/bills/${bill.id}/whatsapp-sent`, {});
      success('WhatsApp message opened & recorded!');
      if (onSent) onSent();
    } catch (_) {}

    onClose();
  };

  if (!bill) return null;

  const cleanedPhone = cleanPhoneNumber(phone || bill.customer_phone);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Send Invoice ${bill.invoice_no} on WhatsApp`} maxWidth="max-w-xl">
      <div className="space-y-4">
        {/* Template Selector */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => handleTemplateChange('invoice')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              templateType === 'invoice'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Invoice Notification
          </button>
          <button
            type="button"
            onClick={() => handleTemplateChange('reminder')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              templateType === 'reminder'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Payment Due Reminder {bill.balance_due > 0 && `(₹${bill.balance_due})`}
          </button>
        </div>

        {/* Customer Phone info */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Recipient Mobile Number
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <span className="text-xs text-slate-500 whitespace-nowrap bg-slate-100 px-3 py-2 rounded-xl">
              Cleaned: <strong className="text-slate-800">+{cleanedPhone}</strong>
            </span>
          </div>
        </div>

        {/* Message preview and editor */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">
              Message Preview (wa.me link payload)
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>
          <textarea
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={loading}
            className="w-full p-3 text-xs sm:text-sm font-mono border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Public PDF link notice */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
          <MessageSquare className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Click-to-Chat (wa.me) Format</p>
            <p className="text-emerald-700 mt-0.5">
              Includes a public direct PDF invoice link. The recipient can click the link in WhatsApp to download and view their official bill without any login.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            disabled={loading || !cleanedPhone}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-sm disabled:opacity-50"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open in WhatsApp (wa.me)</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default WhatsAppModal;
