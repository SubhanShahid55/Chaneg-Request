'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { ChangeRequest, RequestStatus, IntakeChannel, UrgencyLevel, ScopeDeliverable, AppNotification } from './types';
import {
  API_BASE_URL,
  addRequestNote,
  createRequest,
  fetchActivity,
  fetchRequests,
  storedProfile,
  updateRequestStatus,
  updateEstimate,
} from './api';

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
  id: string;
  name: string;
  role: string;
  jobTitle: string;
  avatarUrl: string;
}

export const DEFAULT_USER: CurrentUser = {
  id: '',
  name: '',
  role: '',
  jobTitle: '',
  avatarUrl: '',
};

export interface ToastState {
  title: string;
  subtitle?: string;
  visible: boolean;
  type?: 'success' | 'error' | 'info';
}

interface AppContextType {
  requests: ChangeRequest[];
  getRequestById: (id: string) => ChangeRequest | undefined;
  addRequest: (newReq: Partial<ChangeRequest>) => Promise<void>;
  updateRequest: (id: string, updates: Partial<ChangeRequest>) => void;
  updateStatus: (id: string, status: RequestStatus) => void;
  approveRequest: (id: string, approverName: string, confirmationCode?: string) => void;
  declineRequest: (id: string, notes: string) => void;
  saveEstimate: (
    id: string,
    estimate: {
      hourly_rate?: number;
      hours?: number;
      cost?: number;
      target_delivery_date?: string;
      timeline_days?: number;
      deliverables?: Array<{ description: string; hours: number; category: string }>;
      exclusions?: string[];
    }
  ) => Promise<void>;
  reloadRequests: () => Promise<void>;
  isSlideoverOpen: boolean;
  setIsSlideoverOpen: (open: boolean) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
  toast: ToastState | null;
  showToast: (title: string, subtitle?: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  currentUser: CurrentUser;
  updateCurrentUser: (user: Partial<CurrentUser>) => void;
  isLoading: boolean;
  error: string | null;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  markAllNotificationsAsRead: () => void;
  markNotificationAsRead: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [isSlideoverOpen, setIsSlideoverOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => {
    const profile = storedProfile();
    return profile ? { id: profile.id, name: profile.name, role: profile.role, jobTitle: profile.job_title || '', avatarUrl: profile.avatar_url || '' } : DEFAULT_USER;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawNotifications, setRawNotifications] = useState<Array<{ id: string; request_id?: string; event_type: string; actor_name: string | null; created_at: string; event_data: Record<string, unknown> | null }>>([]);

  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('changeflow_read_notifications');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [lastReadNotificationAt, setLastReadNotificationAt] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('changeflow_last_read_at');
    } catch {
      return null;
    }
  });

  const reloadRequests = async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [loadedRequests, activity] = await Promise.all([fetchRequests(), fetchActivity(thirtyDaysAgo)]);
      setRequests(loadedRequests);
      setRawNotifications(activity.events);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load live data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const [loadedRequests, activity] = await Promise.all([fetchRequests(), fetchActivity(thirtyDaysAgo)]);
        if (!active) return;
        setRequests(loadedRequests);
        setRawNotifications(activity.events);
        setError(null);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load live data');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    const refresh = window.setInterval(() => void load(), 5000);
    const events = new EventSource(`${API_BASE_URL}/events/stream`);
    events.onmessage = () => void load();
    events.onerror = () => events.close();
    return () => { active = false; window.clearInterval(refresh); events.close(); };
  }, []);

  const notifications: AppNotification[] = useMemo(() => {
    const readSet = new Set(readNotificationIds);
    return rawNotifications.map((n) => {
      const isRead =
        readSet.has(n.id) ||
        (lastReadNotificationAt ? new Date(n.created_at).getTime() <= new Date(lastReadNotificationAt).getTime() : false);
      return {
        ...n,
        is_read: isRead,
      };
    });
  }, [rawNotifications, readNotificationIds, lastReadNotificationAt]);

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const markAllNotificationsAsRead = useCallback(() => {
    const now = new Date().toISOString();
    setLastReadNotificationAt(now);
    const allIds = rawNotifications.map((n) => n.id);
    const combined = Array.from(new Set([...readNotificationIds, ...allIds]));
    setReadNotificationIds(combined);
    try {
      localStorage.setItem('changeflow_last_read_at', now);
      localStorage.setItem('changeflow_read_notifications', JSON.stringify(combined));
    } catch {
      // Ignore localStorage errors
    }
  }, [rawNotifications, readNotificationIds]);

  const markNotificationAsRead = useCallback((id: string) => {
    setReadNotificationIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem('changeflow_read_notifications', JSON.stringify(next));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  }, []);

  const updateCurrentUser = (updates: Partial<CurrentUser>) => {
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
  };

  const saveRequests = (newReqs: ChangeRequest[]) => setRequests(newReqs);

  const showToast = (title: string, subtitle?: string, type?: 'success' | 'error' | 'info') => {
    setToast({ title, subtitle, visible: true, type });
    setTimeout(() => {
      setToast(prev => (prev ? { ...prev, visible: false } : null));
    }, 4000);
  };

  const hideToast = () => {
    setToast(prev => (prev ? { ...prev, visible: false } : null));
  };

  const getRequestById = (id: string) => {
    return requests.find(r => r.id.toLowerCase() === id.toLowerCase() || (r.databaseId && r.databaseId.toLowerCase() === id.toLowerCase()));
  };

  const addRequest = async (data: Partial<ChangeRequest>): Promise<void> => {
    if (!data.databaseId || !data.title) {
      showToast('Request not created', 'Choose a database client and enter a title.', 'error');
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
        deliverables: (data.deliverables || []).map((item) => ({
          description: item.description || item.title,
          hours: item.hours,
          category: item.category,
          complexity: item.complexity,
        })),
        target_delivery_date: data.targetSprint,
        timeline_days: data.targetTurnaroundDays,
      });
      setRequests(await fetchRequests());
      showToast('Request created', `${data.title} was saved to the database.`, 'success');
    } catch (cause) {
      showToast('Request not created', cause instanceof Error ? cause.message : 'Unable to save request.', 'error');
    }
  };

  const updateRequest = (id: string, updates: Partial<ChangeRequest>) => {
    const updated = requests.map(r => (r.id.toLowerCase() === id.toLowerCase() || r.databaseId === id) ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r);
    saveRequests(updated);
  };

  const updateStatus = (id: string, status: RequestStatus) => {
    void updateRequestStatus(id, status).then(async () => {
      setRequests(await fetchRequests());
      showToast('Status updated', `${id} is now ${getStatusLabel(status).toLowerCase()}.`, 'success');
    }).catch((cause) => showToast('Update failed', cause instanceof Error ? cause.message : 'Unable to update status.', 'error'));
  };

  const saveEstimateHandler = async (
    id: string,
    estimate: {
      hourly_rate?: number;
      hours?: number;
      cost?: number;
      target_delivery_date?: string;
      timeline_days?: number;
      deliverables?: Array<{ description: string; hours: number; category: string }>;
      exclusions?: string[];
    }
  ) => {
    try {
      await updateEstimate(id, estimate);
      await reloadRequests();
      showToast('Estimate Saved', 'Commercial scope and deliverables updated successfully.', 'success');
    } catch (cause) {
      showToast('Save Failed', cause instanceof Error ? cause.message : 'Unable to save estimate.', 'error');
      throw cause;
    }
  };

  const approveRequest = (id: string, approverName: string, confirmationCode = `CF-${Math.floor(9000 + Math.random() * 1000)}`) => {
    showToast('Approval requires the live approval link', `${approverName} must approve from the client portal.`, 'info');
  };

  const declineRequest = (id: string, notes: string) => {
    showToast('Feedback requires the live approval link', notes, 'info');
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
        saveEstimate: saveEstimateHandler,
        reloadRequests,
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
        unreadNotificationCount,
        markAllNotificationsAsRead,
        markNotificationAsRead,
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
