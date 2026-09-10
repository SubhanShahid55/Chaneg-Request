export type RequestStatus = 'draft' | 'pending' | 'approved' | 'declined' | 'in_progress' | 'completed' | 'reviewing' | 'awaiting_approval';
export type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type IntakeChannel = 'Portal' | 'call' | 'text' | 'meeting' | 'email' | '';

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
  databaseId?: string;
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
  notes?: Array<{ id: string; content: string; created_at: string; author_name?: string }>;
  activityEvents?: ActivityEvent[];
}

export interface ActivityEvent {
  id: string;
  request_id: string;
  event_type: 'created' | 'estimate_updated' | 'submitted_for_review' | 'review_approved' | 'review_changes_requested' | 'sent_for_approval' | 'viewed_by_client' | 'approved' | 'declined' | 'marked_in_progress' | 'marked_complete' | 'note_added' | string;
  event_data: Record<string, any> | null;
  actor_name: string | null;
  created_at: string;
}

export interface PublicApprovalData {
  state: 'valid' | 'expired' | 'already_responded' | 'not_found';
  expires_at?: string;
  error?: string;
  request?: {
    reference_code: string;
    title: string;
    client_quote?: string | null;
    priority: string;
    cost: number | null;
    hours: number | null;
    hourly_rate: number | null;
    target_delivery_date: string | null;
    timeline_days: number | null;
    client_name: string;
    contact_name: string;
    status?: string;
  };
  deliverables?: ScopeDeliverable[];
  exclusions?: string[];
  response?: {
    decision: 'approved' | 'declined';
    confirmation_code?: string;
    decline_reason?: string;
    responded_at: string;
  };
}

