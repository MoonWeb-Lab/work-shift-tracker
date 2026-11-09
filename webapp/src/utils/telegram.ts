// Safe Telegram WebApp wrapper

declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

export const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

export function initTelegramApp() {
  if (tg) {
    tg.ready();
    tg.expand();
    try {
      tg.enableClosingConfirmation();
    } catch (e) {}
  }
}

export function hapticFeedback(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') {
  if (tg?.HapticFeedback) {
    try {
      tg.HapticFeedback.impactOccurred(style);
    } catch (e) {}
  }
}

export function hapticNotification(type: 'success' | 'warning' | 'error') {
  if (tg?.HapticFeedback) {
    try {
      tg.HapticFeedback.notificationOccurred(type);
    } catch (e) {}
  }
}

export function sendDataToBot(data: any) {
  if (tg) {
    try {
      tg.sendData(JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('sendData failed:', e);
    }
  }
  return false;
}

export function closeTelegramApp() {
  if (tg) {
    try {
      tg.close();
    } catch (e) {}
  }
}
