import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import App from './App';
import './index.css';

async function maybeClearPwaCachesOnNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!('serviceWorker' in navigator)) return;

  const key = 'snackmove_native_sw_cleanup_v1';
  if (localStorage.getItem(key) === '1') return;

  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    // ignore
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // ignore
  }

  localStorage.setItem(key, '1');
  // Reload once so we definitely pick up bundled assets (not SW cache)
  location.reload();
}

void maybeClearPwaCachesOnNative();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
