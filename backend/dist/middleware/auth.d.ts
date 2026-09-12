import { Request, Response, NextFunction } from 'express';
/**
 * Auth middleware — validates the Supabase access token from the
 * Authorization header and attaches userId / userEmail to the request.
 */
export declare function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function requireAdmin(req: Request, res: Response, next: NextFunction): void;
/**
 * Validates Supabase JWT against the client_users table.
 */
export declare function requireClientAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.d.ts.map