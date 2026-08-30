import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, User, Briefcase, Clock, BookOpen, ArrowRight, Sparkles, AlertCircle } from 'lucide-react'
import { setProfile, setOnboarded, addGoal, addInterest, addSkill } from '../store/slices/userSlice'
import { updateUserProfileId } from '../store/slices/authSlice'
import { setCurrentPath } from '../store/slices/pathSlice'
import { api } from '../lib/api'
import { transformPathResponse } from '../lib/transformPath'
import GlassCard from '../components/ui/GlassCard'
import SkillBadge from '../components/ui/SkillBadge'
import AnimatedButton from '../components/ui/AnimatedButton'

const INTERESTS = [
  'Web Development', 'Data Science', 'Machine Learning', 'Mobile Development',
  'Cloud Computing', 'DevOps', 'Cybersecurity', 'UI/UX Design',
  'Blockchain', 'Game Development', 'Backend Development', 'Frontend Development'
]

const SKILLS = [
  'JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS',
  'Docker', 'TypeScript', 'Java', 'Go', 'Rust', 'Figma'
]

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', desc: 'Just starting out' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Some experience' },
  { value: 'advanced', label: 'Advanced', desc: 'Experienced professional' },
]

const TIME_OPTIONS = [5, 10, 15, 20, 30, 40]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const chatEndRef = useRef(null)
  const { user } = useSelector((state) => state.auth)

  const [step, setStep] = useState(0)
  const [name, setName] = useState(user?.name || '')
  const [goal, setGoal] = useState('')
  const [selectedInterests, setSelectedInterests] = useState([])
  const [selectedSkills, setSelectedSkills] = useState([])
  const [priorCoursesInput, setPriorCoursesInput] = useState('')
  const [experience, setExperience] = useState('beginner')
  const [timePerWeek, setTimePerWeek] = useState(10)
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: user?.name
        ? `Hi ${user.name}! What is your primary learning goal? For example: "I want to become a full-stack developer."`
        : "Hi there! I'm your AI Learning Guide. What is your name?",
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  // If we already know the user's name (they're logged in), skip straight to the goal question
  const startStep = user?.name ? 1 : 0
  useEffect(() => {
    if (user?.name) setStep(1)
  }, [user])

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const handleSend = () => {
    if (!inputValue.trim()) return
    const userMsg = inputValue.trim()
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setInputValue('')
    setTimeout(() => {
      let response = ''
      if (step === 0) {
        setName(userMsg)
        response = `Nice to meet you, ${userMsg}! What is your primary learning goal? For example: "I want to become a full-stack developer" or "I want to learn data science."`
        setStep(1)
      } else if (step === 1) {
        setGoal(userMsg)
        dispatch(addGoal(userMsg))
        response = "Great goal! Now let's build your profile. Select your areas of interest below."
        setStep(2)
      }
      setChatMessages((prev) => [...prev, { role: 'assistant', content: response }])
    }, 600)
  }

  const toggleInterest = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests((prev) => prev.filter((i) => i !== interest))
    } else {
      setSelectedInterests((prev) => [...prev, interest])
      dispatch(addInterest(interest))
    }
  }

  const toggleSkill = (skill) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills((prev) => prev.filter((s) => s !== skill))
    } else {
      setSelectedSkills((prev) => [...prev, skill])
      dispatch(addSkill(skill))
    }
  }

  async function handleComplete() {
    setError('')
    setIsGenerating(true)

    try {
      const priorCourses = priorCoursesInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)

      // 1. Real AI call: turn the free-text goal into structured data.
      //    Prior courses are included in the text sent to the AI so it can
      //    also pick up skills implied by past learning (e.g. "completed
      //    Python for Everybody" -> Python), not just the stated goal.
      const analysisText =
        priorCourses.length > 0
          ? `${goal}. I have already completed these courses/certifications: ${priorCourses.join(', ')}.`
          : goal
      const extracted = await api.analyzeGoal(analysisText)

      // 2. Merge the AI-extracted skills with the badges the learner picked by hand.
      //    Badge-selected skills default to "beginner" unless the AI already found
      //    a more specific level for that same skill.
      const skillMap = new Map(
        extracted.currentSkills.map((s) => [s.name.toLowerCase(), s])
      )
      selectedSkills.forEach((skillName) => {
        const key = skillName.toLowerCase()
        if (!skillMap.has(key)) {
          skillMap.set(key, { name: skillName, level: 'beginner' })
        }
      })

      // 3. Create the real profile in the database
      const profile = await api.createProfile({
        name,
        goal,
        targetRole: extracted.targetRole,
        timelineMonths: extracted.timelineMonths,
        currentSkills: Array.from(skillMap.values()),
        interests: selectedInterests,
        experienceLevel: experience,
        priorLearningHistory: priorCourses,
        hoursPerWeek: timePerWeek,
        learningStyle: ['projects'],
      })

      dispatch(updateUserProfileId(profile._id))
      dispatch(
        setProfile({
          name,
          goals: [goal],
          interests: selectedInterests,
          skills: selectedSkills,
          experience,
          timePerWeek,
        })
      )
            dispatch(setOnboarded(true))

      // 4. Generate the real roadmap from the recommendation engine
      const path = await api.generatePath(profile._id)
      localStorage.setItem('skillpilot_path_id', path._id)
      dispatch(setCurrentPath(transformPathResponse(path)))

      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Something went wrong building your path. Please try again.')
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12 section-padding">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-4xl lg:text-5xl font-bold font-display text-ink mb-2">
            Let us build your <span className="gradient-text">learning profile</span>
          </h1>
          <p className="text-ink-soft">Tell us about yourself and our AI will craft the perfect path for you.</p>
        </motion.div>

        <GlassCard className="mb-8">
          <div className="h-[300px] overflow-y-auto p-6 space-y-4">
            {chatMessages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'assistant' ? 'bg-accent-orange/20' : 'bg-accent-purple/20'}`}>
                  {msg.role === 'assistant' ? <Sparkles size={16} className="text-accent-orange" /> : <User size={16} className="text-accent-purple" />}
                </div>
                <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                  msg.role === 'assistant' ? 'bg-surface-alt text-ink' : 'bg-accent-purple/20 text-accent-purple'}`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>
          {step < 2 && (
            <div className="p-4 border-t border-border flex gap-3">
              <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your response..."
                className="flex-1 bg-white border border-border rounded-xl px-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-accent-orange/50 transition-colors" />
              <button onClick={handleSend}
                className="w-12 h-12 rounded-xl bg-accent-orange flex items-center justify-center text-white hover:bg-accent-amber transition-colors">
                <Send size={18} />
              </button>
            </div>
          )}
        </GlassCard>

        <AnimatePresence>
          {step >= 2 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-8">
              <GlassCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen size={20} className="text-accent-orange" />
                    <h3 className="text-lg font-semibold text-ink">Your Interests</h3>
                  </div>
                  <p className="text-sm text-ink-soft mb-4">Select topics you are interested in learning</p>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map(interest => (
                      <SkillBadge key={interest} skill={interest}
                        selected={selectedInterests.includes(interest)} selectable
                        onAdd={toggleInterest} onRemove={toggleInterest} />
                    ))}
                  </div>
                </div>
              </GlassCard>

              <GlassCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase size={20} className="text-accent-teal" />
                    <h3 className="text-lg font-semibold text-ink">Current Skills</h3>
                  </div>
                  <p className="text-sm text-ink-soft mb-4">What do you already know?</p>
                  <div className="flex flex-wrap gap-2">
                    {SKILLS.map(skill => (
                      <SkillBadge key={skill} skill={skill}
                        selected={selectedSkills.includes(skill)} selectable
                        onAdd={toggleSkill} onRemove={toggleSkill} />
                    ))}
                  </div>
                </div>
              </GlassCard>

              <GlassCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User size={20} className="text-accent-cyan" />
                    <h3 className="text-lg font-semibold text-ink">Experience Level</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {EXPERIENCE_LEVELS.map(level => (
                      <button key={level.value} onClick={() => setExperience(level.value)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          experience === level.value
                            ? 'border-accent-orange/50 bg-accent-orange/10'
                            : 'border-border bg-white hover:border-ink-faint/40'}`}>
                        <div className="font-semibold text-ink mb-1">{level.label}</div>
                        <div className="text-xs text-ink-soft">{level.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </GlassCard>

              <GlassCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen size={20} className="text-accent-teal" />
                    <h3 className="text-lg font-semibold text-ink">Previous Learning</h3>
                  </div>
                  <p className="text-sm text-ink-soft mb-4">
                    Have you completed any courses or certifications before (on any platform)?
                    Optional — this helps us avoid recommending things you already know.
                  </p>
                  <input
                    type="text"
                    value={priorCoursesInput}
                    onChange={(e) => setPriorCoursesInput(e.target.value)}
                    placeholder="e.g. Python for Everybody (Coursera), CS50 (edX) — separate with commas"
                    className="w-full bg-white border border-border rounded-xl px-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-accent-orange/50 transition-colors"
                  />
                </div>
              </GlassCard>

              <GlassCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock size={20} className="text-accent-purple" />
                    <h3 className="text-lg font-semibold text-ink">Weekly Time Commitment</h3>
                  </div>
                  <p className="text-sm text-ink-soft mb-4">How many hours can you dedicate per week?</p>
                  <div className="flex flex-wrap gap-3">
                    {TIME_OPTIONS.map(hours => (
                      <button key={hours} onClick={() => setTimePerWeek(hours)}
                        className={`px-6 py-3 rounded-xl border font-semibold transition-all ${
                          timePerWeek === hours
                            ? 'border-accent-orange/50 bg-accent-orange/10 text-accent-orange'
                            : 'border-border bg-white text-ink-soft hover:border-ink-faint/40'}`}>
                        {hours} hrs
                      </button>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl p-4 max-w-2xl mx-auto">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-center pb-8">
                <AnimatedButton onClick={handleComplete} loading={isGenerating} size="lg" disabled={!goal}>
                  {isGenerating ? 'Generating Your Path...' : 'Generate My Learning Path'}
                  {!isGenerating && <ArrowRight size={20} />}
                </AnimatedButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
