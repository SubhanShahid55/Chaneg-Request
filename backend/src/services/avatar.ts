import crypto from 'node:crypto';
import { supabaseAdmin } from '../supabase.js';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export async function uploadAvatar(userId: string, dataUrl: string): Promise<{ path: string; contentType: string; size: number }> {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Use a JPG, PNG, or WebP image.');
  const contentType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_AVATAR_BYTES) throw new Error('Profile pictures must be 5 MB or smaller.');
  const validSignature = (contentType === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8)
    || (contentType === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    || (contentType === 'image/webp' && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP');
  if (!validSignature) throw new Error('The selected file is not a valid JPG, PNG, or WebP image.');
  const extension = IMAGE_EXTENSIONS.get(contentType);
  if (!extension) throw new Error('Unsupported image format.');
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabaseAdmin.storage.from('profile-pictures').upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error('The profile picture could not be uploaded.');
  return { path, contentType, size: buffer.length };
}

export async function removeAvatar(path: string | null | undefined): Promise<void> {
  if (path && !path.startsWith('http')) await supabaseAdmin.storage.from('profile-pictures').remove([path]);
}