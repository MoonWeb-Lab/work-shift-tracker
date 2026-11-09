// Safe Telegram WebApp wrapper and direct Bot API integration

declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

export const BOT_TOKEN = "9240247709:AAFEGeDRGxxP-mTbeeydcBKpwfwuBnZQFco";
export const WEBAPP_URL = "https://moonweb-lab.github.io/work-shift-tracker/";
export const DEFAULT_USER_ID = 5070882729;

export const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

export function getTelegramUserId(): number {
  if (tg?.initDataUnsafe?.user?.id) {
    return Number(tg.initDataUnsafe.user.id);
  }
  return DEFAULT_USER_ID;
}

export function getTelegramUserName(): string {
  if (tg?.initDataUnsafe?.user?.first_name) {
    return String(tg.initDataUnsafe.user.first_name);
  }
  return 'Пользователь';
}

export function initTelegramApp() {
  if (tg) {
    try {
      tg.ready();
      tg.expand();
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

/**
 * Sends a message directly to the Telegram user chat via Bot API.
 * Used ONLY when user explicitly asks to send reports or test notifications.
 * Never used for hidden technical sync!
 */
export async function sendDirectTelegramMessage(
  text: string,
  replyMarkup?: any,
  targetChatId?: number
): Promise<boolean> {
  const chatId = targetChatId || getTelegramUserId();
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch (err) {
    console.error('sendDirectTelegramMessage error:', err);
    return false;
  }
}

/**
 * Silent WebApp data sender. Never sends visible messages to chat.
 */
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
