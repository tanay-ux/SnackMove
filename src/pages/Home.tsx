import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

  useEffect(() => {
    loadToday();
  }, [loadToday]);

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

  useEffect(() => {
    getCurrentStreak().then(setStreak);
  }, [events]);

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
    if (justLoggedTimeout.current != null) {
      window.clearTimeout(justLoggedTimeout.current);
    }
    setJustLogged(true);
    justLoggedTimeout.current = window.setTimeout(() => {
      setJustLogged(false);
      justLoggedTimeout.current = null;
    }, 1800);
  };

  useEffect(
    () => () => {
      if (justLoggedTimeout.current != null) {
        window.clearTimeout(justLoggedTimeout.current);
      }
      if (testTimerRef.current != null) {
        window.clearInterval(testTimerRef.current);
      }
    },
    []
  );

  const startTestNotification = async () => {
    const triggerAt = Date.now() + 10_000;
    setTestCountdown(10);

    if (isNativePlatform()) {
      const granted = await requestNativePermissions();
      if (!granted) {
        console.warn('[Test] Notification permission not granted; alarm not scheduled');
        setTestCountdown(null);
        return;
      }
      const ok = await scheduleNativeAlarm(triggerAt, 'Test reminder!');
      console.log('[Test] Native alarm scheduled:', ok);
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
      if (!granted) {
        console.warn('[Test] Notification permission not granted; direct notification skipped');
        return;
      }
      await fireTestNotification('Test notification!');
    }
  };

  const snackCount = events.length;
  const totalMinutes = events.reduce((a, e) => a + e.duration, 0);
  const benefits = settings
    ? getBenefitsForToday(settings.snackStyle, snackCount, totalMinutes)
    : [];
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
  const snackWindowLabel =
    settings
      ? `${formatWindowTime(settings.startTime)} – ${formatWindowTime(settings.endTime)}`
      : '';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning!';
    if (h < 17) return 'Good afternoon!';
    return 'Good evening!';
  })();

  return (
    <div className="min-h-dvh bg-white safe-top">
      <main className="px-5 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-accent-gray">{greeting}</h1>
          <p className="text-accent-gray/80 text-sm mt-0.5">Time for a quick move.</p>
        </header>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <p className="text-lg font-bold text-accent-gray">
            Snacks completed today: {snackCount}
          </p>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-yellow/25 text-accent-gray px-3 py-1.5 border border-accent-yellow/40">
            <span className="text-base font-bold text-primary">{streak}</span>
            <span className="text-sm">day{streak !== 1 ? 's' : ''} streak</span>
          </div>
        </div>

        {/* Snack window status + edit */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-accent-gray">
            {withinWindow ? 'Within snack window' : 'Outside snack window'}
            {snackWindowLabel ? ` (${snackWindowLabel})` : ''}
          </p>
          <Link
            to="/settings?edit=window"
            className="text-sm font-medium text-primary hover:underline shrink-0"
          >
            Edit
          </Link>
        </div>

        {/* Next snack card */}
        <div className="rounded-card bg-gradient-to-br from-primary via-primary to-primary/90 text-white p-5 shadow-card mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-white/90 text-sm font-medium">Next snack</p>
            <p className="text-white text-lg font-bold mt-1">
              {packTitle} · {durationMinutes} min
            </p>
            {withinWindow && minsUntil != null && (
              <p className="text-white/90 text-sm mt-2">
                Next snack expected in ~{minsUntil} min
              </p>
            )}

            {nextSnackSteps.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-2">
                  Exercises
                </p>
                <ul className="space-y-2">
                  {nextSnackSteps.map((step, i) => (
                    <li
                      key={`${step.name}-${i}`}
                      className="flex justify-between items-center rounded-button bg-white/10 px-3 py-2 text-sm"
                    >
                      <span className="text-white">{step.name}</span>
                      <span className="text-white/80 font-medium">{step.durationSeconds}s</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setReminderEntry('manual');
                setReminderTitle('Ready to move?');
                setShowSnooze(true);
              }}
              className="mt-4 w-full bg-white text-primary font-semibold py-2.5 rounded-button flex items-center justify-center gap-2"
            >
              Start Snack
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Test notifications */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={startTestNotification}
            disabled={testCountdown != null}
            className="flex-1 rounded-button border-2 border-dashed border-primary/30 bg-primary/5 text-primary text-sm font-medium py-2.5 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {testCountdown != null
              ? `In ${testCountdown}s...`
              : 'Test alarm (10s)'}
          </button>
          <button
            type="button"
            onClick={fireDirectNotification}
            className="flex-1 rounded-button border-2 border-dashed border-orange-300 bg-orange-50 text-orange-600 text-sm font-medium py-2.5 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Fire now
          </button>
        </div>

        {/* Today's progress */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-accent-gray mb-3">Today&apos;s progress</h2>
          <div className="bg-gray-50 rounded-card p-4 shadow-card">
            <p className="text-sm text-accent-gray font-medium">
              {snackCount === 0 ? 'No snacks completed yet' : `${snackCount} snack${snackCount !== 1 ? 's' : ''} completed`}
            </p>

            {sortedEvents.length > 0 && (
              <div className="mt-3 space-y-2">
                {sortedEvents.map((e, idx) => {
                  const key = String(e.id ?? `${e.timestamp}-${idx}`);
                  const isOpen = openSnackKey === key;
                  const title = `Snack at ${formatTime(e.timestamp)}`;
                  const subtitle = `${e.duration} min · ${SNACK_PACKS[e.snackStyle]?.title ?? e.snackStyle}`;
                  const list = (e.exercisesIncluded ?? []).filter(Boolean);

                  return (
                    <div key={key} className="rounded-button bg-white border border-gray-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenSnackKey((cur) => (cur === key ? null : key))}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                      >
                        <div>
                          <p className="text-sm font-semibold text-accent-gray">{title}</p>
                          <p className="text-xs text-accent-gray/70 mt-0.5">{subtitle}</p>
                        </div>
                        <svg
                          className={`w-5 h-5 text-accent-gray/70 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isOpen && (
                        <div className="px-3 pb-3">
                          {list.length > 0 ? (
                            <ul className="mt-1 space-y-1.5">
                              {list.map((name, i) => (
                                <li
                                  key={`${name}-${i}`}
                                  className="text-sm text-accent-gray bg-gray-50 rounded-button px-3 py-2"
                                >
                                  {name}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-1 text-xs text-accent-gray/70">
                              No exercise details for this snack.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {justLogged && (
              <p className="mt-3 text-xs font-medium text-primary">
                Snack logged ✓
              </p>
            )}
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-accent-gray mb-3">Today&apos;s Snack Benefits</h2>
          {benefits.length > 0 ? (
            <div className="space-y-2">
              {benefits.map((text, i) => (
                <div
                  key={i}
                  className="rounded-card p-3 shadow-card text-sm text-accent-gray bg-gray-50"
                >
                  {text}
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-card p-4 shadow-card text-sm text-accent-gray/70 bg-gray-50">
              No snacks completed yet. Start a snack to see benefits for today.
            </p>
          )}
          <p className="text-xs text-accent-gray/70 mt-2">
            For general wellness. Not medical advice.
          </p>
        </section>
      </main>

      <RatePrompt />
      <BottomNav />
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
    </div>
  );
}
