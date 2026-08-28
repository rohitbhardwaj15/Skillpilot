import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, BookOpen, Filter, Search, ExternalLink, Target, Info,
  Loader2, Youtube, FileText, DollarSign, Gift, Globe,
} from 'lucide-react'
import { api } from '../lib/api'
import GlassCard from '../components/ui/GlassCard'

const LEVELS = ['All', 'beginner', 'intermediate', 'advanced']
const TYPES  = ['All', 'course', 'project']

// ── Category tabs ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',           label: '🌐 All',           icon: Globe },
  { id: 'free',          label: '🎁 Free',           icon: Gift },
  { id: 'paid',          label: '💰 Paid',           icon: DollarSign },
  { id: 'youtube',       label: '▶ YouTube',         icon: Youtube },
  { id: 'documentation', label: '📄 Documentation',  icon: FileText },
]

const LANG_OPTIONS = [
  'All','English','Hindi','Marathi','Tamil','Kannada','Telugu','Bengali','Gujarati','Punjabi',
]

export default function RecommendationsPage() {
  const [courses,    setCourses]    = useState([])
  const [skillGaps,  setSkillGaps]  = useState([])
  const [knownSkills,setKnownSkills]= useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')

  // filters
  const [activeLevel,    setActiveLevel]    = useState('All')
  const [activeType,     setActiveType]     = useState('All')
  const [activeSkill,    setActiveSkill]    = useState('All')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeLang,     setActiveLang]     = useState('All')
  const [searchQuery,    setSearchQuery]    = useState('')
  const [whyOpen,        setWhyOpen]        = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getCourses()
        setCourses(data)
        const pathId = localStorage.getItem('skillpilot_path_id')
        if (pathId) {
          const path = await api.getPath(pathId).catch(() => null)
          if (path) setSkillGaps(path.skillGaps || [])
        }
        const profile = await api.getMyProfile().catch(() => null)
        if (profile) {
          setKnownSkills(
            (profile.currentSkills || [])
              .filter((s) => s.level === 'intermediate' || s.level === 'advanced')
              .map((s) => s.name.toLowerCase())
          )
          // pre-select language from profile
          if (profile.preferredLanguage && profile.preferredLanguage !== 'English') {
            setActiveLang(profile.preferredLanguage)
          }
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const topSkills = useMemo(() => {
    const counts = {}
    courses.forEach((c) => c.skills.forEach((s) => { counts[s] = (counts[s] || 0) + 1 }))
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([s]) => s)
  }, [courses])

  // ── counts for category badges ─────────────────────────────────────────
  const catCounts = useMemo(() => ({
    all:           courses.length,
    free:          courses.filter((c) => c.is_free).length,
    paid:          courses.filter((c) => !c.is_free).length,
    youtube:       courses.filter((c) => c.youtube_url).length,
    documentation: courses.filter((c) => c.documentation_url).length,
  }), [courses])

  const filteredCourses = useMemo(() => courses.filter((course) => {
    // category filter
    if (activeCategory === 'free'          && !course.is_free)           return false
    if (activeCategory === 'paid'          && course.is_free)            return false
    if (activeCategory === 'youtube'       && !course.youtube_url)       return false
    if (activeCategory === 'documentation' && !course.documentation_url) return false

    // language filter
    if (activeLang !== 'All' && course.language !== activeLang) return false

    // level / type / skill filters
    if (activeLevel !== 'All' && course.level !== activeLevel) return false
    if (activeType  !== 'All' && course.type  !== activeType)  return false
    if (activeSkill !== 'All' && !course.skills.includes(activeSkill)) return false

    // search
    const q = searchQuery.toLowerCase()
    if (q) {
      const match =
        course.title.toLowerCase().includes(q) ||
        course.provider?.toLowerCase().includes(q) ||
        course.skills.some((s) => s.toLowerCase().includes(q))
      if (!match) return false
    }
    return true
  }), [courses, activeCategory, activeLang, activeLevel, activeType, activeSkill, searchQuery])

  const gapSet   = new Set(skillGaps.map((s) => s.toLowerCase()))
  const knownSet = new Set(knownSkills)

  function recommendationTag(course) {
    const fillsGap       = course.skills.some((s) => gapSet.has(s.toLowerCase()))
    const buildsOnKnown  = course.skills.some((s) => knownSet.has(s.toLowerCase()))
    if (fillsGap)      return { label: 'Fills a skill gap',     color: 'bg-accent-orange/90 text-dark-900' }
    if (buildsOnKnown) return { label: 'Builds on your skills', color: 'bg-accent-teal/90 text-dark-900' }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent-orange" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 section-padding">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold font-display text-white mb-2">
            {skillGaps.length > 0
              ? <>Recommended <span className="gradient-text">For You</span></>
              : <>Course <span className="gradient-text">Catalog</span></>}
          </h1>
          <p className="text-gray-400">
            {filteredCourses.length} of {courses.length} courses shown
          </p>
        </motion.div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {/* ── Category Tabs ── */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                activeCategory === cat.id
                  ? 'bg-accent-orange text-dark-900 border-accent-orange'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-white'
              }`}>
              {cat.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeCategory === cat.id ? 'bg-dark-900/30' : 'bg-white/10'
              }`}>
                {catCounts[cat.id]}
              </span>
            </button>
          ))}
        </div>

        {/* ── Filters ── */}
        <GlassCard className="mb-8">
          <div className="p-4 space-y-4">

            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses, skills, or providers..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white
                  placeholder-gray-500 focus:outline-none focus:border-accent-orange/50 transition-colors" />
            </div>

            {/* Skill chips */}
            <div className="flex flex-wrap items-center gap-3">
              <Filter size={16} className="text-gray-500" />
              <div className="flex flex-wrap gap-2">
                {['All', ...topSkills].map((skill) => (
                  <button key={skill} onClick={() => setActiveSkill(skill)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeSkill === skill
                        ? 'bg-accent-purple text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}>
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Level + Type + Language */}
            <div className="flex flex-wrap items-center gap-6">
              {/* Level */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">Level:</span>
                {LEVELS.map((level) => (
                  <button key={level} onClick={() => setActiveLevel(level)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      activeLevel === level
                        ? 'bg-accent-teal text-dark-900'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}>
                    {level}
                  </button>
                ))}
              </div>

              {/* Type */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">Type:</span>
                {TYPES.map((type) => (
                  <button key={type} onClick={() => setActiveType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      activeType === type
                        ? 'bg-accent-orange text-dark-900'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}>
                    {type}
                  </button>
                ))}
              </div>

              {/* Language */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">Language:</span>
                {LANG_OPTIONS.map((lang) => (
                  <button key={lang} onClick={() => setActiveLang(lang)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeLang === lang
                        ? 'bg-accent-pink text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}>
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* ── Course Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredCourses.map((course, i) => {
              const tag = recommendationTag(course)
              return (
                <motion.div key={course._id} layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                  <GlassCard hover3D className="h-full">
                    <div className="p-5 flex flex-col h-full">

                      {/* Top badges row */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Level */}
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            course.level === 'beginner'     ? 'bg-accent-teal/20 text-accent-teal' :
                            course.level === 'intermediate' ? 'bg-accent-orange/20 text-accent-orange' :
                                                             'bg-accent-pink/20 text-accent-pink'
                          }`}>
                            {course.level}
                          </span>
                          {/* Type */}
                          <span className="px-2 py-0.5 text-xs bg-white/10 text-gray-300 rounded-full capitalize">
                            {course.type}
                          </span>
                          {/* Free / Paid */}
                          {course.is_free
                            ? <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">🎁 Free</span>
                            : <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">💰 Paid</span>
                          }
                          {/* Language badge */}
                          {course.language && course.language !== 'English' && (
                            <span className="px-2 py-0.5 text-xs bg-accent-purple/20 text-accent-purple rounded-full">
                              🌐 {course.language}
                            </span>
                          )}
                        </div>
                        {tag && (
                          <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-lg shrink-0 ${tag.color}`}>
                            <Target size={10} /> {tag.label}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-white mb-1">{course.title}</h3>
                      <p className="text-xs text-gray-500 mb-3">{course.provider}</p>
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2 flex-1">{course.description}</p>
                      <button onClick={() => setWhyOpen(whyOpen === course._id ? null : course._id)} className="flex items-center gap-1.5 text-xs text-accent-teal hover:text-white transition-colors mb-3"><Info size={13}/> Why this / Why not?</button>
                      <AnimatePresence>{whyOpen === course._id && (<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="mb-3 rounded-xl bg-white/5 border border-white/10 p-3 text-xs">
                        <p className="text-green-400 font-semibold mb-1">✓ Why this course?</p>
                        <ul className="text-gray-400 space-y-1">{(course.skills || []).filter(s => gapSet.has(s.toLowerCase())).slice(0,3).map(s=><li key={s}>• Covers {s}, one of your skill gaps</li>)}{course.prerequisites?.length ? <li>• Prerequisites: {course.prerequisites.join(', ')}</li> : <li>• No prerequisites listed</li>}</ul>
                        <p className="text-red-400 font-semibold mt-2 mb-1">✕ Why not?</p><ul className="text-gray-500 space-y-1"><li>• This is a catalog comparison; higher-ranked roadmap resources may cover more of your gaps.</li>{course.prerequisites?.filter(p => !knownSet.has(p.toLowerCase())).slice(0,2).map(p=><li key={p}>• Requires {p}, which is not yet mastered</li>)}</ul>
                      </motion.div>)}</AnimatePresence>

                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                        <span className="flex items-center gap-1"><Clock size={12} /> {course.durationWeeks}w</span>
                        <span className="flex items-center gap-1"><BookOpen size={12} /> {course.skills.length} skills</span>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {course.skills.slice(0, 3).map((skill) => (
                          <span key={skill} className="px-2 py-0.5 text-[10px] bg-white/5 text-gray-400 rounded-full">{skill}</span>
                        ))}
                        {course.skills.length > 3 && (
                          <span className="px-2 py-0.5 text-[10px] bg-white/5 text-gray-400 rounded-full">+{course.skills.length - 3}</span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-2 mt-auto">
                        {course.url && (
                          <a href={course.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                              bg-accent-orange/10 text-accent-orange hover:bg-accent-orange hover:text-dark-900
                              transition-all text-sm font-medium">
                            View Course <ExternalLink size={13} />
                          </a>
                        )}
                        {course.youtube_url && (
                          <a href={course.youtube_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                              bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white
                              transition-all text-sm font-medium">
                            <Youtube size={14} /> Watch on YouTube
                          </a>
                        )}
                        {course.documentation_url && (
                          <a href={course.documentation_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                              bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white
                              transition-all text-sm font-medium">
                            <FileText size={14} /> Read Docs
                          </a>
                        )}
                        {!course.url && !course.youtube_url && !course.documentation_url && (
                          <span className="flex items-center justify-center px-3 py-2 rounded-lg bg-white/5 text-gray-500 text-sm">
                            Internal curated project
                          </span>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {filteredCourses.length === 0 && !loading && (
          <p className="text-center text-gray-500 py-16">No courses match these filters.</p>
        )}
      </div>
    </div>
  )
}
