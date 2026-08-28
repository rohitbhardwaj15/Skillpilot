import { Router } from 'express';
import Profile from '../models/Profile.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/profile
router.post('/', requireAuth, async (req, res) => {
  try {
    const profile = await Profile.create({ ...req.body, userId: req.auth.userId });
    await User.findByIdAndUpdate(req.auth.userId, { profileId: profile._id });
    res.status(201).json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/profile/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user?.profileId) return res.status(404).json({ error: 'No profile yet.' });
    const profile = await Profile.findById(user.profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/profile/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/profile/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const profile = await Profile.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Notes — save to DB ────────────────────────────────────────────────────

// PUT /api/profile/:id/notes/:nodeId
// Body: { content: string, nodeTitle: string }
router.put('/:id/notes/:nodeId', requireAuth, async (req, res) => {
  try {
    const { content, nodeTitle } = req.body;
    const profile = await Profile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const existing = profile.notes.find((n) => n.nodeId === req.params.nodeId);
    if (existing) {
      existing.content   = content;
      existing.updatedAt = new Date();
      if (nodeTitle) existing.nodeTitle = nodeTitle;
    } else {
      profile.notes.push({ nodeId: req.params.nodeId, nodeTitle, content });
    }
    profile.markModified('notes');
    await profile.save();
    res.json({ ok: true, note: profile.notes.find((n) => n.nodeId === req.params.nodeId) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/profile/:id/notes
router.get('/:id/notes', requireAuth, async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id).select('notes');
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile.notes || []);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Streak update ─────────────────────────────────────────────────────────
// PUT /api/profile/:id/streak
router.put('/:id/streak', requireAuth, async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const now   = new Date();
    const last  = profile.lastActiveDate ? new Date(profile.lastActiveDate) : null;
    const diffD = last ? Math.floor((now - last) / (1000 * 60 * 60 * 24)) : null;

    if (diffD === null || diffD > 1) {
      profile.streakDays = 1;
    } else if (diffD === 1) {
      profile.streakDays = (profile.streakDays || 0) + 1;
    }
    // diffD === 0 → same day, streak stays

    profile.lastActiveDate = now;
    await profile.save();
    res.json({ streakDays: profile.streakDays });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
