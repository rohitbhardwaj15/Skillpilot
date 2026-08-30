import { motion } from 'framer-motion'
import { X, Check } from 'lucide-react'

export default function SkillBadge({ 
  skill, 
  onRemove, 
  onAdd,
  selected = false,
  selectable = false,
  size = 'md'
}) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => selectable ? (selected ? onRemove?.(skill) : onAdd?.(skill)) : undefined}
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        transition-all duration-200
        ${sizeClasses[size]}
        ${selected 
          ? 'bg-accent-orange/15 text-accent-orange border border-accent-orange/40' 
          : selectable 
            ? 'bg-surface-alt text-ink-soft border border-border hover:bg-border/50 hover:border-ink-faint/40'
            : 'bg-surface-alt text-ink-soft border border-border'
        }
        ${selectable ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      {selected && <Check size={14} />}
      {skill}
      {onRemove && !selectable && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(skill); }}
          className="ml-1 hover:text-red-500 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </motion.button>
  )
}
