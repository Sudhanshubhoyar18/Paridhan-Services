import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Download,
  Eye,
  PlusCircle,
  FileText
} from 'lucide-react';
import api from '../api/client';
import { formatINR, formatDate } from '../utils/formatters';
import { PaymentBadge } from '../components/Common/Badge';
import { useToast } from '../context/ToastContext';

export function CustomerDetails() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();
  const navigate = useNavigate();

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers/${id}`);
      if (res.success) {
        setCustomer(res.data);
      }
    } catch (_) {
      error('Failed to load customer profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  if (loading || !customer) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = customer.stats || {};
  const bills = customer.bills || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/customers')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </button>
      </div>

      {/* Profile Card & Stats Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 text-amber-400 font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-amber-500/10">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{customer.name}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1 font-mono font-semibold text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.phone}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> {customer.email}
                  </span>
                )}
                {customer.school_class && (
                  <span className="flex items-center gap-1 font-semibold text-amber-700">
                    <GraduationCap className="w-3.5 h-3.5" /> {customer.school_class}
                  </span>
                )}
              </div>
              {customer.address && (
                <p className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" /> {customer.address}
                </p>
              )}
            </div>
          </div>

          <Link
            to="/billing"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs shadow-md shadow-amber-500/20 transition whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Bill for {customer.name.split(' ')[0]}</span>
          </Link>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Invoices</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.total_bills || 0}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Lifetime Purchases</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{formatINR(stats.total_spent)}</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending Balance Due</p>
            <p className={`text-2xl font-black mt-1 ${Number(stats.total_balance_due) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {formatINR(stats.total_balance_due)}
            </p>
          </div>
        </div>
      </div>

      {/* Invoices History Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600" />
            <span>Invoice Purchase History</span>
          </h3>
          <span className="text-xs text-slate-400 font-semibold">{bills.length} invoices found</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/70">
                <th className="py-3.5 pl-6">Invoice #</th>
                <th className="py-3.5">Date</th>
                <th className="py-3.5">Payment Mode</th>
                <th className="py-3.5 text-right">Grand Total</th>
                <th className="py-3.5 text-right">Paid</th>
                <th className="py-3.5 text-right">Balance Due</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No purchase invoices on record for this customer yet.
                  </td>
                </tr>
              ) : (
                bills.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 pl-6 font-mono font-bold text-slate-900">
                      <Link to={`/bills/${b.id}`} className="hover:text-amber-600">
                        {b.invoice_no}
                      </Link>
                    </td>
                    <td className="py-3.5 text-slate-500 whitespace-nowrap">
                      {formatDate(b.created_at)}
                    </td>
                    <td className="py-3.5 text-slate-600">
                      {b.payment_mode}
                    </td>
                    <td className="py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatINR(b.grand_total)}
                    </td>
                    <td className="py-3.5 text-right text-emerald-700 font-semibold whitespace-nowrap">
                      {formatINR(b.paid_amount)}
                    </td>
                    <td className="py-3.5 text-right whitespace-nowrap">
                      {b.balance_due > 0 ? (
                        <span className="font-bold text-rose-600">{formatINR(b.balance_due)}</span>
                      ) : (
                        <span className="text-slate-400">₹0.00</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <PaymentBadge status={b.payment_status} />
                    </td>
                    <td className="py-3.5 pr-6 text-right whitespace-nowrap">
                      <Link
                        to={`/bills/${b.id}`}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CustomerDetails;
