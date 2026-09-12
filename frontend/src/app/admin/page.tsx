'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminUser, ClientOption, createClient, fetchAdminUsers, fetchClients, inviteAdminUser, inviteClientContact, resendAdminInvite, storedProfile, updateAdminUser } from '@/lib/api';
import { AppProvider, useApp } from '@/lib/store';
import { Header } from '@/components/Header';

type RoleFilter = 'all' | 'admin' | 'standard';
type StatusFilter = 'all' | 'active' | 'inactive';

function AdminContent() {
  const router = useRouter();
  const { currentUser } = useApp();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'standard'>('standard');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [inviteLinkInfo, setInviteLinkInfo] = useState<{ email: string; link: string; rateLimited?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clientSubmitting, setClientSubmitting] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [invitingClientId, setInvitingClientId] = useState<string | null>(null);

  async function loadClients() {
    try {
      const data = await fetchClients();
      setClients(data);
    } catch {
      // Ignore client loading failure
    } finally {
      setLoadingClients(false);
    }
  }

  async function handleInviteClient(client: ClientOption) {
    setError('');
    setMessage('');
    setInvitingClientId(client.id);
    try {
      const res = await inviteClientContact(client.id, {
        name: client.contact_name,
        email: client.contact_email,
      });
      if (res.invitation_link) {
        setInviteLinkInfo({ email: client.contact_email, link: res.invitation_link });
        try {
          await navigator.clipboard.writeText(res.invitation_link);
          setMessage(`Portal invitation link generated and copied to clipboard for ${client.contact_name} (${client.contact_email}).`);
        } catch {
          setMessage(`Portal invitation link generated for ${client.contact_name} (${client.contact_email}). Share the link below.`);
        }
      } else {
        setMessage(`Portal invitation sent to ${client.contact_email}.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to invite this client.');
    } finally {
      setInvitingClientId(null);
    }
  }

  async function loadUsers() {
    try {
      const response = await fetchAdminUsers();
      setUsers(response.users);
      setError('');
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : 'Unable to load users right now.';
      if (text.toLowerCase().includes('permission')) {
        setForbidden(true);
      } else {
        setError(text);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (storedProfile()?.role !== 'admin') {
      setForbidden(true);
      setLoading(false);
      return;
    }
    void loadUsers();
    void loadClients();
  }, []);

  useEffect(() => {
    if (!currentUser.id) return;
    setUsers((current) => current.map((user) => user.id === currentUser.id ? { ...user, name: currentUser.name, avatar_url: currentUser.avatarUrl } : user));
  }, [currentUser]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setInviteLinkInfo(null);
    setSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await inviteAdminUser({ name: name.trim(), email: normalizedEmail, role, job_title: jobTitle.trim() });
      if (response.invitation_link) {
        setInviteLinkInfo({
          email: normalizedEmail,
          link: response.invitation_link,
          rateLimited: response.rate_limited,
        });
        if (response.rate_limited) {
          setMessage(`User created. Email rate limit was reached on the mail server, so please share the direct invitation link below with ${normalizedEmail}.`);
        } else if (response.email_sent) {
          setMessage(`Invitation sent to ${normalizedEmail}.`);
        } else {
          setMessage(`User created. Share the invitation link below.`);
        }
      } else {
        setMessage(`Invitation sent to ${normalizedEmail}.`);
      }
      setName('');
      setEmail('');
      setRole('standard');
      setJobTitle('');
      await loadUsers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to register this user.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClientSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setClientSubmitting(true);
    try {
      await createClient({ company_name: companyName.trim(), contact_name: contactName.trim(), contact_email: contactEmail.trim().toLowerCase() });
      setMessage(`Client ${companyName.trim()} added successfully.`);
      setCompanyName('');
      setContactName('');
      setContactEmail('');
      await loadClients();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to add this client.');
    } finally {
      setClientSubmitting(false);
    }
  }

  async function toggleUser(user: AdminUser) {
    if (user.id === storedProfile()?.id) return;
    if (user.is_active && !window.confirm(`Deactivate ${user.name}? They will no longer be able to sign in.`)) return;
    try {
      await updateAdminUser(user.id, { is_active: !user.is_active });
      setMessage(`${user.name} is now ${user.is_active ? 'inactive' : 'active'}.`);
      await loadUsers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update this user.');
    }
  }

  async function resendInvite(user: AdminUser) {
    setError('');
    setMessage('');
    try {
      const res = await resendAdminInvite(user.id);
      if (res.invitation_link) {
        setInviteLinkInfo({ email: user.email, link: res.invitation_link });
        try {
          await navigator.clipboard.writeText(res.invitation_link);
          setMessage(`Invitation link generated and copied to clipboard for ${user.email}.`);
        } catch {
          setMessage(`Invitation link generated for ${user.email}. Share the link below.`);
        }
      } else {
        setMessage(`Invitation resent to ${user.email}.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to resend this invitation.');
    }
  }

  const active = users.filter((user) => user.is_active).length;
  const admins = users.filter((user) => user.role === 'admin').length;
  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? user.is_active : !user.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (forbidden) return <PermissionState onBack={() => router.push('/dashboard')} />;

  return (
    <><Header /><main className="min-h-screen bg-[#f8f9ff] px-5 pb-16 pt-24 text-[#0b1c30] md:px-10 md:pt-28">
      <div className="mx-auto max-w-6xl">
        <button onClick={() => router.push('/dashboard')} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#4f46e5] hover:text-[#3525cd]"><span aria-hidden="true">&#8592;</span> Back to dashboard</button>
        <header className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4f46e5]">Administration</p><h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">User management</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#464555]">Control who can access ChangeFlow. Invite teammates, review account status, and keep administrator access limited to the right people.</p></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Total users" value={users.length} /><Stat label="Active" value={active} tone="blue" /><Stat label="Inactive" value={users.length - active} tone="muted" /><Stat label="Admins" value={admins} tone="blue" /></div>
        </header>
        {error && <Alert tone="error">{error}</Alert>}
        {message && <Alert tone="success">{message}</Alert>}
        {inviteLinkInfo && (
          <div className="mt-6 rounded-2xl border border-[#c7d2fe] bg-[#eef2ff] p-5 text-[#1e1b4b] shadow-sm animate-in fade-in duration-200">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4f46e5] text-xs font-bold text-white">✓</span>
                <p className="text-sm font-semibold">
                  Invitation Link for <span className="underline">{inviteLinkInfo.email}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteLinkInfo.link);
                    setMessage('Invitation link copied to clipboard!');
                  } catch {
                    // clipboard fallback
                  }
                }}
                className="inline-flex items-center justify-center rounded-lg bg-[#4f46e5] px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-[#3525cd] active:scale-95 transition"
              >
                Copy invitation link
              </button>
            </div>
            <p className="mt-2 text-xs text-[#4338ca]">
              {inviteLinkInfo.rateLimited
                ? 'Notice: The email service rate limit was exceeded on the server, so the email could not be sent automatically. You can share this direct link with the user to activate their account:'
                : 'Direct invitation link (can be shared with the user):'}
            </p>
            <div className="mt-2 flex items-center rounded-lg border border-[#c7d2fe] bg-white p-2.5 font-mono text-xs text-[#0b1c30] break-all select-all">
              {inviteLinkInfo.link}
            </div>
          </div>
        )}
        <section className="mt-8 rounded-2xl border border-[#d3e4fe] bg-white p-6 shadow-[0_8px_24px_rgba(30,58,95,0.05)] md:p-7">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><h2 className="text-lg font-semibold">Register a new user</h2><p className="mt-1 text-sm leading-6 text-[#464555]">They will receive an invitation to set their own password. Passwords are never shown to administrators.</p></div><span className="rounded-full bg-[#eff4ff] px-3 py-1 text-xs font-semibold text-[#3525cd]">Invitation only</span></div>
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_190px_auto] lg:items-end"><Field label="Full name"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Jordan Lee" className="field" /></Field><Field label="Email address"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="field" /></Field><Field label="Role / title"><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="e.g. Project manager" className="field" /></Field><Field label="Access level"><select value={role} onChange={(event) => setRole(event.target.value as 'admin' | 'standard')} className="field"><option value="standard">Standard user</option><option value="admin">Administrator</option></select></Field><button type="submit" disabled={submitting} className="rounded-lg bg-[#4f46e5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3525cd] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Sending invitation...' : 'Send invitation'}</button></form>
        </section>
        <section className="mt-6 rounded-2xl border border-[#d3e4fe] bg-white p-6 shadow-[0_8px_24px_rgba(30,58,95,0.05)] md:p-7">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-lg font-semibold">Clients &amp; Portal Access</h2>
              <p className="mt-1 text-sm leading-6 text-[#464555]">
                Manage client companies and invite client contacts to their dedicated client portal.
              </p>
            </div>
            <span className="rounded-full bg-[#eff4ff] px-3 py-1 text-xs font-semibold text-[#3525cd]">Client management</span>
          </div>

          <form onSubmit={handleClientSubmit} className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end border-b border-[#e2e8f0] pb-6">
            <Field label="Company name"><input required value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="e.g. Northstar Studio" className="field" /></Field>
            <Field label="Contact name"><input required value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="e.g. Alex Morgan" className="field" /></Field>
            <Field label="Contact email"><input required type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="alex@company.com" className="field" /></Field>
            <button type="submit" disabled={clientSubmitting} className="rounded-lg bg-[#4f46e5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3525cd] disabled:cursor-not-allowed disabled:opacity-60">{clientSubmitting ? 'Adding client...' : 'Add client'}</button>
          </form>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#777587]">Existing Clients</h3>
            {loadingClients ? (
              <div className="mt-3 space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-[#eff4ff]" />
                ))}
              </div>
            ) : clients.length === 0 ? (
              <p className="mt-3 text-sm text-[#777587]">No clients added yet. Add a client above to enable portal invitations.</p>
            ) : (
              <div className="mt-3 divide-y divide-[#e2e8f0]">
                {clients.map((c) => (
                  <div key={c.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-[#0b1c30]">{c.company_name}</p>
                      <p className="text-xs text-[#464555]">Primary contact: {c.contact_name} ({c.contact_email})</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInviteClient(c)}
                      disabled={invitingClientId === c.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#c7d2fe] bg-[#eff4ff] px-3 py-1.5 text-xs font-semibold text-[#3525cd] hover:bg-[#dbeafe] disabled:opacity-60 transition"
                    >
                      {invitingClientId === c.id ? 'Generating invite...' : 'Invite to Portal'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        <section className="mt-6 overflow-hidden rounded-2xl border border-[#d3e4fe] bg-white shadow-[0_8px_24px_rgba(30,58,95,0.05)]">
          <div className="border-b border-[#e2e8f0] px-6 py-5 md:px-7"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><h2 className="text-lg font-semibold">People with access</h2><p className="mt-1 text-sm text-[#464555]">{loading ? 'Loading accounts...' : `${filteredUsers.length} of ${users.length} users shown`}</p></div><div className="flex flex-col gap-3 sm:flex-row"><label><span className="sr-only">Search users</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="field min-w-60" /></label><label><span className="sr-only">Filter by role</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)} className="field"><option value="all">All roles</option><option value="admin">Administrators</option><option value="standard">Standard users</option></select></label><label><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="field"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div></div></div>
          {loading ? <div className="space-y-3 p-6">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-[#eff4ff]" />)}</div> : filteredUsers.length === 0 ? <div className="px-6 py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eff4ff] text-xl text-[#3525cd]">&#128100;</div><h3 className="mt-4 font-semibold">{users.length === 0 ? 'No users yet' : 'No users match these filters'}</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#464555]">{users.length === 0 ? 'Send an invitation above to give a teammate access to ChangeFlow.' : 'Try a different name, email, role, or account status.'}</p></div> : <div className="divide-y divide-[#e2e8f0]">{filteredUsers.map((user) => <UserRow key={user.id} user={user} isCurrentUser={user.id === storedProfile()?.id} onToggle={toggleUser} onResend={resendInvite} />)}</div>}
        </section>
      </div>
    </main></>
  );
}

export default function AdminPage() {
  return <AppProvider><AdminContent /></AppProvider>;
}

function UserRow({ user, isCurrentUser, onToggle, onResend }: { user: AdminUser; isCurrentUser: boolean; onToggle: (user: AdminUser) => void; onResend: (user: AdminUser) => void }) {
  return (
    <div className="flex flex-col gap-4 px-6 py-5 transition hover:bg-[#fafbff] sm:flex-row sm:items-center sm:justify-between md:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar name={user.name || user.email} avatarUrl={user.avatar_url || ''} />
        <div className="min-w-0">
          <p className="truncate font-medium">{user.name || 'Unnamed user'} {isCurrentUser && <span className="ml-1 text-xs font-normal text-[#777587]">(you)</span>}</p>
          <p className="truncate text-sm text-[#464555]">{user.email}</p>
          {user.job_title && <p className="truncate text-xs text-[#3525cd]">{user.job_title}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm sm:justify-end">
        <span className="rounded-full bg-[#eff4ff] px-3 py-1 text-xs font-semibold text-[#3323cc]">{user.role === 'admin' ? 'Administrator' : 'Standard user'}</span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.invite_status === 'inactive' ? 'bg-[#fff2f0] text-[#9d2c27]' : user.invite_status === 'invited' ? 'bg-[#fff8e8] text-[#9a6500]' : 'bg-[#eff4ff] text-[#3525cd]'}`}>
          {user.invite_status === 'invited' ? 'Invitation pending' : user.invite_status === 'inactive' ? 'Inactive' : 'Active'}
        </span>
        {user.invite_status === 'invited' && <button onClick={() => onResend(user)} className="rounded-md px-2 py-1 font-semibold text-[#3525cd] hover:bg-[#eff4ff]">Resend / Get link</button>}
        <button onClick={() => onToggle(user)} disabled={isCurrentUser} className="rounded-md px-2 py-1 font-semibold text-[#3525cd] hover:bg-[#eff4ff] disabled:cursor-not-allowed disabled:text-[#94a3b8]">
          {user.is_active ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
}

function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  return avatarUrl ? <img src={avatarUrl} alt={`${name} profile`} className="h-11 w-11 rounded-full object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e5eeff] font-semibold text-[#3525cd]">{(name || 'U').slice(0, 1).toUpperCase()}</span>;
}

function PermissionState({ onBack }: { onBack: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9ff] px-5 text-[#0b1c30]">
      <section className="w-full max-w-md rounded-2xl border border-[#d3e4fe] bg-white p-8 text-center shadow-[0_18px_60px_rgba(30,58,95,0.08)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eff4ff] text-xl text-[#3525cd]">!</div>
        <h1 className="mt-5 text-xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-sm leading-6 text-[#464555]">You do not have permission to view this page. Ask an administrator if you need access.</p>
        <button onClick={onBack} className="mt-6 rounded-lg bg-[#4f46e5] px-5 py-3 text-sm font-semibold text-white hover:bg-[#3525cd]">Back to dashboard</button>
      </section>
    </main>
  );
}

function Stat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'muted' | 'blue' }) {
  const tones = { default: 'text-[#0b1c30]', muted: 'text-[#777587]', blue: 'text-[#245d78]' };
  return (
    <div className="min-w-[82px] rounded-xl border border-[#d3e4fe] bg-white px-3 py-3 text-center">
      <p className={`text-xl font-semibold ${tones[tone]}`}>{value}</p>
      <p className="mt-1 text-[11px] text-[#777587]">{label}</p>
    </div>
  );
}

function Alert({ children, tone }: { children: React.ReactNode; tone: 'error' | 'success' }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`mt-6 rounded-lg border p-3 text-sm ${tone === 'error' ? 'border-[#e9b8b4] bg-[#fff5f4] text-[#ba1a1a]' : 'border-[#d3e4fe] bg-[#eff4ff] text-[#3525cd]'}`}>
      {children}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
