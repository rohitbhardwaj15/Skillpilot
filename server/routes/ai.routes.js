import { Router } from 'express';

const router = Router();

// POST /api/ai/analyze-goal
// TODO (Day 3-5): call LLM to extract { targetRole, timelineMonths, currentSkills }
// from the learner's free-text goal. Keep this the ONLY place the LLM is used
// for understanding — the recommendation logic itself must NOT be LLM-based.
router.post('/analyze-goal', async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet — Day 3-5 task' });
});

// POST /api/ai/explain
// TODO (Day 9-10): call LLM to generate a "why this recommendation" explanation,
// grounded in the actual score breakdown from the recommendation engine.
router.post('/explain', async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet — Day 9-10 task' });
});

export default router;
