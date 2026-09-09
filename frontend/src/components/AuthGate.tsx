'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { validateSession } from '@/lib/api';

const publicPaths = ['/', '/login', '/accept-invite', '/forgot-password', '/reset-password', '/set-password', '/approval'];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    const finish = async () => {
      const isCallbackPath = ['/accept-invite', '/reset-password'].includes(pathname);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const invitedToken = isCallbackPath ? null : hashParams.get('access_token');
      if (invitedToken) {
        localStorage.setItem('changeflow_access_token', invitedToken);
        if (hashParams.get('type') === 'invite' && pathname !== '/set-password') {
          router.replace('/set-password');
          return;
        }
        window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
      }

      const token = invitedToken || localStorage.getItem('changeflow_access_token');
      const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
      if (!token && !isPublic) {
        router.replace('/');
        return;
      }
      if (token && (pathname === '/' || pathname === '/login')) {
        try {
          const profile = await validateSession(token);
          if (!active) return;
          router.replace(profile.role === 'admin' ? '/admin' : '/dashboard');
        } catch {
          localStorage.removeItem('changeflow_access_token');
          localStorage.removeItem('changeflow_profile');
          if (active) router.replace('/login?invite=invalid');
        }
        return;
      }
      if (active) setChecked(true);
    };
    void finish();
    return () => { active = false; };
  }, [pathname, router]);

  if (!checked) return <div className="min-h-screen bg-[#f6f8f7]" aria-label="Loading ChangeFlow" />;
  return children;
}