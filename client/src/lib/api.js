const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  analyzeGoal: (goalText) =>
    request('/ai/analyze-goal', { method: 'POST', body: JSON.stringify({ goalText }) }),

  explain: ({ courseTitle, scoreBreakdown, learnerGoal }) =>
    request('/ai/explain', {
      method: 'POST',
      body: JSON.stringify({ courseTitle, scoreBreakdown, learnerGoal }),
    }),

  createProfile: (profileData) =>
    request('/profile', { method: 'POST', body: JSON.stringify(profileData) }),

  getProfile: (id) => request(`/profile/${id}`),

  getCourses: (skill) => request(skill ? `/courses?skill=${encodeURIComponent(skill)}` : '/courses'),

  generatePath: (profileId) =>
    request('/path/generate', { method: 'POST', body: JSON.stringify({ profileId }) }),

  getPath: (id) => request(`/path/${id}`),

  markCourseDone: (pathId, courseId) =>
    request(`/path/${pathId}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ courseId, status: 'done' }),
    }),

  giveFeedback: (pathId, courseId, rating) =>
    request(`/path/${pathId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ courseId, rating }),
    }),

  updateProfile: (id, data) =>
    request(`/profile/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
