const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('skillpilot_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('skillpilot_token');
      localStorage.removeItem('skillpilot_user');
    }
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  register: (name, email, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),

  // AI
  analyzeGoal: (goalText) =>
    request('/ai/analyze-goal', { method: 'POST', body: JSON.stringify({ goalText }) }),
  explain: ({ courseTitle, scoreBreakdown, learnerGoal }) =>
    request('/ai/explain', { method: 'POST', body: JSON.stringify({ courseTitle, scoreBreakdown, learnerGoal }) }),
  chat: (message, context) =>
    request('/ai/chat', { method: 'POST', body: JSON.stringify({ message, context }) }),

  // Profile
  createProfile: (profileData) =>
    request('/profile', { method: 'POST', body: JSON.stringify(profileData) }),
  getMyProfile: () => request('/profile/me'),
  getProfile:   (id) => request(`/profile/${id}`),
  updateProfile: (id, data) =>
    request(`/profile/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Notes — saved to DB
  saveNote: (profileId, nodeId, content, nodeTitle) =>
    request(`/profile/${profileId}/notes/${nodeId}`, {
      method: 'PUT',
      body: JSON.stringify({ content, nodeTitle }),
    }),
  getNotes: (profileId) => request(`/profile/${profileId}/notes`),

  // Streak
  updateStreak: (profileId) =>
    request(`/profile/${profileId}/streak`, { method: 'PUT', body: JSON.stringify({}) }),

  // Courses
  getCourses: (skill) =>
    request(skill ? `/courses?skill=${encodeURIComponent(skill)}` : '/courses'),

  // Path
  generatePath: (profileId) =>
    request('/path/generate', { method: 'POST', body: JSON.stringify({ profileId }) }),
  getPath: (id) => request(`/path/${id}`),

  // Course completion — saves to DB
  markCourseDone: (pathId, courseId) =>
    request(`/path/${pathId}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ courseId, status: 'done' }),
    }),

  // Feedback — triggers adaptive re-ranking
  giveFeedback: (pathId, courseId, rating) =>
    request(`/path/${pathId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ courseId, rating }),
    }),
};
