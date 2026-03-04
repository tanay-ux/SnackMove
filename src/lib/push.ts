const TITLES = ['2-minute reset?', 'Quick energy boost?', 'Time to move.'];

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

export function getRandomTitle(): string {
  return TITLES[Math.floor(Math.random() * TITLES.length)];
}

export async function showLocalNotification(title: string): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker?.ready;
  if (!reg?.showNotification) return;
  const options: NotificationOptions & { renotify?: boolean } = {
    body: 'Tap to open SnackMove',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    tag: 'snackmove-reminder',
    requireInteraction: false,
  };
  if (typeof (options as NotificationOptions & { renotify?: boolean }).renotify !== 'undefined') {
    (options as NotificationOptions & { renotify?: boolean }).renotify = true;
  }
  await reg.showNotification(title, options);
}
