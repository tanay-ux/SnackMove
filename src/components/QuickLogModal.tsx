import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { SNACK_PACKS } from '../lib/snackPacks';

interface QuickLogModalProps {
  onClose: () => void;
  onLog: () => void;
}

const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const sheet = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { type: 'spring' as const, stiffness: 350, damping: 35 } },
  exit: { y: '100%', transition: { type: 'spring' as const, stiffness: 400, damping: 40 } },
};

export default function QuickLogModal({ onClose, onLog }: QuickLogModalProps) {
  const settings = useAppStore((s) => s.settings);
  const style = settings?.snackStyle ?? 'energizing';
  const duration = settings?.snackDuration ?? 2;
  const pack = SNACK_PACKS[style];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto"
      variants={backdrop}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        className="w-full bg-white rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] relative z-10"
        variants={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-log-title"
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <span className="bg-primary-50 text-primary text-xs font-bold px-3 py-1.5 rounded-full">
            {duration} min
          </span>
          <motion.button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center text-accent-gray"
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        </div>

        <h2 id="quick-log-title" className="text-xl font-bold text-accent-gray mb-1">
          {pack.title}
        </h2>
        <p className="text-sm text-accent-gray mb-4">{pack.subtitle}</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {pack.exercises.slice(0, 4).map((ex, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="text-xs bg-surface border border-gray-100 text-accent-gray font-medium px-3 py-1.5 rounded-full"
            >
              {ex.name}
            </motion.span>
          ))}
        </div>

        <motion.button
          type="button"
          onClick={onLog}
          className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-glow-sm"
          whileTap={{ scale: 0.97 }}
        >
          Log snack
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
