'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { SlideoverDrawer } from '@/components/SlideoverDrawer';
import { Toast } from '@/components/Toast';
import { useApp, AppProvider, getStatusLabel } from '@/lib/store';
import { RequestStatus, ScopeDeliverable } from '@/lib/types';
import { StatusStepper } from '@/components/StatusStepper';
import { NextActionBadge } from '@/components/NextActionBadge';

function RequestDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { getRequestById, updateRequest, updateStatus, showToast } = useApp();

  const request = getRequestById(id);
  const req = request || getRequestById('CR-1042')!;

  const [hourlyRate, setHourlyRate] = useState<number>(req?.hourlyRate || 150);
  const [deliverables, setDeliverables] = useState<ScopeDeliverable[]>(req?.deliverables || []);
  const [targetSprint, setTargetSprint] = useState(req?.targetSprint || 'Sprint 38 (Q3 Release)');
  const [newNote, setNewNote] = useState('');
  const [isDetailedView, setIsDetailedView] = useState(false);
  const [notes, setNotes] = useState([
    {
      author: 'Sarah Chen',
      role: 'Lead PM',
      avatar: '/assets/04_headshot_pm.png',
      time: 'Yesterday, 17:10',
      text: 'Mark emphasized that Pilot Alpha invoice must go out on June 1st. Keeping the Stripe webhook listener isolated so we do not disrupt existing billing subscriptions.',
    },
    {
      author: 'Dev Lead (Dave K.)',
      role: 'Backend Architect',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      time: 'Yesterday, 17:35',
      text: 'Confirmed. 8 hours for the proration webhook calculation is sufficient. We can reuse our Stripe balance transactions utility.',
    },
  ]);

  if (!req) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-[#0b1c30]">Request Not Found</h2>
        <Link href="/" className="mt-4 px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const totalHours = deliverables.reduce((acc, d) => acc + d.hours, 0);
  const totalCost = totalHours * hourlyRate;

  const handleHourChange = (deliverableId: string, deltaHours: number) => {
    const updated = deliverables.map((d) => {
      if (d.id === deliverableId) {
        return { ...d, hours: Math.max(1, deltaHours) };
      }
      return d;
    });
    setDeliverables(updated);
    updateRequest(req.id, {
      deliverables: updated,
      estimatedHours: updated.reduce((acc, d) => acc + d.hours, 0),
      estimatedCost: updated.reduce((acc, d) => acc + d.hours, 0) * hourlyRate,
    });
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/approval/${req.id}`;
    navigator.clipboard.writeText(link);
    showToast('Secure Approval Link Copied', `Link copied: ${link}`);
  };

  const handleDispatch = () => {
    updateStatus(req.id, 'pending');
    showToast('Approval Scope Dispatched', `Tokenized link dispatched to ${req.clientContact.name} (${req.clientContact.email}) via ${req.channel}.`);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setNotes([
      ...notes,
      {
        author: 'Sarah Chen',
        role: 'Lead PM',
        avatar: '/assets/04_headshot_pm.png',
        time: 'Just now',
        text: newNote.trim(),
      },
    ]);
    setNewNote('');
    showToast('Note Added', 'Internal note logged to change request thread.');
  };

  const renderPrimaryAction = () => {
    const btnClass = "w-full py-2.5 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white font-semibold text-sm shadow-md transition-all text-center";
    if (req.status === 'draft' || req.status === ('reviewing' as any)) {
      return (
        <button onClick={handleDispatch} className={btnClass}>
          Send to client for approval
        </button>
      );
    } else if (req.status === 'pending' || req.status === ('awaiting_approval' as any)) {
      return (
        <button onClick={handleCopyLink} className={btnClass}>
          Copy approval link
        </button>
      );
    } else if (req.status === 'approved') {
      return (
        <button onClick={() => updateStatus(req.id, 'in_progress' as any)} className={btnClass}>
          Mark as in progress
        </button>
      );
    } else if (req.status === ('in_progress' as any)) {
      return (
        <button onClick={() => updateStatus(req.id, 'completed' as any)} className={btnClass}>
          Mark as completed
        </button>
      );
    }
    return null;
  };

  const Section = isDetailedView ? 'div' : 'details';
  const SectionHeader = isDetailedView ? 'div' : 'summary';

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col">
      <Header />
      <SlideoverDrawer />
      <Toast />

      <main className="w-full pt-16 flex-1">
        {/* Breadcrumb Toolbar */}
        <section className="w-full bg-white border-b border-[#e2e8f0] shadow-sm">
          <div className="max-w-[75rem] mx-auto px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs md:text-sm text-[#464555] flex-wrap">
              <Link href="/" className="hover:text-[#4f46e5] transition-colors flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Requests
              </Link>
              <span>/</span>
              <span className="text-[#0b1c30] font-semibold">{req.client}</span>
              <span>/</span>
              <span className="font-mono font-bold text-[#4f46e5] bg-[#eff4ff] px-2 py-0.5 rounded border border-[#d3e4fe]">
                {req.id}
              </span>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className={`text-xs font-semibold ${isDetailedView ? 'text-[#4f46e5]' : 'text-[#464555]'}`}>
                  Detailed View
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isDetailedView}
                    onChange={(e) => setIsDetailedView(e.target.checked)}
                  />
                  <div className={`block w-8 h-4.5 rounded-full transition-colors ${isDetailedView ? 'bg-[#4f46e5]' : 'bg-[#cbd5e1]'}`}></div>
                  <div className={`absolute left-0.5 top-0.5 bg-white w-3.5 h-3.5 rounded-full transition-transform ${isDetailedView ? 'transform translate-x-3.5' : ''}`}></div>
                </div>
              </label>

              <button
                onClick={() => window.print()}
                title="Print / Save PDF Spec"
                className="p-1.5 rounded-lg text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0b1c30] transition-colors border border-[#e2e8f0]"
              >
                <span className="material-symbols-outlined text-lg">print</span>
              </button>
            </div>
          </div>
        </section>

        {/* Workspace View Grid */}
        <div className="w-full max-w-[75rem] mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">
          <StatusStepper currentStatus={req.status as any} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Client Request Summary Card */}
              <div className="bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm flex flex-col gap-5">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                        req.urgency === 'Critical'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : req.urgency === 'High'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Urgency: {req.urgency}
                    </span>
                    <NextActionBadge status={req.status as any} />
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold text-[#0b1c30] tracking-tight">
                    {req.id}: {req.title}
                  </h1>
                </div>

                <div className="bg-[#eff4ff] rounded-lg p-4 border-l-4 border-l-[#4f46e5]">
                  <div className="text-xs font-semibold text-[#3525cd] mb-1">What the client asked</div>
                  <p className="text-sm text-[#0b1c30] italic">
                    "{req.rawQuote}"
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#e2e8f0]">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-[#777587]">{isDetailedView ? 'Intake Source' : 'How the request was received'}</span>
                    <span className="text-sm font-semibold text-[#0b1c30]">
                      {req.channel} — {req.channelSource}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-[#777587]">Client contact</span>
                    <div className="flex items-center gap-2">
                      <img
                        src={req.clientContact.avatarUrl}
                        alt={req.clientContact.name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="text-sm font-semibold text-[#0b1c30]">
                        {req.clientContact.name} <span className="text-[#777587] font-normal">({req.clientContact.role})</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expandable Sections */}
              <Section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden group">
                <SectionHeader className="p-4 cursor-pointer font-bold text-[#0b1c30] bg-[#fafbff] border-b border-[#e2e8f0] hover:bg-gray-50 flex items-center justify-between list-none [&::-webkit-details-marker]:hidden">
                  {isDetailedView ? 'Technical Scope Deliverables' : 'What we will deliver'}
                  {!isDetailedView && <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>}
                </SectionHeader>
                <div className="p-4 flex flex-col gap-3">
                  {deliverables.map((del, index) => (
                    <div
                      key={del.id}
                      className="p-3.5 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#cbd5e1] transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-[#dce9ff] text-[#0b1c30] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#0b1c30]">
                              {del.title}
                            </span>
                            <span className="px-2 py-0.2 rounded bg-white text-[10px] text-[#4f46e5] font-semibold border border-[#d3e4fe]">
                              {del.category}
                            </span>
                          </div>
                          <p className="text-xs text-[#464555] mt-1">
                            {del.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <span className="text-xs text-[#777587]">Effort:</span>
                        <div className="flex items-center border border-[#cbd5e1] rounded-lg bg-white overflow-hidden">
                          <button
                            onClick={() => handleHourChange(del.id, del.hours - 1)}
                            className="px-2 py-1 hover:bg-[#f1f5f9] text-[#0b1c30] font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="px-3 py-1 font-mono font-bold text-xs text-[#0b1c30] min-w-[36px] text-center">
                            {del.hours}h
                          </span>
                          <button
                            onClick={() => handleHourChange(del.id, del.hours + 1)}
                            className="px-2 py-1 hover:bg-[#f1f5f9] text-[#0b1c30] font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-mono text-xs font-semibold text-[#0b1c30] min-w-[60px] text-right">
                          ${(del.hours * hourlyRate).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden group">
                <SectionHeader className="p-4 cursor-pointer font-bold text-[#0b1c30] bg-[#fafbff] border-b border-[#e2e8f0] hover:bg-gray-50 flex items-center justify-between list-none [&::-webkit-details-marker]:hidden">
                  {isDetailedView ? 'Exclusions' : 'Not included'}
                  {!isDetailedView && <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>}
                </SectionHeader>
                <div className="p-4">
                  <ul className="list-disc list-inside text-sm text-[#464555] space-y-1">
                    {req.exclusions.map((exc, i) => (
                      <li key={i}>{exc}</li>
                    ))}
                  </ul>
                </div>
              </Section>

              <Section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden group">
                <SectionHeader className="p-4 cursor-pointer font-bold text-[#0b1c30] bg-[#fafbff] border-b border-[#e2e8f0] hover:bg-gray-50 flex items-center justify-between list-none [&::-webkit-details-marker]:hidden">
                  {isDetailedView ? 'Internal Agency Thread' : 'Internal notes'}
                  {!isDetailedView && <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>}
                </SectionHeader>
                <div className="p-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-3">
                    {notes.map((n, i) => (
                      <div key={i} className="p-3 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0]">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-2">
                            <img
                              src={n.avatar}
                              alt={n.author}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                            <span className="font-semibold text-[#0b1c30]">{n.author}</span>
                            <span className="text-[11px] text-[#777587]">({n.role})</span>
                          </div>
                          <span className="text-[11px] text-[#777587]">{n.time}</span>
                        </div>
                        <p className="text-xs text-[#464555]">{n.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddNote} className="flex flex-col gap-2 pt-2 border-t border-[#e2e8f0]">
                    <textarea
                      rows={2}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add an internal agency note..."
                      className="w-full p-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#0b1c30] focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="self-end px-4 py-2 rounded-lg bg-[#4f46e5] text-white text-xs font-semibold hover:bg-[#3525cd] transition-colors"
                    >
                      Post Internal Note
                    </button>
                  </form>
                </div>
              </Section>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-5 flex flex-col gap-6 sticky top-20">
              {/* Cost and timeline Card */}
              <div className="bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm flex flex-col gap-5">
                <h3 className="text-lg font-bold text-[#0b1c30]">{isDetailedView ? 'Commercial Scope Estimator' : 'Cost and timeline'}</h3>
                
                <div className="text-4xl font-bold font-mono text-[#0b1c30]">
                  ${totalCost.toLocaleString()}
                </div>

                <div className="flex flex-col gap-3 text-sm text-[#464555]">
                  <div className="flex justify-between items-center">
                    <span>Total hours:</span>
                    <span className="font-semibold text-[#0b1c30]">{totalHours}h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Hourly rate:</span>
                    <div className="flex items-center gap-1 font-mono">
                      <span>$</span>
                      <input
                        type="number"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(Number(e.target.value))}
                        className="w-16 h-7 px-2 rounded border border-[#cbd5e1] text-center font-bold text-[#0b1c30]"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{isDetailedView ? 'Target Sprint' : 'Target delivery'}:</span>
                    <span className="font-semibold text-[#0b1c30]">{targetSprint}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Estimated timeline:</span>
                    <span className="font-semibold text-[#0b1c30]">{req.targetTurnaroundDays} business days</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  {renderPrimaryAction()}
                  <button
                    onClick={handleCopyLink}
                    className="w-full py-2.5 rounded-lg border border-[#cbd5e1] font-semibold text-[#0b1c30] text-sm hover:bg-[#f8f9ff] transition-colors text-center"
                  >
                    Copy approval link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AppProvider>
      <RequestDetailContent params={params} />
    </AppProvider>
  );
}
