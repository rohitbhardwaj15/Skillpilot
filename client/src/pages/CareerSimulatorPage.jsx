import { useState } from 'react'
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Target,
  TrendingUp,
  AlertCircle,
  BookOpen,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { api } from '../lib/api'

export default function CareerSimulatorPage() {
  const [targetRole, setTargetRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const handleSimulate = async (e) => {
    e.preventDefault()

    if (!targetRole.trim()) {
      setError('Please enter a target career role.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const profile = await api.getMyProfile()

      const data = await api.simulateCareer(
        targetRole.trim(),
        profile || {}
      )

      setResult(data)
    } catch (err) {
      console.error('Career simulation error:', err)
      setError(
        err?.message ||
          'Unable to simulate this career transition. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 pt-24 pb-16">
      <div className="mx-auto w-full max-w-6xl px-6">

        {/* Header */}
        <div className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-600">
            <Sparkles size={16} />
            AI Career Planning
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            What-If Career Simulator
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            Explore how your current skills translate to a different career
            and discover the learning path needed to get there.
          </p>
        </div>

        {/* Simulator Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <form
            onSubmit={handleSimulate}
            className="flex flex-col gap-5 md:flex-row md:items-end"
          >
            <div className="flex-1">
              <label
                htmlFor="targetRole"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Target Career
              </label>

              <input
                id="targetRole"
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. AI Engineer"
                className="w-full rounded-xl border border-slate-300 bg-white px-5 py-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 py-4 font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={19} className="animate-spin" />
                  Simulating...
                </>
              ) : (
                <>
                  Simulate Career
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="mt-10 space-y-6">

            {/* Career Transition */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
                  <Briefcase size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Career Transition
                  </h2>
                  <p className="text-sm text-slate-500">
                    Your current profile compared with your target role
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Current Role
                  </p>

                  <p className="text-lg font-bold text-slate-900">
                    {result.currentRole || 'Current Profile'}
                  </p>
                </div>

                <div className="hidden text-slate-400 md:block">
                  <ArrowRight size={25} />
                </div>

                <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-orange-600">
                    Target Role
                  </p>

                  <p className="text-lg font-bold text-slate-900">
                    {result.targetRole}
                  </p>
                </div>
              </div>
            </div>

            {/* Readiness */}
            <div className="grid gap-6 md:grid-cols-3">

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                    <TrendingUp size={22} />
                  </div>

                  <span className="font-semibold text-slate-700">
                    Career Readiness
                  </span>
                </div>

                <div className="text-4xl font-bold text-slate-900">
                  {result.readinessPercentage ?? 0}%
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, result.readinessPercentage ?? 0)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                    <CheckCircle2 size={22} />
                  </div>

                  <span className="font-semibold text-slate-700">
                    Skills You Have
                  </span>
                </div>

                <div className="text-4xl font-bold text-slate-900">
                  {result.simulation?.masteredSkills ?? 0}
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  relevant skills already mastered
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
                    <Target size={22} />
                  </div>

                  <span className="font-semibold text-slate-700">
                    Skill Gaps
                  </span>
                </div>

                <div className="text-4xl font-bold text-slate-900">
                  {result.simulation?.remainingSkills ??
                    result.skillGaps?.length ??
                    0}
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  skills remaining to develop
                </p>
              </div>
            </div>

            {/* Summary */}
            {result.summary && (
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
                <div className="flex gap-4">
                  <div className="rounded-xl bg-white p-3 text-orange-600 shadow-sm">
                    <Sparkles size={22} />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      AI Career Analysis
                    </h2>

                    <p className="mt-2 leading-7 text-slate-700">
                      {result.summary}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Skill Gaps */}
            {result.skillGaps?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Your Skill Gap
                  </h2>

                  <p className="mt-1 text-slate-500">
                    These skills should be your next learning priorities.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {result.skillGaps.map((gap, index) => {
                    const skill =
                      typeof gap === 'string'
                        ? gap
                        : gap.skill

                    const priority =
                      typeof gap === 'object'
                        ? gap.priority
                        : 'high'

                    return (
                      <div
                        key={`${skill}-${index}`}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-red-100 p-2 text-red-600">
                            <Target size={17} />
                          </div>

                          <span className="font-semibold text-slate-800">
                            {skill}
                          </span>
                        </div>

                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold capitalize text-red-700">
                          {priority}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Roadmap */}
            {result.roadmap?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="mb-7 flex items-center gap-3">
                  <div className="rounded-xl bg-purple-100 p-3 text-purple-600">
                    <BookOpen size={23} />
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Recommended Learning Path
                    </h2>

                    <p className="mt-1 text-slate-500">
                      A prerequisite-aware roadmap for your career transition.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {result.roadmap.slice(0, 10).map((item, index) => {
                    const course = item.course || item

                    return (
                      <div
                        key={course._id || index}
                        className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold text-white">
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-900">
                            {course.title || 'Recommended Course'}
                          </h3>

                          {course.description && (
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {course.description}
                            </p>
                          )}

                          {course.skills?.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {course.skills.slice(0, 5).map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
