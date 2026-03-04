import { Capacitor, registerPlugin } from '@capacitor/core';

interface SnackAlarmPlugin {
  requestPermissions(): Promise<{ notifications: string }>;
  scheduleAlarm(options: { time: number; title: string }): Promise<{ scheduled: boolean }>;
  cancelAlarm(): Promise<{ cancelled: boolean }>;
  checkLaunchIntent(): Promise<{ snackStart: boolean }>;
  testNotification(options: { title: string }): Promise<{ fired: boolean }>;
}

const SnackAlarm = registerPlugin<SnackAlarmPlugin>('SnackAlarm');

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export async function requestNativePermissions(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const result = await SnackAlarm.requestPermissions();
    return result.notifications === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleNativeAlarm(timestampMs: number, title: string): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const result = await SnackAlarm.scheduleAlarm({ time: timestampMs, title });
    return result.scheduled;
  } catch {
    return false;
  }
}

export async function cancelNativeAlarm(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const result = await SnackAlarm.cancelAlarm();
    return result.cancelled;
  } catch {
    return false;
  }
}

export async function fireTestNotification(title: string): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const result = await SnackAlarm.testNotification({ title });
    return result.fired;
  } catch {
    return false;
  }
}

export async function checkNativeLaunchIntent(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const result = await SnackAlarm.checkLaunchIntent();
    return result.snackStart;
  } catch {
    return false;
  }
}
