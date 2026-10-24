import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import Modal from '../Common/Modal';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

export function ProductModal({ isOpen, onClose, product, onSaved, existingCategories = [], existingSchools = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Topwear',
    school: '',
    size: '32',
    color: 'White',
    sku: '',
    purchase_price: '',
    selling_price: '',
    gst_rate: '5',
    current_stock: '20',
    low_stock_threshold: '10'
  });
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const isEdit = !!product?.id;

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        name: product.name || '',
        category: product.category || 'Topwear',
        school: product.school || '',
        size: product.size || '',
        color: product.color || '',
        sku: product.sku || '',
        purchase_price: product.purchase_price ?? '',
        selling_price: product.selling_price ?? '',
        gst_rate: product.gst_rate ?? '5',
        current_stock: product.current_stock ?? '0',
        low_stock_threshold: product.low_stock_threshold ?? '10'
      });
    } else if (isOpen) {
      setFormData({
        name: '',
        category: 'Topwear',
        school: '',
        size: '32',
        color: 'White',
        sku: '',
        purchase_price: '',
        selling_price: '',
        gst_rate: '5',
        current_stock: '25',
        low_stock_threshold: '10'
      });
    }
  }, [product, isOpen]);

  // Auto-generate SKU recommendation if empty
  const handleAutoSku = () => {
    const schoolPrefix = formData.school ? formData.school.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() : 'GEN';
    const namePrefix = formData.name ? formData.name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() : 'ITM';
    const colorPrefix = formData.color ? formData.color.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() : 'CLR';
    const sizePart = formData.size ? formData.size.replace(/[^A-Za-z0-9]/g, '') : 'STD';
    const generated = `${schoolPrefix}-${namePrefix}-${colorPrefix}-${sizePart}`;
    setFormData(prev => ({ ...prev, sku: generated }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.size || !formData.color || !formData.sku) {
      error('Please fill in all required fields (Name, Category, Size, Color, SKU).');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const res = await api.put(`/products/${product.id}`, formData);
        success(res.message || 'Product updated successfully!');
        if (onSaved) onSaved(res.data);
      } else {
        const res = await api.post('/products', formData);
        success(res.message || 'New product variant added successfully!');
        if (onSaved) onSaved(res.data);
      }
      onClose();
    } catch (err) {
      error(err.message || 'Failed to save product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? `Edit Variant: ${product.name}` : 'Add New Uniform Product Variant'} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Product Name & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g. Oxford Half Sleeve Shirt"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="category"
              list="category-suggestions"
              value={formData.category}
              onChange={handleChange}
              required
              placeholder="e.g. Topwear, Bottomwear, Winterwear"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
            <datalist id="category-suggestions">
              <option value="Topwear" />
              <option value="Bottomwear" />
              <option value="Winterwear" />
              <option value="Accessories" />
              <option value="Footwear" />
              {existingCategories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        {/* Row 2: School / Institution */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            School / Institution <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            name="school"
            list="school-suggestions"
            value={formData.school}
            onChange={handleChange}
            placeholder="e.g. Delhi Public School, St. Xavier's, General / Generic"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
          />
          <datalist id="school-suggestions">
            <option value="Delhi Public School" />
            <option value="St. Xavier's High School" />
            <option value="Army Public School" />
            <option value="General / Generic" />
            {existingSchools.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>

        {/* Row 3: Size, Color, and SKU */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Size <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="size"
              value={formData.size}
              onChange={handleChange}
              required
              placeholder="e.g. 28, 30, 32, M, L"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Color <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="color"
              value={formData.color}
              onChange={handleChange}
              required
              placeholder="e.g. White, Navy Blue"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                SKU <span className="text-rose-500">*</span>
              </label>
              {!isEdit && (
                <button
                  type="button"
                  onClick={handleAutoSku}
                  className="text-[10px] font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-0.5"
                >
                  <Sparkles className="w-3 h-3" /> Auto
                </button>
              )}
            </div>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              required
              placeholder="e.g. DPS-SH-WHT-32"
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none uppercase"
            />
          </div>
        </div>

        {/* Row 4: Pricing & GST */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Purchase Cost (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="purchase_price"
              value={formData.purchase_price}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Selling Price (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="selling_price"
              value={formData.selling_price}
              onChange={handleChange}
              required
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-semibold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              GST % Rate
            </label>
            <select
              name="gst_rate"
              value={formData.gst_rate}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white"
            >
              <option value="0">0% (Exempt)</option>
              <option value="5">5% (Standard Apparel)</option>
              <option value="12">12% (Apparel &gt; ₹1000)</option>
              <option value="18">18% (Accessories / Other)</option>
            </select>
          </div>
        </div>

        {/* Row 5: Stock & Threshold */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isEdit ? 'Current Stock (Units)' : 'Initial Stock Quantity'}
            </label>
            <input
              type="number"
              min="0"
              name="current_stock"
              disabled={isEdit} // In edit mode, prompt to use Adjust Stock button to track history
              value={formData.current_stock}
              onChange={handleChange}
              placeholder="0"
              className={`w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none ${
                isEdit ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
              }`}
            />
            {isEdit && (
              <span className="text-[11px] text-slate-500 mt-1 block">
                Use "Adjust Stock" on inventory table to add/remove stock with reasons.
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Low-Stock Alert Threshold
            </label>
            <input
              type="number"
              min="1"
              name="low_stock_threshold"
              value={formData.low_stock_threshold}
              onChange={handleChange}
              placeholder="10"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition shadow-sm disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isEdit ? 'Save Changes' : 'Add Product Variant'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ProductModal;
