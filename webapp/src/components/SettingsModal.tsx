import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import {
  hapticFeedback,
  hapticNotification,
  sendDirectTelegramMessage,
  sendDataToBot,
  WEBAPP_URL,
} from '../utils/telegram';
import {
  X,
  Check,
  Bell,
  DollarSign,
  Calendar,
  Clock,
  Send,
  Sun,
  Moon,
  Plus,
  Minus,
  RotateCcw,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  rateFull: 100,
  rateHalf: 50,
  currency: 'BYN',
  fullShiftHours: 12,
  halfShiftHours: 6,
  salaryDay: 10,
  advanceDay: 25,
  firstPeriodEnd: 15,
  secondPeriodStart: 16,
  halfDayTimeSlot: '09:00 - 14:00',
  notificationsEnabled: true,
  morningReminderTime: '08:00',
  eveningReminderTime: '21:00',
};

const PAYOUT_PRESETS = [
  {
    name: '25-е и 10-е (Стандарт)',
    advanceDay: 25,
    firstPeriodEnd: 15,
    salaryDay: 10,
    secondPeriodStart: 16,
  },
  {
    name: '20-е и 5-е',
    advanceDay: 20,
    firstPeriodEnd: 15,
    salaryDay: 5,
    secondPeriodStart: 16,
  },
  {
    name: '30-е и 15-е',
    advanceDay: 30,
    firstPeriodEnd: 15,
    salaryDay: 15,
    secondPeriodStart: 16,
  },
];

