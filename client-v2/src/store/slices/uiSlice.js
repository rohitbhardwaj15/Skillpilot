import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  sidebarOpen: false,
  theme: 'dark',
  notifications: [],
  modal: null,
  pageTransition: 'fade',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebar: (state, action) => {
      state.sidebarOpen = action.payload
    },
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now().toString(),
        ...action.payload,
      })
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload)
    },
    setModal: (state, action) => {
      state.modal = action.payload
    },
    setPageTransition: (state, action) => {
      state.pageTransition = action.payload
    },
  },
})

export const {
  toggleSidebar,
  setSidebar,
  addNotification,
  removeNotification,
  setModal,
  setPageTransition,
} = uiSlice.actions

export default uiSlice.reducer
