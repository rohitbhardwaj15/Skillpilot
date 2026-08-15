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

  createProfile: (profileData) =>
    request('/profile', { method: 'POST', body: JSON.stringify(profileData) }),

  getProfile: (id) => request(`/profile/${id}`),

  getCourses: (skill) => request(skill ? `/courses?skill=${encodeURIComponent(skill)}` : '/courses'),
};
