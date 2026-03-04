import { create } from 'zustand';
import { addSnackEvent, getSnackEventsByDay, dateToStr } from '../db';
import type { SnackEvent } from '../types';
import { useAppStore } from './useAppStore';

interface TodayState {
  events: SnackEvent[];
  loadToday: () => Promise<void>;
  logSnack: (source?: 'manual' | 'notification', exercisesIncluded?: string[]) => Promise<void>;
}

export const useTodayStore = create<TodayState>((set, get) => ({
  events: [],

  loadToday: async () => {
    const today = dateToStr(new Date());
    const events = await getSnackEventsByDay(today);
    set({ events });
  },

  logSnack: async (source = 'manual', exercisesIncluded?: string[]) => {
    const settings = useAppStore.getState().settings;
    const duration = settings?.snackDuration ?? 2;
    const snackStyle = settings?.snackStyle ?? 'energizing';
    await addSnackEvent({
      timestamp: Date.now(),
      snackStyle,
      duration,
      source,
      exercisesIncluded,
    });
    await get().loadToday();
  },
}));
