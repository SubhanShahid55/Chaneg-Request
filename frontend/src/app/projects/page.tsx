'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { createProject, fetchClients, fetchProjects, type ClientOption } from '@/lib/api';
import { AppProvider } from '@/lib/store';
import type { DeliverableCategory, DeliverableComplexity, Project } from '@/lib/types';

const categories: DeliverableCategory[] = ['Frontend', 'Backend', 'Database / API', 'QA & DevOps'];
const complexities: DeliverableComplexity[] = ['simple', 'standard', 'complex'];
const suggestedHours: Record<DeliverableComplexity, number> = { simple: 4, standard: 8, complex: 16 };

type DraftItem = { description: string; hours: number; category: DeliverableCategory; complexity: DeliverableComplexity };
const emptyItem = (): DraftItem => ({ description: '', hours: 8, category: 'Frontend', complexity: 'standard' });

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [scope, setScope] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [error, setError] = useState('');

  const load = async () => { const [loadedProjects, loadedClients] = await Promise.all([fetchProjects(), fetchClients()]); setProjects(loadedProjects); setClients(loadedClients); };
  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load projects.')); }, []);
  const totalHours = items.reduce((sum, item) => sum + Number(item.hours || 0), 0);
  const updateItem = (index: number, updates: Partial<DraftItem>) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...updates } : item));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!clientId) {
      setError('Please select a client.');
      return;
    }
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    if (!scope.trim()) {
      setError('Scope summary is required to establish project baseline.');
      return;
    }
    const numBudget = Number(budget);
    if (!budget || !Number.isFinite(numBudget) || numBudget <= 0) {
      setError('Agreed budget must be greater than $0.');
      return;
    }
    const numTimeline = Number(timeline);
    if (!timeline || !Number.isFinite(numTimeline) || numTimeline <= 0) {
      setError('Timeline must be at least 1 day.');
      return;
    }
    const validDeliverables = items
      .filter((item) => item.description.trim())
      .map((item) => ({ ...item, hours: Number(item.hours) || 1 }));
    if (validDeliverables.length === 0) {
      setError('At least one original deliverable is required to establish project baseline.');
      return;
    }

    try {
      await createProject({
        client_id: clientId,
        name: name.trim(),
        scope_summary: scope.trim(),
        agreed_budget: numBudget,
        timeline_days: Math.round(numTimeline),
        deliverables: validDeliverables,
      });
      setShowCreate(false);
      setName('');
      setScope('');
      setBudget('');
      setTimeline('');
      setItems([emptyItem()]);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create project.');
    }
  };

  return <AppProvider><div className="min-h-screen bg-[#f8f9ff]"><Header /><main className="mx-auto max-w-[75rem] px-4 pb-16 pt-24 md:px-6"><div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-[#0b1c30]"><span className="material-symbols-outlined text-[#4f46e5]">folder</span>Projects</h1><p className="mt-1 text-sm text-[#464555]">Track original scope and approved change work by client project.</p></div><button type="button" onClick={() => setShowCreate((open) => !open)} className="rounded-lg bg-[#4f46e5] px-4 py-2 text-sm font-semibold text-white">{showCreate ? 'Close form' : '+ New project'}</button></div>
  {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {showCreate && <form onSubmit={save} className="mb-6 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm"><div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Client<select required value={clientId} onChange={(event) => setClientId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border px-3"><option value="">Select client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company_name}</option>)}</select></label><label className="text-sm font-medium">Project name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border px-3" /></label><label className="text-sm font-medium md:col-span-2">Scope summary<textarea value={scope} onChange={(event) => setScope(event.target.value)} rows={2} className="mt-1.5 w-full rounded-lg border p-3" /></label><label className="text-sm font-medium">Agreed budget<input type="number" min={0} value={budget} onChange={(event) => setBudget(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border px-3" /></label><label className="text-sm font-medium">Timeline days<input type="number" min={1} value={timeline} onChange={(event) => setTimeline(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border px-3" /></label></div><div className="mt-5 flex items-center justify-between"><h2 className="font-bold">Original deliverables</h2><button type="button" onClick={() => setItems((current) => [...current, emptyItem()])} className="rounded-lg bg-[#eff4ff] px-3 py-2 text-xs font-semibold text-[#3525cd]">+ Add line</button></div><div className="mt-3 flex flex-col gap-2">{items.map((item, index) => <div key={index} className="grid gap-2 md:grid-cols-[1.5fr_1fr_0.8fr_0.6fr_auto]"><input required value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} placeholder="Deliverable" className="rounded border px-2 py-2 text-xs" /><select value={item.category} onChange={(event) => updateItem(index, { category: event.target.value as DeliverableCategory })} className="rounded border px-2 py-2 text-xs">{categories.map((category) => <option key={category}>{category}</option>)}</select><select value={item.complexity} onChange={(event) => { const complexity = event.target.value as DeliverableComplexity; updateItem(index, { complexity, hours: suggestedHours[complexity] }); }} className="rounded border px-2 py-2 text-xs">{complexities.map((complexity) => <option key={complexity}>{complexity}</option>)}</select><input required type="number" min={0.25} step={0.25} value={item.hours} onChange={(event) => updateItem(index, { hours: Number(event.target.value) })} className="rounded border px-2 py-2 text-center text-xs" /><button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-xs text-rose-700">Remove</button></div>)}</div><div className="mt-4 flex items-center justify-between border-t pt-4 text-sm"><span>{totalHours} original hours</span><button type="submit" className="rounded-lg bg-[#4f46e5] px-4 py-2 font-semibold text-white">Create project</button></div></form>}
      {showCreate && <form onSubmit={save} className="mb-6 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm"><div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Client<select required value={clientId} onChange={(event) => setClientId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border px-3"><option value="">Select client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company_name}</option>)}</select></label><label className="text-sm font-medium">Project name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Mobile Banking App" className="mt-1.5 h-10 w-full rounded-lg border px-3" /></label><label className="text-sm font-medium md:col-span-2">Scope summary *<textarea required value={scope} onChange={(event) => setScope(event.target.value)} placeholder="Baseline project scope and objectives..." rows={2} className="mt-1.5 w-full rounded-lg border p-3" /></label><label className="text-sm font-medium">Agreed budget ($) *<input required type="number" min={1} value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="e.g. 50000" className="mt-1.5 h-10 w-full rounded-lg border px-3" /></label><label className="text-sm font-medium">Timeline days *<input required type="number" min={1} value={timeline} onChange={(event) => setTimeline(event.target.value)} placeholder="e.g. 60" className="mt-1.5 h-10 w-full rounded-lg border px-3" /></label></div><div className="mt-5 flex items-center justify-between"><h2 className="font-bold">Original deliverables *</h2><button type="button" onClick={() => setItems((current) => [...current, emptyItem()])} className="rounded-lg bg-[#eff4ff] px-3 py-2 text-xs font-semibold text-[#3525cd]">+ Add line</button></div><div className="mt-3 flex flex-col gap-2">{items.map((item, index) => <div key={index} className="grid gap-2 md:grid-cols-[1.5fr_1fr_0.8fr_0.6fr_auto]"><input required value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} placeholder="Deliverable name or feature" className="rounded border px-2 py-2 text-xs" /><select value={item.category} onChange={(event) => updateItem(index, { category: event.target.value as DeliverableCategory })} className="rounded border px-2 py-2 text-xs">{categories.map((category) => <option key={category}>{category}</option>)}</select><select value={item.complexity} onChange={(event) => { const complexity = event.target.value as DeliverableComplexity; updateItem(index, { complexity, hours: suggestedHours[complexity] }); }} className="rounded border px-2 py-2 text-xs">{complexities.map((complexity) => <option key={complexity}>{complexity}</option>)}</select><input required type="number" min={0.25} step={0.25} value={item.hours} onChange={(event) => updateItem(index, { hours: Number(event.target.value) })} className="rounded border px-2 py-2 text-center text-xs" /><button type="button" onClick={() => setItems((current) => current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current)} className={`text-xs ${items.length > 1 ? 'text-rose-700 hover:text-rose-900' : 'text-slate-300 cursor-not-allowed'}`} disabled={items.length <= 1}>Remove</button></div>)}</div><div className="mt-4 flex items-center justify-between border-t pt-4 text-sm"><span>{totalHours} original hours</span><button type="submit" className="rounded-lg bg-[#4f46e5] px-4 py-2 font-semibold text-white hover:bg-[#3525cd] transition-colors">Create project</button></div></form>}
      <div className="grid gap-4 md:grid-cols-2">{projects.map((project) => <Link key={project.id} href={`/projects/${project.id}`} className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#c7c4ff]"><div className="flex items-start justify-between gap-4"><div><h2 className="font-bold text-[#0b1c30]">{project.name}</h2><p className="mt-1 text-xs text-[#777587]">{project.clients?.company_name || 'Client'}</p></div><span className="material-symbols-outlined text-[#4f46e5]">arrow_forward</span></div><p className="mt-4 line-clamp-2 text-sm text-[#464555]">{project.scope_summary || project.description || 'No scope summary added.'}</p><div className="mt-5 flex gap-5 border-t pt-4 text-xs text-[#777587]"><span>Budget {project.agreed_budget == null ? 'Not set' : `$${project.agreed_budget.toLocaleString()}`}</span><span>{project.timeline_days ? `${project.timeline_days} days` : 'Timeline not set'}</span></div></Link>)}{projects.length === 0 && <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-white p-12 text-center text-sm text-[#777587] md:col-span-2">No projects yet. Create the first client project to establish original scope.</div>}</div>
  </main></div></AppProvider>;
}
