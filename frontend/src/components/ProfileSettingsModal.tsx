'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { removeProfileAvatar, updateProfile, uploadProfileAvatar } from '@/lib/api';
import { AvatarUpload } from './AvatarUpload';

export function ProfileSettingsModal() {
  const { isProfileModalOpen, setIsProfileModalOpen, currentUser, updateCurrentUser } = useApp();
  
  const [name, setName] = useState(currentUser.name);
  const [jobTitle, setJobTitle] = useState(currentUser.jobTitle);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isProfileModalOpen) {
      setName(currentUser.name);
      setJobTitle(currentUser.jobTitle);
      setAvatarUrl(currentUser.avatarUrl);
      setError('');
    }
  }, [isProfileModalOpen, currentUser]);

  if (!isProfileModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { const profile = await updateProfile({ name, job_title: jobTitle }); updateCurrentUser({ name: profile.name, jobTitle: profile.job_title || '', avatarUrl: profile.avatar_url || '' }); setIsProfileModalOpen(false); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save your profile.'); }
  };

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
            <AvatarUpload name={name} avatarUrl={avatarUrl} onUpload={async (dataUrl) => { const profile = await uploadProfileAvatar(dataUrl); setAvatarUrl(profile.avatar_url || ''); updateCurrentUser({ avatarUrl: profile.avatar_url || '' }); }} onRemove={async () => { const profile = await removeProfileAvatar(); setAvatarUrl(''); updateCurrentUser({ avatarUrl: profile.avatar_url || '' }); }} />
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
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-sm text-[#0b1c30] bg-white focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
            />
          </div>

          {error && <p role="alert" className="text-sm text-[#9d2c27]">{error}</p>}

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

