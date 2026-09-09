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

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, is_active')
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
