import { Capacitor, registerPlugin } from '@capacitor/core';

interface SnackAlarmPlugin {
  requestPermissions(): Promise<{ notifications: string }>;
  checkNotificationPermissionStatus(): Promise<{ notifications: string }>;
  scheduleAlarm(options: { time: number; title: string }): Promise<{ scheduled: boolean }>;
  syncSettings(options: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    activeDays: string;
    reminderFrequencyMinutes: number;
    vibrateOnly: boolean;
  }): Promise<{ synced: boolean }>;
  cancelAlarm(): Promise<{ cancelled: boolean }>;
  checkLaunchIntent(): Promise<{ snackStart: boolean }>;
  testNotification(options: { title: string }): Promise<{ fired: boolean }>;
}

const SnackAlarm = registerPlugin<SnackAlarmPlugin>('SnackAlarm');
const PLUGIN_NAME = 'SnackAlarm';

function nativeContext() {
  return {
    platform: Capacitor.getPlatform(),
    native: Capacitor.isNativePlatform(),
    pluginAvailable: Capacitor.isPluginAvailable(PLUGIN_NAME),
  };
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export async function requestNativePermissions(): Promise<boolean> {
  const ctx = nativeContext();
  console.log('[SnackAlarm] requestNativePermissions:start', ctx);
  if (!ctx.native) return false;
  if (!ctx.pluginAvailable) {
    console.error('[SnackAlarm] requestNativePermissions:plugin unavailable', ctx);
    return false;
  }
  try {
    const result = await SnackAlarm.requestPermissions();
    console.log('[SnackAlarm] requestNativePermissions:result', result);
    return result.notifications === 'granted';
  } catch (error) {
    console.error('[SnackAlarm] requestNativePermissions:error', error);
    return false;
  }
}

export async function checkNotificationPermissionGranted(): Promise<boolean> {
  const ctx = nativeContext();
  if (!ctx.native) {
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
  }
  if (!ctx.pluginAvailable) return false;
  try {
    const result = await SnackAlarm.checkNotificationPermissionStatus();
    return result.notifications === 'granted';
  } catch (error) {
    console.error('[SnackAlarm] checkNotificationPermissionGranted:error', error);
    return false;
  }
}

export async function syncNativeSettings(settings: {
  notificationsEnabled: boolean;
  startTime: string;
  endTime: string;
  activeDays: number[];
  reminderFrequencyMinutes: number;
  vibrateOnly: boolean;
}): Promise<boolean> {
  const ctx = nativeContext();
  console.log('[SnackAlarm] syncNativeSettings:start', { ...ctx, settings });
  if (!ctx.native) return false;
  if (!ctx.pluginAvailable) {
    console.error('[SnackAlarm] syncNativeSettings:plugin unavailable', ctx);
    return false;
  }
  try {
    const result = await SnackAlarm.syncSettings({
      enabled: settings.notificationsEnabled,
      startTime: settings.startTime,
      endTime: settings.endTime,
      activeDays: settings.activeDays.join(','),
      reminderFrequencyMinutes: settings.reminderFrequencyMinutes,
      vibrateOnly: settings.vibrateOnly,
    });
    console.log('[SnackAlarm] syncNativeSettings:result', result);
    return result.synced;
  } catch (error) {
    console.error('[SnackAlarm] syncNativeSettings:error', error);
    return false;
  }
}

export async function scheduleNativeAlarm(timestampMs: number, title: string): Promise<boolean> {
  const ctx = nativeContext();
  console.log('[SnackAlarm] scheduleNativeAlarm:start', { ...ctx, timestampMs, title });
  if (!ctx.native) return false;
  if (!ctx.pluginAvailable) {
    console.error('[SnackAlarm] scheduleNativeAlarm:plugin unavailable', ctx);
    return false;
  }
  try {
    const result = await SnackAlarm.scheduleAlarm({ time: timestampMs, title });
    console.log('[SnackAlarm] scheduleNativeAlarm:result', result);
    return result.scheduled;
  } catch (error) {
    console.error('[SnackAlarm] scheduleNativeAlarm:error', error);
    return false;
  }
}

export async function cancelNativeAlarm(): Promise<boolean> {
  const ctx = nativeContext();
  console.log('[SnackAlarm] cancelNativeAlarm:start', ctx);
  if (!ctx.native) return false;
  if (!ctx.pluginAvailable) {
    console.error('[SnackAlarm] cancelNativeAlarm:plugin unavailable', ctx);
    return false;
  }
  try {
    const result = await SnackAlarm.cancelAlarm();
    console.log('[SnackAlarm] cancelNativeAlarm:result', result);
    return result.cancelled;
  } catch (error) {
    console.error('[SnackAlarm] cancelNativeAlarm:error', error);
    return false;
  }
}

export async function fireTestNotification(title: string): Promise<boolean> {
  const ctx = nativeContext();
  console.log('[SnackAlarm] fireTestNotification:start', { ...ctx, title });
  if (!ctx.native) return false;
  if (!ctx.pluginAvailable) {
    console.error('[SnackAlarm] fireTestNotification:plugin unavailable', ctx);
    return false;
  }
  try {
    const result = await SnackAlarm.testNotification({ title });
    console.log('[SnackAlarm] fireTestNotification:result', result);
    return result.fired;
  } catch (error) {
    console.error('[SnackAlarm] fireTestNotification:error', error);
    return false;
  }
}

export async function checkNativeLaunchIntent(): Promise<boolean> {
  const ctx = nativeContext();
  console.log('[SnackAlarm] checkNativeLaunchIntent:start', ctx);
  if (!ctx.native) return false;
  if (!ctx.pluginAvailable) {
    console.error('[SnackAlarm] checkNativeLaunchIntent:plugin unavailable', ctx);
    return false;
  }
  try {
    const result = await SnackAlarm.checkLaunchIntent();
    console.log('[SnackAlarm] checkNativeLaunchIntent:result', result);
    return result.snackStart;
  } catch (error) {
    console.error('[SnackAlarm] checkNativeLaunchIntent:error', error);
    return false;
  }
}
