export type RequestStatus = 'draft' | 'pending' | 'approved' | 'declined' | 'in_progress' | 'completed' | 'reviewing' | 'awaiting_approval';
export type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type IntakeChannel = 'Portal';

export interface ScopeDeliverable {
  id: string;
  title: string;
  description: string;
  hours: number;
  category: 'Frontend' | 'Backend' | 'Database / API' | 'QA & DevOps';
}

export interface ClientContact {
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
}

export interface AgencyLead {
  name: string;
  role: string;
  avatarUrl: string;
}

export interface ChangeRequest {
  id: string;
  client: string;
  clientLogo?: string;
  project: string;
  title: string;
  description: string;
  rawQuote: string;
  channel: IntakeChannel;
  channelSource: string;
  urgency: UrgencyLevel;
  status: RequestStatus;
  estimatedHours: number;
  hourlyRate: number;
  estimatedCost: number;
  targetSprint: string;
  targetTurnaroundDays: number;
  createdAt: string;
  updatedAt?: string;
  nextAction?: string;
  clientContact: ClientContact;
  assignedLead: AgencyLead;
  deliverables: ScopeDeliverable[];
  exclusions: string[];
  approvalToken: string;
  approvalDetails?: {
    approvedAt?: string;
    approvedBy?: string;
    confirmationCode?: string;
    feedbackNotes?: string;
  };
}

