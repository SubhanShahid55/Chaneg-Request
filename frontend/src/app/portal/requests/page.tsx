'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchPortalRequests } from '@/lib/api';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';

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

export default function PortalRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { requests: reqs } = await fetchPortalRequests();
        setRequests(reqs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/portal" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">All Requests</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500 mb-4">You haven't submitted any requests yet.</p>
          <Link
            href="/portal/requests/new"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Start a New Request
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {requests.map(req => (
              <li key={req.id}>
                <Link href={`/portal/requests/${req.id}`} className="block hover:bg-gray-50 transition-colors p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-mono text-gray-500">{req.reference_code}</span>
                        <h3 className="font-medium text-gray-900">{req.title}</h3>
                      </div>
                      <p className={`text-sm ${req.status === 'awaiting_approval' ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                        {getStatusLabel(req.status)}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

