'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { SlideoverDrawer } from '@/components/SlideoverDrawer';
import { Toast } from '@/components/Toast';
import { useApp, AppProvider, getStatusLabel } from '@/lib/store';
import { RequestStatus, ScopeDeliverable, ActivityEvent } from '@/lib/types';
import { StatusStepper } from '@/components/StatusStepper';
import { NextActionBadge } from '@/components/NextActionBadge';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { addRequestNote, approveReview, fetchRequestActivity, requestReviewChanges } from '@/lib/api';

function RequestDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { getRequestById, updateRequest, updateStatus, saveEstimate, showToast, currentUser, isLoading, reloadRequests } = useApp();

  const req = getRequestById(id);

  const [hourlyRate, setHourlyRate] = useState<number>(req?.hourlyRate || 150);
  const [deliverables, setDeliverables] = useState<ScopeDeliverable[]>(req?.deliverables || []);
  const [targetSprint, setTargetSprint] = useState(req?.targetSprint || 'Sprint 38 (Q3 Release)');
  const [timelineDays, setTimelineDays] = useState(req?.targetTurnaroundDays || 5);
  const [exclusions, setExclusions] = useState<string[]>(req?.exclusions || []);
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState(req?.notes || []);
  const [activity, setActivity] = useState<ActivityEvent[]>(req?.activityEvents || []);
  const [isSavingEstimate, setIsSavingEstimate] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [reviewReason, setReviewReason] = useState('');
  const [showReviewChanges, setShowReviewChanges] = useState(false);
  const [newDeliverableTitle, setNewDeliverableTitle] = useState('');
  const [newDeliverableHours, setNewDeliverableHours] = useState(4);
  const [newDeliverableCategory, setNewDeliverableCategory] = useState<'Backend' | 'Database / API' | 'Frontend' | 'QA & DevOps'>('Frontend');
  const [showAddDeliverable, setShowAddDeliverable] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'activity'>('activity');

  useEffect(() => {
    if (req) {
      setHourlyRate(req.hourlyRate || 150);
      setDeliverables(req.deliverables || []);
      setTargetSprint(req.targetSprint || 'Sprint 38 (Q3 Release)');
      setTimelineDays(req.targetTurnaroundDays || 5);
      setExclusions(req.exclusions || []);
      setNotes(req.notes || []);
      if (req.activityEvents && req.activityEvents.length > 0) {
        setActivity(req.activityEvents);
      }
    }
  }, [req?.id, req?.updatedAt]);

  useEffect(() => {
    if (req?.id) {
      fetchRequestActivity(req.databaseId || req.id)
        .then((events) => {
          if (events && events.length > 0) {
            setActivity(events);
          }
        })
        .catch(() => {});
    }
  }, [req?.id, req?.databaseId]);

  if (isLoading && !req) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex flex-col">
        <Header />
        <main className="w-full pt-16 flex-1 animate-pulse">
          <div className="w-full bg-white border-b border-[#e2e8f0] py-4 px-6">
            <div className="max-w-[75rem] mx-auto flex items-center justify-between">
              <div className="h-5 bg-slate-200 rounded w-48" />
              <div className="h-5 bg-slate-200 rounded w-24" />
            </div>
          </div>
          <div className="max-w-[75rem] mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">
            <div className="h-20 bg-white rounded-xl border border-[#e2e8f0]" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 flex flex-col gap-6">
                <div className="h-64 bg-white rounded-xl border border-[#e2e8f0]" />
                <div className="h-48 bg-white rounded-xl border border-[#e2e8f0]" />
              </div>
              <div className="lg:col-span-5">
                <div className="h-80 bg-white rounded-xl border border-[#e2e8f0]" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!req) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4f46e5] mb-4">
            <span className="material-symbols-outlined text-3xl">find_in_page</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0b1c30]">Change Request Not Found</h1>
          <p className="text-sm text-[#777587] max-w-md mt-2">
            We could not locate request <span className="font-mono font-semibold text-[#0b1c30]">{id}</span>. It may have been deleted, or the reference code may be invalid.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <Link
              href="/requests"
              className="px-4 py-2 rounded-lg bg-[#4f46e5] text-white text-sm font-semibold hover:bg-[#3525cd] transition-colors"
            >
              View All Requests
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg border border-[#cbd5e1] text-[#0b1c30] text-sm font-semibold hover:bg-white transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalHours = deliverables.reduce((acc, d) => acc + d.hours, 0);
  const totalCost = totalHours * hourlyRate;

  const handleHourChange = (deliverableId: string, newHours: number) => {
    const updated = deliverables.map((d) => {
      if (d.id === deliverableId) {
        return { ...d, hours: Math.max(1, newHours) };
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

  const handleAddDeliverable = () => {
    if (!newDeliverableTitle.trim()) return;
    const newDel: ScopeDeliverable = {
      id: `del-${Date.now()}`,
      title: newDeliverableTitle.trim(),
      description: newDeliverableTitle.trim(),
      hours: Math.max(1, newDeliverableHours),
      category: newDeliverableCategory,
      complexity: 'standard',
    };
    const updated = [...deliverables, newDel];
    setDeliverables(updated);
    updateRequest(req.id, {
      deliverables: updated,
      estimatedHours: updated.reduce((acc, d) => acc + d.hours, 0),
      estimatedCost: updated.reduce((acc, d) => acc + d.hours, 0) * hourlyRate,
    });
    setNewDeliverableTitle('');
    setNewDeliverableHours(4);
    setShowAddDeliverable(false);
  };

  const handleRemoveDeliverable = (deliverableId: string) => {
    const updated = deliverables.filter((d) => d.id !== deliverableId);
    setDeliverables(updated);
    updateRequest(req.id, {
      deliverables: updated,
      estimatedHours: updated.reduce((acc, d) => acc + d.hours, 0),
      estimatedCost: updated.reduce((acc, d) => acc + d.hours, 0) * hourlyRate,
    });
  };

  const handleSaveEstimate = async () => {
    setIsSavingEstimate(true);
    try {
      await saveEstimate(req.databaseId || req.id, {
        hourly_rate: hourlyRate,
        hours: totalHours,
        cost: totalCost,
        target_delivery_date: targetSprint,
        timeline_days: timelineDays,
        deliverables: deliverables.map((d) => ({
          description: d.description || d.title,
          hours: d.hours,
          category: d.category || 'Frontend',
        })),
        exclusions,
      });

      const freshEvents = await fetchRequestActivity(req.databaseId || req.id);
      if (freshEvents) setActivity(freshEvents);
    } catch {
      // Handled by store
    } finally {
      setIsSavingEstimate(false);
    }
  };

  const handleCopyLink = () => {
    if (!req.approvalToken) {
      showToast('Approval link unavailable', 'This request has not been sent for client approval yet.', 'info');
      return;
    }
    const link = `${window.location.origin}/approval/${req.approvalToken}`;
    navigator.clipboard.writeText(link);
    showToast('Secure Approval Link Copied', `Link copied: ${link}`, 'success');
  };

  const handleDispatch = async () => {
    if (totalHours <= 0 || hourlyRate <= 0) {
      showToast('Incomplete Estimate', 'Please enter estimated hours and a valid hourly rate before sending to client.', 'error');
      return;
    }
    setIsSubmittingAction(true);
    try {
      await saveEstimate(req.databaseId || req.id, {
        hourly_rate: hourlyRate,
        hours: totalHours,
        cost: totalCost,
        target_delivery_date: targetSprint,
        timeline_days: timelineDays,
        deliverables: deliverables.map((d) => ({
          description: d.description || d.title,
          hours: d.hours,
          category: d.category || 'Frontend',
        })),
        exclusions,
      });

      updateStatus(req.id, 'reviewing');
      const freshEvents = await fetchRequestActivity(req.databaseId || req.id);
      if (freshEvents) setActivity(freshEvents);
    } catch {
      // Handled by store
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleApproveReview = async () => {
    setIsSubmittingAction(true);
    try {
      await approveReview(req.databaseId || req.id);
      await reloadRequests();
      const freshEvents = await fetchRequestActivity(req.databaseId || req.id);
      if (freshEvents) setActivity(freshEvents);
      showToast('Review approved', 'The client approval email was sent.', 'success');
    } catch (cause) {
      showToast('Review approval failed', cause instanceof Error ? cause.message : 'Unable to approve this review.', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRequestReviewChanges = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reviewReason.trim()) return;
    setIsSubmittingAction(true);
    try {
      await requestReviewChanges(req.databaseId || req.id, reviewReason.trim());
      await reloadRequests();
      setReviewReason('');
      setShowReviewChanges(false);
      const freshEvents = await fetchRequestActivity(req.databaseId || req.id);
      if (freshEvents) setActivity(freshEvents);
      showToast('Changes requested', 'The request was sent back to pending.', 'success');
    } catch (cause) {
      showToast('Request changes failed', cause instanceof Error ? cause.message : 'Unable to send this request back.', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleAdvance = async (target: RequestStatus) => {
    setIsSubmittingAction(true);
    try {
      updateStatus(req.id, target);
      const freshEvents = await fetchRequestActivity(req.databaseId || req.id);
      if (freshEvents) setActivity(freshEvents);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    void addRequestNote(req.databaseId || req.id, newNote.trim())
      .then(async () => {
        setNotes([
          ...notes,
          {
            id: `local-${Date.now()}`,
            content: newNote.trim(),
            created_at: new Date().toISOString(),
            author_name: currentUser.name,
          },
        ]);
        setNewNote('');
        showToast('Note Added', 'Internal note logged to change request thread.', 'success');
        const freshEvents = await fetchRequestActivity(req.databaseId || req.id);
        if (freshEvents) setActivity(freshEvents);
      })
      .catch((cause) =>
        showToast('Note failed', cause instanceof Error ? cause.message : 'Unable to save note.', 'error')
      );
  };

  const renderPrimaryAction = () => {
    const btnBase =
      'w-full py-2.5 rounded-lg font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 text-center disabled:opacity-60 disabled:cursor-not-allowed';

    if (req.status === 'draft' || req.status === 'pending') {
      return (
        <button
          onClick={handleDispatch}
          disabled={isSubmittingAction || isSavingEstimate}
          className={`${btnBase} bg-[#4f46e5] hover:bg-[#3525cd] text-white`}
        >
          <span className="material-symbols-outlined text-base">send</span>
          {isSubmittingAction ? 'Submitting for review...' : 'Submit for developer approval'}
        </button>
      );
    } else if (req.status === 'reviewing') {
      if (currentUser.role !== 'admin') {
        return <p className="w-full text-center text-sm text-[#777587]">Waiting on developer approval</p>;
      }
      return (
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={handleApproveReview}
            disabled={isSubmittingAction}
            className={`${btnBase} bg-[#4f46e5] hover:bg-[#3525cd] text-white`}
          >
            <span className="material-symbols-outlined text-base">send</span>
            {isSubmittingAction ? 'Sending to client...' : 'Approve and send to client'}
          </button>
          {!showReviewChanges ? (
            <button
              type="button"
              onClick={() => setShowReviewChanges(true)}
              disabled={isSubmittingAction}
              className="w-full py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm font-semibold hover:bg-amber-100 transition-colors disabled:opacity-60"
            >
              Request changes
            </button>
          ) : (
            <form onSubmit={handleRequestReviewChanges} className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <label htmlFor="review-reason" className="text-xs font-semibold text-[#0b1c30]">Reason for requested changes</label>
              <textarea
                id="review-reason"
                value={reviewReason}
                onChange={(event) => setReviewReason(event.target.value)}
                placeholder="Describe what needs to change before client approval."
                rows={3}
                required
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={isSubmittingAction || !reviewReason.trim()} className="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Send back for changes</button>
                <button type="button" onClick={() => setShowReviewChanges(false)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#464555]">Cancel</button>
              </div>
            </form>
          )}
        </div>
      );
    } else if (req.status === 'awaiting_approval') {
      return (
        <button
          onClick={handleCopyLink}
          className={`${btnBase} bg-[#eff4ff] hover:bg-[#dce9ff] text-[#3525cd] border border-[#d3e4fe]`}
        >
          <span className="material-symbols-outlined text-base">share</span>
          Copy client approval link
        </button>
      );
    } else if (req.status === 'approved') {
      return (
        <button
          onClick={() => handleAdvance('in_progress')}
          disabled={isSubmittingAction}
          className={`${btnBase} bg-emerald-600 hover:bg-emerald-700 text-white`}
        >
          <span className="material-symbols-outlined text-base">play_arrow</span>
          {isSubmittingAction ? 'Updating...' : 'Start implementation (in progress)'}
        </button>
      );
    } else if (req.status === 'in_progress') {
      return (
        <button
          onClick={() => handleAdvance('completed')}
          disabled={isSubmittingAction}
          className={`${btnBase} bg-emerald-600 hover:bg-emerald-700 text-white`}
        >
          <span className="material-symbols-outlined text-base">check_circle</span>
          {isSubmittingAction ? 'Updating...' : 'Mark as completed'}
        </button>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col font-sans">
      <Header />
      <SlideoverDrawer />
      <Toast />

      <main className="w-full pt-16 flex-1 pb-16">
        <div className="w-full bg-white border-b border-[#e2e8f0] py-3.5 px-4 md:px-6">
          <div className="max-w-[75rem] mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[#464555]">
              <Link href="/requests" className="hover:text-[#4f46e5] transition-colors flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Requests
              </Link>
              <span>/</span>
              <span className="font-mono text-[#777587]">{req.id}</span>
              <span>/</span>
              <span className="font-semibold text-[#0b1c30] truncate max-w-[200px] sm:max-w-xs">{req.title}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[#777587]">Status:</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#eff4ff] text-[#3525cd]">
                {getStatusLabel(req.status)}
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-[75rem] mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <StatusStepper currentStatus={req.status} />
              <NextActionBadge status={req.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#e2e8f0] shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 font-mono mb-2">
                      {req.id}
                    </span>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#0b1c30]">{req.title}</h1>
                    <p className="text-xs sm:text-sm text-[#777587] mt-1">
                      Client: <span className="font-medium text-[#0b1c30]">{req.client}</span> · Project:{' '}
                      <span className="font-medium text-[#0b1c30]">{req.project}</span>
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${req.urgency === 'Critical' ? 'bg-red-50 text-red-700' : req.urgency === 'High' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                    {req.urgency} Priority
                  </span>
                </div>

                {req.rawQuote && (
                  <div className="mt-4 p-3.5 rounded-lg bg-[#f8f9ff] border-l-4 border-[#4f46e5] text-xs sm:text-sm text-[#464555] italic">
                    &quot;{req.rawQuote}&quot;
                  </div>
                )}
                
                {req.attachments && req.attachments.length > 0 && (
                  <div className="mt-5 border-t border-[#e2e8f0] pt-4">
                    <h3 className="text-xs font-semibold text-[#0b1c30] mb-2">Attachments</h3>
                    <div className="flex flex-wrap gap-2">
                      {req.attachments.map(a => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#e2e8f0] bg-white hover:bg-[#f8f9ff] hover:border-[#cbd5e1] transition-colors text-xs text-[#464555] font-medium"
                        >
                          <span className="material-symbols-outlined text-[16px] text-[#777587]">attach_file</span>
                          {a.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {req.projectDetails && (
                <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-[#0b1c30] mb-4 uppercase tracking-wider">Project Impact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                      <p className="text-xs text-slate-500 font-medium mb-1">Original Project</p>
                      <p className="text-lg font-bold text-[#0b1c30]">
                        {req.projectDetails.agreed_budget != null ? `$${req.projectDetails.agreed_budget.toLocaleString()}` : 'No budget'}
                      </p>
                      <p className="text-xs text-[#777587] mt-0.5">
                        {req.projectDetails.timeline_days ? `${req.projectDetails.timeline_days} days` : 'No timeline'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-[#eff4ff] border border-[#dce9ff]">
                      <p className="text-xs text-[#3525cd] font-medium mb-1">With This Change</p>
                      <p className="text-lg font-bold text-[#0b1c30]">
                        {req.projectDetails.agreed_budget != null ? `$${(req.projectDetails.agreed_budget + totalCost).toLocaleString()}` : `+$${totalCost.toLocaleString()}`}
                      </p>
                      <p className="text-xs text-[#3525cd] mt-0.5">
                        {req.projectDetails.timeline_days ? `${req.projectDetails.timeline_days + timelineDays} days` : `+${timelineDays} days`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 bg-[#fafbff] border-b border-[#e2e8f0] flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-[#0b1c30] text-base">Scope & Deliverables</h2>
                    <p className="text-xs text-[#777587] mt-0.5">Define and estimate tasks included in this change quote</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddDeliverable(!showAddDeliverable)}
                    className="px-3 py-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#3525cd] text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">{showAddDeliverable ? 'close' : 'add'}</span>
                    <span>{showAddDeliverable ? 'Cancel' : 'Add Item'}</span>
                  </button>
                </div>

                {showAddDeliverable && (
                  <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider">New Scope Item</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <input
                        type="text"
                        placeholder="e.g., Implement Stripe Webhook handling"
                        value={newDeliverableTitle}
                        onChange={(e) => setNewDeliverableTitle(e.target.value)}
                        className="sm:col-span-6 p-2 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                      <select
                        value={newDeliverableCategory}
                        onChange={(e) => setNewDeliverableCategory(e.target.value as any)}
                        className="sm:col-span-3 p-2 text-xs rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="Frontend">Frontend</option>
                        <option value="Backend">Backend</option>
                        <option value="Database / API">Database / API</option>
                        <option value="QA & DevOps">QA & DevOps</option>
                      </select>
                      <div className="sm:col-span-3 flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={newDeliverableHours}
                          onChange={(e) => setNewDeliverableHours(Math.max(1, Number(e.target.value)))}
                          className="w-16 p-2 text-xs rounded-lg border border-slate-300 bg-white font-mono text-center font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleAddDeliverable}
                          className="flex-1 px-3 py-2 bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold rounded-lg"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-[#e2e8f0]">
                  {deliverables.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[#777587]">
                      No deliverables added yet. Click &quot;Add Item&quot; to build the estimate.
                    </div>
                  ) : (
                    deliverables.map((del) => (
                      <div key={del.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#fafbff] transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[#0b1c30]">{del.title}</span>
                            <span className="px-2 py-0.5 rounded bg-[#eff4ff] text-[#3525cd] text-[10px] font-bold">
                              {del.category}
                            </span>
                          </div>
                          {del.description && del.description !== del.title && (
                            <p className="text-xs text-[#464555] mt-1">{del.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-xs">
                            <button
                              type="button"
                              onClick={() => handleHourChange(del.id, del.hours - 1)}
                              className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              -
                            </button>
                            <span className="px-3 py-1 font-mono font-bold text-xs text-[#0b1c30] min-w-[36px] text-center">
                              {del.hours}h
                            </span>
                            <button
                              type="button"
                              onClick={() => handleHourChange(del.id, del.hours + 1)}
                              className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <span className="font-mono text-xs font-bold text-[#0b1c30] min-w-[55px] text-right">
                            ${(del.hours * hourlyRate).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDeliverable(del.id)}
                            aria-label="Remove item"
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 bg-[#fafbff] border-t border-[#e2e8f0] flex items-center justify-between">
                  <span className="text-xs text-[#777587]">
                    Total: <strong className="text-[#0b1c30]">{totalHours} hours</strong> · <strong className="text-[#0b1c30]">${totalCost.toLocaleString()}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={isSavingEstimate}
                    onClick={handleSaveEstimate}
                    className="px-3.5 py-1.5 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    <span>{isSavingEstimate ? 'Saving...' : 'Save Estimate Changes'}</span>
                  </button>
                </div>
              </div>

              {exclusions.length > 0 && (
                <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-rose-600 text-lg">shield</span>
                    <h2 className="text-sm font-bold text-[#0b1c30] uppercase tracking-wider">Out of Scope Exclusions</h2>
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#464555]">
                    {exclusions.map((exc, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-600 font-bold">✕</span>
                        <span>{exc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                <div className="border-b border-[#e2e8f0] flex items-center bg-[#fafbff] px-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('activity')}
                    className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'activity' ? 'border-[#4f46e5] text-[#4f46e5]' : 'border-transparent text-[#777587] hover:text-[#0b1c30]'}`}
                  >
                    <span className="material-symbols-outlined text-sm">history</span>
                    <span>Activity Audit Trail</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('notes')}
                    className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'notes' ? 'border-[#4f46e5] text-[#4f46e5]' : 'border-transparent text-[#777587] hover:text-[#0b1c30]'}`}
                  >
                    <span className="material-symbols-outlined text-sm">chat</span>
                    <span>Internal Notes ({notes.length})</span>
                  </button>
                </div>

                <div className="p-5">
                  {activeTab === 'activity' ? (
                    <ActivityTimeline events={activity} />
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {notes.length === 0 ? (
                          <p className="text-xs text-[#777587] text-center py-6">No internal notes logged yet.</p>
                        ) : (
                          notes.map((n) => (
                            <div key={n.id} className="p-3 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0] text-xs">
                              <div className="flex items-center justify-between text-[#777587] mb-1">
                                <span className="font-semibold text-[#0b1c30]">{n.author_name || 'Team member'}</span>
                                <span>{new Date(n.created_at).toLocaleString()}</span>
                              </div>
                              <p className="text-[#464555]">{n.content}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <form onSubmit={handleAddNote} className="flex flex-col gap-2 pt-3 border-t border-[#e2e8f0]">
                        <textarea
                          rows={2}
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Add an internal note visible only to your team..."
                          className="w-full p-2.5 text-xs rounded-lg border border-[#cbd5e1] focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="self-end px-3.5 py-1.5 bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Post Note
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-6 sticky top-20">
              <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#e2e8f0] shadow-sm flex flex-col gap-5">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#777587]">Commercial Estimate</span>
                  <div className="mt-1 text-3xl sm:text-4xl font-bold font-mono text-[#0b1c30]">
                    ${totalCost.toLocaleString()}
                  </div>
                </div>

                <div className="space-y-3 text-xs sm:text-sm text-[#464555] divide-y divide-slate-100">
                  <div className="flex justify-between items-center pt-2">
                    <span>Total Estimated Hours:</span>
                    <span className="font-mono font-bold text-[#0b1c30]">{totalHours}h</span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span>Billing Hourly Rate:</span>
                    <div className="flex items-center gap-1 font-mono">
                      <span>$</span>
                      <input
                        type="number"
                        min="1"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(Number(e.target.value))}
                        className="w-16 h-7 px-1.5 rounded border border-slate-300 text-center font-bold text-[#0b1c30]"
                      />
                      <span>/hr</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span>Target Delivery Sprint:</span>
                    <input
                      type="text"
                      value={targetSprint}
                      onChange={(e) => setTargetSprint(e.target.value)}
                      className="w-44 px-2 py-1 text-xs rounded border border-slate-300 text-right font-medium text-[#0b1c30]"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span>Turnaround Time:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        value={timelineDays}
                        onChange={(e) => setTimelineDays(Number(e.target.value))}
                        className="w-14 h-7 px-1.5 rounded border border-slate-300 text-center font-bold text-[#0b1c30]"
                      />
                      <span className="text-xs text-[#777587]">days</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  {renderPrimaryAction()}
                  {req.approvalToken && (
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="w-full py-2.5 rounded-lg border border-slate-300 font-semibold text-[#0b1c30] text-xs sm:text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base text-[#4f46e5]">link</span>
                      <span>Copy Client Approval Link</span>
                    </button>
                  )}
                </div>

                {req.clientContact && (
                  <div className="mt-2 p-3.5 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0] flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#3525cd] font-bold text-xs flex items-center justify-center shrink-0">
                      {req.clientContact.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="flex flex-col min-w-0 text-xs">
                      <span className="font-bold text-[#0b1c30] truncate">{req.clientContact.name}</span>
                      <span className="text-[#777587] truncate">{req.clientContact.email}</span>
                    </div>
                  </div>
                )}
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
