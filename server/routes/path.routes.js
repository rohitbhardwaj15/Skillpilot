import { Router } from 'express';

const router = Router();

// POST /api/path/generate
// TODO (Day 6-8): the core recommendation engine.
//   1. Skill-gap analysis: compare profile.currentSkills vs required skills for targetRole
//   2. Score every candidate course using the weighted formula:
//        score = 0.30*skillGapMatch + 0.25*goalRelevance + 0.20*prereqReadiness
//              + 0.15*userInterest   + 0.10*learningStyleMatch
//   3. Order the top-ranked courses via topological sort on the prerequisite graph
//   4. Group into milestones/phases, return as a roadmap
router.post('/generate', async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet — Day 6-8 task' });
});

export default router;
