import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, User, Briefcase, Clock, BookOpen,
  ArrowRight, Sparkles, AlertCircle, Globe,
  Youtube, FileText, DollarSign, Gift,
} from 'lucide-react'
import { setProfile, setOnboarded, addGoal, addInterest, addSkill } from '../store/slices/userSlice'
import { updateUserProfileId } from '../store/slices/authSlice'
import { setCurrentPath } from '../store/slices/pathSlice'
import { api } from '../lib/api'
import { transformPathResponse } from '../lib/transformPath'
import GlassCard from '../components/ui/GlassCard'
import SkillBadge from '../components/ui/SkillBadge'
import AnimatedButton from '../components/ui/AnimatedButton'

/* ── static data ──────────────────────────────────────────────────────── */

const LANGUAGES = [
  { code: 'English',  label: 'English',    flag: '🇬🇧' },
  { code: 'Hindi',    label: 'हिंदी',       flag: '🇮🇳' },
  { code: 'Marathi',  label: 'मराठी',       flag: '🇮🇳' },
  { code: 'Tamil',    label: 'தமிழ்',       flag: '🇮🇳' },
  { code: 'Kannada',  label: 'ಕನ್ನಡ',       flag: '🇮🇳' },
  { code: 'Telugu',   label: 'తెలుగు',      flag: '🇮🇳' },
  { code: 'Bengali',  label: 'বাংলা',       flag: '🇮🇳' },
  { code: 'Gujarati', label: 'ગુજરાતી',     flag: '🇮🇳' },
  { code: 'Punjabi',  label: 'ਪੰਜਾਬੀ',      flag: '🇮🇳' },
  { code: 'Others',   label: 'Others',      flag: '🌐' },
]

const COURSE_TYPES = [
  {
    id: 'both',
    icon: Globe,
    label: 'All Courses',
    desc: 'Show me everything — free and paid',
    color: 'border-accent-orange/50 bg-accent-orange/10',
    textColor: 'text-accent-orange',
  },
  {
    id: 'free',
    icon: Gift,
    label: 'Free Only 🎁',
    desc: 'YouTube, freeCodeCamp, open docs',
    color: 'border-green-500/50 bg-green-500/10',
    textColor: 'text-green-400',
  },
  {
    id: 'paid',
    icon: DollarSign,
    label: 'Paid Only 💰',
    desc: 'Udemy, Coursera, Unacademy etc.',
    color: 'border-yellow-500/50 bg-yellow-500/10',
    textColor: 'text-yellow-400',
  },
]

const LEARNING_STYLES = [
  {
    id: 'video',
    icon: Youtube,
    label: 'Video Courses 📹',
    desc: 'Learn by watching video lectures',
    color: 'border-red-500/50 bg-red-500/10',
    textColor: 'text-red-400',
  },
  {
    id: 'documentation',
    icon: FileText,
    label: 'Documentation 📄',
    desc: 'Read official docs and guides',
    color: 'border-blue-500/50 bg-blue-500/10',
    textColor: 'text-blue-400',
  },
  {
    id: 'projects',
    icon: Briefcase,
    label: 'Projects 🛠️',
    desc: 'Learn by building real projects',
    color: 'border-accent-teal/50 bg-accent-teal/10',
    textColor: 'text-accent-teal',
  },
  {
    id: 'mixed',
    icon: BookOpen,
    label: 'Mixed 🎯',
    desc: 'Combination of all styles',
    color: 'border-accent-purple/50 bg-accent-purple/10',
    textColor: 'text-accent-purple',
  },
]

const INTERESTS = [
  'Web Development','Data Science','Machine Learning','Mobile Development',
  'Cloud Computing','DevOps','Cybersecurity','UI/UX Design',
  'Blockchain','Game Development','Backend Development','Frontend Development',
  'UPSC / Government Exams','Banking Exams','SSC Exams','JEE / NEET',
  'CA / Accounting','MBA / Management','Railway Exams','Defence Exams',
]

