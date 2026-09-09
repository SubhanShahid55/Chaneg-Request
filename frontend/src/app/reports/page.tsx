'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Toast } from '@/components/Toast';
import { CommandPalette } from '@/components/CommandPalette';
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal';
import { useApp, AppProvider, getStatusLabel } from '@/lib/store';

function ReportsContent() {
  const { requests, isLoading, error } = useApp();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const pending = requests.filter((request) => ['draft', 'pending', 'reviewing'].includes(request.status)).length;
  const approved = requests.filter((request) => request.status === 'approved').length;
  const totalValue = requests.reduce((sum, request) => sum + request.estimatedCost, 0);

  return (
    <div className="min-h-screen bg-[#f8f9ff] font-sans text-[#0b1c30]">
      <Header />
      <ProfileSettingsModal />
      <Toast />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      <main className="mx-auto flex w-full max-w-[75rem] flex-col gap-6 px-4 pb-24 pt-20 md:px-6">
        <div>
          <Link href="/" className="text-sm font-medium text-[#4f46e5] hover:underline">Back to dashboard</Link>
          <h1 className="mt-3 text-2xl font-bold">Reports and Analytics</h1>
          <p className="mt-1 text-sm text-[#464555]">A summary of request volume, approvals, and estimated value.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm"><p className="text-sm text-[#777587]">Total requests</p><p className="mt-2 text-3xl font-bold">{requests.length}</p></div>
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm"><p className="text-sm text-[#777587]">Needs review</p><p className="mt-2 text-3xl font-bold">{pending}</p></div>
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm"><p className="text-sm text-[#777587]">Estimated value</p><p className="mt-2 text-3xl font-bold">${totalValue.toLocaleString()}</p></div>
        </div>
        <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
          <div className="border-b border-[#e2e8f0] p-4"><h2 className="font-semibold">Request status</h2></div>
          {isLoading && <p className="p-8 text-center text-sm text-[#777587]">Loading live reports...</p>}
          {error && <p className="p-8 text-center text-sm text-[#ba1a1a]">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-[#e2e8f0] bg-[#fafbff] text-xs uppercase text-[#777587]"><tr><th className="px-4 py-3">Request</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Estimate</th></tr></thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {requests.map((request) => <tr key={request.id}><td className="px-4 py-3"><Link href={`/requests/${request.id}`} className="font-medium text-[#4f46e5] hover:underline">{request.title}</Link></td><td className="px-4 py-3">{request.client}</td><td className="px-4 py-3">{getStatusLabel(request.status)}</td><td className="px-4 py-3">${request.estimatedCost.toLocaleString()}</td></tr>)}
                {!isLoading && !error && requests.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-sm text-[#777587]">No report data is available yet.</td></tr>}
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
  return <AppProvider><ReportsContent /></AppProvider>;
}
