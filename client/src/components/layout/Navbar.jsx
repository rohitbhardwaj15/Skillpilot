import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSelector, useDispatch } from 'react-redux'
import {
  Menu, X, Compass, LayoutDashboard, MessageSquare,
  User, LogOut, Sparkles, ChevronDown, BookOpen, Brain
} from 'lucide-react'
import { setSidebar } from '../../store/slices/uiSlice'
import { logout } from '../../store/slices/authSlice'

const navLinks = [
  { path: '/', label: 'Home', icon: Sparkles },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/paths', label: 'Learning Paths', icon: Compass },
  { path: '/assessment', label: 'Assessment', icon: Brain },
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

  // Every page now opens with a dark wave-gradient hero behind the navbar
  // (see PageHero), so we go transparent-with-white-text before scrolling,
  // then switch to a solid navbar once the hero scrolls out of view.
  const overHero = !scrolled

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
          ${overHero
            ? 'bg-transparent'
            : 'bg-white/90 backdrop-blur-xl border-b border-border shadow-sm'
          }
        `}
      >
        <div className="section-padding">
          <div className="flex items-center justify-between h-16 lg:h-20">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${overHero ? 'bg-white/10 border border-white/30 backdrop-blur-sm' : 'bg-gradient-to-br from-accent-orange to-accent-amber'}`}>
                <Sparkles size={20} className="text-white" />
              </div>

              <span className={`text-xl font-bold font-display transition-colors ${overHero ? 'text-white group-hover:text-white/80' : 'text-ink group-hover:text-accent-orange'}`}>
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
                      ${overHero
                        ? (isActive ? 'text-white' : 'text-white/75 hover:text-white hover:bg-white/10')
                        : (isActive ? 'text-accent-orange' : 'text-ink-soft hover:text-ink hover:bg-surface-alt')
                      }
                    `}
                  >
                    <Icon size={16} />
                    {link.label}

                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className={overHero
                          ? 'absolute inset-0 bg-white/15 rounded-lg border border-white/25'
                          : 'absolute inset-0 bg-accent-orange/10 rounded-lg border border-accent-orange/20'
                        }
                        transition={{
                          type: 'spring',
                          bounce: 0.2,
                          duration: 0.6
                        }}
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
                    onClick={() =>
                      setUserMenuOpen(!userMenuOpen)
                    }
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${overHero ? 'bg-white/10 border-white/25 hover:bg-white/20' : 'bg-surface-alt border-border hover:bg-border/60'}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-orange to-accent-purple flex items-center justify-center text-xs font-bold text-white">
                      {user.name?.[0]?.toUpperCase() || '?'}
                    </div>

                    <span className={`text-sm ${overHero ? 'text-white' : 'text-ink-soft'}`}>
                      {user.name}
                    </span>

                    <ChevronDown size={14} />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          y: -10
                        }}
                        animate={{
                          opacity: 1,
                          y: 0
                        }}
                        exit={{
                          opacity: 0,
                          y: -10
                        }}
                        className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-border shadow-xl overflow-hidden"
                      >
                        <Link
                          to="/profile"
                          onClick={() =>
                            setUserMenuOpen(false)
                          }
                          className="flex items-center gap-2 px-4 py-3 text-sm text-ink-soft hover:bg-surface-alt hover:text-ink transition-colors"
                        >
                          <User size={16} />
                          Profile
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-400/10 transition-colors w-full text-left"
                        >
                          <LogOut size={16} />
                          Log out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="hidden lg:flex items-center gap-2">
                  <Link
                    to="/login"
                    className={`px-4 py-2 text-sm font-medium transition-colors ${overHero ? 'text-white/80 hover:text-white' : 'text-ink-soft hover:text-ink'}`}
                  >
                    Log in
                  </Link>

                  <Link
                    to="/register"
                    className={overHero ? 'btn-wave-outline text-sm py-2.5 px-5' : 'btn-primary text-sm py-2.5 px-5'}
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() =>
                  setMobileOpen(!mobileOpen)
                }
                className={`lg:hidden p-2 rounded-lg transition-all ${overHero ? 'text-white hover:bg-white/10' : 'text-ink-soft hover:text-ink hover:bg-surface-alt'}`}
              >
                {mobileOpen
                  ? <X size={24} />
                  : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{
              opacity: 0,
              y: -20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            exit={{
              opacity: 0,
              y: -20
            }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div
              className="absolute inset-0 bg-white/97 backdrop-blur-xl"
              onClick={() =>
                setMobileOpen(false)
              }
            />

            <div className="relative pt-20 px-6">
              <div className="space-y-2">
                {navLinks.map((link, i) => {
                  const Icon = link.icon
                  const isActive =
                    location.pathname === link.path

                  return (
                    <motion.div
                      key={link.path}
                      initial={{
                        opacity: 0,
                        x: -20
                      }}
                      animate={{
                        opacity: 1,
                        x: 0
                      }}
                      transition={{
                        delay: i * 0.05
                      }}
                    >
                      <Link
                        to={link.path}
                        onClick={() =>
                          setMobileOpen(false)
                        }
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-xl text-lg font-medium transition-all
                          ${isActive
                            ? 'bg-accent-orange/10 text-accent-orange border border-accent-orange/20'
                            : 'text-ink-soft hover:bg-surface-alt hover:text-ink'
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
                    initial={{
                      opacity: 0,
                      x: -20
                    }}
                    animate={{
                      opacity: 1,
                      x: 0
                    }}
                    transition={{
                      delay: 0.3
                    }}
                    className="pt-4"
                  >
                    <button
                      onClick={() => {
                        handleLogout()
                        setMobileOpen(false)
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-lg font-medium text-red-400 hover:bg-red-400/10 transition-all w-full"
                    >
                      <LogOut size={20} />
                      Log out
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{
                      opacity: 0,
                      x: -20
                    }}
                    animate={{
                      opacity: 1,
                      x: 0
                    }}
                    transition={{
                      delay: 0.3
                    }}
                    className="pt-4 space-y-2"
                  >
                    <Link
                      to="/login"
                      onClick={() =>
                        setMobileOpen(false)
                      }
                      className="flex items-center justify-center px-4 py-3 rounded-xl text-lg font-medium text-ink-soft hover:bg-surface-alt hover:text-ink transition-all border border-border"
                    >
                      Log in
                    </Link>

                    <Link
                      to="/register"
                      onClick={() =>
                        setMobileOpen(false)
                      }
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
