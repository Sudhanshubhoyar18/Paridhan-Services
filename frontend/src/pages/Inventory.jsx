import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Upload,
  Download,
  AlertTriangle,
  ArrowUpDown,
  Edit,
  Trash2,
  Package,
  Layers,
  Filter,
  RefreshCw,
  Eye,
  History
} from 'lucide-react';
import api from '../api/client';
import { formatINR, formatDate } from '../utils/formatters';
import { Badge } from '../components/Common/Badge';
import { Pagination } from '../components/Common/Pagination';
import { ConfirmDialog } from '../components/Common/ConfirmDialog';
import { ProductModal } from '../components/Modals/ProductModal';
import { StockAdjustModal } from '../components/Modals/StockAdjustModal';
import { Modal } from '../components/Common/Modal';
import { useToast } from '../context/ToastContext';

export function Inventory() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [school, setSchool] = useState('');
  const [size, setSize] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Metadata for dropdowns
  const [categories, setCategories] = useState([]);
  const [schools, setSchools] = useState([]);
  const [sizes, setSizes] = useState([]);

  // Modals state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // History Drawer/Modal
  const [historyProduct, setHistoryProduct] = useState(null);
  const [historyMovements, setHistoryMovements] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fileInputRef = useRef(null);
  const { success, error, info } = useToast();

  const fetchProducts = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/products', {
        search,
        category,
        school,
        size,
        lowStock: lowStockOnly ? 'true' : 'false',
        page,
        limit: 20
      });
      if (res.success) {
        setProducts(res.data);
        setPagination(res.pagination);
        if (res.meta) {
          setCategories(res.meta.categories || []);
          setSchools(res.meta.schools || []);
          setSizes(res.meta.sizes || []);
        }
      }
    } catch (err) {
      error('Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(1);
  }, [category, school, size, lowStockOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts(1);
  };

  // CSV Export
  const handleExportCsv = async () => {
    try {
      const blob = await api.get('/products/export');
      api.downloadBlob(blob, 'paridhan_uniform_inventory.csv');
      success('Products exported to CSV successfully.');
    } catch (_) {
      error('Failed to export CSV.');
    }
  };

  // CSV Import
  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/products/import', formData);
      success(res.message || 'CSV imported successfully!');
      fetchProducts(pagination.page);
    } catch (err) {
      error(err.message || 'Failed to import CSV.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Stock Movement History
  const handleViewHistory = async (product) => {
    setHistoryProduct(product);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/products/${product.id}`);
      if (res.success) {
        setHistoryMovements(res.data.movements || []);
      }
    } catch (_) {
      error('Failed to load stock movements.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Delete product
  const handleDeleteConfirm = async () => {
    if (!deleteProduct) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/products/${deleteProduct.id}`);
      success(res.message || 'Product deleted successfully.');
      setDeleteProduct(null);
      fetchProducts(pagination.page);
    } catch (err) {
      error(err.message || 'Failed to delete product.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Uniform Inventory &amp; Stock Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Manage uniform items, sizes, colors, SKUs, pricing, stock levels, and audit movements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* CSV Import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCsv}
            accept=".csv"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>

          {/* CSV Export */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Add Product */}
          <button
            type="button"
            onClick={() => {
              setSelectedProductForEdit(null);
              setProductModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition transform active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Variant</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search box */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search by SKU, item name, or school..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>

          {/* Category Filter */}
          <div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium text-slate-700"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* School Filter */}
          <div>
            <select
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium text-slate-700"
            >
              <option value="">All Schools</option>
              {schools.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Size Filter */}
          <div>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium text-slate-700"
            >
              <option value="">All Sizes</option>
              {sizes.map(sz => <option key={sz} value={sz}>{sz}</option>)}
            </select>
          </div>

          {/* Low Stock Toggle Button */}
          <div>
            <button
              type="button"
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`w-full py-2 px-3 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                lowStockOnly
                  ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${lowStockOnly ? 'text-rose-600' : 'text-slate-400'}`} />
              <span>{lowStockOnly ? 'Showing Low Stock' : 'Filter Low Stock'}</span>
            </button>
          </div>
        </div>

        {/* Filter Reset */}
        {(search || category || school || size || lowStockOnly) && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
            <span>Filtering inventory results</span>
            <button
              onClick={() => {
                setSearch('');
                setCategory('');
                setSchool('');
                setSize('');
                setLowStockOnly(false);
              }}
              className="text-amber-700 font-bold hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Inventory Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/70">
                <th className="py-3.5 pl-6">Item Name &amp; School</th>
                <th className="py-3.5">SKU</th>
                <th className="py-3.5">Category</th>
                <th className="py-3.5 text-center">Size</th>
                <th className="py-3.5">Color</th>
                <th className="py-3.5 text-right">Cost (₹)</th>
                <th className="py-3.5 text-right">Price (₹)</th>
                <th className="py-3.5 text-center">Stock</th>
                <th className="py-3.5 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading inventory...</span>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <p className="text-sm font-bold text-slate-700">No products found</p>
                    <p className="text-xs text-slate-400 mt-1">Your inventory is currently empty. Click &quot;+ Add Variant&quot; above to add your first uniform product!</p>
                  </td>
                </tr>
              ) : (
                products.map(p => {
                  const isLow = p.current_stock <= p.low_stock_threshold;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/70 transition ${isLow ? 'bg-rose-50/40' : ''}`}
                    >
                      {/* Name & School */}
                      <td className="py-3.5 pl-6">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{p.name}</span>
                          {isLow && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                              Low Stock
                            </span>
                          )}
                        </div>
                        {p.school && (
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            {p.school}
                          </span>
                        )}
                      </td>

                      {/* SKU */}
                      <td className="py-3.5 font-mono font-bold text-slate-700">
                        {p.sku}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 text-slate-600">
                        {p.category}
                      </td>

                      {/* Size */}
                      <td className="py-3.5 text-center font-bold text-slate-800">
                        {p.size}
                      </td>

                      {/* Color */}
                      <td className="py-3.5 text-slate-600">
                        {p.color}
                      </td>

                      {/* Cost */}
                      <td className="py-3.5 text-right text-slate-500">
                        {formatINR(p.purchase_price)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 text-right font-bold text-slate-900">
                        {formatINR(p.selling_price)}
                      </td>

                      {/* Current Stock */}
                      <td className="py-3.5 text-center">
                        <span
                          className={`font-black text-sm px-2.5 py-1 rounded-xl ${
                            isLow
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {p.current_stock}
                        </span>
                        <span className="block text-[9px] text-slate-400 mt-1">
                          Min: {p.low_stock_threshold}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pr-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Adjust Stock Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductForStock(p);
                              setStockModalOpen(true);
                            }}
                            title="Adjust Stock (+ / -)"
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition shadow-sm"
                          >
                            Adjust Stock
                          </button>

                          {/* Movement History */}
                          <button
                            type="button"
                            onClick={() => handleViewHistory(p)}
                            title="View Stock Movement Audit History"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductForEdit(p);
                              setProductModalOpen(true);
                            }}
                            title="Edit Details"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteProduct(p)}
                            title="Delete Variant"
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

        {/* Pagination */}
        <Pagination
          pagination={pagination}
          onPageChange={(p) => fetchProducts(p)}
        />
      </div>

      {/* Product Create/Edit Modal */}
      <ProductModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        product={selectedProductForEdit}
        onSaved={() => fetchProducts(pagination.page)}
        existingCategories={categories}
        existingSchools={schools}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustModal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        product={selectedProductForStock}
        onAdjusted={() => fetchProducts(pagination.page)}
      />

      {/* Stock Movement History Modal */}
      <Modal
        isOpen={!!historyProduct}
        onClose={() => setHistoryProduct(null)}
        title={`Stock Movements: ${historyProduct?.name} (${historyProduct?.sku})`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-600 pb-2 border-b border-slate-100">
            <span>Size: <strong>{historyProduct?.size}</strong> | Color: <strong>{historyProduct?.color}</strong></span>
            <span>Current Stock: <strong className="text-sm font-bold text-slate-900">{historyProduct?.current_stock}</strong></span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2">
            {historyLoading ? (
              <p className="text-xs text-center py-6 text-slate-400">Loading audit history...</p>
            ) : historyMovements.length === 0 ? (
              <p className="text-xs text-center py-6 text-slate-400">No stock movements recorded yet.</p>
            ) : (
              historyMovements.map(m => (
                <div key={m.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                        m.type === 'purchase'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.type === 'sale'
                          ? 'bg-blue-100 text-blue-800'
                          : m.type === 'return'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {m.type}
                      </span>
                      <span className="font-bold text-slate-800">
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity} units
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {m.reason} {m.reference_id && `• Ref: ${m.reference_id}`}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-slate-700">
                      {m.previous_stock} &rarr; <span className="font-bold text-slate-900">{m.new_stock}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(m.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onConfirm={handleDeleteConfirm}
        isDanger={true}
        loading={deleting}
        title={`Delete Product ${deleteProduct?.sku}?`}
        message={`Are you sure you want to delete "${deleteProduct?.name}" (${deleteProduct?.sku})? Even if this item was included in previous invoices, it will be permanently removed from inventory while preserving all past sales records.`}
        confirmText="Yes, Delete Product"
      />
    </div>
  );
}

export default Inventory;
