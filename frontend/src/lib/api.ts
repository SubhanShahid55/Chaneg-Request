import { ChangeRequest, Project, RequestStatus, ScopeDeliverable } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const API_BASE_URL = API_URL;

function accessToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('changeflow_access_token') || '';
}
function refreshToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('changeflow_refresh_token') || '';
}

function storeTokens(tokens: { access_token: string; refresh_token?: string }) {
  localStorage.setItem('changeflow_access_token', tokens.access_token);
  if (tokens.refresh_token) localStorage.setItem('changeflow_refresh_token', tokens.refresh_token);
}

export interface AuthProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'standard' | 'client';
  is_active: boolean;
  avatar_url: string | null;
  job_title?: string | null;
}

export async function login(email: string, password: string) {
  const response = await apiFetch<{ access_token: string; refresh_token: string; profile: AuthProfile }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  storeTokens(response);
  localStorage.setItem('changeflow_profile', JSON.stringify(response.profile));
  return response.profile;
}

export async function validateSession(token: string) {
  let response = await fetch(`${API_URL}/auth/session`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (response.status === 401 && refreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await fetch(`${API_URL}/auth/session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${refreshed}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
    }
  }
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Your invitation session is invalid or expired.');
  const result = await response.json() as { profile: AuthProfile };
  localStorage.setItem('changeflow_profile', JSON.stringify(result.profile));
  return result.profile;

}

export async function setInvitationPassword(password: string, name?: string, job_title?: string) {
  return apiFetch<{ success: true }>('/auth/password', {
    method: 'POST',
    body: JSON.stringify({ password, name, job_title }),
  });
}

export async function updatePassword(password: string) {
  return apiFetch<{ success: true }>('/auth/update-password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function requestPasswordReset(email: string) {
  return apiFetch<{ success: true }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function updateProfile(updates: { name?: string; job_title?: string }) {
  const response = await apiFetch<{ profile: AuthProfile }>('/profile', { method: 'PATCH', body: JSON.stringify(updates) });
  localStorage.setItem('changeflow_profile', JSON.stringify(response.profile));
  return response.profile;
}

export async function uploadProfileAvatar(dataUrl: string) {
  const response = await apiFetch<{ profile: AuthProfile }>('/profile/avatar', { method: 'POST', body: JSON.stringify({ dataUrl }) });
  localStorage.setItem('changeflow_profile', JSON.stringify(response.profile));
  return response.profile;
}

export async function removeProfileAvatar() {
  const response = await apiFetch<{ profile: AuthProfile }>('/profile/avatar', { method: 'DELETE' });
  localStorage.setItem('changeflow_profile', JSON.stringify(response.profile));
  return response.profile;
}

export function logout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('changeflow_access_token');
    localStorage.removeItem('changeflow_refresh_token');
  localStorage.removeItem('changeflow_profile');
}

export function storedProfile(): AuthProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem('changeflow_profile');
    return value ? JSON.parse(value) as AuthProfile : null;
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const currentRefreshToken = refreshToken();
  if (!currentRefreshToken) return null;
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: currentRefreshToken }),
    cache: 'no-store',
  });
  if (!response.ok) {
    logout();
    return null;
  }
  const tokens = await response.json() as { access_token: string; refresh_token: string };
  storeTokens(tokens);
  return tokens.access_token;
}

export interface AdminUser extends AuthProfile {
  created_at?: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  invite_status?: 'invited' | 'active' | 'inactive';
}

export async function fetchAdminUsers() {
  return apiFetch<{ users: AdminUser[] }>('/admin/users');
}

export async function inviteAdminUser(data: { name: string; email: string; role: 'admin' | 'standard'; job_title?: string }) {
  return apiFetch<{ user: AdminUser; invitation_link?: string; email_sent?: boolean; rate_limited?: boolean }>('/admin/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdminUser(id: string, updates: Partial<Pick<AdminUser, 'name' | 'role' | 'is_active'>>) {
  return apiFetch<{ user: AdminUser }>(`/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export async function resendAdminInvite(id: string) {
  return apiFetch<{ success: true; invitation_link?: string; email_sent?: boolean; message?: string }>(`/admin/users/${encodeURIComponent(id)}/resend-invite`, { method: 'POST', body: '{}' });
}

export async function uploadAdminAvatar(id: string, dataUrl: string) {
  return apiFetch<{ user: AdminUser }>(`/admin/users/${encodeURIComponent(id)}/avatar`, { method: 'POST', body: JSON.stringify({ dataUrl }) });
}

export async function removeAdminAvatar(id: string) {
  return apiFetch<{ user: AdminUser }>(`/admin/users/${encodeURIComponent(id)}/avatar`, { method: 'DELETE' });
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isPublicApproval = path.startsWith('/approval');
  const request = (token: string) => fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token && !isPublicApproval ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  });
  let token = accessToken();
  let response = await request(token);
  if (!isPublicApproval && response.status === 401 && refreshToken() && path !== '/auth/refresh') {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      token = refreshed;
      response = await request(token);
    }
  }
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || `Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

function mapRequest(row: any): ChangeRequest {
  const client = row.clients || row.client || {};
  const project = row.projects || row.project || {};
  const deliverables = (row.deliverables || []).map((item: any) => ({
    id: item.id,
    title: item.description,
    description: item.description,
    hours: Number(item.hours || 0),
    category: item.category,
    complexity: item.complexity || 'standard',
  }));
  const totalHours = deliverables.reduce((acc: number, d: any) => acc + d.hours, 0);
  const hourlyRate = Number(row.hourly_rate || 0);
  const totalCost = totalHours * hourlyRate;

  return {
    id: row.reference_code || row.id,
    databaseId: row.id,
    client: client.company_name || '',
    clientLogo: client.avatar_url || undefined,
    project: project.name || '',
    projectDetails: project.id ? { ...project } : undefined,
    title: row.title || '',
    description: row.client_quote || '',
    rawQuote: row.client_quote || '',
    channel: row.source_channel || 'Portal',
    channelSource: row.source_channel || '',
    urgency: row.priority === 'critical' ? 'Critical' : row.priority === 'priority' ? 'High' : 'Medium',
    status: row.status,
    estimatedHours: totalHours,
    hourlyRate: hourlyRate,
    estimatedCost: totalCost,
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
    deliverables,
    exclusions: (row.exclusions || []).map((item: any) => item.description),
    approvalToken: row.approval_link?.token || '',
    approvalDetails: row.approval_response ? {
      approvedAt: row.approval_response.responded_at,
      approvedBy: row.approval_response.decision === 'approved' ? client.contact_name : undefined,
      confirmationCode: row.approval_response.confirmation_code || undefined,
      feedbackNotes: row.approval_response.decline_reason || undefined,
    } : undefined,
    notes: row.notes || [],
    activityEvents: (row.activity_events || []).map((e: any) => ({
      id: e.id,
      request_id: e.request_id,
      event_type: e.event_type,
      event_data: e.event_data,
      actor_name: e.actor_name,
      created_at: e.created_at,
    })),
    attachments: (row.request_attachments || []).map((a: any) => ({
      id: a.id,
      name: a.file_name,
      url: a.signed_url || a.file_path,
    })),
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

export async function fetchProjects(): Promise<Project[]> {
  const response = await apiFetch<{ projects: Project[] }>('/projects');
  return response.projects;
}

export async function fetchClientProjects(clientId: string): Promise<Project[]> {
  const response = await apiFetch<{ projects: Project[] }>(`/projects/client/${encodeURIComponent(clientId)}`);
  return response.projects;
}

export async function fetchProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${encodeURIComponent(id)}`);
}

