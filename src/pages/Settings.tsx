import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      className={`bg-white rounded-2xl p-4 shadow-soft border border-gray-100/80 ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring' as const, stiffness: 300, damping: 28 }}
    >
      {children}
    </motion.section>
  );
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      {icon}
      <h2 className="text-sm font-bold text-accent-gray">{children}</h2>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full toggle-track ${checked ? 'bg-primary shadow-glow-sm' : 'bg-gray-200'}`}
      whileTap={{ scale: 0.95 }}
    >
      <motion.span
        className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  );
}

const STYLE_ICONS: Record<SnackStyle, { bg: string; icon: React.ReactNode }> = {
  gentle: {
    bg: 'bg-accent-blue/15',
    icon: <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  },
  energizing: {
    bg: 'bg-primary-50',
    icon: <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  },
  strength: {
    bg: 'bg-accent-pink/15',
    icon: <svg className="w-5 h-5 text-accent-pink" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>,
  },
};

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
  const [reminderFrequency, setReminderFrequency] = useState(30);
  const [snackDuration, setSnackDuration] = useState(2);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [vibrateOnly, setVibrateOnly] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const reminderFrequencyPresets = [5, 15, 30, 45, 60];

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
      const freq = settings.reminderFrequencyMinutes;
      setReminderFrequency(reminderFrequencyPresets.includes(freq) ? freq : 30);
      if (!reminderFrequencyPresets.includes(freq)) {
        saveSettingsAsync({
          ...settings,
          reminderFrequencyMinutes: 30,
        } as any);
      }
      setSnackDuration(settings.snackDuration);
      setNotificationsEnabled(settings.notificationsEnabled);
      setVibrateOnly(settings.vibrateOnly ?? false);
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
      setDeleteCountdown((c) => { if (c <= 1) { clearInterval(interval); return 0; } return c - 1; });
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
    <div className="min-h-dvh bg-surface safe-top">
      <main className="px-5 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <motion.header
          className="mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-accent-gray">Settings</h1>
          <p className="text-sm text-accent-gray mt-0.5">Customize your reminders and style.</p>
        </motion.header>

        <div className="space-y-4">
          {/* Days Active */}
          <SectionCard>
            <SectionLabel icon={
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }>Days active</SectionLabel>
            <div className="flex justify-between gap-1.5">
              {([1, 2, 3, 4, 5, 6, 0] as ActiveDay[]).map((d) => {
                const selected = activeDays.includes(d);
                return (
                  <motion.button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`flex-1 aspect-square max-w-[42px] rounded-xl font-bold text-sm flex items-center justify-center transition-colors ${
                      selected
                        ? 'bg-primary text-white shadow-glow-sm'
                        : 'bg-gray-100 text-accent-gray'
                    }`}
                    whileTap={{ scale: 0.88 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {DAY_LABELS[d].charAt(0)}
                  </motion.button>
                );
              })}
            </div>
          </SectionCard>

          {/* Time window */}
          <SectionCard>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel icon={
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }>Time window</SectionLabel>
              <motion.button
                type="button"
                onClick={() => setShowTimePicker((open) => !open)}
                className="text-xs font-semibold text-primary bg-primary-50 px-3 py-1.5 rounded-full"
                whileTap={{ scale: 0.95 }}
              >
                {showTimePicker ? 'Done' : 'Edit'}
              </motion.button>
            </div>
            <p className="text-base font-semibold text-accent-gray">
              {formatDisplayTime(startTime)} – {formatDisplayTime(endTime)}
            </p>
            <p className="text-xs text-accent-gray mt-1">Reminders only fire inside this window.</p>
            <AnimatePresence>
              {showTimePicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <CircularTimeRangePicker
                      startTime={startTime}
                      endTime={endTime}
                      onChangeStart={(t) => { setStartTime(t); update({ startTime: t }); }}
                      onChangeEnd={(t) => { setEndTime(t); update({ endTime: t }); }}
                      startLabel="Start"
                      endLabel="End"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SectionCard>

          {/* Snack style */}
          <SectionCard>
            <SectionLabel icon={
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }>Snack style</SectionLabel>
            <div className="space-y-2">
              {(Object.keys(SNACK_PACKS) as SnackStyle[]).map((style) => {
                const pack = SNACK_PACKS[style];
                const isSelected = snackStyle === style;
                const styleInfo = STYLE_ICONS[style];
                return (
                  <motion.button
                    key={style}
                    type="button"
                    onClick={() => { setSnackStyle(style); update({ snackStyle: style }); }}
                    className={`w-full text-left rounded-xl p-3.5 border-2 transition-colors ${
                      isSelected ? 'border-primary bg-primary-50/50' : 'border-transparent bg-surface hover:bg-gray-50'
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl ${styleInfo.bg} flex items-center justify-center shrink-0`}>
                        {styleInfo.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-accent-gray text-sm">{pack.title}</p>
                        <p className="text-xs text-accent-gray mt-0.5">{pack.subtitle}</p>
                        <p className="text-[11px] text-accent-gray mt-1 leading-relaxed">{pack.explanation}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
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
          </SectionCard>

          {/* Reminders */}
          <SectionCard>
            <SectionLabel icon={
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            }>Reminders</SectionLabel>
            <div className="space-y-4">
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-medium text-accent-gray">Notifications</span>
                <ToggleSwitch
                  checked={notificationsEnabled}
                  onChange={(v) => { setNotificationsEnabled(v); update({ notificationsEnabled: v }); }}
                />
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium text-accent-gray">Vibrate only</span>
                  <p className="text-[11px] text-accent-gray mt-0.5">Disable reminder sound and keep vibration.</p>
                </div>
                <ToggleSwitch
                  checked={vibrateOnly}
                  onChange={(v) => { setVibrateOnly(v); update({ vibrateOnly: v }); }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-accent-gray mb-2 block">Reminder frequency (mins)</label>
                <div className="flex gap-2">
                  {reminderFrequencyPresets.map((n) => (
                    <motion.button
                      key={n}
                      type="button"
                      onClick={() => { setReminderFrequency(n); update({ reminderFrequencyMinutes: n }); }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 ${
                        reminderFrequency === n
                          ? 'border-primary bg-primary-50 text-primary'
                          : 'border-gray-100 bg-surface text-accent-gray'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      {n}
                    </motion.button>
                  ))}
                </div>
                <p className="text-[11px] text-accent-gray mt-2 leading-relaxed">
                  Reminders fire inside your time window, with slight variation so they don&apos;t feel too predictable.
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Duration */}
          <SectionCard>
            <SectionLabel icon={
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }>Snack duration</SectionLabel>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <motion.button
                  key={n}
                  type="button"
                  onClick={() => { setSnackDuration(n); update({ snackDuration: n }); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 ${
                    snackDuration === n
                      ? 'border-primary bg-primary-50 text-primary'
                      : 'border-gray-100 bg-surface text-accent-gray'
                  }`}
                  whileTap={{ scale: 0.92 }}
                >
                  {n}m
                </motion.button>
              ))}
            </div>
          </SectionCard>

          {/* Help & feedback - lightweight cards, no header */}
          <div className="pt-1 space-y-2">
            <motion.button
              type="button"
              onClick={() => setShowFeedback(true)}
              className="w-full flex items-center gap-3 rounded-2xl bg-white border border-gray-100 shadow-soft px-3.5 py-3.5 text-left"
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-accent-gray">Feedback/bug report</p>
                <p className="text-xs text-accent-gray">Help us improve SnackMove</p>
              </div>
            </motion.button>
            <motion.button
              type="button"
              onClick={() => {
                const platform = Capacitor.getPlatform();
                const url = platform === 'ios'
                  ? 'https://apps.apple.com/app/snackmove/id0000000000'
                  : 'https://play.google.com/store/apps/details?id=com.snackmove.app';
                window.open(url, '_blank');
              }}
              className="w-full flex items-center gap-3 rounded-2xl bg-white border border-gray-100 shadow-soft px-3.5 py-3.5 text-left"
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-9 h-9 rounded-xl bg-accent-yellow/15 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-accent-yellow" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-accent-gray">Rate SnackMove</p>
                <p className="text-xs text-accent-gray">Love the app? Leave a review!</p>
              </div>
            </motion.button>
          </div>

          {/* Data */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-2"
          >
            <p className="text-xs text-accent-gray mb-3">All data is stored locally and never shared.</p>
            <motion.button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="rounded-xl px-4 py-3 text-sm font-semibold border-2 border-red-200 text-red-500 hover:bg-red-50"
              whileTap={{ scale: 0.97 }}
            >
              Delete all data
            </motion.button>
          </motion.section>
        </div>
      </main>
      <BottomNav />

      <AnimatePresence>
        {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 max-w-[480px] mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full bg-white rounded-2xl p-5 shadow-card"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-accent-gray font-semibold text-center mb-1">Delete all data?</p>
              <p className="text-sm text-accent-gray text-center mb-5">This action cannot be undone.</p>
              <div className="flex gap-3">
                <motion.button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold border border-gray-200 text-accent-gray"
                  whileTap={{ scale: 0.97 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="button"
                  onClick={deleteCountdown === 0 ? handleDeleteAllData : undefined}
                  disabled={deleteCountdown > 0}
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold bg-red-500 text-white disabled:opacity-50"
                  whileTap={deleteCountdown === 0 ? { scale: 0.97 } : undefined}
                >
                  {deleteCountdown > 0 ? `Delete (${deleteCountdown}s)` : 'Delete'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
