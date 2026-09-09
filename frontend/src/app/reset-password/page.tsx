'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword } from '@/lib/api';
import { consumeAuthCallback } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { void consumeAuthCallback().then((session) => { localStorage.setItem('changeflow_access_token', session.access_token); localStorage.setItem('changeflow_refresh_token', session.refresh_token); setReady(true); }).catch((cause) => setError(cause instanceof Error ? cause.message : 'This reset link is invalid or expired.')); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (password.length < 8 || password !== confirmation) { setError(password.length < 8 ? 'Your password must be at least 8 characters.' : 'The passwords do not match.'); return; } try { await updatePassword(password); router.replace('/dashboard'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update your password.'); } }
  return <main className="flex min-h-screen items-center justify-center bg-[#f8f9ff] px-5 text-[#0b1c30]"><section className="w-full max-w-md rounded-2xl border border-[#d3e4fe] bg-white p-8 shadow-lg"><img src="/assets/logo.svg" alt="ChangeFlow logo" className="h-12 w-12" /><h1 className="mt-5 text-2xl font-semibold">Choose a new password</h1>{error && <p role="alert" className="mt-4 text-sm text-[#9d2c27]">{error}</p>}{ready && <form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">New password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field mt-2" /></label><label className="block text-sm font-medium">Confirm password<input required minLength={8} type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="field mt-2" /></label><button className="w-full rounded-lg bg-[#4f46e5] px-4 py-3 text-sm font-semibold text-white">Update password</button></form>}</section></main>;
}