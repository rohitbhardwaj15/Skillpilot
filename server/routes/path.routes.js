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

// PUT /api/path/:id/progress
// Body: { courseId: string, status: 'done' }
// Marks a course complete, advances the next upcoming course to 'current',
// and syncs the learner's profile (completedCourseIds + currentSkills).
router.put('/:id/progress', async (req, res) => {
  const { courseId, status } = req.body;
  if (!courseId || status !== 'done') {
    return res.status(400).json({ error: 'courseId and status "done" are required' });
  }

  try {
    const learningPath = await LearningPath.findById(req.params.id);
    if (!learningPath) return res.status(404).json({ error: 'Learning path not found' });

    // Flatten phases into a single ordered course list to find position + cascade "current"
    const flat = learningPath.phases.flatMap((p) => p.courses);
    const idx = flat.findIndex((c) => String(c.courseId) === String(courseId));
    if (idx === -1) return res.status(404).json({ error: 'Course not found in this path' });

    flat[idx].status = 'done';
    const next = flat[idx + 1];
    if (next && next.status === 'upcoming') {
      next.status = 'current';
    }

    // Write the mutated flat statuses back into the nested phase structure
    let cursor = 0;
    learningPath.phases.forEach((p) => {
      p.courses.forEach((c, i) => {
        p.courses[i] = flat[cursor];
        cursor++;
      });
    });
    learningPath.markModified('phases');
    await learningPath.save();

    // Sync profile: mark course completed, upgrade skill levels for what it taught
    const profile = await Profile.findById(learningPath.profileId);
    if (profile) {
      if (!profile.completedCourseIds.some((id) => String(id) === String(courseId))) {
        profile.completedCourseIds.push(courseId);
      }
      const completedCourse = flat[idx];
      completedCourse.skills.forEach((skillName) => {
        const existing = profile.currentSkills.find(
          (s) => s.name.toLowerCase() === skillName.toLowerCase()
        );
        if (existing) {
          existing.level = 'intermediate';
        } else {
          profile.currentSkills.push({ name: skillName, level: 'intermediate' });
        }
      });
      await profile.save();
    }

    res.json(learningPath);
  } catch (err) {
    console.error('progress update failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
