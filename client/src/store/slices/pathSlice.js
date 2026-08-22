import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  currentPath: null,
  paths: [],
  milestones: [],
  progress: {},
  recommendations: [],
  generatedPaths: [],
  activePathId: null,
}

const pathSlice = createSlice({
  name: 'path',
  initialState,
  reducers: {
    setCurrentPath: (state, action) => {
      state.currentPath = action.payload
      if (action.payload) {
        state.activePathId = action.payload.id
      }
    },
    addPath: (state, action) => {
      state.paths.push(action.payload)
      state.generatedPaths.push(action.payload)
    },
    updateProgress: (state, action) => {
      const { nodeId, progress } = action.payload
      state.progress[nodeId] = progress
    },
    completeMilestone: (state, action) => {
      const milestone = state.milestones.find(m => m.id === action.payload)
      if (milestone) {
        milestone.completed = true
        milestone.completedAt = new Date().toISOString()
      }
    },
    setRecommendations: (state, action) => {
      state.recommendations = action.payload
    },
    setMilestones: (state, action) => {
      state.milestones = action.payload
    },
    resetPath: () => initialState,
  },
})

export const {
  setCurrentPath,
  addPath,
  updateProgress,
  completeMilestone,
  setRecommendations,
  setMilestones,
  resetPath,
} = pathSlice.actions

export default pathSlice.reducer
