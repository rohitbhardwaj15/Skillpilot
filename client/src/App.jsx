import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Roadmap from './pages/Roadmap';
import Dashboard from './pages/Dashboard';
import { api } from './lib/api';

function LandingRoute() {
  const navigate = useNavigate();
  return <Landing onStart={() => navigate('/onboarding')} />;
}

function OnboardingRoute() {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  async function handleComplete(profile) {
    setGenerating(true);
    setError('');
    try {
      const path = await api.generatePath(profile._id);
      localStorage.setItem('skillpilot_profile_id', profile._id);
      navigate(`/roadmap/${path._id}`);
    } catch (err) {
      setError(err.message);
      setGenerating(false);
    }
  }

  if (generating) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center flex-col gap-4 px-6">
        <div className="w-8 h-8 border-2 border-[var(--color-path)] border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-sm text-[var(--color-muted)]">Building your roadmap...</p>
        {error && <p className="text-red-400 text-sm text-center max-w-md">{error}</p>}
      </div>
    );
  }

  return <Onboarding onComplete={handleComplete} />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/onboarding" element={<OnboardingRoute />} />
        <Route path="/roadmap/:id" element={<Roadmap />} />
        <Route path="/dashboard/:id" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
