import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your AI Learning Assistant. I can help you discover the perfect learning path, explain recommendations, and answer any questions about your journey. What would you like to learn today?",
      timestamp: new Date().toISOString(),
    },
  ],
  isTyping: false,
  suggestions: [
    'What path should I take to become a full-stack developer?',
    'Explain why Python is recommended for me',
    'How long will it take to learn machine learning?',
    'What are my skill gaps for data science?',
  ],
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      state.messages.push({
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      })
    },
    setTyping: (state, action) => {
      state.isTyping = action.payload
    },
    setSuggestions: (state, action) => {
      state.suggestions = action.payload
    },
    clearChat: (state) => {
      state.messages = [initialState.messages[0]]
    },
  },
})

export const { addMessage, setTyping, setSuggestions, clearChat } = chatSlice.actions

export default chatSlice.reducer
