import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { ArrowLeft, Loader2, TrendingUp, Sliders, Check } from 'lucide-react';
import { api } from '../lib/api';

const LEVEL_VALUE = { none: 0, beginner: 33, intermediate: 66, advanced: 100 };
const BASELINE_HOURS = 8; // course durationWeeks in the dataset assume ~8hrs/week

export default function Dashboard() {
  const { id } = useParams();
  const [path, setPath] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [simHours, setSimHours] = useState(BASELINE_HOURS);
  const [savedPace, setSavedPace] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await api.getPath(id);
      setPath(p);
      const prof = await api.getProfile(p.profileId);
      setProfile(prof);
      setSimHours(prof.hoursPerWeek || BASELINE_HOURS);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!path) return;
    const flatCourses = path.phases.flatMap((p) => p.courses);
    const doneCount = flatCourses.filter((c) => c.status === 'done').length;
    const pct = flatCourses.length ? Math.round((doneCount / flatCourses.length) * 100) : 0;

    const ctx = gsap.context(() => {
      gsap.from('.dash-card', { opacity: 0, y: 20, stagger: 0.08, duration: 0.5, ease: 'power2.out' });
      const counter = { val: 0 };
      gsap.to(counter, {
        val: pct,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate: () => {
          const el = document.getElementById('progress-number');
          if (el) el.textContent = `${Math.round(counter.val)}%`;
        },
      });
    });
    return () => ctx.revert();
  }, [path]);

  async function handleSavePace() {
    try {
      const updated = await api.updateProfile(profile._id, { hoursPerWeek: simHours });
      setProfile(updated);
      setSavedPace(true);
      setTimeout(() => setSavedPace(false), 2000);
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center px-6">
        <p className="text-red-400 text-center max-w-md">{error}</p>
      </div>
    );
  }

  if (!path || !profile) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-path)]" size={32} />
      </div>
    );
  }

  const flatCourses = path.phases.flatMap((p) => p.courses);
  const doneCount = flatCourses.filter((c) => c.status === 'done').length;
  const nextCourse = flatCourses.find((c) => c.status === 'current');

  // What-if simulation: scale remaining duration by the ratio of baseline to
  // simulated hours/week. Purely client-side, instant — no backend call needed.
  const remainingWeeksAtBaseline = flatCourses
    .filter((c) => c.status !== 'done')
    .reduce((sum, c) => sum + (c.durationWeeks || 0), 0);
  const scaleFactor = BASELINE_HOURS / Math.max(simHours, 1);
  const simulatedRemainingWeeks = Math.max(1, Math.round(remainingWeeksAtBaseline * scaleFactor));
  const simulatedCompletionDate = new Date();
  simulatedCompletionDate.setDate(simulatedCompletionDate.getDate() + simulatedRemainingWeeks * 7);

  const skillChartData = path.skillGaps
    .concat(profile.currentSkills.map((s) => s.name))
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 10)
    .map((skillName) => {
      const known = profile.currentSkills.find((s) => s.name.toLowerCase() === skillName.toLowerCase());
      return { name: skillName, value: known ? LEVEL_VALUE[known.level] || 0 : 0 };
    });

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <Link
          to={`/roadmap/${path._id}`}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] mb-8"
        >
          <ArrowLeft size={16} /> Back to roadmap
        </Link>

        <p className="font-mono text-xs tracking-[0.25em] uppercase text-[var(--color-path)] mb-2">
          Dashboard
        </p>
        <h1 className="font-[var(--font-display)] text-3xl font-semibold mb-1">
          {profile.name ? `Welcome back, ${profile.name}` : 'Your Progress'}
        </h1>
        <p className="text-[var(--color-muted)] mb-8">Goal: {path.targetRole}</p>

        <div className="grid md:grid-cols-3 gap-5 mb-6">
          <div className="dash-card md:col-span-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col justify-center items-center text-center">
            <p
              id="progress-number"
              className="font-[var(--font-display)] text-5xl font-semibold text-[var(--color-path)]"
            >
              0%
            </p>
            <p className="text-sm text-[var(--color-muted)] mt-2">Overall progress</p>
            <p className="text-xs font-mono text-[var(--color-muted)] mt-1">
              {doneCount} / {flatCourses.length} steps done
            </p>
          </div>

          <div className="dash-card md:col-span-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-2xl p-6">
            <p className="font-mono text-xs uppercase text-[var(--color-muted)] mb-3 flex items-center gap-1.5">
              <TrendingUp size={14} /> Next recommended action
            </p>
            {nextCourse ? (
              <>
                <p className="font-medium text-lg mb-1">{nextCourse.title}</p>
                <p className="text-sm text-[var(--color-muted)]">
                  {nextCourse.level} · {nextCourse.durationWeeks} weeks · {nextCourse.skills.join(', ')}
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--color-growth)]">
                🎉 You've completed everything in this roadmap!
              </p>
            )}
          </div>
        </div>

        {/* What-if simulator — innovation feature */}
        <div className="dash-card bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-2xl p-6 mb-6">
          <p className="font-mono text-xs uppercase text-[var(--color-muted)] mb-4 flex items-center gap-1.5">
            <Sliders size={14} /> What if I studied differently?
          </p>
          <div className="flex items-center gap-4 mb-4">
            <input
              type="range"
              min={2}
              max={40}
              value={simHours}
              onChange={(e) => setSimHours(Number(e.target.value))}
              className="flex-1 accent-[var(--color-path)]"
            />
            <span className="font-mono text-sm w-24 text-right">{simHours} hrs/week</span>
          </div>
          <div className="flex items-baseline justify-between flex-wrap gap-3">
            <div>
              <p className="text-2xl font-[var(--font-display)] font-semibold text-[var(--color-path)]">
                {simulatedRemainingWeeks} weeks
              </p>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                remaining · done around{' '}
                {simulatedCompletionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={handleSavePace}
              className="flex items-center gap-1.5 text-xs font-medium bg-[var(--color-path)] text-[var(--color-bg)] rounded-full px-4 py-2 hover:brightness-110 transition-all"
            >
              {savedPace ? <Check size={14} /> : null}
              {savedPace ? 'Saved' : 'Save this pace'}
            </button>
          </div>
        </div>

        <div className="dash-card bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-2xl p-6">
          <p className="font-mono text-xs uppercase text-[var(--color-muted)] mb-4">Skill development</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={skillChartData} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fill: '#5B6478', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                axisLine={false}
                tickLine={false}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
                {skillChartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.value >= 66 ? '#3DDC97' : entry.value > 0 ? '#E8A33D' : '#1E2330'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
