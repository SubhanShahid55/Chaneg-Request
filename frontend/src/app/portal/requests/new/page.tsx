'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { submitPortalRequest } from '@/lib/api';
import { ArrowLeft, Loader2, UploadCloud, X } from 'lucide-react';

export default function NewPortalRequestPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [file, setFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File must be smaller than 10MB.');
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFileDataUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFileDataUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a brief summary of what you need.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload: any = { title, client_quote: description };
      if (file && fileDataUrl) {
        payload.attachment = {
          name: file.name,
          dataUrl: fileDataUrl,
        };
      }
      const { request } = await submitPortalRequest(payload);
      router.push(`/portal/requests/${request.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit request.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/portal" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Start a New Request</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
        {error && (
          <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-1">
            What do you need?
          </label>
          <input
            id="title"
            type="text"
            required
            placeholder="e.g., Add a new contact form to the homepage"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-1">
            Any extra details? <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain what you are trying to achieve..."
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-900 mb-2">
            Attach a file <span className="text-gray-500 font-normal">(optional)</span>
          </span>
          
          {file ? (
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 bg-white border border-gray-200 rounded flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-gray-500 uppercase">{file.name.split('.').pop()?.slice(0,3)}</span>
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button type="button" onClick={removeFile} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-700">Click to upload a file</span>
              <span className="text-xs text-gray-500 mt-1">JPG, PNG, WebP, or PDF up to 10MB</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
          />
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
          <Link
            href="/portal"
            className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
}

