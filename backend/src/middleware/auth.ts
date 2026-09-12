import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase.js';

/**
 * Auth middleware — validates the Supabase access token from the
 * Authorization header and attaches userId / userEmail to the request.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  let token: string | undefined;
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (typeof req.query.token === 'string' && (req.path === '/stream' || req.path === '/events/stream' || req.baseUrl === '/events')) {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  if (process.env.NODE_ENV === 'test') {
    if (token === 'mock-admin-token') {
      req.userId = '00000000-0000-0000-0000-000000000001';
      req.userEmail = 'admin@imant.com';
      req.userRole = 'admin';
      next();
      return;
    }
    if (token === 'mock-standard-token') {
      req.userId = '00000000-0000-0000-0000-000000000002';
      req.userEmail = 'subhanshahid.dev@gmail.com';
      req.userRole = 'standard';
      next();
      return;
    }
  }
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: error?.message || 'Invalid or expired session' });
    return;
  }

  req.userId = user.id;
  req.userEmail = user.email;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, is_active, onboarding_completed')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    res.status(403).json({ error: 'Your account profile is not available.' });
    return;
  }
  if (!profile.is_active) {
    res.status(403).json({ error: 'Your account is inactive. Contact an administrator.' });
    return;
  }
  if (!profile.onboarding_completed) {
    res.status(403).json({ error: 'Finish setting up your account before continuing.' });
    return;
  }
  req.userRole = profile.role;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: 'You do not have permission to view this page.' });
    return;
  }
  next();
}

/**
 * Validates Supabase JWT against the client_users table.
 */
export async function requireClientAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }
  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: error?.message || 'Invalid or expired session' });
    return;
  }

  req.userId = user.id;
  req.userEmail = user.email;

  const { data: clientUser, error: clientUserError } = await supabaseAdmin
    .from('client_users')
    .select('client_id, is_active')
    .eq('id', user.id)
    .single();

  if (clientUserError || !clientUser) {
    res.status(403).json({ error: 'Your client account is not available.' });
    return;
  }
  if (!clientUser.is_active) {
    res.status(403).json({ error: 'Your account is inactive. Contact support.' });
    return;
  }

  req.clientId = clientUser.client_id;
  req.userType = 'client';
  next();
}
