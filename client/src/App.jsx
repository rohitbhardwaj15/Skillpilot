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

export default function App() {
  const location = useLocation()

  return (
    <div className="relative min-h-screen bg-dark-900 text-white">
      <ParticleBackground />
      <Navbar />
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><LandingPage /></PageWrapper>} />
            <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
            <Route path="/register" element={<PageWrapper><RegisterPage /></PageWrapper>} />

            <Route path="/onboarding" element={
              <ProtectedRoute><PageWrapper><OnboardingPage /></PageWrapper></ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute><PageWrapper><DashboardPage /></PageWrapper></ProtectedRoute>
            } />
            <Route path="/paths" element={
              <ProtectedRoute><PageWrapper><LearningPathPage /></PageWrapper></ProtectedRoute>
            } />
            <Route path="/assistant" element={
              <ProtectedRoute><PageWrapper><AIAssistantPage /></PageWrapper></ProtectedRoute>
            } />
            <Route path="/recommendations" element={
              <ProtectedRoute><PageWrapper><RecommendationsPage /></PageWrapper></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><PageWrapper><ProfilePage /></PageWrapper></ProtectedRoute>
            } />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}
