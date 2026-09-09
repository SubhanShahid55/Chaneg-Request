'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminUser, fetchAdminUsers, inviteAdminUser, storedProfile, updateAdminUser } from '@/lib/api';
import { AppProvider } from '@/lib/store';
import { Header } from '@/components/Header';

type RoleFilter = 'all' | 'admin' | 'standard';
type StatusFilter = 'all' | 'active' | 'inactive';

function AdminContent() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'standard'>('standard');
  const [jobTitle, setJobTitle] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [forbidden, setForbidden] = useState(false);

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
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await inviteAdminUser({ name: name.trim(), email: normalizedEmail, role, job_title: jobTitle.trim() });
      setMessage(`Invitation sent to ${normalizedEmail}.`);
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
    <><Header /><main className="min-h-screen bg-[#f6f8f7] px-5 pb-16 pt-24 text-[#18322b] md:px-10 md:pt-28">
      <div className="mx-auto max-w-6xl">
        <button onClick={() => router.push('/dashboard')} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#176b57] hover:text-[#0f4f3f]"><span aria-hidden="true">&#8592;</span> Back to dashboard</button>
        <header className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#176b57]">Administration</p><h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">User management</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#5d7069]">Control who can access ChangeFlow. Invite teammates, review account status, and keep administrator access limited to the right people.</p></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Total users" value={users.length} /><Stat label="Active" value={active} tone="green" /><Stat label="Inactive" value={users.length - active} tone="muted" /><Stat label="Admins" value={admins} tone="blue" /></div>
        </header>
        {error && <Alert tone="error">{error}</Alert>}
        {message && <Alert tone="success">{message}</Alert>}
        <section className="mt-8 rounded-2xl border border-[#d6e5de] bg-white p-6 shadow-[0_8px_24px_rgba(28,61,49,0.05)] md:p-7">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><h2 className="text-lg font-semibold">Register a new user</h2><p className="mt-1 text-sm leading-6 text-[#5d7069]">They will receive an invitation to set their own password. Passwords are never shown to administrators.</p></div><span className="rounded-full bg-[#edf7f2] px-3 py-1 text-xs font-semibold text-[#176b57]">Invitation only</span></div>
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_190px_auto] lg:items-end"><Field label="Full name"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Jordan Lee" className="field" /></Field><Field label="Email address"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="field" /></Field><Field label="Role / title"><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="e.g. Project manager" className="field" /></Field><Field label="Access level"><select value={role} onChange={(event) => setRole(event.target.value as 'admin' | 'standard')} className="field"><option value="standard">Standard user</option><option value="admin">Administrator</option></select></Field><button type="submit" disabled={submitting} className="rounded-lg bg-[#176b57] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#115642] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Sending invitation...' : 'Send invitation'}</button></form>
        </section>
        <section className="mt-6 overflow-hidden rounded-2xl border border-[#d6e5de] bg-white shadow-[0_8px_24px_rgba(28,61,49,0.05)]">
          <div className="border-b border-[#e4eee9] px-6 py-5 md:px-7"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><h2 className="text-lg font-semibold">People with access</h2><p className="mt-1 text-sm text-[#5d7069]">{loading ? 'Loading accounts...' : `${filteredUsers.length} of ${users.length} users shown`}</p></div><div className="flex flex-col gap-3 sm:flex-row"><label><span className="sr-only">Search users</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="field min-w-60" /></label><label><span className="sr-only">Filter by role</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)} className="field"><option value="all">All roles</option><option value="admin">Administrators</option><option value="standard">Standard users</option></select></label><label><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="field"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div></div></div>
          {loading ? <div className="space-y-3 p-6">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-[#f0f5f2]" />)}</div> : filteredUsers.length === 0 ? <div className="px-6 py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#edf7f2] text-xl text-[#176b57]">&#128100;</div><h3 className="mt-4 font-semibold">{users.length === 0 ? 'No users yet' : 'No users match these filters'}</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#5d7069]">{users.length === 0 ? 'Send an invitation above to give a teammate access to ChangeFlow.' : 'Try a different name, email, role, or account status.'}</p></div> : <div className="divide-y divide-[#e4eee9]">{filteredUsers.map((user) => <UserRow key={user.id} user={user} isCurrentUser={user.id === storedProfile()?.id} onToggle={toggleUser} />)}</div>}
        </section>
      </div>
    </main></>
  );
}

