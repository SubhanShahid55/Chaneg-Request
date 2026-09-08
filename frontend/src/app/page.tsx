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
  const completedCount = requests.filter((r) => r.status === 'completed').length;
  

  const velocityData = [
    { week: 'W1', val: 5, pending: 2 }, { week: 'W2', val: 7, pending: 3 }, 
    { week: 'W3', val: 6, pending: 1 }, { week: 'W4', val: 9, pending: 2 }, 
    { week: 'W5', val: 8, pending: 3 }, { week: 'W6', val: 10, pending: 2 }, 
    { week: 'W1', val: 5, pending: 2 }, { week: 'W2', val: 7, pending: 3 },
    { week: 'W3', val: 6, pending: 1 }, { week: 'W4', val: 9, pending: 2 },
    { week: 'W5', val: 8, pending: 3 }, { week: 'W6', val: 10, pending: 2 },
    { week: 'W7', val: 9, pending: 4 }, { week: 'W8', val: 12, pending: 2 }
  ];
  const maxTotal = 14;
  const polylinePoints = velocityData.map((d, i) => `${((i + 0.5) / velocityData.length) * 100},${100 - (d.val / maxTotal) * 100}`).join(' ');

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
              <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4f46e5]">dashboard</span>
                Dashboard
              </h1>
              <p className="text-sm text-[#464555] mt-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">lightbulb</span>
                Overview of all active client requests, approvals, and their progress.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-[#e2e8f0] text-[#0b1c30] hover:bg-[#eff4ff] shadow-sm transition-all text-xs font-semibold"
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-[#e2e8f0] text-[#0b1c30] hover:bg-[#eff4ff] hover:border-[#d3e4fe] hover:-translate-y-0.5 shadow-sm hover:shadow transition-all duration-200 text-xs font-semibold active:scale-95 group"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">download</span>
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => setIsSlideoverOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white shadow-sm shadow-indigo-500/20 transition-all text-xs font-semibold active:scale-95"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200 text-xs font-semibold active:scale-95 group"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform duration-300">add</span>
                <span>New Request</span>
                <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono font-medium">
                  N
                </kbd>
              </button>
            </div>
          </div>

          {/* Stat Cards Matrix */}
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Needs my review */}
            <div 
              onClick={() => setStatusFilter('needs_review')}
              className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between cursor-pointer hover:border-amber-400 transition-all group"
              
              
            <div
              onClick={() => setStatusFilter(statusFilter === 'needs_review' ? 'all' : 'needs_review')}
              className={`bg-white rounded-xl p-5 border shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 group transform active:scale-95 ${
                statusFilter === 'needs_review'
                  ? 'border-amber-500 ring-1 ring-amber-500 shadow-amber-100'
                  : 'border-[#e2e8f0] hover:border-amber-300 hover:-translate-y-0.5 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#464555]">Needs my review</span>
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <div className={`p-2 rounded-lg transition-transform duration-300 ${
                  statusFilter === 'needs_review' 
                    ? 'bg-amber-100 text-amber-700 scale-110' 
                  statusFilter === 'needs_review'
                    ? 'bg-amber-100 text-amber-700 scale-110'
                    : 'bg-amber-50 text-amber-600 group-hover:scale-110 group-hover:-rotate-3'
                }`}>
                  <span className="material-symbols-outlined text-xl">rate_review</span>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-[#0b1c30] tracking-tight group-hover:text-amber-600 transition-colors">
                <span className={`text-3xl font-bold tracking-tight transition-colors ${
                  statusFilter === 'needs_review' ? 'text-amber-600' : 'text-[#0b1c30] group-hover:text-amber-600'
                }`}>
                  {needsReviewCount}
                </span>
              </div>
            </div>

            {/* Waiting for client */}
            <div 
              onClick={() => setStatusFilter('awaiting_approval')}
              className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-400 transition-all group"
              
              
            <div
              onClick={() => setStatusFilter(statusFilter === 'awaiting_approval' ? 'all' : 'awaiting_approval')}
              className={`bg-white rounded-xl p-5 border shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 group transform active:scale-95 ${
                statusFilter === 'awaiting_approval'
                  ? 'border-blue-500 ring-1 ring-blue-500 shadow-blue-100'
                  : 'border-[#e2e8f0] hover:border-blue-300 hover:-translate-y-0.5 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#464555]">Waiting for client</span>
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <div className={`p-2 rounded-lg transition-transform duration-300 ${
                  statusFilter === 'awaiting_approval' 
                    ? 'bg-blue-100 text-blue-700 scale-110' 
                  statusFilter === 'awaiting_approval'
                    ? 'bg-blue-100 text-blue-700 scale-110'
                    : 'bg-blue-50 text-blue-600 group-hover:scale-110 group-hover:rotate-6'
                }`}>
                  <span className="material-symbols-outlined text-xl">hourglass_top</span>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-[#0b1c30] tracking-tight group-hover:text-blue-600 transition-colors">
                
                <span className={`text-3xl font-bold tracking-tight transition-colors ${
                  statusFilter === 'awaiting_approval' ? 'text-blue-600' : 'text-[#0b1c30] group-hover:text-blue-600'
                }`}>
                  {awaitingApprovalCount}
                </span>
              </div>
            </div>

            {/* In progress */}
            <div 
              onClick={() => setStatusFilter('in_progress')}
              className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between cursor-pointer hover:border-indigo-400 transition-all group"
              
              
            <div
              onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
              className={`bg-white rounded-xl p-5 border shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 group transform active:scale-95 ${
                statusFilter === 'in_progress'
                  ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-indigo-100'
                  : 'border-[#e2e8f0] hover:border-indigo-300 hover:-translate-y-0.5 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#464555]">In progress</span>
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <div className={`p-2 rounded-lg transition-transform duration-300 ${
                  statusFilter === 'in_progress' 
                    ? 'bg-indigo-100 text-indigo-700 scale-110' 
                  statusFilter === 'in_progress'
                    ? 'bg-indigo-100 text-indigo-700 scale-110'
                    : 'bg-indigo-50 text-indigo-600 group-hover:scale-110 group-hover:rotate-12'
                }`}>
                  <span className="material-symbols-outlined text-xl">engineering</span>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-[#0b1c30] tracking-tight group-hover:text-indigo-600 transition-colors">
                
                <span className={`text-3xl font-bold tracking-tight transition-colors ${
                  statusFilter === 'in_progress' ? 'text-indigo-600' : 'text-[#0b1c30] group-hover:text-indigo-600'
                }`}>
                  {inProgressCount}
                </span>
              </div>
            </div>

            {/* Completed this month */}
            <div 
              onClick={() => setStatusFilter('completed')}
              className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between cursor-pointer hover:border-emerald-400 transition-all group"
              
              
            <div
              onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
              className={`bg-white rounded-xl p-5 border shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 group transform active:scale-95 ${
                statusFilter === 'completed'
                  ? 'border-emerald-500 ring-1 ring-emerald-500 shadow-emerald-100'
                  : 'border-[#e2e8f0] hover:border-emerald-300 hover:-translate-y-0.5 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#464555]">Completed this month</span>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <div className={`p-2 rounded-lg transition-transform duration-300 ${
                  statusFilter === 'completed' 
                    ? 'bg-emerald-100 text-emerald-700 scale-110' 
                  statusFilter === 'completed'
                    ? 'bg-emerald-100 text-emerald-700 scale-110'
                    : 'bg-emerald-50 text-emerald-600 group-hover:scale-110 group-hover:-rotate-12'
                }`}>
                  <span className="material-symbols-outlined text-xl">check_circle</span>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-[#0b1c30] tracking-tight group-hover:text-emerald-600 transition-colors">
                
                <span className={`text-3xl font-bold tracking-tight transition-colors ${
                  statusFilter === 'completed' ? 'text-emerald-600' : 'text-[#0b1c30] group-hover:text-emerald-600'
                }`}>
                  {completedCount}
                </span>
              </div>
            </div>
          </div>
          

          {/* Trend Chart Row */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-sm mt-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-[#0b1c30]">Weekly Velocity</h3>
              <Link href="/reports" className="text-sm font-medium text-[#4f46e5] hover:text-[#3525cd] flex items-center gap-1 transition-colors">
                View full reports &rarr;
              </Link>
            </div>
            <div className="h-40 flex items-end justify-between space-x-2 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 z-0">
                <div className="border-b border-[#e2e8f0] border-dashed w-full" />
                <div className="border-b border-[#e2e8f0] border-dashed w-full" />
                <div className="border-b border-[#e2e8f0] border-dashed w-full" />
                <div className="border-b border-[#e2e8f0] w-full" />
              </div>

              {/* Slope Line SVG */}
              <svg className="absolute inset-0 w-full h-[calc(100%-1.5rem)] pointer-events-none z-20" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path 
                  d="M 5,75 C 20,60 30,85 45,65 S 70,60 95,20" 
                <polyline 
                <polyline
                  points={polylinePoints}
                  fill="none" 
                  stroke="#4f46e5" 
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-sm opacity-80"
                />
                <circle cx="95" cy="20" r="1.5" fill="#4f46e5" className="shadow-sm" />
                {velocityData.map((d, i) => (
                  <circle 
                    key={i} 
                    cx={`${((i + 0.5) / velocityData.length) * 100}`} 
                    cy={`${100 - (d.val / maxTotal) * 100}`} 
                    r="1.5" 
                  <circle
                    key={i}
                    cx={`${((i + 0.5) / velocityData.length) * 100}`}
                    cy={`${100 - (d.val / maxTotal) * 100}`}
                    r="1.5"
                    fill="#ffffff"
                    stroke="#4f46e5"
                    strokeWidth="0.5"
                    className="shadow-sm" 
                    className="shadow-sm"
                  />
                ))}
              </svg>

              {[
                { week: 'W1', val: 5, pending: 2 }, { week: 'W2', val: 7, pending: 3 }, 
                { week: 'W3', val: 6, pending: 1 }, { week: 'W4', val: 9, pending: 2 }, 
                { week: 'W5', val: 8, pending: 3 }, { week: 'W6', val: 10, pending: 2 }, 
                { week: 'W7', val: 9, pending: 4 }, { week: 'W8', val: 12, pending: 2 }
              ].map((d, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end group relative h-full z-10">
                  <div className="w-full flex flex-col justify-end space-y-0.5 h-[calc(100%-1.5rem)] px-1 sm:px-4 lg:px-8 pb-1">
              {velocityData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end group relative h-full z-30">
                  {/* Custom HTML Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-[#0b1c30] text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-200 pointer-events-none z-50 shadow-xl border border-white/10">
                    <div className="font-semibold mb-1 text-center border-b border-white/10 pb-1">{d.week} Breakdown</div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-white/70 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#dce9ff]"></span> Pending:</span>
                      <span className="font-medium text-white">{d.pending}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] mt-0.5">
                      <span className="text-white/70 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]"></span> Approved:</span>
                      <span className="font-medium text-white">{d.val}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] mt-1 pt-1 border-t border-white/10">
                      <span className="text-white/70 font-medium">Total Volume:</span>
                      <span className="font-bold text-[#a5b4fc]">{d.pending + d.val}</span>
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0b1c30] rotate-45 border-r border-b border-white/10" />
                  </div>

                  <div className="w-full flex flex-col justify-end space-y-0.5 h-[calc(100%-1.5rem)] px-1 sm:px-4 lg:px-8 pb-1 relative z-10">
                    <div 
                      className="w-full bg-[#dce9ff] transition-all duration-300 hover:opacity-80 rounded-t-sm" 
                      style={{ height: `${(d.pending / 14) * 100}%` }}
                      title={`Pending: ${d.pending}`}
                      className="w-full bg-[#dce9ff] transition-all duration-300 group-hover:bg-[#c2d6ff] rounded-t-sm" 
                    <div
                      className="w-full bg-[#dce9ff] transition-all duration-300 group-hover:bg-[#c2d6ff] rounded-t-sm"
                      style={{ height: `${(d.pending / maxTotal) * 100}%` }}
                    />
                    <div 
                      className="w-full bg-[#4f46e5] rounded-b-sm transition-all duration-300 hover:opacity-80" 
                      style={{ height: `${(d.val / 14) * 100}%` }}
                      title={`Approved: ${d.val}`}
                      className="w-full bg-[#4f46e5] rounded-b-sm transition-all duration-300 group-hover:bg-[#3525cd]" 
                    <div
                      className="w-full bg-[#4f46e5] rounded-b-sm transition-all duration-300 group-hover:bg-[#3525cd]"
                      style={{ height: `${(d.val / maxTotal) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-center text-[#464555] font-medium h-6 flex items-center justify-center">
                  <div className="text-xs text-center text-[#464555] font-medium h-6 flex items-center justify-center transition-colors group-hover:text-[#0b1c30] group-hover:font-bold">
                    {d.week}
                  </div>
                </div>
              ))}
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 whitespace-nowrap flex items-center gap-1.5 ${
                      statusFilter === tab.val
                        ? 'bg-[#dce9ff] text-[#0b1c30] font-semibold'
                        : 'text-[#464555] hover:bg-[#e5eeff] hover:text-[#0b1c30]'
                        ? 'bg-[#dce9ff] text-[#0b1c30] font-semibold shadow-inner'
                        : 'text-[#464555] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-white text-[10px] text-[#464555] border border-[#d3e4fe]">
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] border transition-colors ${
                      statusFilter === tab.val ? 'bg-white text-[#4f46e5] border-[#d3e4fe]' : 'bg-white text-[#464555] border-[#e2e8f0]'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

          {/* Recent Requests Summary */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#fafbff]">
              <h3 className="font-semibold text-[#0b1c30]">Recent Requests</h3>
              <Link href="/requests" className="text-sm font-medium text-[#4f46e5] hover:text-[#3525cd] transition-colors">
                View all requests &rarr;
              </Link>
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
                  <tr className="border-b border-[#e2e8f0] text-[11px] uppercase tracking-wider text-[#777587] bg-white">
                    <th className="py-3 px-4 font-semibold">Request</th>
                    <th className="py-3 px-4 font-semibold">Client</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 text-center font-semibold">Action</th>
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
                <tbody className="text-sm divide-y divide-[#e2e8f0]/60">
                  {requests.slice(0, 5).map((req) => (
                    <tr key={req.id} className="hover:bg-[#fafbff] transition-colors group">
                      <td className="py-3 px-4">
                        <Link href={`/requests/${req.id}`} className="font-mono text-xs text-[#4f46e5] font-semibold hover:underline">
                          {req.id}
                        </Link>
                        <div className="text-[#0b1c30] font-medium mt-0.5 truncate max-w-[200px]">{req.title}</div>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#e2dfff] text-[#3323cc] flex items-center justify-center font-bold text-xs shrink-0">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                            {req.client.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-[#0b1c30] truncate">
                            {req.client}
                          </span>
                          <span className="font-medium text-[#464555]">{req.client}</span>
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
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
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
                      <td className="py-3 px-4 text-center">
                        <Link href={`/requests/${req.id}`} className="text-[#4f46e5] font-semibold hover:text-[#3525cd] hover:underline transition-colors">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {filteredRequests.length === 0 && (
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-[#777587]">
                        No change requests match your filters.
                      <td colSpan={4} className="py-8 text-center text-sm text-[#777587]">
                        No recent requests found.
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
                  className="px-3 py-1.5 rounded-lg bg-[#eff4ff] text-[#3525cd] font-semibold hover:bg-[#dce9ff] active:scale-95 transition-all duration-200"
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
