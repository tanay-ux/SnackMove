import { useEffect, useMemo, useState } from 'react';
import BottomNav from '../components/BottomNav';
import { getDailySummaries, dateToStr } from '../db';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type Summary = { date: string; snackCount: number; totalMinutes: number; success: boolean };

function buildMonthGrid(year: number, month: number): { date: string; day: number; isCurrentMonth: boolean }[][] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startWeekday = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = last.getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  const grid: { date: string; day: number; isCurrentMonth: boolean }[][] = [];
  let week: { date: string; day: number; isCurrentMonth: boolean }[] = [];

  for (let i = 0; i < totalCells; i++) {
    const cellIndex = i - startWeekday;
    if (cellIndex < 0) {
      const d = new Date(year, month - 1, cellIndex + 1);
      week.push({
        date: dateToStr(d),
        day: d.getDate(),
        isCurrentMonth: false,
      });
    } else if (cellIndex < daysInMonth) {
      week.push({
        date: dateToStr(new Date(year, month - 1, cellIndex + 1)),
        day: cellIndex + 1,
        isCurrentMonth: true,
      });
    } else {
      const d = new Date(year, month, cellIndex - daysInMonth + 1);
      week.push({
        date: dateToStr(d),
        day: d.getDate(),
        isCurrentMonth: false,
      });
    }
    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
  }
  if (week.length) grid.push(week);
  return grid;
}

export default function Stats() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [totalSnacks, setTotalSnacks] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    getDailySummaries(365).then((s) => {
      setSummaries(s);
      const totalS = s.reduce((a, x) => a + x.snackCount, 0);
      const totalM = s.reduce((a, x) => a + x.totalMinutes, 0);
      setTotalSnacks(totalS);
      setTotalMinutes(totalM);
    });
  }, []);

  const summariesByDate = useMemo(() => {
    const m = new Map<string, Summary>();
    for (const s of summaries) m.set(s.date, s);
    return m;
  }, [summaries]);

  const goalDays = summaries.filter((s) => s.success).length;
  const thisWeekSnacks = summaries.slice(-7).reduce((a, x) => a + x.snackCount, 0);
  const selectedDetail = selectedDate ? summariesByDate.get(selectedDate) : null;

  const monthGrid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth() + 1);
  };

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1;

  return (
    <div className="min-h-dvh bg-white safe-top">
      <main className="px-5 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-accent-gray">Stats</h1>
          <p className="text-accent-gray/80 text-sm mt-0.5">Small moves add up.</p>
        </header>

        <div className="grid grid-cols-2 gap-3 mb-2">
          <div className="rounded-card bg-gray-50 p-4 shadow-card">
            <p className="text-2xl font-bold text-primary">{totalSnacks}</p>
            <p className="text-sm text-accent-gray/80">Total snacks</p>
          </div>
          <div className="rounded-card bg-gray-50 p-4 shadow-card">
            <p className="text-2xl font-bold text-primary">{totalMinutes}</p>
            <p className="text-sm text-accent-gray/80">Total minutes</p>
          </div>
          <div className="rounded-card bg-gray-50 p-4 shadow-card">
            <p className="text-2xl font-bold text-primary">{goalDays}</p>
            <p className="text-sm text-accent-gray/80">Goal days</p>
            <p className="text-xs text-accent-gray/60 mt-0.5">Days with 3+ snacks</p>
          </div>
          <div className="rounded-card bg-gray-50 p-4 shadow-card">
            <p className="text-2xl font-bold text-primary">{thisWeekSnacks}</p>
            <p className="text-sm text-accent-gray/80">This week</p>
            <p className="text-xs text-accent-gray/60 mt-0.5">Snacks in last 7 days</p>
          </div>
        </div>
        <p className="text-xs text-accent-gray/60 mb-6">Every snack counts.</p>

        <section>
          <h2 className="text-sm font-semibold text-accent-gray mb-3">Calendar</h2>
          <p className="text-xs text-accent-gray/70 mb-3">Tap a day for details. Green = ≥3 snacks.</p>

          <div className="rounded-card bg-gray-50 p-4 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={goPrevMonth}
                className="flex items-center justify-center w-10 h-10 rounded-full text-accent-gray hover:bg-gray-200/80"
                aria-label="Previous month"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-base font-semibold text-accent-gray">
                {MONTH_NAMES[viewMonth - 1]} {viewYear}
              </span>
              <button
                type="button"
                onClick={goNextMonth}
                className="flex items-center justify-center w-10 h-10 rounded-full text-accent-gray hover:bg-gray-200/80"
                aria-label="Next month"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            {!isCurrentMonth && (
              <div className="flex justify-center mb-3">
                <button
                  type="button"
                  onClick={goToToday}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Go to current month
                </button>
              </div>
            )}

            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs text-accent-gray/70 font-medium py-1">
                  {d}
                </div>
              ))}
              {monthGrid.flat().map((cell) => {
                const s = summariesByDate.get(cell.date);
                const snackCount = s?.snackCount ?? 0;
                const success = s?.success ?? false;
                const isSelected = selectedDate === cell.date;
                const intensity =
                  snackCount === 0
                    ? 'bg-gray-200/80'
                    : success
                      ? 'bg-green-500 text-white'
                      : snackCount === 1
                        ? 'bg-green-300 text-green-900'
                        : 'bg-green-400 text-green-900';
                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => setSelectedDate(isSelected ? null : cell.date)}
                    className={`min-w-[2rem] aspect-square rounded-lg text-sm font-medium flex items-center justify-center ${intensity} ${
                      !cell.isCurrentMonth ? 'opacity-40' : ''
                    } ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-gray-50' : ''}`}
                    title={`${cell.date}: ${snackCount} snacks`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDetail && (
            <div className="mt-4 rounded-card bg-primary text-white p-4 shadow-card">
              <p className="font-semibold">{selectedDetail.date}</p>
              <p className="text-sm text-white/90 mt-1">
                {selectedDetail.snackCount} snacks · {selectedDetail.totalMinutes} min
              </p>
              <p className="text-sm text-white/90">
                {selectedDetail.success ? '✓ Day goal met' : 'Goal: 3 snacks'}
              </p>
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
