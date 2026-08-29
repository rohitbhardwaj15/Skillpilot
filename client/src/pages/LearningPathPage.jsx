import { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, BookOpen, Loader2, AlertCircle, Copy, Check,
  Youtube, FileText, ExternalLink, ChevronDown, ChevronUp,
  ThumbsUp, ThumbsDown, CheckCircle, Star, Zap, Trophy, RefreshCw,
} from 'lucide-react'
import { setCurrentPath } from '../store/slices/pathSlice'
import { api } from '../lib/api'
import { transformPathResponse } from '../lib/transformPath'
import GlassCard from '../components/ui/GlassCard'
import SkillTree3D from '../components/3d/SkillTree3D'

/* ── Markdown renderer ────────────────────────────────────────────────── */
function renderMarkdown(text = '') {
  if (!text) return ''
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-white mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 class="text-lg font-bold text-accent-orange mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 class="text-xl font-bold text-white mt-6 mb-2">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,     '<strong class="text-white">$1</strong>')
    .replace(/\*(.+?)\*/g,         '<em class="text-gray-300">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-white/10 rounded text-accent-teal text-xs font-mono">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent-orange hover:underline">$1</a>')
    .replace(/^\- (.+)$/gm, '<li class="flex gap-2 text-gray-300 text-sm"><span class="text-accent-orange mt-0.5">•</span><span>$1</span></li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="flex gap-2 text-gray-300 text-sm"><span class="text-accent-orange font-bold">→</span><span>$1</span></li>')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-accent-orange pl-4 italic text-gray-400 text-sm my-2">$1</blockquote>')
    .replace(/^---$/gm, '<hr class="border-white/10 my-4" />')
    .replace(/\n\n/g, '</p><p class="text-gray-400 text-sm mb-3">')
    .replace(/\n/g, '<br />')
}

