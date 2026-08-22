import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  profile: {
    name: '',
    email: '',
    avatar: '',
    experience: 'beginner',
    interests: [],
    skills: [],
    goals: [],
    learningStyle: 'visual',
    timePerWeek: 10,
    completedCourses: [],
    currentStreak: 0,
    totalHours: 0,
    joinedDate: new Date().toISOString(),
  },
  isOnboarded: false,
  isLoading: false,
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile: (state, action) => {
      state.profile = { ...state.profile, ...action.payload }
    },
    addInterest: (state, action) => {
      if (!state.profile.interests.includes(action.payload)) {
        state.profile.interests.push(action.payload)
      }
    },
    removeInterest: (state, action) => {
      state.profile.interests = state.profile.interests.filter(i => i !== action.payload)
    },
    addSkill: (state, action) => {
      if (!state.profile.skills.includes(action.payload)) {
        state.profile.skills.push(action.payload)
      }
    },
    addGoal: (state, action) => {
      state.profile.goals.push(action.payload)
    },
    completeCourse: (state, action) => {
      state.profile.completedCourses.push({
        ...action.payload,
        completedAt: new Date().toISOString(),
      })
      state.profile.totalHours += action.payload.duration || 0
    },
    setOnboarded: (state, action) => {
      state.isOnboarded = action.payload
    },
    updateStreak: (state, action) => {
      state.profile.currentStreak = action.payload
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload
    },
    resetProfile: () => initialState,
  },
})

export const {
  setProfile,
  addInterest,
  removeInterest,
  addSkill,
  addGoal,
  completeCourse,
  setOnboarded,
  updateStreak,
  setLoading,
  resetProfile,
} = userSlice.actions

export default userSlice.reducer
