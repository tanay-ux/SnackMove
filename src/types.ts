export type SnackStyle = 'gentle' | 'energizing' | 'strength';

export type ActiveDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun-Sat

export interface UserSettings {
  id?: number;
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  activeDays: ActiveDay[]; // [1,2,3,4,5] = Mon-Fri
  snackStyle: SnackStyle;
  reminderFrequencyMinutes: number;
  snackDuration: number; // 1-5
  notificationsEnabled: boolean;
  vibrateOnly: boolean;
  createdAt: number;
}

export interface SnackEvent {
  id?: number;
  timestamp: number;
  snackStyle: SnackStyle;
  duration: number;
  exercisesIncluded?: string[];
  source: 'manual' | 'notification';
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  snackCount: number;
  totalMinutes: number;
  success: boolean; // >= 5 snacks
}

export const DEFAULT_SETTINGS: Omit<UserSettings, 'id' | 'createdAt'> = {
  startTime: '09:00',
  endTime: '17:00',
  activeDays: [1, 2, 3, 4, 5],
  snackStyle: 'energizing',
  reminderFrequencyMinutes: 30,
  snackDuration: 2,
  notificationsEnabled: true,
  vibrateOnly: false,
};

export const DAY_LABELS: Record<ActiveDay, string> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};
