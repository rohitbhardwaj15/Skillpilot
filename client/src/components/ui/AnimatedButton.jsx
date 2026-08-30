import { motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'

export default function AnimatedButton({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = true,
  className = '',
  type = 'button',
}) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'px-6 py-3 text-ink-soft hover:text-ink hover:bg-surface-alt rounded-full transition-all',
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-8 py-4',
    lg: 'px-10 py-5 text-lg',
  }

  return (
    <motion.button
      type={type}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variant === 'primary' || variant === 'secondary' ? variants[variant] : variants.ghost}
        ${variant === 'ghost' ? sizes[size] : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <>
          {children}
          {icon && variant === 'primary' && <ArrowRight size={18} />}
        </>
      )}
    </motion.button>
  )
}
