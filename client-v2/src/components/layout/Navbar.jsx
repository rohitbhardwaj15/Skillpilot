import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSelector, useDispatch } from 'react-redux'
import {
  Menu, X, Compass, LayoutDashboard, MessageSquare,
  User, LogOut, Sparkles, ChevronDown, BookOpen
} from 'lucide-react'
import { setSidebar } from '../../store/slices/uiSlice'
import { logout } from '../../store/slices/authSlice'

const navLinks = [
  { path: '/', label: 'Home', icon: Sparkles },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/paths', label: 'Learning Paths', icon: Compass },
  { path: '/recommendations', label: 'Recommendations', icon: BookOpen },
  { path: '/assistant', label: 'AI Assistant', icon: MessageSquare },
  { path: '/profile', label: 'Profile', icon: User },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user, isAuthenticated } = useSelector(state => state.auth)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    dispatch(logout())
    setUserMenuOpen(false)
    navigate('/')
  }

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${scrolled 
            ? 'bg-dark-900/80 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20' 
            : 'bg-transparent'
          }
        `}
      >
        <div className="section-padding">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-orange to-accent-amber flex items-center justify-center">
                <Sparkles size={20} className="text-dark-900" />
              </div>
              <span className="text-xl font-bold font-display text-white group-hover:text-accent-orange transition-colors">
                SkillPilot
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map(link => {
                const isActive = location.pathname === link.path
                const Icon = link.icon
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`
                      relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      flex items-center gap-2
                      ${isActive 
                        ? 'text-accent-orange' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <Icon size={16} />
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 bg-accent-orange/10 rounded-lg border border-accent-orange/20"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {isAuthenticated && user ? (
                <div className="hidden lg:block relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-orange to-accent-purple flex items-center justify-center text-xs font-bold text-white">
                      {user.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm text-gray-300">{user.name}</span>
                    <ChevronDown size={14} className="text-gray-500" />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 bg-dark-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg overflow-hidden"
                      >
                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          <User size={16} /> Profile
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-400/10 transition-colors w-full text-left"
                        >
                          <LogOut size={16} /> Log out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="hidden lg:flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    Log in
                  </Link>
                  <Link to="/register" className="btn-primary text-sm py-2.5 px-5">
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div className="absolute inset-0 bg-dark-900/95 backdrop-blur-xl" onClick={() => setMobileOpen(false)} />
            <div className="relative pt-20 px-6">
              <div className="space-y-2">
                {navLinks.map((link, i) => {
                  const Icon = link.icon
                  const isActive = location.pathname === link.path
                  return (
                    <motion.div
                      key={link.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        to={link.path}
                        onClick={() => setMobileOpen(false)}
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-xl text-lg font-medium transition-all
                          ${isActive 
                            ? 'bg-accent-orange/10 text-accent-orange border border-accent-orange/20' 
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                          }
                        `}
                      >
                        <Icon size={20} />
                        {link.label}
                      </Link>
                    </motion.div>
                  )
                })}

                {isAuthenticated ? (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="pt-4"
                  >
                    <button
                      onClick={() => { handleLogout(); setMobileOpen(false) }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-lg font-medium text-red-400 hover:bg-red-400/10 transition-all w-full"
                    >
                      <LogOut size={20} /> Log out
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="pt-4 space-y-2"
                  >
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center px-4 py-3 rounded-xl text-lg font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-all border border-white/10"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileOpen(false)}
                      className="btn-primary w-full justify-center"
                    >
                      Get Started
                    </Link>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