export default function AdminPage() {
  return <AppProvider><AdminContent /></AppProvider>;
}

function UserRow({ user, isCurrentUser, onToggle }: { user: AdminUser; isCurrentUser: boolean; onToggle: (user: AdminUser) => void }) { return <div className="flex flex-col gap-4 px-6 py-5 transition hover:bg-[#fbfdfc] sm:flex-row sm:items-center sm:justify-between md:px-7"><div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dcefe8] font-semibold text-[#176b57]">{(user.name || user.email).slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate font-medium">{user.name || 'Unnamed user'} {isCurrentUser && <span className="ml-1 text-xs font-normal text-[#6b8178]">(you)</span>}</p><p className="truncate text-sm text-[#5d7069]">{user.email}</p>{user.job_title && <p className="truncate text-xs text-[#176b57]">{user.job_title}</p>}</div></div><div className="flex flex-wrap items-center gap-2 text-sm sm:justify-end"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-semibold text-[#36564b]">{user.role === 'admin' ? 'Administrator' : 'Standard user'}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.is_active ? 'bg-[#edf7f2] text-[#176b57]' : 'bg-[#fff2f0] text-[#9d2c27]'}`}>{user.is_active ? 'Active' : 'Inactive'}</span><button onClick={() => onToggle(user)} disabled={isCurrentUser} className="rounded-md px-2 py-1 font-semibold text-[#176b57] hover:bg-[#edf7f2] disabled:cursor-not-allowed disabled:text-[#9aaba4]">{user.is_active ? 'Deactivate' : 'Activate'}</button></div></div>; }
function PermissionState({ onBack }: { onBack: () => void }) { return <main className="flex min-h-screen items-center justify-center bg-[#f6f8f7] px-5 text-[#18322b]"><section className="w-full max-w-md rounded-2xl border border-[#d6e5de] bg-white p-8 text-center shadow-[0_18px_60px_rgba(28,61,49,0.08)]"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff2f0] text-xl text-[#9d2c27]">!</div><h1 className="mt-5 text-xl font-semibold">Admin access required</h1><p className="mt-2 text-sm leading-6 text-[#5d7069]">You do not have permission to view this page. Ask an administrator if you need access.</p><button onClick={onBack} className="mt-6 rounded-lg bg-[#176b57] px-5 py-3 text-sm font-semibold text-white">Back to dashboard</button></section></main>; }
function Stat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'green' | 'muted' | 'blue' }) { const tones = { default: 'text-[#18322b]', green: 'text-[#176b57]', muted: 'text-[#6b8178]', blue: 'text-[#245d78]' }; return <div className="min-w-[82px] rounded-xl border border-[#d6e5de] bg-white px-3 py-3 text-center"><p className={`text-xl font-semibold ${tones[tone]}`}>{value}</p><p className="mt-1 text-[11px] text-[#6b8178]">{label}</p></div>; }
function Alert({ children, tone }: { children: React.ReactNode; tone: 'error' | 'success' }) { return <p role={tone === 'error' ? 'alert' : 'status'} className={`mt-6 rounded-lg border p-3 text-sm ${tone === 'error' ? 'border-[#e9b8b4] bg-[#fff5f4] text-[#9d2c27]' : 'border-[#b7ddcb] bg-[#effaf3] text-[#176b57]'}`}>{children}</p>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium">{label}<span className="mt-2 block">{children}</span></label>; }