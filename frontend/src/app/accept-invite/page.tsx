'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateSession } from '@/lib/api';
import { consumeAuthCallback } from '@/lib/supabase';

export default function AcceptInvitePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void consumeAuthCallback().then(async (session) => {
      localStorage.setItem('changeflow_access_token', session.access_token);
      localStorage.setItem('changeflow_refresh_token', session.refresh_token);
      await validateSession(session.access_token);
      if (active) router.replace('/set-password');
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'This invitation link is invalid or expired.'); });
    return () => { active = false; };
  }, [router]);
  return <main className="flex min-h-screen items-center justify-center bg-[#f8f9ff] px-5 text-[#0b1c30]"><section className="w-full max-w-md rounded-2xl border border-[#d3e4fe] bg-white p-8 text-center shadow-lg"><img src="/assets/logo.svg" alt="ChangeFlow logo" className="mx-auto h-12 w-12" /><h1 className="mt-5 text-2xl font-semibold">Accepting invitation</h1>{error ? <><p role="alert" className="mt-3 text-sm text-[#9d2c27]">{error}</p><a href="/login" className="mt-6 inline-block font-semibold text-[#4f46e5]">Return to sign in</a></> : <p className="mt-3 text-sm text-[#464555]">Preparing your secure account session...</p>}</section></main>;
}