import { useState, useRef, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { Send, Bot, User, Lightbulb, RotateCcw } from 'lucide-react'
import { addMessage, setTyping, clearChat } from '../store/slices/chatSlice'
import { api } from '../lib/api'
import GlassCard from '../components/ui/GlassCard'

const SUGGESTIONS = [
  'What should I focus on next?',
  'Why was my current course recommended?',
  'What are my biggest skill gaps?',
  'How long until I reach my goal?',
]

export default function AIAssistantPage() {
  const dispatch = useDispatch()
  const { messages, isTyping } = useSelector((state) => state.chat)
  const { user } = useSelector((state) => state.auth)
  const [input, setInput] = useState('')
  const [context, setContext] = useState(null)
  const chatEndRef = useRef(null)

  // Build real context (profile + path) once, so every answer is grounded
  // in the learner's actual data instead of generic advice.
  const loadContext = useCallback(async () => {
    try {
      const profile = await api.getMyProfile()
      const pathId = localStorage.getItem('skillpilot_path_id')
      let path = null
      if (pathId) {
        try {
          path = await api.getPath(pathId)
        } catch {
          path = null
        }
      }
      setContext({
        learnerName: profile.name,
        goal: profile.goal,
        targetRole: profile.targetRole,
        timelineMonths: profile.timelineMonths,
        currentSkills: profile.currentSkills,
        skillGaps: path?.skillGaps || [],
        estimatedDurationWeeks: path?.estimatedDurationWeeks,
        currentPhaseTitle: path?.phases?.find((p) => p.courses.some((c) => c.status === 'current'))?.title,
        currentCourse: path?.phases
          ?.flatMap((p) => p.courses)
          ?.find((c) => c.status === 'current')?.title,
      })
    } catch {
      setContext({})
    }
  }, [])

  useEffect(() => {
    loadContext()
  }, [loadContext])

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function sendMessage(text) {
    if (!text.trim()) return
    dispatch(addMessage({ role: 'user', content: text }))
    setInput('')
    dispatch(setTyping(true))

    try {
      const { reply } = await api.chat(text, context || {})
      dispatch(addMessage({ role: 'assistant', content: reply }))
    } catch (err) {
      dispatch(addMessage({
        role: 'assistant',
        content: `Sorry, I couldn't process that: ${err.message}`,
      }))
    } finally {
      dispatch(setTyping(false))
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12 section-padding">
      <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <h1 className="text-3xl font-bold font-display text-white mb-2">
            AI <span className="gradient-text">Learning Assistant</span>
          </h1>
          <p className="text-gray-400">Ask anything about your learning journey — grounded in your actual profile and progress.</p>
        </motion.div>

        <GlassCard className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                {user?.name ? `Hi ${user.name}! ` : ''}Ask me anything about your goal, your roadmap, or why something was recommended.
              </div>
            )}
            {messages.map((msg, i) => (
              <motion.div key={msg.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'assistant' ? 'bg-accent-orange/20' : 'bg-accent-purple/20'}`}>
                  {msg.role === 'assistant' ? <Bot size={18} className="text-accent-orange" /> : <User size={18} className="text-accent-purple" />}
                </div>
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'assistant' ? 'bg-white/5 text-gray-200 rounded-tl-sm' : 'bg-accent-purple/20 text-white rounded-tr-sm'}`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-accent-orange/20 flex items-center justify-center">
                  <Bot size={18} className="text-accent-orange" />
                </div>
                <div className="bg-white/5 p-4 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-2 h-2 bg-accent-orange rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-accent-orange rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-accent-orange rounded-full" />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="px-6 py-3 border-t border-white/5">
            <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
              <Lightbulb size={12} />
              <span>Suggested questions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)}
                  className="px-3 py-1.5 text-xs bg-white/5 text-gray-400 rounded-full border border-white/10 hover:border-accent-orange/30 hover:text-accent-orange transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-white/10 flex gap-3">
            <button onClick={() => dispatch(clearChat())}
              className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all" title="Clear chat">
              <RotateCcw size={18} />
            </button>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
              placeholder="Ask me anything about your learning path..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent-orange/50 transition-colors" />
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || isTyping}
              className="p-3 rounded-xl bg-accent-orange text-dark-900 hover:bg-accent-amber transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Send size={18} />
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