const SKILLS = [
  'JavaScript','Python','React','Node.js','SQL','AWS',
  'Docker','TypeScript','Java','Go','Rust','Figma',
  'Quantitative Aptitude','Reasoning','General Knowledge','English Grammar',
]

const EXPERIENCE_LEVELS = [
  { value: 'beginner',     label: 'Beginner',    desc: 'Just starting out' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Some experience' },
  { value: 'advanced',     label: 'Advanced',     desc: 'Experienced professional' },
]

const TIME_OPTIONS = [5, 10, 15, 20, 30, 40]

const GREETINGS = {
  English:  'Great choice! Now, what is your primary learning goal?',
  Hindi:    'बढ़िया! अब बताइए, आपका मुख्य सीखने का लक्ष्य क्या है?',
  Marathi:  'उत्तम! आता सांगा, तुमचे मुख्य शिकण्याचे लक्ष्य काय आहे?',
  Tamil:    'சிறந்தது! இப்போது, உங்கள் முதன்மை கற்றல் இலக்கு என்ன?',
  Kannada:  'ಉತ್ತಮ! ಈಗ, ನಿಮ್ಮ ಮುಖ್ಯ ಕಲಿಕೆಯ ಗುರಿ ಏನು?',
  Telugu:   'చాలా బాగుంది! ఇప్పుడు, మీ ప్రధాన నేర్చుకోవాలనే లక్ష్యం ఏమిటి?',
  Bengali:  'চমৎকার! এখন বলুন, আপনার প্রধান শেখার লক্ষ্য কী?',
  Gujarati: 'સરસ! હવે, તમારો મુખ્ય શીખવાનો ઉદ્દેશ્ય શું છે?',
  Punjabi:  'ਵਧੀਆ! ਹੁਣ ਦੱਸੋ, ਤੁਹਾਡਾ ਮੁੱਖ ਸਿੱਖਣ ਦਾ ਟੀਚਾ ਕੀ ਹੈ?',
  Others:   'Great choice! Now, what is your primary learning goal?',
}

/* ── component ────────────────────────────────────────────────────────── */

export default function OnboardingPage() {
  const navigate   = useNavigate()
  const dispatch   = useDispatch()
  const chatEndRef = useRef(null)
  const { user }   = useSelector((state) => state.auth)

  // steps: 0=name/goal 1=language 2=courseType 3=learningStyle 4=profile
  const [step,              setStep]              = useState(0)
  const [name,              setName]              = useState(user?.name || '')
  const [goal,              setGoal]              = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('English')
  const [courseTypeFilter,  setCourseTypeFilter]  = useState('both')
  const [learningStyle,     setLearningStyle]     = useState('mixed')
  const [selectedInterests, setSelectedInterests] = useState([])
  const [selectedSkills,    setSelectedSkills]    = useState([])
  const [priorCoursesInput, setPriorCoursesInput] = useState('')
  const [experience,        setExperience]        = useState('beginner')
  const [timePerWeek,       setTimePerWeek]       = useState(10)
  const [isGenerating,      setIsGenerating]      = useState(false)
  const [error,             setError]             = useState('')

  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: user?.name
        ? `Hi ${user.name}! What is your primary learning goal? e.g. "I want to become a full-stack developer" or "I want to crack UPSC exam"`
        : "Hi there! I'm your AI Learning Guide. What is your name?",
    },
  ])
  const [inputValue, setInputValue] = useState('')

  useEffect(() => { if (user?.name) { setName(user.name); setStep(1) } }, [user])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  const addMsg = (msgs) => setChatMessages((prev) => [...prev, ...msgs])

  /* ── chat send (steps 0 and 1) ──────────────────────────────────────── */
  const handleSend = () => {
    if (!inputValue.trim()) return
    const userMsg = inputValue.trim()
    addMsg([{ role: 'user', content: userMsg }])
    setInputValue('')

    setTimeout(() => {
      if (step === 0) {
        setName(userMsg)
        addMsg([{ role: 'assistant', content: `Nice to meet you, ${userMsg}! 🎯 What is your primary learning goal? e.g. "I want to become a data scientist" or "I want to crack UPSC exam"` }])
        setStep(1)
      } else if (step === 1) {
        // Guard: reject too-short / low-effort answers instead of silently
        // accepting them as the learner's goal. Without this, a stray
        // fragment (e.g. accidental early Enter) becomes `goal` and only
        // fails much later, confusingly, when generating the path.
        if (userMsg.length < 10) {
          addMsg([{
            role: 'assistant',
            content: "That's a bit short — could you describe your goal a little more? e.g. \"I want to become a full-stack developer\" or \"I want to crack UPSC exam\"",
          }])
          return
        }
        setGoal(userMsg)
        dispatch(addGoal(userMsg))
        addMsg([{ role: 'assistant', content: '🌐 In which language are you most comfortable studying?' }])
        setStep(2)
      }
    }, 500)
  }

  /* ── step handlers ──────────────────────────────────────────────────── */
  const handleLanguageSelect = (lang) => {
    setPreferredLanguage(lang)
    const langObj   = LANGUAGES.find((l) => l.code === lang)
    const greeting  = GREETINGS[lang] || GREETINGS.English
    addMsg([
      { role: 'user',      content: `${langObj?.flag} ${lang}` },
      { role: 'assistant', content: `${greeting} 📚 Now choose your course preference.` },
    ])
    setStep(3)
  }

  const handleCourseTypeSelect = (typeId) => {
    setCourseTypeFilter(typeId)
    const typeObj = COURSE_TYPES.find((t) => t.id === typeId)
    addMsg([
      { role: 'user',      content: typeObj?.label },
      { role: 'assistant', content: '🎓 How do you prefer to learn?' },
    ])
    setStep(4)
  }

  const handleLearningStyleSelect = (styleId) => {
    setLearningStyle(styleId)
    const styleObj = LEARNING_STYLES.find((s) => s.id === styleId)
    addMsg([
      { role: 'user',      content: styleObj?.label },
      { role: 'assistant', content: "Perfect! Let's complete your profile. 🚀" },
    ])
    setStep(5)
  }

  const toggleInterest = (interest) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    )
    dispatch(addInterest(interest))
  }

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
    dispatch(addSkill(skill))
  }

  /* ── submit ─────────────────────────────────────────────────────────── */
  async function handleComplete() {
    setError('')
    setIsGenerating(true)
    try {
      const priorCourses = priorCoursesInput.split(',').map((c) => c.trim()).filter(Boolean)
      const analysisText = priorCourses.length > 0
        ? `${goal}. I have already completed: ${priorCourses.join(', ')}.`
        : goal

      const extracted = await api.analyzeGoal(analysisText)

      const skillMap = new Map(extracted.currentSkills.map((s) => [s.name.toLowerCase(), s]))
      selectedSkills.forEach((skillName) => {
        const key = skillName.toLowerCase()
        if (!skillMap.has(key)) skillMap.set(key, { name: skillName, level: 'beginner' })
      })

      // Map learningStyle to array for backend
      const learningStyleArr = learningStyle === 'mixed'
        ? ['projects', 'video', 'reading']
        : learningStyle === 'video'        ? ['video']
        : learningStyle === 'documentation' ? ['reading']
        : ['projects']

      const profile = await api.createProfile({
        name,
        goal,
        targetRole:           extracted.targetRole,
        timelineMonths:       extracted.timelineMonths,
        currentSkills:        Array.from(skillMap.values()),
        interests:            selectedInterests,
        experienceLevel:      experience,
        priorLearningHistory: priorCourses,
        hoursPerWeek:         timePerWeek,
        learningStyle:        learningStyleArr,
        preferredLanguage,
        courseTypeFilter,     // ← new: free/paid/both
      })

      dispatch(updateUserProfileId(profile._id))
      dispatch(setProfile({
        name, goals: [goal], interests: selectedInterests,
        skills: selectedSkills, experience, timePerWeek,
        preferredLanguage, courseTypeFilter, learningStyle,
      }))
      dispatch(setOnboarded(true))

      const path = await api.generatePath(profile._id)
      localStorage.setItem('skillpilot_path_id', path._id)
      dispatch(setCurrentPath(transformPathResponse(path)))
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setIsGenerating(false)
    }
  }

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen pt-24 pb-12 section-padding">
      <div className="max-w-4xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-4xl lg:text-5xl font-bold font-display text-white mb-2">
            Let us build your <span className="gradient-text">learning profile</span>
          </h1>
          <p className="text-gray-400">Tell us about yourself and our AI will craft the perfect path for you.</p>
        </motion.div>

        {/* Chat window */}
        <GlassCard className="mb-8">
          <div className="h-[260px] overflow-y-auto p-6 space-y-4">
            {chatMessages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'assistant' ? 'bg-accent-orange/20' : 'bg-accent-purple/20'}`}>
                  {msg.role === 'assistant'
                    ? <Sparkles size={16} className="text-accent-orange" />
                    : <User     size={16} className="text-accent-purple" />}
                </div>
                <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                  msg.role === 'assistant' ? 'bg-white/5 text-gray-200' : 'bg-accent-purple/20 text-white'}`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Text input for steps 0 & 1 */}
          {step < 2 && (
            <div className="p-4 border-t border-white/10 flex gap-3">
              <input type="text" value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your response..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white
                  placeholder-gray-500 focus:outline-none focus:border-accent-orange/50 transition-colors" />
              <button onClick={handleSend}
                className="w-12 h-12 rounded-xl bg-accent-orange flex items-center justify-center
                  text-dark-900 hover:bg-accent-amber transition-colors">
                <Send size={18} />
              </button>
            </div>
          )}
        </GlassCard>

        <AnimatePresence>

          {/* ── STEP 2 — Language ───────────────────────────────────────── */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6">
              <GlassCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe size={20} className="text-accent-orange" />
                    <h3 className="text-lg font-semibold text-white">Choose Your Study Language</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-6">
                    We will prioritise courses in your language. English courses are always included as supplement.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {LANGUAGES.map((lang) => (
                      <button key={lang.code} onClick={() => handleLanguageSelect(lang.code)}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10
                          bg-white/5 hover:border-accent-orange/50 hover:bg-accent-orange/10 transition-all group cursor-pointer">
                        <span className="text-3xl">{lang.flag}</span>
                        <span className="text-sm font-medium text-gray-300 group-hover:text-white text-center">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ── STEP 3 — Course Type (Free / Paid / Both) ───────────────── */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6">
              <GlassCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={20} className="text-accent-orange" />
                    <h3 className="text-lg font-semibold text-white">Course Preference</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-6">Do you want free courses, paid courses, or both?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {COURSE_TYPES.map((ct) => {
                      const Icon = ct.icon
                      return (
                        <button key={ct.id} onClick={() => handleCourseTypeSelect(ct.id)}
                          className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all hover:scale-105 ${ct.color}`}>
                          <Icon size={28} className={ct.textColor} />
                          <div className="text-center">
                            <div className={`font-bold text-sm ${ct.textColor}`}>{ct.label}</div>
                            <div className="text-xs text-gray-400 mt-1">{ct.desc}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ── STEP 4 — Learning Style ─────────────────────────────────── */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6">
              <GlassCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={20} className="text-accent-orange" />
                    <h3 className="text-lg font-semibold text-white">How Do You Learn Best?</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-6">We will recommend resources that match your style.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {LEARNING_STYLES.map((ls) => {
                      const Icon = ls.icon
                      return (
                        <button key={ls.id} onClick={() => handleLearningStyleSelect(ls.id)}
                          className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all hover:scale-105 ${ls.color}`}>
                          <Icon size={28} className={ls.textColor} />
                          <div className="text-left">
                            <div className={`font-bold text-sm ${ls.textColor}`}>{ls.label}</div>
                            <div className="text-xs text-gray-400 mt-1">{ls.desc}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ── STEP 5 — Full Profile Form ──────────────────────────────── */}
          {step >= 5 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-8">

              {/* Summary badges */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-gray-400">
                  <Globe size={14} className="text-accent-orange" />
                  <span className="text-white font-semibold">
                    {LANGUAGES.find(l => l.code === preferredLanguage)?.flag} {preferredLanguage}
                  </span>
                  <button onClick={() => setStep(2)} className="ml-1 text-xs text-accent-orange hover:underline">Change</button>
                </span>
                <span className="text-gray-600">|</span>
                <span className="flex items-center gap-1 text-gray-400">
                  {courseTypeFilter === 'free' ? '🎁 Free only' : courseTypeFilter === 'paid' ? '💰 Paid only' : '🌐 All courses'}
                  <button onClick={() => setStep(3)} className="ml-1 text-xs text-accent-orange hover:underline">Change</button>
                </span>
                <span className="text-gray-600">|</span>
                <span className="flex items-center gap-1 text-gray-400">
                  {LEARNING_STYLES.find(l => l.id === learningStyle)?.label}
                  <button onClick={() => setStep(4)} className="ml-1 text-xs text-accent-orange hover:underline">Change</button>
                </span>
              </div>

              {/* Interests */}
              <GlassCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen size={20} className="text-accent-orange" />
                    <h3 className="text-lg font-semibold text-white">Your Interests</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">Select topics you are interested in learning</p>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map((interest) => (
                      <SkillBadge key={interest} skill={interest}
                        selected={selectedInterests.includes(interest)} selectable
                        onAdd={toggleInterest} onRemove={toggleInterest} />
                    ))}
                  </div>
                </div>
              </GlassCard>

              {/* Current Skills */}
              <GlassCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase size={20} className="text-accent-teal" />
                    <h3 className="text-lg font-semibold text-white">Current Skills</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">What do you already know?</p>
                  <div className="flex flex-wrap gap-2">
                    {SKILLS.map((skill) => (
                      <SkillBadge key={skill} skill={skill}
                        selected={selectedSkills.includes(skill)} selectable
                        onAdd={toggleSkill} onRemove={toggleSkill} />
                    ))}
                  </div>
                </div>
              </GlassCard>

              {/* Experience */}
              <GlassCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User size={20} className="text-accent-cyan" />
                    <h3 className="text-lg font-semibold text-white">Experience Level</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {EXPERIENCE_LEVELS.map((level) => (
                      <button key={level.value} onClick={() => setExperience(level.value)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          experience === level.value
                            ? 'border-accent-orange/50 bg-accent-orange/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                        <div className="font-semibold text-white mb-1">{level.label}</div>
                        <div className="text-xs text-gray-400">{level.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {/* Prior Learning */}
              <GlassCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen size={20} className="text-accent-teal" />
                    <h3 className="text-lg font-semibold text-white">Previous Learning <span className="text-gray-500 text-sm font-normal">(optional)</span></h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">Courses or certifications already completed — we will skip these.</p>
                  <input type="text" value={priorCoursesInput}
                    onChange={(e) => setPriorCoursesInput(e.target.value)}
                    placeholder="e.g. Python for Everybody (Coursera), CS50 — separate with commas"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white
                      placeholder-gray-500 focus:outline-none focus:border-accent-orange/50 transition-colors" />
                </div>
              </GlassCard>

              {/* Weekly Time */}
              <GlassCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock size={20} className="text-accent-purple" />
                    <h3 className="text-lg font-semibold text-white">Weekly Time Commitment</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">How many hours per week can you dedicate?</p>
                  <div className="flex flex-wrap gap-3">
                    {TIME_OPTIONS.map((hours) => (
                      <button key={hours} onClick={() => setTimePerWeek(hours)}
                        className={`px-6 py-3 rounded-xl border font-semibold transition-all ${
                          timePerWeek === hours
                            ? 'border-accent-orange/50 bg-accent-orange/10 text-accent-orange'
                            : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'}`}>
                        {hours} hrs
                      </button>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-sm bg-red-400/10
                  border border-red-400/20 rounded-xl p-4">
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
