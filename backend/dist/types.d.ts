export type RequestStatus = 'draft' | 'pending' | 'reviewing' | 'awaiting_approval' | 'approved' | 'in_progress' | 'completed' | 'declined';
export type Priority = 'standard' | 'priority' | 'critical';
export type SourceChannel = 'call' | 'text' | 'meeting' | 'email';
export type DeliverableCategory = 'Frontend' | 'Backend' | 'Database / API' | 'QA & DevOps';
export type DeliverableComplexity = 'simple' | 'standard' | 'complex';
export interface Profile {
    id: string;
    name: string;
    role: 'admin' | 'standard';
    is_active: boolean;
    avatar_url: string | null;
    email: string;
    job_title: string | null;
}
export interface Client {
    id: string;
    company_name: string;
    contact_name: string;
    contact_email: string;
    avatar_url: string | null;
    created_at: string;
}
export interface Project {
    id: string;
    client_id: string;
    name: string;
    description: string | null;
    scope_summary: string | null;
    agreed_budget: number | null;
    timeline_days: number | null;
}
export interface ChangeRequest {
    id: string;
    reference_code: string;
    client_id: string;
    project_id: string | null;
    title: string;
    client_quote: string | null;
    source_channel: SourceChannel | null;
    priority: Priority;
    status: RequestStatus;
    hourly_rate: number | null;
    hours: number | null;
    cost: number | null;
    target_delivery_date: string | null;
    timeline_days: number | null;
    created_by: string;
    created_at: string;
    updated_at: string;
}
export interface Deliverable {
    id: string;
    request_id: string;
    description: string;
    hours: number;
    category: string;
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
export interface Exclusion {
    id: string;
    request_id: string;
    description: string;
}
export interface Note {
    id: string;
    request_id: string;
    author_id: string;
    content: string;
    created_at: string;
}
export interface ApprovalLink {
    id: string;
    request_id: string;
    token: string;
    created_at: string;
    expires_at: string;
    viewed_at: string | null;
}
export interface ApprovalResponse {
    id: string;
    request_id: string;
    decision: 'approved' | 'declined';
    confirmation_code: string | null;
    decline_reason: string | null;
    responded_at: string;
}
export interface ActivityEvent {
    id: string;
    request_id: string;
    event_type: string;
    event_data: Record<string, unknown> | null;
    actor_name: string | null;
    created_at: string;
}
export interface CreateRequestBody {
    client_id: string;
    project_id?: string;
    title: string;
    client_quote?: string;
    source_channel?: SourceChannel;
    priority?: Priority;
    hourly_rate?: number;
    hours?: number;
    cost?: number;
    target_delivery_date?: string;
    timeline_days?: number;
    deliverables?: Array<{
        description: string;
        hours?: number;
        category: string;
        complexity?: string;
    }>;
    exclusions?: string[];
}
export interface UpdateEstimateBody {
    hourly_rate: number;
    hours?: number;
    cost?: number;
    target_delivery_date: string;
    timeline_days: number;
    deliverables: Array<{
        description: string;
        hours?: number;
        category: string;
        complexity?: string;
    }>;
    exclusions: string[];
}
export interface ApprovalTokenResult {
    state: 'valid' | 'expired' | 'already_responded';
    request?: {
        reference_code: string;
        title: string;
        client_quote: string | null;
        priority: Priority;
        cost: number | null;
        hours: number | null;
        hourly_rate: number | null;
        target_delivery_date: string | null;
        timeline_days: number | null;
        client_name: string;
        contact_name: string;
    };
    deliverables?: Deliverable[];
    exclusions?: Exclusion[];
    response?: ApprovalResponse;
}
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            userEmail?: string;
            userRole?: 'admin' | 'standard';
        }
    }
}
//# sourceMappingURL=types.d.ts.map