import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  Calculator,
  CheckCircle2,
  Printer,
  Download,
  MessageSquare,
  RefreshCw,
  Barcode,
  ShoppingBag,
  ArrowRight,
  Layers
} from 'lucide-react';
import api from '../api/client';
import { formatINR } from '../utils/formatters';
import { CustomerModal } from '../components/Modals/CustomerModal';
import { WhatsAppModal } from '../components/Modals/WhatsAppModal';
import { useToast } from '../context/ToastContext';

export function BillingPOS() {
  const navigate = useNavigate();

  // Product Search & Catalog state
  const [productQuery, setProductQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Quick Catalog Chips
  const [catalogItems, setCatalogItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const categories = ['All', 'Topwear', 'Bottomwear', 'Winterwear', 'Accessories', 'Footwear'];
  const [activeSchool, setActiveSchool] = useState('All');
  const schools = ['All', 'DPS', 'St. Xavier', 'Army Public', 'General'];

  // Customer state
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [quickCustomerModal, setQuickCustomerModal] = useState(false);

  // Cart Items
  const [cartItems, setCartItems] = useState([]);

  // Bill Totals & Discounts
  const [discountType, setDiscountType] = useState('flat'); // 'flat' | 'percent'
  const [discountVal, setDiscountVal] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Paid'); // 'Paid' | 'Partial' | 'Unpaid'
  const [paymentMode, setPaymentMode] = useState('Cash'); // 'Cash' | 'UPI' | 'Card' | 'Bank'
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  // Mobile Checkout Drawer Sheet toggle
  const [mobileCheckoutOpen, setMobileCheckoutOpen] = useState(false);

  // Post-sale Success Modal
  const [createdBill, setCreatedBill] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);

  const { success, error, warning } = useToast();
  const searchInputRef = useRef(null);

  // Fetch initial products for the 1-click catalog grid
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await api.get('/products', { limit: 50 });
        if (res.success) {
          setCatalogItems(res.data);
        }
      } catch (_) {}
    };
    loadCatalog();
  }, []);

  // Search Products when query changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (productQuery.trim()) {
        setSearchLoading(true);
        try {
          const res = await api.get('/products/pos-search', { query: productQuery.trim() });
          if (res.success) {
            setSearchResults(res.data);
            setIsSearchOpen(true);
          }
        } catch (_) {}
        finally {
          setSearchLoading(false);
        }
      } else {
        setSearchResults([]);
        setIsSearchOpen(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [productQuery]);

  // Search Customers
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (customerQuery.trim()) {
        try {
          const res = await api.get('/customers/pos-search', { query: customerQuery.trim() });
          if (res.success) {
            setCustomerResults(res.data);
            setIsCustomerSearchOpen(true);
          }
        } catch (_) {}
      } else {
        setCustomerResults([]);
        setIsCustomerSearchOpen(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [customerQuery]);

  // Keyboard shortcut listener (F2)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add Item to Cart
  const handleAddToCart = (product) => {
    if (product.current_stock <= 0) {
      error(`Cannot add "${product.name}". Out of stock!`);
      return;
    }

    setCartItems(prev => {
      const existingIdx = prev.findIndex(item => item.product_id === product.id);
      if (existingIdx > -1) {
        const item = prev[existingIdx];
        if (item.quantity + 1 > product.current_stock) {
          warning(`Only ${product.current_stock} units available in stock.`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIdx] = {
          ...item,
          quantity: item.quantity + 1
        };
        return updated;
      }

      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          category: product.category,
          school: product.school,
          size: product.size,
          color: product.color,
          sku: product.sku,
          quantity: 1,
          unit_price: product.selling_price,
          discount: 0,
          gst_rate: product.gst_rate || 5,
          max_stock: product.current_stock
        }
      ];
    });

    setProductQuery('');
    setIsSearchOpen(false);
  };

  // Adjust Quantity (+ or -)
  const handleStepQuantity = (index, delta) => {
    setCartItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };
      const newQty = item.quantity + delta;

      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }

      if (newQty > item.max_stock) {
        warning(`Only ${item.max_stock} units available.`);
        return prev;
      }

      item.quantity = newQty;
      updated[index] = item;
      return updated;
    });
  };

  // Update Cart Item value
  const handleUpdateItem = (index, field, value) => {
    setCartItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === 'quantity') {
        const qty = parseInt(value, 10) || 1;
        item.quantity = Math.min(item.max_stock, Math.max(1, qty));
      } else if (field === 'unit_price') {
        item.unit_price = Math.max(0, parseFloat(value) || 0);
      } else if (field === 'discount') {
        item.discount = Math.max(0, parseFloat(value) || 0);
      } else if (field === 'gst_rate') {
        item.gst_rate = Math.max(0, parseFloat(value) || 0);
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveItem = (index) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerQuery(customer.name);
    setIsCustomerSearchOpen(false);
  };

  // Calculations
  let subtotal = 0;
  let totalGst = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;

  cartItems.forEach(item => {
    const lineSubtotal = Math.max(0, (item.unit_price * item.quantity) - item.discount);
    const lineGst = (lineSubtotal * item.gst_rate) / 100;
    subtotal += (item.unit_price * item.quantity) - item.discount;
    totalGst += lineGst;
    cgstTotal += lineGst / 2;
    sgstTotal += lineGst / 2;
  });

  const discValNum = parseFloat(discountVal) || 0;
  let overallDiscountAmount = 0;
  if (discountType === 'percent') {
    overallDiscountAmount = (subtotal * discValNum) / 100;
  } else {
    overallDiscountAmount = discValNum;
  }
  overallDiscountAmount = Math.min(overallDiscountAmount, subtotal);

  const taxableAmount = Math.max(0, subtotal - overallDiscountAmount);
  let effectiveCgst = cgstTotal;
  let effectiveSgst = sgstTotal;
  let effectiveTotalTax = totalGst;

  if (subtotal > 0 && overallDiscountAmount > 0) {
    const ratio = taxableAmount / subtotal;
    effectiveCgst = cgstTotal * ratio;
    effectiveSgst = sgstTotal * ratio;
    effectiveTotalTax = effectiveCgst + effectiveSgst;
  }

  const exactGrandTotal = taxableAmount + effectiveTotalTax;
  const roundedGrandTotal = Math.round(exactGrandTotal);
  const roundOff = Number((roundedGrandTotal - exactGrandTotal).toFixed(2));

  let calculatedPaid = 0;
  if (paymentStatus === 'Paid') {
    calculatedPaid = roundedGrandTotal;
  } else if (paymentStatus === 'Unpaid') {
    calculatedPaid = 0;
  } else {
    calculatedPaid = parseFloat(paidAmount) || 0;
  }
  const balanceDue = Math.max(0, roundedGrandTotal - calculatedPaid);

  // Submit Bill
  const handleSubmitBill = async () => {
    if (cartItems.length === 0) {
      error('Please add at least one uniform item to the cart.');
      return;
    }

    const customerName = selectedCustomer?.name || customerQuery.trim() || 'Walk-in Customer';
    const customerPhone = selectedCustomer?.phone || '+91 99999 99999';

    setSubmitting(true);
    try {
      const payload = {
        customer_id: selectedCustomer?.id || undefined,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: selectedCustomer?.email || undefined,
        customer_address: selectedCustomer?.address || undefined,
        customer_school_class: selectedCustomer?.school_class || undefined,
        items: cartItems,
        discount_type: discountType,
        discount_val: discValNum,
        paid_amount: calculatedPaid,
        payment_mode: paymentMode,
        payment_reference: paymentReference || undefined,
        notes: notes || undefined
      };

      const res = await api.post('/bills', payload);
      if (res.success) {
        success(`Invoice ${res.data.invoice_no} generated!`);
        setCreatedBill(res.data);
        setMobileCheckoutOpen(false);
      }
    } catch (err) {
      error(err.message || 'Failed to generate invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForNewSale = () => {
    setCreatedBill(null);
    setCartItems([]);
    setSelectedCustomer(null);
    setCustomerQuery('');
    setDiscountVal('');
    setPaidAmount('');
    setNotes('');
    setPaymentReference('');
    setPaymentStatus('Paid');
    searchInputRef.current?.focus();
  };

  const handleDownloadPdf = async () => {
    if (!createdBill) return;
    try {
      const blob = await api.get(`/bills/${createdBill.id}/pdf`);
      api.downloadBlob(blob, `Invoice-${createdBill.invoice_no}.pdf`);
    } catch (_) {
      error('Failed to download invoice PDF.');
    }
  };

  const handlePrint = () => {
    if (!createdBill) return;
    window.open(api.getUrl(`/api/bills/${createdBill.id}/pdf`), '_blank');
  };

  // Filter catalog items for display (by category and school)
  const filteredCatalog = catalogItems.filter(p => {
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    const matchesSchool =
      activeSchool === 'All' ||
      (p.school && p.school.toLowerCase().includes(activeSchool.toLowerCase().replace("'", '')));
    return matchesCategory && matchesSchool;
  }).slice(0, 12);

  const totalItemCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Bar: Title & Clear */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
            Fast Billing Counter
          </h2>
          <p className="text-xs text-neutral-500">
            Tap items, scan barcode, or search customer.
          </p>
        </div>

        <button
          onClick={handleResetForNewSale}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-600 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Clear Cart</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 8 Cols: Customer, Search & Catalog Grid & Cart */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3.5">
          {/* Customer Selection Row */}
          <div className="bg-white p-3.5 rounded-2xl border border-neutral-200/70 shadow-sm flex flex-col sm:flex-row items-center gap-2.5 relative">
            <div className="flex-1 w-full relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Select customer or enter mobile number..."
                  value={customerQuery}
                  onChange={(e) => {
                    setCustomerQuery(e.target.value);
                    if (selectedCustomer) setSelectedCustomer(null);
                  }}
                  onFocus={() => setIsCustomerSearchOpen(true)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                />
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              </div>

              {/* Autocomplete Dropdown */}
              {isCustomerSearchOpen && customerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-xl z-30 max-h-52 overflow-y-auto">
                  {customerResults.map(cust => (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className="p-2.5 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0 flex justify-between items-center text-xs"
                    >
                      <div>
                        <p className="font-bold text-neutral-800">{cust.name}</p>
                        <p className="text-[11px] text-neutral-500 font-mono">{cust.phone} {cust.school_class && `• ${cust.school_class}`}</p>
                      </div>
                      <span className="text-amber-600 font-semibold text-[11px]">Select &rarr;</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Walk-in shortcut button */}
            <button
              type="button"
              onClick={() => {
                setSelectedCustomer({ name: 'Walk-in Customer', phone: '+91 99999 99999' });
                setCustomerQuery('Walk-in Customer');
                setIsCustomerSearchOpen(false);
              }}
              className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold transition whitespace-nowrap"
              title="Set as Walk-in Customer"
            >
              Walk-in
            </button>

            {/* Selected customer pill with clear */}
            {selectedCustomer && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-xl text-xs flex-shrink-0">
                <span className="font-bold text-neutral-900 truncate max-w-[120px]">{selectedCustomer.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerQuery('');
                  }}
                  className="w-4 h-4 rounded-full bg-neutral-200 text-neutral-600 hover:bg-neutral-300 flex items-center justify-center text-xs font-bold leading-none"
                  title="Remove customer"
                >
                  &times;
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setQuickCustomerModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-400 rounded-xl text-xs font-semibold transition whitespace-nowrap shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Customer</span>
            </button>
          </div>

          {/* Product Search & Barcode Scan Input */}
          <div className="bg-white p-3.5 rounded-2xl border border-neutral-200/70 shadow-sm relative">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Scan barcode or search uniform name / SKU (F2)..."
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm border border-neutral-200 focus:border-neutral-900 rounded-xl outline-none font-medium transition"
              />
              <Barcode className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              {searchLoading && (
                <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin absolute right-3 top-3" />
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-neutral-200 rounded-2xl shadow-xl z-40 max-h-72 overflow-y-auto">
                {searchResults.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    className="p-3 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0 flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <span className="font-bold text-neutral-900">{p.name}</span>
                      <p className="text-[11px] text-neutral-500 font-mono">
                        SKU: {p.sku} | Size: {p.size} {p.school && `| ${p.school}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-neutral-900">{formatINR(p.selling_price)}</p>
                      <p className={`text-[10px] font-semibold ${p.current_stock <= p.low_stock_threshold ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {p.current_stock} in stock
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick 1-Tap Uniform Catalog Grid */}
          <div className="bg-white p-3.5 rounded-2xl border border-neutral-200/70 shadow-sm space-y-2.5">
            {/* School Filter Chips */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 flex-shrink-0">
                School:
              </span>
              <div className="flex gap-1 overflow-x-auto py-0.5">
                {schools.map(sch => (
                  <button
                    key={sch}
                    type="button"
                    onClick={() => setActiveSchool(sch)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition ${
                      activeSchool === sch ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {sch}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center justify-between gap-2 border-t border-neutral-100 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex-shrink-0">
                Item Type:
              </span>
              <div className="flex gap-1 overflow-x-auto py-0.5">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition ${
                      activeCategory === cat ? 'bg-neutral-900 text-white shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {filteredCatalog.length === 0 ? (
              <div className="py-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                <ShoppingBag className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-neutral-700">Catalog is currently empty</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Add uniform items and sizes in Inventory to start billing!</p>
                <button
                  type="button"
                  onClick={() => navigate('/inventory')}
                  className="mt-3 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-sm transition"
                >
                  + Add Products in Inventory
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {filteredCatalog.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    className="p-2.5 rounded-xl border border-neutral-100 bg-neutral-50/50 hover:bg-neutral-100/70 hover:border-neutral-200 cursor-pointer transition flex flex-col justify-between active:scale-[0.98]"
                  >
                    <div>
                      <p className="text-xs font-bold text-neutral-900 line-clamp-1">{p.name}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5 font-mono truncate">
                        {p.school ? `${p.school.split(' ')[0]} • ` : ''}Size {p.size}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900">{formatINR(p.selling_price)}</span>
                      <span className="w-5 h-5 rounded-md bg-neutral-900 text-amber-400 flex items-center justify-center text-xs font-bold shadow-sm">
                        +
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Table with Touch Steppers */}
          <div className="bg-white rounded-2xl border border-neutral-200/70 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                <span>Selected Items ({cartItems.length})</span>
              </div>
              <span className="text-neutral-500 font-medium">
                Items Total: <strong>{formatINR(subtotal)}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-400 font-bold uppercase tracking-wider bg-neutral-50/50">
                    <th className="py-2.5 pl-4">Item</th>
                    <th className="py-2.5 text-center">Qty</th>
                    <th className="py-2.5 text-right">Price</th>
                    <th className="py-2.5 text-right">Total</th>
                    <th className="py-2.5 pr-4 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {cartItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-neutral-400">
                        <ShoppingBag className="w-6 h-6 text-neutral-300 mx-auto mb-1" />
                        <p className="font-semibold text-xs text-neutral-600">Cart is empty</p>
                        <p className="text-[11px] text-neutral-400">Tap quick items above or scan barcode to add</p>
                      </td>
                    </tr>
                  ) : (
                    cartItems.map((item, idx) => {
                      const lineSub = Math.max(0, (item.unit_price * item.quantity) - item.discount);
                      const lineTotal = lineSub + (lineSub * item.gst_rate) / 100;

                      return (
                        <tr key={idx} className="hover:bg-neutral-50/50">
                          <td className="py-2.5 pl-4 max-w-[170px]">
                            <p className="font-bold text-neutral-900 truncate">{item.product_name}</p>
                            <p className="text-[10px] text-neutral-400 font-mono">
                              Size: {item.size} • {item.sku}
                            </p>
                          </td>

                          {/* Easy Touch Stepper: [-] QTY [+] */}
                          <td className="py-2.5 text-center whitespace-nowrap">
                            <div className="inline-flex items-center border border-neutral-200 rounded-lg overflow-hidden bg-white">
                              <button
                                type="button"
                                onClick={() => handleStepQuantity(idx, -1)}
                                className="px-2 py-1 text-neutral-600 hover:bg-neutral-100 font-bold"
                              >
                                -
                              </button>
                              <span className="px-2 text-xs font-bold text-neutral-900 min-w-[20px] text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStepQuantity(idx, 1)}
                                className="px-2 py-1 text-neutral-600 hover:bg-neutral-100 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          <td className="py-2.5 text-right font-medium text-neutral-600">
                            {formatINR(item.unit_price)}
                          </td>

                          <td className="py-2.5 text-right font-bold text-neutral-900">
                            {formatINR(lineTotal)}
                          </td>

                          <td className="py-2.5 pr-4 text-center">
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-neutral-400 hover:text-rose-600 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Live Totals & Checkout Panel (Desktop & Tablet) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3.5">
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-amber-600" /> Payment Summary
              </span>
              <span className="text-[11px] font-semibold text-neutral-400 font-mono">INR (₹)</span>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal ({totalItemCount} items):</span>
                <span className="font-semibold text-neutral-900">{formatINR(subtotal)}</span>
              </div>

              {/* Special Bill Discount */}
              <div className="pt-1 pb-1">
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <span>Discount:</span>
                  <div className="flex rounded-md border border-neutral-200 text-[10px] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setDiscountType('flat')}
                      className={`px-1.5 py-0.5 ${discountType === 'flat' ? 'bg-neutral-900 text-white font-bold' : 'bg-neutral-100 text-neutral-600'}`}
                    >
                      ₹ Flat
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      className={`px-1.5 py-0.5 ${discountType === 'percent' ? 'bg-neutral-900 text-white font-bold' : 'bg-neutral-100 text-neutral-600'}`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountVal}
                    onChange={(e) => setDiscountVal(e.target.value)}
                    className="w-full px-2 py-1 border border-neutral-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                  <span className="text-rose-600 font-semibold whitespace-nowrap text-xs">
                    - {formatINR(overallDiscountAmount)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-1 border-t border-neutral-100">
                <span>Taxable Value:</span>
                <span>{formatINR(taxableAmount)}</span>
              </div>

              <div className="flex justify-between text-neutral-500 text-[11px]">
                <span>CGST + SGST:</span>
                <span>{formatINR(effectiveTotalTax)}</span>
              </div>

              <div className="flex justify-between text-neutral-400 text-[11px]">
                <span>Round-off:</span>
                <span>{roundOff >= 0 ? `+${roundOff}` : roundOff}</span>
              </div>
            </div>

            {/* Total Highlight */}
            <div className="p-3.5 rounded-xl bg-neutral-900 text-white flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Total Due</span>
                <h3 className="text-xl font-extrabold text-amber-400">{formatINR(roundedGrandTotal)}</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                {totalItemCount} Units
              </span>
            </div>

            {/* Payment Status & Mode Selection */}
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-3 gap-1.5">
                {['Paid', 'Partial', 'Unpaid'].map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setPaymentStatus(status);
                      if (status === 'Paid') setPaidAmount(String(roundedGrandTotal));
                      if (status === 'Unpaid') setPaidAmount('0');
                    }}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                      paymentStatus === status
                        ? status === 'Paid'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : status === 'Partial'
                          ? 'bg-amber-500 text-neutral-950 border-amber-500'
                          : 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-xl outline-none focus:ring-1 focus:ring-neutral-900 bg-white font-medium"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI (GPay / PhonePe / QR)</option>
                  <option value="Card">Card</option>
                  <option value="Bank">Bank Transfer</option>
                </select>
              </div>

              {paymentStatus === 'Partial' && (
                <div className="space-y-1.5">
                  <input
                    type="number"
                    placeholder="Amount paid now (₹)"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-xl outline-none focus:ring-1 focus:ring-neutral-900 font-bold"
                  />
                  {/* Quick cash presets */}
                  <div className="flex gap-1">
                    {[500, 1000, 2000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPaidAmount(String(amt))}
                        className="flex-1 py-1 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-[10px] font-bold text-neutral-700 transition"
                      >
                        ₹{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPaidAmount(String(roundedGrandTotal))}
                      className="flex-1 py-1 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-[10px] font-bold text-emerald-800 transition"
                    >
                      Exact
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmitBill}
              disabled={submitting || cartItems.length === 0}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Generate Invoice ({formatINR(roundedGrandTotal)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Mobile Checkout Bar (Only on phone screens) */}
      <div className="fixed bottom-14 left-0 right-0 z-30 sm:hidden p-3 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-xl flex items-center justify-between">
        <div>
          <span className="text-[10px] text-neutral-400 font-bold uppercase">{totalItemCount} Items in cart</span>
          <p className="text-base font-extrabold text-neutral-900">{formatINR(roundedGrandTotal)}</p>
        </div>
        <button
          onClick={handleSubmitBill}
          disabled={cartItems.length === 0 || submitting}
          className="px-5 py-2.5 bg-neutral-900 text-amber-400 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
        >
          <span>Complete Sale</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Post-Sale Modal */}
      {createdBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-100 p-6 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="mt-3 text-lg font-bold text-neutral-900">
              Invoice Generated!
            </h3>
            <p className="text-xs font-mono font-bold text-amber-600 mt-0.5">
              {createdBill.invoice_no}
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {createdBill.customer_name} • {formatINR(createdBill.grand_total)}
            </p>

            <div className="grid grid-cols-2 gap-2 mt-5">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center justify-center gap-1.5 p-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-semibold text-xs transition"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="flex items-center justify-center gap-1.5 p-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl font-semibold text-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setWhatsAppModalOpen(true)}
                className="flex items-center justify-center gap-1.5 p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-semibold text-xs transition"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={handleResetForNewSale}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition"
              >
                + New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CustomerModal
        isOpen={quickCustomerModal}
        onClose={() => setQuickCustomerModal(false)}
        onSaved={(cust) => {
          setSelectedCustomer(cust);
          setCustomerQuery(cust.name);
        }}
      />

      {createdBill && (
        <WhatsAppModal
          isOpen={whatsAppModalOpen}
          onClose={() => setWhatsAppModalOpen(false)}
          bill={createdBill}
        />
      )}
    </div>
  );
}

export default BillingPOS;
