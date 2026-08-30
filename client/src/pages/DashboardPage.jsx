import { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, Clock, Target, BookOpen, Award, Zap, Loader2, AlertCircle, TrendingUp, ArrowRight, ShieldCheck } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell } from 'recharts'
import { setCurrentPath } from '../store/slices/pathSlice'
import { api } from '../lib/api'
import { transformPathResponse } from '../lib/transformPath'
import GlassCard from '../components/ui/GlassCard'
import ProgressRing from '../components/ui/ProgressRing'
import PageHero from '../components/ui/PageHero'

const LEVEL_VALUE = { none: 0, beginner: 33, intermediate: 66, advanced: 100 }

export default function DashboardPage() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const { currentPath } = useSelector((state) => state.path)

  const [profile, setProfile] = useState(null)
  const [rawPath, setRawPath] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [insights, setInsights] = useState(null)

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
        try { setInsights(await api.getPathInsights(pathId)) } catch {}
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
          <p className="text-ink-soft">{error}</p>
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
    <div className="min-h-screen pb-12">
      <PageHero
        eyebrow="Dashboard"
        uppercase={false}
        title={<>Welcome back, <span className="text-wave-blush">{profile?.name || user?.name || 'Learner'}</span> 👋</>}
        subtitle={profile?.targetRole ? `Goal: ${profile.targetRole}` : 'Here is your learning overview.'}
      />
      <div className="section-padding -mt-8 relative z-10">
      <div className="max-w-7xl mx-auto">
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
                  <div className="text-2xl font-bold text-ink mb-1">{stat.value}</div>
                  <div className="text-xs text-ink-faint">{stat.label}</div>
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
                  <h3 className="text-lg font-semibold text-ink">Phase Progress</h3>
                  <p className="text-sm text-ink-faint">How far along each phase of your roadmap is</p>
                </div>
                <TrendingUp size={18} className="text-accent-teal" />
              </div>
              {phaseChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={phaseChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,21,26,0.08)" />
                    <XAxis dataKey="name" stroke="#8A8FA3" fontSize={11} />
                    <YAxis stroke="#8A8FA3" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E5ED', borderRadius: '8px', boxShadow: '0 4px 12px rgba(20,21,26,0.08)' }}
                      labelStyle={{ color: '#14151A' }}
                    />
                    <Bar dataKey="progress" radius={[6, 6, 0, 0]}>
                      {phaseChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.progress === 100 ? '#0E9C8F' : '#D97B0F'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-ink-faint py-12 text-center">No roadmap yet — complete onboarding to see phase progress.</p>
              )}
            </div>
          </GlassCard>

          <GlassCard delay={0.2}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-ink mb-1">Skill Development</h3>
              <p className="text-xs text-ink-faint mb-4">Your current skill levels</p>
              {skillRadarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={skillRadarData}>
                    <PolarGrid stroke="rgba(20,21,26,0.1)" />
                    <PolarAngleAxis dataKey="subject" stroke="#5B6072" fontSize={11} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#8A8FA3" fontSize={10} />
                    <Radar name="Skills" dataKey="A" stroke="#D97B0F" fill="#D97B0F" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-ink-faint py-12 text-center">No skills tracked yet.</p>
              )}
            </div>
          </GlassCard>
        </div>

        <div className="mb-8">
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-lg font-semibold text-ink flex items-center gap-2"><Brain size={18} className="text-accent-orange" /> Evidence-backed Skill Knowledge</h3>
                  <p className="text-sm text-ink-faint">Your mastery estimate combines self-report, course completion and feedback.</p>
                </div>
                <Link to="/assessment" className="shrink-0 text-sm font-semibold px-4 py-2 rounded-xl bg-accent-orange text-white hover:opacity-90 transition">Take an Assessment</Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(profile?.knowledgeState || []).slice(0, 8).map((k) => (
                  <div key={k.skill} className="rounded-xl bg-surface-alt border border-border p-3">
                    <div className="flex justify-between gap-2 text-sm text-ink"><span className="truncate">{k.skill}</span><span>{Math.round(k.level * 100)}%</span></div>
                    <div className="h-1.5 mt-2 bg-border rounded-full overflow-hidden"><div className="h-full bg-accent-teal rounded-full" style={{width:`${Math.round(k.level*100)}%`}} /></div>
                    <div className="text-[10px] text-ink-faint mt-2">Confidence {Math.round(k.confidence*100)}%</div>
                  </div>
                ))}
                {(!profile?.knowledgeState || profile.knowledgeState.length === 0) && <p className="text-sm text-ink-faint">Complete a course or give feedback to build your first evidence-backed skill estimate.</p>}
              </div>
            </div>
          </GlassCard>
        </div>

        {insights && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <GlassCard className="lg:col-span-2">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div><div className="flex items-center gap-2"><ShieldCheck size={19} className="text-accent-teal"/><h3 className="text-lg font-semibold text-ink">Career Readiness</h3></div>
                  <p className="text-sm text-ink-faint mt-1">Evidence-backed readiness for {insights.role}</p></div>
                <span className="text-3xl font-bold text-accent-teal">{insights.readinessScore}%</span>
              </div>
              <div className="h-3 mt-5 bg-border rounded-full overflow-hidden"><motion.div initial={{width:0}} animate={{width:`${insights.readinessScore}%`}} transition={{duration:1}} className="h-full bg-accent-teal rounded-full"/></div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
                {insights.skills.slice(0,9).map(s => <div key={s.skill} className="rounded-xl bg-surface-alt border border-border p-3"><div className="flex justify-between text-xs text-ink-soft"><span>{s.skill}</span><span>{Math.round(s.level*100)}%</span></div><div className="h-1.5 mt-2 bg-border rounded-full"><div className="h-full bg-accent-orange rounded-full" style={{width:`${Math.round(s.level*100)}%`}}/></div><span className={`text-[10px] mt-1 inline-block ${s.status==='mastered'?'text-accent-teal':s.status==='learning'?'text-accent-orange':'text-red-400'}`}>{s.status}</span></div>)}
              </div>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="p-6 h-full flex flex-col">
              <p className="text-xs uppercase tracking-wider text-accent-orange font-bold">🎯 Next Best Action</p>
              {insights.nextBestAction ? <><h3 className="text-xl font-bold text-ink mt-2">{insights.nextBestAction.title}</h3><p className="text-sm text-ink-soft mt-2">{insights.nextBestAction.reason}</p><div className="mt-4 text-xs text-ink-faint">Focus skill: <span className="text-ink-soft">{insights.nextBestAction.skill}</span> · ~{insights.nextBestAction.estimatedWeeks} week{insights.nextBestAction.estimatedWeeks === 1 ? '' : 's'}</div><a href="/paths" className="mt-auto pt-5 flex items-center gap-2 text-sm font-semibold text-accent-orange">Start learning <ArrowRight size={15}/></a></> : <p className="text-sm text-accent-teal mt-3">🎉 You have no major remaining skill gaps.</p>}
            </div>
          </GlassCard>
        </div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GlassCard className="lg:col-span-2" delay={0.1}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-ink">Current Path: {currentPath?.title || 'Not started'}</h3>
                  <p className="text-sm text-ink-faint">{currentPath?.description}</p>
                </div>
                <ProgressRing progress={pathProgress} size={80} strokeWidth={6} />
              </div>

              <div className="space-y-4">
                {currentPath?.nodes?.slice(0, 8).map((node, i) => (
                  <div key={node.id} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      node.completed ? 'bg-accent-teal/20 text-accent-teal' : 'bg-surface-alt text-ink-faint'
                    }`}>
                      {node.completed ? <Award size={14} /> : i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-ink">{node.title}</span>
                        <span className="text-xs text-ink-faint">{node.progress}%</span>
                      </div>
                      <div className="h-2 bg-border rounded-full overflow-hidden">
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
              <h3 className="text-lg font-semibold text-ink mb-4">Skill Gaps</h3>
              <div className="space-y-3">
                {(rawPath?.skillGaps || []).slice(0, 6).map((skill, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-alt border border-border">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-orange" />
                    <span className="text-sm text-ink-soft">{skill}</span>
                  </div>
                ))}
                {(!rawPath?.skillGaps || rawPath.skillGaps.length === 0) && (
                  <p className="text-sm text-ink-faint">No gaps remaining — nicely done!</p>
                )}
              </div>

              {nextCourse && (
                <div className="mt-6 p-4 rounded-xl bg-accent-orange/5 border border-accent-orange/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={16} className="text-accent-orange" />
                    <span className="text-sm font-semibold text-accent-orange">Next Action</span>
                  </div>
                  <p className="text-sm text-ink-soft">Complete "{nextCourse.title}" to unlock the next step.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
      </div>
    </div>
  )
}
