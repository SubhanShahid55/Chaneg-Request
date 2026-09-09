'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitationExpired, setInvitationExpired] = useState(false);

  useEffect(() => {
    setInvitationExpired(new URLSearchParams(window.location.search).get('invite') === 'invalid');
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const profile = await login(normalizedEmail, password);
      router.replace(profile.role === 'admin' ? '/dashboard' : '/dashboard');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The email or password is incorrect.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8f7] px-5 py-10 text-[#18322b]">
      <section className="w-full max-w-md rounded-2xl border border-[#dbe7e1] bg-white p-7 shadow-[0_18px_60px_rgba(28,61,49,0.08)] sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <img src="/assets/logo.svg" alt="ChangeFlow logo" className="h-11 w-11" />
          <span className="text-xl font-semibold tracking-tight">ChangeFlow</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to ChangeFlow</h1>
        <p className="mt-2 text-sm leading-6 text-[#5d7069]">Manage change requests and keep client work moving.</p>
        {(error || invitationExpired) && <div role="alert" className="mt-6 rounded-lg border border-[#e9b8b4] bg-[#fff5f4] p-3 text-sm text-[#9d2c27]">{error || 'This invitation link is invalid or expired. Ask an administrator to send a new invitation.'}</div>}
        <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-[#b9cbc3] px-3.5 py-3 text-base outline-none transition focus:border-[#17745c] focus:ring-2 focus:ring-[#17745c]/20" />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">Password</label>
            <div className="relative">
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-[#b9cbc3] px-3.5 py-3 pr-20 text-base outline-none transition focus:border-[#17745c] focus:ring-2 focus:ring-[#17745c]/20" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-[#176b57] hover:bg-[#edf7f2]" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-[#176b57] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#115642] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Signing in...' : 'Log in'}</button>
          <div className="text-center"><a href="/forgot-password" className="text-sm font-semibold text-[#176b57] hover:underline">Forgot your password?</a></div>
        </form>
      </section>
    </main>
  );
}