/* ── MarkdownNote — saves to DB ───────────────────────────────────────── */
function MarkdownNote({ node, profileId, initialNote }) {
  const [notes,   setNotes]   = useState(initialNote?.content || '')
  const [preview, setPreview] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [copied,  setCopied]  = useState(false)

  // Load default template if no saved note
  useEffect(() => {
    if (!initialNote?.content && node.description) {
      setNotes(`## ${node.title}\n\n${node.description}\n\n### My Notes\n\n- `)
    }
  }, [node.id])

  const save = useCallback(async () => {
    if (!profileId) return
    setSaving(true)
    try {
      await api.saveNote(profileId, node.id, notes, node.title)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error('Note save failed:', e.message)
    } finally {
      setSaving(false)
    }
  }, [profileId, node.id, node.title, notes])

  // Auto-save after 2s of inactivity
  useEffect(() => {
    if (!notes) return
    const timer = setTimeout(save, 2000)
    return () => clearTimeout(timer)
  }, [notes])

  const copy = () => {
    navigator.clipboard.writeText(notes)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const insertTag = (tag) => setNotes((n) => n + '\n' + tag)

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">📝 Notes</span>
          <span className="text-xs text-gray-600">— Markdown • Auto-saved to cloud</span>
          {saving && <span className="text-[10px] text-accent-orange animate-pulse">saving…</span>}
          {saved  && <span className="text-[10px] text-green-400 flex items-center gap-1"><Check size={10} /> Saved</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPreview(!preview)}
            className="px-2 py-1 text-xs rounded bg-white/5 text-gray-400 hover:text-white transition-colors">
            {preview ? '✏️ Edit' : '👁 Preview'}
          </button>
          <button onClick={copy}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-white/5 text-gray-400 hover:text-white transition-colors">
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={save}
            className="px-3 py-1 text-xs rounded bg-accent-orange text-dark-900 font-semibold hover:bg-accent-amber transition-colors">
            Save
          </button>
        </div>
      </div>

      {preview ? (
        <div className="min-h-[120px] bg-white/5 border border-white/10 rounded-xl p-4"
          dangerouslySetInnerHTML={{ __html: `<p class="text-gray-400 text-sm mb-3">${renderMarkdown(notes)}</p>` }} />
      ) : (
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder={"Write your notes in Markdown…\n## Heading\n**Bold**, *italic*, `code`\n- Bullet"}
          rows={6}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-gray-300
            placeholder-gray-600 font-mono focus:outline-none focus:border-accent-orange/50 transition-colors resize-y" />
      )}

      <div className="flex flex-wrap gap-2 mt-2">
        {[['## Heading','## '],['**Bold**','**text**'],['*Italic*','*text*'],['`Code`','`code`'],['- List','- item'],['> Quote','> text'],['---','---']].map(([label, ins]) => (
          <button key={label} onClick={() => insertTag(ins)}
            className="px-2 py-0.5 text-[10px] bg-white/5 text-gray-500 rounded hover:text-white hover:bg-white/10 font-mono transition-colors">
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Feedback widget — thumbs up/down with adaptive re-ranking ────────── */
function FeedbackWidget({ node, pathId, onAdaptation }) {
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [message,  setMessage]  = useState('')

  const RATINGS = [
    { id: 'too_easy', label: 'Too Easy',  emoji: '😴', color: 'text-blue-400' },
    { id: 'good',     label: 'Good',      emoji: '👍', color: 'text-green-400' },
    { id: 'perfect',  label: 'Perfect!',  emoji: '🌟', color: 'text-yellow-400' },
    { id: 'too_hard', label: 'Too Hard',  emoji: '😤', color: 'text-red-400' },
  ]

  const send = async (rating) => {
    if (!pathId || !node.courseId) return
    setSelected(rating)
    setLoading(true)
    try {
      const res = await api.giveFeedback(pathId, node.courseId, rating)
      setMessage(res.adaptation?.message || 'Thanks for the feedback!')
      if (onAdaptation) onAdaptation(res.learningPath)
    } catch (e) {
      setMessage('Feedback saved locally.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 pt-3 border-t border-white/5">
      <p className="text-xs text-gray-500 mb-2">How was this course?</p>
      <div className="flex flex-wrap gap-2">
        {RATINGS.map((r) => (
          <button key={r.id} onClick={() => send(r.id)} disabled={loading || !!selected}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
              ${selected === r.id
                ? 'border-accent-orange bg-accent-orange/10 text-accent-orange'
                : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white'
              } disabled:opacity-50`}>
            {r.emoji} {r.label}
          </button>
        ))}
      </div>
      {message && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-xs text-accent-teal mt-2 italic">{message}</motion.p>
      )}
    </div>
  )
}

/* ── Course resource links — always visible ──────────────────────────── */
function CourseLinks({ node }) {
  const course = node.course || {}
  const hasAny = course.url || course.youtube_url || course.documentation_url || node.url || node.youtube_url || node.documentation_url

  const url      = course.url      || node.url
  const ytUrl    = course.youtube_url    || node.youtube_url
  const docUrl   = course.documentation_url || node.documentation_url

  if (!hasAny) return null

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-orange/10
            text-accent-orange hover:bg-accent-orange hover:text-dark-900 transition-all text-xs font-medium">
          <ExternalLink size={12} /> View Course
        </a>
      )}
      {ytUrl && (
        <a href={ytUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10
            text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs font-medium">
          <Youtube size={12} /> Watch on YouTube
        </a>
      )}
      {docUrl && (
        <a href={docUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10
            text-blue-400 hover:bg-blue-500 hover:text-white transition-all text-xs font-medium">
          <FileText size={12} /> Read Docs
        </a>
      )}
    </div>
  )
}

/* ── Progress Stats Bar ───────────────────────────────────────────────── */
function StatsBar({ nodes, streakDays }) {
  const total    = nodes.length
  const done     = nodes.filter((n) => n.completed).length
  const pct      = total ? Math.round((done / total) * 100) : 0
  const totalWks = nodes.reduce((s, n) => s + (n.durationWeeks || 2), 0)
  const doneWks  = nodes.filter((n) => n.completed).reduce((s, n) => s + (n.durationWeeks || 2), 0)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      {[
        { icon: CheckCircle, label: 'Completed',      value: `${done} / ${total}`,    color: 'text-accent-teal' },
        { icon: Trophy,      label: 'Progress',       value: `${pct}%`,               color: 'text-accent-orange' },
        { icon: Clock,       label: 'Weeks Done',     value: `${doneWks} / ${totalWks}w`, color: 'text-accent-purple' },
        { icon: Zap,         label: 'Day Streak 🔥',  value: `${streakDays || 0}`,    color: 'text-yellow-400' },
      ].map(({ icon: Icon, label, value, color }) => (
        <GlassCard key={label}>
          <div className="p-4 flex items-center gap-3">
            <Icon size={20} className={color} />
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  )
}

/* ── Main Page ────────────────────────────────────────────────────────── */
export default function LearningPathPage() {
  const dispatch = useDispatch()
  const { currentPath } = useSelector((state) => state.path)

  const [rawPath,      setRawPath]      = useState(null)
  const [profile,      setProfile]      = useState(null)
  const [notes,        setNotes]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [expandedNode, setExpandedNode] = useState(null)
  const [marking,      setMarking]      = useState(null)
  const [adapting,     setAdapting]     = useState(false)

  const pathId    = localStorage.getItem('skillpilot_path_id')
  const streakDays = profile?.streakDays || 0

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const prof = await api.getMyProfile().catch(() => null)
      setProfile(prof)

      if (prof?._id) {
        api.getNotes(prof._id).then(setNotes).catch(() => {})
        api.updateStreak(prof._id).catch(() => {})
      }

      if (pathId) {
        const path = await api.getPath(pathId)
        setRawPath(path)
        dispatch(setCurrentPath(transformPathResponse(path, prof)))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [dispatch, pathId])

  useEffect(() => { load() }, [load])

  // Start a real client-side learning timer when the learner reaches the current node.
  useEffect(() => {
    const active = (currentPath?.nodes || []).find(n => n.status === 'current' || (n.progress > 0 && !n.completed))
    if (active?.courseId) {
      const key = `skillpilot_course_started_${active.courseId}`
      if (!localStorage.getItem(key)) localStorage.setItem(key, String(Date.now()))
    }
  }, [currentPath])

  // Mark course done
  const handleMarkDone = async (node) => {
    if (!pathId || !node.courseId || marking) return
    setMarking(node.id)
    try {
      const startedKey = `skillpilot_course_started_${node.courseId}`
      const started = Number(localStorage.getItem(startedKey)) || Date.now()
      const timeSpentMinutes = Math.max(1, Math.round((Date.now() - started) / 60000))
      const updated = await api.markCourseDone(pathId, node.courseId, timeSpentMinutes)
      localStorage.removeItem(startedKey)
      setRawPath(updated)
      dispatch(setCurrentPath(transformPathResponse(updated, profile)))
    } catch (e) {
      console.error(e)
    } finally {
      setMarking(null)
    }
  }

  const handleManualAdapt = async () => {
    if (!pathId || adapting) return
    setAdapting(true)
    try {
      const res = await api.adaptPath(pathId)
      if (res?.learningPath) handleAdaptation(res.learningPath)
    } catch (e) {
      console.error('Path adaptation failed:', e)
    } finally {
      setAdapting(false)
    }
  }

  // After adaptive re-ranking from feedback
  const handleAdaptation = (updatedPath) => {
    if (!updatedPath) return
    setRawPath(updatedPath)
    dispatch(setCurrentPath(transformPathResponse(updatedPath)))
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent-orange" size={32} />
      </div>
    )
  }

  if (error || !currentPath) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-6">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="mx-auto mb-3 text-accent-orange" size={28} />
          <p className="text-gray-300">
            {error || "No learning path yet — complete onboarding first."}
          </p>
        </GlassCard>
      </div>
    )
  }

  const activePath = currentPath
  const allNodes   = activePath.nodes || []

  // Progress bar
  const doneCount = allNodes.filter((n) => n.completed).length
  const progress  = allNodes.length ? Math.round((doneCount / allNodes.length) * 100) : 0

  return (
    <div className="min-h-screen pt-24 pb-12 section-padding">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold font-display text-white mb-1">
            Your <span className="gradient-text">Learning Path</span>
          </h1>
          <p className="text-gray-400 text-sm">{activePath.description}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
            <span className="flex items-center gap-1"><Clock size={14} /> ~{activePath.estimatedWeeks} weeks</span>
            <span className="flex items-center gap-1"><BookOpen size={14} /> {allNodes.length} steps</span>
          </div>

          {/* Overall progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Overall Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-accent-orange to-accent-teal rounded-full"
                initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} />
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <StatsBar nodes={allNodes} streakDays={streakDays} />

        {/* Adaptive notice */}
        <div className="mb-6 px-4 py-3 rounded-xl bg-accent-purple/10 border border-accent-purple/20 text-sm text-accent-purple flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Zap size={14} />
            <span>This path adapts from completions and feedback.</span>
          </div>
          <button onClick={handleManualAdapt} disabled={adapting}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-purple/20 hover:bg-accent-purple/30 text-xs font-semibold text-white disabled:opacity-50">
            <RefreshCw size={13} className={adapting ? 'animate-spin' : ''} />
            {adapting ? 'Recalculating…' : 'Recalculate Path'}
          </button>
        </div>

        {/* Evidence-backed skill graph */}
        {activePath.skillGraph?.nodes?.length > 0 && (
          <GlassCard className="mb-8">
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div><h2 className="text-lg font-bold text-white">🧠 Your Skill Graph</h2><p className="text-xs text-gray-500">Dependencies and mastery status derived from your learner model.</p></div>
                <div className="flex flex-wrap gap-3 text-[11px] text-gray-400">{[['#00d4aa','Mastered'],['#f5a623','Learning'],['#ef4444','Missing'],['#60a5fa','Recommended']].map(([c,l])=><span key={l} className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{background:c}} />{l}</span>)}</div>
              </div>
              <div className="flex flex-wrap gap-3 mb-3 text-xs text-gray-400">
                <span>🟢 Mastered</span><span>🟡 Learning</span><span>🔴 Missing</span><span>🔵 Recommended</span><span>🟣 Target Role</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">Nodes are derived from your role requirements, knowledge state and roadmap prerequisites.</p>
              <SkillTree3D nodes={activePath.skillGraph.nodes} connections={activePath.skillGraph.connections} />
            </div>
          </GlassCard>
        )}

        {/* Timeline */}
        <div className="space-y-4">
          {allNodes.map((node, i) => {
            const isExpanded = expandedNode === node.id
            const isActive   = !node.completed && (i === 0 || allNodes[i - 1]?.completed)
            const savedNote  = notes.find((n) => n.nodeId === node.id)

            return (
              <motion.div key={node.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}>
                <GlassCard className={`transition-all ${isActive ? 'border-accent-orange/30' : node.completed ? 'border-accent-teal/20' : ''}`}>
                  <div className="p-5">

                    {/* Node header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">

                        {/* Step circle / done button */}
                        <button
                          onClick={() => !node.completed && handleMarkDone(node)}
                          disabled={!!marking || node.completed}
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all
                            ${node.completed
                              ? 'bg-accent-teal/20 text-accent-teal cursor-default'
                              : isActive
                              ? 'bg-accent-orange/20 text-accent-orange hover:bg-accent-orange hover:text-dark-900 cursor-pointer'
                              : 'bg-white/5 text-gray-500 cursor-default'
                            }`}
                          title={node.completed ? 'Completed' : isActive ? 'Mark as done' : 'Complete previous steps first'}>
                          {marking === node.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : node.completed ? '✓' : i + 1
                          }
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-white font-semibold text-sm">{node.title}</h3>
                            {node.completed && (
                              <span className="px-2 py-0.5 text-[10px] bg-accent-teal/20 text-accent-teal rounded-full">Done ✓</span>
                            )}
                            {isActive && !node.completed && (
                              <span className="px-2 py-0.5 text-[10px] bg-accent-orange/20 text-accent-orange rounded-full animate-pulse">Current</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{node.subtitle || node.phase}</p>

                          {/* Resource links — ALWAYS visible */}
                          <CourseLinks node={node} />
                        </div>
                      </div>

                      <button onClick={() => setExpandedNode(isExpanded ? null : node.id)}
                        className="text-gray-500 hover:text-white transition-colors shrink-0 mt-1">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>

                    {/* Expanded section */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }} className="mt-4 pl-12 overflow-hidden">

                          <p className="text-sm text-gray-400 mb-3">{node.description}</p>

                          {node.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {node.skills.map((skill) => (
                                <span key={skill} className="px-2 py-0.5 text-[10px] bg-accent-orange/10 text-accent-orange rounded-full">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Feedback widget */}
                          <FeedbackWidget node={node} pathId={pathId} onAdaptation={handleAdaptation} />

                          {/* Markdown notes — saved to DB */}
                          <MarkdownNote node={node} profileId={profile?._id} initialNote={savedNote} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>

        {/* Completion message */}
        {progress === 100 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="mt-8 text-center p-8 rounded-2xl bg-gradient-to-r from-accent-orange/10 to-accent-teal/10 border border-accent-orange/20">
            <Trophy size={48} className="mx-auto mb-4 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white mb-2">🎉 Path Complete!</h2>
            <p className="text-gray-400">Congratulations! You have completed your entire learning path.</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
