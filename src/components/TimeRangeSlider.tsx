import { useMemo } from 'react';

const SLOTS_PER_DAY = 96; // 15-min steps from 00:00 to 24:00
const MIN_GAP_SLOTS = 4;  // at least 1 hour between start and end

function slotToTime(slot: number): string {
  const totalMins = slot * 15;
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeToSlot(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return Math.min(SLOTS_PER_DAY, Math.floor((h * 60 + (m || 0)) / 15));
}

function formatLabel(t: string): string {
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr!, 10);
  const m = parseInt(mStr!, 10);
  if (h === 0 && m === 0) return '12:00 AM';
  if (h === 12 && m === 0) return '12:00 PM';
  if (h < 12) return `${h}:${String(m).padStart(2, '0')} AM`;
  return `${h - 12}:${String(m).padStart(2, '0')} PM`;
}

interface TimeRangeSliderProps {
  startTime: string;
  endTime: string;
  onChangeStart: (time: string) => void;
  onChangeEnd: (time: string) => void;
  className?: string;
}

export default function TimeRangeSlider({
  startTime,
  endTime,
  onChangeStart,
  onChangeEnd,
  className = '',
}: TimeRangeSliderProps) {
  const startSlot = useMemo(() => timeToSlot(startTime), [startTime]);
  const endSlot = useMemo(() => timeToSlot(endTime), [endTime]);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    const newStart = Math.min(v, endSlot - MIN_GAP_SLOTS);
    onChangeStart(slotToTime(newStart));
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    const newEnd = Math.max(v, startSlot + MIN_GAP_SLOTS);
    onChangeEnd(slotToTime(newEnd));
  };

  const startPct = (startSlot / SLOTS_PER_DAY) * 100;
  const endPct = (endSlot / SLOTS_PER_DAY) * 100;

  return (
    <div className={className}>
      <div className="flex justify-between text-sm text-accent-gray mb-2">
        <span className="font-medium">{formatLabel(startTime)}</span>
        <span className="font-medium">{formatLabel(endTime)}</span>
      </div>
      <div className="relative h-10 flex items-center">
        {/* Track background */}
        <div
          className="absolute inset-0 rounded-full bg-gray-200 pointer-events-none"
          style={{ top: '50%', transform: 'translateY(-50%)', height: '8px' }}
        />
        {/* Filled segment */}
        <div
          className="absolute rounded-full bg-primary pointer-events-none"
          style={{
            left: `${startPct}%`,
            width: `${endPct - startPct}%`,
            top: '50%',
            transform: 'translateY(-50%)',
            height: '8px',
          }}
        />
        <input
          type="range"
          min={0}
          max={SLOTS_PER_DAY}
          value={startSlot}
          onChange={handleStartChange}
          className="time-range-input absolute w-full h-10 appearance-none bg-transparent pointer-events-none [&:focus]:outline-none [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-grab [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow [&::-moz-range-thumb]:cursor-grab"
          aria-label="Start time"
        />
        <input
          type="range"
          min={0}
          max={SLOTS_PER_DAY}
          value={endSlot}
          onChange={handleEndChange}
          className="time-range-input absolute w-full h-10 appearance-none bg-transparent pointer-events-none [&:focus]:outline-none [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-grab [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow [&::-moz-range-thumb]:cursor-grab"
          aria-label="End time"
        />
      </div>
      <p className="text-xs text-accent-gray/70 mt-1">Drag the handles to set your reminder window</p>
    </div>
  );
}
