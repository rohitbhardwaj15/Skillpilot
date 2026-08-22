import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, BookOpen, Filter, Search, ExternalLink, Target, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import GlassCard from '../components/ui/GlassCard'

const LEVELS = ['All', 'beginner', 'intermediate', 'advanced']
const TYPES = ['All', 'course', 'project']

export default function RecommendationsPage() {
  const [courses, setCourses] = useState([])
  const [skillGaps, setSkillGaps] = useState([])
  const [knownSkills, setKnownSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [activeLevel, setActiveLevel] = useState('All')
  const [activeType, setActiveType] = useState('All')
  const [activeSkill, setActiveSkill] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

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
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Build the skill filter chip list dynamically from the REAL dataset,
  // not a guessed static category list — top 10 most common skills.
  const topSkills = useMemo(() => {
    const counts = {}
    courses.forEach((c) => c.skills.forEach((s) => { counts[s] = (counts[s] || 0) + 1 }))
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([s]) => s)
  }, [courses])

  const filteredCourses = courses.filter((course) => {
    const matchLevel = activeLevel === 'All' || course.level === activeLevel
    const matchType = activeType === 'All' || course.type === activeType
    const matchSkill = activeSkill === 'All' || course.skills.includes(activeSkill)
    const q = searchQuery.toLowerCase()
    const matchSearch =
      !q ||
      course.title.toLowerCase().includes(q) ||
      course.provider?.toLowerCase().includes(q) ||
      course.skills.some((s) => s.toLowerCase().includes(q))
    return matchLevel && matchType && matchSkill && matchSearch
  })

  const gapSet = new Set(skillGaps.map((s) => s.toLowerCase()))
  const knownSet = new Set(knownSkills)

  function recommendationTag(course) {
    const fillsGap = course.skills.some((s) => gapSet.has(s.toLowerCase()))
    const buildsOnKnown = course.skills.some((s) => knownSet.has(s.toLowerCase()))
    if (fillsGap) return { label: 'Fills a skill gap', color: 'bg-accent-orange/90 text-dark-900' }
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold font-display text-white mb-2">
            {skillGaps.length > 0 ? <>Recommended <span className="gradient-text">For You</span></> : <>Course <span className="gradient-text">Catalog</span></>}
          </h1>
          <p className="text-gray-400">
            {courses.length} courses across web development, data science, cybersecurity, DevOps, and design.
          </p>
        </motion.div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <GlassCard className="mb-8">
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses, skills, or providers..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent-orange/50 transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Filter size={16} className="text-gray-500" />
              <div className="flex flex-wrap gap-2">
                {['All', ...topSkills].map((skill) => (
                  <button key={skill} onClick={() => setActiveSkill(skill)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeSkill === skill ? 'bg-accent-purple text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}>
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">Level:</span>
                {LEVELS.map((level) => (
                  <button key={level} onClick={() => setActiveLevel(level)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      activeLevel === level ? 'bg-accent-teal text-dark-900' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}>
                    {level}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">Type:</span>
                {TYPES.map((type) => (
                  <button key={type} onClick={() => setActiveType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      activeType === type ? 'bg-accent-orange text-dark-900' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredCourses.map((course, i) => {
              const tag = recommendationTag(course)
              return (
                <motion.div key={course._id} layout initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                  <GlassCard hover3D className="h-full">
                    <div className="p-5 flex flex-col h-full">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            course.level === 'beginner' ? 'bg-accent-teal/20 text-accent-teal' :
                            course.level === 'intermediate' ? 'bg-accent-orange/20 text-accent-orange' :
                            'bg-accent-pink/20 text-accent-pink'
                          }`}>
                            {course.level}
                          </span>
                          <span className="px-2 py-0.5 text-xs bg-white/10 text-gray-300 rounded-full capitalize">
                            {course.type}
                          </span>
                        </div>
                        {tag && (
                          <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-lg shrink-0 ${tag.color}`}>
                            <Target size={10} /> {tag.label}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-white mb-1">{course.title}</h3>
                      <p className="text-xs text-gray-500 mb-3">{course.provider}</p>
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2 flex-1">{course.description}</p>

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

                      {course.url ? (
                        <a href={course.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 mt-auto px-3 py-2 rounded-lg bg-accent-orange/10 text-accent-orange hover:bg-accent-orange hover:text-dark-900 transition-all text-sm font-medium">
                          View course <ExternalLink size={13} />
                        </a>
                      ) : (
                        <span className="flex items-center justify-center mt-auto px-3 py-2 rounded-lg bg-white/5 text-gray-500 text-sm">
                          Internal curated project
                        </span>
                      )}
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
