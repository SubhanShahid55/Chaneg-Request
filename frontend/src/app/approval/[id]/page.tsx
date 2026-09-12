'use client';

import React, { useState, useEffect, use } from 'react';
import { useApp, AppProvider } from '@/lib/store';
import { Toast } from '@/components/Toast';
import { fetchApproval, approveApproval, declineApproval } from '@/lib/api';

interface PublicApprovalResponse {
  state: 'valid' | 'expired' | 'already_responded' | 'not_found';
  error?: string;
  expires_at?: string;
  request?: {
    reference_code: string;
    title: string;
    client_quote?: string;
    priority?: string;
    cost: number;
    hours: number;
    hourly_rate: number;
    target_delivery_date?: string;
    timeline_days?: number;
    client_name?: string;
    contact_name?: string;
    status?: string;
  };
  deliverables?: Array<{
    id: string;
    description: string;
    hours: number;
    category: string;
  }>;
  exclusions?: Array<{
    id: string;
    description: string;
  }>;
  response?: {
    decision: 'approved' | 'declined';
    confirmation_code?: string;
    decline_reason?: string;
    responded_at: string;
  };
}

function ClientApprovalContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.id;
  const { getRequestById, showToast } = useApp();

  const [approvalData, setApprovalData] = useState<PublicApprovalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState<'review' | 'decline' | 'accepted'>('review');
  const [declineReason, setDeclineReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchApproval(token)
      .then((data: PublicApprovalResponse) => {
        if (!active) return;
        setApprovalData(data);
        if (data.state === 'already_responded' && data.response?.decision === 'approved') {
          setConfirmationCode(data.response.confirmation_code || null);
          setViewState('accepted');
        } else if (data.state === 'already_responded' && data.response?.decision === 'declined') {
          setViewState('decline');
        }
      })
      .catch(() => {
        const localReq = getRequestById(token);
        if (localReq && active) {
          setApprovalData({
            state: 'valid',
            request: {
              reference_code: localReq.id,
              title: localReq.title,
              client_quote: localReq.rawQuote,
              priority: localReq.urgency,
              cost: localReq.estimatedCost,
              hours: localReq.estimatedHours,
              hourly_rate: localReq.hourlyRate,
              target_delivery_date: localReq.targetSprint,
              timeline_days: localReq.targetTurnaroundDays,
              client_name: localReq.client,
              contact_name: localReq.clientContact?.name || 'Client Contact',
              status: localReq.status,
            },
            deliverables: localReq.deliverables.map(d => ({
              id: d.id,
              description: d.description || d.title,
              hours: d.hours,
              category: d.category,
            })),
            exclusions: localReq.exclusions.map((e, idx) => ({ id: `exc-${idx}`, description: e })),
          });
        } else if (active) {
          setApprovalData({ state: 'not_found', error: 'Approval link not found.' });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, getRequestById]);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const res = await approveApproval(token);
      setConfirmationCode(res.confirmation_code);
      setViewState('accepted');
      showToast('Approved', 'Change request has been approved.', 'success');
    } catch (err: any) {
      showToast('Approval Failed', err.message || 'Unable to submit approval.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineReason.trim()) return;
    setIsSubmitting(true);
    try {
      await declineApproval(token, declineReason.trim());
      showToast('Feedback Sent', 'Your questions and requested changes were sent to the agency team.', 'info');
      setViewState('decline');
    } catch (err: any) {
      showToast('Submission Failed', err.message || 'Unable to submit feedback.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-[#4f46e5] animate-spin">progress_activity</span>
          <p className="text-sm font-medium text-[#464555]">Loading approval scope...</p>
        </div>
      </div>
    );
  }

  if (!approvalData || approvalData.state === 'not_found') {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-[#e2e8f0] shadow-lg text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">link_off</span>
          </div>
          <h1 className="text-xl font-bold text-[#0b1c30]">Link Not Found</h1>
          <p className="text-sm text-[#777587] mt-2">
            This approval link is invalid or has expired. Please contact your project lead for an updated link.
          </p>
        </div>
      </div>
    );
  }

  if (approvalData.state === 'expired') {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-amber-200 shadow-lg text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">hourglass_disabled</span>
          </div>
          <h1 className="text-xl font-bold text-[#0b1c30]">Approval Link Expired</h1>
          <p className="text-sm text-[#777587] mt-2">
            This quote link expired on {approvalData.expires_at ? new Date(approvalData.expires_at).toLocaleDateString() : 'earlier'}. Please ask Sarah to dispatch a renewed approval link.
          </p>
          <a
            href="mailto:info@imant.com?subject=Expired%20Approval%20Link"
            className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4f46e5] text-white text-xs font-semibold hover:bg-[#3525cd] transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">mail</span>
            <span>Request New Link</span>
          </a>
        </div>
      </div>
    );
  }

  const req = approvalData.request;
  const deliverables = approvalData.deliverables || [];
  const exclusions = approvalData.exclusions || [];

  return (
    <div className="min-h-screen bg-[#f8f9ff] font-sans text-[#0b1c30] flex flex-col items-center py-10 px-4 sm:px-6">
      <Toast />

      <div className="w-full max-w-3xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3525cd] text-white flex items-center justify-center font-bold text-lg shadow-sm">
            CF
          </div>
          <div>
            <span className="text-base font-bold text-[#0b1c30] leading-tight block">ChangeFlow</span>
            <span className="text-[11px] text-[#777587]">Professional Client Scope Authorization</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#777587] bg-white px-3 py-1.5 rounded-full border border-[#e2e8f0] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Secure Client Portal</span>
        </div>
      </div>

      {viewState === 'accepted' ? (
        <div className="w-full max-w-3xl bg-white rounded-2xl p-8 sm:p-10 border border-[#d3e4fe] shadow-lg flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0b1c30]">Scope Approved</h1>
          <p className="text-sm text-[#464555] max-w-md mt-2">
            Thank you! This change request has been approved and authorized for scheduling in{' '}
            <strong>{req?.target_delivery_date || 'the upcoming release'}</strong>.
          </p>

          {confirmationCode && (
            <div className="mt-6 p-4 rounded-xl bg-[#eff4ff] border border-[#d3e4fe] flex flex-col items-center">
              <span className="text-xs text-[#464555] font-medium">Confirmation Code</span>
              <span className="text-xl font-bold font-mono text-[#3525cd] mt-1">{confirmationCode}</span>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 w-full flex items-center justify-between text-xs text-[#777587]">
            <span>Request: <strong className="text-[#0b1c30] font-mono">{req?.reference_code}</strong></span>
            <span>Total: <strong className="text-[#0b1c30]">${req?.cost?.toLocaleString()}</strong></span>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-3xl flex flex-col gap-6">
          <div className="bg-gradient-to-br from-[#3525cd] to-[#4f46e5] text-white rounded-2xl p-6 sm:p-8 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#dad7ff]">
              <span className="font-mono bg-white/20 px-2.5 py-1 rounded-md text-white font-semibold">
                {req?.reference_code}
              </span>
              <span>Prepared for {req?.client_name || 'Valued Client'}</span>
            </div>

            <h1 className="text-xl sm:text-3xl font-bold mt-4 leading-snug">{req?.title}</h1>

            {req?.client_quote && (
              <p className="mt-3 text-xs sm:text-sm text-[#dad7ff] bg-black/15 p-3.5 rounded-xl border border-white/10 italic">
                &quot;{req.client_quote}&quot;
              </p>
            )}

            <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/20">
              <div className="bg-black/15 rounded-xl p-3 flex flex-col">
                <span className="text-[11px] text-[#dad7ff]">Total Cost</span>
                <span className="text-lg sm:text-2xl font-bold font-mono mt-0.5">
                  ${req?.cost?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="bg-black/15 rounded-xl p-3 flex flex-col">
                <span className="text-[11px] text-[#dad7ff]">Timeline</span>
                <span className="text-lg sm:text-2xl font-bold mt-0.5">
                  {req?.timeline_days || 5} days
                </span>
              </div>
              <div className="bg-black/15 rounded-xl p-3 flex flex-col">
                <span className="text-[11px] text-[#dad7ff]">Delivery</span>
                <span className="text-lg sm:text-2xl font-bold mt-0.5 truncate">
                  {req?.target_delivery_date || 'Sprint 38'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#d3e4fe] shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0b1c30]">What will be delivered</h2>
                <p className="text-xs text-[#777587]">Specific items included under this commercial change order</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#eff4ff] text-[#4f46e5] text-xs font-bold font-mono">
                {deliverables.length} items
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {deliverables.map((item, idx) => (
                <div key={item.id || idx} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#eff4ff] text-[#3525cd] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-[#0b1c30]">{item.description}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#4f46e5] bg-[#eff4ff] px-2 py-1 rounded shrink-0">
                    {item.hours}h · ${(item.hours * (req?.hourly_rate || 150)).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {exclusions.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-rose-600 text-lg">shield</span>
                <h3 className="text-xs sm:text-sm font-bold text-[#0b1c30] uppercase tracking-wider">
                  Not included in this change
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-[#464555]">
                {exclusions.map((exc, i) => (
                  <li key={exc.id || i} className="flex items-center gap-2">
                    <span className="text-rose-600 font-bold">✕</span>
                    <span>{exc.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#d3e4fe] shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#eff4ff] text-[#3525cd] font-bold text-sm flex items-center justify-center">
                SM
              </div>
              <div className="text-xs">
                <span className="font-bold text-[#0b1c30] block">Sarah Mitchell</span>
                <span className="text-[#777587]">Senior Delivery Lead · Momentum Studio</span>
                <span className="text-[#777587]">Senior Delivery Lead · IMANT</span>
              </div>
            </div>
            <a
              href={`mailto:info@imant.com?subject=Question%20about%20${req?.reference_code}`}
              className="px-3.5 py-2 rounded-xl bg-[#eff4ff] text-[#3525cd] text-xs font-semibold hover:bg-[#dce9ff] transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">mail</span>
              <span>Ask Sarah a question</span>
            </a>
          </div>

          {viewState === 'decline' ? (
            <form onSubmit={handleDecline} className="bg-white rounded-2xl p-6 border border-rose-200 shadow-sm flex flex-col gap-3">
              <h3 className="text-sm font-bold text-[#0b1c30]">Request adjustments or ask questions</h3>
              <p className="text-xs text-[#777587]">
                Explain what needs clarification, adjustment in hours, or modification before you can sign off.
              </p>
              <textarea
                rows={3}
                required
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g., Can we split the deliverables into two phases? Let's discuss turnaround timing."
                className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setViewState('review')}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Back to Review
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Send Feedback to Team'}
                </button>
              </div>
            </form>
          ) : (
            <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-[#d3e4fe] flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleApprove}
                className="w-full sm:flex-1 h-12 bg-[#3525cd] hover:bg-[#4f46e5] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                    <span>Processing Authorization...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">verified</span>
                    <span>Approve this change (${req?.cost?.toLocaleString()})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setViewState('decline')}
                className="w-full sm:w-auto px-5 py-3 rounded-xl text-[#ba1a1a] hover:bg-rose-50 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                <span>Ask a question or request changes</span>
              </button>
            </div>
          )}

          <p className="text-center text-[11px] text-[#777587] pb-6">
            By approving, you authorize the estimated {req?.hours || 0} hours (${req?.cost?.toLocaleString() || 0} USD)
            for scheduling into {req?.target_delivery_date || 'production'}.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ClientApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AppProvider>
      <ClientApprovalContent params={params} />
    </AppProvider>
  );
}
