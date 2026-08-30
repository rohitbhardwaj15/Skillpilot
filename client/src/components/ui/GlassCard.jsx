import { motion } from 'framer-motion'
import { use3DEffect } from '../../hooks/use3DEffect'

export default function GlassCard({ 
  children, 
  className = '', 
  hover3D = false,
  delay = 0,
  onClick,
  glow = false,
}) {
  const ref = hover3D ? use3DEffect(10) : null

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: hover3D ? undefined : 1.01 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl
        bg-white
        border border-border
        shadow-sm
        transition-all duration-300
        ${hover3D ? 'cursor-pointer' : ''}
        ${glow ? 'hover:shadow-md hover:border-accent-orange/30' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}
