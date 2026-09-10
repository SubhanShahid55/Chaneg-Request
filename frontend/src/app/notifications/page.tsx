'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { SlideoverDrawer } from '@/components/SlideoverDrawer';
import { CommandPalette } from '@/components/CommandPalette';
import { Toast } from '@/components/Toast';
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal';
import { useApp, AppProvider } from '@/lib/store';

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function getEventMeta(eventType: string) {
  switch (eventType) {
    case 'approved':
      return {
        label: 'Scope Approved',
        icon: 'verified',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        iconColor: 'text-emerald-600',
        category: 'approvals',
      };
    case 'declined':
      return {
        label: 'Feedback / Decline',
        icon: 'cancel',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        iconColor: 'text-rose-600',
        category: 'approvals',
      };
    case 'sent_for_approval':
      return {
        label: 'Sent for Client Approval',
        icon: 'forward_to_inbox',
        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        iconColor: 'text-[#4f46e5]',
        category: 'estimates',
      };
    case 'estimate_updated':
      return {
        label: 'Scope & Estimate Updated',
        icon: 'tune',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
        iconColor: 'text-blue-600',
        category: 'estimates',
      };
    case 'created':
      return {
        label: 'New Request Logged',
        icon: 'add_circle',
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
        iconColor: 'text-slate-600',
        category: 'estimates',
      };
    case 'marked_in_progress':
      return {
        label: 'Implementation Started',
        icon: 'play_arrow',
        badgeBg: 'bg-violet-50 text-violet-700 border-violet-200',
        iconColor: 'text-violet-600',
        category: 'notes',
      };
    case 'marked_complete':
      return {
        label: 'Completed & Delivered',
        icon: 'task_alt',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        iconColor: 'text-emerald-600',
        category: 'notes',
      };
    case 'note_added':
      return {
        label: 'Internal Agency Note',
        icon: 'chat',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
        iconColor: 'text-purple-600',
        category: 'notes',
      };
    default:
      return {
        label: eventType.replaceAll('_', ' '),
        icon: 'info',
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
        iconColor: 'text-slate-600',
        category: 'other',
      };
  }
}

