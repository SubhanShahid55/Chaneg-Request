'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight, BarChart3, CheckCircle2, ChevronDown, CircleAlert, Clock3,
  Download, FileCheck2, ListFilter, Plus, RefreshCw, Search, Sparkles, Timer,
  TrendingUp, Users, XCircle,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { SlideoverDrawer } from '@/components/SlideoverDrawer';
import { CommandPalette } from '@/components/CommandPalette';
import { Toast } from '@/components/Toast';
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal';
import { useApp, getStatusLabel } from '@/lib/store';
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

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 420;
    const frame = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplayValue(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) window.requestAnimationFrame(frame);
    };
    const animation = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(animation);
  }, [value]);

  return <>{displayValue}</>;
}

const statusStyles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  reviewing: 'bg-violet-50 text-violet-700 ring-violet-200',
  awaiting_approval: 'bg-sky-50 text-sky-700 ring-sky-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  in_progress: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  declined: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export function DashboardContent() {
  const { requests, setIsSlideoverOpen, showToast, globalSearchQuery, isLoading, error, reloadRequests } = useApp();
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [velocityData, setVelocityData] = useState<Array<{ week: string; total: number; approved: number; pending: number }>>([]);
  const [activeWeek, setActiveWeek] = useState<number | null>(null);

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

  const counts = useMemo(() => ({
    draft: requests.filter((request) => request.status === 'draft').length,
    pending: requests.filter((request) => request.status === 'pending').length,
    reviewing: requests.filter((request) => request.status === 'reviewing').length,
    needsReview: requests.filter((request) => ['pending', 'reviewing', 'draft'].includes(request.status)).length,
    awaitingApproval: requests.filter((request) => request.status === 'awaiting_approval').length,
    inProgress: requests.filter((request) => request.status === 'in_progress').length,
    completed: requests.filter((request) => request.status === 'completed').length,
  }), [requests]);

  const filteredRequests = useMemo(() => requests.filter((request) => {
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'needs_review' && ['pending', 'reviewing', 'draft'].includes(request.status))
      || request.status === statusFilter;
    const query = globalSearchQuery.toLowerCase();
    const matchesSearch = !query
      || [request.id, request.client, request.project, request.title, request.description].some((value) => value.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  }), [globalSearchQuery, requests, statusFilter]);

  const handleExportCSV = () => {
    const headers = ['ID', 'Client', 'Project', 'Title', 'Status', 'Hours', 'Cost'];
    const rows = filteredRequests.map((request) => [request.id, request.client, request.project, request.title, request.status, request.estimatedHours, request.estimatedCost]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
    const link = document.createElement('a');
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent([headers.join(','), ...rows].join('\n'))}`;
    link.download = 'change-requests-export.csv';
    link.click();
    showToast('CSV Generation Complete', 'change-requests-export.csv downloaded successfully.', 'success');
  };

  const tabs = [
    ['all', 'All', requests.length],
    ['needs_review', 'Needs review', counts.needsReview],
    ['awaiting_approval', 'Awaiting approval', counts.awaitingApproval],
    ['in_progress', 'In progress', counts.inProgress],
    ['completed', 'Completed', counts.completed],
  ] as const;
  const cards = [
    { label: 'Needs my review', value: counts.needsReview, note: `${counts.draft} new · ${counts.pending + counts.reviewing} in review`, icon: CircleAlert, tone: 'amber', filter: 'needs_review' },
    { label: 'Waiting for client', value: counts.awaitingApproval, note: 'Awaiting a client decision', icon: Clock3, tone: 'sky', filter: 'awaiting_approval' },
    { label: 'In progress', value: counts.inProgress, note: 'Currently being implemented', icon: Timer, tone: 'indigo', filter: 'in_progress' },
    { label: 'Completed', value: counts.completed, note: 'Delivered successfully', icon: CheckCircle2, tone: 'emerald', filter: 'completed' },
  ] as const;
  const maxVelocity = Math.max(...velocityData.map((item) => item.total), 1);
  const totalVelocity = velocityData.reduce((sum, item) => sum + item.total, 0);
  const averageVelocity = velocityData.length ? (totalVelocity / velocityData.length).toFixed(1) : '0.0';
  const chartPoints = velocityData.map((item, index) => {
    const x = velocityData.length > 1 ? (index / (velocityData.length - 1)) * 800 : 400;
    const y = 94 - (item.total / maxVelocity) * 70;
    return { ...item, x, y };
  });
  const chartLine = chartPoints.map(({ x, y }) => `${x},${y}`).join(' ');
  const chartArea = chartPoints.length ? `${chartLine} 800,100 0,100` : '';

  return (
    <div className="min-h-screen bg-[#f8f9ff] font-sans text-[#0b1c30]">
      <Header />
      <SlideoverDrawer />
      <ProfileSettingsModal />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      <Toast />

      <main className="mx-auto flex w-full max-w-[78rem] flex-col gap-6 px-4 pb-24 pt-24 md:px-7">
        <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#777587]"><span className="h-2 w-2 rounded-full bg-emerald-500" />Live workspace</div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0b1c30]">Dashboard</h1>
            <p className="mt-1.5 text-sm text-[#464555]">A clear view of your team&apos;s request workload and next actions.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 hidden text-xs text-[#777587] sm:inline">Reporting period · {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <button onClick={handleExportCSV} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3.5 text-xs font-semibold text-[#464555] shadow-sm transition hover:border-[#a5b4fc] hover:bg-[#eff4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30"><Download size={16} />Export CSV</button>
            <button onClick={() => setIsSlideoverOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#4f46e5] px-4 text-xs font-semibold text-white shadow-[0_5px_14px_rgba(79,70,229,0.22)] transition hover:bg-[#3525cd] hover:shadow-[0_7px_18px_rgba(79,70,229,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5]/40"><Plus size={17} />New Request</button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Request summary">
          {cards.map((card, index) => {
            const Icon = card.icon;
            const tones = {
              amber: 'border-amber-200/80 bg-amber-50/40 text-amber-600 group-hover:bg-amber-50',
              sky: 'border-sky-200/80 bg-sky-50/40 text-sky-600 group-hover:bg-sky-50',
              indigo: 'border-indigo-200/80 bg-indigo-50/40 text-indigo-600 group-hover:bg-indigo-50',
              emerald: 'border-emerald-200/80 bg-emerald-50/40 text-emerald-600 group-hover:bg-emerald-50',
            }[card.tone];
            return <button key={card.filter} onClick={() => setStatusFilter(statusFilter === card.filter ? 'all' : card.filter)} className={`dashboard-reveal group rounded-xl border bg-white p-5 text-left shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30 ${statusFilter === card.filter ? 'border-[#4f46e5] ring-2 ring-[#4f46e5]/10' : 'border-[#e2e8f0]'}`} style={{ animationDelay: `${index * 55}ms` }}>
              <div className="flex items-start justify-between gap-3"><span className="text-sm font-semibold text-[#464555]">{card.label}</span><span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${tones}`}><Icon size={18} strokeWidth={2} /></span></div>
              <div className="mt-5 flex items-end justify-between"><span className="font-mono text-3xl font-bold tracking-tight text-[#0b1c30]"><AnimatedNumber value={card.value} /></span>{card.value > 0 && card.filter === 'needs_review' && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700"><Sparkles size={13} />Action needed</span>}</div>
              <p className="mt-2 text-xs text-[#777587]">{card.note}</p>
            </button>;
          })}
        </section>

        <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col justify-between gap-4 border-b border-[#eef2f7] p-5 sm:flex-row sm:items-start">
            <div><div className="flex items-center gap-2"><BarChart3 size={18} className="text-[#4f46e5]" /><h2 className="text-base font-bold">Weekly velocity</h2></div><p className="mt-1 text-xs text-[#777587]">Approved and pending requests across the last 8 weeks</p></div>
            <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="font-mono text-lg font-bold text-[#0b1c30]">{totalVelocity}</p><p className="text-[10px] uppercase tracking-wider text-[#777587]">Total requests</p></div><label className="relative"><span className="sr-only">Chart date range</span><select defaultValue="8" className="h-9 appearance-none rounded-lg border border-[#cbd5e1] bg-white py-0 pl-3 pr-8 text-xs font-semibold text-[#464555] outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/15"><option value="8">Last 8 weeks</option></select><ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-3 text-[#777587]" /></label><Link href="/reports" className="inline-flex items-center gap-1 text-xs font-semibold text-[#4f46e5] hover:text-[#3525cd]">View reports <ArrowUpRight size={14} /></Link></div>
          </div>
          {isLoading && requests.length === 0 && <div className="h-64 animate-pulse bg-slate-50/70" />}
          {error && <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-rose-700"><CircleAlert size={22} /><span>{error}</span><button onClick={() => void reloadRequests()} className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-white px-3 py-2 text-xs font-semibold"><RefreshCw size={13} />Retry</button></div>}
          {!isLoading && !error && velocityData.length === 0 && <div className="flex h-64 flex-col items-center justify-center text-center"><TrendingUp size={24} className="mb-2 text-slate-300" /><p className="text-sm font-semibold">No velocity data yet</p><p className="mt-1 text-xs text-[#777587]">Activity will appear here as requests move through the workflow.</p></div>}
          {velocityData.length > 0 && <div className="px-5 pb-4 pt-5"><div className="mb-3 flex items-center gap-5 text-xs text-[#777587]"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#4f46e5]" />Total requests</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />Approved</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" />Pending</span><span className="ml-auto hidden sm:inline">Average {averageVelocity} / week</span></div><div className="relative h-56 w-full"><div className="absolute inset-0 flex flex-col justify-between pb-7 pt-2">{[maxVelocity, Math.round(maxVelocity * .66), Math.round(maxVelocity * .33), 0].map((value, index) => <div key={`${value}-${index}`} className="flex items-center gap-3"><span className="w-5 text-right font-mono text-[10px] text-[#94a3b8]">{value}</span><div className="h-px flex-1 border-t border-dashed border-[#e2e8f0]" /></div>)}</div><svg className="absolute bottom-7 left-8 right-0 h-[calc(100%-2rem)] w-[calc(100%-2rem)] overflow-visible" viewBox="0 0 800 100" preserveAspectRatio="none" role="img" aria-label="Weekly request velocity chart"><defs><linearGradient id="velocityFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" /><stop offset="100%" stopColor="#4f46e5" stopOpacity="0.015" /></linearGradient></defs><polygon className="velocity-area" points={chartArea} fill="url(#velocityFill)" /><polyline className="velocity-line" points={chartLine} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{chartPoints.map((item, index) => <g key={item.week} onMouseEnter={() => setActiveWeek(index)} onFocus={() => setActiveWeek(index)} onMouseLeave={() => setActiveWeek(null)} tabIndex={0} role="button" aria-label={`${item.week}: ${item.total} requests, ${item.approved} approved, ${item.pending} pending`}><circle className="velocity-point" cx={item.x} cy={item.y} r={activeWeek === index ? 7 : 4.5} fill="white" stroke="#4f46e5" strokeWidth="2.5" /><circle cx={item.x} cy={item.y} r="12" fill="transparent" />{activeWeek === index && <g className="chart-tooltip"><rect x={Math.max(0, Math.min(item.x - 64, 672))} y={Math.max(2, item.y - 43)} width="128" height="34" rx="6" fill="#0b1c30" /><text x={Math.max(64, Math.min(item.x, 736))} y={Math.max(16, item.y - 24)} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">{item.week} · {item.total} total</text><text x={Math.max(64, Math.min(item.x, 736))} y={Math.max(28, item.y - 12)} textAnchor="middle" fill="#cbd5e1" fontSize="9">{item.approved} approved · {item.pending} pending</text></g>}</g>)}</svg><div className="absolute bottom-0 left-8 right-0 flex justify-between text-[10px] text-[#777587]">{velocityData.map((item) => <span key={item.week}>{item.week}</span>)}</div></div></div>}
          {velocityData.length > 0 && <div className="px-5 pb-4 pt-5"><div className="mb-3 flex items-center gap-5 text-xs text-[#777587]"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#4f46e5]" />Total requests</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />Approved</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" />Pending</span><span className="ml-auto hidden sm:inline">Average {averageVelocity} / week</span></div><div className="relative h-56 w-full"><div className="absolute inset-0 flex flex-col justify-between pb-7 pt-2">{Array.from(new Set([maxVelocity, Math.round(maxVelocity * .66), Math.round(maxVelocity * .33), 0])).sort((a, b) => b - a).map((value, index) => <div key={`${value}-${index}`} className="flex items-center gap-3"><span className="w-5 text-right font-mono text-[10px] text-[#94a3b8]">{value}</span><div className="h-px flex-1 border-t border-dashed border-[#e2e8f0]" /></div>)}</div><svg className="absolute bottom-7 left-8 right-0 h-[calc(100%-2rem)] w-[calc(100%-2rem)] overflow-visible" viewBox="0 0 800 100" preserveAspectRatio="none" role="img" aria-label="Weekly request velocity chart"><defs><linearGradient id="velocityFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" /><stop offset="100%" stopColor="#4f46e5" stopOpacity="0.015" /></linearGradient></defs><polygon className="velocity-area" points={chartArea} fill="url(#velocityFill)" /><polyline className="velocity-line" points={chartLine} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{chartPoints.map((item, index) => <g key={item.week} onMouseEnter={() => setActiveWeek(index)} onFocus={() => setActiveWeek(index)} onMouseLeave={() => setActiveWeek(null)} tabIndex={0} role="button" aria-label={`${item.week}: ${item.total} requests, ${item.approved} approved, ${item.pending} pending`}><circle className="velocity-point" cx={item.x} cy={item.y} r={activeWeek === index ? 7 : 4.5} fill="white" stroke="#4f46e5" strokeWidth="2.5" /><circle cx={item.x} cy={item.y} r="12" fill="transparent" />{activeWeek === index && <g className="chart-tooltip"><rect x={Math.max(0, Math.min(item.x - 64, 672))} y={Math.max(2, item.y - 43)} width="128" height="34" rx="6" fill="#0b1c30" /><text x={Math.max(64, Math.min(item.x, 736))} y={Math.max(16, item.y - 24)} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">{item.week} · {item.total} total</text><text x={Math.max(64, Math.min(item.x, 736))} y={Math.max(28, item.y - 12)} textAnchor="middle" fill="#cbd5e1" fontSize="9">{item.approved} approved · {item.pending} pending</text></g>}</g>)}</svg><div className="absolute bottom-0 left-8 right-0 flex justify-between text-[10px] text-[#777587]">{velocityData.map((item) => <span key={item.week}>{item.week}</span>)}</div></div></div>}
        </section>

        <section id="table" className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col justify-between gap-4 border-b border-[#eef2f7] p-5 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><ListFilter size={17} className="text-[#4f46e5]" /><h2 className="text-base font-bold">Request overview</h2></div><p className="mt-1 text-xs text-[#777587]">Prioritize the work that needs attention next.</p></div><Link href="/requests" className="inline-flex items-center gap-1 text-xs font-semibold text-[#4f46e5] hover:text-[#3525cd]">View all requests <ArrowUpRight size={14} /></Link></div>
          <div className="border-b border-[#eef2f7] px-4 pt-3"><div className="flex gap-1 overflow-x-auto" role="tablist">{tabs.map(([value, label, count]) => <button key={value} onClick={() => setStatusFilter(value)} role="tab" aria-selected={statusFilter === value} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition ${statusFilter === value ? 'border-[#4f46e5] text-[#3525cd]' : 'border-transparent text-[#777587] hover:border-slate-300 hover:text-[#0b1c30]'}`}>{label}<span className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${statusFilter === value ? 'bg-[#eff4ff] text-[#3525cd]' : 'bg-slate-100 text-[#777587]'}`}>{count}</span></button>)}</div></div>
          {error && <div className="m-4 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><span className="inline-flex items-center gap-2"><XCircle size={15} />{error}</span><button onClick={() => void reloadRequests()} className="font-semibold underline">Retry</button></div>}
          <div className="overflow-x-auto"><table className="w-full min-w-[58rem] text-left text-sm"><thead className="bg-[#fafbff] text-[10px] uppercase tracking-[0.12em] text-[#777587]"><tr><th className="px-5 py-3">Request</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Assignee</th><th className="px-4 py-3">Updated</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-[#eef2f7]">{isLoading && requests.length === 0 ? Array.from({ length: 5 }).map((_, index) => <tr key={index} className="animate-pulse"><td colSpan={7} className="px-5 py-4"><div className="h-10 rounded-md bg-slate-100" /></td></tr>) : filteredRequests.slice(0, 8).map((request) => <tr key={request.id} className="group transition hover:bg-[#fafbff]"><td className="max-w-[18rem] px-5 py-3.5"><Link href={`/requests/${request.id}`} className="block truncate font-semibold text-[#0b1c30] group-hover:text-[#4f46e5]">{request.title}</Link><span className="mt-1 block font-mono text-[10px] text-[#777587]">{request.id}</span></td><td className="px-4 py-3.5"><div className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eff4ff] text-[10px] font-bold text-[#3525cd]">{request.client.slice(0, 2).toUpperCase()}</span><span className="max-w-[9rem] truncate text-xs font-medium" title={request.client}>{request.client}</span></div></td><td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${statusStyles[request.status] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{getStatusLabel(request.status)}</span></td><td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${request.urgency === 'Critical' ? 'text-rose-700' : request.urgency === 'High' ? 'text-amber-700' : 'text-[#777587]'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{request.urgency}</span></td><td className="px-4 py-3.5"><span className="inline-flex items-center gap-1.5 text-xs text-[#464555]"><Users size={13} className="text-[#94a3b8]" />{request.assignedLead.name || 'Unassigned'}</span></td><td className="whitespace-nowrap px-4 py-3.5 text-xs text-[#777587]">{timeAgo(request.updatedAt || request.createdAt)}</td><td className="px-5 py-3.5 text-right"><Link href={`/requests/${request.id}`} aria-label={`View ${request.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#4f46e5] hover:text-[#3525cd]">View <ArrowUpRight size={14} /></Link></td></tr>)}{!isLoading && filteredRequests.length === 0 && <tr><td colSpan={7} className="px-5 py-14 text-center"><Search size={24} className="mx-auto mb-3 text-slate-300" /><p className="text-sm font-semibold text-[#0b1c30]">No requests match this view</p><p className="mt-1 text-xs text-[#777587]">Try another status or clear the global search.</p><button onClick={() => setStatusFilter('all')} className="mt-4 rounded-md bg-[#eff4ff] px-3 py-2 text-xs font-semibold text-[#3525cd] hover:bg-[#dce9ff]">Reset view</button></td></tr>}</tbody></table></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[58rem] text-left text-sm"><thead className="bg-[#fafbff] text-[10px] uppercase tracking-[0.12em] text-[#777587]"><tr><th className="px-5 py-3">Request</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Assignee</th><th className="px-4 py-3">Updated</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-[#eef2f7]">{isLoading && requests.length === 0 ? Array.from({ length: 1 }).map((_, index) => <tr key={index} className="animate-pulse"><td colSpan={7} className="px-5 py-4"><div className="h-10 rounded-md bg-slate-100" /></td></tr>) : filteredRequests.slice(0, 8).map((request) => <tr key={request.id} className="group transition hover:bg-[#fafbff]"><td className="max-w-[18rem] px-5 py-3.5"><Link href={`/requests/${request.id}`} className="block truncate font-semibold text-[#0b1c30] group-hover:text-[#4f46e5]">{request.title}</Link><span className="mt-1 block font-mono text-[10px] text-[#777587]">{request.id}</span></td><td className="px-4 py-3.5"><div className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eff4ff] text-[10px] font-bold text-[#3525cd]">{request.client.slice(0, 2).toUpperCase()}</span><span className="max-w-[9rem] truncate text-xs font-medium" title={request.client}>{request.client}</span></div></td><td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${statusStyles[request.status] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{getStatusLabel(request.status)}</span></td><td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${request.urgency === 'Critical' ? 'text-rose-700' : request.urgency === 'High' ? 'text-amber-700' : 'text-[#777587]'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{request.urgency}</span></td><td className="px-4 py-3.5"><span className="inline-flex items-center gap-1.5 text-xs text-[#464555]"><Users size={13} className="text-[#94a3b8]" />{request.assignedLead.name || 'Unassigned'}</span></td><td className="whitespace-nowrap px-4 py-3.5 text-xs text-[#777587]">{timeAgo(request.updatedAt || request.createdAt)}</td><td className="px-5 py-3.5 text-right"><Link href={`/requests/${request.id}`} aria-label={`View ${request.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#4f46e5] hover:text-[#3525cd]">View <ArrowUpRight size={14} /></Link></td></tr>)}{!isLoading && filteredRequests.length === 0 && <tr><td colSpan={7} className="px-5 py-14 text-center"><Search size={24} className="mx-auto mb-3 text-slate-300" /><p className="text-sm font-semibold text-[#0b1c30]">No requests match this view</p><p className="mt-1 text-xs text-[#777587]">Try another status or clear the global search.</p><button onClick={() => setStatusFilter('all')} className="mt-4 rounded-md bg-[#eff4ff] px-3 py-2 text-xs font-semibold text-[#3525cd] hover:bg-[#dce9ff]">Reset view</button></td></tr>}</tbody></table></div>
          <div className="flex items-center justify-between border-t border-[#eef2f7] px-5 py-3 text-[11px] text-[#777587]"><span>Showing {Math.min(filteredRequests.length, 8)} of {filteredRequests.length} requests</span><span className="inline-flex items-center gap-1"><FileCheck2 size={13} />Live data</span></div>
        </section>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return <LoginScreen />;
}
