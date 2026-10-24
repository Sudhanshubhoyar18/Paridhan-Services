import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  Users
} from 'lucide-react';
import api from '../api/client';
import { formatINR, formatDate } from '../utils/formatters';
import { StatCard } from '../components/Common/StatCard';
import { useToast } from '../context/ToastContext';

export function Reports() {
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'stock' | 'dues'

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  // Data
  const [reportData, setReportData] = useState({ rows: [], summary: {} });
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const fetchReport = async () => {
    setLoading(true);
    try {
      let endpoint = '/reports/sales';
      const params = {};

      if (activeTab === 'sales') {
        endpoint = '/reports/sales';
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (paymentStatus) params.paymentStatus = paymentStatus;
      } else if (activeTab === 'stock') {
        endpoint = '/reports/stock';
        if (category) params.category = category;
      } else if (activeTab === 'dues') {
        endpoint = '/reports/dues';
      }

      const res = await api.get(endpoint, params);
      if (res.success) {
        setReportData({
          rows: res.rows || [],
          summary: res.summary || {}
        });
      }
    } catch (_) {
      error('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, startDate, endDate, category, paymentStatus]);

  // Export to CSV
  const handleExportCsv = async () => {
    try {
      const params = {};
      if (activeTab === 'sales') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (paymentStatus) params.paymentStatus = paymentStatus;
      } else if (activeTab === 'stock') {
        if (category) params.category = category;
      }

      const blob = await api.get(`/reports/${activeTab}/csv`, params);
      api.downloadBlob(blob, `${activeTab}_report.csv`);
      success(`Exported ${activeTab} report to CSV!`);
    } catch (_) {
      error('Failed to export CSV report.');
    }
  };

  // Export to PDF
  const handleExportPdf = async () => {
    try {
      const params = {};
      if (activeTab === 'sales') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (paymentStatus) params.paymentStatus = paymentStatus;
      } else if (activeTab === 'stock') {
        if (category) params.category = category;
      }

      const blob = await api.get(`/reports/${activeTab}/pdf`, params);
      api.downloadBlob(blob, `${activeTab}_report.pdf`);
      success(`Exported ${activeTab} report to PDF!`);
    } catch (_) {
      error('Failed to generate PDF report.');
    }
  };

  const rows = reportData.rows || [];
  const summary = reportData.summary || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Financial &amp; Stock Reports
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Generate and export Sales analysis, Inventory valuation, and Customer Dues statements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* CSV Export */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          {/* PDF Export */}
          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Report Tab Switcher */}
      <div className="flex p-1.5 bg-slate-200/80 rounded-2xl max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'sales'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sales Report
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'stock'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Inventory Stock Report
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dues')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'dues'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Customer Dues
        </button>
      </div>

      {/* Filters Toolbar */}
      {activeTab === 'sales' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
            >
              <option value="">All Payments</option>
              <option value="Paid">Fully Paid</option>
              <option value="Partial">Partial Due</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>
        </div>
      )}

      {/* Summary KPI Cards depending on tab */}
      {activeTab === 'sales' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Invoices" value={summary.total_bills || 0} icon={FileText} color="navy" />
          <StatCard title="Total Revenue" value={formatINR(summary.total_sales)} icon={TrendingUp} color="gold" />
          <StatCard title="Amount Collected" value={formatINR(summary.total_collected)} icon={DollarSign} color="emerald" />
          <StatCard title="Pending Receivables" value={formatINR(summary.total_dues)} icon={AlertTriangle} color="danger" />
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard title="Product Variants" value={summary.total_products || 0} icon={Package} color="navy" />
          <StatCard title="Total Units in Stock" value={summary.total_units || 0} icon={Package} color="gold" />
          <StatCard title="Cost Valuation" value={formatINR(summary.total_cost_valuation)} icon={DollarSign} color="navy" />
          <StatCard title="Retail Valuation" value={formatINR(summary.total_retail_valuation)} icon={TrendingUp} color="emerald" />
        </div>
      )}

      {activeTab === 'dues' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard title="Customers with Dues" value={summary.total_defaulters || 0} icon={Users} color="navy" />
          <StatCard title="Total Outstanding Receivables" value={formatINR(summary.total_pending_dues)} icon={AlertTriangle} color="danger" />
        </div>
      )}

      {/* Table Presentation */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'sales' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/70">
                  <th className="py-3.5 pl-6">Date</th>
                  <th className="py-3.5">Invoice #</th>
                  <th className="py-3.5">Customer</th>
                  <th className="py-3.5">Mode</th>
                  <th className="py-3.5">Status</th>
                  <th className="py-3.5 text-right">Tax (₹)</th>
                  <th className="py-3.5 text-right">Total (₹)</th>
                  <th className="py-3.5 text-right pr-6">Paid (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 pl-6 text-slate-500 whitespace-nowrap">{formatDate(r.created_at)}</td>
                    <td className="py-3 font-mono font-bold text-slate-900">{r.invoice_no}</td>
                    <td className="py-3 font-semibold text-slate-800">{r.customer_name}</td>
                    <td className="py-3 text-slate-600">{r.payment_mode}</td>
                    <td className="py-3 font-semibold">{r.payment_status}</td>
                    <td className="py-3 text-right text-slate-500">{formatINR(r.total_tax)}</td>
                    <td className="py-3 text-right font-bold text-slate-900">{formatINR(r.grand_total)}</td>
                    <td className="py-3 text-right font-bold text-emerald-700 pr-6">{formatINR(r.paid_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'stock' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/70">
                  <th className="py-3.5 pl-6">SKU</th>
                  <th className="py-3.5">Item Name</th>
                  <th className="py-3.5">Category</th>
                  <th className="py-3.5">School</th>
                  <th className="py-3.5 text-center">Size</th>
                  <th className="py-3.5 text-right">Selling Price</th>
                  <th className="py-3.5 text-center">Stock</th>
                  <th className="py-3.5 text-right pr-6">Retail Val</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={r.id} className={`hover:bg-slate-50/50 ${r.is_low_stock ? 'bg-rose-50/30' : ''}`}>
                    <td className="py-3 pl-6 font-mono font-bold text-slate-900">{r.sku}</td>
                    <td className="py-3 font-semibold text-slate-800">{r.name}</td>
                    <td className="py-3 text-slate-600">{r.category}</td>
                    <td className="py-3 text-slate-500">{r.school || 'General'}</td>
                    <td className="py-3 text-center font-bold text-slate-700">{r.size}</td>
                    <td className="py-3 text-right text-slate-700">{formatINR(r.selling_price)}</td>
                    <td className="py-3 text-center">
                      <span className={`font-black ${r.is_low_stock ? 'text-rose-600' : 'text-slate-800'}`}>
                        {r.current_stock}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-slate-900 pr-6">{formatINR(r.retail_valuation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'dues' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/70">
                  <th className="py-3.5 pl-6">Customer Name</th>
                  <th className="py-3.5">Phone</th>
                  <th className="py-3.5">School / Class</th>
                  <th className="py-3.5 text-center">Unpaid Invoices</th>
                  <th className="py-3.5 text-right pr-6">Total Due (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 pl-6 font-bold text-slate-900">{r.name}</td>
                    <td className="py-3 font-mono font-semibold text-slate-700">{r.phone}</td>
                    <td className="py-3 text-slate-600">{r.school_class || '-'}</td>
                    <td className="py-3 text-center font-bold text-slate-700">{r.unpaid_bills_count}</td>
                    <td className="py-3 text-right font-black text-rose-600 pr-6">{formatINR(r.total_due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Reports;
