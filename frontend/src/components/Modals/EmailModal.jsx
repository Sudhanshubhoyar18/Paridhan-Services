import React, { useState, useEffect } from 'react';
import { Mail, Loader2, Send, Eye, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';
import Modal from '../Common/Modal';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

export function EmailModal({ isOpen, onClose, bill, onSent }) {
  const [activeTab, setActiveTab] = useState('compose'); // 'compose' | 'preview'
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentResult, setSentResult] = useState(null);
  const { success, error } = useToast();

  useEffect(() => {
    if (bill && isOpen) {
      setRecipient(bill.customer_email || '');
      setSubject(`Invoice ${bill.invoice_no} from Paridhan Uniforms`);
      setBody(
        `Dear ${bill.customer_name},\n\nThank you for shopping with Paridhan Uniforms! Please find attached the tax invoice ${bill.invoice_no}.\n\nInvoice Summary:\n- Total Amount: ₹${Number(bill.grand_total).toFixed(2)}\n- Amount Paid: ₹${Number(bill.paid_amount).toFixed(2)}\n- Balance Due: ₹${Number(bill.balance_due).toFixed(2)}\n\nIf you have any questions, feel free to reach out to us.\n\nWarm regards,\nParidhan Uniforms`
      );
      setSentResult(null);
      setActiveTab('compose');
      loadPreview(bill.id);
    }
  }, [bill, isOpen]);

  const loadPreview = async (billId) => {
    setLoadingPreview(true);
    try {
      const res = await api.get(`/bills/${billId}/email-preview`);
      if (res.success && res.data) {
        setPreviewHtml(res.data.html);
      }
    } catch (_) {}
    finally {
      setLoadingPreview(false);
    }
  };

  if (!bill) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!recipient.trim()) {
      error('Please enter a recipient email address.');
      return;
    }

    setSending(true);
    try {
      const res = await api.post(`/bills/${bill.id}/email`, {
        to: recipient.trim(),
        subject,
        body
      });
      setSentResult(res);
      success(res.message || 'Invoice email generated successfully!');
      if (onSent) onSent();
    } catch (err) {
      error(err.message || 'Failed to send email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Send Invoice ${bill.invoice_no} by Email`} maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Minimal Tab Switcher */}
        <div className="flex p-1 bg-neutral-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'compose' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Compose Email
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'preview' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-amber-600" />
            <span>Preview HTML Invoice Email</span>
          </button>
        </div>

        {/* Tab 1: Compose Form */}
        {activeTab === 'compose' && !sentResult && (
          <form onSubmit={handleSend} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Recipient Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
                placeholder="customer@example.com"
                className="w-full px-3.5 py-2 text-sm border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-sm border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Message Body
              </label>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none resize-none font-sans leading-relaxed"
              />
            </div>

            <div className="p-3 bg-neutral-100/70 border border-neutral-200 rounded-xl text-xs text-neutral-600 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-neutral-900">
                <Mail className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Official Tax Invoice PDF generated and attached automatically</span>
              </div>
              <p className="text-[11px] text-neutral-500 pl-6">
                Uses Gmail SMTP if configured in Settings, or generates a real instant browser preview link.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition shadow-sm disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-amber-400" />}
                <span>{sending ? 'Sending Email...' : 'Send Invoice Email'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: HTML Email Preview */}
        {activeTab === 'preview' && (
          <div className="space-y-3">
            <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-50 max-h-96 overflow-y-auto p-2">
              {loadingPreview ? (
                <div className="py-12 text-center text-xs text-neutral-400">Loading HTML preview...</div>
              ) : previewHtml ? (
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <div className="py-12 text-center text-xs text-neutral-400">Unable to generate preview.</div>
              )}
            </div>
            <div className="flex justify-between items-center text-xs text-neutral-500 pt-1">
              <span>This responsive HTML layout will be sent to the customer with the PDF attached.</span>
              <button
                type="button"
                onClick={() => setActiveTab('compose')}
                className="font-bold text-neutral-900 hover:underline"
              >
                Back to Compose &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Success / Sent Result Banner */}
        {sentResult && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">Email Generated Successfully!</h4>
              <p className="text-xs text-emerald-800 mt-1">{sentResult.message}</p>
            </div>

            {sentResult.previewUrl && (
              <a
                href={sentResult.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Delivered Email in Browser (Ethereal)</span>
              </a>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-white border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold hover:bg-emerald-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default EmailModal;
