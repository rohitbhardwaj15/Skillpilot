import { Link } from 'react-router-dom'
import { Sparkles, Github, Twitter, Linkedin, Mail, Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-dark-900/50 backdrop-blur-sm">
      <div className="section-padding py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-orange to-accent-amber flex items-center justify-center">
                <Sparkles size={16} className="text-dark-900" />
              </div>
              <span className="text-lg font-bold font-display text-white">SkillPilot</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              AI-powered learning path recommender that maps your goals into real, structured learning journeys.
            </p>
            <div className="flex items-center gap-3">
              {[Github, Twitter, Linkedin, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-accent-orange hover:border-accent-orange/30 transition-all"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-3">
              {['Features', 'Pricing', 'Roadmap', 'Changelog'].map(item => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-400 hover:text-accent-orange transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Resources</h4>
            <ul className="space-y-3">
              {['Documentation', 'Blog', 'Community', 'Support'].map(item => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-400 hover:text-accent-orange transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-3">
              {['About', 'Careers', 'Privacy', 'Terms'].map(item => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-400 hover:text-accent-orange transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © 2024 SkillPilot. All rights reserved.
          </p>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            Built with <Heart size={14} className="text-accent-pink fill-accent-pink" /> for learners worldwide
          </p>
        </div>
      </div>
    </footer>
  )
}
