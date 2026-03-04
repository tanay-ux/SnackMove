import { useAppStore } from '../store/useAppStore';

const SNOOZE_OPTIONS = [
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
];

interface SnoozeModalProps {
  onClose: () => void;
  onSnooze: (minutes: number) => void;
  onLog: () => void;
  title: string;
}

export default function SnoozeModal({ onClose, onSnooze, onLog, title }: SnoozeModalProps) {
  const settings = useAppStore((s) => s.settings);

  const handleSnooze = (minutes: number) => {
    const endMins = settings
      ? parseInt(settings.endTime.slice(0, 2), 10) * 60 + parseInt(settings.endTime.slice(3), 10)
      : 17 * 60;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const actualMins = Math.min(minutes, Math.max(0, endMins - nowMins));
    onSnooze(actualMins);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 max-w-[480px] mx-auto">
      <div className="w-full bg-white rounded-t-[1.5rem] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <h2 className="text-lg font-bold text-accent-gray mb-1">{title}</h2>
        <p className="text-sm text-accent-gray/80 mb-4">Log your snack or snooze.</p>

        <div className="flex gap-2 mb-4">
          {SNOOZE_OPTIONS.map(({ label, minutes }) => (
            <button
              key={label}
              type="button"
              onClick={() => handleSnooze(minutes)}
              className="flex-1 rounded-button bg-gray-100 text-accent-gray font-medium py-2.5 text-sm hover:bg-gray-200"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-button border border-gray-200 text-accent-gray py-2.5 font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onLog(); onClose(); }}
            className="flex-1 rounded-button bg-primary text-white py-2.5 font-semibold"
          >
            Log it
          </button>
        </div>
      </div>
    </div>
  );
}
