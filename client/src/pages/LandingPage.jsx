import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight, Sparkles, Brain, Target, Zap, TrendingUp,
  MessageSquare, Shield, Star, Cpu, Layers, GitBranch, Clock
} from 'lucide-react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import FloatingOrbs from '../components/3d/FloatingOrbs'
import GlassCard from '../components/ui/GlassCard'
import { api } from '../lib/api'

function HeroParticles() {
  const pointsRef = useRef()
  const count = 200

  const positions = useRef(new Float32Array(count * 3))
  const velocities = useRef(new Float32Array(count * 3))

  useEffect(() => {
    for (let i = 0; i < count; i++) {
      positions.current[i * 3] = (Math.random() - 0.5) * 20
      positions.current[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions.current[i * 3 + 2] = (Math.random() - 0.5) * 10
      velocities.current[i * 3] = (Math.random() - 0.5) * 0.005
      velocities.current[i * 3 + 1] = (Math.random() - 0.5) * 0.005
      velocities.current[i * 3 + 2] = (Math.random() - 0.5) * 0.005
    }
  }, [])

  useFrame(() => {
    if (!pointsRef.current) return
    const pos = pointsRef.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      pos[i * 3] += velocities.current[i * 3]
      pos[i * 3 + 1] += velocities.current[i * 3 + 1]
      pos[i * 3 + 2] += velocities.current[i * 3 + 2]
      if (Math.abs(pos[i * 3]) > 10) velocities.current[i * 3] *= -1
      if (Math.abs(pos[i * 3 + 1]) > 10) velocities.current[i * 3 + 1] *= -1
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions.current}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#D97B0F"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function FloatingCube() {
  const meshRef = useRef()

  useFrame((state) => {
    if (!meshRef.current) return
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.3
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.5
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.5
  })

  return (
    <mesh ref={meshRef} position={[3, 0, -2]}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial
        color="#D97B0F"
        transparent
        opacity={0.35}
        wireframe
        emissive="#D97B0F"
        emissiveIntensity={0.5}
      />
    </mesh>
  )
}

function Hero3D() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -5]} intensity={0.3} color="#0E9C8F" />
        <HeroParticles />
        <FloatingCube />
      </Canvas>
    </div>
  )
}

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Recommendations',
    description: 'Our advanced AI analyzes your profile, goals, and learning patterns to suggest the perfect courses and resources.',
    color: 'from-accent-purple to-accent-pink',
  },
  {
    icon: Target,
    title: 'Personalized Learning Paths',
    description: 'Get a structured roadmap with prerequisites, milestones, and projects tailored specifically to your objectives.',
    color: 'from-accent-orange to-accent-amber',
  },
  {
    icon: Zap,
    title: 'Adaptive Learning',
    description: 'The system continuously adapts based on your progress, feedback, and changing interests to keep you on track.',
    color: 'from-accent-teal to-accent-cyan',
  },
  {
    icon: MessageSquare,
    title: 'AI Learning Assistant',
    description: 'Chat with our AI assistant to get explanations, clarify doubts, and receive guidance throughout your journey.',
    color: 'from-accent-cyan to-accent-teal',
  },
  {
    icon: TrendingUp,
    title: 'Progress Tracking',
    description: 'Visualize your skill development, track milestones, and see how far you have come with detailed analytics.',
    color: 'from-accent-orange to-accent-gold',
  },
  {
    icon: Shield,
    title: 'Skill Gap Analysis',
    description: 'Identify exactly what skills you need to acquire and get targeted recommendations to fill those gaps.',
    color: 'from-accent-purple to-accent-cyan',
  },
]

// Real, verifiable numbers — course count is fetched live from the actual
// catalog rather than hardcoded, so this number can never go stale or fake.
function useCapabilities() {
  const [courseCount, setCourseCount] = useState(null)

  useEffect(() => {
    api.getCourses().then((courses) => setCourseCount(courses.length)).catch(() => {})
  }, [])

  return [
    { icon: Cpu, value: 'Groq AI', label: 'Real-time recommendation & goal analysis' },
    { icon: Layers, value: courseCount !== null ? `${courseCount} Courses` : '—', label: 'Across 9 career paths — web, data, cloud, security & design' },
    { icon: GitBranch, value: 'Adaptive Paths', label: 'Roadmap re-ranks itself from your feedback' },
    { icon: Clock, value: '24/7 Assistant', label: 'Always-on AI learning guide' },
  ]
}

