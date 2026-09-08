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
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  req.userId = user.id;
  req.userEmail = user.email;
  next();
}
