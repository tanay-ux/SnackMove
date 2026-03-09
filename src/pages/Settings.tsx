import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import CircularTimeRangePicker from '../components/CircularTimeRangePicker';
import FeedbackModal from '../components/FeedbackModal';
import { useAppStore } from '../store/useAppStore';
import { DAY_LABELS, type ActiveDay, type SnackStyle } from '../types';
import { SNACK_PACKS } from '../lib/snackPacks';
import { Capacitor } from '@capacitor/core';

function formatDisplayTime(t: string): string {
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const m = parseInt(mStr ?? '0', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  if (h === 0 && m === 0) return '12:00 AM';
  if (h === 12 && m === 0) return '12:00 PM';
  if (h < 12) return `${h}:${String(m).padStart(2, '0')} AM`;
  return `${h - 12}:${String(m).padStart(2, '0')} PM`;
}

export default function Settings() {
  const settings = useAppStore((s) => s.settings);
  const saveSettingsAsync = useAppStore((s) => s.saveSettingsAsync);
  const resetData = useAppStore((s) => s.resetData);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);
  const setSettings = useAppStore((s) => s.setSettings);

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [activeDays, setActiveDays] = useState<ActiveDay[]>([1, 2, 3, 4, 5]);
  const [snackStyle, setSnackStyle] = useState<SnackStyle>('energizing');
  const [maxReminders, setMaxReminders] = useState(6);
  const [minSpacing, setMinSpacing] = useState(60);
  const [snackDuration, setSnackDuration] = useState(2);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const maxReminderPresets = [6, 12, 18, 24];
  const minSpacingPresets = [15, 30, 45, 60];

  useEffect(() => {
    if (searchParams.get('edit') === 'window') {
      setShowTimePicker(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (settings) {
      setStartTime(settings.startTime);
      setEndTime(settings.endTime);
      setActiveDays(settings.activeDays);
      setSnackStyle(settings.snackStyle);
      const maxR = settings.maxRemindersPerDay;
      const minS = settings.minSpacingMinutes;
      setMaxReminders(maxReminderPresets.includes(maxR) ? maxR : 6);
      setMinSpacing(minSpacingPresets.includes(minS) ? minS : 30);
      if (!maxReminderPresets.includes(maxR) || !minSpacingPresets.includes(minS)) {
        saveSettingsAsync({
          ...settings,
          maxRemindersPerDay: maxReminderPresets.includes(maxR) ? maxR : 6,
          minSpacingMinutes: minSpacingPresets.includes(minS) ? minS : 30,
        } as any);
      }
      setSnackDuration(settings.snackDuration);
      setNotificationsEnabled(settings.notificationsEnabled);
    }
  }, [settings]);

  const update = (updates: Partial<typeof settings>) => {
    saveSettingsAsync(updates as any);
  };

  const toggleDay = (d: ActiveDay) => {
    const next = activeDays.includes(d)
      ? activeDays.filter((x) => x !== d)
      : [...activeDays, d].sort((a, b) => a - b);
    setActiveDays(next);
    update({ activeDays: next });
  };

  useEffect(() => {
    if (!showDeleteModal) return;
    setDeleteCountdown(5);
    const interval = setInterval(() => {
      setDeleteCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showDeleteModal]);

  const handleDeleteAllData = async () => {
    await resetData();
    setSettings(null);
    setOnboardingComplete(false);
    setShowDeleteModal(false);
    window.location.href = '/';
  };

  if (!settings) return null;

  return (
    <div className="min-h-dvh bg-white safe-top">
      <main className="px-5 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-accent-gray">Settings</h1>
          <p className="text-accent-gray/80 text-sm mt-0.5">Customize your reminders and style.</p>
        </header>

        <div className="space-y-6">
          <section className="rounded-card bg-gray-50 p-4 shadow-card">
            <h2 className="text-sm font-semibold text-accent-gray mb-3">Days Active</h2>
            <div className="flex justify-between gap-1 mb-6">
              {([1, 2, 3, 4, 5, 6, 0] as ActiveDay[]).map((d) => {
                const selected = activeDays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`flex-1 aspect-square max-w-[44px] rounded-full font-semibold text-sm flex items-center justify-center ${
                      selected ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {DAY_LABELS[d].charAt(0)}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-card bg-gray-50 p-4 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-accent-gray">Time window</h2>
              <button
                type="button"
                onClick={() => setShowTimePicker((open) => !open)}
                className="text-xs font-medium text-primary px-2 py-1 rounded-button bg-primary/5"
              >
                {showTimePicker ? 'Done' : 'Edit'}
              </button>
            </div>
            <p className="text-sm text-accent-gray">
              {formatDisplayTime(startTime)} – {formatDisplayTime(endTime)}
            </p>
            <p className="text-xs text-accent-gray/70 mt-1">
              Reminders only fire inside this window.
            </p>
            {showTimePicker && (
              <div className="mt-4 pt-2 border-t border-gray-100">
                <CircularTimeRangePicker
                  startTime={startTime}
                  endTime={endTime}
                  onChangeStart={(t) => {
                    setStartTime(t);
                    update({ startTime: t });
                  }}
                  onChangeEnd={(t) => {
                    setEndTime(t);
                    update({ endTime: t });
                  }}
                  startLabel="Start"
                  endLabel="End"
                />
              </div>
            )}
          </section>

          <section className="rounded-card bg-gray-50 p-4 shadow-card">
            <h2 className="text-sm font-semibold text-accent-gray mb-3">Snack style</h2>
            <div className="space-y-2">
              {(Object.keys(SNACK_PACKS) as SnackStyle[]).map((style) => {
                const pack = SNACK_PACKS[style];
                const isSelected = snackStyle === style;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      setSnackStyle(style);
                      update({ snackStyle: style });
                    }}
                    className={`w-full text-left rounded-button p-3 border-2 ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-transparent bg-white'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium text-accent-gray">{pack.title}</p>
                      <p className="text-xs text-accent-gray/80">{pack.subtitle}</p>
                      <p className="text-[11px] text-accent-gray/70">{pack.explanation}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-card bg-gray-50 p-4 shadow-card">
            <h2 className="text-sm font-semibold text-accent-gray mb-3">Reminders</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-accent-gray">Max reminders per day</span>
                <select
                  value={[6, 12, 18, 24].includes(maxReminders) ? maxReminders : 6}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setMaxReminders(n);
                    update({ maxRemindersPerDay: n });
                  }}
                  className="rounded-button border border-gray-200 bg-white px-3 py-1.5 text-accent-gray text-sm"
                >
                  {[6, 12, 18, 24].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-accent-gray">Minimum spacing (minutes)</span>
                <select
                  value={[15, 30, 45, 60].includes(minSpacing) ? minSpacing : 30}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setMinSpacing(n);
                    update({ minSpacingMinutes: n });
                  }}
                  className="rounded-button border border-gray-200 bg-white px-3 py-1.5 text-accent-gray text-sm"
                >
                  {[15, 30, 45, 60].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-accent-gray">Notifications</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notificationsEnabled}
                  onClick={() => {
                    setNotificationsEnabled(!notificationsEnabled);
                    update({ notificationsEnabled: !notificationsEnabled });
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    notificationsEnabled ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      notificationsEnabled ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-card bg-gray-50 p-4 shadow-card">
            <h2 className="text-sm font-semibold text-accent-gray mb-3">Snack duration</h2>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setSnackDuration(n);
                    update({ snackDuration: n });
                  }}
                  className={`min-w-[56px] rounded-button border-2 text-sm font-medium px-3 py-2 ${
                    snackDuration === n
                      ? 'border-primary bg-primary/5 text-accent-gray'
                      : 'border-gray-200 bg-white text-accent-gray'
                  }`}
                >
                  {n} min
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-card bg-gray-50 p-4 shadow-card">
            <h2 className="text-sm font-semibold text-accent-gray mb-3">Help & feedback</h2>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowFeedback(true)}
                className="w-full flex items-center gap-3 rounded-button bg-white border border-gray-200 px-3 py-3 text-left"
              >
                <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-accent-gray">Give feedback or report a bug</p>
                  <p className="text-xs text-accent-gray/60">Help us improve SnackMove</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  const platform = Capacitor.getPlatform();
                  if (platform === 'android') {
                    window.open('https://play.google.com/store/apps/details?id=com.snackmove.app', '_blank');
                  } else if (platform === 'ios') {
                    window.open('https://apps.apple.com/app/snackmove/id0000000000', '_blank');
                  } else {
                    window.open('https://play.google.com/store/apps/details?id=com.snackmove.app', '_blank');
                  }
                }}
                className="w-full flex items-center gap-3 rounded-button bg-white border border-gray-200 px-3 py-3 text-left"
              >
                <svg className="w-5 h-5 text-accent-yellow shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-accent-gray">Rate SnackMove</p>
                  <p className="text-xs text-accent-gray/60">Love the app? Leave a review!</p>
                </div>
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-accent-gray mb-1">Data</h2>
            <p className="text-xs text-accent-gray/70 mb-3">All data is stored locally and not shared with anyone.</p>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="rounded-button px-4 py-2.5 text-sm font-medium border-2 border-red-600 text-red-600 hover:bg-red-50"
            >
              Delete all data
            </button>
          </section>
        </div>
      </main>
      <BottomNav />

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 max-w-[480px] mx-auto">
          <div className="w-full bg-white rounded-card p-5 shadow-card">
            <p className="text-accent-gray font-medium mb-4">
              All data will be permanently erased, this action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-button px-4 py-2.5 text-sm font-medium border border-gray-300 text-accent-gray hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteCountdown === 0 ? handleDeleteAllData : undefined}
                disabled={deleteCountdown > 0}
                className="flex-1 rounded-button px-4 py-2.5 text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteCountdown > 0 ? `Delete (${deleteCountdown}s)` : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