const HALF_DAY_PRESETS = [
  '09:00 - 14:00',
  '14:00 - 20:00',
  '16:30 - 22:00',
  '10:00 - 15:00',
  '12:00 - 18:00',
  '18:00 - 23:00',
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [form, setForm] = useState<UserSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testSentSuccess, setTestSentSuccess] = useState(false);
  const [resetConfirmState, setResetConfirmState] = useState(false);

  // String buffers for effortless typing on mobile
  const [rateFullStr, setRateFullStr] = useState<string>(String(settings.rateFull));
  const [rateHalfStr, setRateHalfStr] = useState<string>(String(settings.rateHalf));
  const [hoursFullStr, setHoursFullStr] = useState<string>(String(settings.fullShiftHours));
  const [hoursHalfStr, setHoursHalfStr] = useState<string>(String(settings.halfShiftHours));
  const [salaryDayStr, setSalaryDayStr] = useState<string>(String(settings.salaryDay));
  const [advanceDayStr, setAdvanceDayStr] = useState<string>(String(settings.advanceDay || 25));
  const [firstPeriodEndStr, setFirstPeriodEndStr] = useState<string>(String(settings.firstPeriodEnd || 15));
  const [secondPeriodStartStr, setSecondPeriodStartStr] = useState<string>(String(settings.secondPeriodStart || 16));

  useEffect(() => {
    setForm(settings);
    setRateFullStr(String(settings.rateFull));
    setRateHalfStr(String(settings.rateHalf));
    setHoursFullStr(String(settings.fullShiftHours));
    setHoursHalfStr(String(settings.halfShiftHours));
    setSalaryDayStr(String(settings.salaryDay));
    setAdvanceDayStr(String(settings.advanceDay || 25));
    setFirstPeriodEndStr(String(settings.firstPeriodEnd || 15));
    setSecondPeriodStartStr(String(settings.secondPeriodStart || 16));
    setResetConfirmState(false);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  // Rate change handlers
  const handleRateFullInput = (val: string) => {
    setRateFullStr(val);
    const cleaned = val.replace(',', '.').trim();
    if (cleaned !== '') {
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num >= 0) {
        setForm((prev) => ({ ...prev, rateFull: num }));
      }
    }
  };

  const handleRateHalfInput = (val: string) => {
    setRateHalfStr(val);
    const cleaned = val.replace(',', '.').trim();
    if (cleaned !== '') {
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num >= 0) {
        setForm((prev) => ({ ...prev, rateHalf: num }));
      }
    }
  };

  const adjustRate = (field: 'rateFull' | 'rateHalf', delta: number) => {
    hapticFeedback('light');
    setForm((prev) => {
      const current = prev[field];
      const nextVal = Math.max(0, current + delta);
      if (field === 'rateFull') setRateFullStr(String(nextVal));
      else setRateHalfStr(String(nextVal));
      return { ...prev, [field]: nextVal };
    });
  };

  const setPresetRate = (field: 'rateFull' | 'rateHalf', val: number) => {
    hapticFeedback('medium');
    if (field === 'rateFull') {
      setRateFullStr(String(val));
      setForm((prev) => ({ ...prev, rateFull: val }));
    } else {
      setRateHalfStr(String(val));
      setForm((prev) => ({ ...prev, rateHalf: val }));
    }
  };

  // Direct test notification to Telegram chat (with earned amount!)
  const handleSendTestNotification = async () => {
    hapticFeedback('medium');
    const msg = (
      `🔔 <b>ТЕСТОВОЕ УВЕДОМЛЕНИЕ О СМЕНЕ</b>\n\n` +
      `Привет! Это проверка работы уведомлений Счётчика смен.\n\n` +
      `💰 <b>Уже заработано в этом месяце:</b> <code>0 ${form.currency}</code>\n` +
      `⏳ До дня зарплаты (${form.salaryDay}-е число): <b>активно</b>\n\n` +
      `⚙️ <b>Твоё расписание:</b>\n` +
      `• 🌅 Утреннее напоминание: <b>${form.morningReminderTime}</b>\n` +
      `• 🌙 Вечерний отчет: <b>${form.eveningReminderTime}</b>\n` +
      `• 💵 Ставка смены: <b>${form.rateFull} ${form.currency}</b> (полдня: <b>${form.rateHalf} ${form.currency}</b>)\n` +
      `• ⏰ Время выхода на полдня: <b>${form.halfDayTimeSlot}</b>\n\n` +
      `Уведомления настроены и активны! ✅`
    );

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '📱 Открыть Счётчик',
            web_app: { url: WEBAPP_URL },
          },
        ],
      ],
    };

    await sendDirectTelegramMessage(msg, replyMarkup);
    hapticNotification('success');
    setTestSentSuccess(true);
    setTimeout(() => setTestSentSuccess(false), 3000);
  };

  // Payout adjustment helper functions
  const adjustDayField = (
    field: 'salaryDay' | 'advanceDay' | 'firstPeriodEnd' | 'secondPeriodStart',
    delta: number,
    min: number,
    max: number
  ) => {
    hapticFeedback('light');
    setForm((prev) => {
      const current = prev[field] || min;
      const nextVal = Math.min(max, Math.max(min, current + delta));
      if (field === 'salaryDay') setSalaryDayStr(String(nextVal));
      if (field === 'advanceDay') setAdvanceDayStr(String(nextVal));
      if (field === 'firstPeriodEnd') setFirstPeriodEndStr(String(nextVal));
      if (field === 'secondPeriodStart') setSecondPeriodStartStr(String(nextVal));
      return { ...prev, [field]: nextVal };
    });
  };

  const applyPayoutPreset = (preset: typeof PAYOUT_PRESETS[0]) => {
    hapticFeedback('medium');
    setForm((prev) => ({
      ...prev,
      advanceDay: preset.advanceDay,
      firstPeriodEnd: preset.firstPeriodEnd,
      salaryDay: preset.salaryDay,
      secondPeriodStart: preset.secondPeriodStart,
    }));
    setAdvanceDayStr(String(preset.advanceDay));
    setFirstPeriodEndStr(String(preset.firstPeriodEnd));
    setSalaryDayStr(String(preset.salaryDay));
    setSecondPeriodStartStr(String(preset.secondPeriodStart));
  };

  // Protected Settings Reset (NO chat spam!)
  const handleResetSettingsClick = () => {
    if (!resetConfirmState) {
      hapticFeedback('medium');
      setResetConfirmState(true);
      setTimeout(() => setResetConfirmState(false), 4500);
    } else {
      hapticFeedback('heavy');
      setForm(DEFAULT_SETTINGS);
      setRateFullStr(String(DEFAULT_SETTINGS.rateFull));
      setRateHalfStr(String(DEFAULT_SETTINGS.rateHalf));
      setHoursFullStr(String(DEFAULT_SETTINGS.fullShiftHours));
      setHoursHalfStr(String(DEFAULT_SETTINGS.halfShiftHours));
      setSalaryDayStr(String(DEFAULT_SETTINGS.salaryDay));
      setAdvanceDayStr(String(DEFAULT_SETTINGS.advanceDay));
      setFirstPeriodEndStr(String(DEFAULT_SETTINGS.firstPeriodEnd));
      setSecondPeriodStartStr(String(DEFAULT_SETTINGS.secondPeriodStart));
      setResetConfirmState(false);
      hapticNotification('success');

      // Auto-save defaults locally and via silent web_app_data
      onSaveSettings(DEFAULT_SETTINGS);
      sendDataToBot({
        type: 'settings_update',
        settings: DEFAULT_SETTINGS,
      });
    }
  };

  const handleSave = () => {
    hapticFeedback('medium');
    onSaveSettings(form);

    // Silent Telegram WebApp sendData (NO raw #SYNC# chat messages!)
    sendDataToBot({
      type: 'settings_update',
      settings: form,
    });

    hapticNotification('success');
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Настройки ставок и смен
              </h3>
              <div className="text-[11px] text-slate-400">
                Параметры расчета зарплаты и уведомлений
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Rates & Currency */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Ставки оплаты за смену</span>
          </div>

          {/* Rate Full & Rate Half Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Full Shift Rate */}
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-400">
                  Полная смена ({form.currency})
                </span>
                <span className="text-[10px] text-slate-400">
                  {form.fullShiftHours} ч
                </span>
              </div>

              {/* Input with minus/plus steppers */}
              <div className="flex items-center gap-1.5 bg-slate-900/90 rounded-xl p-1 border border-slate-700">
                <button
                  type="button"
                  onClick={() => adjustRate('rateFull', -10)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                  title="-10"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  inputMode="decimal"
                  value={rateFullStr}
                  onChange={(e) => handleRateFullInput(e.target.value)}
                  onBlur={() => {
                    if (rateFullStr.trim() === '') setRateFullStr(String(form.rateFull));
                  }}
                  placeholder="0"
                  className="w-full text-center bg-transparent text-base font-extrabold text-emerald-400 focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => adjustRate('rateFull', 10)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                  title="+10"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {[60, 80, 100, 120, 150].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPresetRate('rateFull', preset)}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      form.rateFull === preset
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Half Shift Rate */}
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-400">
                  Полдня ({form.currency})
                </span>
                <span className="text-[10px] text-slate-400">
                  {form.halfShiftHours} ч
                </span>
              </div>

              {/* Input with minus/plus steppers */}
              <div className="flex items-center gap-1.5 bg-slate-900/90 rounded-xl p-1 border border-slate-700">
                <button
                  type="button"
                  onClick={() => adjustRate('rateHalf', -5)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                  title="-5"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  inputMode="decimal"
                  value={rateHalfStr}
                  onChange={(e) => handleRateHalfInput(e.target.value)}
                  onBlur={() => {
                    if (rateHalfStr.trim() === '') setRateHalfStr(String(form.rateHalf));
                  }}
                  placeholder="0"
                  className="w-full text-center bg-transparent text-base font-extrabold text-amber-400 focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => adjustRate('rateHalf', 5)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                  title="+5"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {[30, 40, 50, 60, 75].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPresetRate('rateHalf', preset)}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      form.rateHalf === preset
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Currency Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Валюта расчетов:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['BYN', 'RUB', 'USD', 'EUR'].map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => {
                    hapticFeedback('light');
                    setForm({ ...form, currency: curr });
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    form.currency === curr
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Work Schedule Hours & Half-Day Presets */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Длительность смен и время полдня</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Часов в полной смене:
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={hoursFullStr}
                onChange={(e) => {
                  setHoursFullStr(e.target.value);
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n) && n > 0 && n <= 24) {
                    setForm((prev) => ({ ...prev, fullShiftHours: n }));
                  }
                }}
                onBlur={() => {
                  if (hoursFullStr.trim() === '') setHoursFullStr(String(form.fullShiftHours));
                }}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white text-center focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Часов на полдня:
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={hoursHalfStr}
                onChange={(e) => {
                  setHoursHalfStr(e.target.value);
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n) && n > 0 && n <= 12) {
                    setForm((prev) => ({ ...prev, halfShiftHours: n }));
                  }
                }}
                onBlur={() => {
                  if (hoursHalfStr.trim() === '') setHoursHalfStr(String(form.halfShiftHours));
                }}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white text-center focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Half-Day Time Slot: Presets + Custom input */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-300 block">
              Время выхода на полдня:
            </label>

            {/* Quick Presets Grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {HALF_DAY_PRESETS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    hapticFeedback('light');
                    setForm({ ...form, halfDayTimeSlot: slot });
                  }}
                  className={`py-1.5 px-1 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer text-center ${
                    form.halfDayTimeSlot === slot
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400 font-extrabold shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <input
              type="text"
              placeholder="Или введите своё время (напр. 16:30 - 22:00)"
              value={form.halfDayTimeSlot}
              onChange={(e) => setForm({ ...form, halfDayTimeSlot: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* 3. Two-Part Salary & Payout Configuration */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Схема и даты 2-х выплат ЗП</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Аванс за 1-ю половину месяца и расчет за 2-ю половину
            </div>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-3 gap-1.5">
            {PAYOUT_PRESETS.map((preset) => {
              const isActive =
                form.advanceDay === preset.advanceDay &&
                form.salaryDay === preset.salaryDay &&
                form.firstPeriodEnd === preset.firstPeriodEnd &&
                form.secondPeriodStart === preset.secondPeriodStart;

              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPayoutPreset(preset)}
                  className={`py-1.5 px-1.5 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer text-center leading-tight ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-white'
                  }`}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>

          {/* Card 1: 1-st Payment (Advance / Аванс) */}
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-teal-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                <span className="text-xs font-bold text-teal-300">
                  1-я выплата (Аванс)
                </span>
              </div>
              <span className="text-[10px] text-teal-400/90 font-semibold bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
                Период: 1–{form.firstPeriodEnd || 15} число
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Payout Day */}
              <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-700 space-y-1">
                <span className="text-[10px] text-slate-400 block">День выплаты (число):</span>
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => adjustDayField('advanceDay', -1, 1, 31)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={advanceDayStr}
                    onChange={(e) => {
                      setAdvanceDayStr(e.target.value);
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n >= 1 && n <= 31) {
                        setForm((prev) => ({ ...prev, advanceDay: n }));
                      }
                    }}
                    onBlur={() => {
                      if (advanceDayStr.trim() === '') setAdvanceDayStr(String(form.advanceDay || 25));
                    }}
                    className="w-full text-center bg-transparent text-sm font-black text-teal-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustDayField('advanceDay', 1, 1, 31)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Period Cutoff */}
              <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-700 space-y-1">
                <span className="text-[10px] text-slate-400 block">Конец периода (число):</span>
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => adjustDayField('firstPeriodEnd', -1, 1, 30)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={firstPeriodEndStr}
                    onChange={(e) => {
                      setFirstPeriodEndStr(e.target.value);
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n >= 1 && n <= 30) {
                        setForm((prev) => ({ ...prev, firstPeriodEnd: n }));
                      }
                    }}
                    onBlur={() => {
                      if (firstPeriodEndStr.trim() === '') setFirstPeriodEndStr(String(form.firstPeriodEnd || 15));
                    }}
                    className="w-full text-center bg-transparent text-sm font-black text-teal-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustDayField('firstPeriodEnd', 1, 1, 30)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 leading-tight">
              💡 Выплачивается {form.advanceDay}-го числа за отработанные дни с 1 по {form.firstPeriodEnd || 15} текущего месяца.
            </div>
          </div>

          {/* Card 2: 2-nd Payment (Main Salary / Основная зарплата) */}
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs font-bold text-amber-300">
                  2-я выплата (Основная ЗП)
                </span>
              </div>
              <span className="text-[10px] text-amber-400/90 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                Период: {form.secondPeriodStart || 16}–конец месяца
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Payout Day */}
              <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-700 space-y-1">
                <span className="text-[10px] text-slate-400 block">День зарплаты (число):</span>
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => adjustDayField('salaryDay', -1, 1, 31)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={salaryDayStr}
                    onChange={(e) => {
                      setSalaryDayStr(e.target.value);
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n >= 1 && n <= 31) {
                        setForm((prev) => ({ ...prev, salaryDay: n }));
                      }
                    }}
                    onBlur={() => {
                      if (salaryDayStr.trim() === '') setSalaryDayStr(String(form.salaryDay || 10));
                    }}
                    className="w-full text-center bg-transparent text-sm font-black text-amber-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustDayField('salaryDay', 1, 1, 31)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Period Start */}
              <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-700 space-y-1">
                <span className="text-[10px] text-slate-400 block">Начало периода (число):</span>
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => adjustDayField('secondPeriodStart', -1, 2, 31)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={secondPeriodStartStr}
                    onChange={(e) => {
                      setSecondPeriodStartStr(e.target.value);
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n >= 2 && n <= 31) {
                        setForm((prev) => ({ ...prev, secondPeriodStart: n }));
                      }
                    }}
                    onBlur={() => {
                      if (secondPeriodStartStr.trim() === '') setSecondPeriodStartStr(String(form.secondPeriodStart || 16));
                    }}
                    className="w-full text-center bg-transparent text-sm font-black text-amber-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustDayField('secondPeriodStart', 1, 2, 31)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 leading-tight">
              💡 Выплачивается {form.salaryDay}-го числа следующего месяца за дни с {form.secondPeriodStart || 16} по конец предыдущего месяца.
            </div>
          </div>
        </div>

        {/* 4. Bot Notifications (Presets + Custom manual time picker) */}
        <div className="pt-2 border-t border-slate-800">
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3.5">
            {/* Toggle Header Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white uppercase tracking-wider leading-none mb-1">
                    Уведомления в Telegram
                  </div>
                  <div className="text-[11px] text-slate-400 leading-tight">
                    Напоминания о сменах и зарплате
                  </div>
                </div>
              </div>

              {/* iOS switch */}
              <button
                type="button"
                role="switch"
                aria-checked={form.notificationsEnabled}
                onClick={() => {
                  hapticFeedback('medium');
                  setForm((prev) => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }));
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  form.notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    form.notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Symmetrical Time Cards with Custom Picker */}
            {form.notificationsEnabled && (
              <div className="space-y-3 pt-2 border-t border-slate-700/60 animate-fadeIn">
                {/* Morning Reminder Section */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span>Утро перед сменой:</span>
                    </div>
                    <span className="text-xs font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                      {form.morningReminderTime}
                    </span>
                  </div>

                  {/* Symmetrical 5-button segmented row */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {['07:00', '07:30', '08:00', '08:30', '09:00'].map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          hapticFeedback('light');
                          setForm({ ...form, morningReminderTime: time });
                        }}
                        className={`h-8 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center justify-center ${
                          form.morningReminderTime === time
                            ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-sm'
                            : 'bg-slate-800 text-slate-400 border-slate-700/70 hover:text-white'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>

                  {/* Manual exact time picker */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Или любое своё время:</span>
                    </span>
                    <input
                      type="time"
                      value={form.morningReminderTime}
                      onChange={(e) => setForm({ ...form, morningReminderTime: e.target.value })}
                      className="py-1 px-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-white text-center focus:outline-none focus:border-amber-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Evening Reminder Section */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                      <Moon className="w-4 h-4 text-sky-400" />
                      <span>Вечерний отчет:</span>
                    </div>
                    <span className="text-xs font-extrabold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20">
                      {form.eveningReminderTime}
                    </span>
                  </div>

                  {/* Symmetrical 5-button segmented row */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {['19:00', '20:00', '21:00', '21:30', '22:00'].map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          hapticFeedback('light');
                          setForm({ ...form, eveningReminderTime: time });
                        }}
                        className={`h-8 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center justify-center ${
                          form.eveningReminderTime === time
                            ? 'bg-sky-500 text-slate-950 font-black border-sky-400 shadow-sm'
                            : 'bg-slate-800 text-slate-400 border-slate-700/70 hover:text-white'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>

                  {/* Manual exact time picker */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>Или любое своё время:</span>
                    </span>
                    <input
                      type="time"
                      value={form.eveningReminderTime}
                      onChange={(e) => setForm({ ...form, eveningReminderTime: e.target.value })}
                      className="py-1 px-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-white text-center focus:outline-none focus:border-sky-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Send Test Notification Button */}
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 active:scale-95 text-teal-300 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {testSentSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">Тестовое уведомление доставлено в Telegram!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-teal-400" />
                      <span>Отправить тестовое уведомление в бот сейчас</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Save CTA & Reset Settings Button */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-sm shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {savedSuccess ? (
              <>
                <Check className="w-5 h-5 text-emerald-200" />
                <span>Настройки сохранены!</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Сохранить и применить</span>
              </>
            )}
          </button>

          {/* Protected Reset Settings Button */}
          <button
            type="button"
            onClick={handleResetSettingsClick}
            className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              resetConfirmState
                ? 'bg-rose-950/70 border-rose-600 text-rose-200 animate-pulse'
                : 'bg-transparent border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            {resetConfirmState ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Нажмите еще раз, чтобы подтвердить сброс настроек</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Сбросить все настройки к начальным</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
