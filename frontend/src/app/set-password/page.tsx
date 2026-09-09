'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setInvitationPassword, updateProfile, storedProfile } from '@/lib/api';

function createPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const values = new Uint32Array(16);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  useEffect(() => {
    const profile = storedProfile();
    if (profile) { setName(profile.name); setJobTitle(profile.job_title || ''); }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError('Your password must be at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await setInvitationPassword(password, name, jobTitle);
      router.replace('/dashboard');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not set your password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9ff] px-5 py-10 text-[#0b1c30]">
      <section className="w-full max-w-md rounded-2xl border border-[#d3e4fe] bg-white p-7 shadow-[0_18px_60px_rgba(30,58,95,0.08)] sm:p-10">
        <div className="mb-8 flex items-center gap-3"><img src="/assets/logo.svg" alt="ChangeFlow logo" className="h-11 w-11" /><span className="text-xl font-semibold">ChangeFlow</span></div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4f46e5]">Invitation accepted</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Create your password</h1>
        <p className="mt-2 text-sm leading-6 text-[#464555]">Choose a password for your ChangeFlow account. You can also generate a secure one.</p>
        {error && <div role="alert" className="mt-6 rounded-lg border border-[#e9b8b4] bg-[#fff5f4] p-3 text-sm text-[#9d2c27]">{error}</div>}
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div><label htmlFor="display-name" className="mb-2 block text-sm font-medium">Full name</label><input id="display-name" required value={name} onChange={(event) => setName(event.target.value)} className="field" /></div>
          <div><label htmlFor="job-title" className="mb-2 block text-sm font-medium">Role / title</label><input id="job-title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} className="field" /></div>
          <div><label htmlFor="new-password" className="mb-2 block text-sm font-medium">New password</label><div className="flex gap-2"><input id="new-password" required minLength={8} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="field flex-1" /><button type="button" onClick={() => { const generated = createPassword(); setPassword(generated); setConfirmation(generated); setShowPassword(true); }} className="rounded-lg border border-[#c7c4d8] px-3 text-xs font-semibold text-[#3525cd] hover:bg-[#eff4ff]">Generate</button></div><p className="mt-2 text-xs text-[#777587]">At least 8 characters.</p></div>
          <div><label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">Confirm password</label><input id="confirm-password" required minLength={8} type={showPassword ? 'text' : 'password'} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="field" /></div>
          <label className="flex items-center gap-2 text-sm text-[#464555]"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Show password</label>
          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-[#4f46e5] px-4 py-3 text-sm font-semibold text-white hover:bg-[#3525cd] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Saving password...' : 'Continue to dashboard'}</button>
        </form>
      </section>
    </main>
  );
}
