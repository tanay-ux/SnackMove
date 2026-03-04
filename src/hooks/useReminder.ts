import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getNextReminderTime } from '../lib/reminderEngine';
import { showLocalNotification, getRandomTitle } from '../lib/push';
import { isNativePlatform, scheduleNativeAlarm, cancelNativeAlarm } from '../lib/nativeAlarm';

const MAX_SNOOZES = 3;

export function useReminder(onReminderFire: (title: string) => void) {
  const settings = useAppStore((s) => s.settings);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snoozeCountRef = useRef(0);
  const snoozeUntilRef = useRef<number>(0);
  const callbackRef = useRef(onReminderFire);
  callbackRef.current = onReminderFire;

  const schedule = useCallback(async () => {
    if (!settings?.notificationsEnabled) {
      console.log('[useReminder] notifications disabled, skipping');
      return;
    }
    const next = await getNextReminderTime(settings);
    if (next == null) {
      console.log('[useReminder] no valid next reminder time found');
      return;
    }
    const now = Date.now();
    const delay = Math.max(0, next - now);
    console.log('[useReminder] next alarm in', Math.round(delay / 1000), 'seconds at', new Date(next).toLocaleTimeString());

    const title = getRandomTitle();

    if (isNativePlatform()) {
      const ok = await scheduleNativeAlarm(next, title);
      console.log('[useReminder] native alarm scheduled:', ok);
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      timeoutRef.current = null;
      if (snoozeUntilRef.current > Date.now()) return;
      if (!isNativePlatform()) {
        try {
          await showLocalNotification(title);
        } catch {
          // ignore
        }
      }
      callbackRef.current(title);
      snoozeCountRef.current = 0;
      schedule();
    }, delay);
  }, [settings]);

  useEffect(() => {
    if (!settings) return;
    schedule();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [settings, schedule]);

  const snooze = useCallback(async (minutes: number) => {
    snoozeCountRef.current += 1;
    if (snoozeCountRef.current > MAX_SNOOZES) {
      schedule();
      return;
    }
    const snoozeUntil = Date.now() + minutes * 60 * 1000;
    snoozeUntilRef.current = snoozeUntil;

    if (isNativePlatform()) {
      await cancelNativeAlarm();
      await scheduleNativeAlarm(snoozeUntil, getRandomTitle());
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      snoozeUntilRef.current = 0;
      schedule();
    }, minutes * 60 * 1000);
  }, [schedule]);

  return { snooze };
}
