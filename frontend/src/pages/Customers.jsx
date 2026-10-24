import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Eye,
  Edit,
  Trash2,
  Users,
  RefreshCw,
  Phone,
  Mail,
  GraduationCap
} from 'lucide-react';
import api from '../api/client';
import { formatINR, formatDate } from '../utils/formatters';
import { Pagination } from '../components/Common/Pagination';
import { ConfirmDialog } from '../components/Common/ConfirmDialog';
import { CustomerModal } from '../components/Modals/CustomerModal';
import { useToast } from '../context/ToastContext';

export function Customers() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [deleteCustomer, setDeleteCustomer] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { success, error } = useToast();

  const fetchCustomers = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/customers', { search, page, limit: 15 });
      if (res.success) {
        setCustomers(res.data);
        setPagination(res.pagination);
      }
    } catch (_) {
      error('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(1);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers(1);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCustomer) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/customers/${deleteCustomer.id}`);
      success(res.message || 'Customer deleted successfully.');
      setDeleteCustomer(null);
      fetchCustomers(pagination.page);
    } catch (err) {
      error(err.message || 'Failed to delete customer.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Customer Directory &amp; Accounts
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Search customer records, track total purchase history, and manage dues.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchCustomers(pagination.page)}
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedCustomer(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-sm shadow-md shadow-amber-500/20 transition transform active:scale-[0.99]"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            placeholder="Search by customer name, mobile number, or school/class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Customer List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/70">
                <th className="py-3.5 pl-6">Customer Name</th>
                <th className="py-3.5">Contact Number</th>
                <th className="py-3.5">School / Class</th>
                <th className="py-3.5 text-center">Invoices</th>
                <th className="py-3.5 text-right">Lifetime Spent</th>
                <th className="py-3.5 text-right">Outstanding Dues</th>
                <th className="py-3.5 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading customer accounts...</span>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No customers found matching the search.
                  </td>
                </tr>
              ) : (
                customers.map(c => {
                  const hasDue = Number(c.total_balance_due) > 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 pl-6">
                        <Link to={`/customers/${c.id}`} className="font-bold text-slate-900 hover:text-amber-600 block">
                          {c.name}
                        </Link>
                        {c.email && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">{c.email}</span>
                        )}
                      </td>

                      <td className="py-3.5 font-mono font-semibold text-slate-700 whitespace-nowrap">
                        {c.phone}
                      </td>

                      <td className="py-3.5 text-slate-600">
                        {c.school_class || <span className="text-slate-400">-</span>}
                      </td>

                      <td className="py-3.5 text-center font-bold text-slate-700">
                        {c.total_bills || 0}
                      </td>

                      <td className="py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatINR(c.total_spent)}
                      </td>

                      <td className="py-3.5 text-right whitespace-nowrap">
                        {hasDue ? (
                          <span className="font-bold text-rose-600">
                            {formatINR(c.total_balance_due)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">₹0.00</span>
                        )}
                      </td>

                      <td className="py-3.5 pr-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/customers/${c.id}`}
                            title="View Purchase History & Invoices"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(c);
                              setModalOpen(true);
                            }}
                            title="Edit Details"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteCustomer(c)}
                            title="Delete"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          pagination={pagination}
          onPageChange={(p) => fetchCustomers(p)}
        />
      </div>

      {/* Customer Modal */}
      <CustomerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        customer={selectedCustomer}
        onSaved={() => fetchCustomers(pagination.page)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteCustomer}
        onClose={() => setDeleteCustomer(null)}
        onConfirm={handleDeleteConfirm}
        isDanger={true}
        loading={deleting}
        title={`Delete Customer ${deleteCustomer?.name}?`}
        message={`Are you sure you want to delete "${deleteCustomer?.name}"? Even if they have previous bills, their customer record will be removed while safely preserving all past invoice copies.`}
        confirmText="Yes, Delete Customer"
      />
    </div>
  );
}

export default Customers;
