import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { matchRole, computeSkillGaps, rankCourses } from '../services/recommendation.service.js';
import { orderByPrerequisites, groupIntoPhases } from '../services/pathgen.service.js';
import { buildCareerInsights } from '../services/readiness.service.js';
import { applyCompletion, applyFeedback } from '../services/learner.service.js';
import Course from '../models/Course.js';
import Profile from '../models/Profile.js';
import LearningPath from '../models/LearningPath.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/*
 * Roles are loaded from the same roles.json used by the
 * recommendation/evaluation system. This avoids depending on an empty
 * MongoDB Role collection for career simulation.
 */
const rolesPath = path.join(__dirname, '../../data/roles.json');
let roles = [];
try {
  roles = JSON.parse(fs.readFileSync(rolesPath, 'utf-8'));
} catch (error) {
  console.error('Failed to load roles.json:', error.message);
}

function findTargetRole(targetRoleText) {
  if (!targetRoleText || !roles.length) return null;
  return matchRole(String(targetRoleText).trim(), roles);
}

/** Loads a LearningPath and its owning Profile, and verifies the requester
 * owns the underlying profile. Returns null (with the response already
 * sent) if anything fails, so callers can `if (!ctx) return;`. */
async function loadOwnedPath(req, res) {
  const learningPath = await LearningPath.findById(req.params.id);
  if (!learningPath) {
    res.status(404).json({ message: 'Learning path not found.' });
    return null;
  }

  const profile = await Profile.findById(learningPath.profileId);
  if (!profile) {
    res.status(404).json({ message: 'Associated profile not found.' });
    return null;
  }

  if (String(profile.userId) !== String(req.auth.userId)) {
    res.status(403).json({ message: 'Forbidden.' });
    return null;
  }

  return { learningPath, profile };
}

/* ───────────────────────────────────────────────
 * Generate Learning Path
 * POST /api/path/generate
 * ─────────────────────────────────────────────── */

