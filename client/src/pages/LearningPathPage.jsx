import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import {
  Clock, BookOpen, Loader2, AlertCircle, Copy, Check,
  Youtube, FileText, ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react'
import { setCurrentPath } from '../store/slices/pathSlice'
import { api } from '../lib/api'
import { transformPathResponse } from '../lib/transformPath'
import SkillTree3D from '../components/3d/SkillTree3D'
import GlassCard from '../components/ui/GlassCard'
import TimelineNode from '../components/ui/TimelineNode'

/* ── tiny markdown renderer (no extra library needed) ─────────────────── */
function renderMarkdown(text = '') {
  if (!text) return ''
  return text
    // headings
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-white mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 class="text-lg font-bold text-accent-orange mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 class="text-xl font-bold text-white mt-6 mb-2">$1</h1>')
    // bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,     '<strong class="text-white">$1</strong>')
    .replace(/\*(.+?)\*/g,         '<em class="text-gray-300">$1</em>')
    // inline code
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-white/10 rounded text-accent-teal text-xs font-mono">$1</code>')
    // links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent-orange hover:underline">$1</a>')
    // unordered list
    .replace(/^\- (.+)$/gm, '<li class="flex gap-2 text-gray-300 text-sm"><span class="text-accent-orange mt-0.5">•</span><span>$1</span></li>')
    // ordered list
    .replace(/^\d+\. (.+)$/gm, '<li class="flex gap-2 text-gray-300 text-sm"><span class="text-accent-orange font-bold">→</span><span>$1</span></li>')
    // blockquote
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-accent-orange pl-4 italic text-gray-400 text-sm my-2">$1</blockquote>')
    // horizontal rule
    .replace(/^---$/gm, '<hr class="border-white/10 my-4" />')
    // paragraphs — blank lines
    .replace(/\n\n/g, '</p><p class="text-gray-400 text-sm mb-3">')
    // newlines
    .replace(/\n/g, '<br />')
}

/* ── MarkdownNote component ────────────────────────────────────────────── */
function MarkdownNote({ node }) {
  const [notes, setNotes]       = useState(node.notes || '')
  const [editing, setEditing]   = useState(false)
  const [preview, setPreview]   = useState(false)
  const [copied,  setCopied]    = useState(false)

  const storageKey = `skillpilot_notes_${node.id}`

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) setNotes(saved)
    else if (node.description) setNotes(`## ${node.title}\n\n${node.description}\n\n### My Notes\n\n- `)
  }, [node.id])

  const save = () => {
    localStorage.setItem(storageKey, notes)
    setEditing(false)
  }

  const copy = () => {
    navigator.clipboard.writeText(notes)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-4">
      {/* toolbar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">📝 Notes</span>
          <span className="text-xs text-gray-600">— Markdown supported</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPreview(!preview)}
            className="px-2 py-1 text-xs rounded bg-white/5 text-gray-400 hover:text-white transition-colors">
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button onClick={copy}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-white/5 text-gray-400 hover:text-white transition-colors">
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {editing && (
            <button onClick={save}
              className="px-3 py-1 text-xs rounded bg-accent-orange text-dark-900 font-semibold hover:bg-accent-amber transition-colors">
              Save
            </button>
          )}
        </div>
      </div>

      {preview ? (
        /* Preview mode */
        <div
          className="min-h-[120px] bg-white/5 border border-white/10 rounded-xl p-4 prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: `<p class="text-gray-400 text-sm mb-3">${renderMarkdown(notes)}</p>` }}
        />
      ) : (
        /* Edit mode */
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setEditing(true) }}
          placeholder="Write your notes in Markdown...&#10;## Heading&#10;**Bold**, *italic*, `code`&#10;- Bullet point"
          rows={6}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-gray-300
            placeholder-gray-600 font-mono focus:outline-none focus:border-accent-orange/50
            transition-colors resize-y"
        />
      )}

      {/* Quick markdown cheatsheet */}
      <div className="flex flex-wrap gap-3 mt-2">
        {[
          ['## Heading', '## Title'],
          ['**Bold**',   '**text**'],
          ['*Italic*',   '*text*'],
          ['`Code`',     '`code`'],
          ['- List',     '- item'],
          ['> Quote',    '> text'],
        ].map(([label, insert]) => (
          <button key={label}
            onClick={() => { setNotes((n) => n + '\n' + insert); setEditing(true) }}
            className="px-2 py-0.5 text-[10px] bg-white/5 text-gray-500 rounded hover:text-white hover:bg-white/10 font-mono transition-colors">
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── CourseLinks component ─────────────────────────────────────────────── */
function CourseLinks({ node }) {
  const [open, setOpen] = useState(false)
  const course = node.course || {}

  const hasLinks = course.url || course.youtube_url || course.documentation_url
  if (!hasLinks) return null

  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-accent-orange hover:underline">
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {open ? 'Hide resources' : 'View resources'}
      </button>

      {open && (
        <div className="flex flex-col gap-2 mt-2">
          {course.url && (
            <a href={course.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-orange/10
                text-accent-orange hover:bg-accent-orange hover:text-dark-900 transition-all text-xs font-medium">
              <ExternalLink size={12} /> View Course
            </a>
          )}
          {course.youtube_url && (
            <a href={course.youtube_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10
                text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs font-medium">
              <Youtube size={12} /> Watch on YouTube
            </a>
          )}
          {course.documentation_url && (
            <a href={course.documentation_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10
                text-blue-400 hover:bg-blue-500 hover:text-white transition-all text-xs font-medium">
              <FileText size={12} /> Read Documentation
            </a>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Main component ────────────────────────────────────────────────────── */
export default function LearningPathPage() {
  const dispatch     = useDispatch()
  const { currentPath } = useSelector((state) => state.path)
  const [viewMode,      setViewMode]      = useState('timeline')
  const [selectedNode,  setSelectedNode]  = useState(null)
  const [expandedNode,  setExpandedNode]  = useState(null)
  const [loading,       setLoading]       = useState(!currentPath)
  const [error,         setError]         = useState('')

  useEffect(() => {
    if (currentPath) { setLoading(false); return }
    const pathId = localStorage.getItem('skillpilot_path_id')
    if (!pathId) { setLoading(false); return }
    api.getPath(pathId)
      .then((path) => dispatch(setCurrentPath(transformPathResponse(path))))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [currentPath, dispatch])

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
            {error || "You don't have a learning path yet — complete onboarding to generate one."}
          </p>
        </GlassCard>
      </div>
    )
  }

  const activePath = currentPath

  const get3DNodes = (path) =>
    path.nodes.map((node, i) => ({
      id:        node.id,
      position:  [0, (path.nodes.length - 1 - i) * 2 - 4, 0],
      color:     node.completed ? '#00d4aa' : i === 0 || path.nodes[i - 1]?.completed ? '#f5a623' : '#666',
      label:     node.title,
      completed: node.completed,
    }))

  const get3DConnections = (path) => {
    const connections = []
    for (let i = 0; i < path.nodes.length - 1; i++) {
      connections.push({
        start:    [0, (path.nodes.length - 1 - i) * 2 - 4, 0],
        end:      [0, (path.nodes.length - 1 - (i + 1)) * 2 - 4, 0],
        color:    path.nodes[i].completed ? '#00d4aa' : '#f5a623',
        animated: !path.nodes[i].completed,
      })
    }
    return connections
  }

  return (
    <div className="min-h-screen pt-24 pb-12 section-padding">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold font-display text-white mb-2">
            Your <span className="gradient-text">Learning Path</span>
          </h1>
          <p className="text-gray-400">{activePath.description}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
            <span className="flex items-center gap-1"><Clock size={14} /> ~{activePath.estimatedWeeks} weeks</span>
            <span className="flex items-center gap-1"><BookOpen size={14} /> {activePath.nodes.length} steps</span>
          </div>
        </motion.div>

        {/* View toggle */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">{activePath.title}</h2>
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            {['timeline', '3d'].map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                  viewMode === mode ? 'bg-accent-orange text-dark-900' : 'text-gray-400 hover:text-white'}`}>
                {mode === 'timeline' ? 'Timeline' : '3D View'}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'timeline' ? (
          <div className="space-y-4 max-w-3xl">
            {activePath.nodes?.map((node, i) => {
              const isExpanded = expandedNode === node.id
              const isActive   = !node.completed && (i === 0 || activePath.nodes[i - 1]?.completed)
              return (
                <motion.div key={node.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}>
                  <GlassCard className={`transition-all ${isActive ? 'border-accent-orange/30' : ''}`}>
                    <div className="p-5">
                      {/* Node header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          {/* Step number */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            node.completed ? 'bg-accent-teal/20 text-accent-teal' :
                            isActive       ? 'bg-accent-orange/20 text-accent-orange' :
                                             'bg-white/5 text-gray-500'
                          }`}>
                            {node.completed ? '✓' : i + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold">{node.title}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{node.subtitle || node.phase}</p>
                          </div>
                        </div>
                        <button onClick={() => setExpandedNode(isExpanded ? null : node.id)}
                          className="text-gray-500 hover:text-white transition-colors shrink-0">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 pl-11">
                          <p className="text-sm text-gray-400 mb-3">{node.description}</p>

                          {/* Skills */}
                          {node.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {node.skills.map((skill) => (
                                <span key={skill} className="px-2 py-0.5 text-[10px] bg-accent-orange/10 text-accent-orange rounded-full">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Course resource links */}
                          <CourseLinks node={node} />

                          {/* Markdown Notes */}
                          <MarkdownNote node={node} />
                        </motion.div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-6">
            <SkillTree3D
              nodes={get3DNodes(activePath)}
              connections={get3DConnections(activePath)}
              onNodeClick={(node) => setSelectedNode(node)}
              activeNode={selectedNode?.id} />
            {selectedNode && (
              <GlassCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">{selectedNode.label}</h3>
                  <p className="text-gray-400 text-sm">{selectedNode.description}</p>
                </div>
              </GlassCard>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
