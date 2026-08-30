import { motion } from 'framer-motion'
import WaveBackground from './WaveBackground'

// Compact version of the landing page's dark wave-gradient hero, used to
// give every interior page (dashboard, profile, assessment, etc.) the same
// "wave theme" identity instead of a plain white header.
export default function PageHero({
  eyebrow,
  icon: Icon,
  title,
  subtitle,
  uppercase = true,
  children,
}) {
  return (
    <section className="relative overflow-hidden pt-28 pb-14 lg:pt-32 lg:pb-16 section-padding">
      <WaveBackground />

      <div className="relative z-10 max-w-6xl mx-auto">
        {eyebrow && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10
                       border border-white/25 backdrop-blur-sm text-white/90 text-xs sm:text-sm
                       font-semibold tracking-wide uppercase mb-4"
          >
            {Icon && <Icon size={14} />}
            {eyebrow}
          </motion.div>
        )}

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`font-display font-black text-white leading-tight mb-2
            text-3xl sm:text-4xl lg:text-5xl ${uppercase ? 'uppercase tracking-tight' : ''}`}
        >
          {title}
        </motion.h1>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/70 text-base lg:text-lg max-w-2xl"
          >
            {subtitle}
          </motion.p>
        )}

        {children}
      </div>
    </section>
  )
}
