'use client';

import { FormEvent, useState } from 'react';
import { requestPasswordReset } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    try { await requestPasswordReset(email.trim().toLowerCase()); setSent(true); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to send reset email.'); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#f8f9ff] px-5 text-[#0b1c30]"><section className="w-full max-w-md rounded-2xl border border-[#d3e4fe] bg-white p-8 shadow-lg"><img src="/assets/logo.svg" alt="ChangeFlow logo" className="h-12 w-12" /><h1 className="mt-5 text-2xl font-semibold">Reset your password</h1>{sent ? <p className="mt-3 text-sm leading-6 text-[#464555]">If an account exists for that email, a reset link is on its way.</p> : <form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field mt-2" /></label>{error && <p role="alert" className="text-sm text-[#9d2c27]">{error}</p>}<button className="w-full rounded-lg bg-[#4f46e5] px-4 py-3 text-sm font-semibold text-white">Email reset link</button></form>}<a href="/login" className="mt-6 inline-block text-sm font-semibold text-[#4f46e5]">Back to sign in</a></section></main>;
}