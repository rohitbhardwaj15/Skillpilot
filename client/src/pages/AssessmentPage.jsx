import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Brain, CheckCircle, Loader2, Target } from 'lucide-react'
import { api } from '../lib/api'
import GlassCard from '../components/ui/GlassCard'

export default function AssessmentPage() {
  const cachedProfile = useSelector(s => s.user?.profile)
  const [profile, setProfile] = useState(cachedProfile)
  const navigate = useNavigate()
  const [skill, setSkill] = useState('')
  const [assessment, setAssessment] = useState(null)
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const gapsRaw = profile?.knowledgeState?.length ? profile.knowledgeState.filter(k => k.level < .8).map(k => ({ name: k.skill, isNew: k.level < 0.15 })) : (profile?.currentSkills || []).map(k => ({ name: k.name, isNew: k.level === 'none' }))
  const gaps = gapsRaw.map(g => g.name)

  useEffect(() => {
    api.getMyProfile()
      .then(setProfile)
      .catch((err) => setError(`Couldn't load your profile: ${err.message}. Try refreshing, or complete onboarding first if you haven't already.`))
  }, [])
  useEffect(() => { if (!skill && gaps[0]) setSkill(gaps[0]) }, [gaps.length, gaps[0]])

  const start = async () => {
    const profileId = profile?.id || profile?._id
    if (!profileId) { setError('No profile found for your account yet — please complete onboarding first.'); return }
    const effectiveSkill = skill || gaps[0]
    if (!effectiveSkill) { setError('Please choose a skill first.'); return }
    setLoading(true); setResult(null); setError(null)
    try {
      const a = await api.startAssessment(profileId, effectiveSkill)
      if (!a?.questions?.length) { setError('The assessment came back empty. Please try again.'); return }
      setAssessment(a); setAnswers(Array(a.questions.length).fill(null))
    }
    catch (err) {
      const msg = err.message || 'Failed to start assessment. Please try again.'
      setError(msg.includes('LLM_API_KEY') ? 'The assessment generator is not configured on the server yet. Please contact support.' : msg)
    }
    finally { setLoading(false) }
  }
  const submit = async () => {
    if (answers.some(a => a === null)) return
    setLoading(true); setError(null)
    try { setResult(await api.submitAssessment(assessment._id, answers)) }
    catch (err) { setError(err.message || 'Failed to submit assessment. Please try again.') }
    finally { setLoading(false) }
  }

  return <div className="min-h-screen pt-28 pb-16 section-padding"><div className="max-w-4xl mx-auto">
    <GlassCard className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-2"><Brain className="text-accent-orange"/><h1 className="text-2xl font-bold text-ink">Skill Assessment</h1></div>
      <p className="text-ink-soft mb-6">Replace self-reported skills with evidence. Your score updates your learner knowledge state and future roadmap.</p>
      {!assessment && !result && <>
        <label className="text-sm text-ink-soft">Choose a skill</label>
        <select value={skill || gaps[0] || ''} onChange={e=>setSkill(e.target.value)} className="w-full mt-2 mb-5 bg-white border border-border rounded-xl p-3 text-ink">
          {gapsRaw.length ? gapsRaw.map(g=><option key={g.name} value={g.name}>{g.name}{g.isNew ? ' (new)' : ''}</option>) : <option>No skills available</option>}
        </select>
        <button onClick={start} disabled={loading || !(skill || gaps[0])} className="px-5 py-3 rounded-xl bg-accent-orange text-white font-semibold disabled:opacity-50">{loading ? <Loader2 className="animate-spin"/> : 'Start 5-Question Assessment'}</button>
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
      </>}
      {assessment && !result && <div className="space-y-6">
        {assessment.questions.map((q,i)=><div key={q._id || i} className="border border-border rounded-xl p-5 bg-white"><p className="text-ink font-medium mb-4">{i+1}. {q.question}</p><div className="grid gap-2">{q.options.map((o,j)=><button key={j} onClick={()=>setAnswers(a=>a.map((v,k)=>k===i?j:v))} className={`text-left p-3 rounded-lg border ${answers[i]===j?'border-accent-orange bg-accent-orange-soft text-ink':'border-border bg-surface-alt text-ink-soft'}`}>{o}</button>)}</div></div>)}
        <button onClick={submit} disabled={loading || answers.some(a=>a===null)} className="px-5 py-3 rounded-xl bg-accent-teal text-white font-semibold disabled:opacity-50">{loading?'Scoring…':'Submit Assessment'}</button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>}
      {result && <div className="text-center py-8"><CheckCircle size={52} className="mx-auto text-accent-teal mb-4"/><div className="text-5xl font-bold text-ink">{result.score}%</div><p className="text-ink-soft mt-2">{result.correctAnswers}/{result.totalQuestions} correct</p><div className="mt-6 grid grid-cols-2 gap-3"><div className="bg-surface-alt rounded-xl p-4"><Target className="mx-auto text-accent-orange mb-2"/><div className="text-ink font-semibold capitalize">{result.estimatedLevel}</div><div className="text-xs text-ink-faint">Estimated Level</div></div><div className="bg-surface-alt rounded-xl p-4"><div className="text-2xl font-bold text-accent-teal">{Math.round(result.confidence*100)}%</div><div className="text-xs text-ink-faint">Confidence</div></div></div><p className="text-sm text-ink-soft mt-6">Your evidence-backed skill state has been updated. Generate/revisit your roadmap to apply the new estimate.</p><button onClick={()=>navigate('/dashboard')} className="mt-5 px-5 py-3 rounded-xl bg-accent-orange text-white font-semibold">Back to Dashboard</button></div>}
    </GlassCard>
  </div></div>
}
