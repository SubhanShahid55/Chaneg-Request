'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { IntakeChannel, UrgencyLevel } from '@/lib/types';
import { fetchClients, type ClientOption } from '@/lib/api';

export function SlideoverDrawer() {
  const { isSlideoverOpen, setIsSlideoverOpen, addRequest } = useApp();

  const [step, setStep] = useState(1);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [client, setClient] = useState('');
  const [project, setProject] = useState('');
  const [channel, setChannel] = useState<IntakeChannel>('Portal');
  const [channelSource, setChannelSource] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('High');
  const [rawQuote, setRawQuote] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState<number>(20);
  const [rate, setRate] = useState<number>(150);
  const [targetSprint, setTargetSprint] = useState('Sprint 38 (Q3 Release)');

  // Close on ESC
  useEffect(() => {
    if (isSlideoverOpen) void fetchClients().then(setClients).catch(() => setClients([]));
  }, [isSlideoverOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSlideoverOpen) {
        setIsSlideoverOpen(false);
      }
      if (e.key === 'n' || e.key === 'N') {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          setIsSlideoverOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSlideoverOpen, setIsSlideoverOpen]);

  if (!isSlideoverOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else {
      void addRequest({
        databaseId: client,
        project,
        title,
        description,
        rawQuote,
        channel,
        channelSource,
        urgency,
        estimatedHours: Number(hours),
        hourlyRate: Number(rate),
        estimatedCost: Number(hours) * Number(rate),
        targetSprint,
      });
      setIsSlideoverOpen(false);
      setStep(1); // Reset step for next time
    }
  };

  const calculatedCost = Number(hours) * Number(rate);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={() => setIsSlideoverOpen(false)}
        className="fixed inset-0 bg-[#0b1c30]/40 backdrop-blur-sm transition-opacity"
      />

      {/* Slide-over Panel */}
      <aside className="relative w-full max-w-[560px] bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-[#e2e8f0] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-20">
          <div>
            <div className="text-xs font-semibold text-[#4f46e5] mb-1">
              Step {step} of 2
            </div>
            <h2 className="text-xl font-bold text-[#0b1c30] tracking-tight">
              {step === 1 ? 'New request' : 'Add estimate'}
            </h2>
            <p className="text-xs text-[#464555] mt-0.5">
              {step === 1
                ? 'Record a client change request.'
                : 'Add cost and timeline details.'}
            </p>
          </div>
          <button
            onClick={() => setIsSlideoverOpen(false)}
            className="p-2 rounded-lg text-[#777587] hover:bg-[#f1f5f9] hover:text-[#0b1c30] transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 flex-1">
          {step === 1 && (
            <>
              {/* Client & Project Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
                    Client
                  </label>
                  <select
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-sm text-[#0b1c30] bg-white focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
                  >
                    <option value="">Select a saved client</option>
                    {clients.map((option) => (
                      <option key={option.id} value={option.id}>{option.company_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
                    Project
                  </label>
                  <input
                    type="text"
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-sm text-[#0b1c30] bg-white focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
                  Request title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-sm text-[#0b1c30] bg-white focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
                  What the client asked for
                </label>
                <textarea
                  rows={2}
                  value={rawQuote}
                  onChange={(e) => setRawQuote(e.target.value)}
                  className="w-full p-3 rounded-lg border border-[#cbd5e1] text-sm text-[#0b1c30] bg-white focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
                />
              </div>

              {/* Urgency Radio Selector */}
              <div>
                <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
                  Priority
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Low', 'Medium', 'High', 'Critical'] as UrgencyLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setUrgency(lvl)}
                      className={`py-2 px-2 rounded-lg text-sm font-medium border transition-all ${
                        urgency === lvl
                          ? lvl === 'Critical'
                            ? 'bg-rose-50 border-rose-500 text-rose-700 font-bold'
                            : lvl === 'High'
                            ? 'bg-amber-50 border-amber-500 text-amber-800 font-bold'
                            : 'bg-[#eef2ff] border-[#4f46e5] text-[#3525cd] font-semibold'
                          : 'border-[#e2e8f0] text-[#475569] hover:bg-[#f8fafc]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>


            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
                    Estimated hours
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-sm text-[#0b1c30] bg-white focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
                    Hourly rate
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-sm text-[#0b1c30] bg-white focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
                  Target delivery
                </label>
                <input
                  type="text"
                  value={targetSprint}
                  onChange={(e) => setTargetSprint(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-sm text-[#0b1c30] bg-white focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
                />
              </div>

              <div className="bg-[#f8f9ff] border border-[#d3e4fe] rounded-lg p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-[#0b1c30]">Estimated cost:</span>
                <span className="text-lg font-bold text-[#3525cd]">
                  ${calculatedCost.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-lg border border-[#cbd5e1] text-sm text-[#0b1c30] bg-white focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Footer Submit Buttons */}
          <div className="mt-auto pt-4 border-t border-[#e2e8f0] flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-2">
            {step === 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsSlideoverOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#cbd5e1] text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
                >
                  Next &rarr;
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg border border-[#cbd5e1] text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors mr-auto"
                >
                  &larr; Back
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
                >
                  Save request
                </button>
              </>
            )}
          </div>
        </form>
      </aside>
    </div>
  );
}