function NotificationsContent() {
  const {
    notifications,
    unreadNotificationCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    reloadRequests,
    showToast,
    isLoading,
  } = useApp();
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'approvals' | 'estimates' | 'notes'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await reloadRequests();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
    showToast('All Caught Up', 'All notifications marked as read.', 'success');
  };

  const counts = useMemo(() => {
    let unread = 0;
    let approvals = 0;
    let estimates = 0;
    let notes = 0;
    for (const n of notifications) {
      if (!n.is_read) unread++;
      const meta = getEventMeta(n.event_type);
      if (meta.category === 'approvals') approvals++;
      else if (meta.category === 'estimates') estimates++;
      else if (meta.category === 'notes') notes++;
    }
    return {
      all: notifications.length,
      unread,
      approvals,
      estimates,
      notes,
    };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filterTab === 'unread') {
        if (n.is_read) return false;
      } else if (filterTab !== 'all') {
        const meta = getEventMeta(n.event_type);
        if (meta.category !== filterTab) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const meta = getEventMeta(n.event_type);
      const matchType = n.event_type.toLowerCase().includes(q) || meta.label.toLowerCase().includes(q);
      const matchActor = (n.actor_name || '').toLowerCase().includes(q);
      const matchData = n.event_data ? JSON.stringify(n.event_data).toLowerCase().includes(q) : false;
      return matchType || matchActor || matchData;
    });
  }, [notifications, filterTab, searchQuery]);

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col font-sans text-[#0b1c30]">
      <Header />
      <SlideoverDrawer />
      <ProfileSettingsModal />
      <Toast />

      <main className="w-full pt-16 flex-1 pb-20">
        <div className="w-full max-w-[75rem] mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">
          {/* Top Bar Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4f46e5] text-2xl">notifications</span>
                <h1 className="text-2xl font-bold text-[#0b1c30]">Notifications & Alerts</h1>
              </div>
              <p className="text-sm text-[#464555] mt-1">
                Real-time activity audit log and scope change alerts across all client projects.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-auto">
              <button
                type="button"
                disabled={unreadNotificationCount === 0}
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#eff4ff] text-[#3525cd] hover:bg-[#dce9ff] text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={unreadNotificationCount === 0 ? 'No unread notifications' : 'Mark all notifications as read'}
              >
                <span className="material-symbols-outlined text-base">done_all</span>
                <span>Mark all as read</span>
              </button>

              <button
                type="button"
                disabled={isRefreshing || isLoading}
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-[#e2e8f0] text-xs font-semibold text-[#0b1c30] shadow-xs hover:bg-[#eff4ff] transition-colors disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-base text-[#4f46e5] ${isRefreshing ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh Activity'}</span>
              </button>
            </div>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`p-4 rounded-xl border text-left bg-white shadow-xs transition-all ${
                filterTab === 'all' ? 'border-[#4f46e5] ring-1 ring-[#4f46e5]' : 'border-[#e2e8f0] hover:border-[#cbd5e1]'
              }`}
            >
              <span className="text-xs font-medium text-[#777587] block">Total Logged</span>
              <span className="text-2xl font-bold font-mono text-[#0b1c30] mt-1 block">{counts.all}</span>
              <span className="text-[11px] text-[#777587] mt-0.5 block">Lifetime event history</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('unread')}
              className={`p-4 rounded-xl border text-left bg-white shadow-xs transition-all ${
                filterTab === 'unread' ? 'border-[#4f46e5] ring-1 ring-[#4f46e5]' : 'border-[#e2e8f0] hover:border-indigo-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#4f46e5]">Unread Alerts</span>
                {counts.unread > 0 && <span className="h-2 w-2 rounded-full bg-[#4f46e5] animate-pulse" />}
              </div>
              <span className="text-2xl font-bold font-mono text-[#3525cd] mt-1 block">{counts.unread}</span>
              <span className="text-[11px] text-[#777587] mt-0.5 block">Awaiting your attention</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('approvals')}
              className={`p-4 rounded-xl border text-left bg-white shadow-xs transition-all ${
                filterTab === 'approvals' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-[#e2e8f0] hover:border-emerald-200'
              }`}
            >
              <span className="text-xs font-medium text-emerald-800 block">Approvals & Feedback</span>
              <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">{counts.approvals}</span>
              <span className="text-[11px] text-[#777587] mt-0.5 block">Client decisions</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('estimates')}
              className={`p-4 rounded-xl border text-left bg-white shadow-xs transition-all ${
                filterTab === 'estimates' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-[#e2e8f0] hover:border-blue-200'
              }`}
            >
              <span className="text-xs font-medium text-blue-800 block">Scope & Estimates</span>
              <span className="text-2xl font-bold font-mono text-blue-700 mt-1 block">{counts.estimates}</span>
              <span className="text-[11px] text-[#777587] mt-0.5 block">Changes to hours or cost</span>
            </button>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'all', label: 'All Activity' },
                { id: 'unread', label: `Unread (${counts.unread})` },
                { id: 'approvals', label: 'Client Approvals' },
                { id: 'estimates', label: 'Scope Changes' },
                { id: 'notes', label: 'Internal Notes' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterTab === tab.id
                      ? 'bg-[#eff4ff] text-[#3525cd]'
                      : 'text-[#464555] hover:bg-[#f8f9ff] hover:text-[#0b1c30]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-2 text-[#777587] text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Filter alerts by keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-2 text-[#777587] hover:text-[#0b1c30]"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Activity Feed List */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden divide-y divide-[#f1f5f9]">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 space-y-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-1/3" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-[#4f46e5] flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-3xl">notifications_off</span>
                </div>
                <h3 className="text-base font-bold text-[#0b1c30]">
                  {filterTab === 'unread' ? 'No unread notifications' : 'No notifications found'}
                </h3>
                <p className="text-xs text-[#777587] max-w-sm mx-auto mt-1">
                  {filterTab === 'unread'
                    ? 'You are completely caught up! New change alerts will appear here.'
                    : searchQuery || filterTab !== 'all'
                    ? 'No events match your current keyword search or filter criteria.'
                    : 'Activity events will automatically appear here as changes are estimated, sent for approval, or signed off.'}
                </p>
                {(searchQuery || filterTab !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterTab('all');
                    }}
                    className="mt-4 px-3.5 py-1.5 rounded-lg bg-[#eff4ff] text-[#4f46e5] text-xs font-semibold hover:bg-[#dce9ff] transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const meta = getEventMeta(n.event_type);
                const requestId = (n.event_data as any)?.reference_code || (n.event_data as any)?.request_id || (n as any).request_id;
                const requestTitle = (n.event_data as any)?.title || (n.event_data as any)?.request_title;

                return (
                  <div
                    key={n.id}
                    className={`p-4 sm:p-5 flex items-start gap-3.5 sm:gap-4 transition-colors ${
                      !n.is_read ? 'bg-indigo-50/20 hover:bg-indigo-50/40 border-l-4 border-l-[#4f46e5]' : 'hover:bg-[#fafbff]'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${meta.badgeBg}`}>
                      <span className={`material-symbols-outlined text-xl ${meta.iconColor}`}>
                        {meta.icon}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[#0b1c30]">
                            {meta.label}
                          </span>
                          {!n.is_read && (
                            <span className="px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#3525cd] text-[10px] font-bold">
                              New
                            </span>
                          )}
                          {requestId && (
                            <Link
                              href={`/requests/${requestId}`}
                              className="font-mono text-xs font-bold text-[#4f46e5] bg-[#eff4ff] hover:bg-[#dce9ff] px-2 py-0.5 rounded transition-colors"
                            >
                              {requestId}
                            </Link>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#777587]" title={new Date(n.created_at).toLocaleString()}>
                            {timeAgo(n.created_at)}
                          </span>
                          {!n.is_read && (
                            <button
                              type="button"
                              onClick={() => markNotificationAsRead(n.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-[#4f46e5] hover:bg-[#eff4ff] transition-colors"
                              title="Mark as read"
                            >
                              <span className="material-symbols-outlined text-sm">done</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {requestTitle && (
                        <p className="text-xs font-medium text-[#464555] mt-0.5">
                          {requestTitle}
                        </p>
                      )}

                      {/* Event Context Snippets */}
                      {n.event_data && (
                        <div className="mt-2 text-xs text-[#464555]">
                          {(n.event_data as any).content && (
                            <div className="p-2.5 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0] italic text-slate-700">
                              &quot;{(n.event_data as any).content}&quot;
                            </div>
                          )}
                          {(n.event_data as any).decline_reason && (
                            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                              Client feedback: &quot;{(n.event_data as any).decline_reason}&quot;
                            </div>
                          )}
                          {(n.event_data as any).confirmation_code && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 font-mono font-semibold text-[11px] border border-emerald-200">
                              <span className="material-symbols-outlined text-xs">verified</span>
                              Code: {(n.event_data as any).confirmation_code}
                            </div>
                          )}
                          {(n.event_data as any).hours !== undefined && (n.event_data as any).cost !== undefined && (
                            <div className="mt-1 font-mono text-[11px] text-[#4f46e5]">
                              Estimate: {(n.event_data as any).hours}h · ${(n.event_data as any).cost?.toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2 text-[11px] text-[#777587]">
                        <span className="material-symbols-outlined text-xs">person</span>
                        <span>{n.actor_name || 'System'}</span>
                        <span>·</span>
                        <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <AppProvider>
      <NotificationsContent />
    </AppProvider>
  );
}
