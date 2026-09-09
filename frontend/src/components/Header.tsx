'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { logout } from '@/lib/api';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { requests, globalSearchQuery, setGlobalSearchQuery, currentUser, setIsProfileModalOpen, notifications } = useApp();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const isAdmin = currentUser.role.toLowerCase() === 'admin';

  useEffect(() => {
    document.body.classList.add('changeflow-sidebar-active');
    return () => document.body.classList.remove('changeflow-sidebar-active');
  }, []);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { label: 'Requests', href: '/requests', icon: 'list_alt' },
    { label: 'Reports', href: '/reports', icon: 'bar_chart' },
    ...(isAdmin ? [{ label: 'Admin', href: '/admin', icon: 'manage_accounts' }] : []),
  ];

  return (
    <>
      <aside className="changeflow-sidebar fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-[#d6e5de] bg-white px-4 py-5 shadow-[4px_0_20px_rgba(28,61,49,0.04)] md:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
          <img alt="ChangeFlow logo" className="h-9 w-9 object-contain" src="/assets/logo.svg" />
          <span className="text-lg font-semibold tracking-tight text-[#0b1c30]">ChangeFlow</span>
        </Link>
        <p className="mb-3 mt-10 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7a8d85]">Workspace</p>
        <nav className="flex flex-col gap-1 text-sm font-medium">
          {navItems.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}
        </nav>
        <div className="mt-auto border-t border-[#e4eee9] pt-4">
          <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#9d2c27] transition hover:bg-[#fff2f0]">
            <span className="material-symbols-outlined text-lg" aria-hidden="true">logout</span> Log out
          </button>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-30 border-b border-[#d6e5de] bg-[#f6f8f7]/95 shadow-[0_1px_8px_rgba(28,61,49,0.04)] backdrop-blur-xl md:left-60">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          {/* Brand Logo & Name */}
          <Link href="/dashboard" className="text-sm font-semibold text-[#4f46e5] md:hidden">ChangeFlow</Link>

          {/* Right Tools & Profile */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
            {/* Inline Global Search */}
            <div className="hidden md:flex relative mx-auto w-full max-w-xl items-center">
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
                      {notifications.length} New
                    </span>
                  </div>
                  <div className="py-2 flex flex-col gap-2 max-h-60 overflow-y-auto text-xs">
                    {notifications.length === 0 && <p className="p-2 text-[#777587]">No recent activity.</p>}
                    {notifications.map((notification) => (
                      <div key={notification.id} className="p-2 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0]/60">
                        <span className="font-medium text-[#0b1c30]">{notification.event_type.replaceAll('_', ' ')}</span>
                        <p className="text-[#464555] text-[11px] mt-0.5">{notification.actor_name || 'System'} · {new Date(notification.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Badge */}
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 pl-2 border-l border-[#d3e4fe]/80 text-left hover:opacity-80 transition-opacity"
              title="Edit Profile"
            >
              {currentUser?.avatarUrl ? <img alt={`${currentUser.name} profile`} className="w-8 h-8 rounded-full object-cover ring-1 ring-[#4f46e5]/30" src={currentUser.avatarUrl} /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5eeff] text-xs font-bold text-[#3525cd]">{(currentUser?.name || 'U').slice(0, 1).toUpperCase()}</span>}
              <div className="hidden lg:flex flex-col">
                <span className="text-xs font-semibold text-[#0b1c30] leading-none">
                  {currentUser?.name || 'Your profile'}
                </span>
                <span className="text-[10px] text-[#464555] mt-1 leading-none">
                  {currentUser?.role || 'User'}
                </span>
              </div>
            </button>

            <button type="button" onClick={handleLogout} className="hidden rounded-lg border border-[#e2b9b5] px-3 py-2 text-xs font-semibold text-[#9d2c27] transition hover:bg-[#fff2f0] lg:inline-flex lg:items-center lg:gap-1.5">
              <span className="material-symbols-outlined text-base" aria-hidden="true">logout</span> Log out
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

            {navItems.map((item) => <NavLink key={item.href} item={item} pathname={pathname} onClick={() => setMobileMenuOpen(false)} />)}
            <button type="button" onClick={handleLogout} className="mt-2 flex items-center gap-3 rounded-xl border-t border-[#e4eee9] p-3 pt-4 text-sm font-semibold text-[#9d2c27]"> <span className="material-symbols-outlined text-lg" aria-hidden="true">logout</span> Log out</button>
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({ item, pathname, onClick }: { item: { label: string; href: string; icon: string }; pathname: string; onClick?: () => void }) {
  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
  return <Link href={item.href} onClick={onClick} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${isActive ? 'bg-[#4f46e5] text-white shadow-sm' : 'text-[#464555] hover:bg-[#eff4ff] hover:text-[#0b1c30]'}`}><span className="material-symbols-outlined text-lg" aria-hidden="true">{item.icon}</span><span>{item.label}</span></Link>;
}
