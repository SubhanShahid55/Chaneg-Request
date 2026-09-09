'use client';

import React, { useState, use } from 'react';
import { useApp, AppProvider } from '@/lib/store';
import { ChangeRequest } from '@/lib/types';
import { Toast } from '@/components/Toast';
import { StatusStepper } from '@/components/StatusStepper';
import { approveApproval, declineApproval } from '@/lib/api';

function ClientApprovalContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { getRequestById, approveRequest, declineRequest, showToast } = useApp();

  const [viewState, setViewState] = useState<'review' | 'decline' | 'accepted'>('review');
  const [declineNotes, setDeclineNotes] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

  const req = getRequestById(resolvedParams.id);

  if (!req) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-3xl">error</span>
        </div>
        <h2 className="text-2xl font-bold text-[#0b1c30]">Link Expired</h2>
        <p className="text-sm text-[#464555] mt-1 max-w-sm">
          This approval link is invalid or has expired. Please contact your agency lead.
        </p>
      </div>
    );
  }

  const isAlreadyApproved = req.status === 'approved';
  const confirmationNumber = req.approvalDetails?.confirmationCode || 'CF-9821';

  const handleApprove = () => {
    setIsAuthorizing(true);
    setTimeout(() => {
      approveApproval(resolvedParams.id).then(({ confirmation_code }) => {
        setIsAuthorizing(false);
        setViewState('accepted');
        showToast('Change request approved', `Confirmation #${confirmation_code} logged for ${req.client}.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }).catch((cause) => { setIsAuthorizing(false); showToast('Approval failed', cause instanceof Error ? cause.message : 'Unable to approve request.'); });
    }, 750);
  };

  const handleDeclineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineNotes.trim()) return;
    setIsSubmittingDecline(true);
    setTimeout(() => {
      declineApproval(resolvedParams.id, declineNotes).then(() => {
        setIsSubmittingDecline(false);
        setViewState('review');
        showToast('Message Sent', 'Your message has been delivered to the agency lead.');
      }).catch((cause) => { setIsSubmittingDecline(false); showToast('Message failed', cause instanceof Error ? cause.message : 'Unable to send feedback.'); });
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col selection:bg-[#c3c0ff] selection:text-[#0b1c30]">
      {/* Simple Branded Header */}
      <header className="bg-white border-b border-[#d3e4fe] h-16 flex items-center justify-center md:justify-start px-6 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src="/assets/logo.svg" alt="Logo" className="w-6 h-6 text-[#4f46e5]" />
          <span className="font-extrabold text-xl tracking-tight text-[#0b1c30]">ChangeFlow</span>
        </div>
      </header>
      <Toast />

      {/* Main Approval Portal Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <div className="mb-8">
          <StatusStepper currentStatus={isAlreadyApproved || viewState === 'accepted' ? 'approved' : req.status} />
        </div>
        {renderApprovalContent(req)}
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-[#e2e8f0] py-6 text-xs text-[#64748b]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-center">
          <span className="font-medium">ChangeFlow · Prepared by {req.assignedLead.name}</span>
        </div>
      </footer>
    </div>
  );

  function renderApprovalContent(reqData: ChangeRequest) {
    return (
      <div className="space-y-4 md:space-y-6 antialiased select-none">
        {/* STATE 3: ACCEPTED / CONFIRMATION STATE */}
        {viewState === 'accepted' || isAlreadyApproved ? (
          <div className="bg-white rounded-2xl shadow-lg border border-[#d3e4fe] p-6 sm:p-10 text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#ecfdf5] text-[#059669] flex items-center justify-center mb-4 ring-8 ring-[#ecfdf5]/50">
              <span className="material-symbols-outlined text-4xl sm:text-5xl font-bold">
                check_circle
              </span>
            </div>

            <span className="px-3 py-1 rounded-full bg-[#dcfce7] text-[#166534] font-mono text-xs font-bold tracking-wider mb-2">
              CONFIRMATION #{confirmationNumber}
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight">
              Change request approved
            </h1>
            <p className="text-sm text-[#464555] max-w-md mx-auto mt-2 leading-relaxed">
              A confirmation has been sent to your email.
            </p>

            {/* Confirmation Summary Card */}
            <div className="w-full max-w-lg mt-6 bg-[#f8f9ff] border border-[#d3e4fe] rounded-xl p-4 sm:p-5 text-left text-xs sm:text-sm space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-[#e2e8f0]">
                <span className="text-[#64748b]">Approved by</span>
                <span className="font-bold text-[#0b1c30]">{reqData.clientContact.name} ({reqData.clientContact.email})</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#e2e8f0]">
                <span className="text-[#64748b]">Allocated Total</span>
                <span className="font-bold text-[#3525cd] text-base">
                  ${reqData.estimatedCost.toLocaleString()} USD ({reqData.estimatedHours} hrs)
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#e2e8f0]">
                <span className="text-[#64748b]">Target delivery</span>
                <span className="font-semibold text-[#0b1c30]">{reqData.targetSprint}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[#64748b]">Assigned Lead</span>
                <span className="font-semibold text-[#0b1c30]">{reqData.assignedLead.name}</span>
              </div>
            </div>

            {/* Action buttons in accepted state */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full max-w-lg">
              <button
                onClick={() => window.print()}
                className="w-full flex-1 py-3 px-4 rounded-xl bg-[#e5eeff] hover:bg-[#dce9ff] text-[#0b1c30] font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">print</span>
                Print / Save PDF Confirmation
              </button>
            </div>
          </div>
        ) : viewState === 'decline' ? (
          /* STATE 2: REVISION / DECLINE DRAWER/STATE */
          <div className="bg-white rounded-2xl shadow-lg border border-[#ffdad6] p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-2.5 text-[#ba1a1a] mb-2">
              <span className="material-symbols-outlined text-2xl">edit_note</span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">Questions or changes</h2>
            </div>
            <p className="text-xs sm:text-sm text-[#464555] leading-relaxed mb-4">
              Let {reqData.assignedLead.name} know what needs adjusting.
            </p>

            <form onSubmit={handleDeclineSubmit} className="space-y-4">
              <div>
                <label htmlFor="feedbackNotes" className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                  Your message
                </label>
                <textarea
                  id="feedbackNotes"
                  rows={4}
                  required
                  value={declineNotes}
                  onChange={(e) => setDeclineNotes(e.target.value)}
                  placeholder="e.g. Can we decouple the PDF receipt generator and approve just the Stripe webhooks?"
                  className="w-full rounded-xl bg-[#eff4ff] border border-[#d3e4fe] p-3 text-xs sm:text-sm text-[#0b1c30] placeholder:text-[#94a3b8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ba1a1a]/30 transition-all"
                />
              </div>

              {/* Quick suggestion pills */}
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="text-[#64748b] self-center">Suggested shortcuts:</span>
                <button
                  type="button"
                  onClick={() => setDeclineNotes('Can we push this to the next timeline to align with our upcoming quarterly budget?')}
                  className="px-2 py-1 rounded-md bg-[#eff4ff] hover:bg-[#dce9ff] text-[#4f46e5] font-medium transition-colors"
                >
                  Postpone to next sprint
                </button>
                <button
                  type="button"
                  onClick={() => setDeclineNotes('Can we split this into Phase 1 (MVP backend) and Phase 2 (UI polish)?')}
                  className="px-2 py-1 rounded-md bg-[#eff4ff] hover:bg-[#dce9ff] text-[#4f46e5] font-medium transition-colors"
                >
                  Split into two phases
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <button
                  type="submit"
                  disabled={isSubmittingDecline || !declineNotes.trim()}
                  className="flex-1 h-11 bg-[#ba1a1a] hover:bg-[#93000a] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingDecline ? (
                    <>
                      <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">send</span>
                      Send message
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setViewState('review')}
                  className="px-6 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs sm:text-sm font-semibold transition-colors"
                >
                  Go back
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* STATE 1: REVIEW & AUTHORIZATION STATE */
          <div className="space-y-4 md:space-y-6">

            {/* Request Context Header Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-7 border border-[#d3e4fe] shadow-sm flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-xs bg-[#eff4ff] text-[#4f46e5] px-2 py-0.5 rounded">
                      {reqData.id}
                    </span>
                    <span className="text-xs font-semibold text-[#64748b]">• {reqData.client}</span>
                    <span className="text-xs text-[#94a3b8]">• {reqData.project}</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0b1c30] tracking-tight">
                    {reqData.title}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                    Pending Client Approval
                  </span>
                </div>
              </div>

              {/* Client Original Quote / Slack Intake Context */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-[#f8f9ff] border-l-4 border-[#4f46e5] text-xs sm:text-sm text-[#464555] space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#64748b]">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="material-symbols-outlined text-[#4f46e5] text-base">chat_bubble</span>
                    <span className="font-bold text-[#0b1c30]">{reqData.clientContact.name}</span>
                    <span>({reqData.clientContact.role})</span>
                  </div>
                  <span className="font-mono text-[11px]">Intake via {reqData.channel}</span>
                </div>
                <p className="italic pl-1 text-[#0b1c30]">
                  {reqData.rawQuote}
                </p>
              </div>
            </div>

            {/* Commercial Impact & Terms Tile (Primary Hero Card from Stitch) */}
            <div className="bg-gradient-to-br from-[#3525cd] to-[#4f46e5] text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#dad7ff]">
                  Cost summary
                </span>
                <span className="text-xs font-bold bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-white">
                  Fixed Scope Quote
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                  ${reqData.estimatedCost.toLocaleString()}
                </span>
                <span className="text-xs sm:text-sm text-[#c3c0ff] font-medium">
                  USD excl. VAT (@ ${reqData.hourlyRate}/hr)
                </span>
              </div>

              {/* Quick Metrics 3-Col Grid */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2 border-t border-white/20">
                <div className="bg-black/15 backdrop-blur-sm rounded-xl p-3 flex flex-col">
                  <span className="text-[11px] text-[#dad7ff] font-medium">Estimated effort</span>
                  <span className="text-base sm:text-lg font-bold text-white mt-0.5">
                    {reqData.estimatedHours} hrs
                  </span>
                </div>
                <div className="bg-black/15 backdrop-blur-sm rounded-xl p-3 flex flex-col">
                  <span className="text-[11px] text-[#dad7ff] font-medium">Timeline</span>
                  <span className="text-base sm:text-lg font-bold text-white mt-0.5">
                    {reqData.targetTurnaroundDays} days
                  </span>
                </div>
                <div className="bg-black/15 backdrop-blur-sm rounded-xl p-3 flex flex-col">
                  <span className="text-[11px] text-[#dad7ff] font-medium">Target delivery</span>
                  <span className="text-base sm:text-lg font-bold text-white mt-0.5 truncate">
                    {reqData.targetSprint}
                  </span>
                </div>
              </div>
            </div>

            {/* Scope Item Deliverables Breakdown (From Stitch) */}
            <div className="bg-white rounded-2xl p-5 sm:p-7 border border-[#d3e4fe] shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#0b1c30]">
                    What you will receive
                  </h2>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    Specific tasks included in this quote.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#eff4ff] text-[#4f46e5] font-mono text-xs font-bold shrink-0">
                  {reqData.deliverables.length} items
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {reqData.deliverables.map((item, idx) => {
                  const icons = ['sync_alt', 'picture_as_pdf', 'palette', 'bug_report', 'code'];
                  const icon = icons[idx % icons.length];

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 sm:p-4 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0] flex items-start gap-3 sm:gap-4 hover:border-[#c3c0ff] transition-all"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#eff4ff] text-[#3525cd] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <span className="material-symbols-outlined text-lg">{icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-bold text-[#0b1c30]">
                            {item.title}
                          </span>
                          <span className="font-mono text-xs font-semibold text-[#4f46e5] bg-[#eff4ff] px-2 py-0.5 rounded shrink-0">
                            {item.hours}h • ${(item.hours * reqData.hourlyRate).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-[#464555] mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Exclusions & Scope Guardrails */}
            {reqData.exclusions && reqData.exclusions.length > 0 && (
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#e2e8f0] shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[#ba1a1a] text-lg">shield</span>
                  <h3 className="text-xs sm:text-sm font-bold text-[#0b1c30] uppercase tracking-wider">
                    Not included in this change
                  </h3>
                </div>
                <ul className="space-y-1.5 text-xs text-[#464555]">
                  {reqData.exclusions.map((exc, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-[#ba1a1a] font-bold">✕</span>
                      <span>{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Agency Signoff Context & Lead PM Contact (From Stitch) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#d3e4fe] shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-[#4f46e5]/30 shadow-xs"
                  alt={reqData.assignedLead.name}
                  src="/assets/04_headshot_pm.png"
                />
                <div className="flex flex-col min-w-0 text-xs">
                  <span className="font-bold text-[#0b1c30] text-sm truncate">
                    {reqData.assignedLead.name}
                  </span>
                  <span className="text-[#64748b] truncate">
                    {reqData.assignedLead.role} • Prepared for {reqData.client}
                  </span>
                </div>
              </div>

              <a
                href={`mailto:sarah@momentumstudio.io?subject=Question%20${reqData.id}`}
                className="px-3.5 py-2 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#3525cd] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-base">mail</span>
                <span>Ask Sarah</span>
              </a>
            </div>

            {/* Legal Authorization Terms Microcopy */}
            <div className="p-4 rounded-xl bg-[#eff4ff]/80 border border-[#d3e4fe] text-xs text-[#464555] leading-relaxed">
              <span className="font-bold text-[#0b1c30]">Authorization Terms:</span> By selecting
              &quot;Approve this change&quot;, you authorize the {reqData.estimatedHours} hours (${reqData.estimatedCost.toLocaleString()} USD)
              to be scheduled for {reqData.targetSprint}.
            </div>

            {/* Interactive Sticky Bottom Actions Card */}
            <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-[#d3e4fe] flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                disabled={isAuthorizing}
                onClick={handleApprove}
                className="w-full sm:flex-1 h-12 bg-[#3525cd] hover:bg-[#4f46e5] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAuthorizing ? (
                  <>
                    <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">verified</span>
                    <span>Approve this change (${reqData.estimatedCost.toLocaleString()})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setViewState('decline')}
                className="w-full sm:w-auto px-5 py-3 rounded-xl text-[#ba1a1a] hover:bg-[#ffdad6]/40 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                <span>Ask a question or request changes</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default function ClientApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AppProvider>
      <ClientApprovalContent params={params} />
    </AppProvider>
  );
}
