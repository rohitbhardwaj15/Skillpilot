import { motion } from 'framer-motion'
import { Check, Lock, Play, Star, Clock, BookOpen } from 'lucide-react'

export default function TimelineNode({ 
  node, 
  index, 
  isLast, 
  onClick,
  isActive = false,
}) {
  const statusConfig = {
    completed: { icon: Check, color: 'text-accent-teal', bg: 'bg-accent-teal/20', border: 'border-accent-teal' },
    active: { icon: Play, color: 'text-accent-orange', bg: 'bg-accent-orange/20', border: 'border-accent-orange' },
    locked: { icon: Lock, color: 'text-gray-500', bg: 'bg-gray-800', border: 'border-gray-700' },
    upcoming: { icon: Star, color: 'text-gray-400', bg: 'bg-gray-800/50', border: 'border-gray-700' },
  }

  const status = node.completed ? 'completed' : isActive ? 'active' : index === 0 ? 'active' : 'upcoming'
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative flex gap-4"
    >
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-6 top-14 w-0.5 h-[calc(100%-2rem)] bg-gradient-to-b from-white/20 to-transparent" />
      )}

      {/* Node circle */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        onClick={onClick}
        className={`
          relative z-10 flex-shrink-0 w-12 h-12 rounded-full 
          flex items-center justify-center cursor-pointer
          border-2 ${config.border} ${config.bg}
          transition-all duration-300
          ${isActive ? 'shadow-lg shadow-accent-orange/30' : ''}
        `}
      >
        <Icon size={20} className={config.color} />
      </motion.div>

      {/* Content */}
      <div className={`
        flex-1 pb-8 cursor-pointer group
        ${onClick ? 'cursor-pointer' : ''}
      `} onClick={onClick}>
        <div className={`
          p-4 rounded-xl border transition-all duration-300
          ${isActive 
            ? 'bg-white/5 border-accent-orange/30 shadow-lg shadow-accent-orange/5' 
            : 'bg-white/[0.02] border-white/10 hover:border-white/20'
          }
        `}>
          <div className="flex items-start justify-between mb-2">
            <h4 className={`font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`}>
              {node.title}
            </h4>
            {node.type === 'project' && (
              <span className="px-2 py-0.5 text-xs bg-accent-purple/20 text-accent-purple rounded-full">
                Project
              </span>
            )}
          </div>

          <p className="text-sm text-gray-400 mb-3">{node.description}</p>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {node.duration} weeks
            </span>
            {node.progress !== undefined && (
              <span className="flex items-center gap-1">
                <BookOpen size={12} />
                {node.progress}% complete
              </span>
            )}
          </div>

          {/* Progress bar */}
          {node.progress > 0 && (
            <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${node.progress}%` }}
                transition={{ duration: 1, delay: 0.3 }}
                className={`h-full rounded-full ${
                  node.progress === 100 ? 'bg-accent-teal' : 'bg-accent-orange'
                }`}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