// ✅ FIXED: Replaced fake testimonials with use-case scenarios
const useCases = [
  {
    role: 'Aspiring Developer',
    scenario: 'Career Switcher',
    content: 'I wanted to transition from marketing to software development. SkillPilot analyzed my transferable skills and built a step-by-step path from HTML basics to full-stack deployment — complete with project milestones.',
    icon: 'AD',
  },
  {
    role: 'Computer Science Student',
    scenario: 'Skill Builder',
    content: 'Instead of randomly picking courses, SkillPilot mapped my semester goals to real-world skills. It identified that I needed Docker and CI/CD knowledge to complement my coding skills for industry readiness.',
    icon: 'CS',
  },
  {
    role: 'Working Professional',
    scenario: 'Upskiller',
    content: 'With only 8 hours per week, I needed an efficient plan. SkillPilot optimized my schedule, suggested bite-sized modules, and adapted when work got busy — keeping me on track without burnout.',
    icon: 'WP',
  },
]

export default function LandingPage() {
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: containerRef })
  const y = useTransform(scrollYProgress, [0, 1], [0, -100])
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  const capabilities = useCapabilities()
  const { isAuthenticated, user } = useSelector((state) => state.auth)

  const primaryCtaTo = isAuthenticated ? (user?.profileId ? '/dashboard' : '/onboarding') : '/register'
  const primaryCtaLabel = isAuthenticated ? (user?.profileId ? 'Go to Dashboard' : 'Build My Learning Path') : 'Get Started Free'
  const secondaryCtaTo = isAuthenticated ? '/paths' : '/login'
  const secondaryCtaLabel = isAuthenticated ? 'View My Path' : 'Log In'

  return (
    <div ref={containerRef} className="relative">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <Hero3D />
        <FloatingOrbs />

        <motion.div 
          style={{ y, opacity }}
          className="relative z-10 text-center section-padding max-w-5xl mx-auto pt-20"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-semibold tracking-[0.2em] uppercase text-accent-orange bg-accent-orange/10 border border-accent-orange/20 rounded-full">
              AI-Powered Learning Path Recommender
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold font-display text-ink leading-tight mb-6"
          >
            Your goal, mapped{' '}
            <br className="hidden sm:block" />
            <span className="gradient-text">into a real path.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg sm:text-xl text-ink-soft max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            SkillPilot does not just recommend courses. It builds, explains, and 
            continuously adapts a learning journey — from where you are, to where you are going.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to={primaryCtaTo} className="btn-primary text-lg">
              {primaryCtaLabel}
              <ArrowRight size={20} />
            </Link>
            <Link to={secondaryCtaTo} className="btn-secondary">
              {secondaryCtaLabel}
            </Link>
          </motion.div>

          {/* ✅ FIXED: Capability highlights instead of fake stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {capabilities.map((cap, i) => {
              const Icon = cap.icon
              return (
                <div key={i} className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-surface-alt border border-border flex items-center justify-center">
                    <Icon size={22} className="text-accent-orange" />
                  </div>
                  <div className="text-lg font-bold text-ink mb-1">{cap.value}</div>
                  <div className="text-xs text-ink-faint">{cap.label}</div>
                </div>
              )
            })}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-ink-faint/30 flex items-start justify-center p-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-accent-orange" />
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works — placed right after the hero so the process is clear
          within seconds, before any feature grid or marketing copy. */}
      <section className="section-padding py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent-orange/5 to-transparent" />

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-accent-orange text-sm font-semibold tracking-wider uppercase">How It Works</span>
            <h2 className="text-4xl lg:text-5xl font-bold font-display text-ink mt-3">
              From your goal to a <span className="gradient-text">real roadmap</span>
            </h2>
            <p className="text-ink-soft max-w-xl mx-auto mt-3">
              Every recommendation traces back to this sequence — nothing is suggested until the gap is known.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: '01', icon: MessageSquare, title: 'Tell Us Your Goal', desc: 'Describe your career goal and current skills in your own words — no long form.' },
              { step: '02', icon: Target, title: 'We Find the Gap', desc: 'We compare your skills against what your target role actually requires.' },
              { step: '03', icon: GitBranch, title: 'Get Your Roadmap', desc: 'A prerequisite-ordered path, built only from skills you\'re missing.' },
              { step: '04', icon: TrendingUp, title: 'Track & Adapt', desc: 'Progress updates your skill state, and the roadmap re-ranks itself.' },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="relative"
                >
                  <div className="text-6xl font-bold text-ink/[0.06] absolute -top-4 -left-2">{item.step}</div>
                  <div className="relative pt-8">
                    <div className="w-12 h-12 rounded-full bg-accent-orange/20 border border-accent-orange/40 flex items-center justify-center mb-4">
                      <Icon size={20} className="text-accent-orange" />
                    </div>
                    <h3 className="text-lg font-semibold text-ink mb-2">{item.title}</h3>
                    <p className="text-sm text-ink-soft">{item.desc}</p>
                  </div>
                  {i < 3 && (
                    <div className="hidden lg:block absolute top-14 left-[calc(100%-0.5rem)] w-8 h-px bg-gradient-to-r from-accent-orange/40 to-transparent" />
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding py-24 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-accent-orange text-sm font-semibold tracking-wider uppercase">Features</span>
            <h2 className="text-4xl lg:text-5xl font-bold font-display text-ink mt-3 mb-4">
              Everything you need to <span className="gradient-text">learn smarter</span>
            </h2>
            <p className="text-ink-soft max-w-2xl mx-auto">
              A complete suite of AI-powered tools designed to accelerate your learning and help you achieve your goals faster.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <GlassCard key={i} delay={i * 0.1} hover3D glow>
                  <div className="p-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-ink mb-2">{feature.title}</h3>
                    <p className="text-sm text-ink-soft leading-relaxed">{feature.description}</p>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        </div>
      </section>

      {/* ✅ FIXED: Use-case scenarios instead of fake testimonials */}
      <section className="section-padding py-24 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-accent-orange text-sm font-semibold tracking-wider uppercase">Use Cases</span>
            <h2 className="text-4xl lg:text-5xl font-bold font-display text-ink mt-3 mb-4">
              Built for <span className="gradient-text">every learner</span>
            </h2>
            <p className="text-ink-soft max-w-xl mx-auto">
              See how different learners use SkillPilot to achieve their unique goals.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {useCases.map((item, i) => (
              <GlassCard key={i} delay={i * 0.1} hover3D>
                <div className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} size={14} className="text-accent-orange fill-accent-orange" />
                    ))}
                    <span className="ml-2 text-xs text-ink-faint">Sample scenario</span>
                  </div>
                  <p className="text-ink-soft mb-6 leading-relaxed">"{item.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-orange to-accent-purple flex items-center justify-center text-sm font-bold text-white">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink">{item.role}</div>
                      <div className="text-xs text-ink-faint">{item.scenario}</div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding py-24 lg:py-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="relative p-12 lg:p-16 rounded-3xl bg-gradient-to-br from-accent-orange/10 via-accent-purple/10 to-accent-cyan/10 border border-border overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

            <div className="relative z-10">
              <h2 className="text-3xl lg:text-5xl font-bold font-display text-ink mb-4">
                Ready to start your <span className="gradient-text">learning journey?</span>
              </h2>
              <p className="text-ink-soft mb-8 max-w-xl mx-auto">
                Experience AI-powered personalized learning paths. Build your profile and get your first roadmap in minutes.
              </p>
              <Link to={primaryCtaTo} className="btn-primary text-lg inline-flex">
                {primaryCtaLabel}
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
