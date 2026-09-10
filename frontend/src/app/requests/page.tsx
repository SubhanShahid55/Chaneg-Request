'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { SlideoverDrawer } from '@/components/SlideoverDrawer';
import { CommandPalette } from '@/components/CommandPalette';
import { Toast } from '@/components/Toast';
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal';
import { useApp, AppProvider, getStatusLabel } from '@/lib/store';
import { API_BASE_URL } from '@/lib/api';
import { ChangeRequest } from '@/lib/types';

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const PRIORITY_ORDER: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

type SortField = 'updated' | 'cost' | 'priority' | 'client' | 'title';
type SortDirection = 'asc' | 'desc';

function RequestsContent() {
  const { requests, setIsSlideoverOpen, isLoading, error, reloadRequests, showToast } = useApp();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('updated');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [isExporting, setIsExporting] = useState(false);

  const filteredRequests = requests.filter(r => {
    let matchesStatus = true;
    if (statusFilter === 'needs_review') {
      matchesStatus = ['pending', 'reviewing', 'draft'].includes(r.status);
    } else if (statusFilter === 'awaiting_approval') {
      matchesStatus = r.status === 'awaiting_approval';
    } else if (statusFilter === 'in_progress') {
      matchesStatus = r.status === 'in_progress';
    } else if (statusFilter === 'completed') {
      matchesStatus = r.status === 'completed';
    } else if (statusFilter !== 'all') {
      matchesStatus = r.status === statusFilter;
    }
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      r.id.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.client.toLowerCase().includes(q) ||
      r.clientContact.name.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('changeflow_access_token') : null;
      const res = await fetch(`${API_BASE_URL}/requests/export.csv`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`Export failed with status ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `change-requests-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Export Complete', 'Change requests CSV downloaded.', 'success');
    } catch (cause) {
      showToast('Export Failed', cause instanceof Error ? cause.message : 'Unable to generate CSV.', 'error');
    } finally {
      setIsExporting(false);
    }
  };
  const filteredAndSortedRequests = useMemo(() => {
    const filtered = requests.filter((r) => {
      let matchesStatus = true;
      if (statusFilter === 'needs_review') {
        matchesStatus = ['pending', 'reviewing', 'draft'].includes(r.status);
      } else if (statusFilter === 'awaiting_approval') {
        matchesStatus = r.status === 'awaiting_approval';
      } else if (statusFilter === 'in_progress') {
        matchesStatus = r.status === 'in_progress';
      } else if (statusFilter === 'completed') {
        matchesStatus = r.status === 'completed';
      } else if (statusFilter !== 'all') {
        matchesStatus = r.status === statusFilter;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.client.toLowerCase().includes(q) ||
        r.clientContact.name.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });

    return filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'updated') {
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        cmp = timeA - timeB;
      } else if (sortField === 'cost') {
        cmp = a.estimatedCost - b.estimatedCost;
      } else if (sortField === 'priority') {
        const pA = PRIORITY_ORDER[a.urgency] || 0;
        const pB = PRIORITY_ORDER[b.urgency] || 0;
        cmp = pA - pB;
      } else if (sortField === 'client') {
        cmp = a.client.localeCompare(b.client);
      } else if (sortField === 'title') {
        cmp = a.title.localeCompare(b.title);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [requests, statusFilter, searchQuery, sortField, sortDir]);

  const getPriorityColor = (urgency: string) => {
    switch (urgency) {
      case 'Critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'High':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Medium':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Low':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in_progress': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'awaiting_approval': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'draft': return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'declined': return 'bg-red-50 text-red-700 border-red-200';
      case 'approved': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in_progress':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'awaiting_approval':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'draft':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'declined':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'approved':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'reviewing':
        return 'bg-violet-50 text-violet-700 border-violet-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <span className="material-symbols-outlined text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">unfold_more</span>;
      return (
        <span className="material-symbols-outlined text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
          unfold_more
        </span>
      );
    }
    return (
      <span className="material-symbols-outlined text-xs text-[#4f46e5]">
        {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col">
      <Header />
      <SlideoverDrawer />
      <ProfileSettingsModal />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      <Toast />

      <main className="w-full pt-16 flex-1">
        <div className="w-full max-w-[75rem] mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">
          {/* Top Bar Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4f46e5]">list_alt</span>
                All Requests
              </h1>
              <p className="text-sm text-[#464555] mt-1">Manage and track all client change requests.</p>
              <p className="text-sm text-[#464555] mt-1">
                Manage, estimate, and dispatch change requests across all agency clients.
              </p>
            </div>
            <button
              onClick={() => setIsSlideoverOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200 text-xs font-semibold active:scale-95 group"
            >
              <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform duration-300">add</span>
              <span>New Request</span>
              <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono font-medium">N</kbd>
            </button>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#cbd5e1] hover:bg-[#f8f9ff] text-[#0b1c30] text-xs font-semibold shadow-xs transition-colors disabled:opacity-60"
                title="Export change requests to CSV"
              >
                <span className="material-symbols-outlined text-base text-[#464555]">
                  {isExporting ? 'progress_activity' : 'download'}
                </span>
                <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSlideoverOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200 text-xs font-semibold active:scale-95 group"
              >
                <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform duration-300">
                  add
                </span>
                <span>New Request</span>
                <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono font-medium">N</kbd>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-800 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600">error</span>
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => void reloadRequests()}
                className="px-3 py-1 rounded bg-white border border-rose-300 text-rose-700 font-semibold hover:bg-rose-100 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Table Container Card */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm flex flex-col overflow-hidden">
            {/* Filter Tabs and Search Bar */}
            <div className="p-4 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#fafbff]">
              <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                {[
                  { id: 'all', label: 'All Requests' },
                  { id: 'needs_review', label: 'Needs Review' },
                  { id: 'awaiting_approval', label: 'Awaiting Approval' },
                  { id: 'in_progress', label: 'In Progress' },
                  { id: 'completed', label: 'Completed' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
                      statusFilter === tab.id
                        ? 'bg-[#4f46e5] text-white shadow-sm'
                        : 'bg-white text-[#464555] hover:bg-[#f0f4ff] hover:text-[#4f46e5] border border-[#e2e8f0] hover:border-[#d3e4fe]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777587] text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Filter by title, client, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-lg border border-[#e2e8f0] text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] w-full sm:w-72 transition-all bg-white"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-[11px] uppercase tracking-wider text-[#777587] bg-white select-none">
                    <th
                      className="py-3.5 px-4 font-semibold cursor-pointer group hover:text-[#0b1c30]"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Request</span>
                        {renderSortIndicator('title')}
                      </div>
                    </th>
                    <th
                      className="py-3.5 px-4 font-semibold cursor-pointer group hover:text-[#0b1c30]"
                      onClick={() => handleSort('client')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Client</span>
                        {renderSortIndicator('client')}
                      </div>
                    </th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Priority</th>
                    <th className="py-3.5 px-4 font-semibold">Estimate</th>
                    <th className="py-3.5 px-4 font-semibold">Updated</th>
                    <th
                      className="py-3.5 px-4 font-semibold cursor-pointer group hover:text-[#0b1c30]"
                      onClick={() => handleSort('priority')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Priority</span>
                        {renderSortIndicator('priority')}
                      </div>
                    </th>
                    <th
                      className="py-3.5 px-4 font-semibold cursor-pointer group hover:text-[#0b1c30]"
                      onClick={() => handleSort('cost')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Estimate</span>
                        {renderSortIndicator('cost')}
                      </div>
                    </th>
                    <th
                      className="py-3.5 px-4 font-semibold cursor-pointer group hover:text-[#0b1c30]"
                      onClick={() => handleSort('updated')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Updated</span>
                        {renderSortIndicator('updated')}
                      </div>
                    </th>
                    <th className="py-3.5 px-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-[#e2e8f0]/60">
                  {isLoading && requests.length === 0 ? (
                    // Loading skeleton rows
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-4 px-4">
                          <div className="h-4 bg-slate-200 rounded w-20 mb-2" />
                          <div className="h-4 bg-slate-100 rounded w-48" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200" />
                            <div className="space-y-1">
                              <div className="h-3.5 bg-slate-200 rounded w-24" />
                              <div className="h-3 bg-slate-100 rounded w-16" />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-6 bg-slate-200 rounded-md w-24" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-6 bg-slate-200 rounded-md w-16" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 bg-slate-200 rounded w-16 mb-1" />
                          <div className="h-3 bg-slate-100 rounded w-20" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 bg-slate-100 rounded w-16" />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="w-6 h-6 bg-slate-100 rounded mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : filteredAndSortedRequests.length > 0 ? (
                    filteredAndSortedRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-[#fafbff] transition-colors group">
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/requests/${req.id}`}
                            className="font-mono text-xs text-[#4f46e5] font-semibold hover:underline"
                          >
                            {req.id}
                          </Link>
                          <div
                            className="text-[#0b1c30] font-medium mt-0.5 truncate max-w-[280px]"
                            title={req.title}
                          >
                            {req.title}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                req.clientContact.avatarUrl ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                  req.clientContact.name || req.client
                                )}`
                              }
                              alt={req.clientContact.name}
                              className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 object-cover shrink-0"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-[#0b1c30] text-sm truncate">
                                {req.clientContact.name}
                              </span>
                              <span className="text-[#777587] text-[11px] truncate">{req.client}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium border ${getStatusColor(
                              req.status
                            )}`}
                          >
                            {getStatusLabel(req.status)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border ${getPriorityColor(
                              req.urgency
                            )}`}
                          >
                            {req.urgency === 'Critical' && (
                              <span className="material-symbols-outlined text-[12px]">warning</span>
                            )}
                            {req.urgency}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-[#0b1c30] text-sm">{req.clientContact.name}</span>
                            <span className="text-[#777587] text-[11px]">{req.client}</span>
                            <span className="font-medium text-[#0b1c30] text-sm font-mono">
                              ${req.estimatedCost.toLocaleString()}
                            </span>
                            <span className="text-[#777587] text-[11px]">
                              {req.estimatedHours}h @ ${req.hourlyRate}/hr
                            </span>
                          </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium border ${getStatusColor(req.status)}`}>
                          {getStatusLabel(req.status)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border ${getPriorityColor(req.urgency)}`}>
                          {req.urgency === 'Critical' && <span className="material-symbols-outlined text-[12px]">warning</span>}
                          {req.urgency}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#0b1c30] text-sm">${req.estimatedCost.toLocaleString()}</span>
                          <span className="text-[#777587] text-[11px]">{req.estimatedHours}h @ ${req.hourlyRate}/hr</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#464555] text-sm">
                        {timeAgo(req.updatedAt || req.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Link href={`/requests/${req.id}`} className="inline-flex items-center justify-center p-1.5 rounded-lg text-[#4f46e5] hover:bg-indigo-50 transition-colors" aria-label="View request">
                          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-[#777587]">
                          <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">search_off</span>
                          <p className="text-sm font-medium">No requests found</p>
                          <p className="text-xs mt-1">Try adjusting your search or filters.</p>
                          <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">
                            search_off
                          </span>
                          <p className="text-sm font-medium text-[#0b1c30]">No matching change requests</p>
                          <p className="text-xs mt-1 text-[#777587]">
                            {searchQuery || statusFilter !== 'all'
                              ? 'Try adjusting your filters or search keywords.'
                              : 'Create your first request using the "New Request" button above.'}
                          </p>
                          {(searchQuery || statusFilter !== 'all') && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('all');
                              }}
                              className="mt-3 px-3 py-1.5 rounded-lg bg-[#eff4ff] text-[#4f46e5] text-xs font-semibold hover:bg-[#dce9ff] transition-colors"
                            >
                              Reset Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      

      <footer className="w-full bg-white border-t border-[#e2e8f0] mt-auto py-6">
        <div className="max-w-[75rem] mx-auto px-4 md:px-6 flex items-center justify-between text-xs text-[#777587]">
          <span>© 2025 ChangeFlow · Professional Client Scope Management</span>
          <span>
            Showing {filteredAndSortedRequests.length} of {requests.length} requests
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function RequestsPage() {
  return (
    <AppProvider>
      <RequestsContent />
    </AppProvider>
  );
}
