'use client';

import React from 'react';
import { useApp } from '@/lib/store';

export function Toast() {
  const { toast, hideToast } = useApp();

  if (!toast || !toast.visible) return null;

  return (
    <div
      onClick={hideToast}
      className="fixed bottom-6 right-6 z-50 transform transition-all duration-300 cursor-pointer flex items-center gap-3 px-4 py-3 rounded-xl bg-[#213145] text-[#eaf1ff] shadow-2xl border border-slate-700/60 animate-in fade-in slide-in-from-bottom-5"
    >
      <span className="material-symbols-outlined text-[#6063ee] text-xl">
        check_circle
      </span>
      <div className="flex flex-col">
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
        className="ml-2 text-slate-400 hover:text-white transition-colors"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
}

