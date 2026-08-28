import express from 'express';
import cors from 'cors';
import profileRoutes from './routes/profile.routes.js';
import courseRoutes from './routes/course.routes.js';
import aiRoutes from './routes/ai.routes.js';
import pathRoutes from './routes/path.routes.js';
import authRoutes from './routes/auth.routes.js';
import assessmentRoutes from './routes/assessment.routes.js';
import { rateLimit, securityHeaders } from './middleware/security.middleware.js';

const app = express();
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',').map(v => v.trim()).filter(Boolean);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && allowedOrigins.length === 0) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'SkillPilot API' }));
app.use('/api/profile', profileRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/path', pathRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/assessment', assessmentRoutes);

app.use((err, req, res, next) => {
  if (err?.message === 'Origin not allowed by CORS') return res.status(403).json({ error: 'Origin not allowed.' });
  console.error('Unhandled API error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

export default app;
