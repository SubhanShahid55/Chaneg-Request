import crypto from 'node:crypto';
import { supabaseAdmin } from '../supabase.js';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB limit

const ALLOWED_MIME_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/pdf', 'pdf'],
]);

export async function uploadAttachment(
  requestId: string,
  userId: string,
  dataUrl: string,
  originalName: string
) {
  const match = dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Invalid file encoding.');
  
  const contentType = match[1];
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    throw new Error('Unsupported file type. Use JPG, PNG, WebP, or PDF.');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_ATTACHMENT_BYTES) throw new Error('Attachments must be 10 MB or smaller.');

  // Magic byte validation
  const validSignature = (contentType === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8)
    || (contentType === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    || (contentType === 'image/webp' && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP')
    || (contentType === 'application/pdf' && buffer.subarray(0, 4).equals(Buffer.from('%PDF')));
    
  if (!validSignature) throw new Error('The selected file does not match its expected format.');

  const extension = ALLOWED_MIME_TYPES.get(contentType)!;
  const path = `${requestId}/${crypto.randomUUID()}.${extension}`;
  
  const { error } = await supabaseAdmin.storage.from('request-attachments').upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error('The attachment could not be uploaded.');

  const { data: attachment, error: dbError } = await supabaseAdmin.from('request_attachments').insert({
    request_id: requestId,
    uploaded_by: userId,
    file_name: originalName,
    file_path: path,
    mime_type: contentType,
    size_bytes: buffer.length,
  }).select().single();

  if (dbError || !attachment) {
    await supabaseAdmin.storage.from('request-attachments').remove([path]);
    throw new Error('Could not save attachment metadata.');
  }

  return attachment;
}

export async function getAttachmentSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabaseAdmin.storage.from('request-attachments').createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

