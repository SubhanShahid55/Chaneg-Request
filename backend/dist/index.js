import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { requireAuth } from './middleware/auth.js';
import { approvalRateLimiter } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import requestRoutes from './routes/requests.js';
import statsRoutes from './routes/stats.js';
import approvalRoutes from './routes/approval.js';
const app = express();
// ─── Global middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: config.appUrl,
    credentials: true,
}));
app.use(express.json());
// ─── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ─── Public routes (rate-limited, no auth) ──────────────────
app.use('/approval', approvalRateLimiter, approvalRoutes);
// ─── Authenticated routes ───────────────────────────────────
app.use('/auth', authRoutes); // POST /auth/session is special — it validates the token itself
app.use('/profile', requireAuth, authRoutes); // PATCH /profile
app.use('/clients', requireAuth, clientRoutes);
app.use('/requests', requireAuth, requestRoutes);
app.use('/stats', requireAuth, statsRoutes);
// ─── Global error handler ───────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// ─── Start ──────────────────────────────────────────────────
app.listen(config.port, () => {
    console.log(`
  ┌─────────────────────────────────────────────┐
  │                                             │
  │   ChangeFlow API Server                     │
  │   Running on http://localhost:${config.port}        │
  │                                             │
  │   Health:    GET  /health                    │
  │   Auth:      POST /auth/session             │
  │   Profile:   PATCH /profile                 │
  │   Clients:   GET  /clients                  │
  │   Requests:  GET  /requests                 │
  │   Stats:     GET  /stats/summary            │
  │   Approval:  GET  /approval/:token          │
  │                                             │
  └─────────────────────────────────────────────┘
  `);
});
export default app;
//# sourceMappingURL=index.js.map