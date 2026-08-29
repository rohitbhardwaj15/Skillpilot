import { Router } from 'express';
import Course from '../models/Course.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Profile from '../models/Profile.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { matchRole, rankCourses } from '../services/recommendation.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const roles = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/roles.json'), 'utf-8'));


const router = Router();

// GET /api/courses/recommended — authenticated, learner-aware ranking.
// This exposes the same recommendation engine used by roadmap generation, so
// the Recommendations page is genuinely personalized instead of being a catalog.
router.get('/recommended', requireAuth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.auth.userId });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const role = matchRole(profile.targetRole, roles);
    if (!role) return res.status(422).json({ error: 'Could not match your target role' });
    const courses = await Course.find({});
    const { ranked, skillGaps, model } = await rankCourses(courses, profile, role, {
      priorModel: profile.preferenceModel,
    });
    const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 60);
    res.json({
      courses: ranked.slice(0, limit).map((item, index) => ({
        ...item.course.toObject(),
        recommendationRank: index + 1,
        recommendationScore: item.breakdown.totalScore,
        scoreBreakdown: item.breakdown,
        explanation: item.explanation,
        ml: item.ml,
      })),
      skillGaps,
      role: role.role,
      model,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/courses — list all courses (optionally filter by ?skill=)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.skill ? { skills: req.query.skill } : {};
    const courses = await Course.find(filter);
    res.json(courses);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
