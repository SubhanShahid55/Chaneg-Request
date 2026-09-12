'use client';

import { useRouter } from 'next/navigation';
import { logout, storedProfile } from '@/lib/api';
import { LogOut } from 'lucide-react';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const profile = storedProfile();

  const handleLogout = () => {
    logout();
    router.replace('/portal/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Minimal brand presence */}
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              CF
            </div>
            <span className="font-semibold text-gray-900">Client Portal</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:inline-block">
              {profile?.name}
            </span>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Log out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

