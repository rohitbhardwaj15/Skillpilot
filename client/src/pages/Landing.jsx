import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import PathScene from '../components/PathScene';
import { ArrowRight } from 'lucide-react';

const demoMilestones = [
  { id: 1, title: 'JavaScript Fundamentals', status: 'done' },
  { id: 2, title: 'ES6+ & Async JS', status: 'done' },
  { id: 3, title: 'React Fundamentals', status: 'current' },
  { id: 4, title: 'State Management', status: 'upcoming' },
  { id: 5, title: 'Node & Express', status: 'upcoming' },
  { id: 6, title: 'MongoDB', status: 'upcoming' },
  { id: 7, title: 'Capstone Project', status: 'upcoming' },
];

export default function Landing({ onStart }) {
  const heroRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero-eyebrow', { opacity: 0, y: 12, duration: 0.5 })
        .from('.hero-title span', { opacity: 0, y: 28, stagger: 0.06, duration: 0.7 }, '-=0.25')
        .from('.hero-sub', { opacity: 0, y: 16, duration: 0.6 }, '-=0.3')
        .from('.hero-cta', { y: 12, duration: 0.5, clearProps: 'transform' }, '-=0.3')
        .from('.how-step', { opacity: 0, y: 20, stagger: 0.12, duration: 0.5 }, '-=0.1');
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={heroRef} className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] overflow-hidden">
      {/* Hero */}
      <section className="relative h-screen flex items-center">
        <div className="absolute inset-0 opacity-70">
          <PathScene milestones={demoMilestones} ambient />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-transparent to-[var(--color-bg)]/60 pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <p className="hero-eyebrow font-mono text-xs tracking-[0.25em] uppercase text-[var(--color-path)] mb-5">
            AI-Powered Learning Path Recommender
          </p>
          <h1 className="hero-title font-[var(--font-display)] text-5xl md:text-6xl font-semibold leading-[1.05] mb-6">
            <span className="block">Your goal, mapped</span>
            <span className="block text-[var(--color-path)]">into a real path.</span>
          </h1>
          <p className="hero-sub text-lg text-[var(--color-muted)] max-w-xl mx-auto mb-9">
            SkillPilot doesn't just recommend courses. It builds, explains, and
            continuously adapts a learning journey — from where you are, to where
            you're going.
          </p>
          <button
            onClick={onStart}
            className="hero-cta group inline-flex items-center gap-2 bg-[var(--color-path)] text-[var(--color-bg)] font-medium px-7 py-3.5 rounded-full hover:brightness-110 transition-all"
          >
            Build My Learning Path
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-32">
        <h2 className="font-[var(--font-display)] text-2xl mb-10 text-center text-[var(--color-text)]">
          How it works
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: '01', t: 'Tell us your goal', d: 'Describe what you want to achieve, in your own words.' },
            { n: '02', t: 'We map your gaps', d: 'AI identifies what you know and what stands between you and your goal.' },
            { n: '03', t: 'Your path adapts', d: 'As you learn and give feedback, the roadmap continuously re-plans itself.' },
          ].map((s) => (
            <div key={s.n} className="how-step border border-[var(--color-border)] rounded-2xl p-6 bg-[var(--color-bg-elevated)]">
              <span className="font-mono text-[var(--color-path)] text-sm">{s.n}</span>
              <h3 className="font-[var(--font-display)] text-lg mt-3 mb-2">{s.t}</h3>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
