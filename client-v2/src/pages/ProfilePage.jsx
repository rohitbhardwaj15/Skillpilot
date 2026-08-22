import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { User, Briefcase, Clock, BookOpen, Target, Edit2, Check, Loader2, AlertCircle } from 'lucide-react'
import { api } from '../lib/api'
import GlassCard from '../components/ui/GlassCard'
import SkillBadge from '../components/ui/SkillBadge'
import ProgressRing from '../components/ui/ProgressRing'

// These match the backend's actual learningStyle enum (server/models/Profile.js) —
// showing options the system doesn't really support would be dishonest UX.
const LEARNING_STYLES = [
  { value: 'projects', label: 'Project-based', desc: 'Learn by building real things' },
  { value: 'video', label: 'Video courses', desc: 'Learn by watching structured lessons' },
  { value: 'reading', label: 'Reading/Docs', desc: 'Learn by reading articles and documentation' },
  { value: 'interactive', label: 'Interactive', desc: 'Learn through hands-on interactive exercises' },
]

const ALL_INTERESTS = [
  'Web Development', 'Data Science', 'Machine Learning', 'Mobile Development',
  'Cloud Computing', 'DevOps', 'Cybersecurity', 'UI/UX Design',
  'Blockchain', 'Game Development', 'Backend Development', 'Frontend Development'
]

const ALL_SKILLS = [
  'JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS',
  'Docker', 'TypeScript', 'Java', 'Go', 'Rust', 'Figma', 'HTML', 'CSS'
]

