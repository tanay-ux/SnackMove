import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_SETTINGS } from '../types';
import { type ActiveDay } from '../types';
import CircularTimeRangePicker from '../components/CircularTimeRangePicker';

const DAY_LETTERS: Record<ActiveDay, string> = {
  0: 'S', 1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S',
};

export default function OnboardingTimeWindow() {
  const navigate = useNavigate();
  const [startTime, setStartTime] = useState(DEFAULT_SETTINGS.startTime);
  const [endTime, setEndTime] = useState(DEFAULT_SETTINGS.endTime);
  const [activeDays, setActiveDays] = useState<ActiveDay[]>(DEFAULT_SETTINGS.activeDays);

  const toggleDay = (d: ActiveDay) => {
    setActiveDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  };

  const handleContinue = () => {
    navigate('/onboarding/style', { state: { startTime, endTime, activeDays } });
  };

  return (
    <div className="min-h-dvh bg-white safe-top flex flex-col px-5 pt-8 pb-10">
      <h1 className="text-2xl font-bold text-accent-gray mb-1">
        When should we remind you to move?
      </h1>
      <p className="text-accent-gray/80 text-sm mb-8">
        Pick your active days and time window.
      </p>

      <div className="space-y-8 flex-1">
        {/* Days Active - like reference: row of circular toggles */}
        <section>
          <h2 className="text-sm font-semibold text-accent-gray mb-3">Days Active</h2>
          <div className="flex justify-between gap-1">
            {([1, 2, 3, 4, 5, 6, 0] as ActiveDay[]).map((d) => {
              const selected = activeDays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`flex-1 aspect-square max-w-[44px] rounded-full font-semibold text-sm flex items-center justify-center ${
                    selected ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {DAY_LETTERS[d]}
                </button>
              );
            })}
          </div>
        </section>

        {/* Time window - circular picker card */}
        <section className="bg-gray-50 rounded-card p-5 shadow-card">
          <h2 className="text-sm font-semibold text-accent-gray mb-1">Start and End</h2>
          <p className="text-xs text-accent-gray/70 mb-3">
            Drag the edges of the ring to set your workday reminder window.
          </p>
          <CircularTimeRangePicker
            startTime={startTime}
            endTime={endTime}
            onChangeStart={setStartTime}
            onChangeEnd={setEndTime}
            startLabel="Start"
            endLabel="End"
          />
        </section>
      </div>

      <button
        type="button"
        onClick={handleContinue}
        className="mt-8 w-full bg-primary text-white font-semibold py-3.5 rounded-button"
      >
        Continue
      </button>
    </div>
  );
}
