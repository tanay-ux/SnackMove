import type { UserSettings } from '../types';
import { getSnackEventsByDateRange } from '../db';

const MS_PER_MIN = 60 * 1000;

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function timeToMs(dateStr: string, minutesSinceMidnight: number): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d.getTime() + minutesSinceMidnight * MS_PER_MIN;
}

function getMinutesSinceMidnight(ts: number): number {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

export function isWithinWindow(settings: UserSettings, now: Date): boolean {
  const day = now.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  if (!settings.activeDays.includes(day)) return false;
  const mins = getMinutesSinceMidnight(now.getTime());
  const start = parseTime(settings.startTime);
  const end = parseTime(settings.endTime);
  return mins >= start && mins <= end;
}

export async function getNextReminderTime(settings: UserSettings): Promise<number | null> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const startMins = parseTime(settings.startTime);
  const endMins = parseTime(settings.endTime);
  const day = now.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  if (!settings.activeDays.includes(day)) return null;

  const dayStart = timeToMs(today, startMins);
  const dayEnd = timeToMs(today, endMins);
  const events = await getSnackEventsByDateRange(dayStart, dayEnd);
  const nowTs = now.getTime();

  if (nowTs > dayEnd) return null;
  if (events.length >= settings.maxRemindersPerDay) return null;

  const spacingMs = settings.minSpacingMinutes * MS_PER_MIN;
  const windowMs = (endMins - startMins) * MS_PER_MIN;

  for (let i = 0; i < 20; i++) {
    const candidate = dayStart + Math.floor(Math.random() * windowMs);
    if (candidate <= nowTs) continue;
    if (candidate > dayEnd) continue;
    const tooClose = events.some((e) => Math.abs(e.timestamp - candidate) < spacingMs);
    if (!tooClose) return candidate;
  }

  let t = Math.max(dayStart, nowTs);
  while (t <= dayEnd) {
    const tooClose = events.some((e) => Math.abs(e.timestamp - t) < spacingMs);
    if (!tooClose) return t;
    t += spacingMs;
  }
  return null;
}

export function minutesUntil(ts: number): number {
  return Math.max(0, Math.round((ts - Date.now()) / MS_PER_MIN));
}