export async function createProject(data: {
  client_id: string;
  name: string;
  description?: string;
  scope_summary?: string;
  agreed_budget?: number;
  timeline_days?: number;
  deliverables: Array<{ description: string; hours?: number; category: string; complexity?: string }>;
}) {
  return apiFetch<Project>('/projects', { method: 'POST', body: JSON.stringify(data) });
}

export async function createClient(data: { company_name: string; contact_name: string; contact_email: string }) {
  return apiFetch<{ client: ClientOption }>('/clients', { method: 'POST', body: JSON.stringify(data) });
}

export async function inviteClientContact(clientId: string, data: { name: string; email: string }) {
  return apiFetch<{ user: any; invitation_link?: string }>(`/admin/clients/${encodeURIComponent(clientId)}/invite`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createRequest(data: {
  client_id: string;
  title: string;
  client_quote?: string;
  source_channel?: string;
  priority?: string;
  project_id?: string;
  hourly_rate?: number;
  deliverables: Array<{ description: string; hours?: number; category: string; complexity?: string }>;
  target_delivery_date?: string;
  timeline_days?: number;
}) {
  return apiFetch<any>('/requests', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchRequest(id: string): Promise<ChangeRequest> {
  return mapRequest(await apiFetch<any>(`/requests/${encodeURIComponent(id)}`));
}

export async function updateRequestStatus(id: string, status: RequestStatus) {
  if (status === 'pending' || status === 'awaiting_approval') {
    return apiFetch(`/requests/${encodeURIComponent(id)}/send-for-approval`, { method: 'POST', body: '{}' });
  }
  return apiFetch(`/requests/${encodeURIComponent(id)}/advance`, { method: 'POST', body: '{}' });
}

export async function approveReview(id: string) {
  return apiFetch(`/requests/${encodeURIComponent(id)}/approve-review`, { method: 'POST', body: '{}' });
}

export async function requestReviewChanges(id: string, reason: string) {
  return apiFetch(`/requests/${encodeURIComponent(id)}/request-review-changes`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function updateEstimate(id: string, data: {
  hourly_rate?: number;
  hours?: number;
  cost?: number;
  target_delivery_date?: string;
  timeline_days?: number;
  deliverables?: Array<{ description: string; hours?: number; category: string; complexity?: string }>;
  exclusions?: string[];
}) {
  return apiFetch<any>(`/requests/${encodeURIComponent(id)}/estimate`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchRequestActivity(id: string) {
  const response = await apiFetch<{ events: any[] }>(`/requests/${encodeURIComponent(id)}/activity`);
  return response.events || [];
}

export async function addRequestNote(id: string, content: string) {
  return apiFetch(`/requests/${encodeURIComponent(id)}/notes`, { method: 'POST', body: JSON.stringify({ content }) });
}

export async function fetchApproval(token: string) {
  return apiFetch<any>(`/approval/${encodeURIComponent(token)}`);
}

export async function approveApproval(token: string) {
  return apiFetch<{ confirmation_code: string }>(`/approval/${encodeURIComponent(token)}/approve`, { method: 'POST', body: '{}' });
}

export async function declineApproval(token: string, reason: string) {
  return apiFetch(`/approval/${encodeURIComponent(token)}/decline`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function fetchActivity(since?: string) {
  const query = since ? `?since=${encodeURIComponent(since)}` : '';
  return apiFetch<{ events: Array<{ id: string; request_id?: string; event_type: string; actor_name: string | null; created_at: string; event_data: Record<string, unknown> | null }> }>(`/events/recent${query}`);
}

export async function fetchWeeklyVelocity() {
  return apiFetch<{ weeks: Array<{ week: string; approved: number; pending: number }> }>('/stats/weekly-velocity');
}

// ─── Portal API ──────────────────────────────────────────────────────────

export async function fetchPortalProject() {
  return apiFetch<{ project: Project; rollup: any }>('/portal/project');
}

export async function fetchPortalRequests() {
  return apiFetch<{ requests: any[] }>('/portal/requests');
}

export async function fetchPortalRequest(id: string) {
  return apiFetch<{ request: any }>(`/portal/requests/${encodeURIComponent(id)}`);
}

export async function submitPortalRequest(data: { title: string; client_quote?: string; attachment?: { dataUrl: string; name: string } }) {
  return apiFetch<{ request: any }>('/portal/requests', { method: 'POST', body: JSON.stringify(data) });
}

export async function approvePortalRequest(id: string) {
  return apiFetch<{ success: true; confirmation_code: string }>(`/portal/requests/${encodeURIComponent(id)}/approve`, { method: 'POST', body: '{}' });
}

export async function declinePortalRequest(id: string, reason?: string) {
  return apiFetch<{ success: true }>(`/portal/requests/${encodeURIComponent(id)}/decline`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export { mapRequest };
