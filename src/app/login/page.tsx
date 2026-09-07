'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppProvider, useApp } from '@/lib/store';
import { Toast } from '@/components/Toast';

function LoginContent() {
  const router = useRouter();
  const { showToast } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickFill = () => {
    setEmail('lead.pm@agency.changeflow.io');
    setPassword('ChangeFlow2025!');
    showToast('Credentials Populated', 'Test credentials filled for Sarah Chen.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    /* 
      TODO: Integrate Supabase Auth:
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
    */

    setTimeout(() => {
      setIsLoading(false);
      showToast('Authenticated as Sarah Chen', 'Welcome back to ChangeFlow Agency Workspace.');
      router.push('/');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col justify-center items-center relative overflow-hidden py-10 px-4">
      <Toast />

      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#e2dfff]/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#e1e0ff]/30 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Login Card */}
      <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-xl border border-[#e2e8f0] flex flex-col relative z-10">
        <div className="p-8 flex flex-col">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                alt="ChangeFlow Logo"
                className="w-9 h-9 rounded-lg object-contain transition-transform group-hover:scale-105"
                src="/assets/logo.svg"
              />
              <div className="flex flex-col">
                <span className="text-base font-bold text-[#0b1c30] tracking-tight leading-none">
                  ChangeFlow
                </span>
                <span className="text-[10px] text-[#777587] uppercase tracking-wider mt-1 leading-none font-semibold">
                  Internal Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
              Agency Team Login
            </h1>
            <p className="text-xs text-[#464555] mt-1">
              Sign in to review client requests and estimate scope
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="work-email">
                Work Email
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[#777587] pointer-events-none text-lg">
                  alternate_email
                </span>
                <input
                  id="work-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@agency.com"
                  className="w-full h-11 pl-10 pr-3 rounded-lg border border-[#cbd5e1] text-sm text-[#0b1c30] bg-white placeholder:text-[#94a3b8] focus:ring-2 focus:ring-[#4f46e5] focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="password">
                  Password
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast('Reset Link Sent', 'Password reset instructions sent to your email.');
                  }}
                  className="text-xs text-[#3525cd] hover:underline font-medium"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[#777587] pointer-events-none text-lg">
                  lock
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-11 pl-10 pr-10 rounded-lg border border-[#cbd5e1] text-sm text-[#0b1c30] bg-white placeholder:text-[#94a3b8] focus:ring-2 focus:ring-[#4f46e5] focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-[#777587] hover:text-[#0b1c30] transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#4f46e5] focus:ring-[#4f46e5] accent-[#4f46e5]"
                />
                <span className="text-xs text-[#464555]">
                  Remember this device for 30 days
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-2 rounded-xl bg-[#4f46e5] hover:bg-[#3525cd] text-white font-semibold text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">
                    progress_activity
                  </span>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">login</span>
                  <span>Sign in</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e2e8f0]" />
            </div>
            <span className="relative px-3 bg-white text-[11px] font-semibold text-[#777587] uppercase tracking-wider">
              or verify with
            </span>
          </div>

          {/* Google Workspace Auth */}
          <button
            onClick={() => {
              handleQuickFill();
              handleSubmit({ preventDefault: () => {} } as React.FormEvent);
            }}
            type="button"
            className="w-full h-11 rounded-xl bg-[#f8f9ff] hover:bg-[#eff4ff] border border-[#e2e8f0] text-[#0b1c30] font-semibold text-xs transition-colors flex items-center justify-center gap-2.5 shadow-sm"
          >
            <svg aria-hidden="true" className="w-4 h-4" viewBox="0 0 24 24">
              <path
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                fill="#4285F4"
              />
              <path
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                fill="#34A853"
              />
              <path
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                fill="#FBBC05"
              />
              <path
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                fill="#EA4335"
              />
            </svg>
            <span>Continue with Google Workspace</span>
          </button>
        </div>
      </div>

      {/* Footer Status */}
      <div className="w-full max-w-[480px] flex items-center justify-between mt-4 px-2 text-xs text-[#777587]">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#047857]" />
          All Systems Operational
        </span>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:underline">
            Dashboard
          </Link>
          <Link href="/approval/CR-1042" className="hover:underline">
            Client View
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AppProvider>
      <LoginContent />
    </AppProvider>
  );
}
