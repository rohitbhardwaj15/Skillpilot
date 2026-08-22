import { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import {
  Clock, Target, BookOpen, Award, Zap, Loader2, AlertCircle, TrendingUp
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell
} from 'recharts'
import { setCurrentPath } from '../store/slices/pathSlice'
import { api } from '../lib/api'
import { transformPathResponse } from '../lib/transformPath'
import GlassCard from '../components/ui/GlassCard'
import ProgressRing from '../components/ui/ProgressRing'

const LEVEL_VALUE = { none: 0, beginner: 33, intermediate: 66, advanced: 100 }

export default function DashboardPage() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const { currentPath } = useSelector((state) => state.path)

  const [profile, setProfile] = useState(null)
  const [rawPath, setRawPath] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const prof = await api.getMyProfile()
      setProfile(prof)

      const pathId = localStorage.getItem('skillpilot_path_id')
      if (pathId) {
        const path = await api.getPath(pathId)
        setRawPath(path)
        dispatch(setCurrentPath(transformPathResponse(path)))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [dispatch])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent-orange" size={32} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-6">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="mx-auto mb-3 text-accent-orange" size={28} />
          <p className="text-gray-300">{error}</p>
        </GlassCard>
      </div>
    )
  }

  const flatCourses = rawPath ? rawPath.phases.flatMap((p) => p.courses) : []
  const doneCount = flatCourses.filter((c) => c.status === 'done').length
  const pathProgress = flatCourses.length ? Math.round((doneCount / flatCourses.length) * 100) : 0
  const nextCourse = flatCourses.find((c) => c.status === 'current')
  const skillsGained = profile?.currentSkills?.filter((s) => LEVEL_VALUE[s.level] >= 66).length || 0

  const phaseChartData = rawPath
    ? rawPath.phases.map((p) => {
        const total = p.courses.length
        const done = p.courses.filter((c) => c.status === 'done').length
        return { name: p.title.replace(/^Phase \d+:\s*/, ''), progress: total ? Math.round((done / total) * 100) : 0 }
      })
    : []

  const skillRadarData = (profile?.currentSkills || [])
    .slice(0, 6)
    .map((s) => ({ subject: s.name, A: LEVEL_VALUE[s.level] || 0, fullMark: 100 }))

  return (
    <div className="min-h-screen pt-24 pb-12 section-padding">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold font-display text-white mb-2">
            Welcome back, <span className="gradient-text">{profile?.name || user?.name || 'Learner'}</span> 👋
          </h1>
          <p className="text-gray-400">
            {profile?.targetRole ? `Goal: ${profile.targetRole}` : 'Here is your learning overview.'}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Path Progress', value: `${pathProgress}%`, icon: Target, color: 'text-accent-purple', bg: 'bg-accent-purple/10' },
            { label: 'Courses Done', value: `${doneCount} / ${flatCourses.length}`, icon: BookOpen, color: 'text-accent-teal', bg: 'bg-accent-teal/10' },
            { label: 'Skills Gained', value: skillsGained.toString(), icon: Award, color: 'text-accent-cyan', bg: 'bg-accent-cyan/10' },
            { label: 'Target Timeline', value: profile?.timelineMonths ? `${profile.timelineMonths}mo` : '—', icon: Clock, color: 'text-accent-orange', bg: 'bg-accent-orange/10' },
          ].map((stat, i) => {
            const Icon = stat.icon
            return (
              <GlassCard key={i} delay={i * 0.05}>
                <div className="p-5">
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                    <Icon size={20} className={stat.color} />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              </GlassCard>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <GlassCard className="lg:col-span-2" delay={0.1}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Phase Progress</h3>
                  <p className="text-sm text-gray-500">How far along each phase of your roadmap is</p>
                </div>
                <TrendingUp size={18} className="text-accent-teal" />
              </div>
              {phaseChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={phaseChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#666" fontSize={11} />
                    <YAxis stroke="#666" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="progress" radius={[6, 6, 0, 0]}>
                      {phaseChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.progress === 100 ? '#00d4aa' : '#f5a623'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 py-12 text-center">No roadmap yet — complete onboarding to see phase progress.</p>
              )}
            </div>
          </GlassCard>

          <GlassCard delay={0.2}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-1">Skill Development</h3>
              <p className="text-xs text-gray-500 mb-4">Your current skill levels</p>
              {skillRadarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={skillRadarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" stroke="#888" fontSize={11} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#666" fontSize={10} />
                    <Radar name="Skills" dataKey="A" stroke="#f5a623" fill="#f5a623" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 py-12 text-center">No skills tracked yet.</p>
              )}
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GlassCard className="lg:col-span-2" delay={0.1}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Current Path: {currentPath?.title || 'Not started'}</h3>
                  <p className="text-sm text-gray-500">{currentPath?.description}</p>
                </div>
                <ProgressRing progress={pathProgress} size={80} strokeWidth={6} />
              </div>

              <div className="space-y-4">
                {currentPath?.nodes?.slice(0, 8).map((node, i) => (
                  <div key={node.id} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      node.completed ? 'bg-accent-teal/20 text-accent-teal' : 'bg-white/5 text-gray-500'
                    }`}>
                      {node.completed ? <Award size={14} /> : i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white">{node.title}</span>
                        <span className="text-xs text-gray-500">{node.progress}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${node.progress}%` }}
                          transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                          className={`h-full rounded-full ${node.completed ? 'bg-accent-teal' : 'bg-accent-orange'}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard delay={0.2}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Skill Gaps</h3>
              <div className="space-y-3">
                {(rawPath?.skillGaps || []).slice(0, 6).map((skill, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-orange" />
                    <span className="text-sm text-gray-300">{skill}</span>
                  </div>
                ))}
                {(!rawPath?.skillGaps || rawPath.skillGaps.length === 0) && (
                  <p className="text-sm text-gray-500">No gaps remaining — nicely done!</p>
                )}
              </div>

              {nextCourse && (
                <div className="mt-6 p-4 rounded-xl bg-accent-orange/5 border border-accent-orange/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={16} className="text-accent-orange" />
                    <span className="text-sm font-semibold text-accent-orange">Next Action</span>
                  </div>
                  <p className="text-sm text-gray-300">Complete "{nextCourse.title}" to unlock the next step.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
