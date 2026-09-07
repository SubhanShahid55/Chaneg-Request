'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { SlideoverDrawer } from '@/components/SlideoverDrawer';
import { CommandPalette } from '@/components/CommandPalette';
import { Toast } from '@/components/Toast';
import { NextActionBadge } from '@/components/NextActionBadge';
import { useApp, AppProvider, getStatusLabel } from '@/lib/store';
import { ChangeRequest } from '@/lib/types';
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal';
import { DiskChart } from '@/components/DiskChart';

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  return 'Over a year ago';
}

function DashboardContent() {
  const { requests, setIsSlideoverOpen, showToast, globalSearchQuery } = useApp();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Derived filtered requests
  const filteredRequests = requests.filter((r) => {
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

    const q = globalSearchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      r.id.toLowerCase().includes(q) ||
      r.client.toLowerCase().includes(q) ||
      r.project.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  const needsReviewCount = requests.filter(r => ['pending', 'reviewing', 'draft'].includes(r.status)).length;
  const awaitingApprovalCount = requests.filter(r => r.status === 'awaiting_approval').length;
  const inProgressCount = requests.filter(r => r.status === 'in_progress').length;
  const completedCount = requests.filter(r => r.status === 'completed').length;

  const handleExportCSV = () => {
    const headers = ['ID', 'Client', 'Project', 'Title', 'Channel', 'Urgency', 'Status', 'Hours', 'Cost', 'Sprint', 'Token'];
    const rows = filteredRequests.map((r) => [
      r.id,
      `"${r.client}"`,
      `"${r.project}"`,
      `"${r.title.replace(/"/g, '""')}"`,
      r.channel,
      r.urgency,
      r.status,
      r.estimatedHours,
      r.estimatedCost,
      `"${r.targetSprint}"`,
      r.approvalToken,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'change-requests-export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV Generation Complete', 'change-requests-export.csv downloaded successfully.');
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
          {/* Top Action & Title Row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
                Change Requests
              </h1>
              <p className="text-sm text-[#464555] mt-1">
                Track and manage client change requests.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-[#e2e8f0] text-[#0b1c30] hover:bg-[#eff4ff] shadow-sm transition-all text-xs font-semibold"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => setIsSlideoverOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white shadow-sm shadow-indigo-500/20 transition-all text-xs font-semibold active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                <span>New Request</span>
                <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono font-medium">
                  N
                </kbd>
              </button>
            </div>
          </div>

          {/* Stat Cards Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Needs my review */}
            <div 
              onClick={() => setStatusFilter('needs_review')}
              className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between cursor-pointer hover:border-amber-400 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#464555]">Needs my review</span>
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <span className="material-symbols-outlined text-xl">rate_review</span>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-[#0b1c30] tracking-tight group-hover:text-amber-600 transition-colors">
                  {needsReviewCount}
                </span>
              </div>
            </div>

            {/* Waiting for client */}
            <div 
              onClick={() => setStatusFilter('awaiting_approval')}
              className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-400 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#464555]">Waiting for client</span>
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <span className="material-symbols-outlined text-xl">hourglass_top</span>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-[#0b1c30] tracking-tight group-hover:text-blue-600 transition-colors">
                  {awaitingApprovalCount}
                </span>
              </div>
            </div>

            {/* In progress */}
            <div 
              onClick={() => setStatusFilter('in_progress')}
              className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between cursor-pointer hover:border-indigo-400 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#464555]">In progress</span>
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <span className="material-symbols-outlined text-xl">engineering</span>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-[#0b1c30] tracking-tight group-hover:text-indigo-600 transition-colors">
                  {inProgressCount}
                </span>
              </div>
            </div>

            {/* Completed this month */}
            <div 
              onClick={() => setStatusFilter('completed')}
              className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between cursor-pointer hover:border-emerald-400 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#464555]">Completed this month</span>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <span className="material-symbols-outlined text-xl">check_circle</span>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-[#0b1c30] tracking-tight group-hover:text-emerald-600 transition-colors">
                  {completedCount}
                </span>
              </div>
            </div>
          </div>
          
          {/* Mini Graph and Reports Link */}
          <div className="flex flex-col sm:flex-row items-end justify-between mt-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[#777587] font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">monitoring</span>
                8-week request volume
              </span>
              <div className="flex items-end gap-1 h-12">
                {[
                  { week: 'W1', val: 7 }, { week: 'W2', val: 11 }, { week: 'W3', val: 9 }, 
                  { week: 'W4', val: 10 }, { week: 'W5', val: 11 }, { week: 'W6', val: 11 }, 
                  { week: 'W7', val: 13 }, { week: 'W8', val: 10 }
                ].map((d, i) => (
                  <div key={i} className="flex flex-col items-center justify-end group">
                    <div 
                      className="w-4 sm:w-6 bg-[#dce9ff] hover:bg-[#4f46e5] rounded-t-sm transition-colors duration-200" 
                      style={{ height: `${(d.val / 13) * 100}%` }}
                      title={`${d.week}: ${d.val} requests`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-end gap-6">
              <div className="hidden md:block">
                <DiskChart 
                  data={[
                    { label: 'Reviewing', value: needsReviewCount, color: '#f59e0b' },
                    { label: 'Awaiting', value: awaitingApprovalCount, color: '#3b82f6' },
                    { label: 'In Progress', value: inProgressCount, color: '#4f46e5' },
                    { label: 'Completed', value: completedCount, color: '#10b981' }
                  ]}
                  size={60}
                  thickness={12}
                />
              </div>
              <Link href="/reports" className="text-sm font-medium text-[#4f46e5] hover:text-[#3525cd] flex items-center gap-1 transition-colors mb-1">
                View full reports &rarr;
              </Link>
            </div>
          </div>

          {/* Filter & Table Container */}
          <div id="table" className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden flex flex-col">
            {/* Filter Bar Header */}
            <div className="p-4 border-b border-[#e2e8f0] flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-[#fafbff]">
              {/* Status Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
                {[
                  { label: 'All', val: 'all', count: requests.length },
                  { label: 'Needs review', val: 'needs_review', count: needsReviewCount },
                  { label: 'Awaiting approval', val: 'awaiting_approval', count: awaitingApprovalCount },
                  { label: 'In progress', val: 'in_progress', count: inProgressCount },
                  { label: 'Completed', val: 'completed', count: completedCount },
                ].map((tab) => (
                  <button
                    key={tab.val}
                    onClick={() => setStatusFilter(tab.val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      statusFilter === tab.val
                        ? 'bg-[#dce9ff] text-[#0b1c30] font-semibold'
                        : 'text-[#464555] hover:bg-[#e5eeff] hover:text-[#0b1c30]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-white text-[10px] text-[#464555] border border-[#d3e4fe]">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

            </div>

            {/* Table Rows */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-[#f8f9ff] text-[11px] font-semibold text-[#464555] uppercase tracking-wider">
                    <th className="py-3 px-4">Request</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4 text-right">Estimate</th>
                    <th className="py-3 px-4 text-right">Updated</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9] text-xs">
                  {filteredRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-[#f8f9ff] transition-colors group"
                    >
                      {/* Request */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-col">
                          <Link href={`/requests/${req.id}`} className="font-mono font-bold text-[#4f46e5] hover:underline">
                            {req.id}
                          </Link>
                          <span className="text-[#0b1c30] truncate mt-0.5" title={req.title}>
                            {req.title}
                          </span>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#e2dfff] text-[#3323cc] flex items-center justify-center font-bold text-xs shrink-0">
                            {req.client.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-[#0b1c30] truncate">
                            {req.client}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            req.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : req.status === 'awaiting_approval'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : req.status === 'in_progress'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : req.status === 'declined'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              req.status === 'completed'
                                ? 'bg-emerald-600'
                                : req.status === 'awaiting_approval'
                                ? 'bg-blue-600'
                                : req.status === 'in_progress'
                                ? 'bg-indigo-600'
                                : req.status === 'declined'
                                ? 'bg-rose-600'
                                : 'bg-amber-500 animate-pulse'
                            }`}
                          />
                          {getStatusLabel(req.status)}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            req.urgency === 'Critical'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold'
                              : req.urgency === 'High'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200 font-semibold'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              req.urgency === 'Critical'
                                ? 'bg-rose-600 animate-pulse'
                                : req.urgency === 'High'
                                ? 'bg-amber-600'
                                : 'bg-slate-400'
                            }`}
                          />
                          {req.urgency}
                        </span>
                      </td>

                      {/* Estimate */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap text-[#0b1c30]">
                        <span className="font-mono font-bold">${req.estimatedCost.toLocaleString()}</span>
                        <span className="mx-1 text-[#cbd5e1]">&middot;</span>
                        <span className="font-mono text-[#464555]">{req.estimatedHours}h</span>
                      </td>

                      {/* Updated */}
                      <td className="py-3.5 px-4 text-right text-[#464555]">
                        {req.updatedAt || req.createdAt ? timeAgo(req.updatedAt || req.createdAt) : 'N/A'}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <Link
                          href={`/requests/${req.id}`}
                          className="text-[#4f46e5] font-semibold hover:text-[#3525cd] transition-colors hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-[#777587]">
                        No change requests match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer / Summary */}
            <div className="p-4 border-t border-[#e2e8f0] bg-[#fafbff] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#464555]">
              <span>
                Showing <strong>{filteredRequests.length}</strong> of <strong>{requests.length}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSlideoverOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#eff4ff] text-[#3525cd] font-semibold hover:bg-[#dce9ff] transition-colors"
                >
                  + New request
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-[#e2e8f0] mt-12 py-6">
        <div className="max-w-[75rem] mx-auto px-4 md:px-6 flex items-center justify-center text-xs text-[#777587]">
          <span>© 2025 ChangeFlow</span>
        </div>
      </footer>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppProvider>
      <DashboardContent />
    </AppProvider>
  );
}
