import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, ArrowRight, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'
import GlassCard from '../components/ui/GlassCard'
import WaveBackground from '../components/ui/WaveBackground'

export default function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await api.resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
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
            <ShieldCheck size={26} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold font-display text-white mb-2">Set a new password</h1>
          <p className="text-white/70 text-sm">Choose a strong password for your account.</p>
        </div>

        <GlassCard className="p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-accent-teal/15 flex items-center justify-center mx-auto">
                <CheckCircle size={24} className="text-accent-teal" />
              </div>
              <p className="text-ink text-sm">
                Your password has been updated. Taking you to log in...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm text-ink-soft mb-1.5 block">New password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="w-full bg-surface-alt border border-border rounded-xl pl-11 pr-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-accent-orange/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-ink-soft mb-1.5 block">Confirm new password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Re-enter your new password"
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
                {submitting ? 'Updating...' : 'Update Password'}
                {!submitting && <ArrowRight size={18} />}
              </button>
            </form>
          )}

          {!done && (
            <p className="text-center text-sm text-ink-soft mt-6">
              <Link to="/login" className="text-accent-orange hover:underline">
                Back to log in
              </Link>
            </p>
          )}
        </GlassCard>
      </motion.div>
    </div>
  )
}
