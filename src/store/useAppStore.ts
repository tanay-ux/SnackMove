import { create } from 'zustand';
import { getSettings, saveSettings } from '../db';
import { syncNativeSettings } from '../lib/nativeAlarm';
import type { UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

function pushSettingsToNative(s: UserSettings) {
  // #region agent log
  fetch('http://127.0.0.1:7910/ingest/4d5481f9-9f26-46a3-a6cc-5c077f74dd73',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'832a50'},body:JSON.stringify({sessionId:'832a50',location:'useAppStore.ts:pushSettingsToNative',message:'syncing settings to native',data:{notificationsEnabled:s.notificationsEnabled,startTime:s.startTime,endTime:s.endTime,activeDays:s.activeDays,reminderFrequencyMinutes:s.reminderFrequencyMinutes,vibrateOnly:s.vibrateOnly},timestamp:Date.now(),hypothesisId:'FIX-VERIFY'})}).catch(()=>{});
  // #endregion
  syncNativeSettings({
    notificationsEnabled: s.notificationsEnabled,
    startTime: s.startTime,
    endTime: s.endTime,
    activeDays: s.activeDays as number[],
    reminderFrequencyMinutes: s.reminderFrequencyMinutes,
    vibrateOnly: s.vibrateOnly ?? false,
  }).catch(() => {});
}

interface AppState {
  onboardingComplete: boolean | null;
  settings: UserSettings | null;
  settingsId: number | null;
  hydrated: boolean;
  /** Incremented when OS notification permission is granted or native prefs sync so reminders reschedule. */
  nativeNotificationResyncSeq: number;
  setOnboardingComplete: (v: boolean) => void;
  setSettings: (s: UserSettings | null, id?: number | null) => void;
  loadSettings: () => Promise<void>;
  saveSettingsAsync: (updates: Partial<UserSettings>) => Promise<void>;
  completeOnboarding: (s: Partial<UserSettings>) => Promise<void>;
  hydrate: () => Promise<void>;
  resetData: () => Promise<void>;
  bumpNativeNotificationResync: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  onboardingComplete: null,
  settings: null,
  settingsId: null,
  hydrated: false,
  nativeNotificationResyncSeq: 0,

  bumpNativeNotificationResync: () =>
    set((s) => ({ nativeNotificationResyncSeq: s.nativeNotificationResyncSeq + 1 })),

  setOnboardingComplete: (v) => set({ onboardingComplete: v }),
  setSettings: (s, id) => set({ settings: s, settingsId: id ?? null }),

  loadSettings: async () => {
    const settings = await getSettings();
    if (settings && 'id' in settings && settings.id) {
      set({ settings, settingsId: settings.id });
    } else {
      set({ settings: null, settingsId: null });
    }
  },

  saveSettingsAsync: async (updates) => {
    const { settings, settingsId } = get();
    if (!settings) return;
    const next = { ...settings, ...updates };
    if (settingsId != null) {
      const { updateSettings } = await import('../db');
      await updateSettings(settingsId, updates);
    } else {
      const id = await saveSettings({ ...next, createdAt: Date.now() });
      set({ settingsId: id });
    }
    set({ settings: next });
    pushSettingsToNative(next);
  },

  completeOnboarding: async (s) => {
    const full: UserSettings = {
      ...DEFAULT_SETTINGS,
      ...s,
      createdAt: Date.now(),
    };
    const id = await saveSettings(full);
    set({
      settings: full,
      settingsId: id as number,
      onboardingComplete: true,
    });
    pushSettingsToNative(full);
  },

  hydrate: async () => {
    const settings = await getSettings();
    const hasSettings = settings != null && (settings.startTime != null || settings.snackStyle != null);
    set({
      settings: settings ?? null,
      settingsId: settings && 'id' in settings ? (settings.id as number) : null,
      onboardingComplete: hasSettings,
      hydrated: true,
    });
    if (settings && hasSettings) {
      pushSettingsToNative(settings);
    }
  },

  resetData: async () => {
    const { db } = await import('../db');
    await db.snackEvents.clear();
    await db.userSettings.clear();
    set({
      onboardingComplete: false,
      settings: null,
      settingsId: null,
    });
  },
}));
