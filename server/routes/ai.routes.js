import { Router } from 'express';
import { extractGoalProfile, explainRecommendation, chatWithAssistant } from '../services/llm.service.js';

const router = Router();

// POST /api/ai/analyze-goal
// Body: { goalText: string }
// Returns structured profile data extracted from free text.
router.post('/analyze-goal', async (req, res) => {
  const { goalText } = req.body;
  if (!goalText || typeof goalText !== 'string' || goalText.trim().length < 1) {
    return res.status(400).json({ error: 'goalText is required.' });
  }

  // Expand short exam/role keywords into full sentences for better LLM extraction
  const shortGoalMap = {
    'ias':    'I want to crack the IAS exam and become an IAS officer',
    'upsc':   'I want to crack the UPSC Civil Services Examination',
    'ips':    'I want to crack the IPS exam and become a police officer',
    'ifs':    'I want to crack the IFS exam and join the foreign service',
    'nda':    'I want to crack the NDA exam and join the Indian defence forces',
    'cds':    'I want to crack the CDS exam and join the Indian armed forces',
    'ssc':    'I want to crack SSC CGL exam and get a government job',
    'ssc cgl':'I want to crack SSC CGL exam',
    'ssc chsl':'I want to crack SSC CHSL exam',
    'bank':   'I want to crack banking exams like IBPS PO or SBI PO',
    'ibps':   'I want to crack IBPS PO banking exam',
    'sbi po': 'I want to crack SBI PO banking exam',
    'rbi':    'I want to crack RBI Grade B exam',
    'ca':     'I want to become a Chartered Accountant and clear CA exams',
    'ca foundation': 'I want to clear CA Foundation exam',
    'ca inter':      'I want to clear CA Intermediate exam',
    'ca final':      'I want to clear CA Final exam',
    'cat':    'I want to crack CAT exam and get into IIM for MBA',
    'mba':    'I want to get an MBA degree from a top business school',
    'iit':    'I want to crack IIT JEE and get into IIT',
    'jee':    'I want to crack JEE Main and JEE Advanced exam',
    'neet':   'I want to crack NEET exam and become a doctor',
    'gate':   'I want to crack GATE exam for postgraduate engineering',
    'ctet':   'I want to crack CTET exam and become a teacher',
    'tet':    'I want to crack the Teacher Eligibility Test',
    'clat':   'I want to crack CLAT and get into a top law school',
    'mpsc':   'I want to crack MPSC exam and get a Maharashtra state government job',
    'tnpsc':  'I want to crack TNPSC exam and get a Tamil Nadu government job',
    'kpsc':   'I want to crack KPSC exam and get a Karnataka government job',
    'uppsc':  'I want to crack UPPSC exam and get a UP state government job',
    'bpsc':   'I want to crack BPSC exam and get a Bihar government job',
    'rrb':    'I want to crack RRB NTPC exam and get a railway job',
    'railway':'I want to crack railway recruitment exams',
    'agniveer':'I want to join the Indian Army through Agniveer scheme',
    'gmat':   'I want to crack GMAT and apply to international MBA programs',
    'gre':    'I want to crack GRE and apply to graduate programs abroad',
    'ielts':  'I want to clear IELTS for studying or working abroad',
    'toefl':  'I want to clear TOEFL for studying abroad',
    'cfa':    'I want to become a CFA charterholder in finance',
    'frm':    'I want to clear FRM exam and work in financial risk management',
  }

  const normalised = goalText.trim().toLowerCase()
  const expanded   = shortGoalMap[normalised]
  if (expanded) req.body.goalText = expanded

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
