import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Package,
  Calendar,
  PlusCircle,
  FileText,
  MessageSquare,
  Mail,
  Download,
  Eye,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../api/client';
import { formatINR, formatDate, formatDateTime } from '../utils/formatters';
import { StatCard } from '../components/Common/StatCard';
import { PaymentBadge, Badge } from '../components/Common/Badge';
import { StockAdjustModal } from '../components/Modals/StockAdjustModal';
import { EmailModal } from '../components/Modals/EmailModal';
import { WhatsAppModal } from '../components/Modals/WhatsAppModal';
import { useToast } from '../context/ToastContext';

const PIE_COLORS = ['#f59e0b', '#0f172a', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

export function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [emailBill, setEmailBill] = useState(null);
  const [whatsAppBill, setWhatsAppBill] = useState(null);
  const { error } = useToast();

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard');
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      error('Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleQuickAddStock = (product) => {
    setSelectedProduct(product);
    setAdjustModalOpen(true);
  };

  const handleDownloadPdf = async (billId, invoiceNo) => {
    try {
      const blob = await api.get(`/bills/${billId}/pdf`);
      api.downloadBlob(blob, `Invoice-${invoiceNo}.pdf`);
    } catch (err) {
      error('Failed to download invoice PDF.');
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading Paridhan Uniforms Dashboard...</p>
        </div>
      </div>
    );
  }

  const cards = data?.cards || {};
  const charts = data?.charts || {};
  const lowStock = data?.lowStockAlerts || [];
  const recentBills = data?.recentBills || [];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Store Overview &amp; Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Real-time daily operations, billing performance, and stock levels.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboard}
            title="Refresh metrics"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/billing"
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-sm shadow-md shadow-amber-500/20 transition transform active:scale-[0.99]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Bill</span>
          </Link>
        </div>
      </div>

      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatINR(cards.todaySales)}
          subtitle={`${cards.todayBillsCount || 0} bills generated`}
          icon={TrendingUp}
          color="gold"
        />
        <StatCard
          title="This Month's Sales"
          value={formatINR(cards.thisMonthSales)}
          subtitle={`${cards.thisMonthBillsCount || 0} bills this month`}
          icon={Calendar}
          color="navy"
        />
        <StatCard
          title="Pending Dues"
          value={formatINR(cards.totalPendingPayments)}
          subtitle="Uncollected customer dues"
          icon={CreditCard}
          color="danger"
        />
        <StatCard
          title="Retail Stock Value"
          value={formatINR(cards.totalStockValue)}
          subtitle={`${cards.totalStockUnits || 0} total units in shop`}
          icon={ShoppingBag}
          color="emerald"
        />
        <StatCard
          title="Cost Stock Value"
          value={formatINR(cards.totalCostValue)}
          subtitle="Inventory at purchase cost"
          icon={Package}
          color="navy"
        />
        <StatCard
          title="Low-Stock Items"
          value={cards.lowStockItemsCount || 0}
          subtitle="Items below threshold"
          icon={AlertTriangle}
          color={cards.lowStockItemsCount > 0 ? 'danger' : 'emerald'}
        />
      </div>

      {/* 4 Interactive Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Sales Last 30 Days (Line) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sales Trend (Last 30 Days)</h3>
              <p className="text-xs text-slate-500">Daily revenue and collection</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.last30DaysSales || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="display_date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val) => [formatINR(val), '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="sales" name="Sales (₹)" stroke="#d97706" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="collected" name="Collected (₹)" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top 10 Selling Items (Bar) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top 10 Fast-Moving Items</h3>
              <p className="text-xs text-slate-500">Ranked by units sold</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.topSellingItems || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" width={110} stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  formatter={(val, name) => [val, name === 'total_qty' ? 'Units Sold' : 'Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="total_qty" name="Units Sold" fill="#0f172a" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Sales by Category (Donut Pie) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sales Breakdown by Category</h3>
              <p className="text-xs text-slate-500">Revenue share across product categories</p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            {charts.salesByCategory && charts.salesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.salesByCategory}
                    dataKey="total_sales"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {charts.salesByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [formatINR(val), 'Revenue']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">No sales recorded yet.</p>
            )}
          </div>
        </div>

        {/* Chart 4: Stock by Category (Bar) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Inventory Stock by Category</h3>
              <p className="text-xs text-slate-500">Available physical units per category</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.stockByCategory || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val, name) => [val, name === 'total_stock' ? 'Units in Stock' : 'Stock Value']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="total_stock" name="Units" fill="#d97706" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two Data Tables: Low Stock Alerts & Recent Bills */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Table 1: Low-Stock Alerts (1 column width on xl) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm xl:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Low-Stock Warnings</h3>
                <p className="text-[11px] text-slate-500">Items requiring reorder</p>
              </div>
            </div>
            <Link to="/inventory?lowStock=true" className="text-xs font-semibold text-amber-700 hover:underline">
              View all
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {lowStock.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                🎉 All items are well-stocked above thresholds!
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStock.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/50 border border-rose-100 hover:bg-rose-50 transition"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {item.school || 'General'} • Size {item.size} • <span className="font-mono text-rose-600 font-bold">{item.current_stock} left</span> (Min {item.low_stock_threshold})
                      </p>
                    </div>
                    <button
                      onClick={() => handleQuickAddStock(item)}
                      className="px-2.5 py-1 text-xs font-bold bg-white border border-rose-200 text-rose-700 rounded-lg shadow-sm hover:bg-rose-600 hover:text-white transition whitespace-nowrap"
                    >
                      + Add Stock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table 2: 10 Most Recent Bills (2 columns width on xl) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Invoices</h3>
                <p className="text-[11px] text-slate-500">Latest 10 bills generated</p>
              </div>
            </div>
            <Link to="/bills" className="text-xs font-semibold text-amber-700 hover:underline">
              View all invoices &rarr;
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Invoice #</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentBills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No invoices created yet. Click "Create New Bill" to begin!
                    </td>
                  </tr>
                ) : (
                  recentBills.map(bill => (
                    <tr key={bill.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 pl-2 font-mono font-bold text-slate-900">
                        <Link to={`/bills/${bill.id}`} className="hover:text-amber-600">
                          {bill.invoice_no}
                        </Link>
                      </td>
                      <td className="py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(bill.created_at)}
                      </td>
                      <td className="py-3">
                        <span className="font-semibold text-slate-800 block truncate max-w-[130px]">{bill.customer_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{bill.customer_phone}</span>
                      </td>
                      <td className="py-3 font-bold text-slate-900 whitespace-nowrap">
                        {formatINR(bill.grand_total)}
                      </td>
                      <td className="py-3">
                        <PaymentBadge status={bill.payment_status} />
                      </td>
                      <td className="py-3 pr-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/bills/${bill.id}`}
                            title="View Details"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDownloadPdf(bill.id, bill.invoice_no)}
                            title="Download PDF"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setWhatsAppBill(bill)}
                            title="Send on WhatsApp"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEmailBill(bill)}
                            title="Send on Email"
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals for Quick Actions */}
      <StockAdjustModal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        product={selectedProduct}
        onAdjusted={fetchDashboard}
      />

      <WhatsAppModal
        isOpen={!!whatsAppBill}
        onClose={() => setWhatsAppBill(null)}
        bill={whatsAppBill}
        onSent={fetchDashboard}
      />

      <EmailModal
        isOpen={!!emailBill}
        onClose={() => setEmailBill(null)}
        bill={emailBill}
        onSent={fetchDashboard}
      />
    </div>
  );
}

export default Dashboard;
