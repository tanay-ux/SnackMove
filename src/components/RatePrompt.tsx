import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const STORAGE_KEY = 'snackmove_rate_prompt';

function getStoreUrl(): string {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') {
    return 'https://apps.apple.com/app/snackmove/id0000000000';
  }
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
    const ONE_DAY = 24 * 60 * 60 * 1000;
    return elapsed >= ONE_DAY;
  } catch {
    return false;
  }
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
    const timer = setTimeout(() => {
      if (shouldShowPrompt()) setShow(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 max-w-[480px] mx-auto"
      onClick={() => { dismissPrompt(); setShow(false); }}
    >
      <div
        className="w-full max-w-[340px] bg-white rounded-card p-5 shadow-card text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-3xl mb-2">&#11088;</div>
        <h3 className="text-lg font-bold text-accent-gray mb-1">Enjoying SnackMove?</h3>
        <p className="text-sm text-accent-gray/70 mb-4">
          Your feedback helps us improve. Would you like to rate us on the store?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { dismissPrompt(); setShow(false); }}
            className="flex-1 rounded-button border border-gray-200 text-accent-gray py-2.5 font-medium text-sm"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => {
              dismissPrompt();
              setShow(false);
              window.open(getStoreUrl(), '_blank');
            }}
            className="flex-1 rounded-button bg-primary text-white py-2.5 font-semibold text-sm"
          >
            Rate now
          </button>
        </div>
      </div>
    </div>
  );
}
