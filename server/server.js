import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';

dotenv.config();
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 SkillPilot API running on port ${PORT}`));
}).catch((err) => {
  console.error('Database connection failed:', err.message);
  process.exit(1);
});
