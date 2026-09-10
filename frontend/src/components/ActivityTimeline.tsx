'use client';

import React from 'react';
import type { ActivityEvent } from '@/lib/types';

interface ActivityTimelineProps {
  events: ActivityEvent[];
  clientName?: string;
  referenceCode?: string;
}

export function ActivityTimeline({ events, clientName, referenceCode }: ActivityTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-[#777587]">
        <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">history</span>
        <p className="font-medium">No activity recorded yet</p>
        <p className="text-xs text-[#777587] mt-0.5">Actions performed on this request will appear here.</p>
      </div>
    );
  }

  // Ensure events are sorted chronologically
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const getEventMeta = (event: ActivityEvent) => {
    const isClient = ['viewed_by_client', 'approved', 'declined'].includes(event.event_type) ||
      (clientName && event.actor_name?.toLowerCase().includes(clientName.toLowerCase()));

    switch (event.event_type) {
      case 'created':
        return {
          title: 'Request Created',
          description: event.event_data?.title ? `Created with title: "${event.event_data.title}"` : 'Change request was logged into ChangeFlow.',
          icon: 'add_circle',
          iconBg: 'bg-indigo-50 text-[#4f46e5] border-indigo-200',
          isClient: false,
        };
      case 'estimate_updated':
        return {
          title: 'Estimate Updated',
          description: event.event_data?.cost !== undefined
            ? `Estimate set to $${Number(event.event_data.cost).toLocaleString()} (${event.event_data.hours}h @ $${event.event_data.hourly_rate}/hr)`
            : 'Deliverables and effort estimate were revised.',
          icon: 'calculate',
          iconBg: 'bg-amber-50 text-amber-700 border-amber-200',
          isClient: false,
        };
      case 'submitted_for_review':
        return {
          title: 'Submitted for Developer Approval',
          description: 'Request was submitted for internal developer approval.',
          icon: 'send',
          iconBg: 'bg-violet-50 text-violet-700 border-violet-200',
          isClient: false,
        };
      case 'review_approved':
        return {
          title: 'Internal Review Approved',
          description: 'Request was approved internally and sent to the client for approval.',
          icon: 'verified',
          iconBg: 'bg-sky-50 text-sky-700 border-sky-200',
          isClient: false,
        };
      case 'review_changes_requested':
        return {
          title: 'Changes Requested in Review',
          description: event.event_data?.reason ? `Reviewer requested changes: "${event.event_data.reason}"` : 'Reviewer sent the request back for changes.',
          icon: 'feedback',
          iconBg: 'bg-amber-50 text-amber-700 border-amber-200',
          isClient: false,
        };
      case 'viewed_by_client':
        return {
          title: 'Approval Link Viewed',
          description: 'Client opened and reviewed the approval link in the client portal.',
          icon: 'visibility',
          iconBg: 'bg-sky-50 text-sky-700 border-sky-200',
          isClient: true,
        };
      case 'approved':
        return {
          title: 'Client Approved Request',
          description: event.event_data?.confirmation_code
            ? `Client authorized change request with confirmation code #${event.event_data.confirmation_code}`
            : 'Client approved the change request.',
          icon: 'check_circle',
          iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          isClient: true,
        };
      case 'declined':
        return {
          title: 'Client Declined Request',
          description: event.event_data?.reason
            ? `Client requested revision: "${event.event_data.reason}"`
            : 'Client declined the scope or requested adjustments.',
          icon: 'cancel',
          iconBg: 'bg-rose-50 text-rose-700 border-rose-200',
          isClient: true,
        };
      case 'marked_in_progress':
        return {
          title: 'Marked In Progress',
          description: 'Work commenced on approved deliverables.',
          icon: 'engineering',
          iconBg: 'bg-indigo-50 text-[#4f46e5] border-indigo-200',
          isClient: false,
        };
      case 'marked_complete':
        return {
          title: 'Marked Completed',
          description: 'All deliverables were completed and delivered.',
          icon: 'task_alt',
          iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          isClient: false,
        };
      case 'note_added':
        return {
          title: 'Internal Note Added',
          description: event.event_data?.preview
            ? `"${event.event_data.preview}"`
            : 'Internal agency note was logged to the thread.',
          icon: 'edit_note',
          iconBg: 'bg-slate-50 text-slate-700 border-slate-200',
          isClient: false,
        };
      default:
        return {
          title: event.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: 'Activity event recorded.',
          icon: 'radio_button_checked',
          iconBg: 'bg-slate-50 text-slate-700 border-slate-200',
          isClient,
        };
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e2e8f0]">
      {sortedEvents.map((event) => {
        const meta = getEventMeta(event);
        const eventDate = new Date(event.created_at);
        const formattedDate = eventDate.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const formattedTime = eventDate.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div key={event.id} className="relative flex items-start gap-3 group">
            {/* Timeline node icon */}
            <div
              className={`absolute -left-6 mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center text-xs shadow-xs z-10 bg-white ${meta.iconBg}`}
              title={meta.title}
            >
              <span className="material-symbols-outlined text-[15px]">{meta.icon}</span>
            </div>

            {/* Event content */}
            <div className="flex-1 bg-[#f8f9ff] border border-[#e2e8f0] rounded-xl p-3.5 hover:border-[#cbd5e1] transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-[#0b1c30]">{meta.title}</span>
                  {meta.isClient ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                      <span className="material-symbols-outlined text-[12px]">person</span>
                      Client: {event.actor_name || 'Client'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-[#3525cd] border border-indigo-200">
                      <span className="material-symbols-outlined text-[12px]">badge</span>
                      Agency: {event.actor_name || 'Team member'}
                    </span>
                  )}
                </div>
                <time
                  dateTime={event.created_at}
                  className="text-[11px] text-[#777587] font-mono whitespace-nowrap"
                  title={`${formattedDate} at ${formattedTime}`}
                >
                  {formattedDate}, {formattedTime}
                </time>
              </div>
              <p className="text-xs text-[#464555] leading-relaxed">
                {meta.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

