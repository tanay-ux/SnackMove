import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { SNACK_PACKS, getExerciseSteps, type ExerciseStep } from '../lib/snackPacks';
import type { SnackStyle } from '../types';

const SNOOZE_OPTIONS = [
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
];

interface ReminderModalProps {
  title: string;
  onClose: () => void;
  onSnooze: (minutes: number) => void;
  onComplete: (exercisesIncluded: string[]) => void;
  initialSteps?: ExerciseStep[];
  entry?: 'manual' | 'reminder';
}

type Phase = 'intro' | 'exercise' | 'done';

const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const sheet = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { type: 'spring' as const, stiffness: 350, damping: 35 } },
  exit: { y: '100%', transition: { type: 'spring' as const, stiffness: 400, damping: 40 } },
};

export default function ReminderModal({
  title,
  onClose,
  onSnooze,
  onComplete,
  initialSteps,
  entry = 'reminder',
}: ReminderModalProps) {
  const settings = useAppStore((s) => s.settings);
  const snackStyle: SnackStyle = settings?.snackStyle ?? 'energizing';
  const durationMinutes = settings?.snackDuration ?? 2;
  const pack = SNACK_PACKS[snackStyle];
  const hasInitialSteps = (initialSteps?.length ?? 0) > 0;
  const [steps, setSteps] = useState<ExerciseStep[]>(() =>
    hasInitialSteps ? (initialSteps as ExerciseStep[]) : getExerciseSteps(snackStyle, durationMinutes)
  );

  const [phase, setPhase] = useState<Phase>(hasInitialSteps ? 'exercise' : 'intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [snoozeExpanded, setSnoozeExpanded] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const showCancelConfirmRef = useRef(showCancelConfirm);
  showCancelConfirmRef.current = showCancelConfirm;

  useEffect(() => {
    if (hasInitialSteps) return;
    setSteps(getExerciseSteps(snackStyle, durationMinutes));
    setPhase('intro');
    setCurrentIndex(0);
    setSecondsLeft(0);
    setSnoozeExpanded(false);
  }, [snackStyle, durationMinutes, hasInitialSteps]);

  const currentStep: ExerciseStep | null = steps[currentIndex] ?? null;

  useEffect(() => {
    if (phase !== 'exercise' || !currentStep) return;
    setSecondsLeft(currentStep.durationSeconds);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (showCancelConfirmRef.current) return s;
        if (s <= 1) { clearInterval(interval); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, currentIndex, currentStep?.name]);

  const handleStart = () => setPhase('exercise');

  const handleSnooze = (minutes: number) => {
    const endMins = settings
      ? parseInt(settings.endTime.slice(0, 2), 10) * 60 + parseInt(settings.endTime.slice(3), 10)
      : 17 * 60;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const actualMins = Math.min(minutes, Math.max(0, endMins - nowMins));
    onSnooze(actualMins);
    onClose();
  };

  const handleCompleteExercise = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onComplete(steps.map((s) => s.name));
      setPhase('done');
    }
  };

  const handleSkipExercise = () => {
    if (!currentStep) return;
    const allDefs = pack.exercises;
    const usedIds = new Set(steps.map((s) => s.name));
    const candidates = allDefs.filter((def) => def.name !== currentStep.name && !usedIds.has(def.name));
    const fallbackPool = allDefs.filter((def) => def.name !== currentStep.name);
    const pool = candidates.length > 0 ? candidates : fallbackPool;
    if (pool.length === 0) return;
    const replacementDef = pool[Math.floor(Math.random() * pool.length)];
    const replacement: ExerciseStep = { ...replacementDef, durationSeconds: currentStep.durationSeconds };
    setSteps((prev) => prev.map((s, idx) => (idx === currentIndex ? replacement : s)));
  };

  const totalSeconds = currentStep?.durationSeconds ?? 0;
  const elapsedSeconds = totalSeconds - secondsLeft;
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? Math.min(1, Math.max(0, elapsedSeconds / totalSeconds)) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const formatTimeFn = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${String(rem).padStart(2, '0')}`;
  };

  const cancelConfirmOverlay = showCancelConfirm && (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.stopPropagation()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-[320px] bg-white rounded-2xl p-5 shadow-lg mx-4"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <p className="text-accent-gray font-semibold mb-1">Cancel snack?</p>
        <p className="text-sm text-gray-400 mb-4">You haven&apos;t completed this session.</p>
        <div className="flex gap-2">
          <motion.button
            type="button"
            onClick={() => setShowCancelConfirm(false)}
            className="flex-1 rounded-xl border border-gray-200 text-accent-gray py-2.5 font-semibold text-sm"
            whileTap={{ scale: 0.97 }}
          >
            Keep going
          </motion.button>
          <motion.button
            type="button"
            onClick={() => { setShowCancelConfirm(false); onClose(); }}
            className="flex-1 rounded-xl bg-primary text-white py-2.5 font-semibold text-sm"
            whileTap={{ scale: 0.97 }}
          >
            Yes, cancel
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );

  if (phase === 'intro') {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto"
        variants={backdrop}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={() => setShowCancelConfirm(true)}
      >
        <div className="absolute inset-0 bg-black/40" />
        <motion.div
          className="w-full bg-white rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto relative z-10"
          variants={sheet}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-bold text-accent-gray mb-1">{title}</h2>
          <p className="text-sm text-accent-gray mb-4">{pack.title} · {durationMinutes} min</p>

          <div className="mb-5">
            <p className="text-xs font-semibold text-accent-gray uppercase tracking-wider mb-2">Exercises</p>
            <ul className="space-y-2">
              {steps.map((step, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex justify-between items-center rounded-xl bg-surface border border-gray-100 px-3.5 py-3 text-sm text-accent-gray"
                >
                  <span className="font-medium">{step.name}</span>
                  <span className="text-accent-gray text-xs font-semibold bg-gray-100 px-2 py-0.5 rounded-full">{step.durationSeconds}s</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            {entry === 'reminder' ? (
              <motion.button
                type="button"
                onClick={() => setSnoozeExpanded((e) => !e)}
                className="flex-1 rounded-xl border border-gray-200 text-accent-gray py-3 font-semibold text-sm"
                whileTap={{ scale: 0.97 }}
              >
                Snooze
              </motion.button>
            ) : (
              <motion.button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-200 text-accent-gray py-3 font-semibold text-sm"
                whileTap={{ scale: 0.97 }}
              >
                Cancel
              </motion.button>
            )}
            <motion.button
              type="button"
              onClick={handleStart}
              className="flex-1 rounded-xl bg-primary text-white py-3 font-bold text-sm shadow-glow-sm"
              whileTap={{ scale: 0.97 }}
            >
              Start
            </motion.button>
          </div>

          <AnimatePresence>
            {entry === 'reminder' && snoozeExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-accent-gray mb-2">Snooze for</p>
                  <div className="flex gap-2 flex-wrap">
                    {SNOOZE_OPTIONS.map(({ label, minutes }) => (
                      <motion.button
                        key={label}
                        type="button"
                        onClick={() => handleSnooze(minutes)}
                        className="rounded-xl bg-surface border border-gray-100 text-accent-gray font-semibold py-2.5 px-4 text-sm"
                        whileTap={{ scale: 0.95 }}
                      >
                        {label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {cancelConfirmOverlay}
        </motion.div>
      </motion.div>
    );
  }

  if (phase === 'done') {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto"
        variants={backdrop}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="absolute inset-0 bg-black/40" />
        <motion.div
          className="w-full bg-white rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] relative z-10 text-center"
          variants={sheet}
        >
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
          <motion.div
            className="w-16 h-16 rounded-full bg-accent-green/15 flex items-center justify-center mx-auto mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.15 }}
          >
            <motion.svg
              className="w-8 h-8 text-accent-green"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              viewBox="0 0 24 24"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </motion.svg>
          </motion.div>
          <h2 className="text-xl font-bold text-accent-gray mb-1">Snack logged!</h2>
          <p className="text-sm text-accent-gray mb-1">
            Nice work! That was your {durationMinutes}-minute {pack.title.toLowerCase()} snack.
          </p>
          <p className="text-xs text-accent-gray mb-6">
            Small movement breaks help reduce stiffness and boost energy throughout the day.
          </p>
          <motion.button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-primary text-white py-3.5 font-bold shadow-glow-sm"
            whileTap={{ scale: 0.97 }}
          >
            Done
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto"
      variants={backdrop}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={() => setShowCancelConfirm(true)}
    >
        <div className="absolute inset-0 bg-black/40" />
      <motion.div
        className="w-full bg-white rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] relative z-10"
        variants={sheet}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        {/* Step indicator */}
        <div className="flex gap-1.5 mb-4">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              className={`h-1 rounded-full flex-1 ${i <= currentIndex ? 'bg-primary' : 'bg-gray-200'}`}
              animate={{ scaleX: i === currentIndex ? [1, 1.05, 1] : 1 }}
              transition={i === currentIndex ? { duration: 1.5, repeat: Infinity } : undefined}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <p className="text-xs font-semibold text-accent-gray mb-1">
              Exercise {currentIndex + 1} of {steps.length}
            </p>
            <h2 className="text-xl font-bold text-accent-gray mb-1">{currentStep?.name}</h2>
            {currentStep && (
              <p className="text-sm text-accent-gray mb-4">{currentStep.description}</p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Timer ring */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            <svg width={180} height={180} viewBox="0 0 200 200" aria-label={`Time remaining: ${formatTimeFn(secondsLeft)}`}>
              <circle cx="100" cy="100" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="8" />
              <motion.circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="url(#timer-gradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                transform="rotate(-90 100 100)"
              />
              <defs>
                <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6B4EAA" />
                  <stop offset="100%" stopColor="#8B6FCC" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                key={secondsLeft}
                className="text-3xl font-bold text-accent-gray tabular-nums"
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                {formatTimeFn(secondsLeft)}
              </motion.span>
              <span className="text-xs text-accent-gray mt-0.5">remaining</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <motion.button
            type="button"
            onClick={handleCompleteExercise}
            className="w-full rounded-xl bg-primary text-white py-3.5 font-bold shadow-glow-sm"
            whileTap={{ scale: 0.97 }}
          >
            {currentIndex < steps.length - 1 ? 'Next exercise' : 'Complete & log snack'}
          </motion.button>
          <motion.button
            type="button"
            onClick={handleSkipExercise}
            className="w-full rounded-xl border border-gray-200 text-accent-gray py-2.5 text-sm font-semibold"
            whileTap={{ scale: 0.97 }}
          >
            Skip — show another
          </motion.button>
          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            className="w-full text-accent-gray py-2 text-sm font-medium"
          >
            Cancel snack
          </button>
        </div>
        {cancelConfirmOverlay}
      </motion.div>
    </motion.div>
  );
}
