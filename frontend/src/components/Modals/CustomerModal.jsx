import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../Common/Modal';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

export function CustomerModal({ isOpen, onClose, customer, onSaved }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    school_class: ''
  });
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const isEdit = !!customer?.id;

  useEffect(() => {
    if (customer && isOpen) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        school_class: customer.school_class || ''
      });
    } else if (isOpen) {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        school_class: ''
      });
    }
  }, [customer, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      error('Customer name and phone number are required.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const res = await api.put(`/customers/${customer.id}`, formData);
        success(res.message || 'Customer details updated successfully!');
        if (onSaved) onSaved(res.data);
      } else {
        const res = await api.post('/customers', formData);
        success(res.message || 'New customer registered successfully!');
        if (onSaved) onSaved(res.data);
      }
      onClose();
    } catch (err) {
      error(err.message || 'Failed to save customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? `Edit Customer: ${customer.name}` : 'Register New Customer'} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Customer Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g. Ramesh Kumar"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Phone Number <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            placeholder="e.g. 9876543210 or +91 98765 43210"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-mono"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Default country code is +91 (India).
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Email Address <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="ramesh@example.com"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            School &amp; Class / Section <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            name="school_class"
            value={formData.school_class}
            onChange={handleChange}
            placeholder="e.g. DPS Gurugram - Class 7A"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Billing Address <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            rows={2}
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Street address, colony, sector, city"
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none"
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
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition shadow-sm disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isEdit ? 'Save Changes' : 'Register Customer'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CustomerModal;
