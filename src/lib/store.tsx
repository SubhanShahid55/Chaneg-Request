'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ChangeRequest, RequestStatus, IntakeChannel, UrgencyLevel } from './types';
import { INITIAL_CHANGE_REQUESTS, DEFAULT_LEAD } from './mock-data';

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
  name: 'Sarah Chen',
  role: 'Lead PM / Partner',
  avatarUrl: '/assets/04_headshot_pm.png',
};

interface AppContextType {
  requests: ChangeRequest[];
  getRequestById: (id: string) => ChangeRequest | undefined;
  addRequest: (newReq: Partial<ChangeRequest>) => ChangeRequest;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<ChangeRequest[]>(INITIAL_CHANGE_REQUESTS);
  const [isSlideoverOpen, setIsSlideoverOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [toast, setToast] = useState<{ title: string; subtitle?: string; visible: boolean } | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(DEFAULT_USER);

  // Load from localStorage if present
  useEffect(() => {
    try {
      const savedReqs = localStorage.getItem('changeflow_requests');
      if (savedReqs) setRequests(JSON.parse(savedReqs));
      
      const savedUser = localStorage.getItem('changeflow_user');
      if (savedUser) setCurrentUser(JSON.parse(savedUser));
    } catch (e) {
      console.warn('Failed to load local changeflow data', e);
    }
  }, []);

  const updateCurrentUser = (updates: Partial<CurrentUser>) => {
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    try {
      localStorage.setItem('changeflow_user', JSON.stringify(updated));
    } catch (e) {}
  };

  // Save changes
  const saveRequests = (newReqs: ChangeRequest[]) => {
    setRequests(newReqs);
    try {
      localStorage.setItem('changeflow_requests', JSON.stringify(newReqs));
    } catch (e) {
      console.warn('Failed to persist changeflow requests', e);
    }
  };

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

  const addRequest = (data: Partial<ChangeRequest>): ChangeRequest => {
    const nextIdNumber = Math.max(...requests.map(r => parseInt(r.id.replace('CR-', ''), 10) || 1040), 1051) + 1;
    const newId = `CR-${nextIdNumber}`;
    const hours = data.estimatedHours || 16;
    const rate = data.hourlyRate || 150;
    const cost = data.estimatedCost || hours * rate;
    const now = new Date().toISOString();
    const status: RequestStatus = 'draft';

    const newReq: ChangeRequest = {
      id: newId,
      client: data.client || 'New Enterprise Client',
      project: data.project || 'Product Roadmap',
      title: data.title || 'New Change Request',
      description: data.description || 'Client submitted request for feature expansion.',
      rawQuote: data.rawQuote || `"We need this capability added before our next release milestone."`,
      channel: 'Portal',
      channelSource: data.channelSource || 'Client Portal',
      urgency: (data.urgency as UrgencyLevel) || 'Medium',
      status,
      estimatedHours: hours,
      hourlyRate: rate,
      estimatedCost: cost,
      targetSprint: data.targetSprint || 'Q3 Release — ~5 days',
      targetTurnaroundDays: data.targetTurnaroundDays || 5,
      createdAt: now,
      updatedAt: now,
      nextAction: getNextAction(status),
      clientContact: data.clientContact || {
        name: 'Alex Mercer',
        email: 'alex@client.io',
        role: 'Client Product Lead',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      },
      assignedLead: DEFAULT_LEAD,
      deliverables: data.deliverables && data.deliverables.length > 0 ? data.deliverables : [
        {
          id: `del-${Date.now()}-1`,
          title: 'Core Implementation & Architectural Scaffold',
          description: 'Modular feature code, components, and backend endpoints.',
          hours: Math.round(hours * 0.6),
          category: 'Frontend',
        },
        {
          id: `del-${Date.now()}-2`,
          title: 'Integration, QA & End-to-End Verification',
          description: 'Automated test suites, manual verification, and staging deployment.',
          hours: Math.round(hours * 0.4),
          category: 'QA & DevOps',
        },
      ],
      exclusions: data.exclusions || [
        'Out-of-scope legacy systems migration',
        'Third-party external licensing fees',
      ],
      approvalToken: `tok_${Math.random().toString(36).substring(2, 9)}`,
    };

    const updated = [newReq, ...requests];
    saveRequests(updated);
    showToast(`Request ${newReq.id} saved`, `Added for ${newReq.client}.`);
    return newReq;
  };

  const updateRequest = (id: string, updates: Partial<ChangeRequest>) => {
    const updated = requests.map(r => {
      if (r.id.toLowerCase() === id.toLowerCase()) {
        return { ...r, ...updates, updatedAt: new Date().toISOString() };
      }
      return r;
    });
    saveRequests(updated);
  };

  const updateStatus = (id: string, status: RequestStatus) => {
    updateRequest(id, { status, nextAction: getNextAction(status) });
    showToast('Status updated', `${id} is now ${getStatusLabel(status).toLowerCase()}.`);
  };

  const approveRequest = (id: string, approverName: string, confirmationCode = `CF-${Math.floor(9000 + Math.random() * 1000)}`) => {
    const now = new Date().toISOString();
    const updated = requests.map(r => {
      if (r.id.toLowerCase() === id.toLowerCase()) {
        return {
          ...r,
          status: 'approved' as RequestStatus,
          updatedAt: now,
          nextAction: getNextAction('approved'),
          approvalDetails: {
            approvedAt: now,
            approvedBy: approverName,
            confirmationCode,
          },
        };
      }
      return r;
    });
    saveRequests(updated);
    showToast('Request approved', `Confirmation ${confirmationCode} for ${approverName}.`);
  };

  const declineRequest = (id: string, notes: string) => {
    const now = new Date().toISOString();
    const updated = requests.map(r => {
      if (r.id.toLowerCase() === id.toLowerCase()) {
        return {
          ...r,
          status: 'declined' as RequestStatus,
          updatedAt: now,
          nextAction: getNextAction('declined'),
          approvalDetails: {
            feedbackNotes: notes,
          },
        };
      }
      return r;
    });
    saveRequests(updated);
    showToast('Feedback sent', 'Your feedback has been forwarded to the project lead.');
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
