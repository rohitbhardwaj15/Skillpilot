import { Suspense, lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import ParticleBackground from './components/3d/ParticleBackground'
import ProtectedRoute from './components/auth/ProtectedRoute'

// LandingPage stays eager — it's the first thing every visitor sees, so
// there's nothing to gain from a loading flash on it.
import LandingPage from './pages/LandingPage'

// Every other page is lazy-loaded so heavy chunks (three.js for the 3D
// skill graph, recharts for the dashboard) only download when a route
// that actually needs them is visited, instead of on every page load.
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const LearningPathPage = lazy(() => import('./pages/LearningPathPage'))
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'))
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const AssessmentPage = lazy(() => import('./pages/AssessmentPage'))


function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  )
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-accent-orange/30 border-t-accent-orange animate-spin" />
    </div>
  )
}

function ProtectedPage({ children }) {
  return (
    <ProtectedRoute>
      <PageWrapper>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </PageWrapper>
    </ProtectedRoute>
  )
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white px-6 pt-32 text-center text-slate-900">
      <h1 className="text-5xl font-bold">
        404
      </h1>

      <p className="mt-4 text-lg text-slate-600">
        Page not found.
      </p>
    </div>
  )
}

export default function App() {
  const location = useLocation()

  return (
    <div className="relative min-h-screen bg-dark-900 text-white">
      <ParticleBackground />

      <Navbar />

      <main className="relative z-10">
        <AnimatePresence
          mode="wait"
        >
          <Routes
            location={location}
            key={location.pathname}
          >

            {/* ================================
                PUBLIC ROUTES
            ================================= */}

            <Route
              path="/"
              element={
                <PageWrapper>
                  <LandingPage />
                </PageWrapper>
              }
            />

            <Route
              path="/login"
              element={
                <PageWrapper>
                  <Suspense fallback={<PageLoader />}>
                    <LoginPage />
                  </Suspense>
                </PageWrapper>
              }
            />

            <Route
              path="/register"
              element={
                <PageWrapper>
                  <Suspense fallback={<PageLoader />}>
                    <RegisterPage />
                  </Suspense>
                </PageWrapper>
              }
            />


            {/* ================================
                PROTECTED ROUTES
            ================================= */}

            <Route
              path="/onboarding"
              element={
                <ProtectedPage>
                  <OnboardingPage />
                </ProtectedPage>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedPage>
                  <DashboardPage />
                </ProtectedPage>
              }
            />

            <Route
              path="/paths"
              element={
                <ProtectedPage>
                  <LearningPathPage />
                </ProtectedPage>
              }
            />

            <Route
              path="/assistant"
              element={
                <ProtectedPage>
                  <AIAssistantPage />
                </ProtectedPage>
              }
            />

            <Route
              path="/recommendations"
              element={
                <ProtectedPage>
                  <RecommendationsPage />
                </ProtectedPage>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedPage>
                  <ProfilePage />
                </ProtectedPage>
              }
            />

            <Route
              path="/assessment"
              element={
                <ProtectedPage>
                  <AssessmentPage />
                </ProtectedPage>
              }
            />


           

            {/* ================================
                404
            ================================= */}

            <Route
              path="*"
              element={
                <PageWrapper>
                  <NotFoundPage />
                </PageWrapper>
              }
            />

          </Routes>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  )
}
