import { useAppStore } from '../store/useAppStore';
import { SNACK_PACKS } from '../lib/snackPacks';

interface QuickLogModalProps {
  onClose: () => void;
  onLog: () => void;
}

export default function QuickLogModal({ onClose, onLog }: QuickLogModalProps) {
  const settings = useAppStore((s) => s.settings);
  const style = settings?.snackStyle ?? 'energizing';
  const duration = settings?.snackDuration ?? 2;
  const pack = SNACK_PACKS[style];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 max-w-[480px] mx-auto">
      <div
        className="w-full bg-white rounded-t-[1.5rem] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-log-title"
      >
        <div className="flex justify-end gap-2 mb-4">
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-accent-gray rounded-button hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-accent-gray text-white rounded-button px-4 py-2 inline-block text-sm font-medium mb-4">
          {duration} min
        </div>

        <h2 id="quick-log-title" className="text-xl font-bold text-accent-gray mb-1">
          {pack.title}
        </h2>
        <p className="text-sm text-accent-gray/80 mb-4">{pack.subtitle}</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {pack.exercises.slice(0, 4).map((ex, i) => (
            <span
              key={i}
              className="text-xs bg-gray-100 text-accent-gray px-2.5 py-1 rounded-button"
            >
              {ex.name}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={onLog}
          className="w-full bg-primary text-white font-semibold py-3.5 rounded-button"
        >
          Log snack
        </button>
      </div>
    </div>
  );
}
