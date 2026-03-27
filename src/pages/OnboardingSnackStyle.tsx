import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { requestNotificationPermission } from '../lib/push';
import { SNACK_PACKS } from '../lib/snackPacks';
import type { SnackStyle, ActiveDay } from '../types';

const STYLE_CONFIG: Record<SnackStyle, { bg: string; icon: React.ReactNode; accent: string }> = {
  gentle: {
    bg: 'bg-accent-blue/15',
    accent: 'border-accent-blue',
    icon: <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  },
  energizing: {
    bg: 'bg-primary-50',
    accent: 'border-primary',
    icon: <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  },
  strength: {
    bg: 'bg-accent-pink/15',
    accent: 'border-accent-pink',
    icon: <svg className="w-5 h-5 text-accent-pink" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>,
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, type: 'spring' as const, stiffness: 300, damping: 28 },
  }),
};

export default function OnboardingSnackStyle() {
  const location = useLocation();
  const navigate = useNavigate();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const state = location.state as { startTime?: string; endTime?: string; activeDays?: number[] } | undefined;
  const [selected, setSelected] = useState<SnackStyle>('energizing');

  async function handleStart() {
    await completeOnboarding({
      startTime: state?.startTime ?? '09:00',
      endTime: state?.endTime ?? '17:00',
      activeDays: (state?.activeDays as ActiveDay[] | undefined) ?? [1, 2, 3, 4, 5],
      snackStyle: selected,
    });
    await requestNotificationPermission();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-dvh bg-surface safe-top flex flex-col px-5 pt-14 pb-10">
      {/* Progress dots */}
      <motion.div
        className="flex gap-2 mb-8 pt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="w-8 h-1.5 rounded-full bg-primary" />
        <div className="w-8 h-1.5 rounded-full bg-primary" />
      </motion.div>

      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
        <div className="w-14 h-14 rounded-2xl bg-gradient-warm flex items-center justify-center shadow-glow mb-5">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-accent-gray mb-1">
          How should your movement feel?
        </h1>
        <p className="text-sm text-accent-gray mb-6">
          Each style uses different exercises. You can change it any time.
        </p>
      </motion.div>

      <div className="space-y-3 flex-1">
        {(Object.keys(SNACK_PACKS) as SnackStyle[]).map((style, index) => {
          const pack = SNACK_PACKS[style];
          const isSelected = selected === style;
          const config = STYLE_CONFIG[style];

          return (
            <motion.button
              key={style}
              type="button"
              onClick={() => setSelected(style)}
              custom={index + 1}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className={`w-full text-left rounded-2xl p-4 shadow-soft border-2 transition-all ${
                isSelected
                  ? `${config.accent} bg-white`
                  : 'border-transparent bg-white hover:border-gray-200'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-accent-gray">{pack.title}</span>
                  </div>
                  <p className="text-sm text-accent-gray mt-0.5">{pack.subtitle}</p>
                  <p className="text-xs text-accent-gray mt-1.5 leading-relaxed">{pack.explanation}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center ${
                  isSelected ? 'border-primary bg-primary' : 'border-gray-200'
                }`}>
                  {isSelected && (
                    <motion.svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </motion.svg>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <motion.button
        type="button"
        onClick={handleStart}
        custom={4}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mt-8 w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-glow-sm flex items-center justify-center gap-2"
        whileTap={{ scale: 0.97 }}
      >
        Start moving
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </motion.button>
    </div>
  );
}
