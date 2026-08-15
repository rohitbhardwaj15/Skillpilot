import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';

function LandingRoute() {
  const navigate = useNavigate();
  return <Landing onStart={() => navigate('/onboarding')} />;
}

function OnboardingRoute() {
  const navigate = useNavigate();
  return (
    <Onboarding
      onComplete={(profile) => {
        // Day 6-8 will build the /roadmap page that consumes this profile.
        // For now, stash the id and go back to landing with a success state.
        localStorage.setItem('skillpilot_profile_id', profile._id);
        navigate('/', { state: { profileCreated: true } });
      }}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/onboarding" element={<OnboardingRoute />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
