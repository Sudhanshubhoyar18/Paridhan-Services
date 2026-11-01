import React, { useState, useEffect } from 'react';
import { Menu, PlusCircle, LogOut, Smartphone, QrCode, X, Copy, Check, ExternalLink, Globe, Wifi } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../Common/Modal';

export function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { info, success } = useToast();
  const navigate = useNavigate();
  const [mobileModal, setMobileModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lanIp, setLanIp] = useState('192.168.0.111');
  const [connectionMode, setConnectionMode] = useState('wifi'); // 'wifi' | 'tunnel'
  const [tunnelUrl, setTunnelUrl] = useState('');

  // Fetch actual LAN IP dynamically from backend
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(d => {
        if (d && d.localIp && d.localIp !== 'localhost') {
          setLanIp(d.localIp);
        }
      })
      .catch(() => {});
  }, [mobileModal]);

  // Dynamic mobile URL (auto-detects local Wi-Fi IP and current port)
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const currentPort = typeof window !== 'undefined' ? (window.location.port || '5000') : '5000';
  
  const wifiUrl = isLocal
    ? `http://${lanIp}:${currentPort}`
    : (typeof window !== 'undefined' ? window.location.origin : `http://${lanIp}:5000`);

  const activeMobileUrl = connectionMode === 'tunnel' && tunnelUrl.trim()
    ? (tunnelUrl.trim().startsWith('http') ? tunnelUrl.trim() : `https://${tunnelUrl.trim()}`)
    : wifiUrl;

  const handleLogout = async () => {
    await logout();
    info('Logged out successfully');
    navigate('/login');
  };

  const handleCopyMobileUrl = () => {
    navigator.clipboard.writeText(activeMobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    success('Mobile URL copied to clipboard!');
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 bg-white/90 backdrop-blur-md border-b border-neutral-200/70">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-1.5 rounded-xl text-neutral-600 hover:bg-neutral-100 lg:hidden transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 text-amber-400 font-extrabold flex items-center justify-center text-xs shadow-sm">
              PU
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 tracking-tight leading-none">
                Paridhan Uniforms
              </h2>
              <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block mt-0.5">
                Minimal POS
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Deploy / Connect Phone Button */}
          <button
            type="button"
            onClick={() => setMobileModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition"
            title="Deploy / Connect to Phone"
          >
            <Smartphone className="w-3.5 h-3.5 text-neutral-700" />
            <span className="hidden sm:inline">Phone Access</span>
          </button>

          {/* Quick New Bill Button */}
          <Link
            to="/billing"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs shadow-sm transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>New Bill (F2)</span>
          </Link>

          <div className="h-5 w-px bg-neutral-200 mx-1 hidden sm:block" />

          {/* User profile & Logout */}
          <div className="flex items-center gap-2">
            <span className="hidden md:block text-xs font-semibold text-neutral-700">
              {user?.name || 'Admin'}
            </span>
            <button
              onClick={handleLogout}
              title="Log Out"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Connection Modal with QR Code */}
      <Modal isOpen={mobileModal} onClose={() => setMobileModal(false)} title="Open & Install on Phone" maxWidth="max-w-md">
        <div className="space-y-4 text-center">
          {/* Mode Switch Tabs */}
          <div className="flex p-1 bg-neutral-100 rounded-xl gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setConnectionMode('wifi')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition ${
                connectionMode === 'wifi' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Wifi className="w-3.5 h-3.5 text-amber-500" />
              <span>Same Wi-Fi</span>
            </button>
            <button
              type="button"
              onClick={() => setConnectionMode('tunnel')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition ${
                connectionMode === 'tunnel' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <span>Worldwide Tunnel (4G/5G)</span>
            </button>
          </div>

          {/* QR Code */}
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 inline-block mx-auto shadow-sm">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(activeMobileUrl)}`}
              alt="Scan to open on phone"
              className="w-44 h-44 rounded-xl mx-auto"
            />
          </div>

          <div>
            <p className="text-xs font-bold text-neutral-800">Scan with your phone's camera</p>
            {connectionMode === 'wifi' ? (
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Ensure phone is on the same Wi-Fi router as this PC.
              </p>
            ) : (
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Works on ANY mobile phone, 4G, 5G, or any Wi-Fi in the world!
              </p>
            )}
          </div>

          {/* Inputs depending on mode */}
          {connectionMode === 'wifi' ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] text-neutral-500 font-semibold whitespace-nowrap">Your PC IP:</span>
              <input
                type="text"
                value={lanIp}
                onChange={(e) => setLanIp(e.target.value)}
                placeholder="192.168.0.111"
                className="w-full px-2.5 py-1 text-xs font-mono font-bold bg-white border border-neutral-200 rounded-lg outline-none text-center"
              />
            </div>
          ) : (
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Paste Tunnel URL from <code>start-tunnel.bat</code>:
              </label>
              <input
                type="text"
                value={tunnelUrl}
                onChange={(e) => setTunnelUrl(e.target.value)}
                placeholder="https://xxxx-xxxx.trycloudflare.com"
                className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Direct Link Box */}
          <div className="p-2.5 bg-neutral-100 rounded-xl border border-neutral-200 flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-800 font-bold select-all truncate mr-2">{activeMobileUrl}</span>
            <button
              onClick={handleCopyMobileUrl}
              className="px-2.5 py-1 bg-white hover:bg-neutral-200 text-neutral-800 rounded-lg font-sans font-semibold text-xs border border-neutral-300 transition flex items-center gap-1 flex-shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* PWA Add to Home Screen Instructions */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-left text-[11px] text-neutral-700 space-y-1">
            <p className="font-bold text-neutral-900">Install as Phone App (PWA):</p>
            <p>• <strong>iPhone / Safari:</strong> Tap the <em>Share icon</em> &rarr; tap <strong>"Add to Home Screen"</strong>.</p>
            <p>• <strong>Android / Chrome:</strong> Tap the <em>three dots menu</em> &rarr; tap <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.</p>
            <p className="text-neutral-500 mt-1">The app will launch full-screen with a native launcher icon.</p>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default Navbar;
