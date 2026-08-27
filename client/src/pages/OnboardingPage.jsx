import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, User, Briefcase, Clock, BookOpen,
  ArrowRight, Sparkles, AlertCircle, Globe,
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
  { value: 'beginner',     label: 'Beginner',      desc: 'Just starting out' },
  { value: 'intermediate', label: 'Intermediate',   desc: 'Some experience' },
  { value: 'advanced',     label: 'Advanced',       desc: 'Experienced professional' },
]

const TIME_OPTIONS = [5, 10, 15, 20, 30, 40]

/* ── language greeting helper ─────────────────────────────────────────── */
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

const LANG_PROMPT = {
  English:  'In which language are you most comfortable studying?',
  Hindi:    'आप किस भाषा में पढ़ना पसंद करते हैं?',
  Marathi:  '',
  Tamil:    '',
  Kannada:  '',
  Telugu:   '',
  Bengali:  '',
  Gujarati: '',
  Punjabi:  '',
  Others:   '',
}

/* ── component ────────────────────────────────────────────────────────── */

export default function OnboardingPage() {
  const navigate  = useNavigate()
  const dispatch  = useDispatch()
  const chatEndRef = useRef(null)
  const { user }  = useSelector((state) => state.auth)

  // steps: 0=name 1=goal 2=language 3=interests+skills+etc
  const [step,              setStep]              = useState(0)
  const [name,              setName]              = useState(user?.name || '')
  const [goal,              setGoal]              = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('English')
  const [selectedInterests, setSelectedInterests] = useState([])
  const [selectedSkills,    setSelectedSkills]    = useState([])
  const [priorCoursesInput, setPriorCoursesInput] = useState('')
  const [experience,        setExperience]        = useState('beginner')
  const [timePerWeek,       setTimePerWeek]       = useState(10)
  const [isGenerating,      setIsGenerating]      = useState(false)
  const [error,             setError]             = useState('')

  const [chatMessages, setChatMessages] = useState([
    {
      role:    'assistant',
      content: user?.name
        ? `Hi ${user.name}! What is your primary learning goal? For example: "I want to become a full-stack developer."`
        : "Hi there! I'm your AI Learning Guide. What is your name?",
    },
  ])
  const [inputValue, setInputValue] = useState('')

  // If already logged in, skip name step
  useEffect(() => { if (user?.name) { setName(user.name); setStep(1) } }, [user])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  /* ── chat send (steps 0 and 1) ──────────────────────────────────────── */
  const handleSend = () => {
    if (!inputValue.trim()) return
    const userMsg = inputValue.trim()
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setInputValue('')

    setTimeout(() => {
      let response = ''
      if (step === 0) {
        setName(userMsg)
        response = `Nice to meet you, ${userMsg}! What is your primary learning goal? For example: "I want to become a full-stack developer" or "I want to crack UPSC."`
        setStep(1)
      } else if (step === 1) {
        setGoal(userMsg)
        dispatch(addGoal(userMsg))
        response = '🌐 In which language are you most comfortable studying? Please select below.'
        setStep(2)
      }
      setChatMessages((prev) => [...prev, { role: 'assistant', content: response }])
    }, 600)
  }

  /* ── language selection (step 2) ────────────────────────────────────── */
  const handleLanguageSelect = (lang) => {
    setPreferredLanguage(lang)
    const greeting = GREETINGS[lang] || GREETINGS.English
    setChatMessages((prev) => [
      ...prev,
      { role: 'user',      content: `${LANGUAGES.find(l => l.code === lang)?.flag} ${lang}` },
      { role: 'assistant', content: `${greeting} Let's now build your complete profile! 🚀` },
    ])
    setStep(3)
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
      const priorCourses = priorCoursesInput
        .split(',').map((c) => c.trim()).filter(Boolean)

      const analysisText = priorCourses.length > 0
        ? `${goal}. I have already completed: ${priorCourses.join(', ')}.`
        : goal

      const extracted = await api.analyzeGoal(analysisText)

      const skillMap = new Map(extracted.currentSkills.map((s) => [s.name.toLowerCase(), s]))
      selectedSkills.forEach((skillName) => {
        const key = skillName.toLowerCase()
        if (!skillMap.has(key)) skillMap.set(key, { name: skillName, level: 'beginner' })
      })

      const profile = await api.createProfile({
        name,
        goal,
        targetRole:          extracted.targetRole,
        timelineMonths:      extracted.timelineMonths,
        currentSkills:       Array.from(skillMap.values()),
        interests:           selectedInterests,
        experienceLevel:     experience,
        priorLearningHistory: priorCourses,
        hoursPerWeek:        timePerWeek,
        learningStyle:       ['projects'],
        preferredLanguage,                      // ← new field sent to backend
      })

      dispatch(updateUserProfileId(profile._id))
      dispatch(setProfile({ name, goals: [goal], interests: selectedInterests,
        skills: selectedSkills, experience, timePerWeek, preferredLanguage }))
      dispatch(setOnboarded(true))

      const path = await api.generatePath(profile._id)
      localStorage.setItem('skillpilot_path_id', path._id)
      dispatch(setCurrentPath(transformPathResponse(path)))
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Something went wrong building your path. Please try again.')
      setIsGenerating(false)
    }
  }

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen pt-24 pb-12 section-padding">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10">
          <h1 className="text-4xl lg:text-5xl font-bold font-display text-white mb-2">
            Let us build your <span className="gradient-text">learning profile</span>
          </h1>
          <p className="text-gray-400">Tell us about yourself and our AI will craft the perfect path for you.</p>
        </motion.div>

        {/* Chat window */}
        <GlassCard className="mb-8">
          <div className="h-[300px] overflow-y-auto p-6 space-y-4">
            {chatMessages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'assistant' ? 'bg-accent-orange/20' : 'bg-accent-purple/20'}`}>
                  {msg.role === 'assistant'
                    ? <Sparkles size={16} className="text-accent-orange" />
                    : <User    size={16} className="text-accent-purple" />}
                </div>
                <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                  msg.role === 'assistant' ? 'bg-white/5 text-gray-200' : 'bg-accent-purple/20 text-white'}`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Text input — only for steps 0 and 1 */}
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

          {/* ── STEP 2 — Language selection ─────────────────────────────── */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <GlassCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe size={20} className="text-accent-orange" />
                    <h3 className="text-lg font-semibold text-white">
                      Choose Your Preferred Study Language
                    </h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-6">
                    We will recommend courses and documentation in your comfortable language.
                    Courses in <strong className="text-white">English</strong> are always included as a supplement.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {LANGUAGES.map((lang) => (
                      <button key={lang.code} onClick={() => handleLanguageSelect(lang.code)}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10
                          bg-white/5 hover:border-accent-orange/50 hover:bg-accent-orange/10
                          transition-all group cursor-pointer">
                        <span className="text-3xl">{lang.flag}</span>
                        <span className="text-sm font-medium text-gray-300 group-hover:text-white text-center">
                          {lang.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ── STEP 3 — Full profile form ───────────────────────────────── */}
          {step >= 3 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="space-y-8">

              {/* Selected language badge */}
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-accent-orange" />
                <span className="text-sm text-gray-400">
                  Study language:&nbsp;
                  <span className="text-white font-semibold">
                    {LANGUAGES.find(l => l.code === preferredLanguage)?.flag}&nbsp;
                    {preferredLanguage}
                  </span>
                  <button onClick={() => setStep(2)}
                    className="ml-3 text-xs text-accent-orange hover:underline">
                    Change
                  </button>
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
                    {INTERESTS.map(interest => (
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
                    {SKILLS.map(skill => (
                      <SkillBadge key={skill} skill={skill}
                        selected={selectedSkills.includes(skill)} selectable
                        onAdd={toggleSkill} onRemove={toggleSkill} />
                    ))}
                  </div>
                </div>
              </GlassCard>

              {/* Experience Level */}
              <GlassCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User size={20} className="text-accent-cyan" />
                    <h3 className="text-lg font-semibold text-white">Experience Level</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {EXPERIENCE_LEVELS.map(level => (
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
                    <h3 className="text-lg font-semibold text-white">Previous Learning</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    Courses or certifications you have already completed — optional.
                    This helps us avoid recommending things you already know.
                  </p>
                  <input type="text" value={priorCoursesInput}
                    onChange={(e) => setPriorCoursesInput(e.target.value)}
                    placeholder="e.g. Python for Everybody (Coursera), CS50 (edX) — separate with commas"
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
                  <p className="text-sm text-gray-400 mb-4">How many hours can you dedicate per week?</p>
                  <div className="flex flex-wrap gap-3">
                    {TIME_OPTIONS.map(hours => (
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

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 text-red-400 text-sm bg-red-400/10
                  border border-red-400/20 rounded-xl p-4 max-w-2xl mx-auto">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
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
