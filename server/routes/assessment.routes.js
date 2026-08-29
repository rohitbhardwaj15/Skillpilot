import { Router } from 'express';
import Profile from '../models/Profile.js';
import Assessment from '../models/Assessment.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { generateSkillAssessment } from '../services/llm.service.js';
import { applyAssessment, knowledgeSummary } from '../services/learner.service.js';
import { normalizeDifficulty, scoreAssessment } from '../services/assessment.service.js';

const router = Router();

router.post('/start', requireAuth, async (req, res) => {
  const { profileId, skill, difficulty } = req.body;
  const trimmedSkill = typeof skill === 'string' ? skill.trim() : '';
  if (!profileId || !trimmedSkill) {
    return res.status(400).json({ error: 'profileId and skill are required' });
  }
  if (trimmedSkill.length > 60) {
    return res.status(400).json({ error: 'skill name is too long' });
  }
  try {
    const profile = await Profile.findById(profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    if (String(profile.userId) !== String(req.auth.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const rawLevel =
      difficulty ||
      profile.currentSkills?.find((s) => s.name.toLowerCase() === trimmedSkill.toLowerCase())?.level;
    // Fixes the bug that broke this feature: 'none' (a valid skill level)
    // is not a valid assessment difficulty, so it must be normalized here
    // before it ever reaches Assessment.create().
    const level = normalizeDifficulty(rawLevel);

    const generated = await generateSkillAssessment(trimmedSkill, level);
    const assessment = await Assessment.create({
      profileId,
      skill: trimmedSkill,
      difficulty: level,
      questions: generated.questions,
    });

    const safe = assessment.toObject();
    safe.questions = safe.questions.map(({ correctIndex, ...q }) => q);
    res.status(201).json(safe);
  } catch (err) {
    res.status(422).json({ error: err.message });
  }
});

router.post('/:id/submit', requireAuth, async (req, res) => {
  const { answers } = req.body;
  if (!Array.isArray(answers) || answers.length > 20) {
    return res.status(400).json({ error: 'answers array is required and must contain at most 20 answers' });
  }
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    const assessmentProfile = await Profile.findById(assessment.profileId).select('userId');
    if (!assessmentProfile || String(assessmentProfile.userId) !== String(req.auth.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (assessment.completedAt) {
      return res.status(409).json({ error: 'Assessment already submitted' });
    }
    if (answers.length !== assessment.questions.length) {
      return res.status(400).json({
        error: `Expected ${assessment.questions.length} answers, received ${answers.length}`,
      });
    }

    const { correct, score } = scoreAssessment(assessment.questions, answers);
    assessment.score = score;
    assessment.correctAnswers = correct;
    assessment.completedAt = new Date();
    await assessment.save();

    const profile = await Profile.findById(assessment.profileId);
    const state = applyAssessment(profile, assessment.skill, score);
    await profile.save();

    res.json({
      score,
      correctAnswers: correct,
      totalQuestions: assessment.questions.length,
      skill: assessment.skill,
      knowledgeState: knowledgeSummary(profile),
      estimatedLevel: profile.currentSkills.find(
        (s) => s.name.toLowerCase() === assessment.skill.toLowerCase()
      )?.level,
      confidence: state.confidence,
    });
  } catch (err) {
    res.status(422).json({ error: err.message });
  }
});

export default router;
