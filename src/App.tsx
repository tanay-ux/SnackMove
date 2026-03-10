import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from './store/useAppStore';
import OnboardingTimeWindow from './pages/OnboardingTimeWindow';
import OnboardingSnackStyle from './pages/OnboardingSnackStyle';
import Home from './pages/Home';
import Stats from './pages/Stats';
import Settings from './pages/Settings';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  type: 'tween' as const,
  ease: [0.33, 1, 0.68, 1] as const,
  duration: 0.3,
};

function PageWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-surface gap-4">
      <motion.div
        className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow"
        animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </motion.div>
      <motion.p
        className="text-primary font-semibold text-sm"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Loading...
      </motion.p>
    </div>
  );
}

function App() {
  const { hydrate, hydrated, onboardingComplete } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return <LoadingScreen />;
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {onboardingComplete ? (
          <>
            <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="/stats" element={<PageWrapper><Stats /></PageWrapper>} />
            <Route path="/settings" element={<PageWrapper><Settings /></PageWrapper>} />
            <Route path="/onboarding" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<PageWrapper><OnboardingTimeWindow /></PageWrapper>} />
            <Route path="/onboarding/style" element={<PageWrapper><OnboardingSnackStyle /></PageWrapper>} />
            <Route path="/stats" element={<Navigate to="/" replace />} />
            <Route path="/settings" element={<Navigate to="/" replace />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
