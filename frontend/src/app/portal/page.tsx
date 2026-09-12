'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchPortalProject, fetchPortalRequests } from '@/lib/api';
import { Project } from '@/lib/types';
import { Loader2, Plus, ArrowRight, FileText, CheckCircle2, Clock } from 'lucide-react';


function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'draft':
    case 'pending':
    case 'reviewing': return "We're reviewing your request.";
    case 'awaiting_approval': return "Ready for your decision.";
    case 'approved': return "Approved, starting soon.";
    case 'in_progress': return "In progress.";
    case 'completed': return "Completed.";
    case 'declined': return "Declined.";
    default: return status;
  }
}

export default function PortalDashboard() {
  const [project, setProject] = useState<Project | null>(null);
  const [rollup, setRollup] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [{ project: p, rollup: r }, { requests: reqs }] = await Promise.all([
          fetchPortalProject(),
          fetchPortalRequests(),
        ]);
        setProject(p);
        setRollup(r);
        setRequests(reqs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20 text-gray-500">
        Project information is not available.
      </div>
    );
  }

  const awaitingRequests = requests.filter(r => r.status === 'awaiting_approval');
  const recentRequests = requests.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome / Progress Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{project.name}</h1>
        <p className="text-gray-600 mb-6">{project.scope_summary || 'Your project dashboard'}</p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Project Progress</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Original Agreement</div>
              <div className="text-2xl font-semibold text-gray-900">
                {formatMoney(project.agreed_budget || 0)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {project.timeline_days} days estimated
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Current State (with approved changes)</div>
              <div className="text-2xl font-semibold text-gray-900">
                {formatMoney(rollup?.totalCost || project.agreed_budget || 0)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {rollup?.totalDays || project.timeline_days} days estimated
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Link
              href="/portal/requests/new"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Start a New Request
            </Link>
          </div>
        </div>
      </div>

      {/* Action Needed */}
      {awaitingRequests.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            Needs your decision
          </h2>
          <div className="space-y-3">
            {awaitingRequests.map(req => (
              <Link key={req.id} href={`/portal/requests/${req.id}`} className="block">
                <div className="bg-white rounded-xl border border-orange-200 p-4 shadow-sm hover:border-orange-300 transition-colors flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{req.title}</h3>
                    <p className="text-sm text-orange-700 mt-1">Ready for your decision.</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Recent Requests</h2>
          <Link href="/portal/requests" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all
          </Link>
        </div>
        
        {recentRequests.length === 0 ? (
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <p className="text-gray-500">You haven't submitted any requests yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {recentRequests.map(req => (
                <li key={req.id}>
                  <Link href={`/portal/requests/${req.id}`} className="block hover:bg-gray-50 transition-colors p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{req.title}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{getStatusLabel(req.status)}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

