import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import ParticleBackground from './components/3d/ParticleBackground'
import ProtectedRoute from './components/auth/ProtectedRoute'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import LearningPathPage from './pages/LearningPathPage'
import AIAssistantPage from './pages/AIAssistantPage'
import RecommendationsPage from './pages/RecommendationsPage'
import ProfilePage from './pages/ProfilePage'
import AssessmentPage from './pages/AssessmentPage'


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

function ProtectedPage({ children }) {
  return (
    <ProtectedRoute>
      <PageWrapper>
        {children}
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
                  <LoginPage />
                </PageWrapper>
              }
            />

            <Route
              path="/register"
              element={
                <PageWrapper>
                  <RegisterPage />
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
