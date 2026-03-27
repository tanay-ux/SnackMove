import type { UserSettings } from '../types';

const MS_PER_MIN = 60 * 1000;
const JITTER_RANGE_MINUTES = 5;

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
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
  const nowMs = Date.now();
  const freqMin = Math.max(1, settings.reminderFrequencyMinutes ?? 30);
  const freqMs = freqMin * MS_PER_MIN;

  // #region agent log
  fetch('http://127.0.0.1:7910/ingest/4d5481f9-9f26-46a3-a6cc-5c077f74dd73',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'832a50'},body:JSON.stringify({sessionId:'832a50',location:'reminderEngine.ts:getNextReminderTime',message:'computing next reminder from frequency',data:{nowMs,nowIso:new Date(nowMs).toISOString(),startTime:settings.startTime,endTime:settings.endTime,activeDays:settings.activeDays,reminderFrequencyMinutes:freqMin},timestamp:Date.now(),hypothesisId:'FREQ'})}).catch(()=>{});
  // #endregion

  const next = computeNextFromFrequency(settings, nowMs, freqMs);
  return next;
}

export function minutesUntil(ts: number): number {
  return Math.max(0, Math.round((ts - Date.now()) / MS_PER_MIN));
}

function computeNextFromFrequency(settings: UserSettings, nowMs: number, freqMs: number): number | null {
  const startMins = parseTime(settings.startTime);
  const endMins = parseTime(settings.endTime);
  const windowMinutes = Math.max(0, endMins - startMins);
  if (windowMinutes <= 0) return null;

  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const day = new Date(nowMs);
    day.setDate(day.getDate() + dayOffset);
    day.setHours(0, 0, 0, 0);

    const jsDow = day.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    if (!settings.activeDays.includes(jsDow)) continue;

    const dayStartMs = day.getTime() + startMins * MS_PER_MIN;
    const dayEndMs = day.getTime() + endMins * MS_PER_MIN;

    if (dayOffset === 0 && nowMs > dayEndMs) continue;

    const anchor = Math.max(nowMs, dayStartMs);

    const jitterMinutes = Math.floor(Math.random() * (JITTER_RANGE_MINUTES * 2 + 1)) - JITTER_RANGE_MINUTES;
    const jitterMs = jitterMinutes * MS_PER_MIN;
    let candidate = anchor + freqMs + jitterMs;

    if (candidate <= nowMs + 1000) candidate = nowMs + Math.min(freqMs, 60_000);
    if (candidate < dayStartMs) candidate = dayStartMs + 60_000;
    if (candidate > dayEndMs) continue;

    return candidate;
  }

  return null;
}
