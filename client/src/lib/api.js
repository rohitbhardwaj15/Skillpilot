const API_BASE =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

async function request(
  path,
  options = {},
  retried = false
) {
  const token =
    localStorage.getItem('skillpilot_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers
    }
  );

  const data =
    await res.json().catch(() => ({}));

  if (!res.ok) {
    // Refresh access token if expired
    if (
      res.status === 401 &&
      !retried &&
      path !== '/auth/refresh' &&
      localStorage.getItem(
        'skillpilot_refresh_token'
      )
    ) {
      try {
        const refreshRes =
          await fetch(
            `${API_BASE}/auth/refresh`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json'
              },
              body: JSON.stringify({
                refreshToken:
                  localStorage.getItem(
                    'skillpilot_refresh_token'
                  )
              })
            }
          );

        const refreshed =
          await refreshRes
            .json();

        if (
          refreshRes.ok &&
          refreshed.accessToken
        ) {
          localStorage.setItem(
            'skillpilot_token',
            refreshed.accessToken
          );

          if (
            refreshed.refreshToken
          ) {
            localStorage.setItem(
              'skillpilot_refresh_token',
              refreshed.refreshToken
            );
          }

          return request(
            path,
            options,
            true
          );
        }
      } catch (error) {
        console.error(
          'Token refresh failed:',
          error
        );
      }
    }

    // Clear authentication if unauthorized
    if (res.status === 401) {
      localStorage.removeItem(
        'skillpilot_token'
      );

      localStorage.removeItem(
        'skillpilot_refresh_token'
      );

      localStorage.removeItem(
        'skillpilot_user'
      );
    }

    throw new Error(
      data.error ||
      data.message ||
      `Request failed: ${res.status}`
    );
  }

  return data;
}

export const api = {

  // ==========================================
  // AUTH
  // ==========================================

  register: (
    name,
    email,
    password
  ) =>
    request(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password
        })
      }
    ),

  login: (
    email,
    password
  ) =>
    request(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          password
        })
      }
    ),

  me: () =>
    request('/auth/me'),

  refresh: (
    refreshToken
  ) =>
    request(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({
          refreshToken
        })
      }
    ),

  logout: () =>
    request(
      '/auth/logout',
      {
        method: 'POST'
      }
    ),


  // ==========================================
  // AI
  // ==========================================

  analyzeGoal: (
    goalText
  ) =>
    request(
      '/ai/analyze-goal',
      {
        method: 'POST',
        body: JSON.stringify({
          goalText
        })
      }
    ),

  explain: ({
    courseTitle,
    scoreBreakdown,
    learnerGoal
  }) =>
    request(
      '/ai/explain',
      {
        method: 'POST',
        body: JSON.stringify({
          courseTitle,
          scoreBreakdown,
          learnerGoal
        })
      }
    ),

  chat: (
    message,
    context
  ) =>
    request(
      '/ai/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          context
        })
      }
    ),


  // ==========================================
  // PROFILE
  // ==========================================

  createProfile: (
    profileData
  ) =>
    request(
      '/profile',
      {
        method: 'POST',
        body: JSON.stringify(
          profileData
        )
      }
    ),

  getMyProfile: () =>
    request('/profile/me'),

  getProfile: (
    id
  ) =>
    request(
      `/profile/${id}`
    ),

  updateProfile: (
    id,
    data
  ) =>
    request(
      `/profile/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      }
    ),


  // ==========================================
  // ASSESSMENT
  // ==========================================

  startAssessment: (
    profileId,
    skill,
    difficulty
  ) =>
    request(
      '/assessment/start',
      {
        method: 'POST',
        body: JSON.stringify({
          profileId,
          skill,
          difficulty
        })
      }
    ),

  submitAssessment: (
    assessmentId,
    answers
  ) =>
    request(
      `/assessment/${assessmentId}/submit`,
      {
        method: 'POST',
        body: JSON.stringify({ answers })
      }
    ),


  // ==========================================
  // NOTES
  // ==========================================

  saveNote: (
    profileId,
    nodeId,
    content,
    nodeTitle
  ) =>
    request(
      `/profile/${profileId}/notes/${nodeId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          content,
          nodeTitle
        })
      }
    ),

  getNotes: (
    profileId
  ) =>
    request(
      `/profile/${profileId}/notes`
    ),


  // ==========================================
  // STREAK
  // ==========================================

  updateStreak: (
    profileId
  ) =>
    request(
      `/profile/${profileId}/streak`,
      {
        method: 'PUT',
        body: JSON.stringify({})
      }
    ),


  // ==========================================
  // COURSES
  // ==========================================

  getCourses: (
    skill
  ) =>
    request(
      skill
        ? `/courses?skill=${encodeURIComponent(
            skill
          )}`
        : '/courses'
    ),

  getRecommendedCourses: (
    limit = 24
  ) =>
    request(
      `/courses/recommended?limit=${limit}`
    ),


  // ==========================================
  // LEARNING PATH
  // ==========================================

  generatePath: (
    profileId
  ) =>
    request(
      '/path/generate',
      {
        method: 'POST',
        body: JSON.stringify({
          profileId
        })
      }
    ),

  getPath: (
    id
  ) =>
    request(
      `/path/${id}`
    ),

  getPathInsights: (
    id
  ) =>
    request(
      `/path/${id}/insights`
    ),

  adaptPath: (
    id
  ) =>
    request(
      `/path/${id}/adapt`,
      {
        method: 'POST'
      }
    ),


 
  


  // ==========================================
  // COURSE COMPLETION
  // ==========================================

  markCourseDone: (
    pathId,
    courseId,
    timeSpentMinutes = 0
  ) =>
    request(
      `/path/${pathId}/progress`,
      {
        method: 'PUT',
        body: JSON.stringify({
          courseId,
          status: 'done',
          timeSpentMinutes
        })
      }
    ),


  // ==========================================
  // FEEDBACK
  // ==========================================

  giveFeedback: (
    pathId,
    courseId,
    rating,
    timeSpentMinutes = 0
  ) =>
    request(
      `/path/${pathId}/feedback`,
      {
        method: 'POST',
        body: JSON.stringify({
          courseId,
          rating,
          timeSpentMinutes
        })
      }
    )
};
