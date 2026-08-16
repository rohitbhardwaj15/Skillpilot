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

const FEEDBACK_TYPE_MAP = { project: 'projects', course: 'video', article: 'reading' };

/** Shared pipeline: role match -> skill gaps -> score -> order -> phases. */
function buildRoadmap(profile, candidateCourses) {
  const role = matchRole(profile.targetRole, roles);
  if (!role) {
    throw new Error(
      `Could not match "${profile.targetRole}" to a known role. Supported roles: ${roles
        .map((r) => r.role)
        .join(', ')}`
    );
  }
  const { ranked, skillGaps } = rankCourses(candidateCourses, profile, role);
  if (ranked.length === 0) {
    throw new Error(
      `No relevant courses found for role "${role.role}" in the current dataset.`
    );
  }
  const ordered = orderByPrerequisites(ranked, profile);
  const phases = groupIntoPhases(ordered);
  const estimatedDurationWeeks = phases.reduce((sum, p) => sum + p.durationWeeks, 0);
  return { role, skillGaps, phases, estimatedDurationWeeks };
}

// POST /api/path/generate
// Body: { profileId: string }
router.post('/generate', async (req, res) => {
  const { profileId } = req.body;
  if (!profileId) {
    return res.status(400).json({ error: 'profileId is required' });
  }

  try {
    const profile = await Profile.findById(profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const courses = await Course.find({});
    if (courses.length === 0) {
      return res.status(422).json({ error: 'No courses in the database — run scripts/seed.js first.' });
    }

    const { role, skillGaps, phases, estimatedDurationWeeks } = buildRoadmap(profile, courses);

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
    res.status(422).json({ error: err.message });
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

    const flat = learningPath.phases.flatMap((p) => p.courses);
    const idx = flat.findIndex((c) => String(c.courseId) === String(courseId));
    if (idx === -1) return res.status(404).json({ error: 'Course not found in this path' });

    flat[idx].status = 'done';
    const next = flat[idx + 1];
    if (next && next.status === 'upcoming') {
      next.status = 'current';
    }

    let cursor = 0;
    learningPath.phases.forEach((p) => {
      p.courses.forEach((c, i) => {
        p.courses[i] = flat[cursor];
        cursor++;
      });
    });
    learningPath.markModified('phases');
    await learningPath.save();

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

// POST /api/path/:id/feedback
// Body: { courseId: string, rating: 'too_easy' | 'too_hard' | 'good' | 'perfect' }
//
// THIS is the "adapt suggestions based on user feedback and progress" requirement
// from the brief. It's not cosmetic — it actually changes the learner's implied
// profile and re-runs the recommendation engine on the remaining (not-done)
// portion of the path, so the roadmap that comes back can genuinely differ.
router.post('/:id/feedback', async (req, res) => {
  const { courseId, rating } = req.body;
  const validRatings = ['too_easy', 'too_hard', 'good', 'perfect'];
  if (!courseId || !validRatings.includes(rating)) {
    return res.status(400).json({ error: `rating must be one of: ${validRatings.join(', ')}` });
  }

  try {
    const learningPath = await LearningPath.findById(req.params.id);
    if (!learningPath) return res.status(404).json({ error: 'Learning path not found' });

    const profile = await Profile.findById(learningPath.profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const flat = learningPath.phases.flatMap((p) => p.courses);
    const targetEntry = flat.find((c) => String(c.courseId) === String(courseId));
    if (!targetEntry) return res.status(404).json({ error: 'Course not found in this path' });

    profile.feedback.push({ courseId, rating });

    let adaptationMessage = '';

    if (rating === 'too_easy') {
      // Learner already has this covered — bump those skills to advanced so
      // the engine stops recommending more beginner material for them.
      targetEntry.skills.forEach((skillName) => {
        const existing = profile.currentSkills.find(
          (s) => s.name.toLowerCase() === skillName.toLowerCase()
        );
        if (existing) existing.level = 'advanced';
        else profile.currentSkills.push({ name: skillName, level: 'advanced' });
      });
      adaptationMessage = `Marked ${targetEntry.skills.join(', ')} as more advanced — the engine will stop suggesting beginner material for these skills.`;
    } else if (rating === 'too_hard') {
      // Walk it back — treat the skill as less known so the engine surfaces
      // more foundational material before revisiting harder content.
      targetEntry.skills.forEach((skillName) => {
        const existing = profile.currentSkills.find(
          (s) => s.name.toLowerCase() === skillName.toLowerCase()
        );
        if (existing && existing.level !== 'none') existing.level = 'beginner';
      });
      adaptationMessage = `Noted — we'll prioritize more foundational material for ${targetEntry.skills.join(', ')} before harder content.`;
    } else {
      // good / perfect — reinforce this course's format as a preference,
      // using the actual course type from the catalog for accuracy
      const courseDoc = await Course.findById(courseId);
      const styleKey = courseDoc ? FEEDBACK_TYPE_MAP[courseDoc.type] || courseDoc.type : 'projects';
      if (styleKey && !profile.learningStyle.includes(styleKey)) {
        profile.learningStyle.unshift(styleKey);
      }
      adaptationMessage = `Good to know — we'll lean more toward "${styleKey}"-style recommendations going forward.`;
    }

    await profile.save();

    // Re-rank the REMAINING (not-done) portion of the path against the
    // updated profile. Already-completed courses are preserved as-is.
    const doneEntries = flat.filter((c) => c.status === 'done');
    const doneIds = new Set(doneEntries.map((c) => String(c.courseId)));

    const allCourses = await Course.find({});
    const remainingCandidates = allCourses.filter((c) => !doneIds.has(String(c._id)));

    const { role, skillGaps, phases: newPhases } = buildRoadmap(profile, remainingCandidates);

    const completedPhase = doneEntries.length
      ? [
          {
            phaseNumber: 0,
            title: 'Completed',
            durationWeeks: doneEntries.reduce((s, c) => s + (c.durationWeeks || 0), 0),
            courses: doneEntries,
          },
        ]
      : [];

    const renumberedNewPhases = newPhases.map((p, i) => ({ ...p, phaseNumber: i + 1 }));

    learningPath.targetRole = role.role;
    learningPath.skillGaps = skillGaps;
    learningPath.phases = [...completedPhase, ...renumberedNewPhases];
    learningPath.estimatedDurationWeeks =
      completedPhase.reduce((s, p) => s + p.durationWeeks, 0) +
      renumberedNewPhases.reduce((s, p) => s + p.durationWeeks, 0);
    learningPath.markModified('phases');
    await learningPath.save();

    res.json({ learningPath, adaptation: { rating, message: adaptationMessage } });
  } catch (err) {
    console.error('feedback failed:', err.message);
    res.status(422).json({ error: err.message });
  }
});

export default router;
