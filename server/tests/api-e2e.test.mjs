/**
 * End-to-end API verification.
 * Run against a real API + MongoDB with:
 *   E2E_BASE_URL=https://your-api.example.com npm run test:api
 *
 * Without E2E_BASE_URL, this file performs a local route/security contract check
 * so CI still catches accidental removal of critical protections.
 */
import fs from 'fs';
import assert from 'assert';
import crypto from 'crypto';

const root = new URL('../', import.meta.url);
const files = {
  app: fs.readFileSync(new URL('app.js', root), 'utf8'),
  auth: fs.readFileSync(new URL('routes/auth.routes.js', root), 'utf8'),
  ai: fs.readFileSync(new URL('routes/ai.routes.js', root), 'utf8'),
  path: fs.readFileSync(new URL('routes/path.routes.js', root), 'utf8'),
  profile: fs.readFileSync(new URL('routes/profile.routes.js', root), 'utf8'),
};

for (const required of [
  [files.app, "express.json({ limit: '100kb' })"],
  [files.app, 'securityHeaders'],
  [files.auth, "router.post('/refresh'"],
  [files.auth, "router.post('/logout'"],
  [files.auth, "expiresIn: '2h'"],
  [files.ai, "requireAuth, rateLimit"],
  [files.path, "router.get('/:id/insights'"],
  [files.profile, "Forbidden"],
]) assert(required[0].includes(required[1]), `Missing API security/feature contract: ${required[1]}`);

const base = process.env.E2E_BASE_URL?.replace(/\/$/, '');
if (!base) {
  console.log('API contract smoke test passed. Set E2E_BASE_URL to run full DB-backed E2E tests.');
  process.exit(0);
}

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

const health = await request('/api/health');
assert.equal(health.response.status, 200, 'Health endpoint failed');
assert.equal(health.data.status, 'ok');

const email = `e2e-${Date.now()}-${crypto.randomBytes(3).toString('hex')}@example.com`;
const password = 'SkillPilot-E2E-2026!';
const registered = await request('/api/auth/register', {
  method: 'POST', body: JSON.stringify({ name: 'E2E Learner', email, password }),
});
assert.equal(registered.response.status, 201, `Register failed: ${JSON.stringify(registered.data)}`);
let token = registered.data.accessToken;
let refreshToken = registered.data.refreshToken;
assert(token && refreshToken, 'Register did not return access + refresh tokens');

const refreshed = await request('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
assert.equal(refreshed.response.status, 200, `Refresh failed: ${JSON.stringify(refreshed.data)}`);
token = refreshed.data.accessToken;
refreshToken = refreshed.data.refreshToken;

const auth = { Authorization: `Bearer ${token}` };
const profile = await request('/api/profile', {
  method: 'POST', headers: auth,
  body: JSON.stringify({
    name: 'E2E Learner', goal: 'Become a full stack developer', targetRole: 'Full Stack Developer',
    timelineMonths: 6, experienceLevel: 'beginner', hoursPerWeek: 8,
    currentSkills: [{ name: 'HTML', level: 'beginner' }], interests: ['web development'],
    learningStyle: ['projects'], preferredLanguage: 'English', courseTypeFilter: 'both',
  }),
});
assert.equal(profile.response.status, 201, `Profile create failed: ${JSON.stringify(profile.data)}`);
const profileId = profile.data._id;

const persisted = await request('/api/profile/me', { headers: auth });
assert.equal(persisted.response.status, 200);
assert.equal(String(persisted.data._id), String(profileId), 'Profile persistence failed');

const path = await request('/api/path/generate', {
  method: 'POST', headers: auth, body: JSON.stringify({ profileId }),
});
assert.equal(path.response.status, 201, `Path generation failed: ${JSON.stringify(path.data)}`);
const pathId = path.data._id;

const insights = await request(`/api/path/${pathId}/insights`, { headers: auth });
assert.equal(insights.response.status, 200, `Insights failed: ${JSON.stringify(insights.data)}`);
assert(typeof insights.data.readinessScore === 'number');
assert(insights.data.nextBestAction !== undefined);

const fetchedPath = await request(`/api/path/${pathId}`, { headers: auth });
assert.equal(fetchedPath.response.status, 200, 'Path persistence failed');

const firstCourse = fetchedPath.data.phases.flatMap(p => p.courses).find(c => c.status === 'current' || c.status === 'upcoming');
if (firstCourse) {
  const progress = await request(`/api/path/${pathId}/progress`, {
    method: 'PUT', headers: auth,
    body: JSON.stringify({ courseId: firstCourse.courseId, status: 'done', timeSpentMinutes: 45 }),
  });
  assert.equal(progress.response.status, 200, `Progress failed: ${JSON.stringify(progress.data)}`);
  const feedback = await request(`/api/path/${pathId}/feedback`, {
    method: 'POST', headers: auth,
    body: JSON.stringify({ courseId: firstCourse.courseId, rating: 'good', timeSpentMinutes: 45 }),
  });
  assert([200, 422].includes(feedback.response.status), `Feedback endpoint failed unexpectedly: ${JSON.stringify(feedback.data)}`);
}

const logout = await request('/api/auth/logout', { method: 'POST', headers: auth });
assert.equal(logout.response.status, 200);

const revoked = await request('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
assert.equal(revoked.response.status, 401, 'Logout did not revoke refresh token');

console.log('Full API E2E suite passed.');
