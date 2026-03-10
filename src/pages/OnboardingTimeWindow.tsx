import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DEFAULT_SETTINGS } from '../types';
import { type ActiveDay } from '../types';
import CircularTimeRangePicker from '../components/CircularTimeRangePicker';

const DAY_LETTERS: Record<ActiveDay, string> = {
  0: 'S', 1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S',
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, type: 'spring' as const, stiffness: 300, damping: 28 },
  }),
};

export default function OnboardingTimeWindow() {
  const navigate = useNavigate();
  const [startTime, setStartTime] = useState(DEFAULT_SETTINGS.startTime);
  const [endTime, setEndTime] = useState(DEFAULT_SETTINGS.endTime);
  const [activeDays, setActiveDays] = useState<ActiveDay[]>(DEFAULT_SETTINGS.activeDays);

  const toggleDay = (d: ActiveDay) => {
    setActiveDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  };

  const handleContinue = () => {
    navigate('/onboarding/style', { state: { startTime, endTime, activeDays } });
  };

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
        <div className="w-8 h-1.5 rounded-full bg-gray-200" />
      </motion.div>

      <motion.div
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="show"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow mb-5">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-accent-gray mb-1">
          When should we remind you?
        </h1>
        <p className="text-sm text-accent-gray mb-8">
          Pick your active days and time window.
        </p>
      </motion.div>

      <div className="space-y-6 flex-1">
        <motion.section custom={1} variants={fadeUp} initial="hidden" animate="show">
          <h2 className="text-xs font-semibold text-accent-gray uppercase tracking-wider mb-3">Days Active</h2>
          <div className="flex justify-between gap-1.5">
            {([1, 2, 3, 4, 5, 6, 0] as ActiveDay[]).map((d) => {
              const selected = activeDays.includes(d);
              return (
                <motion.button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`flex-1 aspect-square max-w-[44px] rounded-xl font-bold text-sm flex items-center justify-center transition-colors ${
                    selected
                      ? 'bg-primary text-white shadow-glow-sm'
                      : 'bg-white text-accent-gray border border-gray-300'
                  }`}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {DAY_LETTERS[d]}
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100/80"
        >
          <h2 className="text-xs font-semibold text-accent-gray uppercase tracking-wider mb-1">Time Window</h2>
          <p className="text-[11px] text-accent-gray mb-3">
            Drag the handles to set your reminder window.
          </p>
          <CircularTimeRangePicker
            startTime={startTime}
            endTime={endTime}
            onChangeStart={setStartTime}
            onChangeEnd={setEndTime}
            startLabel="Start"
            endLabel="End"
          />
        </motion.section>
      </div>

      <motion.button
        type="button"
        onClick={handleContinue}
        className="mt-8 w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-glow-sm flex items-center justify-center gap-2"
        custom={3}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        whileTap={{ scale: 0.97 }}
      >
        Continue
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </motion.button>
    </div>
  );
}
