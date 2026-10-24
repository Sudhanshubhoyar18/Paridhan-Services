import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  ArrowRight,
  LayoutDashboard,
  Receipt,
  FileText,
  Package,
  Settings
} from 'lucide-react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../../context/AuthContext';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const mobileNavItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Bills', path: '/bills', icon: FileText },
    { label: 'POS Billing', path: '/billing', icon: Receipt, primary: true },
    { label: 'Stock', path: '/inventory', icon: Package },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col sm:flex-row pb-16 sm:pb-0">
      {/* Sidebar for Desktop */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Default Password Notification Banner */}
        {user?.isDefaultPassword && (
          <div className="bg-amber-400 text-neutral-950 px-4 py-2 text-xs font-semibold flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Using default password (<code>admin123</code>). Please change it in Settings.
              </span>
            </div>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-neutral-900 text-white rounded-md text-[11px] font-bold hover:bg-neutral-800 transition"
            >
              Update Password &rarr;
            </Link>
          </div>
        )}

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Modern Mobile Bottom Navigation Bar (Phone Only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 px-2 py-1.5 flex items-center justify-around sm:hidden safe-bottom shadow-lg">
        {mobileNavItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          if (item.primary) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative -top-3 flex flex-col items-center justify-center w-12 h-12 rounded-full bg-neutral-900 text-amber-400 shadow-md transition active:scale-95"
              >
                <Icon className="w-5 h-5" />
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition ${
                isActive ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-neutral-900' : 'text-neutral-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default AppLayout;
