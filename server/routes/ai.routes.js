import { Router } from 'express';
import { extractGoalProfile, explainRecommendation, chatWithAssistant } from '../services/llm.service.js';

const router = Router();

// POST /api/ai/analyze-goal
// Body: { goalText: string }
// Returns structured profile data extracted from free text.
router.post('/analyze-goal', async (req, res) => {
  const { goalText } = req.body;
  if (!goalText || typeof goalText !== 'string' || goalText.trim().length < 2) {
    return res.status(400).json({ error: 'goalText is required and must be a meaningful sentence.' });
  }

  try {
    const profileData = await extractGoalProfile(goalText);
    res.json(profileData);
  } catch (err) {
    console.error('analyze-goal failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/explain
// Body: { courseTitle, scoreBreakdown, learnerGoal }
// TODO (Day 9-10): wired up once the recommendation engine (Day 6-8) produces
// real score breakdowns to explain.
router.post('/explain', async (req, res) => {
  const { courseTitle, scoreBreakdown, learnerGoal } = req.body;
  if (!courseTitle || !scoreBreakdown) {
    return res.status(400).json({ error: 'courseTitle and scoreBreakdown are required.' });
  }

  try {
    const explanation = await explainRecommendation({ courseTitle, scoreBreakdown, learnerGoal });
    res.json({ explanation });
  } catch (err) {
    console.error('explain failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/chat
// Body: { message: string, context: object }
// General-purpose Q&A for the AI Assistant page, grounded in the learner's
// real profile/path context passed from the frontend.
router.post('/chat', async (req, res) => {
  const { message, context } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required.' });
  }

  try {
    const reply = await chatWithAssistant(message, context || {});
    res.json({ reply });
  } catch (err) {
    console.error('chat failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
