import { Router } from 'express';
import Profile from '../models/Profile.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/profile — create a learner profile, linked to the logged-in user
router.post('/', requireAuth, async (req, res) => {
  try {
    const profile = await Profile.create({ ...req.body, userId: req.auth.userId });
    await User.findByIdAndUpdate(req.auth.userId, { profileId: profile._id });
    res.status(201).json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/profile/me — the logged-in user's own profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user?.profileId) return res.status(404).json({ error: 'No profile yet for this account.' });
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

// PUT /api/profile/:id — update profile (e.g. after feedback or course completion)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const profile = await Profile.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
