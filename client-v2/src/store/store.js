import { configureStore } from '@reduxjs/toolkit'
import userReducer from './slices/userSlice'
import pathReducer from './slices/pathSlice'
import chatReducer from './slices/chatSlice'
import uiReducer from './slices/uiSlice'
import authReducer from './slices/authSlice'

export const store = configureStore({
  reducer: {
    user: userReducer,
    path: pathReducer,
    chat: chatReducer,
    ui: uiReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})
