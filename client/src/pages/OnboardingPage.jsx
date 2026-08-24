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
