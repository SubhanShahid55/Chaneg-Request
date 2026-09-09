'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const publicPaths = ['/', '/login', '/approval'];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('changeflow_access_token');
    const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
    if (!token && !isPublic) {
      router.replace('/');
      return;
    }
    if (token && (pathname === '/' || pathname === '/login')) {
      router.replace('/dashboard');
      return;
    }
    setChecked(true);
  }, [pathname, router]);

  if (!checked) return <div className="min-h-screen bg-[#f6f8f7]" aria-label="Loading ChangeFlow" />;
  return children;
}