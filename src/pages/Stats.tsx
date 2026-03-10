import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  const grid: { date: string; day: number; isCurrentMonth: boolean }[][] = [];
  let week: { date: string; day: number; isCurrentMonth: boolean }[] = [];

  for (let i = 0; i < totalCells; i++) {
    const cellIndex = i - startWeekday;
    if (cellIndex < 0) {
      const d = new Date(year, month - 1, cellIndex + 1);
      week.push({ date: dateToStr(d), day: d.getDate(), isCurrentMonth: false });
    } else if (cellIndex < daysInMonth) {
      week.push({ date: dateToStr(new Date(year, month - 1, cellIndex + 1)), day: cellIndex + 1, isCurrentMonth: true });
    } else {
      const d = new Date(year, month, cellIndex - daysInMonth + 1);
      week.push({ date: dateToStr(d), day: d.getDate(), isCurrentMonth: false });
    }
    if (week.length === 7) { grid.push(week); week = []; }
  }
  if (week.length) grid.push(week);
  return grid;
}

function AnimatedStat({ value, label, sub, icon, color }: { value: number; label: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <motion.div
      className="bg-white rounded-2xl p-4 shadow-soft border border-gray-100/80"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring' as const, stiffness: 300, damping: 28 }}
    >
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <motion.p
        key={value}
        className="text-2xl font-bold text-accent-gray leading-none"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        {value}
      </motion.p>
      <p className="text-xs text-accent-gray font-medium mt-1">{label}</p>
      {sub && <p className="text-[11px] text-accent-gray mt-0.5">{sub}</p>}
    </motion.div>
  );
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
      setTotalSnacks(s.reduce((a, x) => a + x.snackCount, 0));
      setTotalMinutes(s.reduce((a, x) => a + x.totalMinutes, 0));
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
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };
  const goToToday = () => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth() + 1); };
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1;

  const getCellStyle = (snackCount: number, success: boolean) => {
    if (snackCount === 0) return 'bg-gray-100 text-accent-gray';
    if (success) return 'bg-accent-green text-white shadow-sm';
    if (snackCount >= 2) return 'bg-accent-green/50 text-green-900';
    return 'bg-accent-green/25 text-green-800';
  };

  return (
    <div className="min-h-dvh bg-surface safe-top">
      <main className="px-5 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <motion.header
          className="mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-accent-gray">Stats</h1>
          <p className="text-sm text-accent-gray mt-0.5">Small moves add up.</p>
        </motion.header>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <AnimatedStat
            value={totalSnacks}
            label="Total snacks"
            icon={<svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            color="bg-primary-50"
          />
          <AnimatedStat
            value={totalMinutes}
            label="Total minutes"
            icon={<svg className="w-4 h-4 text-accent-blue" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            color="bg-accent-blue/10"
          />
          <AnimatedStat
            value={goalDays}
            label="Goal days"
            sub="5+ snacks"
            icon={<svg className="w-4 h-4 text-accent-green" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            color="bg-accent-green/10"
          />
          <AnimatedStat
            value={thisWeekSnacks}
            label="This week"
            sub="Last 7 days"
            icon={<svg className="w-4 h-4 text-accent-yellow" fill="currentColor" viewBox="0 0 24 24"><path d="M12.9 2.6l2.3 5a.5.5 0 00.4.3l5.4.7a.5.5 0 01.3.9l-3.9 3.7a.5.5 0 00-.2.5l1 5.3a.5.5 0 01-.8.5L12.6 17a.5.5 0 00-.5 0l-4.8 2.6a.5.5 0 01-.7-.6l1-5.3a.5.5 0 00-.2-.5L3.5 9.5a.5.5 0 01.3-.9l5.4-.7a.5.5 0 00.4-.3l2.3-5a.5.5 0 01 1 0z" /></svg>}
            color="bg-accent-yellow/10"
          />
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-xs font-semibold text-accent-gray uppercase tracking-wider mb-3">Calendar</h2>

          <div className="bg-white rounded-2xl p-4 shadow-soft border border-gray-100/80">
            <div className="flex items-center justify-between mb-4">
              <motion.button
                type="button"
                onClick={goPrevMonth}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-accent-gray hover:bg-gray-50"
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
              <AnimatePresence mode="wait">
                <motion.span
                  key={`${viewYear}-${viewMonth}`}
                  className="text-sm font-bold text-accent-gray"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {MONTH_NAMES[viewMonth - 1]} {viewYear}
                </motion.span>
              </AnimatePresence>
              <motion.button
                type="button"
                onClick={goNextMonth}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-accent-gray hover:bg-gray-50"
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            </div>

            {!isCurrentMonth && (
              <div className="flex justify-center mb-3">
                <button type="button" onClick={goToToday} className="text-xs font-semibold text-primary bg-primary-50 px-3 py-1 rounded-full">
                  Go to current month
                </button>
              </div>
            )}

            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[11px] text-accent-gray font-semibold py-1.5">
                  {d.charAt(0)}
                </div>
              ))}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${viewYear}-${viewMonth}`}
                  className="col-span-7 grid grid-cols-7 gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {monthGrid.flat().map((cell) => {
                    const s = summariesByDate.get(cell.date);
                    const snackCount = s?.snackCount ?? 0;
                    const success = s?.success ?? false;
                    const isSelected = selectedDate === cell.date;
                    const isToday = cell.date === dateToStr(now);

                    return (
                      <motion.button
                        key={cell.date}
                        type="button"
                        onClick={() => setSelectedDate(isSelected ? null : cell.date)}
                        className={`aspect-square rounded-xl text-xs font-semibold flex items-center justify-center relative ${getCellStyle(snackCount, success)} ${
                          !cell.isCurrentMonth ? 'opacity-30' : ''
                        }`}
                        whileTap={{ scale: 0.85 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        title={`${cell.date}: ${snackCount} snacks`}
                      >
                        {cell.day}
                        {isToday && (
                          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                        )}
                        {isSelected && (
                          <motion.span
                            layoutId="cal-ring"
                            className="absolute inset-0 rounded-xl ring-2 ring-primary ring-offset-1 ring-offset-white"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {selectedDetail && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="mt-3 rounded-2xl bg-gradient-primary text-white p-4 shadow-glow-sm"
              >
                <p className="font-bold text-sm">{selectedDetail.date}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="bg-white/15 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    {selectedDetail.snackCount} snacks
                  </span>
                  <span className="bg-white/15 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    {selectedDetail.totalMinutes} min
                  </span>
                  {selectedDetail.success && (
                    <span className="bg-white/25 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Goal met
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </main>
      <BottomNav />
    </div>
  );
}
