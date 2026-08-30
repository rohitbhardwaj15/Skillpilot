import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { Sparkles, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'
import { authStart, authSuccess, authFailure } from '../store/slices/authSlice'
import { api } from '../lib/api'
import GlassCard from '../components/ui/GlassCard'

export default function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    setSubmitting(true)
    dispatch(authStart())

    try {
      const { token, user } = await api.login(email, password)
      dispatch(authSuccess({ token, user }))
      navigate(user.profileId ? '/dashboard' : '/onboarding')
    } catch (err) {
      dispatch(authFailure(err.message))
      setLocalError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-24 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-orange to-accent-amber flex items-center justify-center mx-auto mb-4">
            <Sparkles size={26} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold font-display text-ink mb-2">Welcome back</h1>
          <p className="text-ink-soft text-sm">Log in to continue your learning path.</p>
        </div>

        <GlassCard className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm text-ink-soft mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-white border border-border rounded-xl pl-11 pr-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-accent-orange/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-ink-soft mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Your password"
                  className="w-full bg-white border border-border rounded-xl pl-11 pr-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-accent-orange/50 transition-colors"
                />
              </div>
            </div>

            {localError && (
              <div className="flex items-start gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl p-3">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{localError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full justify-center py-3.5 disabled:opacity-50"
            >
              {submitting ? 'Logging in...' : 'Log In'}
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="text-center text-sm text-ink-soft mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent-orange hover:underline">
              Sign up
            </Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  )
}
