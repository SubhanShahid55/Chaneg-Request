'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/lib/store';
import { DeliverableCategory, DeliverableComplexity, ScopeDeliverable, UrgencyLevel } from '@/lib/types';
import { createProject, fetchClientProjects, fetchClients, type ClientOption } from '@/lib/api';

const CATEGORIES: DeliverableCategory[] = ['Frontend', 'Backend', 'Database / API', 'QA & DevOps'];
const COMPLEXITIES: DeliverableComplexity[] = ['simple', 'standard', 'complex'];
const SUGGESTED_HOURS: Record<DeliverableComplexity, number> = { simple: 4, standard: 8, complex: 16 };

function blankDeliverable(): ScopeDeliverable {
  return { id: `draft-${Date.now()}-${Math.random()}`, title: '', description: '', hours: 8, category: 'Frontend', complexity: 'standard' };
}

export function SlideoverDrawer() {
  const { isSlideoverOpen, setIsSlideoverOpen, addRequest, showToast } = useApp();

  const [step, setStep] = useState(1);


  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [client, setClient] = useState('');
  const [project, setProject] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [urgency, setUrgency] = useState<UrgencyLevel>('High');
  const [rawQuote, setRawQuote] = useState('');
  const [title, setTitle] = useState('');
  const [rate, setRate] = useState<number>(150);
  const [timelineDays, setTimelineDays] = useState(5);
  const [deliverables, setDeliverables] = useState<ScopeDeliverable[]>([blankDeliverable()]);

  // Close on ESC
  useEffect(() => {
    if (isSlideoverOpen) void fetchClients().then(setClients).catch(() => setClients([]));
  }, [isSlideoverOpen]);

  useEffect(() => {
    if (!client) { setProjects([]); setProject(''); return; }
    void fetchClientProjects(client).then((items) => { setProjects(items); setProject(''); }).catch(() => setProjects([]));
  }, [client]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSlideoverOpen) {
        setIsSlideoverOpen(false);
      }
      if (e.key === 'n' || e.key === 'N') {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (!['input', 'textarea', 'select'].includes(activeTag)) {
          e.preventDefault();
          setIsSlideoverOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSlideoverOpen, setIsSlideoverOpen]);

  if (!isSlideoverOpen) return null;

  const totalHours = deliverables.reduce((sum, item) => sum + Number(item.hours || 0), 0);
  const updateDeliverable = (id: string, updates: Partial<ScopeDeliverable>) => setDeliverables((items) => items.map((item) => item.id === id ? { ...item, ...updates } : item));
  const createInlineProject = async () => {
    if (!client || !newProjectName.trim()) return;
    try {
      const created = await createProject({ client_id: client, name: newProjectName.trim(), deliverables: [{ description: title.trim() || 'Initial scope', hours: 1, category: 'Frontend', complexity: 'simple' }] });
      setProjects((items) => [...items, created]); setProject(created.id); setNewProjectName(''); setShowProjectForm(false);
    } catch (error) { showToast('Project not created', error instanceof Error ? error.message : 'Unable to create project.', 'error'); }
  };
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (step === 1) { setStep(2); return; }
    const valid = deliverables.filter((item) => item.description.trim() && item.hours > 0);
    if (!project || valid.length === 0) { showToast('Estimate incomplete', 'Select a project and add at least one deliverable.', 'error'); return; }
    void addRequest({ databaseId: client, project, title, rawQuote, urgency, hourlyRate: rate, targetTurnaroundDays: timelineDays, deliverables: valid });
    if (!project) { showToast('Request incomplete', 'Select a project.', 'error'); return; }
    void addRequest({ databaseId: client, project, title, rawQuote, urgency, deliverables: [] });
    setIsSlideoverOpen(false);
    setStep(1);
    setDeliverables([blankDeliverable()]);
    setTitle('');
    setRawQuote('');
    setClient('');
    setProject('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0b1c30]/40 backdrop-blur-sm">
      <button type="button" aria-label="Close request drawer" onClick={() => setIsSlideoverOpen(false)} className="absolute inset-0 cursor-default" />
      <aside className="relative z-10 flex h-full w-full max-w-[680px] flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] p-6">
          <div><div className="text-xs font-semibold text-[#4f46e5]">Step {step} of 2</div><h2 className="text-xl font-bold text-[#0b1c30]">{step === 1 ? 'New request' : 'Build the estimate'}</h2><p className="text-xs text-[#464555]">{step === 1 ? 'Capture the client request and project.' : `${title} · ${rawQuote}`}</p></div>
          <div><h2 className="text-xl font-bold text-[#0b1c30]">New request</h2><p className="text-xs text-[#464555]">Capture the client request and project.</p></div>
          <button type="button" onClick={() => setIsSlideoverOpen(false)} className="p-2"><span className="material-symbols-outlined">close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 p-6">
          {step === 1 ? <>
            <label className="text-sm font-medium">Client<select value={client} onChange={(event) => setClient(event.target.value)} required className="mt-1.5 h-10 w-full rounded-lg border px-3"><option value="">Select a client</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.company_name}</option>)}</select></label>
            <label className="text-sm font-medium">Project<select value={project} onChange={(event) => setProject(event.target.value)} required disabled={!client} className="mt-1.5 h-10 w-full rounded-lg border px-3"><option value="">{client ? 'Select a project' : 'Select a client first'}</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            {client && <div className="rounded-lg border border-dashed p-3 text-xs">{showProjectForm ? <div className="flex gap-2"><input value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder="New project name" className="min-w-0 flex-1 rounded border px-2" /><button type="button" onClick={() => void createInlineProject()} className="rounded bg-[#4f46e5] px-3 py-1.5 text-white">Create</button></div> : <button type="button" onClick={() => setShowProjectForm(true)} className="font-semibold text-[#4f46e5]">+ Create a project for this client</button>}</div>}
            <label className="text-sm font-medium">Request title<input value={title} onChange={(event) => setTitle(event.target.value)} required className="mt-1.5 h-10 w-full rounded-lg border px-3" /></label>
            <label className="text-sm font-medium">Client quote<textarea value={rawQuote} onChange={(event) => setRawQuote(event.target.value)} rows={3} className="mt-1.5 w-full rounded-lg border p-3" /></label>
            <label className="text-sm font-medium">Priority<select value={urgency} onChange={(event) => setUrgency(event.target.value as UrgencyLevel)} className="mt-1.5 h-10 w-full rounded-lg border px-3"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label>
          </> : <>
            <div className="grid grid-cols-2 gap-4"><label className="text-sm font-medium">Hourly rate<input type="number" min={0} value={rate} onChange={(event) => setRate(Number(event.target.value))} className="mt-1.5 h-10 w-full rounded-lg border px-3" /></label><label className="text-sm font-medium">Timeline days<input type="number" min={1} value={timelineDays} onChange={(event) => setTimelineDays(Number(event.target.value))} className="mt-1.5 h-10 w-full rounded-lg border px-3" /></label></div>
            <div className="flex items-center justify-between"><div><h3 className="font-bold">Deliverables</h3><p className="text-xs text-[#777587]">Suggested hours can be overridden.</p></div><button type="button" onClick={() => setDeliverables((items) => [...items, blankDeliverable()])} className="rounded-lg bg-[#eff4ff] px-3 py-2 text-xs font-semibold text-[#3525cd]">+ Add row</button></div>
            <div className="flex flex-col gap-3">{deliverables.map((item) => <div key={item.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1.5fr_1fr_0.8fr_0.6fr_auto]"><input value={item.description} onChange={(event) => updateDeliverable(item.id, { title: event.target.value, description: event.target.value })} placeholder="Description" className="rounded border px-2 py-2 text-xs" /><select value={item.category} onChange={(event) => updateDeliverable(item.id, { category: event.target.value as DeliverableCategory })} className="rounded border px-2 py-2 text-xs">{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select><select value={item.complexity} onChange={(event) => updateDeliverable(item.id, { complexity: event.target.value as DeliverableComplexity, hours: SUGGESTED_HOURS[event.target.value as DeliverableComplexity] })} className="rounded border px-2 py-2 text-xs">{COMPLEXITIES.map((complexity) => <option key={complexity} value={complexity}>{complexity}</option>)}</select><input type="number" min={0.25} step={0.25} value={item.hours} onChange={(event) => updateDeliverable(item.id, { hours: Number(event.target.value) })} className="rounded border px-2 py-2 text-center text-xs" /><button type="button" onClick={() => setDeliverables((items) => items.filter((entry) => entry.id !== item.id))} aria-label="Remove deliverable" className="text-[#ba1a1a]"><span className="material-symbols-outlined text-base">delete</span></button></div>)}</div>
            <div className="flex justify-between rounded-lg bg-[#f8f9ff] p-4 text-sm font-semibold"><span>Total deliverables</span><span>{totalHours}h · ${(totalHours * rate).toLocaleString()}</span></div>
          </>}
          <div className="mt-auto flex justify-end gap-3 border-t pt-4">{step === 2 && <button type="button" onClick={() => setStep(1)} className="mr-auto rounded-lg border px-4 py-2 text-sm">Back</button>}<button type="button" onClick={() => setIsSlideoverOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button type="submit" className="rounded-lg bg-[#4f46e5] px-5 py-2 text-sm font-semibold text-white">{step === 1 ? 'Next' : 'Save request'}</button></div>
          <label className="text-sm font-medium">Client<select value={client} onChange={(event) => setClient(event.target.value)} required className="mt-1.5 h-10 w-full rounded-lg border px-3"><option value="">Select a client</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.company_name}</option>)}</select></label>
          <label className="text-sm font-medium">Project<select value={project} onChange={(event) => setProject(event.target.value)} required disabled={!client} className="mt-1.5 h-10 w-full rounded-lg border px-3"><option value="">{client ? 'Select a project' : 'Select a client first'}</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {client && <div className="rounded-lg border border-dashed p-3 text-xs">{showProjectForm ? <div className="flex gap-2"><input value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder="New project name" className="min-w-0 flex-1 rounded border px-2" /><button type="button" onClick={() => void createInlineProject()} className="rounded bg-[#4f46e5] px-3 py-1.5 text-white">Create</button></div> : <button type="button" onClick={() => setShowProjectForm(true)} className="font-semibold text-[#4f46e5]">+ Create a project for this client</button>}</div>}
          <label className="text-sm font-medium">Request title<input value={title} onChange={(event) => setTitle(event.target.value)} required className="mt-1.5 h-10 w-full rounded-lg border px-3" /></label>
          <label className="text-sm font-medium">Client quote<textarea value={rawQuote} onChange={(event) => setRawQuote(event.target.value)} rows={3} className="mt-1.5 w-full rounded-lg border p-3" /></label>
          <label className="text-sm font-medium">Priority<select value={urgency} onChange={(event) => setUrgency(event.target.value as UrgencyLevel)} className="mt-1.5 h-10 w-full rounded-lg border px-3"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label>
          <div className="mt-auto flex justify-end gap-3 border-t pt-4"><button type="button" onClick={() => setIsSlideoverOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button type="submit" className="rounded-lg bg-[#4f46e5] px-5 py-2 text-sm font-semibold text-white">Save request</button></div>
        </form>
      </aside>
    </div>
  );
}
