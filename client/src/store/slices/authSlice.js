import { createSlice } from '@reduxjs/toolkit'

const storedToken = typeof window !== 'undefined' ? localStorage.getItem('skillpilot_token') : null
const storedRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('skillpilot_refresh_token') : null
const storedUser = typeof window !== 'undefined' ? localStorage.getItem('skillpilot_user') : null

const initialState = {
  token: storedToken || null,
  refreshToken: storedRefreshToken || null,
  user: storedUser ? JSON.parse(storedUser) : null,
  isAuthenticated: !!storedToken,
  loading: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart: (state) => {
      state.loading = true
      state.error = null
    },
    authSuccess: (state, action) => {
      const { token, accessToken, refreshToken, user } = action.payload
      const effectiveToken = accessToken || token
      state.token = effectiveToken
      state.refreshToken = refreshToken || null
      state.user = user
      state.isAuthenticated = true
      state.loading = false
      state.error = null
      localStorage.setItem('skillpilot_token', effectiveToken)
      if (refreshToken) localStorage.setItem('skillpilot_refresh_token', refreshToken)
      localStorage.setItem('skillpilot_user', JSON.stringify(user))
    },
    authFailure: (state, action) => {
      state.loading = false
      state.error = action.payload
    },
    logout: (state) => {
      state.token = null
      state.refreshToken = null
      state.user = null
      state.isAuthenticated = false
      localStorage.removeItem('skillpilot_token')
      localStorage.removeItem('skillpilot_refresh_token')
      localStorage.removeItem('skillpilot_user')
      localStorage.removeItem('skillpilot_profile_id')
      localStorage.removeItem('skillpilot_path_id')
    },
    updateUserProfileId: (state, action) => {
      if (state.user) {
        state.user.profileId = action.payload
        localStorage.setItem('skillpilot_user', JSON.stringify(state.user))
      }
    },
  },
})

export const { authStart, authSuccess, authFailure, logout, updateUserProfileId } = authSlice.actions
export default authSlice.reducer
