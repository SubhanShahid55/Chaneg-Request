'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';

export function ProfileSettingsModal() {
  const { isProfileModalOpen, setIsProfileModalOpen, currentUser, updateCurrentUser } = useApp();
  
  const [name, setName] = useState(currentUser.name);
  const [role, setRole] = useState(currentUser.role);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);

  useEffect(() => {
    if (isProfileModalOpen) {
      setName(currentUser.name);
      setRole(currentUser.role);
      setAvatarUrl(currentUser.avatarUrl);
    }
  }, [isProfileModalOpen, currentUser]);

  if (!isProfileModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUser({ name, role, avatarUrl });
    setIsProfileModalOpen(false);
  };

  const presetAvatars = [
    '/assets/04_headshot_pm.png',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-[#0b1c30]/40 backdrop-blur-sm"
        onClick={() => setIsProfileModalOpen(false)}
      />
      
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8f9ff]">
          <h2 className="text-lg font-bold text-[#0b1c30]">Profile Settings</h2>
          <button
            onClick={() => setIsProfileModalOpen(false)}
            className="p-1.5 rounded-lg text-[#777587] hover:bg-[#e2e8f0] hover:text-[#0b1c30] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="flex flex-col items-center mb-2">
            <img 
              src={avatarUrl} 
              alt="Avatar Preview" 
              className="w-20 h-20 rounded-full object-cover ring-4 ring-[#eef2ff] mb-4"
              onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=User&background=random' }}
            />
            <div className="flex gap-2">
              {presetAvatars.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatarUrl(url)}
                  className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${avatarUrl === url ? 'border-[#4f46e5] scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                >
                  <img src={url} alt="preset" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">Avatar Image URL</label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-sm text-[#0b1c30] bg-white focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-sm text-[#0b1c30] bg-white focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">Role / Title</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-sm text-[#0b1c30] bg-white focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
            />
          </div>

          <div className="mt-4 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-[#cbd5e1] text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
