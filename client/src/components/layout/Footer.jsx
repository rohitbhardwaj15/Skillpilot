import { Link } from 'react-router-dom'
import { Sparkles, Heart } from 'lucide-react'

// Only real, working destinations here — no placeholder "#" links.
// Every entry below routes to an actual page in the app.
const PRODUCT_LINKS = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Recommendations', to: '/recommendations' },
  { label: 'Learning Path', to: '/paths' },
  { label: 'Skill Assessment', to: '/assessment' },
  { label: 'AI Assistant', to: '/assistant' },
]

export default function Footer() {
  return (
    <footer className="relative border-t border-border bg-surface-alt/60">
      <div className="section-padding py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-orange to-accent-amber flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="text-lg font-bold font-display text-ink">SkillPilot</span>
            </Link>
            <p className="text-sm text-ink-soft leading-relaxed max-w-sm">
              AI-powered learning path recommender that maps your goals into real, structured learning journeys.
            </p>
          </div>

          {/* Links — all real app routes, nothing decorative */}
          <div>
            <h4 className="text-sm font-semibold text-ink uppercase tracking-wider mb-4">Product</h4>
            <ul className="grid grid-cols-2 gap-3">
              {PRODUCT_LINKS.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-sm text-ink-soft hover:text-accent-orange transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-ink-faint">
            © 2024 SkillPilot. All rights reserved.
          </p>
          <p className="text-sm text-ink-faint flex items-center gap-1">
            Built with <Heart size={14} className="text-accent-pink fill-accent-pink" /> for learners worldwide
          </p>
        </div>
      </div>
    </footer>
  )
}
