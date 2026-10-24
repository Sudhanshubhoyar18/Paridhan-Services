import React, { useState, useEffect } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react';
import Modal from '../Common/Modal';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

export function StockAdjustModal({ isOpen, onClose, product, onAdjusted }) {
  const [adjustmentType, setAdjustmentType] = useState('add'); // 'add' | 'reduce'
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (isOpen) {
      setAdjustmentType('add');
      setQuantity('');
      setReason('');
    }
  }, [isOpen, product]);

  if (!product) return null;

  const currentStock = Number(product.current_stock || 0);
  const qty = parseInt(quantity, 10) || 0;
  const newStock = adjustmentType === 'add' ? currentStock + qty : Math.max(0, currentStock - qty);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!qty || qty <= 0) {
      error('Please enter a valid positive quantity.');
      return;
    }

    if (adjustmentType === 'reduce' && qty > currentStock) {
      error(`Cannot reduce ${qty} items. Only ${currentStock} currently in stock.`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/products/${product.id}/adjust-stock`, {
        adjustmentType,
        quantity: qty,
        reason: reason.trim() || (adjustmentType === 'add' ? 'Stock addition' : 'Stock reduction')
      });
      success(res.message || 'Stock adjusted successfully!');
      if (onAdjusted) onAdjusted(res.data);
      onClose();
    } catch (err) {
      error(err.message || 'Failed to adjust stock.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust Stock Quantity" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Product Variant</p>
          <h4 className="text-sm font-bold text-slate-800 mt-0.5">{product.name}</h4>
          <p className="text-xs text-slate-600 mt-0.5">
            SKU: <span className="font-mono font-semibold">{product.sku}</span> | Size: <span className="font-semibold">{product.size}</span> | Color: {product.color}
          </p>
          <div className="mt-2 text-xs font-semibold text-slate-700">
            Current Stock: <span className="text-sm font-bold text-slate-900">{currentStock}</span> units
          </div>
        </div>

        {/* Adjustment Type Switcher */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAdjustmentType('add')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition ${
              adjustmentType === 'add'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
            <span>Add Stock (+)</span>
          </button>
          <button
            type="button"
            onClick={() => setAdjustmentType('reduce')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition ${
              adjustmentType === 'reduce'
                ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4 text-rose-600" />
            <span>Reduce Stock (-)</span>
          </button>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Quantity to {adjustmentType === 'add' ? 'Add' : 'Deduct'} <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            max={adjustmentType === 'reduce' ? currentStock : 999999}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            placeholder="e.g. 10"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-semibold"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason for Adjustment
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={adjustmentType === 'add' ? 'e.g. New stock delivery from manufacturer' : 'e.g. Damaged piece / exchange'}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        {/* Live Calculation Preview */}
        {qty > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex justify-between items-center font-medium">
            <span>Resulting Stock:</span>
            <span className="text-sm font-bold text-slate-900">
              {currentStock} {adjustmentType === 'add' ? '+' : '-'} {qty} = <span className="text-amber-700 underline">{newStock} units</span>
            </span>
          </div>
        )}

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
            type="submit"
            disabled={loading || !qty}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-sm disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Save Stock Adjustment</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default StockAdjustModal;
