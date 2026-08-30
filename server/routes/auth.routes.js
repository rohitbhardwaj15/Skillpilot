import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { hashToken, rateLimit } from '../middleware/security.middleware.js';
import { sendPasswordResetEmail } from '../services/email.service.js';

const router = Router();
const SALT_ROUNDS = 10;

function signToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set on the server — add it to server/.env');
  }
  return jwt.sign({ userId }, secret, { expiresIn: '2h', issuer: 'skillpilot' });
}

function signRefreshToken(userId) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET or JWT_SECRET is not set');
  return jwt.sign({ userId, type: 'refresh' }, secret, { expiresIn: '30d', issuer: 'skillpilot' });
}

async function issueTokens(user) {
  const accessToken = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  return { accessToken, refreshToken };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/auth/register
// Body: { name, email, password }
router.post('/register', rateLimit({ windowMs: 15 * 60_000, max: 10 }), async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are all required.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });

    const { accessToken, refreshToken } = await issueTokens(user);
    res.status(201).json({
      token: accessToken,
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, profileId: user.profileId || null },
    });
  } catch (err) {
    console.error('register failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
// Body: { email, password }
router.post('/login', rateLimit({ windowMs: 15 * 60_000, max: 10 }), async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    // Deliberately vague error — don't reveal whether the email exists (basic security hygiene)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const { accessToken, refreshToken } = await issueTokens(user);
    res.json({
      token: accessToken,
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, profileId: user.profileId || null },
    });
  } catch (err) {
    console.error('login failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// POST /api/auth/refresh — rotates the refresh token and issues a new 2h access token
router.post('/refresh', rateLimit({ windowMs: 15 * 60_000, max: 20 }), async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required.' });
  try {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const payload = jwt.verify(refreshToken, secret, { issuer: 'skillpilot' });
    if (payload.type !== 'refresh') throw new Error('Invalid token type');
    const user = await User.findById(payload.userId);
    if (!user || !user.refreshTokenHash || user.refreshTokenHash !== hashToken(refreshToken)) {
      return res.status(401).json({ error: 'Refresh token is invalid or revoked.' });
    }
    const tokens = await issueTokens(user);
    res.json({ ...tokens, token: tokens.accessToken, user: { id: user._id, name: user.name, email: user.email, profileId: user.profileId || null } });
  } catch (err) { res.status(401).json({ error: 'Refresh token is invalid or expired.' }); }
});

router.post('/logout', requireAuth, async (req, res) => {
  await User.findByIdAndUpdate(req.auth.userId, { refreshTokenHash: null });
  res.json({ ok: true });
});

// POST /api/auth/forgot-password
// Body: { email }
// Always responds the same way whether or not the account exists, so this
// endpoint can't be used to enumerate registered emails.
router.post('/forgot-password', rateLimit({ windowMs: 15 * 60_000, max: 5 }), async (req, res) => {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const genericResponse = {
    ok: true,
    message: 'If an account exists for that email, a password reset link has been sent.',
  };

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordTokenHash = hashToken(rawToken);
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60_000); // 1 hour
      await user.save();

      const clientUrl = (process.env.CLIENT_URLS || 'http://localhost:5173').split(',')[0].trim();
      const resetUrl = `${clientUrl}/reset-password/${rawToken}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    res.json(genericResponse);
  } catch (err) {
    console.error('forgot-password failed:', err.message);
    // Still respond generically — don't leak whether something went wrong
    // for this specific email vs. it simply not existing.
    res.json(genericResponse);
  }
});

// POST /api/auth/reset-password
// Body: { token, password }
router.post('/reset-password', rateLimit({ windowMs: 15 * 60_000, max: 10 }), async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'token and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const tokenHash = hashToken(token);
    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    }

    user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;
    user.refreshTokenHash = null; // log out any existing sessions on this account
    await user.save();

    res.json({ ok: true, message: 'Your password has been updated. You can now log in.' });
  } catch (err) {
    console.error('reset-password failed:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// GET /api/auth/me — returns the current logged-in user, given a valid token
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
