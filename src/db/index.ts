import Dexie, { type Table } from 'dexie';
import type { UserSettings, SnackEvent } from '../types';

export class SnackMoveDB extends Dexie {
  userSettings!: Table<UserSettings, number>;
  snackEvents!: Table<SnackEvent, number>;

  constructor() {
    super('SnackMoveDB');
    this.version(1).stores({
      userSettings: '++id, createdAt',
      snackEvents: '++id, timestamp',
    });
  }
}

export const db = new SnackMoveDB();

export async function getSettings(): Promise<UserSettings | undefined> {
  return db.userSettings.orderBy('createdAt').last();
}

export async function saveSettings(settings: UserSettings): Promise<number> {
  const id = await db.userSettings.add(settings);
  return id as number;
}

export async function updateSettings(id: number, updates: Partial<UserSettings>): Promise<void> {
  await db.userSettings.update(id, updates);
}

export async function addSnackEvent(event: Omit<SnackEvent, 'id'>): Promise<number> {
  return db.snackEvents.add(event as SnackEvent);
}

export async function getSnackEventsByDateRange(startTs: number, endTs: number): Promise<SnackEvent[]> {
  return db.snackEvents.where('timestamp').between(startTs, endTs).toArray();
}

export async function getSnackEventsByDay(dateStr: string): Promise<SnackEvent[]> {
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  const startDate = new Date(y, m - 1, d, 0, 0, 0, 0);
  const endDate = new Date(y, m - 1, d, 23, 59, 59, 999);
  const start = startDate.getTime();
  const end = endDate.getTime();
  return getSnackEventsByDateRange(start, end);
}

export function dateToStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getDailySummaries(days: number): Promise<{ date: string; snackCount: number; totalMinutes: number; success: boolean }[]> {
  const events = await db.snackEvents.orderBy('timestamp').reverse().limit(500).toArray();
  const byDay = new Map<string, { count: number; minutes: number }>();
  for (const e of events) {
    const date = dateToStr(new Date(e.timestamp));
    const cur = byDay.get(date) ?? { count: 0, minutes: 0 };
    cur.count += 1;
    cur.minutes += e.duration;
    byDay.set(date, cur);
  }
  const out: { date: string; snackCount: number; totalMinutes: number; success: boolean }[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const date = dateToStr(d);
    const data = byDay.get(date) ?? { count: 0, minutes: 0 };
    out.push({
      date,
      snackCount: data.count,
      totalMinutes: data.minutes,
      success: data.count >= 5,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getCurrentStreak(): Promise<number> {
  const summaries = await getDailySummaries(365);
  const today = dateToStr(new Date());
  let streak = 0;
  for (let i = summaries.length - 1; i >= 0; i--) {
    if (summaries[i].date > today) continue;
    if (summaries[i].success) streak++;
    else break;
  }
  return streak;
}
