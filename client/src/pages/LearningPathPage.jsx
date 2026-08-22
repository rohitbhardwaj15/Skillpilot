import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { Clock, BookOpen, Loader2, AlertCircle } from 'lucide-react'
import { setCurrentPath } from '../store/slices/pathSlice'
import { api } from '../lib/api'
import { transformPathResponse } from '../lib/transformPath'
import SkillTree3D from '../components/3d/SkillTree3D'
import GlassCard from '../components/ui/GlassCard'
import TimelineNode from '../components/ui/TimelineNode'

export default function LearningPathPage() {
  const dispatch = useDispatch()
  const { currentPath } = useSelector((state) => state.path)
  const [viewMode, setViewMode] = useState('timeline')
  const [selectedNode, setSelectedNode] = useState(null)
  const [loading, setLoading] = useState(!currentPath)
  const [error, setError] = useState('')

  // If the user navigated here directly (e.g. page refresh) and Redux state
  // was lost, re-fetch the real path from the backend using the saved id.
  useEffect(() => {
    if (currentPath) {
      setLoading(false)
      return
    }
    const pathId = localStorage.getItem('skillpilot_path_id')
    if (!pathId) {
      setLoading(false)
      return
    }
    api
      .getPath(pathId)
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

  const get3DNodes = (path) => {
    return path.nodes.map((node, i) => ({
      id: node.id,
      position: [0, (path.nodes.length - 1 - i) * 2 - 4, 0],
      color: node.completed ? '#00d4aa' : i === 0 || path.nodes[i - 1]?.completed ? '#f5a623' : '#666',
      label: node.title,
      completed: node.completed,
    }))
  }

  const get3DConnections = (path) => {
    const connections = []
    for (let i = 0; i < path.nodes.length - 1; i++) {
      connections.push({
        start: [0, (path.nodes.length - 1 - i) * 2 - 4, 0],
        end: [0, (path.nodes.length - 1 - (i + 1)) * 2 - 4, 0],
        color: path.nodes[i].completed ? '#00d4aa' : '#f5a623',
        animated: !path.nodes[i].completed,
      })
    }
    return connections
  }

  return (
    <div className="min-h-screen pt-24 pb-12 section-padding">
      <div className="max-w-7xl mx-auto">
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

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">{activePath.title}</h2>
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            <button onClick={() => setViewMode('timeline')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'timeline' ? 'bg-accent-orange text-dark-900' : 'text-gray-400 hover:text-white'}`}>
              Timeline
            </button>
            <button onClick={() => setViewMode('3d')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === '3d' ? 'bg-accent-orange text-dark-900' : 'text-gray-400 hover:text-white'}`}>
              3D View
            </button>
          </div>
        </div>

        {viewMode === 'timeline' ? (
          <GlassCard>
            <div className="p-6 lg:p-8">
              <div className="max-w-2xl">
                {activePath.nodes?.map((node, i) => (
                  <TimelineNode key={node.id} node={node} index={i}
                    isLast={i === activePath.nodes.length - 1}
                    isActive={!node.completed && (i === 0 || activePath.nodes[i - 1]?.completed)}
                    onClick={() => setSelectedNode(node)} />
                ))}
              </div>
            </div>
          </GlassCard>
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
