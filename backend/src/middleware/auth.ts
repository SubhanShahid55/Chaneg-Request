import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase.js';
import { verifyCredentials } from '@supabase/server/core';

/**
 * Auth middleware — validates the Supabase access token from the
 * Authorization header and attaches userId / userEmail to the request.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || null;
  const apikey = (req.headers.apikey as string) || null;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }
  const credentials = { token, apikey };

  const token = authHeader.slice(7);
  const { data: auth, error } = await verifyCredentials(credentials, { auth: 'user' });

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired session' });
  if (error) {
    res.status(error.status || 401).json({ error: error.message });
    return;
  }

  req.userId = user.id;
  req.userEmail = user.email;
  // userClaims contains the decoded JWT payload
  req.userId = (auth?.userClaims as any)?.sub;
  req.userEmail = (auth?.userClaims as any)?.email;
  
  next();
}
