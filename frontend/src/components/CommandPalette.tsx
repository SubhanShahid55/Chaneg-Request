'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const { requests, setIsSlideoverOpen } = useApp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredRequests = requests.filter(
    r =>
      r.id.toLowerCase().includes(query.toLowerCase()) ||
      r.client.toLowerCase().includes(query.toLowerCase()) ||
      r.title.toLowerCase().includes(query.toLowerCase())
  );

  const quickActions = [
    {
      title: 'New Change Request',
      subtitle: 'Open Slide-over panel to log request',
      icon: 'add_circle',
      action: () => {
        onClose();
        setIsSlideoverOpen(true);
      },
    },
    {
      title: 'Dashboard',
      subtitle: 'Overview of all requests, velocity, and pipeline',
      icon: 'dashboard',
      action: () => {
        onClose();
        router.push('/dashboard');
      },
    },
    {
      title: 'All Requests',
      subtitle: 'Browse, search, sort, and manage all change requests',
      icon: 'list_alt',
      action: () => {
        onClose();
        router.push('/requests');
      },
    },
    {
      title: 'Reports and Analytics',
      subtitle: 'View velocity, financial estimates, and request breakdown',
      icon: 'bar_chart',
      action: () => {
        onClose();
        router.push('/reports');
      },
    },
    {
      title: 'Notifications & Alerts',
      subtitle: 'View scope change alerts and activity audit trail',
      icon: 'notifications',
      action: () => {
        onClose();
        router.push('/notifications');
      },
    },
    {
      title: 'Administration',
      subtitle: 'Manage user access, invitations, and client directory',
      icon: 'manage_accounts',
      action: () => {
        onClose();
        router.push('/admin');
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#0b1c30]/40 backdrop-blur-md transition-opacity"
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-[560px] bg-white rounded-xl shadow-2xl border border-[#e2e8f0] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="p-3 border-b border-[#e2e8f0] flex items-center gap-3">
          <span className="material-symbols-outlined text-[#777587] text-xl">search</span>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search change requests, clients, or type a command..."
            className="w-full text-sm text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none bg-transparent"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#64748b] text-[10px] font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 flex flex-col gap-1">
          {/* Quick Actions */}
          {!query && (
            <div>
              <span className="px-3 py-1 text-[11px] font-semibold text-[#777587] uppercase tracking-wider block">
                Quick Navigation
              </span>
              {quickActions.map((act) => (
                <button
                  key={act.title}
                  onClick={act.action}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-[#f8f9ff] flex items-center gap-3 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#3525cd] flex items-center justify-center group-hover:bg-[#4f46e5] group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">{act.icon}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#0b1c30] block">
                      {act.title}
                    </span>
                    <span className="text-[11px] text-[#64748b]">
                      {act.subtitle}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Change Requests Section */}
          <span className="px-3 py-1 text-[11px] font-semibold text-[#777587] uppercase tracking-wider block mt-1">
            Change Requests ({filteredRequests.length})
          </span>
          {filteredRequests.slice(0, 6).map((cr) => (
            <button
              key={cr.id}
              onClick={() => {
                onClose();
                router.push(`/requests/${cr.id}`);
              }}
              className="w-full text-left p-2.5 rounded-lg hover:bg-[#eff4ff] flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs font-bold text-[#4f46e5] bg-[#eef2ff] px-1.5 py-0.5 rounded shrink-0">
                  {cr.id}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#0b1c30] truncate">
                      {cr.client}
                    </span>
                    <span className="text-[11px] text-[#777587]">• {cr.project}</span>
                  </div>
                  <p className="text-[11px] text-[#475569] truncate mt-0.5">
                    {cr.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="font-mono text-xs font-semibold text-[#0b1c30]">
                  ${cr.estimatedCost.toLocaleString()}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    cr.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : cr.status === 'pending'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {cr.status}
                </span>
              </div>
            </button>
          ))}

          {filteredRequests.length === 0 && (
            <div className="py-8 text-center text-xs text-[#777587]">
              No change requests found matching &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
