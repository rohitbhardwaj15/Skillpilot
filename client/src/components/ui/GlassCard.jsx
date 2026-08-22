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
      whileHover={{ scale: hover3D ? undefined : 1.02 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl
        bg-white/[0.03] backdrop-blur-xl
        border border-white/10
        transition-all duration-300
        ${hover3D ? 'cursor-pointer' : ''}
        ${glow ? 'hover:shadow-[0_0_30px_rgba(245,166,35,0.15)]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}
