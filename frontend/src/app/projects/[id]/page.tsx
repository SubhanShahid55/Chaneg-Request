'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { fetchProject } from '@/lib/api';
import type { Project } from '@/lib/types';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchProject(id)
      .then(setProject)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load project.'));
  }, [id]);

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <Header />
      <main className="mx-auto max-w-[75rem] px-4 pb-16 pt-24 md:px-6">
        <Link href="/projects" className="text-sm font-semibold text-[#4f46e5]">Back to projects</Link>
        {error && <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
        {!project && !error && <div className="mt-8 text-sm text-[#777587]">Loading project...</div>}
        {project && (
          <>
            <section className="mt-5 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#777587]">{project.clients?.company_name || 'Client project'}</p>
                  <h1 className="mt-1 text-3xl font-bold text-[#0b1c30]">{project.name}</h1>
                  <p className="mt-3 max-w-2xl text-sm text-[#464555]">{project.scope_summary || project.description || 'No scope summary added.'}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-[#777587]">Original budget</p>
                  <p className="text-2xl font-bold text-[#0b1c30]">{project.agreed_budget == null ? 'Not set' : `$${project.agreed_budget.toLocaleString()}`}</p>
                  <p className="mt-1 text-xs text-[#777587]">{project.timeline_days ? `${project.timeline_days} day timeline` : 'Timeline not set'}</p>
                </div>
              </div>
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><h2 className="font-bold text-[#0b1c30]">Original scope</h2><span className="text-sm font-semibold text-[#4f46e5]">{project.rollup?.originalHours || 0}h</span></div>
                <div className="mt-4 divide-y">
                  {(project.original_deliverables || []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium text-[#0b1c30]">{item.description}</p><p className="text-xs text-[#777587]">{item.category} · {item.complexity}</p></div><span>{item.hours}h</span></div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><h2 className="font-bold text-[#0b1c30]">Approved changes</h2><span className="text-sm font-semibold text-[#4f46e5]">{project.rollup?.approvedChangeHours || 0}h</span></div>
                <div className="mt-4 divide-y">
                  {(project.approved_change_requests || []).map((request) => (
                    <Link key={request.id} href={`/requests/${request.id}`} className="flex items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium text-[#0b1c30]">{request.title}</p><p className="text-xs text-[#777587]">{request.id} · {request.deliverables?.length || 0} deliverables</p></div><span>{request.estimatedHours || 0}h</span></Link>
                  ))}
                  {(project.approved_change_requests || []).length === 0 && <p className="py-6 text-center text-sm text-[#777587]">No approved change requests yet.</p>}
                </div>
              </section>
            </div>

            <section className="mt-6 rounded-xl border border-[#4f46e5]/20 bg-[#eef2ff] p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[#4f46e5]">Current project state</p>
              <div className="mt-4 grid gap-5 md:grid-cols-3">
                <Metric label="Budget" value={project.rollup?.currentBudget == null ? 'Not set' : `$${project.rollup.currentBudget.toLocaleString()}`} detail={project.rollup?.originalBudget == null ? undefined : `+$${project.rollup.approvedChangeCost.toLocaleString()} from $${project.rollup.originalBudget.toLocaleString()}`} />
                <Metric label="Timeline" value={project.rollup?.currentTimelineDays == null ? 'Not set' : `${project.rollup.currentTimelineDays} days`} detail={project.rollup?.originalTimelineDays == null ? undefined : `+${project.rollup.approvedChangeTimelineDays} days from ${project.rollup.originalTimelineDays}`} />
                <Metric label="Effort" value={`${project.rollup?.totalHours || 0} hours`} detail={`+${project.rollup?.approvedChangeHours || 0}h from original scope`} />
              </div>
              <p className="mt-5 text-sm text-[#464555]">Original scope plus approved changes only. Draft and pending requests are excluded.</p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div><p className="text-xs text-[#777587]">{label}</p><p className="mt-1 text-lg font-bold text-[#0b1c30]">{value}</p>{detail && <p className="mt-1 text-xs text-[#464555]">{detail}</p>}</div>;
}
