'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ChangeRequest, RequestStatus, IntakeChannel, UrgencyLevel } from './types';
import { addRequestNote, createRequest, fetchActivity, fetchRequests, updateRequestStatus } from './api';

export function getNextAction(status: RequestStatus): string {
  switch (status) {
    case 'draft': return 'Review and add estimate';
    case 'reviewing':
    case 'pending': return 'Send to client for approval';
    case 'awaiting_approval': return 'Waiting for client response';
    case 'approved': return 'Begin work';
    case 'in_progress': return 'Complete and deliver';
    case 'completed': return 'Completed';
    case 'declined': return 'Review client feedback';
    default: return '';
  }
}

export function getStatusLabel(status: RequestStatus): string {
  switch (status) {
    case 'draft': return 'New';
    case 'reviewing':
    case 'pending': return 'Reviewing';
    case 'awaiting_approval': return 'Awaiting approval';
    case 'approved': return 'Approved';
    case 'in_progress': return 'In progress';
    case 'completed': return 'Completed';
    case 'declined': return 'Declined';
    default: return status;
  }
}

interface CurrentUser {
  name: string;
  role: string;
  avatarUrl: string;
}

export const DEFAULT_USER: CurrentUser = {
  name: '',
  role: '',
  avatarUrl: '',
};

interface AppContextType {
  requests: ChangeRequest[];
  getRequestById: (id: string) => ChangeRequest | undefined;
  addRequest: (newReq: Partial<ChangeRequest>) => Promise<void>;
  updateRequest: (id: string, updates: Partial<ChangeRequest>) => void;
  updateStatus: (id: string, status: RequestStatus) => void;
  approveRequest: (id: string, approverName: string, confirmationCode?: string) => void;
  declineRequest: (id: string, notes: string) => void;
  isSlideoverOpen: boolean;
  setIsSlideoverOpen: (open: boolean) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
  toast: { title: string; subtitle?: string; visible: boolean } | null;
  showToast: (title: string, subtitle?: string) => void;
  hideToast: () => void;
  currentUser: CurrentUser;
  updateCurrentUser: (user: Partial<CurrentUser>) => void;
  isLoading: boolean;
  error: string | null;
  notifications: Array<{ id: string; event_type: string; actor_name: string | null; created_at: string; event_data: Record<string, unknown> | null }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [isSlideoverOpen, setIsSlideoverOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [toast, setToast] = useState<{ title: string; subtitle?: string; visible: boolean } | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(DEFAULT_USER);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Array<{ id: string; event_type: string; actor_name: string | null; created_at: string; event_data: Record<string, unknown> | null }>>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [loadedRequests, activity] = await Promise.all([fetchRequests(), fetchActivity()]);
        if (!active) return;
        setRequests(loadedRequests);
        setNotifications(activity.events);
        setError(null);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load live data');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    const refresh = window.setInterval(() => void load(), 5000);
    return () => { active = false; window.clearInterval(refresh); };
  }, []);

  const updateCurrentUser = (updates: Partial<CurrentUser>) => {
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    // Profile persistence is handled by the authenticated profile API.
  };

  // Save changes
  const saveRequests = (newReqs: ChangeRequest[]) => setRequests(newReqs);

  const showToast = (title: string, subtitle?: string) => {
    setToast({ title, subtitle, visible: true });
    setTimeout(() => {
      setToast(prev => (prev ? { ...prev, visible: false } : null));
    }, 4000);
  };

  const hideToast = () => {
    setToast(prev => (prev ? { ...prev, visible: false } : null));
  };

  const getRequestById = (id: string) => {
    return requests.find(r => r.id.toLowerCase() === id.toLowerCase());
  };

  const addRequest = async (data: Partial<ChangeRequest>): Promise<void> => {
    if (!data.databaseId || !data.title) {
      showToast('Request not created', 'Choose a database client and enter a title.');
      return;
    }
    try {
      await createRequest({
        client_id: data.databaseId,
        title: data.title,
        client_quote: data.rawQuote,
        source_channel: data.channel === 'Portal' ? undefined : data.channel,
        priority: data.urgency === 'Critical' ? 'critical' : data.urgency === 'High' ? 'priority' : 'standard',
        hourly_rate: data.hourlyRate,
        hours: data.estimatedHours,
        cost: data.estimatedCost,
        target_delivery_date: data.targetSprint,
        timeline_days: data.targetTurnaroundDays,
      });
      setRequests(await fetchRequests());
      showToast('Request created', `${data.title} was saved to the database.`);
    } catch (cause) {
      showToast('Request not created', cause instanceof Error ? cause.message : 'Unable to save request.');
    }
  };

  const updateRequest = (id: string, updates: Partial<ChangeRequest>) => {
    const updated = requests.map(r => r.id.toLowerCase() === id.toLowerCase() ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r);
    saveRequests(updated);
  };

  const updateStatus = (id: string, status: RequestStatus) => {
    void updateRequestStatus(id, status).then(async () => {
      setRequests(await fetchRequests());
      showToast('Status updated', `${id} is now ${getStatusLabel(status).toLowerCase()}.`);
    }).catch((cause) => showToast('Update failed', cause instanceof Error ? cause.message : 'Unable to update status.'));
  };

  const approveRequest = (id: string, approverName: string, confirmationCode = `CF-${Math.floor(9000 + Math.random() * 1000)}`) => {
    showToast('Approval requires the live approval link', `${approverName} must approve from the client portal.`);
  };

  const declineRequest = (id: string, notes: string) => {
    showToast('Feedback requires the live approval link', notes);
  };

  return (
    <AppContext.Provider
      value={{
        requests,
        getRequestById,
        addRequest,
        updateRequest,
        updateStatus,
        approveRequest,
        declineRequest,
        isSlideoverOpen,
        setIsSlideoverOpen,
        isProfileModalOpen,
        setIsProfileModalOpen,
        globalSearchQuery,
        setGlobalSearchQuery,
        toast,
        showToast,
        hideToast,
        currentUser,
        updateCurrentUser,
        isLoading,
        error,
        notifications,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
