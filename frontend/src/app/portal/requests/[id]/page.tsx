'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchPortalRequest, approvePortalRequest, declinePortalRequest } from '@/lib/api';
import { ArrowLeft, Loader2, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';


function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function getStatusInfo(status: string) {
  switch (status) {
    case 'draft':
    case 'pending':
    case 'reviewing': return { label: "We're reviewing your request.", color: 'text-gray-600', bg: 'bg-gray-100' };
    case 'awaiting_approval': return { label: "Ready for your decision.", color: 'text-orange-700', bg: 'bg-orange-100' };
    case 'approved': return { label: "Approved, starting soon.", color: 'text-green-700', bg: 'bg-green-100' };
    case 'in_progress': return { label: "In progress.", color: 'text-blue-700', bg: 'bg-blue-100' };
    case 'completed': return { label: "Completed.", color: 'text-purple-700', bg: 'bg-purple-100' };
    case 'declined': return { label: "Declined.", color: 'text-red-700', bg: 'bg-red-100' };
    default: return { label: status, color: 'text-gray-600', bg: 'bg-gray-100' };
  }
}

export default function PortalRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) as string;
  
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { request: req } = await fetchPortalRequest(id);
        setRequest(req);
      } catch (err) {
        console.error(err);
        setError('Could not load request.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await approvePortalRequest(id);
      // Reload request
      const { request: req } = await fetchPortalRequest(id);
      setRequest(req);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    const reason = window.prompt("Would you like to leave a note about why you are declining? (Optional)");
    if (reason === null) return; // cancelled
    setActionLoading(true);
    try {
      await declinePortalRequest(id, reason);
      const { request: req } = await fetchPortalRequest(id);
      setRequest(req);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not decline request.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">{error || 'Request not found.'}</p>
        <Link href="/portal" className="text-blue-600 hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  const statusInfo = getStatusInfo(request.status);
  const isAwaiting = request.status === 'awaiting_approval';
  const computedHours = (request.deliverables || []).reduce((acc: number, d: any) => acc + (Number(d?.hours) || 0), 0);
  const hasProposal = (computedHours > 0 || (request.deliverables && request.deliverables.length > 0)) && request.timeline_days !== null;
  const estimatedCost = computedHours * (Number(request.hourly_rate) || 0);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/portal" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-sm font-mono text-gray-500 block mb-1">{request.reference_code}</span>
            <h1 className="text-2xl font-semibold text-gray-900">{request.title}</h1>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.color}`}>
          {statusInfo.label}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">What was asked</h2>
          <div className="prose prose-sm text-gray-600 whitespace-pre-wrap max-w-none">
            {request.client_quote || "No additional details provided."}
          </div>

          {request.request_attachments?.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Attached Files</h3>
              <div className="flex flex-wrap gap-3">
                {request.request_attachments.map((file: any) => (
                  <a
                    key={file.id}
                    href={file.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-700">{file.file_name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {hasProposal && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Our Proposal</h2>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Estimated Cost</div>
                <div className="text-2xl font-semibold text-gray-900">{formatMoney(estimatedCost)}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Estimated Timeline</div>
                <div className="text-2xl font-semibold text-gray-900">{request.timeline_days} days</div>
              </div>
            </div>

            {request.deliverables?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">What's included</h3>
                <ul className="space-y-2">
                  {request.deliverables.map((d: any) => (
                    <li key={d.id} className="flex gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{d.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {request.exclusions?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">What's not included</h3>
                <ul className="space-y-2">
                  {request.exclusions.map((e: any) => (
                    <li key={e.id} className="flex gap-2 text-sm text-gray-600">
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{e.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {isAwaiting && (
            <div className="bg-orange-50 p-6 sm:p-8 border-t border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-medium text-orange-900">Are you ready to proceed?</p>
                <p className="text-sm text-orange-700">Approving will add this to the project scope.</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={handleDecline}
                  disabled={actionLoading}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Approve Proposal
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
