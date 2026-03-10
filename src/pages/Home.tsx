import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '../components/BottomNav';
import QuickLogModal from '../components/QuickLogModal';
import ReminderModal from '../components/ReminderModal';
import { useAppStore } from '../store/useAppStore';
import { useTodayStore } from '../store/useTodayStore';
import { useReminder } from '../hooks/useReminder';
import { getBenefitsForToday } from '../lib/benefits';
import { getNextReminderTime, isWithinWindow, minutesUntil } from '../lib/reminderEngine';
import { getCurrentStreak } from '../db';
import { SNACK_PACKS, getExerciseSteps, type ExerciseStep } from '../lib/snackPacks';
import { checkNativeLaunchIntent, requestNativePermissions, isNativePlatform, scheduleNativeAlarm, fireTestNotification } from '../lib/nativeAlarm';
import RatePrompt from '../components/RatePrompt';

function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {value}
    </motion.span>
  );
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};

export default function Home() {
  const settings = useAppStore((s) => s.settings);
  const { events, loadToday, logSnack } = useTodayStore();
  const [nextReminder, setNextReminder] = useState<number | null>(null);
  const [withinWindow, setWithinWindow] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);
  const [reminderEntry, setReminderEntry] = useState<'manual' | 'reminder'>('reminder');
  const [reminderTitle, setReminderTitle] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [justLogged, setJustLogged] = useState(false);
  const justLoggedTimeout = useRef<number | null>(null);
  const [nextSnackSteps, setNextSnackSteps] = useState<ExerciseStep[]>([]);
  const [openSnackKey, setOpenSnackKey] = useState<string | null>(null);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const testTimerRef = useRef<number | null>(null);
  const { snooze } = useReminder((title) => {
    setReminderTitle(title);
    setReminderEntry('reminder');
    setShowSnooze(true);
  });

  useEffect(() => { loadToday(); }, [loadToday]);

  useEffect(() => {
    const log = searchParams.get('log');
    const reminder = searchParams.get('reminder');
    if (log === '1' || reminder === '1') {
      setShowQuickLog(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!settings) return;
    const now = new Date();
    setWithinWindow(isWithinWindow(settings, now));
    getNextReminderTime(settings).then(setNextReminder);
  }, [settings, events]);

  useEffect(() => {
    if (!settings) return;
    setNextSnackSteps(getExerciseSteps(settings.snackStyle, settings.snackDuration));
  }, [settings?.snackStyle, settings?.snackDuration, settings]);

  useEffect(() => { getCurrentStreak().then(setStreak); }, [events]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const bootstrapNativeState = async () => {
      const granted = await requestNativePermissions();
      console.log('[Home] initial notification permission granted:', granted);
      const started = await checkNativeLaunchIntent();
      console.log('[Home] launch intent snackStart:', started);
      if (started) {
        setReminderTitle('Time to move!');
        setReminderEntry('reminder');
        setShowSnooze(true);
      }
    };
    void bootstrapNativeState();
  }, []);

  const markJustLogged = () => {
    if (justLoggedTimeout.current != null) window.clearTimeout(justLoggedTimeout.current);
    setJustLogged(true);
    justLoggedTimeout.current = window.setTimeout(() => {
      setJustLogged(false);
      justLoggedTimeout.current = null;
    }, 1800);
  };

  useEffect(() => () => {
    if (justLoggedTimeout.current != null) window.clearTimeout(justLoggedTimeout.current);
    if (testTimerRef.current != null) window.clearInterval(testTimerRef.current);
  }, []);

  const startTestNotification = async () => {
    const triggerAt = Date.now() + 10_000;
    setTestCountdown(10);
    if (isNativePlatform()) {
      const granted = await requestNativePermissions();
      if (!granted) { setTestCountdown(null); return; }
      await scheduleNativeAlarm(triggerAt, 'Test reminder!');
    }
    testTimerRef.current = window.setInterval(() => {
      setTestCountdown((c) => {
        if (c == null || c <= 1) {
          if (testTimerRef.current != null) window.clearInterval(testTimerRef.current);
          testTimerRef.current = null;
          setReminderTitle('Test reminder!');
          setReminderEntry('reminder');
          setShowSnooze(true);
          return null;
        }
        return c - 1;
      });
    }, 1000);
  };

  const fireDirectNotification = async () => {
    if (isNativePlatform()) {
      const granted = await requestNativePermissions();
      if (!granted) return;
      await fireTestNotification('Test notification!');
    }
  };

  const snackCount = events.length;
  const totalMinutes = events.reduce((a, e) => a + e.duration, 0);
  const benefits = settings ? getBenefitsForToday(settings.snackStyle, snackCount, totalMinutes) : [];
  const minsUntil = nextReminder != null ? minutesUntil(nextReminder) : null;
  const packTitle = settings ? SNACK_PACKS[settings.snackStyle]?.title : 'Movement snack';
  const durationMinutes = settings?.snackDuration ?? 2;
  const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const formatWindowTime = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
    const d = new Date(2000, 0, 1, h, m);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  const snackWindowLabel = settings
    ? `${formatWindowTime(settings.startTime)} – ${formatWindowTime(settings.endTime)}`
    : '';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const maxSnacks = settings?.maxRemindersPerDay ?? 5;
  const progressPercent = Math.min(100, Math.round((snackCount / maxSnacks) * 100));

  return (
    <div className="min-h-dvh bg-surface safe-top">
      <main className="px-5 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <motion.div variants={stagger} initial="hidden" animate="show">

          {/* Header */}
          <motion.header variants={fadeUp} className="mb-5">
            <p className="text-sm font-medium text-primary/70 mb-0.5">{greeting}</p>
            <h1 className="text-2xl font-bold text-accent-gray">SnackMove</h1>
          </motion.header>

          {/* Stats row */}
          <motion.div variants={fadeUp} className="flex gap-3 mb-5">
            <div className="flex-1 bg-white rounded-2xl p-4 shadow-soft border border-gray-100/80">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-xs text-accent-gray font-medium">Today</p>
              </div>
              <p className="text-3xl font-bold text-accent-gray leading-none">
                <AnimatedNumber value={snackCount} />
              </p>
              <p className="text-xs text-gray-400 mt-1">snack{snackCount !== 1 ? 's' : ''} done</p>
            </div>
            <div className="flex-1 bg-white rounded-2xl p-4 shadow-soft border border-gray-100/80">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-accent-yellow/15 flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent-yellow" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.9 2.6l2.3 5a.5.5 0 00.4.3l5.4.7a.5.5 0 01.3.9l-3.9 3.7a.5.5 0 00-.2.5l1 5.3a.5.5 0 01-.8.5L12.6 17a.5.5 0 00-.5 0l-4.8 2.6a.5.5 0 01-.7-.6l1-5.3a.5.5 0 00-.2-.5L3.5 9.5a.5.5 0 01.3-.9l5.4-.7a.5.5 0 00.4-.3l2.3-5a.5.5 0 01 1 0z" />
                  </svg>
                </div>
                <p className="text-xs text-accent-gray font-medium">Streak</p>
              </div>
              <p className="text-3xl font-bold text-accent-gray leading-none">
                <AnimatedNumber value={streak} />
              </p>
              <p className="text-xs text-gray-400 mt-1">day{streak !== 1 ? 's' : ''}</p>
            </div>
          </motion.div>

          {/* Goal progress bar */}
          <motion.div variants={fadeUp} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-accent-gray uppercase tracking-wider">Goal progress</p>
              <p className="text-xs font-medium text-accent-gray">{snackCount}/{maxSnacks}</p>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.3 }}
              />
            </div>
          </motion.div>

          {/* Window status */}
          <motion.div variants={fadeUp} className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${withinWindow ? 'bg-accent-green animate-pulse-soft' : 'bg-gray-300'}`} />
              <p className="text-sm font-medium text-accent-gray">
                {withinWindow ? 'Active window' : 'Outside window'}
                {snackWindowLabel ? <span className="text-accent-gray ml-1 font-normal">({snackWindowLabel})</span> : ''}
              </p>
            </div>
            <Link
              to="/settings?edit=window"
              className="text-xs font-semibold text-primary bg-primary-50 px-2.5 py-1 rounded-full"
            >
              Edit
            </Link>
          </motion.div>

          {/* Hero snack card */}
          <motion.div
            variants={fadeUp}
            className="relative rounded-3xl overflow-hidden mb-5 shadow-card"
          >
            <div className="absolute inset-0 bg-gradient-hero" />
            <div className="hero-orb w-32 h-32 bg-primary-light top-[-20px] right-[-20px]" />
            <div className="hero-orb w-24 h-24 bg-accent-pink bottom-[-10px] left-[-10px]" />

            <div className="relative z-10 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-white/20 text-white/90 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
                  Next snack
                </span>
                {withinWindow && minsUntil != null && (
                  <span className="bg-white/15 text-white/80 text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
                    in ~{minsUntil} min
                  </span>
                )}
              </div>

              <h2 className="text-white text-xl font-bold">{packTitle}</h2>
              <p className="text-white/70 text-sm mt-0.5">{durationMinutes} min workout</p>

              {nextSnackSteps.length > 0 && (
                <div className="mt-4 space-y-2">
                  {nextSnackSteps.map((step, i) => (
                    <motion.div
                      key={`${step.name}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.08 }}
                      className="flex justify-between items-center rounded-xl bg-white/10 backdrop-blur-sm px-3.5 py-2.5"
                    >
                      <span className="text-white text-sm font-medium">{step.name}</span>
                      <span className="text-white text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">{step.durationSeconds}s</span>
                    </motion.div>
                  ))}
                </div>
              )}

              <motion.button
                type="button"
                onClick={() => {
                  setReminderEntry('manual');
                  setReminderTitle('Ready to move?');
                  setShowSnooze(true);
                }}
                className="mt-5 w-full bg-white text-primary font-bold py-3 rounded-2xl flex items-center justify-center gap-2.5 shadow-soft"
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                Start Snack
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </motion.button>
            </div>
          </motion.div>

          {/* Test notifications */}
          <motion.div variants={fadeUp} className="flex gap-2 mb-6">
            <motion.button
              type="button"
              onClick={startTestNotification}
              disabled={testCountdown != null}
              className="flex-1 rounded-2xl border border-dashed border-primary/25 bg-primary-50/50 text-primary text-sm font-semibold py-3 disabled:opacity-50 flex items-center justify-center gap-2"
              whileTap={{ scale: 0.97 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {testCountdown != null ? `In ${testCountdown}s...` : 'Test alarm (10s)'}
            </motion.button>
            <motion.button
              type="button"
              onClick={fireDirectNotification}
              className="flex-1 rounded-2xl border border-dashed border-accent-orange/30 bg-accent-orange/5 text-accent-orange text-sm font-semibold py-3 flex items-center justify-center gap-2"
              whileTap={{ scale: 0.97 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Fire now
            </motion.button>
          </motion.div>

          {/* Today's progress */}
          <motion.section variants={fadeUp} className="mb-6">
            <h2 className="text-xs font-semibold text-accent-gray uppercase tracking-wider mb-3">Today&apos;s activity</h2>
            <div className="bg-white rounded-2xl p-4 shadow-soft border border-gray-100/80">
              {snackCount === 0 ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-accent-gray" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-accent-gray font-medium">No snacks yet today</p>
                  <p className="text-xs text-accent-gray mt-0.5">Start your first snack above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {sortedEvents.map((e, idx) => {
                      const key = String(e.id ?? `${e.timestamp}-${idx}`);
                      const isOpen = openSnackKey === key;
                      const title = `Snack at ${formatTime(e.timestamp)}`;
                      const subtitle = `${e.duration} min · ${SNACK_PACKS[e.snackStyle]?.title ?? e.snackStyle}`;
                      const list = (e.exercisesIncluded ?? []).filter(Boolean);

                      return (
                        <motion.div
                          key={key}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="rounded-xl bg-surface border border-gray-100 overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => setOpenSnackKey((cur) => (cur === key ? null : key))}
                            className="w-full flex items-center justify-between px-3.5 py-3 text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-accent-gray">{title}</p>
                                <p className="text-xs text-accent-gray mt-0.5">{subtitle}</p>
                              </div>
                            </div>
                              <motion.svg
                              className="w-4 h-4 text-accent-gray shrink-0"
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                              animate={{ rotate: isOpen ? 180 : 0 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </motion.svg>
                          </button>

                          <AnimatePresence>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3.5 pb-3">
                                  {list.length > 0 ? (
                                    <ul className="space-y-1.5">
                                      {list.map((name, i) => (
                                        <li key={`${name}-${i}`} className="text-sm text-accent-gray bg-white rounded-lg px-3 py-2 border border-gray-50">
                                          {name}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-accent-gray">No exercise details for this snack.</p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              <AnimatePresence>
                {justLogged && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-3 flex items-center gap-2 text-primary"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs font-semibold">Snack logged</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          {/* Benefits */}
          <motion.section variants={fadeUp} className="mb-6">
            <h2 className="text-xs font-semibold text-accent-gray uppercase tracking-wider mb-3">Today&apos;s benefits</h2>
            {benefits.length > 0 ? (
              <div className="space-y-2">
                {benefits.map((text, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl p-3.5 shadow-soft border border-gray-100/80 flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-lg bg-accent-green/10 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-accent-green" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-accent-gray leading-relaxed">{text}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100/80 text-center">
                <p className="text-sm text-accent-gray">Complete a snack to unlock benefits</p>
              </div>
            )}
            <p className="text-[11px] text-accent-gray mt-2">For general wellness. Not medical advice.</p>
          </motion.section>

        </motion.div>
      </main>

      <RatePrompt />
      <BottomNav />

      <AnimatePresence>
        {showQuickLog && (
          <QuickLogModal
            onClose={() => setShowQuickLog(false)}
            onLog={() => {
              logSnack('manual');
              markJustLogged();
              setShowQuickLog(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSnooze && (
          <ReminderModal
            title={reminderTitle}
            onClose={() => setShowSnooze(false)}
            entry={reminderEntry === 'manual' ? 'manual' : 'reminder'}
            initialSteps={reminderEntry === 'manual' ? nextSnackSteps : undefined}
            onSnooze={(minutes) => {
              snooze(minutes);
              setShowSnooze(false);
            }}
            onComplete={(exercisesIncluded) => {
              logSnack(reminderEntry === 'manual' ? 'manual' : 'notification', exercisesIncluded);
              markJustLogged();
              setShowSnooze(false);
              if (settings) {
                setNextSnackSteps(getExerciseSteps(settings.snackStyle, settings.snackDuration));
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
