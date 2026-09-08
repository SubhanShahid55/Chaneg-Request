'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { SlideoverDrawer } from '@/components/SlideoverDrawer';
import { CommandPalette } from '@/components/CommandPalette';
import { Toast } from '@/components/Toast';
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal';
import { useApp, AppProvider, getStatusLabel } from '@/lib/store';

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

function RequestsContent() {
  const { requests, setIsSlideoverOpen } = useApp();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

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

  const getPriorityColor = (urgency: string) => {
    switch (urgency) {
      case 'Critical': return 'bg-red-50 text-red-700 border-red-200';
      case 'High': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Low': return 'bg-slate-50 text-slate-700 border-slate-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
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
      default: return 'bg-amber-50 text-amber-700 border-amber-200'; // pending/reviewing
    }
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4f46e5]">list_alt</span>
                All Requests
              </h1>
              <p className="text-sm text-[#464555] mt-1">Manage and track all client change requests.</p>
            </div>
            <button
              onClick={() => setIsSlideoverOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200 text-xs font-semibold active:scale-95 group"
            >
              <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform duration-300">add</span>
              <span>New Request</span>
              <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono font-medium">N</kbd>
            </button>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#fafbff]">
              <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'needs_review', label: 'Needs review' },
                  { id: 'awaiting_approval', label: 'Awaiting approval' },
                  { id: 'in_progress', label: 'In progress' },
                  { id: 'completed', label: 'Completed' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
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
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] w-full sm:w-64 transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-[11px] uppercase tracking-wider text-[#777587] bg-white">
                    <th className="py-3.5 px-4 font-semibold">Request</th>
                    <th className="py-3.5 px-4 font-semibold">Client</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Priority</th>
                    <th className="py-3.5 px-4 font-semibold">Estimate</th>
                    <th className="py-3.5 px-4 font-semibold">Updated</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-[#e2e8f0]/60">
                  {filteredRequests.map(req => (
                    <tr key={req.id} className="hover:bg-[#fafbff] transition-colors group">
                      <td className="py-3.5 px-4">
                        <Link href={`/requests/${req.id}`} className="font-mono text-xs text-[#4f46e5] font-semibold hover:underline">
                          {req.id}
                        </Link>
                        <div className="text-[#0b1c30] font-medium mt-0.5 truncate max-w-[250px]" title={req.title}>{req.title}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img src={req.clientContact.avatarUrl} alt={req.clientContact.name} className="w-8 h-8 rounded-full bg-slate-200 border border-slate-200 object-cover" />
                          <div className="flex flex-col">
                            <span className="font-medium text-[#0b1c30] text-sm">{req.clientContact.name}</span>
                            <span className="text-[#777587] text-[11px]">{req.client}</span>
                          </div>
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
                  ))}
                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-[#777587]">
                          <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">search_off</span>
                          <p className="text-sm font-medium">No requests found</p>
                          <p className="text-xs mt-1">Try adjusting your search or filters.</p>
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
        <div className="max-w-[75rem] mx-auto px-4 md:px-6 flex items-center justify-center text-xs text-[#777587]">
          <span>© 2025 ChangeFlow</span>
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
