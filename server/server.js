import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

import profileRoutes from './routes/profile.routes.js';
import courseRoutes from './routes/course.routes.js';
import aiRoutes from './routes/ai.routes.js';
import pathRoutes from './routes/path.routes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check — useful for judges/deploy platform to verify the API is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SkillPilot API' });
});

app.use('/api/profile', profileRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/path', pathRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 SkillPilot API running on port ${PORT}`);
  });
});