router.post('/generate', requireAuth, async (req, res) => {
  try {
    let profile = req.body?.profile || null;

    // Frontend sends profileId — fetch full profile from DB
    if (!profile && req.body?.profileId) {
      profile = await Profile.findById(req.body.profileId);
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found.' });
      }
      if (String(profile.userId) !== String(req.auth.userId)) {
        return res.status(403).json({ message: 'Forbidden.' });
      }
    }

    if (!profile || !profile.targetRole) {
      return res.status(400).json({ message: 'Profile with targetRole is required.' });
    }

    const courses = await Course.find({});
    const role = findTargetRole(profile.targetRole);
    if (!role) {
      return res.status(404).json({ message: 'Target role could not be identified.' });
    }

    const { ranked, skillGaps, model, learnedModel } = await rankCourses(courses, profile, role, {
      priorModel: profile.preferenceModel,
    });

    const roadmap = orderByPrerequisites(ranked, profile);
    const phases = groupIntoPhases(roadmap);
    const estimatedDurationWeeks = phases.reduce((sum, p) => sum + (p.durationWeeks || 0), 0);

    const learningPath = await LearningPath.create({
      profileId: profile._id,
      targetRole: role.role,
      skillGaps,
      phases,
      estimatedDurationWeeks,
    });

    // Persist the (possibly warm-started) preference model so the next
    // request continues learning instead of starting from zero.
    if (profile._id && learnedModel) {
      profile.preferenceModel = { ...learnedModel, updatedAt: new Date() };
      await profile.save();
    }

    return res.status(201).json({
      ...learningPath.toObject(),
      recommendations: ranked,
      model,
      generatedAt: learningPath.createdAt,
    });
  } catch (error) {
    console.error('Path generation error:', error);
    return res.status(500).json({
      message: 'Failed to generate learning path.',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
});

/* ───────────────────────────────────────────────
 * Fetch a persisted Learning Path
 * GET /api/path/:id
 * ─────────────────────────────────────────────── */

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const ctx = await loadOwnedPath(req, res);
    if (!ctx) return;
    return res.json(ctx.learningPath);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

/* ───────────────────────────────────────────────
 * Career readiness / "next best action" insights for a path
 * GET /api/path/:id/insights
 * ─────────────────────────────────────────────── */

router.get('/:id/insights', requireAuth, async (req, res) => {
  try {
    const ctx = await loadOwnedPath(req, res);
    if (!ctx) return;

    const courses = await Course.find({});
    const insights = buildCareerInsights(ctx.profile, roles, courses, ctx.learningPath);
    return res.json(insights);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

/* ───────────────────────────────────────────────
 * Mark a course's progress within a path
 * PUT /api/path/:id/progress
 * Body: { courseId, status: 'current'|'upcoming'|'done', timeSpentMinutes }
 * ─────────────────────────────────────────────── */

router.put('/:id/progress', requireAuth, async (req, res) => {
  try {
    const ctx = await loadOwnedPath(req, res);
    if (!ctx) return;

    const { courseId, status, timeSpentMinutes = 0 } = req.body || {};
    if (!courseId || !['current', 'upcoming', 'done'].includes(status)) {
      return res.status(400).json({ message: 'courseId and a valid status are required.' });
    }

    const { learningPath, profile } = ctx;
    let targetCourse = null;
    let targetPhaseIndex = -1;
    let targetCourseIndex = -1;

    learningPath.phases.forEach((phase, phaseIndex) => {
      phase.courses.forEach((c, courseIndex) => {
        if (String(c.courseId) === String(courseId)) {
          targetCourse = c;
          targetPhaseIndex = phaseIndex;
          targetCourseIndex = courseIndex;
        }
      });
    });

    if (!targetCourse) {
      return res.status(404).json({ message: 'Course not found in this learning path.' });
    }

    targetCourse.status = status;

    if (status === 'done') {
      // Evidence-based mastery update — a completed course is stronger
      // evidence of a skill than the learner's self-reported level.
      applyCompletion(profile, targetCourse.skills || [], timeSpentMinutes);
      await profile.save();

      // Auto-advance: the next upcoming course in sequence becomes current.
      const phase = learningPath.phases[targetPhaseIndex];
      const next = phase.courses[targetCourseIndex + 1] || learningPath.phases[targetPhaseIndex + 1]?.courses?.[0];
      if (next && next.status === 'upcoming') {
        next.status = 'current';
      }
    }

    learningPath.markModified('phases');
    await learningPath.save();

    return res.json(learningPath);
  } catch (error) {
    console.error('Progress update error:', error);
    return res.status(500).json({ message: 'Failed to update progress.' });
  }
});

/* ───────────────────────────────────────────────
 * Feedback on a completed/attempted course — this is what actually
 * trains the learner preference model (see ml.service.js).
 * POST /api/path/:id/feedback
 * Body: { courseId, rating: 'too_easy'|'too_hard'|'good'|'perfect', timeSpentMinutes }
 * ─────────────────────────────────────────────── */

router.post('/:id/feedback', requireAuth, async (req, res) => {
  try {
    const ctx = await loadOwnedPath(req, res);
    if (!ctx) return;

    const { courseId, rating, timeSpentMinutes = 0 } = req.body || {};
    const validRatings = ['too_easy', 'too_hard', 'good', 'perfect'];
    if (!courseId || !validRatings.includes(rating)) {
      return res.status(422).json({ message: `rating must be one of: ${validRatings.join(', ')}` });
    }

    const { learningPath, profile } = ctx;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(422).json({ message: 'Course not found.' });
    }

    // 1. Record the raw feedback (this is the training data for the
    //    preference model — see buildFeedbackExamples in ml.service.js).
    profile.feedback = profile.feedback || [];
    profile.feedback.push({ courseId, rating, createdAt: new Date() });

    // 2. Update evidence-based knowledge state from what the feedback
    //    implies about the learner's actual mastery of the course's skills.
    applyFeedback(profile, course.skills || [], rating);

    // 3. Re-run the recommendation engine so the (warm-started) preference
    //    model incorporates this new example, then persist the updated
    //    model back onto the profile.
    const role = findTargetRole(profile.targetRole);
    if (role) {
      const allCourses = await Course.find({});
      const { learnedModel } = await rankCourses(allCourses, profile, role, {
        priorModel: profile.preferenceModel,
      });
      profile.preferenceModel = { ...learnedModel, updatedAt: new Date() };
    }

    await profile.save();

    return res.json({
      ok: true,
      preferenceModel: {
        trained: profile.preferenceModel?.trained || false,
        samples: profile.preferenceModel?.samples || 0,
      },
    });
  } catch (error) {
    console.error('Feedback error:', error);
    return res.status(500).json({ message: 'Failed to record feedback.' });
  }
});

/* ───────────────────────────────────────────────
 * Re-rank the remaining (not-yet-done) part of a path using the
 * latest profile state and preference model — this is what makes the
 * roadmap genuinely adaptive rather than fixed at generation time.
 * POST /api/path/:id/adapt
 * ─────────────────────────────────────────────── */

router.post('/:id/adapt', requireAuth, async (req, res) => {
  try {
    const ctx = await loadOwnedPath(req, res);
    if (!ctx) return;
    const { learningPath, profile } = ctx;

    const role = findTargetRole(profile.targetRole);
    if (!role) {
      return res.status(404).json({ message: 'Target role could not be identified.' });
    }

    const courses = await Course.find({});
    const { ranked, skillGaps, learnedModel } = await rankCourses(courses, profile, role, {
      priorModel: profile.preferenceModel,
    });

    const roadmap = orderByPrerequisites(ranked, profile);
    const newPhases = groupIntoPhases(roadmap);

    // Preserve completed courses; only replace what's still ahead.
    const doneCourseIds = new Set(
      learningPath.phases.flatMap((p) => p.courses).filter((c) => c.status === 'done').map((c) => String(c.courseId))
    );
    const donePhases = learningPath.phases
      .map((p) => ({ ...p.toObject(), courses: p.courses.filter((c) => c.status === 'done') }))
      .filter((p) => p.courses.length);
    const freshPhases = newPhases
      .map((p, idx) => ({
        ...p,
        phaseNumber: donePhases.length + idx + 1,
        courses: p.courses.filter((c) => !doneCourseIds.has(String(c.courseId))),
      }))
      .filter((p) => p.courses.length);

    if (freshPhases.length && freshPhases[0].courses.length) {
      freshPhases[0].courses[0].status = 'current';
    }

    learningPath.skillGaps = skillGaps;
    learningPath.phases = [...donePhases, ...freshPhases];
    learningPath.estimatedDurationWeeks = learningPath.phases.reduce((sum, p) => sum + (p.durationWeeks || 0), 0);
    learningPath.markModified('phases');
    await learningPath.save();

    if (learnedModel) {
      profile.preferenceModel = { ...learnedModel, updatedAt: new Date() };
      await profile.save();
    }

    return res.json(learningPath);
  } catch (error) {
    console.error('Path adaptation error:', error);
    return res.status(500).json({ message: 'Failed to adapt learning path.' });
  }
});

/* ───────────────────────────────────────────────
 * What-If Career Simulator
 * POST /api/path/simulate-career
 * ─────────────────────────────────────────────── */

router.post('/simulate-career', async (req, res) => {
  try {
    const { targetRole, profile = {} } = req.body || {};

    if (!targetRole || !String(targetRole).trim()) {
      return res.status(400).json({ message: 'Target career role is required.' });
    }

    const target = findTargetRole(targetRole);
    if (!target) {
      return res.status(404).json({ message: `Target career role "${targetRole}" was not found.` });
    }

    const courses = await Course.find({});

    const currentSkills = Array.isArray(profile.currentSkills) ? profile.currentSkills : [];
    const knowledgeState = Array.isArray(profile.knowledgeState) ? profile.knowledgeState : [];

    const skillGaps = computeSkillGaps(target.requiredSkills || [], currentSkills, knowledgeState);
    const totalRequired = (target.requiredSkills || []).length;
    const gapCount = skillGaps.length;
    const masteredSkills = Math.max(0, totalRequired - gapCount);
    const readiness = totalRequired > 0 ? masteredSkills / totalRequired : 1;

    const simulatedProfile = {
      ...profile,
      targetRole: target.role,
      goal: profile.goal || `Become a ${target.role}`,
      currentSkills,
      knowledgeState,
      preferredLanguage: profile.preferredLanguage || 'English',
      courseTypeFilter: profile.courseTypeFilter || 'both',
      learningStyle: Array.isArray(profile.learningStyle) ? profile.learningStyle : [],
      feedback: Array.isArray(profile.feedback) ? profile.feedback : [],
      interests: Array.isArray(profile.interests) ? profile.interests : [],
    };

    const { ranked, model } = await rankCourses(courses, simulatedProfile, target);
    const roadmap = orderByPrerequisites(ranked, simulatedProfile);

    const gapDetails = skillGaps.map((skill) => ({
      skill,
      priority: 'high',
      reason: `Required for ${target.role} but not yet mastered.`,
    }));

    let summary;
    if (readiness >= 0.8) {
      summary = `You are already well prepared for ${target.role}. Focus on the remaining skill gaps and advanced practice.`;
    } else if (readiness >= 0.5) {
      summary = `You have a solid foundation for ${target.role}, but several important skills still need to be developed.`;
    } else {
      summary = `This is a significant career transition. Follow the recommended roadmap to systematically close your ${target.role} skill gaps.`;
    }

    return res.json({
      success: true,
      currentRole: profile.currentRole || profile.targetRole || 'Current Profile',
      targetRole: target.role,
      readiness,
      readinessPercentage: Math.round(readiness * 100),
      requiredSkills: target.requiredSkills || [],
      currentSkills,
      skillGaps: gapDetails,
      roadmap,
      recommendations: ranked,
      model,
      summary,
      simulation: {
        type: 'what-if-career-transition',
        from: profile.currentRole || profile.targetRole || 'Current Profile',
        to: target.role,
        totalRequiredSkills: totalRequired,
        masteredSkills,
        remainingSkills: gapCount,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Career simulation error:', error);
    return res.status(500).json({
      message: 'Failed to simulate career path.',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
});

/* ───────────────────────────────────────────────
 * Career Readiness (standalone, no persisted path required)
 * POST /api/path/readiness
 * ─────────────────────────────────────────────── */

router.post('/readiness', async (req, res) => {
  try {
    const { profile = {}, targetRole } = req.body || {};
    const role = findTargetRole(targetRole || profile.targetRole);
    if (!role) {
      return res.status(404).json({ message: 'Target role could not be identified.' });
    }

    const gaps = computeSkillGaps(role.requiredSkills || [], profile.currentSkills || [], profile.knowledgeState || []);
    const total = (role.requiredSkills || []).length;
    const mastered = Math.max(0, total - gaps.length);
    const readiness = total > 0 ? mastered / total : 1;

    return res.json({
      success: true,
      targetRole: role.role,
      readiness,
      readinessPercentage: Math.round(readiness * 100),
      masteredSkills: mastered,
      requiredSkills: total,
      skillGaps: gaps,
    });
  } catch (error) {
    console.error('Readiness calculation error:', error);
    return res.status(500).json({
      message: 'Failed to calculate career readiness.',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
});

export default router;
