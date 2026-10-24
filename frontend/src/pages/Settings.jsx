import React, { useState, useEffect } from 'react';
import {
  Save,
  Building,
  Receipt,
  MessageSquare,
  Mail,
  Shield,
  Loader2,
  CheckCircle2,
  Send,
  AlertCircle,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  QrCode
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function Settings() {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'invoice' | 'whatsapp' | 'email' | 'deploy' | 'security'
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
    whatsapp_reminder_template: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: ''
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Email Test state
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState(null);

  // Copy URL state
  const [copiedUrl, setCopiedUrl] = useState(false);
  const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const mobileWifiUrl = isLocalHost
    ? `http://192.168.0.102:${window.location.port || '5000'}`
    : (typeof window !== 'undefined' ? window.location.origin : 'http://192.168.0.102:5000');

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

  // Test Email
  const handleTestEmail = async (e) => {
    e.preventDefault();
    setTestingEmail(true);
    setEmailTestResult(null);
    try {
      const res = await api.post('/settings/test-email', { testRecipient: testEmailRecipient.trim() || undefined });
      setEmailTestResult(res);
      if (res.success) {
        success(res.message);
      } else {
        info(res.message);
      }
    } catch (err) {
      error(err.message || 'Error executing SMTP test.');
      setEmailTestResult({ success: false, message: err.message });
    } finally {
      setTestingEmail(false);
    }
  };

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
    { id: 'email', label: 'Email & SMTP', icon: Mail },
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
          Manage store branding, tax calculation rules, email delivery, mobile phone access, and security.
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

      {/* Tab 4: Email & SMTP Configuration */}
      {activeTab === 'email' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/70 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-neutral-900 pb-2 border-b border-neutral-100 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            <span>Email Delivery &amp; Gmail SMTP Credentials</span>
          </h3>

          {/* Form to enter Gmail / SMTP Credentials directly in UI */}
          <form onSubmit={handleSaveSettings} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900">Configure SMTP Credentials</span>
              <span className="text-[10px] text-neutral-500">Supports Gmail, Outlook, Zoho, or custom SMTP</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-neutral-600 mb-1">SMTP Host</label>
                <input
                  type="text"
                  name="smtp_host"
                  value={settings.smtp_host || 'smtp.gmail.com'}
                  onChange={handleSettingsChange}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg outline-none bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-600 mb-1">SMTP Port</label>
                <input
                  type="text"
                  name="smtp_port"
                  value={settings.smtp_port || '587'}
                  onChange={handleSettingsChange}
                  placeholder="587"
                  className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg outline-none bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-600 mb-1">Sender Email / Username</label>
                <input
                  type="email"
                  name="smtp_user"
                  value={settings.smtp_user || ''}
                  onChange={handleSettingsChange}
                  placeholder="yourstore@gmail.com"
                  className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg outline-none bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-600 mb-1">Google App Password (16 characters)</label>
                <input
                  type="password"
                  name="smtp_pass"
                  value={settings.smtp_pass || ''}
                  onChange={handleSettingsChange}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg outline-none bg-white font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-[11px] text-neutral-500">
              <span>Generate App Password: <em>Google Account &rarr; Security &rarr; 2-Step Verification &rarr; App Passwords</em>.</span>
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg font-bold text-xs hover:bg-neutral-800 transition"
              >
                Save Credentials
              </button>
            </div>
          </form>

          {/* Test SMTP Form */}
          <form onSubmit={handleTestEmail} className="space-y-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Send Test Email To:
              </label>
              <input
                type="email"
                placeholder="test-recipient@gmail.com"
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={testingEmail}
              className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-bold text-xs rounded-xl transition disabled:opacity-50"
            >
              {testingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Test Email Generation &amp; Send</span>
            </button>
          </form>

          {/* Result Banner */}
          {emailTestResult && (
            <div className={`p-3.5 rounded-xl border text-xs ${
              emailTestResult.success || emailTestResult.connected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <p className="font-bold">Result:</p>
              <p className="mt-0.5">{emailTestResult.message}</p>
            </div>
          )}
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
    </div>
  );
}

export default Settings;
