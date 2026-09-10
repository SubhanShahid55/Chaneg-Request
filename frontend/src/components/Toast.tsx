'use client';

import React from 'react';
import { useApp } from '@/lib/store';

export function Toast() {
  const { toast, hideToast } = useApp();

  if (!toast || !toast.visible) return null;

  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';

  const iconName = isError ? 'error' : isInfo ? 'info' : 'check_circle';
  const iconColor = isError ? 'text-rose-400' : isInfo ? 'text-sky-400' : 'text-[#6063ee]';
  const borderColor = isError ? 'border-rose-900/60' : 'border-slate-700/60';

  return (
    <div
      onClick={hideToast}
      role="alert"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 transform transition-all duration-300 cursor-pointer flex items-center gap-3 px-4 py-3 rounded-xl bg-[#213145] text-[#eaf1ff] shadow-2xl border ${borderColor} animate-in fade-in slide-in-from-bottom-5`}
    >
      <span className={`material-symbols-outlined ${iconColor} text-xl shrink-0`}>
        {iconName}
      </span>
      <div className="flex flex-col max-w-sm">
        <span className="font-semibold text-sm leading-tight text-white">
          {toast.title}
        </span>
        {toast.subtitle && (
          <span className="text-xs text-slate-300 mt-0.5">
            {toast.subtitle}
          </span>
        )}
      </div>
      <button
        onClick={hideToast}
        aria-label="Close notification"
        className="ml-2 text-slate-400 hover:text-white transition-colors shrink-0"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
}

