import { useCallback, useEffect, useRef, useState } from 'react';

const SLOTS = 96; // 15-min steps
const MIN_GAP_SLOTS = 4; // 1 hour min gap

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeToSlot(t: string): number {
  return Math.floor(timeToMinutes(t) / 15) % SLOTS;
}

function slotToTime(slot: number): string {
  return minutesToTime(slot * 15);
}

function formatDisplay(t: string): string {
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr!, 10);
  const m = parseInt(mStr!, 10);
  if (h === 0 && m === 0) return '12:00 AM';
  if (h === 12 && m === 0) return '12:00 PM';
  if (h < 12) return `${h}:${String(m).padStart(2, '0')} AM`;
  return `${h - 12}:${String(m).padStart(2, '0')} PM`;
}

// Slot 0 = 12 AM at top; clockwise. Angle 0 = top, 90 = right (3 AM).
function slotToAngle(slot: number): number {
  return (slot / SLOTS) * 360;
}

function angleToSlot(angle: number): number {
  let a = ((angle % 360) + 360) % 360;
  return Math.round((a / 360) * SLOTS) % SLOTS;
}

// SVG: angle in degrees, 0 = top, clockwise. cx, cy = center, r = radius.
function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

interface CircularTimeRangePickerProps {
  startTime: string;
  endTime: string;
  onChangeStart: (time: string) => void;
  onChangeEnd: (time: string) => void;
  startLabel?: string;
  endLabel?: string;
  className?: string;
}

const SIZE = 280;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_TRACK = 120;
const R_HANDLE = 14;

export default function CircularTimeRangePicker({
  startTime,
  endTime,
  onChangeStart,
  onChangeEnd,
  startLabel = 'Start',
  endLabel = 'End',
  className = '',
}: CircularTimeRangePickerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const startSlot = timeToSlot(startTime);
  const endSlot = timeToSlot(endTime);
  const startAngle = slotToAngle(startSlot);
  const endAngle = slotToAngle(endSlot);

  const startXY = polarToXY(CX, CY, R_TRACK, startAngle);
  const endXY = polarToXY(CX, CY, R_TRACK, endAngle);

  const durationMinutes = (endSlot - startSlot + SLOTS) % SLOTS;
  const durationHours = (durationMinutes * 15) / 60;

  const getAngleFromEvent = useCallback(
    (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
      const svg = svgRef.current;
      if (!svg) return 0;
      const rect = svg.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
      if (clientX == null || clientY == null) return 0;
      const x = clientX - rect.left - rect.width / 2;
      const y = clientY - rect.top - rect.height / 2;
      let angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
      if (angle < 0) angle += 360;
      return angle;
    },
    []
  );

  const handlePointerDown = useCallback(
    (which: 'start' | 'end') => (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setDragging(which);
    },
    []
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent | TouchEvent) => {
      const angle = getAngleFromEvent(e);
      const slot = angleToSlot(angle);
      if (dragging === 'start') {
        const newStart = Math.min(slot, endSlot - MIN_GAP_SLOTS);
        onChangeStart(slotToTime(newStart >= 0 ? newStart : newStart + SLOTS));
      } else {
        const newEnd = Math.max(slot, startSlot + MIN_GAP_SLOTS);
        onChangeEnd(slotToTime(newEnd < SLOTS ? newEnd : newEnd - SLOTS));
      }
    };
    const up = () => setDragging(null);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [dragging, startSlot, endSlot, onChangeStart, onChangeEnd, getAngleFromEvent]);

  const arcPath = (() => {
    const start = polarToXY(CX, CY, R_TRACK, startAngle);
    const end = polarToXY(CX, CY, R_TRACK, endAngle);
    const diff = endSlot >= startSlot ? endSlot - startSlot : endSlot + (SLOTS - startSlot);
    const large = diff > SLOTS / 2 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${R_TRACK} ${R_TRACK} 0 ${large} 1 ${end.x} ${end.y}`;
  })();

  const hourLabels = [
    { slot: 0, text: '12AM' },
    { slot: 8, text: '2' },
    { slot: 16, text: '4' },
    { slot: 24, text: '6AM' },
    { slot: 32, text: '8' },
    { slot: 40, text: '10' },
    { slot: 48, text: '12PM' },
    { slot: 56, text: '2' },
    { slot: 64, text: '4' },
    { slot: 72, text: '6PM' },
    { slot: 80, text: '8' },
    { slot: 88, text: '10' },
  ];

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div>
            <p className="text-xs font-medium text-accent-gray/70 uppercase tracking-wide">{startLabel}</p>
            <p className="text-sm font-semibold text-accent-gray">{formatDisplay(startTime)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div className="text-right">
            <p className="text-xs font-medium text-accent-gray/70 uppercase tracking-wide">{endLabel}</p>
            <p className="text-sm font-semibold text-accent-gray">{formatDisplay(endTime)}</p>
          </div>
        </div>
      </div>

      <div className="relative flex justify-center">
        <svg
          ref={svgRef}
          width={SIZE}
          height={SIZE}
          className="touch-none select-none"
          style={{ maxWidth: '100%' }}
        >
          {/* Background ring */}
          <circle
            cx={CX}
            cy={CY}
            r={R_TRACK}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={12}
            className="stroke-gray-200"
          />
          {/* Highlighted arc */}
          <path
            d={arcPath}
            fill="none"
            stroke="var(--tw-gradient-from, #6B4EAA)"
            strokeWidth={12}
            strokeLinecap="round"
            className="stroke-primary"
          />
          {/* Hour labels (inner) */}
          {hourLabels.map(({ slot, text }) => {
            const a = slotToAngle(slot);
            const { x, y } = polarToXY(CX, CY, R_TRACK - 32, a);
            return (
              <text
                key={slot}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-accent-gray/80 select-none text-[10px] font-medium"
              >
                {text}
              </text>
            );
          })}
          {/* Start handle */}
          <g
            onMouseDown={handlePointerDown('start')}
            onTouchStart={handlePointerDown('start')}
            style={{ cursor: dragging === 'start' ? 'grabbing' : 'grab' }}
            className="focus:outline-none"
          >
            <circle cx={startXY.x} cy={startXY.y} r={R_HANDLE + 4} fill="transparent" />
            <circle
              cx={startXY.x}
              cy={startXY.y}
              r={R_HANDLE}
              fill="white"
              stroke="#6B4EAA"
              strokeWidth={3}
              className="fill-white stroke-primary drop-shadow"
            />
          </g>
          {/* End handle */}
          <g
            onMouseDown={handlePointerDown('end')}
            onTouchStart={handlePointerDown('end')}
            style={{ cursor: dragging === 'end' ? 'grabbing' : 'grab' }}
            className="focus:outline-none"
          >
            <circle cx={endXY.x} cy={endXY.y} r={R_HANDLE + 4} fill="transparent" />
            <circle
              cx={endXY.x}
              cy={endXY.y}
              r={R_HANDLE}
              fill="white"
              stroke="#6B4EAA"
              strokeWidth={3}
              className="fill-white stroke-primary drop-shadow"
            />
          </g>
        </svg>
      </div>

      <p className="text-center text-sm font-medium text-accent-gray mt-3">
        {durationHours < 1 ? `${Math.round(durationMinutes * 15)} min` : `${durationHours.toFixed(1)} hr`} window
      </p>
    </div>
  );
}
