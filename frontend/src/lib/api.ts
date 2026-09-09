import { ChangeRequest, RequestStatus, ScopeDeliverable } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const API_BASE_URL = API_URL;

function accessToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('changeflow_access_token') || '';
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = accessToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || `Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

function mapRequest(row: any): ChangeRequest {
  const client = row.clients || row.client || {};
  const project = row.projects || row.project || {};
  return {
    id: row.reference_code || row.id,
    databaseId: row.id,
    client: client.company_name || '',
    clientLogo: client.avatar_url || undefined,
    project: project.name || '',
    title: row.title || '',
    description: row.client_quote || '',
    rawQuote: row.client_quote || '',
    channel: row.source_channel || 'Portal',
    channelSource: row.source_channel || '',
    urgency: row.priority === 'critical' ? 'Critical' : row.priority === 'priority' ? 'High' : 'Medium',
    status: row.status,
    estimatedHours: Number(row.hours || 0),
    hourlyRate: Number(row.hourly_rate || 0),
    estimatedCost: Number(row.cost || 0),
    targetSprint: row.target_delivery_date || '',
    targetTurnaroundDays: Number(row.timeline_days || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    clientContact: {
      name: client.contact_name || '',
      email: client.contact_email || '',
      role: '',
      avatarUrl: client.avatar_url || '',
    },
    assignedLead: {
      name: row.profiles?.name || '',
      role: row.profiles?.role || '',
      avatarUrl: row.profiles?.avatar_url || '',
    },
    deliverables: (row.deliverables || []).map((item: any) => ({
      id: item.id,
      title: item.description,
      description: item.description,
      hours: Number(item.hours || 0),
      category: item.category,
    })),
    exclusions: (row.exclusions || []).map((item: any) => item.description),
    approvalToken: row.approval_link?.token || '',
    approvalDetails: row.approval_response ? {
      approvedAt: row.approval_response.responded_at,
      approvedBy: row.approval_response.decision === 'approved' ? client.contact_name : undefined,
      confirmationCode: row.approval_response.confirmation_code || undefined,
      feedbackNotes: row.approval_response.decline_reason || undefined,
    } : undefined,
    notes: row.notes || [],
  };
}

export async function fetchRequests(): Promise<ChangeRequest[]> {
  const response = await apiFetch<{ data: any[] }>('/requests?limit=100');
  return response.data.map(mapRequest);
}

export interface ClientOption {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  avatar_url: string | null;
}

export async function fetchClients(): Promise<ClientOption[]> {
  const response = await apiFetch<{ clients: ClientOption[] }>('/clients');
  return response.clients;
}

export async function createRequest(data: {
  client_id: string;
  title: string;
  client_quote?: string;
  source_channel?: string;
  priority?: string;
  project_id?: string;
  hourly_rate?: number;
  hours?: number;
  cost?: number;
  target_delivery_date?: string;
  timeline_days?: number;
}) {
  return apiFetch<any>('/requests', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchRequest(id: string): Promise<ChangeRequest> {
  return mapRequest(await apiFetch<any>(`/requests/${encodeURIComponent(id)}`));
}

export async function updateRequestStatus(id: string, status: RequestStatus) {
  if (status === 'pending') return apiFetch(`/requests/${encodeURIComponent(id)}/send-for-approval`, { method: 'POST', body: '{}' });
  return apiFetch(`/requests/${encodeURIComponent(id)}/advance`, { method: 'POST', body: '{}' });
}

export async function addRequestNote(id: string, content: string) {
  return apiFetch(`/requests/${encodeURIComponent(id)}/notes`, { method: 'POST', body: JSON.stringify({ content }) });
}

export async function approveApproval(token: string) {
  return apiFetch<{ confirmation_code: string }>(`/approval/${encodeURIComponent(token)}/approve`, { method: 'POST', body: '{}' });
}

export async function declineApproval(token: string, reason: string) {
  return apiFetch(`/approval/${encodeURIComponent(token)}/decline`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function fetchActivity() {
  return apiFetch<{ events: Array<{ id: string; event_type: string; actor_name: string | null; created_at: string; event_data: Record<string, unknown> | null }> }>('/events/recent');
}

export async function fetchWeeklyVelocity() {
  return apiFetch<{ weeks: Array<{ week: string; approved: number; pending: number }> }>('/stats/weekly-velocity');
}

export { mapRequest };