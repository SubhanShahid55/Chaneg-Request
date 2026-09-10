'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { SlideoverDrawer } from '@/components/SlideoverDrawer';
import { CommandPalette } from '@/components/CommandPalette';
import { Toast } from '@/components/Toast';
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal';
import { useApp, AppProvider, getStatusLabel } from '@/lib/store';
import { fetchWeeklyVelocity } from '@/lib/api';
import { LoginScreen } from '@/components/LoginScreen';

function timeAgo(dateString?: string) {
  if (!dateString) return 'N/A';
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} weeks ago`;
}

export function DashboardContent() {
  const { requests, setIsSlideoverOpen, showToast, globalSearchQuery, isLoading, error, reloadRequests } = useApp();
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [velocityData, setVelocityData] = useState<Array<{ week: string; total: number; approved: number; pending: number }>>([]);

  useEffect(() => {
    const loadVelocity = () => {
      fetchWeeklyVelocity()
        .then(({ weeks }) => setVelocityData(weeks.map((week) => ({ ...week, total: week.approved + week.pending }))))
        .catch(() => setVelocityData([]));
    };
    loadVelocity();
    const refresh = window.setInterval(loadVelocity, 5000);
    return () => window.clearInterval(refresh);
  }, [requests.length]);

  const filteredRequests = requests.filter((request) => {
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'needs_review' && ['pending', 'reviewing', 'draft'].includes(request.status))
      || request.status === statusFilter;
    const query = globalSearchQuery.toLowerCase();
    const matchesSearch = !query
      || request.id.toLowerCase().includes(query)
      || request.client.toLowerCase().includes(query)
      || request.project.toLowerCase().includes(query)
      || request.title.toLowerCase().includes(query)
      || request.description.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const counts = {
    draft: requests.filter((request) => request.status === 'draft').length,
    pending: requests.filter((request) => request.status === 'pending').length,
    reviewing: requests.filter((request) => request.status === 'reviewing').length,
    needsReview: requests.filter((request) => ['pending', 'reviewing', 'draft'].includes(request.status)).length,
    awaitingApproval: requests.filter((request) => request.status === 'awaiting_approval').length,
    inProgress: requests.filter((request) => request.status === 'in_progress').length,
    completed: requests.filter((request) => request.status === 'completed').length,
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Client', 'Project', 'Title', 'Status', 'Hours', 'Cost'];
    const rows = filteredRequests.map((request) => [
      request.id,
      request.client,
      request.project,
      request.title,
      request.status,
      request.estimatedHours,
      request.estimatedCost,
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = 'change-requests-export.csv';
    link.click();
    showToast('CSV Generation Complete', 'change-requests-export.csv downloaded successfully.', 'success');
  };

  const cards = [
    { label: 'Needs my review', value: counts.needsReview, filter: 'needs_review', icon: 'rate_review', iconClass: 'text-amber-600', activeClass: 'border-amber-500 ring-amber-500', hoverClass: 'hover:border-amber-300' },
    { label: 'Waiting for client', value: counts.awaitingApproval, filter: 'awaiting_approval', icon: 'hourglass_top', iconClass: 'text-sky-600', activeClass: 'border-sky-500 ring-sky-500', hoverClass: 'hover:border-sky-300' },
    { label: 'In progress', value: counts.inProgress, filter: 'in_progress', icon: 'engineering', iconClass: 'text-violet-600', activeClass: 'border-violet-500 ring-violet-500', hoverClass: 'hover:border-violet-300' },
    { label: 'Completed', value: counts.completed, filter: 'completed', icon: 'check_circle', iconClass: 'text-emerald-600', activeClass: 'border-emerald-500 ring-emerald-500', hoverClass: 'hover:border-emerald-300' },
  ];
  const maxVelocity = Math.max(...velocityData.map((item) => item.total), 1);
  const chartPoints = velocityData.map((item, index) => {
    const x = velocityData.length > 1 ? (index / (velocityData.length - 1)) * 800 : 400;
    const y = 92 - (item.total / maxVelocity) * 78;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="min-h-screen bg-[#f8f9ff] font-sans text-[#0b1c30]">
      <Header />
      <SlideoverDrawer />
      <ProfileSettingsModal />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      <Toast />

      <main className="mx-auto flex w-full max-w-[75rem] flex-col gap-6 px-4 pb-24 pt-20 md:px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <span className="material-symbols-outlined text-[#4f46e5]">dashboard</span>
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-[#464555]">Overview of active client requests, approvals, and progress.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExportCSV} className="inline-flex items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3.5 py-2 text-xs font-semibold shadow-sm transition hover:bg-[#eff4ff]">
              <span className="material-symbols-outlined text-lg">download</span>
              Export CSV
            </button>
            <button onClick={() => setIsSlideoverOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#4f46e5] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#3525cd]">
              <span className="material-symbols-outlined text-lg">add</span>
              New Request
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <button key={card.filter} onClick={() => setStatusFilter(statusFilter === card.filter ? 'all' : card.filter)} className={`rounded-xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.hoverClass} ${statusFilter === card.filter ? `${card.activeClass} ring-1` : 'border-[#e2e8f0]'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#464555]">{card.label}</span>
                <span className={`material-symbols-outlined ${card.iconClass}`}>{card.icon}</span>
              </div>
              <span className="mt-4 block text-3xl font-bold">{card.value}</span>
              {card.filter === 'needs_review' && (
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#777587]">
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-400" />New {counts.draft}</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />Pending {counts.pending}</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-500" />Reviewing {counts.reviewing}</span>
                </div>
              )}
            </button>
          ))}
        </div>

        <section className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Weekly Velocity</h2>
              <p className="mt-1 text-xs text-[#777587]">Requests completed and approved over the last 8 weeks</p>
            </div>
            <Link href="/reports" className="text-sm font-medium text-[#4f46e5] hover:underline">View reports</Link>
          </div>
          {isLoading && requests.length === 0 && <p className="py-12 text-center text-sm text-[#777587]">Loading live requests...</p>}
          {error && <p className="py-12 text-center text-sm text-[#ba1a1a]">{error}</p>}
          {!isLoading && !error && velocityData.length === 0 && <p className="py-12 text-center text-sm text-[#777587]">No velocity data in the database yet.</p>}
          {velocityData.length > 0 && <div className="flex gap-3">
            <div className="flex h-44 flex-col justify-between pb-7 text-[10px] text-[#777587]">
              {[12, 8, 4, 0].map((value) => <span key={value}>{value}</span>)}
            </div>
            <div className="relative h-44 min-w-0 flex-1">
              <div className="absolute inset-0 flex flex-col justify-between pb-7">
                {[12, 8, 4, 0].map((value) => <div key={value} className="border-t border-dashed border-[#e2e8f0]" />)}
              </div>
              <svg className="absolute inset-0 h-[calc(100%-1.75rem)] w-full overflow-visible" viewBox="0 0 800 100" preserveAspectRatio="none" role="img" aria-label="Weekly request velocity chart">
                <defs>
                  <linearGradient id="velocityFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.22" />
                  </linearGradient>
                </defs>
                <polygon className="velocity-area" points={`${chartPoints} 800,100 0,100`} fill="url(#velocityFill)" />
                <polyline className="velocity-line" points={chartPoints} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {velocityData.map((item, index) => {
                  const x = velocityData.length > 1 ? (index / (velocityData.length - 1)) * 800 : 400;
                  const y = 92 - (item.total / maxVelocity) * 78;
                  return <circle className="velocity-point" key={item.week} cx={x} cy={y} r="4.5" fill="white" stroke="#4f46e5" strokeWidth="2.5"><title>{`${item.week}: ${item.total} requests, ${item.approved} approved, ${item.pending} pending`}</title></circle>;
                })}
              </svg>
              <div className="absolute inset-x-0 bottom-0 flex justify-between text-xs text-[#777587]">
                {velocityData.map((item) => <span key={item.week}>{item.week}</span>)}
              </div>
            </div>
          </div>}
          <div className="mt-4 flex items-center gap-5 text-xs text-[#464555]">
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#4f46e5]" />Total requests</span>
            {velocityData.length > 0 && <><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#10b981]" />Approved: {velocityData[velocityData.length - 1].approved}</span>
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#f59e0b]" />Pending: {velocityData[velocityData.length - 1].pending}</span></>}
          </div>
        </section>

        <section id="table" className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-[#e2e8f0] p-4 sm:flex-row sm:items-center">
            <div className="flex gap-1 overflow-x-auto">
              {[
                ['all', 'All'], ['needs_review', 'Needs review'], ['awaiting_approval', 'Awaiting approval'],
                ['in_progress', 'In progress'], ['completed', 'Completed'],
              ].map(([value, label]) => (
                <button key={value} onClick={() => setStatusFilter(value)} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${statusFilter === value ? 'bg-[#dce9ff] text-[#0b1c30]' : 'text-[#777587] hover:bg-[#eff4ff]'}`}>
                  {label}
                </button>
              ))}
            </div>
            <Link href="/requests" className="text-sm font-medium text-[#4f46e5] hover:underline">View all requests</Link>
          </div>
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

          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-[#e2e8f0] bg-[#fafbff] text-xs uppercase text-[#777587]"><tr>
                <th className="px-4 py-3">Request</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Estimate</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3 text-right">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {isLoading && requests.length === 0 ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-36 mb-1" /><div className="h-3 bg-slate-100 rounded w-16" /></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-7 w-7 rounded-full bg-slate-200" /><div className="h-4 bg-slate-200 rounded w-24" /></div></td>
                      <td className="px-4 py-3"><div className="h-5 bg-slate-200 rounded w-20" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-14" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-12" /></td>
                      <td className="px-4 py-3 text-right"><div className="h-4 bg-slate-100 rounded w-8 ml-auto" /></td>
                    </tr>
                  ))
                ) : (
                  filteredRequests.slice(0, 8).map((request) => (
                    <tr key={request.id} className="hover:bg-[#fafbff]">
                      <td className="max-w-[18rem] px-4 py-3"><Link href={`/requests/${request.id}`} className="block font-medium text-[#0b1c30] hover:text-[#4f46e5] hover:underline">{request.title}</Link><div className="mt-0.5 font-mono text-xs text-[#4f46e5]">{request.id}</div></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e5eeff] text-[10px] font-bold text-[#3525cd]">{request.client.slice(0, 2).toUpperCase()}</span><span className="max-w-[9rem] truncate font-medium" title={request.client}>{request.client}</span></div></td>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${request.status === 'reviewing' ? 'bg-violet-50 text-violet-700' : request.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-[#eff4ff] text-[#3525cd]'}`}>{getStatusLabel(request.status)}</span></td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 text-xs font-medium ${request.urgency === 'Critical' ? 'text-[#ba1a1a]' : request.urgency === 'High' ? 'text-amber-700' : 'text-[#777587]'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{request.urgency}</span></td>
                      <td className="whitespace-nowrap px-4 py-3"><span className="font-mono font-semibold">${request.estimatedCost.toLocaleString()}</span><span className="mx-1 text-[#cbd5e1]">·</span><span className="text-[#464555]">{request.estimatedHours}h</span></td>
                      <td className="px-4 py-3 text-[#777587]">{timeAgo(request.updatedAt || request.createdAt)}</td>
                      <td className="px-4 py-3 text-right"><Link href={`/requests/${request.id}`} className="font-semibold text-[#4f46e5] hover:underline">View</Link></td>
                    </tr>
                  ))
                )}
                {!isLoading && filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-[#777587]">
                      <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">search_off</span>
                      <p className="font-medium text-sm text-[#0b1c30]">No requests match these filters</p>
                      <p className="text-xs text-[#777587] mt-0.5">Try resetting the filter tabs or clear your search query.</p>
                      {statusFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setStatusFilter('all')}
                          className="mt-2 px-3 py-1 rounded-md bg-[#eff4ff] text-[#4f46e5] text-xs font-semibold hover:bg-[#dce9ff]"
                        >
                          View All
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#e2e8f0] px-4 py-3 text-xs text-[#464555]">Showing {Math.min(filteredRequests.length, 8)} of {filteredRequests.length} requests</div>
        </section>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return <LoginScreen />;
}
