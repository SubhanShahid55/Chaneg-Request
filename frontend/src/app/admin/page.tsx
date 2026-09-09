'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAdminUsers, inviteAdminUser, updateAdminUser, AdminUser } from '@/lib/api';
import { storedProfile } from '@/lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'standard'>('standard');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadUsers() {
    try {
      const response = await fetchAdminUsers();
      setUsers(response.users);
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : 'Unable to load user management.';
      if (text.includes('permission')) setError('You do not have permission to view this page.');
      else setError(text);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (storedProfile()?.role !== 'admin') {
      setError('You do not have permission to view this page.');
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
      await inviteAdminUser({ name, email, role });
      setMessage(`An invitation was sent to ${email.trim().toLowerCase()}.`);
      setName('');
      setEmail('');
      setRole('standard');
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
      await loadUsers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update this user.');
    }
  }

  const active = users.filter((user) => user.is_active).length;
  const admins = users.filter((user) => user.role === 'admin').length;

  return (
    <main className="min-h-screen bg-[#f6f8f7] px-5 pb-16 pt-10 text-[#18322b] md:px-10">
    const [role, setRole] = useState<'admin' | 'standard'>('standard');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [forbidden, setForbidden] = useState(false);
        <button onClick={() => router.push('/dashboard')} className="mb-7 text-sm font-semibold text-[#176b57]">Back to dashboard</button>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#176b57]">Admin</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">User management</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#5d7069]">Register people who need access to ChangeFlow and manage whether their account is active.</p></div>
          <div className="grid grid-cols-3 gap-3"><Stat label="Total users" value={users.length} /><Stat label="Active" value={active} /><Stat label="Administrators" value={admins} /></div>
        </div>
        {error && <p role="alert" className="mt-6 rounded-lg border border-[#e9b8b4] bg-[#fff5f4] p-3 text-sm text-[#9d2c27]">{error}</p>}
        {message && <p role="status" className="mt-6 rounded-lg border border-[#b7ddcb] bg-[#effaf3] p-3 text-sm text-[#176b57]">{message}</p>}
        <section className="mt-8 rounded-2xl border border-[#dbe7e1] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Register a new user</h2><p className="mt-1 text-sm text-[#5d7069]">They will receive an email to set their password. You will never see their password.</p><form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_180px_auto] md:items-end"><Field label="Full name"><input required value={name} onChange={(event) => setName(event.target.value)} className="field" /></Field><Field label="Email address"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field" /></Field><Field label="Role"><select value={role} onChange={(event) => setRole(event.target.value as 'admin' | 'standard')} className="field"><option value="standard">Standard user</option><option value="admin">Admin</option></select></Field><button disabled={submitting} className="rounded-lg bg-[#176b57] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{submitting ? 'Sending...' : 'Register user'}</button></form></section>
        <section className="mt-6 overflow-hidden rounded-2xl border border-[#dbe7e1] bg-white shadow-sm"><div className="border-b border-[#e4eee9] px-6 py-4"><h2 className="font-semibold">People with access</h2></div>{loading ? <p className="p-6 text-sm text-[#5d7069]">Loading users...</p> : users.length === 0 ? <p className="p-6 text-sm text-[#5d7069]">No users have been registered yet.</p> : <div className="divide-y divide-[#e4eee9]">{users.map((user) => <div key={user.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dcefe8] font-semibold text-[#176b57]">{user.name.slice(0, 1).toUpperCase()}</span><div><p className="font-medium">{user.name}</p><p className="text-sm text-[#5d7069]">{user.email}</p></div></div><div className="flex items-center gap-3 text-sm"><span className="rounded-full bg-[#eef4f1] px-3 py-1">{user.role === 'admin' ? 'Admin' : 'Standard user'}</span><span className={user.is_active ? 'text-[#176b57]' : 'text-[#9d2c27]'}>{user.is_active ? 'Active' : 'Inactive'}</span><button onClick={() => void toggleUser(user)} disabled={user.id === storedProfile()?.id} className="font-semibold text-[#176b57] disabled:cursor-not-allowed disabled:opacity-40">{user.is_active ? 'Deactivate' : 'Activate'}</button></div></div>)}</div>}</section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-[#dbe7e1] bg-white px-3 py-2 text-center"><p className="text-xl font-semibold">{value}</p><p className="text-[11px] text-[#5d7069]">{label}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium">{label}<span className="mt-2 block">{children}</span></label>; }