import React, { useState, useEffect } from 'react';
import {
  Save,
  Building,
  Receipt,
  MessageSquare,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Wrench,
  Database,
  RefreshCw,
  Download,
  Activity,
  HardDrive,
  Terminal,
  Trash2,
  Sparkles
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/Common/ConfirmDialog';

export function Settings() {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'invoice' | 'whatsapp' | 'support' | 'deploy' | 'security'
  const [settings, setSettings] = useState({
    business_name: '',
    business_address: '',
    business_phone: '',
    business_email: '',
    business_gstin: '',
    invoice_prefix: 'PU',
    default_gst_rate: '5',
    terms_and_conditions: '',
    whatsapp_invoice_template: '',
    whatsapp_reminder_template: ''
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // CRM & System Diagnostics state
  const [diagnostics, setDiagnostics] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [systemLogs, setSystemLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [cleaningData, setCleaningData] = useState(false);
  const [cleanConfirmOpen, setCleanConfirmOpen] = useState(false);

  // Copy URL state & Dynamic LAN IP
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [settingsLanIp, setSettingsLanIp] = useState('192.168.0.111');

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => {
        if (d && d.localIp && d.localIp !== 'localhost') {
          setSettingsLanIp(d.localIp);
        }
      })
      .catch(() => {});
  }, []);

  const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const currentSettingsPort = typeof window !== 'undefined' ? (window.location.port || '5000') : '5000';
  const mobileWifiUrl = isLocalHost
    ? `http://${settingsLanIp}:${currentSettingsPort}`
    : (typeof window !== 'undefined' ? window.location.origin : `http://${settingsLanIp}:5000`);

  // Security / Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const { user, refreshUser } = useAuth();
  const { success, error, info } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      if (res.success) {
        setSettings(prev => ({ ...prev, ...res.data }));
      }
    } catch (_) {
      error('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/settings', settings);
      if (res.success) {
        setSettings(prev => ({ ...prev, ...res.data }));
        success('Settings saved successfully!');
      }
    } catch (err) {
      error(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // CRM & Diagnostics Handlers
  const fetchDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const res = await api.get('/system/diagnostics');
      if (res.success) {
        setDiagnostics(res);
      }
    } catch (err) {
      error(err.message || 'Failed to fetch diagnostics.');
    } finally {
      setDiagLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await api.get('/system/logs?limit=50');
      if (res.success) {
        setSystemLogs(res.data || []);
      }
    } catch (err) {
      error(err.message || 'Failed to fetch logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      const res = await api.delete('/system/logs');
      if (res.success) {
        setSystemLogs([]);
        success('System logs cleared.');
      }
    } catch (err) {
      error(err.message || 'Failed to clear logs.');
    }
  };

  const handleRepairSystem = async () => {
    setRepairing(true);
    try {
      const res = await api.post('/system/repair');
      if (res.success) {
        success(res.message);
        fetchDiagnostics();
        fetchLogs();
      }
    } catch (err) {
      error(err.message || 'Repair operation failed.');
    } finally {
      setRepairing(false);
    }
  };

  const handleDownloadBackup = () => {
    window.open(api.getUrl('/api/system/backup'), '_blank');
    success('Database snapshot backup downloading...');
  };

  const handleCleanData = async () => {
    setCleaningData(true);
    try {
      const res = await api.post('/system/clean-data', { keepCatalog: true });
      if (res.success) {
        success(res.message);
        setCleanConfirmOpen(false);
        fetchDiagnostics();
        fetchLogs();
      }
    } catch (err) {
      error(err.message || 'Failed to clean data.');
    } finally {
      setCleaningData(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'support') {
      fetchDiagnostics();
      fetchLogs();
    }
  }, [activeTab]);

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      error('New password and confirm password do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      error('New password must be at least 6 characters long.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      if (res.success) {
        success('Password updated successfully!');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        await refreshUser();
      }
    } catch (err) {
      error(err.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCopyMobileUrl = () => {
    navigator.clipboard.writeText(mobileWifiUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    success('Mobile Wi-Fi URL copied!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Store Profile', icon: Building },
    { id: 'invoice', label: 'Invoice & GST', icon: Receipt },
    { id: 'whatsapp', label: 'WhatsApp Templates', icon: MessageSquare },
    { id: 'support', label: 'CRM & System Support', icon: Wrench },
    { id: 'deploy', label: 'Mobile & Deploy', icon: Smartphone },
    { id: 'security', label: 'Admin Security', icon: Shield },
  ];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/70 shadow-sm">
        <h2 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
          System Settings &amp; Configuration
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Manage store branding, tax rules, CRM service diagnostics, error logs, mobile phone access, and security.
        </p>
      </div>

      {/* Modern Tabs */}
      <div className="flex p-1 bg-neutral-200/70 rounded-xl overflow-x-auto gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Business Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveSettings} className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/70 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 pb-2 border-b border-neutral-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-amber-600" />
            <span>Store Profile &amp; Contact Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Store / Vendor Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="business_name"
                value={settings.business_name}
                onChange={handleSettingsChange}
                required
                className="w-full px-3 py-2 text-xs sm:text-sm border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none font-bold text-neutral-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                GSTIN (Tax Identification)
              </label>
              <input
                type="text"
                name="business_gstin"
                value={settings.business_gstin}
                onChange={handleSettingsChange}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                name="business_phone"
                value={settings.business_phone}
                onChange={handleSettingsChange}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="business_email"
                value={settings.business_email}
                onChange={handleSettingsChange}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Store Address
            </label>
            <textarea
              rows={2}
              name="business_address"
              value={settings.business_address}
              onChange={handleSettingsChange}
              className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-neutral-100">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold text-xs shadow-sm transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-amber-400" />}
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Invoice & GST */}
      {activeTab === 'invoice' && (
        <form onSubmit={handleSaveSettings} className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/70 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 pb-2 border-b border-neutral-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-600" />
            <span>Invoice Prefix &amp; Default Tax</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                name="invoice_prefix"
                value={settings.invoice_prefix}
                onChange={handleSettingsChange}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono font-bold border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none uppercase"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Format: <strong>{settings.invoice_prefix || 'PU'}-{new Date().getFullYear()}-0001</strong>
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Default GST Rate
              </label>
              <select
                name="default_gst_rate"
                value={settings.default_gst_rate}
                onChange={handleSettingsChange}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none bg-white font-medium"
              >
                <option value="0">0% (Exempt)</option>
                <option value="5">5% (Uniform Apparel &lt; ₹1000)</option>
                <option value="12">12% (Uniform Apparel &gt; ₹1000)</option>
                <option value="18">18% (Accessories / Other)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Terms &amp; Conditions (Printed on PDF Invoices)
            </label>
            <textarea
              rows={3}
              name="terms_and_conditions"
              value={settings.terms_and_conditions}
              onChange={handleSettingsChange}
              className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none resize-none font-sans leading-relaxed"
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-neutral-100">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold text-xs shadow-sm transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-amber-400" />}
              <span>Save Invoice Rules</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: WhatsApp Templates */}
      {activeTab === 'whatsapp' && (
        <form onSubmit={handleSaveSettings} className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/70 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 pb-2 border-b border-neutral-100 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp (wa.me) Click-to-Chat Templates</span>
          </h3>

          <div className="p-2.5 bg-neutral-100 rounded-xl text-[11px] text-neutral-600 font-mono">
            Placeholders: {'{customer}'}, {'{invoice_no}'}, {'{date}'}, {'{total}'}, {'{paid}'}, {'{balance}'}, {'{items}'}, {'{pdf_link}'}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Invoice Notification Template
            </label>
            <textarea
              rows={7}
              name="whatsapp_invoice_template"
              value={settings.whatsapp_invoice_template}
              onChange={handleSettingsChange}
              className="w-full p-2.5 text-xs font-mono border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Payment Due Reminder Template
            </label>
            <textarea
              rows={6}
              name="whatsapp_reminder_template"
              value={settings.whatsapp_reminder_template}
              onChange={handleSettingsChange}
              className="w-full p-2.5 text-xs font-mono border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-neutral-100">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-sm transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save WhatsApp Templates</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: CRM Service & System Support Diagnostics */}
      {activeTab === 'support' && (
        <div className="space-y-5">
          {/* Status Header Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/70 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">CRM &amp; Service Provider Diagnostics</h3>
                  <p className="text-[11px] text-neutral-500">Live health monitoring, audit logs, auto-repair, and database snapshots.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  diagnostics?.healthy
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${diagnostics?.healthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {diagnostics?.healthy ? 'All Systems Healthy' : 'Action / Audit Recommended'}
                </span>

                <button
                  type="button"
                  onClick={() => { fetchDiagnostics(); fetchLogs(); }}
                  disabled={diagLoading}
                  className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
                  title="Refresh Diagnostics"
                >
                  <RefreshCw className={`w-4 h-4 ${diagLoading ? 'animate-spin text-amber-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Diagnostic Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Database Size</span>
                <span className="text-base font-extrabold text-neutral-900 font-mono">
                  {diagnostics?.data?.database?.sizeFormatted || 'Loading...'}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">Mode: {diagnostics?.data?.database?.journalMode || 'WAL'}</span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">SQLite Integrity</span>
                <span className={`text-base font-extrabold font-mono ${
                  diagnostics?.data?.database?.integrityStatus === 'ok' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {diagnostics?.data?.database?.integrityStatus === 'ok' ? 'PASS (100%)' : 'CHECK NEEDED'}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">FK Violations: {diagnostics?.data?.database?.fkViolationsCount || 0}</span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Active Records</span>
                <span className="text-base font-extrabold text-neutral-900 font-mono">
                  {diagnostics?.data?.counts?.billsActive ?? 0} <span className="text-xs font-normal text-neutral-400">Bills</span>
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">Customers: {diagnostics?.data?.counts?.customersCount ?? 0}</span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Catalog &amp; Audit</span>
                <span className="text-base font-extrabold text-neutral-900 font-mono">
                  {diagnostics?.data?.counts?.productsCount ?? 0} <span className="text-xs font-normal text-neutral-400">Items</span>
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">Stock Movements: {diagnostics?.data?.counts?.movementsCount ?? 0}</span>
              </div>
            </div>
          </div>

          {/* CRM & Service Provider Maintenance Actions */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/70 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Service Management &amp; Support Tools
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Backup */}
              <div className="p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 transition flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 font-bold text-xs text-neutral-900">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span>Download DB Snapshot</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                    Download an instantaneous raw <code>.sqlite</code> backup file before making any changes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download Backup</span>
                </button>
              </div>

              {/* Repair & Optimize */}
              <div className="p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 transition flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 font-bold text-xs text-neutral-900">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Auto-Repair &amp; Optimize</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                    Executes SQLite VACUUM, REINDEX, and resolves negative stock anomalies automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRepairSystem}
                  disabled={repairing}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {repairing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Repair &amp; Optimize</span>
                </button>
              </div>

              {/* Clean Slate / Onboarding */}
              <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 font-bold text-xs text-rose-900">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Clean Transaction Data</span>
                  </div>
                  <p className="text-[11px] text-rose-700/80 mt-1 leading-relaxed">
                    Wipes all test bills, payments, and customers clean. Uniform catalog and baseline stock remain ready for fresh sales.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCleanConfirmOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Start Fresh Clean Slate</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live System & Error Logs Viewer */}
          <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 shadow-xl space-y-3 text-neutral-200">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase">
                  CRM System &amp; Error Logs
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">({systemLogs.length} events)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchLogs}
                  disabled={logsLoading}
                  className="px-2.5 py-1 text-[11px] font-mono text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition"
                >
                  {logsLoading ? 'Reading...' : 'Refresh'}
                </button>
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="px-2.5 py-1 text-[11px] font-mono text-rose-400 hover:text-rose-300 bg-neutral-900 hover:bg-neutral-800 rounded-lg transition"
                >
                  Clear Logs
                </button>
              </div>
            </div>

            <div className="font-mono text-[11px] max-h-64 overflow-y-auto space-y-1.5 pr-2">
              {systemLogs.length === 0 ? (
                <p className="text-neutral-500 italic py-4 text-center">No errors or system warnings recorded. Everything running smoothly!</p>
              ) : (
                systemLogs.map((log, idx) => (
                  <div key={idx} className="p-2 rounded bg-neutral-900/70 border border-neutral-800/80 hover:bg-neutral-900 transition">
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="text-neutral-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                        log.level === 'error' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                        log.level === 'warn' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'bg-blue-950 text-blue-400 border border-blue-800'
                      }`}>
                        {log.level}
                      </span>
                    </div>
                    <p className="text-neutral-200 mt-1 break-words font-medium">{log.message}</p>
                    {log.meta?.stack && (
                      <pre className="text-[9px] text-neutral-500 overflow-x-auto mt-1 p-1 bg-black/40 rounded">
                        {log.meta.stack}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Mobile Phone Access & Deployment */}
      {activeTab === 'deploy' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/70 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-neutral-900 pb-2 border-b border-neutral-100 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-amber-600" />
            <span>Mobile Phone Deployment &amp; Local Access</span>
          </h3>

          {/* Wi-Fi Direct Connection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
            <div className="space-y-3">
              <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                Live on Wi-Fi Network
              </span>
              <h4 className="text-base font-bold text-neutral-900">Instant Phone Access</h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Your computer is hosting the Paridhan Uniforms system on your local Wi-Fi. Any phone or tablet connected to this Wi-Fi can immediately open:
              </p>

              <div className="p-2.5 bg-white rounded-xl border border-neutral-200 flex items-center justify-between text-xs font-mono font-bold text-neutral-900">
                <span className="select-all truncate mr-2">{mobileWifiUrl}</span>
                <button
                  type="button"
                  onClick={handleCopyMobileUrl}
                  className="px-2.5 py-1 bg-neutral-900 text-white rounded-lg font-sans font-semibold text-xs hover:bg-neutral-800 transition flex items-center gap-1 flex-shrink-0"
                >
                  {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/70 text-[11px] text-neutral-700 space-y-1">
                <p className="font-bold text-neutral-900">Add to Phone Home Screen (PWA):</p>
                <p>• <strong>iPhone / iPad (Safari):</strong> Tap the <em>Share icon</em> (square with arrow) &rarr; tap <strong>"Add to Home Screen"</strong>.</p>
                <p>• <strong>Android (Chrome):</strong> Tap the <em>3 dots</em> &rarr; tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.</p>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="text-center p-4 bg-white rounded-2xl border border-neutral-200 shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(mobileWifiUrl)}`}
                alt="Scan to open on phone"
                className="w-40 h-40 rounded-xl mx-auto shadow-sm"
              />
              <p className="text-xs font-bold text-neutral-800 mt-2">Point phone camera at QR code</p>
              <p className="text-[10px] text-neutral-400">Instantly opens the app on your mobile device</p>
            </div>
          </div>

          {/* Cloud Internet Deployment Options */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Deploy to the Internet (Access from Anywhere)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-1.5">
                <p className="font-bold text-neutral-900">1. Single Server Mode</p>
                <p className="text-[11px] text-neutral-500">
                  Run <code>npm run build</code> in frontend. Express serves both backend and frontend from port 5000 with a single <code>npm start</code>!
                </p>
              </div>

              <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-1.5">
                <p className="font-bold text-neutral-900">2. Free Cloud (Render / Railway)</p>
                <p className="text-[11px] text-neutral-500">
                  Push this repo to GitHub. Connect to Render.com or Railway.app as a Node web service.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-1.5">
                <p className="font-bold text-neutral-900">3. Instant Tunnel (Cloudflare / Ngrok)</p>
                <p className="text-[11px] text-neutral-500">
                  Run <code>npx cloudflared tunnel --url http://localhost:5173</code> to get an instant HTTPS URL on your phone worldwide.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Admin Security */}
      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/70 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 pb-2 border-b border-neutral-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-600" />
            <span>Administrator Credentials</span>
          </h3>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Current Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              New Password (Min 6 characters) <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-neutral-100">
            <button
              type="submit"
              disabled={changingPassword}
              className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold text-xs shadow-sm transition disabled:opacity-50"
            >
              {changingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5 text-amber-400" />}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      )}

      {/* Safety Confirmation Dialog for Clean Data */}
      <ConfirmDialog
        isOpen={cleanConfirmOpen}
        onClose={() => setCleanConfirmOpen(false)}
        onConfirm={handleCleanData}
        title="Wipe Test Transactions & Customers?"
        message="This will delete all bills, customer profiles, and transaction records so you can start fresh. Your uniform catalog, pricing, and system settings will remain safe."
        confirmText="Yes, Clean Data"
        cancelText="Cancel"
        isDanger={true}
        loading={cleaningData}
      />
    </div>
  );
}

export default Settings;