export default function ProfilePage() {
  const { user } = useSelector((state) => state.auth)
  const [profile, setProfile] = useState(null)
  const [pathProgress, setPathProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const prof = await api.getMyProfile()
      setProfile(prof)
      setEditForm({
        name: prof.name,
        targetRole: prof.targetRole,
        timelineMonths: prof.timelineMonths,
        hoursPerWeek: prof.hoursPerWeek,
      })

      const pathId = localStorage.getItem('skillpilot_path_id')
      if (pathId) {
        const path = await api.getPath(pathId).catch(() => null)
        if (path) {
          const flat = path.phases.flatMap((p) => p.courses)
          const done = flat.filter((c) => c.status === 'done').length
          setPathProgress(flat.length ? Math.round((done / flat.length) * 100) : 0)
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function persist(patch) {
    if (!profile) return
    try {
      const updated = await api.updateProfile(profile._id, patch)
      setProfile(updated)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSaveEdit() {
    setSaving(true)
    await persist({
      name: editForm.name,
      targetRole: editForm.targetRole,
      timelineMonths: Number(editForm.timelineMonths) || profile.timelineMonths,
      hoursPerWeek: Number(editForm.hoursPerWeek) || profile.hoursPerWeek,
    })
    setSaving(false)
    setIsEditing(false)
  }

  function toggleInterest(interest) {
    const current = profile.interests || []
    const next = current.includes(interest) ? current.filter((i) => i !== interest) : [...current, interest]
    setProfile({ ...profile, interests: next })
    persist({ interests: next })
  }

  function toggleSkill(skillName) {
    const current = profile.currentSkills || []
    const exists = current.some((s) => s.name.toLowerCase() === skillName.toLowerCase())
    const next = exists
      ? current.filter((s) => s.name.toLowerCase() !== skillName.toLowerCase())
      : [...current, { name: skillName, level: 'beginner' }]
    setProfile({ ...profile, currentSkills: next })
    persist({ currentSkills: next })
  }

  function toggleLearningStyle(style) {
    const current = profile.learningStyle || []
    const next = current.includes(style) ? current.filter((s) => s !== style) : [...current, style]
    setProfile({ ...profile, learningStyle: next })
    persist({ learningStyle: next })
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent-orange" size={32} />
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-6">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="mx-auto mb-3 text-accent-orange" size={28} />
          <p className="text-gray-300">{error}</p>
        </GlassCard>
      </div>
    )
  }

  const skillNames = (profile?.currentSkills || []).map((s) => s.name)

  return (
    <div className="min-h-screen pt-24 pb-12 section-padding">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold font-display text-white mb-2">
              Your <span className="gradient-text">Profile</span>
            </h1>
            <p className="text-gray-400">Manage your learning preferences and goals.</p>
          </div>
          <button onClick={() => (isEditing ? handleSaveEdit() : setIsEditing(true))}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
              isEditing ? 'bg-accent-teal text-dark-900' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
            {isEditing ? <Check size={16} /> : <Edit2 size={16} />}
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </motion.div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <GlassCard className="mb-6">
          <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-orange to-accent-purple flex items-center justify-center text-3xl font-bold text-white">
              {profile?.name ? profile.name[0].toUpperCase() : 'U'}
            </div>
            <div className="flex-1 text-center sm:text-left">
              {isEditing ? (
                <div className="space-y-3">
                  <input type="text" value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full sm:w-auto bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-accent-orange/50"
                    placeholder="Your name" />
                  <input type="text" value={editForm.targetRole || ''}
                    onChange={(e) => setEditForm({ ...editForm, targetRole: e.target.value })}
                    className="w-full sm:w-auto bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-accent-orange/50 sm:ml-3"
                    placeholder="Target role" />
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-1">{profile?.name || 'Learner'}</h2>
                  <p className="text-gray-400 text-sm mb-3">{user?.email}</p>
                </>
              )}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                {profile?.experienceLevel && (
                  <span className="px-3 py-1 bg-accent-orange/10 text-accent-orange text-xs font-medium rounded-full capitalize">
                    {profile.experienceLevel}
                  </span>
                )}
                {profile?.targetRole && (
                  <span className="px-3 py-1 bg-accent-teal/10 text-accent-teal text-xs font-medium rounded-full">
                    {profile.targetRole}
                  </span>
                )}
                <span className="px-3 py-1 bg-accent-purple/10 text-accent-purple text-xs font-medium rounded-full">
                  {profile?.hoursPerWeek || 0} hrs/week
                </span>
              </div>
            </div>
            {pathProgress !== null && (
              <ProgressRing progress={pathProgress} size={90} strokeWidth={8} label="Path" />
            )}
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard delay={0.1}>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target size={20} className="text-accent-orange" />
                <h3 className="text-lg font-semibold text-white">Interests</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_INTERESTS.map(interest => (
                  <SkillBadge key={interest} skill={interest}
                    selected={profile?.interests?.includes(interest)} selectable
                    onAdd={toggleInterest} onRemove={toggleInterest} />
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard delay={0.2}>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase size={20} className="text-accent-teal" />
                <h3 className="text-lg font-semibold text-white">Skills</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_SKILLS.map(skill => (
                  <SkillBadge key={skill} skill={skill}
                    selected={skillNames.some((s) => s.toLowerCase() === skill.toLowerCase())} selectable
                    onAdd={toggleSkill} onRemove={toggleSkill} />
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard delay={0.3}>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={20} className="text-accent-cyan" />
                <h3 className="text-lg font-semibold text-white">Learning Style</h3>
                <span className="text-xs text-gray-500">(tap to toggle — you can pick more than one)</span>
              </div>
              <div className="space-y-3">
                {LEARNING_STYLES.map(style => (
                  <button key={style.value} onClick={() => toggleLearningStyle(style.value)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      profile?.learningStyle?.includes(style.value)
                        ? 'border-accent-cyan/50 bg-accent-cyan/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}>
                    <div className="font-medium text-white text-sm">{style.label}</div>
                    <div className="text-xs text-gray-500">{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard delay={0.4}>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target size={20} className="text-accent-purple" />
                <h3 className="text-lg font-semibold text-white">Your Goal</h3>
              </div>
              {profile?.goal ? (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-gray-300">{profile.goal}</p>
                  {profile.timelineMonths && (
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Clock size={12} /> Target: {profile.timelineMonths} months
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No goal set yet.</p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
