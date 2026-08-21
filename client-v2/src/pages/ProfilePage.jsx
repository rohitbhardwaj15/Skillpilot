import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { User, Briefcase, Clock, BookOpen, Target, Edit2, Check, Info } from 'lucide-react'
import { setProfile, addInterest, removeInterest, addSkill } from '../store/slices/userSlice'
import GlassCard from '../components/ui/GlassCard'
import SkillBadge from '../components/ui/SkillBadge'
import ProgressRing from '../components/ui/ProgressRing'

const LEARNING_STYLES = [
  { value: 'visual', label: 'Visual', desc: 'Learn through images, diagrams, and videos' },
  { value: 'auditory', label: 'Auditory', desc: 'Learn through listening and discussions' },
  { value: 'reading', label: 'Reading/Writing', desc: 'Learn through reading and note-taking' },
  { value: 'kinesthetic', label: 'Kinesthetic', desc: 'Learn through hands-on practice' },
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
  const dispatch = useDispatch()
  const { profile } = useSelector(state => state.user)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ ...profile })

  const handleSave = () => {
    dispatch(setProfile(editForm))
    setIsEditing(false)
  }

  const toggleInterest = (interest) => {
    if (profile.interests?.includes(interest)) {
      dispatch(removeInterest(interest))
    } else {
      dispatch(addInterest(interest))
    }
  }

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
          <button onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isEditing ? 'bg-accent-teal text-dark-900' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
            {isEditing ? <Check size={16} /> : <Edit2 size={16} />}
            {isEditing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </motion.div>

        <GlassCard className="mb-6">
          <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-orange to-accent-purple flex items-center justify-center text-3xl font-bold text-white">
              {profile.name ? profile.name[0].toUpperCase() : 'U'}
            </div>
            <div className="flex-1 text-center sm:text-left">
              {isEditing ? (
                <div className="space-y-3">
                  <input type="text" value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full sm:w-auto bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-accent-orange/50"
                    placeholder="Your name" />
                  <input type="email" value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full sm:w-auto bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-accent-orange/50 ml-0 sm:ml-3"
                    placeholder="Email" />
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-1">{profile.name || 'Learner'}</h2>
                  <p className="text-gray-400 text-sm mb-3">{profile.email || 'No email set'}</p>
                </>
              )}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <span className="px-3 py-1 bg-accent-orange/10 text-accent-orange text-xs font-medium rounded-full capitalize">
                  {profile.experience}
                </span>
                <span className="px-3 py-1 bg-accent-teal/10 text-accent-teal text-xs font-medium rounded-full capitalize">
                  {profile.learningStyle} Learner
                </span>
                <span className="px-3 py-1 bg-accent-purple/10 text-accent-purple text-xs font-medium rounded-full">
                  {profile.timePerWeek} hrs/week
                </span>
              </div>
            </div>
            <ProgressRing progress={42} size={90} strokeWidth={8} label="Overall" />
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
                    selected={profile.interests?.includes(interest)} selectable
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
                    selected={profile.skills?.includes(skill)} selectable
                    onAdd={(s) => dispatch(addSkill(s))}
                    onRemove={(s) => dispatch({ type: 'user/removeSkill', payload: s })} />
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard delay={0.3}>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={20} className="text-accent-cyan" />
                <h3 className="text-lg font-semibold text-white">Learning Style</h3>
              </div>
              <div className="space-y-3">
                {LEARNING_STYLES.map(style => (
                  <button key={style.value}
                    onClick={() => isEditing && setEditForm({ ...editForm, learningStyle: style.value })}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      profile.learningStyle === style.value
                        ? 'border-accent-cyan/50 bg-accent-cyan/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    } ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}>
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
                <h3 className="text-lg font-semibold text-white">Your Goals</h3>
              </div>
              <div className="space-y-3">
                {profile.goals?.length > 0 ? (
                  profile.goals.map((goal, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-sm text-gray-300">{goal}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No goals set yet. Start by telling us what you want to achieve!</p>
                )}
              </div>
            </div>
          </GlassCard>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-600">
          <Info size={14} />
          <span>Profile data is stored locally in your browser session for this demo.</span>
        </motion.div>
      </div>
    </div>
  )
}
