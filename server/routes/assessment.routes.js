import { Router } from 'express';
import Profile from '../models/Profile.js';
import Assessment from '../models/Assessment.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { generateSkillAssessment } from '../services/llm.service.js';
import { applyAssessment, knowledgeSummary } from '../services/learner.service.js';

const router = Router();

router.post('/start', requireAuth, async (req, res) => {
  const { profileId, skill, difficulty } = req.body;
  if (!profileId || !skill) return res.status(400).json({ error: 'profileId and skill are required' });
  try {
    const profile = await Profile.findById(profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    if (String(profile.userId) !== String(req.auth.userId)) return res.status(403).json({ error: 'Forbidden' });
    const level = difficulty || profile.currentSkills?.find(s => s.name.toLowerCase() === skill.toLowerCase())?.level || 'beginner';
    const generated = await generateSkillAssessment(skill, level);
    const assessment = await Assessment.create({ profileId, skill, difficulty: level, questions: generated.questions });
    const safe = assessment.toObject();
    safe.questions = safe.questions.map(({ correctIndex, ...q }) => q);
    res.status(201).json(safe);
  } catch (err) { res.status(422).json({ error: err.message }); }
});

router.post('/:id/submit', requireAuth, async (req, res) => {
  const { answers } = req.body;
  if (!Array.isArray(answers) || answers.length > 20) return res.status(400).json({ error: 'answers array is required and must contain at most 20 answers' });
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    const assessmentProfile = await Profile.findById(assessment.profileId).select('userId');
    if (!assessmentProfile || String(assessmentProfile.userId) !== String(req.auth.userId)) return res.status(403).json({ error: 'Forbidden' });
    if (assessment.completedAt) return res.status(409).json({ error: 'Assessment already submitted' });
    const correct = assessment.questions.reduce((n, q, i) => n + (Number(answers[i]) === q.correctIndex ? 1 : 0), 0);
    const score = Math.round((correct / assessment.questions.length) * 100);
    assessment.score = score; assessment.correctAnswers = correct; assessment.completedAt = new Date(); await assessment.save();
    const profile = await Profile.findById(assessment.profileId);
    const state = applyAssessment(profile, assessment.skill, score); await profile.save();
    res.json({ score, correctAnswers: correct, totalQuestions: assessment.questions.length, skill: assessment.skill, knowledgeState: knowledgeSummary(profile), estimatedLevel: profile.currentSkills.find(s => s.name.toLowerCase() === assessment.skill.toLowerCase())?.level, confidence: state.confidence });
  } catch (err) { res.status(422).json({ error: err.message }); }
});

export default router;
