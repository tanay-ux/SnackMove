import { motion } from 'framer-motion';
import { getPlatformName } from '../lib/nativeAlarm';

interface NotificationPermissionModalProps {
  onAllow: () => void;
  onCancel: () => void;
}

const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const card = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
  exit: { scale: 0.95, opacity: 0 },
};

export default function NotificationPermissionModal({ onAllow, onCancel }: NotificationPermissionModalProps) {
  const platform = getPlatformName();
  const isIOS = platform === 'ios';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 max-w-[480px] mx-auto"
      variants={backdrop}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      <motion.div
        className="w-full bg-white rounded-3xl p-6 relative z-10 shadow-card"
        variants={card}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col items-center text-center">
          {/* Bell icon */}
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>

          <h2 className="text-lg font-bold text-accent-gray mb-2">
            Allow notifications
          </h2>

          <p className="text-sm text-accent-gray leading-relaxed mb-1.5">
            SnackMove sends gentle reminders during your active hours so you never forget a movement break.
          </p>

          <p className="text-xs text-accent-gray leading-relaxed mb-6">
            {isIOS
              ? 'You\u2019ll see a system prompt next. Tap \u201cAllow\u201d to receive reminders as alerts and sounds.'
              : 'You\u2019ll see an Android permission dialog next. Tap \u201cAllow\u201d to let SnackMove send reminder notifications.'}
          </p>

          <motion.button
            type="button"
            onClick={onAllow}
            className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl shadow-glow-sm mb-3"
            whileTap={{ scale: 0.97 }}
          >
            Continue
          </motion.button>

          <motion.button
            type="button"
            onClick={onCancel}
            className="w-full text-accent-gray text-sm font-semibold py-2"
            whileTap={{ scale: 0.97 }}
          >
            Not now
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
