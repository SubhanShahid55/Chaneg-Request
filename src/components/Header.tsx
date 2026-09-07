'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/lib/store';

export function Header() {
  const pathname = usePathname();
  const { requests, globalSearchQuery, setGlobalSearchQuery } = useApp();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const navItems = [
    { label: 'Dashboard', href: '/', icon: 'dashboard' },
    { label: 'Requests', href: '/#table', icon: 'list_alt' },
    { label: 'Reports', href: '/reports', icon: 'bar_chart' },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#f8f9ff]/90 backdrop-blur-xl border-b border-[#d3e4fe]/60 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="h-16 w-full max-w-[75rem] mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img
                alt="ChangeFlow Logo"
                className="h-8 w-8 object-contain transition-transform group-hover:scale-105"
                src="/assets/logo.svg"
              />
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg tracking-tight text-[#0b1c30]">
                  ChangeFlow
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              {navItems.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href) && item.href !== '/#table';

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-[#4f46e5] text-white font-medium shadow-sm'
                        : 'text-[#464555] hover:bg-[#e5eeff] hover:text-[#0b1c30]'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Tools & Profile */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
            {/* Inline Global Search */}
            <div className="hidden md:flex items-center relative flex-1 max-w-md ml-4 mr-2">
              <span className="material-symbols-outlined absolute left-3 text-[#777587] text-[20px]">
                search
              </span>
              <input
                type="text"
                value={globalSearchQuery || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setGlobalSearchQuery(val);
                  if (pathname !== '/') {
                    window.location.href = '/';
                  }
                }}
                placeholder="Search requests by ID, client, or keyword..."
                className="w-full h-9 pl-10 pr-4 rounded-full border border-[#cbd5e1] text-sm text-[#0b1c30] bg-white focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition-all"
              />
              {globalSearchQuery && (
                <button
                  onClick={() => setGlobalSearchQuery('')}
                  className="absolute right-3 text-[#777587] hover:text-[#0b1c30] flex items-center"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Notifications"
                className="relative p-2 rounded-lg text-[#464555] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-xl">notifications</span>
                {pendingCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ba1a1a] ring-2 ring-[#f8f9ff]" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-[#e2e8f0] shadow-xl p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
                    <span className="font-semibold text-xs text-[#0b1c30] uppercase tracking-wider">
                      Recent Scope Alerts
                    </span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#e2dfff] text-[#3323cc] font-medium">
                      {pendingCount} Pending
                    </span>
                  </div>
                  <div className="py-2 flex flex-col gap-2 max-h-60 overflow-y-auto text-xs">
                    <div className="p-2 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0]/60">
                      <span className="font-medium text-[#0b1c30]">CR-1042 Acme Corp</span>
                      <p className="text-[#464555] text-[11px] mt-0.5">
                        Client viewing tokenized estimate for Enterprise Tiered Pricing ($3,600).
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0]/60">
                      <span className="font-medium text-[#0b1c30]">CR-1043 Veloce Health</span>
                      <p className="text-[#047857] text-[11px] mt-0.5 font-medium">
                        ✓ Scope Authorized by Dr. Elena Rostova ($4,800).
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Badge */}
            <button 
              onClick={() => useApp().setIsProfileModalOpen(true)}
              className="flex items-center gap-2 pl-2 border-l border-[#d3e4fe]/80 text-left hover:opacity-80 transition-opacity"
              title="Edit Profile"
            >
              <img
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover ring-1 ring-[#4f46e5]/30"
                src={useApp().currentUser?.avatarUrl || '/assets/04_headshot_pm.png'}
              />
              <div className="hidden lg:flex flex-col">
                <span className="text-xs font-semibold text-[#0b1c30] leading-none">
                  {useApp().currentUser?.name || 'Sarah Chen'}
                </span>
                <span className="text-[10px] text-[#464555] mt-1 leading-none">
                  {useApp().currentUser?.role || 'Lead PM / Partner'}
                </span>
              </div>
            </button>

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#464555] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
              aria-label="Toggle navigation menu"
            >
              <span className="material-symbols-outlined text-2xl">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 pt-16 bg-[#0b1c30]/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border-b border-[#e2e8f0] p-4 flex flex-col gap-2 shadow-2xl animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between px-2 pb-2 border-b border-[#f1f5f9]">
              <span className="text-xs font-bold text-[#777587] uppercase tracking-wider">
                ChangeFlow Navigation
              </span>
            </div>

            {navItems.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href) && item.href !== '/#table';

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-[#4f46e5] text-white'
                      : 'text-[#0b1c30] hover:bg-[#eff4ff]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
