import jwt from 'jsonwebtoken';

/**
 * Protects routes that require a logged-in user.
 * Expects: Authorization: Bearer <token>
 * On success, attaches { userId } to req.auth.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not set on the server');
    }
    const payload = jwt.verify(token, secret);
    req.auth = { userId: payload.userId };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}
