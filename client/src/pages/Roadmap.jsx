import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { CheckCircle2, Circle, Sparkles, Loader2, LayoutDashboard, Zap } from 'lucide-react';
import PathScene from '../components/PathScene';
import { api } from '../lib/api';

const STATUS_STYLE = {
  done: 'text-[var(--color-growth)]',
  current: 'text-[var(--color-path)]',
  upcoming: 'text-[var(--color-muted)]',
};

const FEEDBACK_OPTIONS = [
  { rating: 'too_easy', emoji: '😴', label: 'Too easy' },
  { rating: 'too_hard', emoji: '😫', label: 'Too hard' },
  { rating: 'good', emoji: '👍', label: 'Good' },
  { rating: 'perfect', emoji: '🔥', label: 'Perfect' },
];

export default function Roadmap() {
  const { id } = useParams();
  const [path, setPath] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [explaining, setExplaining] = useState(null); // courseId currently loading
  const [explanations, setExplanations] = useState({}); // courseId -> text
  const [marking, setMarking] = useState(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(null); // courseId
  const [adaptation, setAdaptation] = useState(null); // { rating, message } — shown as a banner

  const load = useCallback(async () => {
    try {
      const p = await api.getPath(id);
      setPath(p);
      const prof = await api.getProfile(p.profileId);
      setProfile(prof);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!path) return;
    const ctx = gsap.context(() => {
      gsap.from('.phase-card', { opacity: 0, y: 24, stagger: 0.1, duration: 0.5, ease: 'power2.out' });
    });
    return () => ctx.revert();
  }, [path]);

  useEffect(() => {
    if (!adaptation) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.adaptation-banner',
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      );
    });
    const timer = setTimeout(() => setAdaptation(null), 6000);
    return () => {
      ctx.revert();
      clearTimeout(timer);
    };
  }, [adaptation]);

  async function handleExplain(course) {
    if (explanations[course.courseId]) return;
    setExplaining(course.courseId);
    try {
      const { explanation } = await api.explain({
        courseTitle: course.title,
        scoreBreakdown: course.scoreBreakdown,
        learnerGoal: profile?.goal || '',
      });
      setExplanations((prev) => ({ ...prev, [course.courseId]: explanation }));
    } catch (err) {
      setExplanations((prev) => ({
        ...prev,
        [course.courseId]: `Couldn't generate explanation: ${err.message}`,
      }));
    } finally {
      setExplaining(null);
    }
  }

  async function handleMarkDone(courseId) {
    setMarking(courseId);
    try {
      const updated = await api.markCourseDone(id, courseId);
      setPath(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setMarking(null);
    }
  }

  async function handleFeedback(courseId, rating) {
    setSubmittingFeedback(courseId);
    try {
      const { learningPath, adaptation: adaptationInfo } = await api.giveFeedback(id, courseId, rating);
      setPath(learningPath);
      setAdaptation(adaptationInfo);
      setExplanations({}); // scores changed, old explanations are stale
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingFeedback(null);
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
  const milestones = flatCourses.map((c) => ({ id: c.courseId, title: c.title, status: c.status }));

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {adaptation && (
        <div className="adaptation-banner fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%]">
          <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-path)] rounded-2xl px-5 py-3 flex items-start gap-3 shadow-lg">
            <Zap size={16} className="text-[var(--color-path)] mt-0.5 shrink-0" />
            <p className="text-sm text-[var(--color-text)]">{adaptation.message}</p>
          </div>
        </div>
      )}

      <div className="relative h-[60vh] min-h-[420px]">
        <PathScene milestones={milestones} />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-transparent to-[var(--color-bg)]/40 pointer-events-none" />
        <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-10">
          <div>
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-[var(--color-path)] mb-2">
              Your Roadmap
            </p>
            <h1 className="font-[var(--font-display)] text-3xl md:text-4xl font-semibold">
              {path.targetRole}
            </h1>
            <p className="text-[var(--color-muted)] mt-1">
              ~{path.estimatedDurationWeeks} weeks · {flatCourses.length} steps
            </p>
          </div>
          <Link
            to={`/dashboard/${path._id}`}
            className="flex items-center gap-2 border border-[var(--color-border)] rounded-full px-4 py-2 text-sm hover:border-[var(--color-path)] transition-colors"
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-24 -mt-8 relative z-10">
        {path.phases.map((phase) => (
          <div key={phase.phaseNumber} className="phase-card mb-6">
            <h2 className="font-[var(--font-display)] text-lg mb-3 flex items-baseline gap-3">
              {phase.title}
              <span className="font-mono text-xs text-[var(--color-muted)]">{phase.durationWeeks}w</span>
            </h2>
            <div className="space-y-3">
              {phase.courses.map((course) => (
                <div
                  key={course.courseId}
                  className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {course.status === 'done' ? (
                        <CheckCircle2 size={20} className="text-[var(--color-growth)] mt-0.5 shrink-0" />
                      ) : (
                        <Circle size={20} className={`${STATUS_STYLE[course.status]} mt-0.5 shrink-0`} />
                      )}
                      <div>
                        <p className="font-medium">{course.title}</p>
                        <p className="text-xs font-mono text-[var(--color-muted)] mt-1">
                          {course.level} · {course.durationWeeks}w · {course.skills.join(', ')}
                        </p>
                      </div>
                    </div>
                    {course.status === 'current' && (
                      <button
                        onClick={() => handleMarkDone(course.courseId)}
                        disabled={marking === course.courseId}
                        className="shrink-0 text-xs font-medium bg-[var(--color-path)] text-[var(--color-bg)] rounded-full px-3 py-1.5 hover:brightness-110 disabled:opacity-50 whitespace-nowrap"
                      >
                        {marking === course.courseId ? '...' : 'Mark complete'}
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
                    <button
                      onClick={() => handleExplain(course)}
                      className="flex items-center gap-1.5 text-xs text-[var(--color-path)] hover:underline"
                    >
                      <Sparkles size={12} />
                      Why this?
                    </button>

                    {(course.status === 'current' || course.status === 'done') && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-[var(--color-muted)] mr-1">
                          How was it?
                        </span>
                        {FEEDBACK_OPTIONS.map((opt) => (
                          <button
                            key={opt.rating}
                            title={opt.label}
                            onClick={() => handleFeedback(course.courseId, opt.rating)}
                            disabled={submittingFeedback === course.courseId}
                            className="text-base hover:scale-125 transition-transform disabled:opacity-40"
                          >
                            {opt.emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {explaining === course.courseId && (
                    <p className="mt-2 text-xs text-[var(--color-muted)] flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin" /> Thinking...
                    </p>
                  )}
                  {explanations[course.courseId] && (
                    <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed border-l-2 border-[var(--color-path-dim)] pl-3">
                      {explanations[course.courseId]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
