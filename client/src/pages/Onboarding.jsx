import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Sparkles, ArrowRight, X, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

const LEVELS = ['none', 'beginner', 'intermediate', 'advanced'];
const STYLES = ['projects', 'video', 'reading', 'interactive'];

const LOADING_MESSAGES = [
  'Reading your goal...',
  'Mapping required skills...',
  'Checking what you already know...',
  'Identifying skill gaps...',
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState('input'); // input | loading | confirm | preferences | error
  const [goalText, setGoalText] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [hoursPerWeek, setHoursPerWeek] = useState(8);
  const [learningStyle, setLearningStyle] = useState(['projects']);
  const [submitting, setSubmitting] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.ob-fade', { opacity: 0, y: 16, duration: 0.5, stagger: 0.06, ease: 'power2.out' });
    }, containerRef);
    return () => ctx.revert();
  }, [step]);

  useEffect(() => {
    if (step !== 'loading') return;
    const interval = setInterval(() => {
      setLoadingMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [step]);

  async function handleSubmitGoal(e) {
    e.preventDefault();
    if (goalText.trim().length < 8) return;

    setStep('loading');
    setErrorMsg('');
    try {
      const data = await api.analyzeGoal(goalText);
      setExtracted(data);
      setStep('confirm');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong analyzing your goal.');
      setStep('error');
    }
  }

  function updateSkillLevel(index, level) {
    setExtracted((prev) => {
      const skills = [...prev.currentSkills];
      skills[index] = { ...skills[index], level };
      return { ...prev, currentSkills: skills };
    });
  }

  function removeSkill(index) {
    setExtracted((prev) => ({
      ...prev,
      currentSkills: prev.currentSkills.filter((_, i) => i !== index),
    }));
  }

  function toggleStyle(style) {
    setLearningStyle((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  }

  async function handleFinalSubmit() {
    setSubmitting(true);
    try {
      const profile = await api.createProfile({
        goal: goalText,
        targetRole: extracted.targetRole,
        timelineMonths: extracted.timelineMonths,
        currentSkills: extracted.currentSkills,
        hoursPerWeek,
        learningStyle,
      });
      onComplete?.(profile);
    } catch (err) {
      setErrorMsg(err.message || 'Could not save your profile.');
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center px-6 py-16">
      <div ref={containerRef} className="w-full max-w-xl">
        {step === 'input' && (
          <form onSubmit={handleSubmitGoal} className="ob-fade">
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-[var(--color-path)] mb-4">
              Step 1 of 3
            </p>
            <h1 className="font-[var(--font-display)] text-3xl md:text-4xl font-semibold mb-4 leading-tight">
              What do you want to achieve?
            </h1>
            <p className="text-[var(--color-muted)] mb-6">
              Describe your goal in your own words — mention what you already know if you can.
            </p>
            <textarea
              autoFocus
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              placeholder='e.g. "I want to become a full-stack developer in 6 months. I know basic Java and HTML but haven&apos;t worked with React or Node.js."'
              rows={5}
              className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-2xl px-5 py-4 text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-path)] resize-none transition-colors"
            />
            <button
              type="submit"
              disabled={goalText.trim().length < 8}
              className="mt-5 group inline-flex items-center gap-2 bg-[var(--color-path)] text-[var(--color-bg)] font-medium px-7 py-3.5 rounded-full hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles size={18} />
              Analyze My Goal
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        )}

        {step === 'loading' && (
          <div className="ob-fade text-center py-20">
            <Loader2 size={40} className="animate-spin text-[var(--color-path)] mx-auto mb-6" />
            <p className="font-mono text-sm text-[var(--color-muted)]">
              {LOADING_MESSAGES[loadingMsgIndex]}
            </p>
          </div>
        )}

        {step === 'confirm' && extracted && (
          <div className="ob-fade">
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-[var(--color-path)] mb-4">
              Step 2 of 3
            </p>
            <h1 className="font-[var(--font-display)] text-3xl font-semibold mb-2">
              Here's what we understood
            </h1>
            <p className="text-[var(--color-muted)] mb-6">Adjust anything that's not quite right.</p>

            <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-2xl p-6 mb-6">
              <label className="block font-mono text-xs uppercase text-[var(--color-muted)] mb-2">
                Target Role
              </label>
              <input
                value={extracted.targetRole}
                onChange={(e) => setExtracted({ ...extracted, targetRole: e.target.value })}
                className="w-full bg-transparent border-b border-[var(--color-border)] pb-2 text-lg font-medium focus:outline-none focus:border-[var(--color-path)] mb-6"
              />

              <label className="block font-mono text-xs uppercase text-[var(--color-muted)] mb-2">
                Timeline (months)
              </label>
              <input
                type="number"
                min={1}
                max={36}
                value={extracted.timelineMonths}
                onChange={(e) => setExtracted({ ...extracted, timelineMonths: Number(e.target.value) })}
                className="w-24 bg-transparent border-b border-[var(--color-border)] pb-2 text-lg font-medium focus:outline-none focus:border-[var(--color-path)] mb-6"
              />

              <label className="block font-mono text-xs uppercase text-[var(--color-muted)] mb-3">
                Skills we detected
              </label>
              {extracted.currentSkills.length === 0 && (
                <p className="text-sm text-[var(--color-muted)] italic mb-2">
                  No prior skills detected — starting from scratch, that's fine.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {extracted.currentSkills.map((skill, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-full pl-3 pr-2 py-1.5"
                  >
                    <span className="text-sm">{skill.name}</span>
                    <select
                      value={skill.level}
                      onChange={(e) => updateSkillLevel(i, e.target.value)}
                      className="bg-transparent text-xs font-mono text-[var(--color-path)] focus:outline-none"
                    >
                      {LEVELS.map((l) => (
                        <option key={l} value={l} className="bg-[var(--color-bg)]">
                          {l}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeSkill(i)}
                      className="text-[var(--color-muted)] hover:text-[var(--color-text)]"
                      aria-label="Remove skill"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep('preferences')}
              className="group inline-flex items-center gap-2 bg-[var(--color-path)] text-[var(--color-bg)] font-medium px-7 py-3.5 rounded-full hover:brightness-110 transition-all"
            >
              Looks good, continue
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {step === 'preferences' && (
          <div className="ob-fade">
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-[var(--color-path)] mb-4">
              Step 3 of 3
            </p>
            <h1 className="font-[var(--font-display)] text-3xl font-semibold mb-6">
              How do you like to learn?
            </h1>

            <label className="block font-mono text-xs uppercase text-[var(--color-muted)] mb-2">
              Hours available per week: {hoursPerWeek}
            </label>
            <input
              type="range"
              min={1}
              max={40}
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              className="w-full mb-8 accent-[var(--color-path)]"
            />

            <label className="block font-mono text-xs uppercase text-[var(--color-muted)] mb-3">
              Preferred learning style
            </label>
            <div className="flex flex-wrap gap-2 mb-8">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStyle(s)}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                    learningStyle.includes(s)
                      ? 'bg-[var(--color-path)] text-[var(--color-bg)] border-[var(--color-path)]'
                      : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-path)]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <button
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="group inline-flex items-center gap-2 bg-[var(--color-path)] text-[var(--color-bg)] font-medium px-7 py-3.5 rounded-full hover:brightness-110 transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              Build My Path
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="ob-fade text-center py-16">
            <p className="text-red-400 mb-4">{errorMsg}</p>
            <button
              onClick={() => setStep('input')}
              className="text-[var(--color-path)] underline text-sm"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
