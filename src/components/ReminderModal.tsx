import { useState, useEffect, useRef } from 'react';
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
    // Reset sequence when style or duration changes
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
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
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
    const replacement: ExerciseStep = {
      ...replacementDef,
      durationSeconds: currentStep.durationSeconds,
    };
    setSteps((prev) =>
      prev.map((s, idx) => (idx === currentIndex ? replacement : s)),
    );
  };

  const totalSeconds = currentStep?.durationSeconds ?? 0;
  const elapsedSeconds = totalSeconds - secondsLeft;
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? Math.min(1, Math.max(0, elapsedSeconds / totalSeconds)) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${String(rem).padStart(2, '0')}`;
  };

  const cancelConfirmOverlay = showCancelConfirm && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.stopPropagation()}>
      <div className="w-full max-w-[320px] bg-white rounded-button p-5 shadow-lg mx-4">
        <p className="text-accent-gray font-medium mb-4">Cancel snack? You haven&apos;t completed this snack.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowCancelConfirm(false)}
            className="flex-1 rounded-button border border-gray-200 text-accent-gray py-2.5 font-medium text-sm"
          >
            Keep going
          </button>
          <button
            type="button"
            onClick={() => { setShowCancelConfirm(false); onClose(); }}
            className="flex-1 rounded-button bg-primary text-white py-2.5 font-semibold text-sm"
          >
            Yes, cancel
          </button>
        </div>
      </div>
    </div>
  );

  if (phase === 'intro') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 max-w-[480px] mx-auto"
        onClick={() => setShowCancelConfirm(true)}
      >
        <div className="w-full bg-white rounded-t-[1.5rem] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] animate-slide-up max-h-[85dvh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold text-accent-gray mb-1">{title}</h2>
          <p className="text-sm text-accent-gray/80 mb-3">{pack.title} · {durationMinutes} min</p>

          <div className="mb-4">
            <p className="text-xs font-semibold text-accent-gray/80 uppercase tracking-wide mb-2">Exercises</p>
            <ul className="space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex justify-between items-center rounded-button bg-gray-50 px-3 py-2 text-sm text-accent-gray">
                  <span>{step.name}</span>
                  <span className="text-accent-gray/70 font-medium">{step.durationSeconds}s</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            {entry === 'reminder' ? (
              <button
                type="button"
                onClick={() => setSnoozeExpanded((e) => !e)}
                className="flex-1 rounded-button border border-gray-200 text-accent-gray py-2.5 font-medium text-sm"
              >
                Snooze
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-button border border-gray-200 text-accent-gray py-2.5 font-medium text-sm"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleStart}
              className="flex-1 rounded-button bg-primary text-white py-2.5 font-semibold text-sm"
            >
              Start
            </button>
          </div>

          {entry === 'reminder' && snoozeExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-accent-gray/70 mb-2">Snooze for</p>
              <div className="flex gap-2 flex-wrap">
                {SNOOZE_OPTIONS.map(({ label, minutes }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleSnooze(minutes)}
                    className="rounded-button bg-gray-100 text-accent-gray font-medium py-2 px-3 text-sm"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {cancelConfirmOverlay}
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 max-w-[480px] mx-auto">
        <div className="w-full bg-white rounded-t-[1.5rem] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] animate-slide-up">
          <h2 className="text-xl font-bold text-accent-gray mb-2">Snack logged</h2>
          <p className="text-sm text-accent-gray/80 mb-3">
            Nice work. That was your {durationMinutes}-minute {pack.title.toLowerCase()} snack.
          </p>
          <p className="text-xs text-accent-gray/70 mb-6">
            These small movement breaks can help reduce desk stiffness and support your overall energy through the day.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-button bg-primary text-white py-3.5 font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 max-w-[480px] mx-auto"
      onClick={() => setShowCancelConfirm(true)}
    >
      <div className="w-full bg-white rounded-t-[1.5rem] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] animate-slide-up relative" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-medium text-accent-gray/70 mb-1">
          Exercise {currentIndex + 1} of {steps.length}
        </p>
        <h2 className="text-xl font-bold text-accent-gray mb-2">{currentStep?.name}</h2>
        {currentStep && (
          <p className="text-sm text-accent-gray/80 mb-4">{currentStep.description}</p>
        )}
        <div className="flex justify-center mb-4 mt-2">
          <svg
            width={200}
            height={200}
            viewBox="0 0 200 200"
            aria-label={`Time remaining: ${formatTime(secondsLeft)}`}
          >
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="10"
            />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#6B4EAA"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 100 100)"
            />
            <text
              x="100"
              y="100"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#111827"
              fontSize="32"
              fontWeight="700"
            >
              {formatTime(secondsLeft)}
            </text>
          </svg>
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <button
            type="button"
            onClick={handleCompleteExercise}
            className="w-full rounded-button bg-primary text-white py-3.5 font-semibold"
          >
            {currentIndex < steps.length - 1 ? 'Next exercise' : 'Complete & log snack'}
          </button>
          <button
            type="button"
            onClick={handleSkipExercise}
            className="w-full rounded-button border border-gray-200 text-accent-gray py-2.5 text-sm font-medium"
          >
            Skip move – show another
          </button>
          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            className="w-full rounded-button text-accent-gray/80 py-2 text-sm font-medium underline underline-offset-2"
          >
            Cancel snack
          </button>
        </div>
        {cancelConfirmOverlay}
      </div>
    </div>
  );
}
