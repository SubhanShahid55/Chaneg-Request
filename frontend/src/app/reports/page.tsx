'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Toast } from '@/components/Toast';
import { CommandPalette } from '@/components/CommandPalette';
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal';
import { useApp, AppProvider, getStatusLabel } from '@/lib/store';

function ReportsContent() {
  const { requests, isLoading, error, reloadRequests } = useApp();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const pending = requests.filter((request) => ['draft', 'pending', 'reviewing'].includes(request.status)).length;
  const awaitingClient = requests.filter((request) => request.status === 'awaiting_approval').length;
  const approved = requests.filter((request) => request.status === 'approved').length;
  const inProgress = requests.filter((request) => request.status === 'in_progress').length;
  const completed = requests.filter((request) => request.status === 'completed').length;
  const totalValue = requests.reduce((sum, request) => sum + request.estimatedCost, 0);

  return (
    <div className="min-h-screen bg-[#f8f9ff] font-sans text-[#0b1c30]">
      <Header />
      <ProfileSettingsModal />
      <Toast />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />

      <main className="mx-auto flex w-full max-w-[75rem] flex-col gap-6 px-4 pb-24 pt-20 md:px-6">
        <div>
          <Link href="/dashboard" className="text-xs font-semibold text-[#4f46e5] hover:underline inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[#0b1c30]">Reports and Analytics</h1>
          <p className="mt-1 text-sm text-[#464555]">A summary of request volume, approvals, and portfolio value.</p>
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

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-[#777587]">Total Requests</p>
            <p className="mt-2 text-3xl font-bold font-mono text-[#0b1c30]">{requests.length}</p>
            <p className="mt-1 text-xs text-[#777587]">{approved} approved · {completed} completed</p>
          </div>
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-[#777587]">Needs Scope / Review</p>
            <p className="mt-2 text-3xl font-bold font-mono text-amber-700">{pending}</p>
            <p className="mt-1 text-xs text-[#777587]">Internal team action needed</p>
          </div>
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-[#777587]">Awaiting Client</p>
            <p className="mt-2 text-3xl font-bold font-mono text-[#3525cd]">{awaitingClient}</p>
            <p className="mt-1 text-xs text-[#777587]">Tokens dispatched to clients</p>
          </div>
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-[#777587]">Total Pipeline Value</p>
            <p className="mt-2 text-3xl font-bold font-mono text-emerald-700">${totalValue.toLocaleString()}</p>
            <p className="mt-1 text-xs text-[#777587]">{inProgress} currently in progress</p>
          </div>
        </div>

        {/* Requests Status Table */}
        <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
          <div className="border-b border-[#e2e8f0] p-4 flex items-center justify-between">
            <h2 className="font-semibold text-[#0b1c30]">Change Request Portfolio</h2>
            <Link href="/requests" className="text-xs font-semibold text-[#4f46e5] hover:underline">
              View All in Requests Table
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-[#e2e8f0] bg-[#fafbff] text-xs uppercase text-[#777587]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Request</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Estimate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {isLoading && requests.length === 0 ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                  Array.from({ length: 1 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-36" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                      <td className="px-4 py-3"><div className="h-5 bg-slate-200 rounded w-20" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    </tr>
                  ))
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="hover:bg-[#fafbff] transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/requests/${request.id}`} className="font-medium text-[#4f46e5] hover:underline">
                          {request.title}
                        </Link>
                        <div className="font-mono text-xs text-[#777587]">{request.id}</div>
                      </td>
                      <td className="px-4 py-3 text-[#0b1c30] font-medium">{request.client}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md bg-[#eff4ff] px-2 py-0.5 text-xs font-semibold text-[#3525cd]">
                          {getStatusLabel(request.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-[#0b1c30]">
                        ${request.estimatedCost.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
                {!isLoading && requests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-[#777587]">
                      No report data available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <p className="text-sm text-[#777587]">{approved} requests have been approved.</p>
      </main>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <AppProvider>
      <ReportsContent />
    </AppProvider>
  );
}
