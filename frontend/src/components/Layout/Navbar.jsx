import React, { useState } from 'react';
import { Menu, PlusCircle, LogOut, Smartphone, QrCode, X, Copy, Check, ExternalLink } from 'lucide-react';
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

  // Dynamic mobile URL (auto-detects local Wi-Fi IP and current port)
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const mobileUrl = isLocal
    ? `http://192.168.0.102:${window.location.port || '5000'}`
    : (typeof window !== 'undefined' ? window.location.origin : 'http://192.168.0.102:5000');

  const handleLogout = async () => {
    await logout();
    info('Logged out successfully');
    navigate('/login');
  };

  const handleCopyMobileUrl = () => {
    navigator.clipboard.writeText(mobileUrl);
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
      <Modal isOpen={mobileModal} onClose={() => setMobileModal(false)} title="Open on Mobile Phone" maxWidth="max-w-md">
        <div className="text-center space-y-4">
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 inline-block mx-auto shadow-sm">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mobileUrl)}`}
              alt="Scan to open on phone"
              className="w-44 h-44 rounded-xl mx-auto"
            />
          </div>

          <div>
            <p className="text-xs font-bold text-neutral-800">Scan with your phone's camera</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Make sure your phone is connected to the same Wi-Fi network.
            </p>
          </div>

          {/* Direct Link Box */}
          <div className="p-2.5 bg-neutral-100 rounded-xl border border-neutral-200 flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-800 font-bold select-all truncate mr-2">{mobileUrl}</span>
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
