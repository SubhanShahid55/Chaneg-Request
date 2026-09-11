export type RequestStatus = 'draft' | 'pending' | 'approved' | 'declined' | 'in_progress' | 'completed' | 'reviewing' | 'awaiting_approval';
export type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type IntakeChannel = 'Portal' | 'call' | 'text' | 'meeting' | 'email' | '';
export type DeliverableCategory = 'Frontend' | 'Backend' | 'Database / API' | 'QA & DevOps';
export type DeliverableComplexity = 'simple' | 'standard' | 'complex';

export interface ScopeDeliverable {
  id: string;
  title: string;
  description: string;
  hours: number;
  category: DeliverableCategory;
  complexity: DeliverableComplexity;
}

export interface ProjectDeliverable {
  id: string;
  project_id: string;
  description: string;
  hours: number;
  category: DeliverableCategory;
  complexity: DeliverableComplexity;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  scope_summary: string | null;
  agreed_budget: number | null;
  timeline_days: number | null;
  clients?: { company_name: string };
  original_deliverables?: ProjectDeliverable[];
  approved_change_requests?: ChangeRequest[];
  rollup?: { originalHours: number; approvedChangeHours: number; totalHours: number; approvedChangeCount: number; originalBudget: number | null; approvedChangeCost: number; currentBudget: number | null; originalTimelineDays: number | null; approvedChangeTimelineDays: number; currentTimelineDays: number | null };
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

export interface AppNotification {
  id: string;
  request_id?: string;
  event_type: string;
  actor_name: string | null;
  created_at: string;
  event_data: Record<string, any> | null;
  is_read?: boolean;
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
