import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import OnboardingTimeWindow from './pages/OnboardingTimeWindow';
import OnboardingSnackStyle from './pages/OnboardingSnackStyle';
import Home from './pages/Home';
import Stats from './pages/Stats';
import Settings from './pages/Settings';

function App() {
  const { hydrate, hydrated, onboardingComplete } = useAppStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <div className="text-primary font-semibold">Loading…</div>
      </div>
    );
  }

  return (
    <Routes>
      {onboardingComplete ? (
        <>
          <Route path="/" element={<Home />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/onboarding" element={<Navigate to="/" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<OnboardingTimeWindow />} />
          <Route path="/onboarding/style" element={<OnboardingSnackStyle />} />
          <Route path="/stats" element={<Navigate to="/" replace />} />
          <Route path="/settings" element={<Navigate to="/" replace />} />
        </>
      )}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
