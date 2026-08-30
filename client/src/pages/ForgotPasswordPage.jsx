import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { KeyRound, Mail, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react'
import { api } from '../lib/api'
import GlassCard from '../components/ui/GlassCard'
import WaveBackground from '../components/ui/WaveBackground'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [localError, setLocalError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    setSubmitting(true)

    try {
      await api.forgotPassword(email)
      // The backend always responds the same way whether or not the
      // account exists, so we just show the generic confirmation state.
      setSent(true)
    } catch (err) {
      setLocalError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-12 overflow-hidden">
      <WaveBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/25 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
            <KeyRound size={26} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold font-display text-white mb-2">Forgot password?</h1>
          <p className="text-white/70 text-sm">
            Enter your email and we'll send you a link to reset it.
          </p>
        </div>

        <GlassCard className="p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-accent-teal/15 flex items-center justify-center mx-auto">
                <CheckCircle size={24} className="text-accent-teal" />
              </div>
              <p className="text-ink text-sm">
                If an account exists for <span className="font-semibold">{email}</span>, a
                password reset link has been sent. Check your inbox (and spam folder).
              </p>
              <Link to="/login" className="btn-primary w-full justify-center py-3.5 inline-flex">
                Back to Log In
              </Link>
            </div>
          ) : (
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
                    className="w-full bg-surface-alt border border-border rounded-xl pl-11 pr-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-accent-orange/50 transition-colors"
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
                {submitting ? 'Sending link...' : 'Send Reset Link'}
                {!submitting && <ArrowRight size={18} />}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-ink-soft mt-6">
            Remembered your password?{' '}
            <Link to="/login" className="text-accent-orange hover:underline">
              Log in
            </Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  )
}
