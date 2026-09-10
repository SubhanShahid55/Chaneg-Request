'use client';

import { ChangeEvent, useState } from 'react';

interface AvatarUploadProps {
  name: string;
  avatarUrl: string;
  onUpload: (dataUrl: string) => Promise<void>;
  onRemove: () => Promise<void>;
  compact?: boolean;
}

export function AvatarUpload({ name, avatarUrl, onUpload, onRemove, compact = false }: AvatarUploadProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('The image could not be read.'));
        reader.onerror = () => reject(new Error('The image could not be read.'));
        reader.readAsDataURL(file);
      });
      await onUpload(dataUrl);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The profile picture could not be uploaded.'); } finally { setBusy(false); }
  }
  async function handleRemove() { setBusy(true); setError(''); try { await onRemove(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'The profile picture could not be removed.'); } finally { setBusy(false); } }
  return (
    <div className={compact ? 'flex items-center gap-3' : 'flex flex-col items-center'}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${name || 'User'} profile`}
          className={compact ? 'h-11 w-11 rounded-full object-cover' : 'h-20 w-20 rounded-full object-cover ring-4 ring-[#eef2ff]'}
        />
      ) : (
        <span
          className={
            compact
              ? 'flex h-11 w-11 items-center justify-center rounded-full bg-[#e5eeff] font-semibold text-[#3525cd]'
              : 'flex h-20 w-20 items-center justify-center rounded-full bg-[#e5eeff] text-2xl font-semibold text-[#3525cd]'
          }
        >
          {(name || 'U').slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className={compact ? 'flex items-center gap-2' : 'mt-4 flex items-center gap-2'}>
        <label className="cursor-pointer rounded-lg border border-[#c7c4d8] px-3 py-2 text-xs font-semibold text-[#3525cd] hover:bg-[#eff4ff] transition-colors">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleFile}
            disabled={busy}
          />
          {busy ? 'Saving...' : 'Upload photo'}
        </label>
        {avatarUrl && (
          <button
            type="button"
            onClick={() => void handleRemove()}
            disabled={busy}
            className="text-xs font-semibold text-[#ba1a1a] hover:underline"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-[#ba1a1a]">{error}</p>}
    </div>
  );
}