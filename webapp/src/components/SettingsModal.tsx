import React, { useState } from 'react';
import { UserSettings } from '../types';
import { hapticFeedback, hapticNotification, sendDataToBot } from '../utils/telegram';
import { X, Check, Bell, DollarSign, Calendar, Clock, Send } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleSave = () => {
    hapticFeedback('medium');
    onSaveSettings(form);
    
    // Try sending settings to bot if inside Telegram WebApp
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
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Настройки ставок и зарплаты
              </h3>
              <div className="text-[11px] text-slate-400">
                Параметры расчета выплат и напоминаний
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Rates & Currency */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Ставки за смену:</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Полная смена:
              </label>
              <input
                type="number"
                min="0"
                value={form.rateFull}
                onChange={(e) => setForm({ ...form, rateFull: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Полдня (0.5 см.):
              </label>
              <input
                type="number"
                min="0"
                value={form.rateHalf}
                onChange={(e) => setForm({ ...form, rateHalf: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-amber-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Валюта:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['BYN', 'RUB', 'USD', 'EUR'].map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setForm({ ...form, currency: curr })}
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
            <span>Длительность и время смен:</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Часов в полной смене:
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={form.fullShiftHours}
                onChange={(e) => setForm({ ...form, fullShiftHours: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Часов на полдня:
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={form.halfShiftHours}
                onChange={(e) => setForm({ ...form, halfShiftHours: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white focus:outline-none focus:border-sky-500"
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
            <span>Даты выплат:</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                День зарплаты (число):
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={form.salaryDay}
                onChange={(e) => setForm({ ...form, salaryDay: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                День аванса (число):
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={form.advanceDay || 25}
                onChange={(e) => setForm({ ...form, advanceDay: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-teal-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* 4. Bot Notifications */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              <span>Уведомления в Telegram</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.notificationsEnabled}
                onChange={(e) => setForm({ ...form, notificationsEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {form.notificationsEnabled && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Утреннее напоминание:
                </label>
                <input
                  type="time"
                  value={form.morningReminderTime}
                  onChange={(e) => setForm({ ...form, morningReminderTime: e.target.value })}
                  className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Вечерний отчет:
                </label>
                <input
                  type="time"
                  value={form.eveningReminderTime}
                  onChange={(e) => setForm({ ...form, eveningReminderTime: e.target.value })}
                  className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>
            </div>
          )}
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
