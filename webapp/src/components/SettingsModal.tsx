import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { hapticFeedback, hapticNotification, sendDataToBot } from '../utils/telegram';
import { X, Check, Bell, DollarSign, Calendar, Clock, Send, Sun, Moon, Plus, Minus } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [form, setForm] = useState<UserSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // String buffers for effortless typing on mobile
  const [rateFullStr, setRateFullStr] = useState<string>(String(settings.rateFull));
  const [rateHalfStr, setRateHalfStr] = useState<string>(String(settings.rateHalf));
  const [hoursFullStr, setHoursFullStr] = useState<string>(String(settings.fullShiftHours));
  const [hoursHalfStr, setHoursHalfStr] = useState<string>(String(settings.halfShiftHours));
  const [salaryDayStr, setSalaryDayStr] = useState<string>(String(settings.salaryDay));
  const [advanceDayStr, setAdvanceDayStr] = useState<string>(String(settings.advanceDay || 25));

  useEffect(() => {
    setForm(settings);
    setRateFullStr(String(settings.rateFull));
    setRateHalfStr(String(settings.rateHalf));
    setHoursFullStr(String(settings.fullShiftHours));
    setHoursHalfStr(String(settings.halfShiftHours));
    setSalaryDayStr(String(settings.salaryDay));
    setAdvanceDayStr(String(settings.advanceDay || 25));
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

  const handleSave = () => {
    hapticFeedback('medium');
    onSaveSettings(form);
    
    // Send updated settings to Telegram Bot
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

        {/* 2. Work Schedule Hours */}
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

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Время выхода на полдня по умолчанию:
            </label>
            <input
              type="text"
              placeholder="09:00 - 14:00"
              value={form.halfDayTimeSlot}
              onChange={(e) => setForm({ ...form, halfDayTimeSlot: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* 3. Salary & Advance Days */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Даты выплат зарплаты и аванса</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                День зарплаты (число):
              </label>
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
                  if (salaryDayStr.trim() === '') setSalaryDayStr(String(form.salaryDay));
                }}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-amber-400 text-center focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                День аванса (число):
              </label>
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
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-teal-400 text-center focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* 4. Bot Notifications (Perfect Symmetrical Layout) */}
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
                    Напоминания о сменах и дне зарплаты
                  </div>
                </div>
              </div>

              {/* Custom smooth iOS switch */}
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

            {/* Symmetrical Time Cards */}
            {form.notificationsEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-700/60 animate-fadeIn">
                {/* Morning Reminder Card */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>Утро перед сменой:</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Предупредит о выходе на работу
                  </div>

                  <input
                    type="time"
                    value={form.morningReminderTime}
                    onChange={(e) => setForm({ ...form, morningReminderTime: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white text-center focus:outline-none focus:border-amber-400 cursor-pointer"
                  />

                  {/* Quick Preset Pills */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    {['07:30', '08:00', '08:30'].map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          hapticFeedback('light');
                          setForm({ ...form, morningReminderTime: time });
                        }}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                          form.morningReminderTime === time
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700/60 hover:text-white'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Evening Reminder Card */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                    <Moon className="w-4 h-4 text-sky-400" />
                    <span>Вечерний отчет:</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Итог заработка за день
                  </div>

                  <input
                    type="time"
                    value={form.eveningReminderTime}
                    onChange={(e) => setForm({ ...form, eveningReminderTime: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white text-center focus:outline-none focus:border-sky-400 cursor-pointer"
                  />

                  {/* Quick Preset Pills */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    {['20:00', '21:00', '22:00'].map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          hapticFeedback('light');
                          setForm({ ...form, eveningReminderTime: time });
                        }}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                          form.eveningReminderTime === time
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700/60 hover:text-white'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save CTA */}
        <div className="pt-2">
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
        </div>
      </div>
    </div>
  );
};
