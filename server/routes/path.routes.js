import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Profile from '../models/Profile.js';
import Course from '../models/Course.js';
import LearningPath from '../models/LearningPath.js';
import { matchRole, rankCourses } from '../services/recommendation.service.js';
import { orderByPrerequisites, groupIntoPhases } from '../services/pathgen.service.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const roles = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/roles.json'), 'utf-8'));

// POST /api/path/generate
// Body: { profileId: string }
// Runs the full recommendation pipeline: role match -> skill gaps ->
// scoring -> prerequisite ordering -> phases. Saves and returns the roadmap.
router.post('/generate', async (req, res) => {
  const { profileId } = req.body;
  if (!profileId) {
    return res.status(400).json({ error: 'profileId is required' });
  }

  try {
    const profile = await Profile.findById(profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const role = matchRole(profile.targetRole, roles);
    if (!role) {
      return res.status(422).json({
        error: `Could not match "${profile.targetRole}" to a known role. Supported roles: ${roles
          .map((r) => r.role)
          .join(', ')}`,
      });
    }

    const courses = await Course.find({});
    if (courses.length === 0) {
      return res.status(422).json({ error: 'No courses in the database — run scripts/seed.js first.' });
    }

    const { ranked, skillGaps } = rankCourses(courses, profile, role);
    if (ranked.length === 0) {
      return res.status(422).json({
        error: `No relevant courses found for role "${role.role}" in the current dataset. The course catalog needs more coverage for this role.`,
      });
    }

    const ordered = orderByPrerequisites(ranked, profile);
    const phases = groupIntoPhases(ordered);
    const estimatedDurationWeeks = phases.reduce((sum, p) => sum + p.durationWeeks, 0);

    const learningPath = await LearningPath.create({
      profileId: profile._id,
      targetRole: role.role,
      skillGaps,
      phases,
      estimatedDurationWeeks,
    });

    res.status(201).json(learningPath);
  } catch (err) {
    console.error('path/generate failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/path/:id
router.get('/:id', async (req, res) => {
  try {
    const learningPath = await LearningPath.findById(req.params.id);
    if (!learningPath) return res.status(404).json({ error: 'Learning path not found' });
    res.json(learningPath);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
