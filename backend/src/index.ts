import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';
import { approvalRateLimiter } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import requestRoutes from './routes/requests.js';
import statsRoutes from './routes/stats.js';
import approvalRoutes from './routes/approval.js';
import eventsRoutes from './routes/events.js';
import adminRoutes from './routes/admin.js';

const app = express();

const allowedOrigins = new Set([
  config.appUrl.replace(/\/$/, ''),
  'https://change-flow-eight.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  ...config.corsOrigins,
]);

// ─── Global middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '7mb' }));

// ─── Health check ───────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name: 'ChangeFlow API',
    status: 'ok',
    health: '/health',
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Public routes (rate-limited, no auth) ──────────────────
app.use('/approval', approvalRateLimiter, approvalRoutes);

// ─── Authenticated routes ───────────────────────────────────
app.use('/auth', authRoutes);                          // POST /auth/session is special — it validates the token itself
app.use('/profile', requireAuth, authRoutes);           // PATCH /profile
app.use('/admin', requireAuth, requireAdmin, adminRoutes);
app.use('/clients', requireAuth, clientRoutes);
app.use('/requests', requireAuth, requestRoutes);
app.use('/stats', requireAuth, statsRoutes);
app.use('/events', requireAuth, eventsRoutes);

// ─── Global error handler ───────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ──────────────────────────────────────────────────
if (!process.env.VERCEL) {
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
}

export default app;
