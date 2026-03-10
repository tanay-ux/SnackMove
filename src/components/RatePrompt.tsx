import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';

const STORAGE_KEY = 'snackmove_rate_prompt';

function getStoreUrl(): string {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'https://apps.apple.com/app/snackmove/id0000000000';
  return 'https://play.google.com/store/apps/details?id=com.snackmove.app';
}

function shouldShowPrompt(): boolean {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ firstSeen: Date.now(), dismissed: false }));
      return false;
    }
    const parsed = JSON.parse(data);
    if (parsed.dismissed) return false;
    const elapsed = Date.now() - parsed.firstSeen;
    return elapsed >= 24 * 60 * 60 * 1000;
  } catch { return false; }
}

function dismissPrompt() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : { firstSeen: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, dismissed: true }));
  } catch { /* ignore */ }
}

export default function RatePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { if (shouldShowPrompt()) setShow(true); }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 max-w-[480px] mx-auto"
          onClick={() => { dismissPrompt(); setShow(false); }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-[340px] bg-white rounded-2xl p-6 shadow-card text-center"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <motion.div
              className="w-14 h-14 rounded-2xl bg-accent-yellow/15 flex items-center justify-center mx-auto mb-4"
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <svg className="w-7 h-7 text-accent-yellow" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </motion.div>
            <h3 className="text-lg font-bold text-accent-gray mb-1">Enjoying SnackMove?</h3>
            <p className="text-sm text-accent-gray mb-5">
              Your feedback helps us improve. Would you like to rate us?
            </p>
            <div className="flex gap-2">
              <motion.button
                type="button"
                onClick={() => { dismissPrompt(); setShow(false); }}
                className="flex-1 rounded-xl border border-gray-200 bg-surface text-accent-gray py-3 font-semibold text-sm"
                whileTap={{ scale: 0.97 }}
              >
                Not now
              </motion.button>
              <motion.button
                type="button"
                onClick={() => { dismissPrompt(); setShow(false); window.open(getStoreUrl(), '_blank'); }}
                className="flex-1 rounded-xl bg-primary text-white py-3 font-bold text-sm shadow-glow-sm"
                whileTap={{ scale: 0.97 }}
              >
                Rate now
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
