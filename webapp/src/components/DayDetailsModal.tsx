import React, { useState, useEffect } from 'react';
import { ShiftEntry, ShiftType, UserSettings } from '../types';
import { hapticFeedback } from '../utils/telegram';
import { X, Clock, Trash2, Check, Plus, Minus } from 'lucide-react';

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  currentShift?: ShiftEntry;
  onSaveShift: (entry: ShiftEntry) => void;
  onDeleteShift: (dateStr: string) => void;
  settings: UserSettings;
}

export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  currentShift,
  onSaveShift,
  onDeleteShift,
  settings,
}) => {
  const [shiftType, setShiftType] = useState<ShiftType>('full');
  const [halfDayTime, setHalfDayTime] = useState<string>(settings.halfDayTimeSlot || '09:00 - 14:00');
  const [customHours, setCustomHours] = useState<number>(settings.fullShiftHours);
  const [customEarned, setCustomEarned] = useState<number>(settings.rateFull);
  const [hoursStr, setHoursStr] = useState<string>(String(settings.fullShiftHours));
  const [earnedStr, setEarnedStr] = useState<string>(String(settings.rateFull));
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (currentShift) {
      setShiftType(currentShift.type);
      setHalfDayTime(currentShift.halfDayTime || settings.halfDayTimeSlot || '09:00 - 14:00');
      setCustomHours(currentShift.hours);
      setCustomEarned(currentShift.earned);
      setHoursStr(String(currentShift.hours));
      setEarnedStr(String(currentShift.earned));
      setNote(currentShift.note || '');
    } else {
      setShiftType('full');
      setHalfDayTime(settings.halfDayTimeSlot || '09:00 - 14:00');
      setCustomHours(settings.fullShiftHours);
      setCustomEarned(settings.rateFull);
      setHoursStr(String(settings.fullShiftHours));
      setEarnedStr(String(settings.rateFull));
      setNote('');
    }
  }, [currentShift, settings, isOpen]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: ShiftType) => {
    hapticFeedback('light');
    setShiftType(newType);
    if (newType === 'full') {
      setCustomHours(settings.fullShiftHours);
      setCustomEarned(settings.rateFull);
      setHoursStr(String(settings.fullShiftHours));
      setEarnedStr(String(settings.rateFull));
    } else if (newType === 'half') {
      setCustomHours(settings.halfShiftHours);
      setCustomEarned(settings.rateHalf);
      setHoursStr(String(settings.halfShiftHours));
      setEarnedStr(String(settings.rateHalf));
    } else {
      setCustomHours(0);
      setCustomEarned(0);
      setHoursStr('0');
      setEarnedStr('0');
    }
  };

  const adjustHours = (delta: number) => {
    hapticFeedback('light');
    const nextVal = Math.max(1, Math.min(24, customHours + delta));
    setCustomHours(nextVal);
    setHoursStr(String(nextVal));
  };

  const adjustEarned = (delta: number) => {
    hapticFeedback('light');
    const nextVal = Math.max(0, customEarned + delta);
    setCustomEarned(nextVal);
    setEarnedStr(String(nextVal));
  };

  const handleSave = () => {
    hapticFeedback('medium');
    onSaveShift({
      date: dateStr,
      type: shiftType,
      hours: customHours,
      halfDayTime: shiftType === 'half' ? halfDayTime : undefined,
      earned: customEarned,
      note: note.trim() || undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    hapticFeedback('heavy');
    onDeleteShift(dateStr);
    onClose();
  };

  const formattedDate = new Date(dateStr).toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Настройка смены
            </span>
            <h3 className="text-base font-bold text-white capitalize">
              {formattedDate}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shift Type Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Тип смены:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange('full')}
              className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer ${
                shiftType === 'full'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 mx-auto mb-1.5" />
              <span>Полная</span>
              <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                {settings.rateFull} {settings.currency}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('half')}
              className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer ${
                shiftType === 'half'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/30'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-amber-400 mx-auto mb-1.5" />
              <span>Полдня</span>
              <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                {settings.rateHalf} {settings.currency}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('off')}
              className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer ${
                shiftType === 'off'
                  ? 'bg-slate-700/60 border-slate-500 text-white ring-2 ring-slate-500/30'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-slate-500 mx-auto mb-1.5" />
              <span>Выходной</span>
              <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                0 {settings.currency}
              </div>
            </button>
          </div>
        </div>

        {/* Half-Day Specific Schedule Setting */}
        {shiftType === 'half' && (
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Clock className="w-4 h-4" />
              <span>Время выхода на полдня:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['09:00 - 14:00', '14:00 - 20:00', '10:00 - 15:00', '12:00 - 18:00'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setHalfDayTime(preset)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                    halfDayTime === preset
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Или введите свое время (напр. 15:00 - 21:00)"
              value={halfDayTime}
              onChange={(e) => setHalfDayTime(e.target.value)}
              className="w-full mt-1 p-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        )}

        {/* Custom Hours & Earned Amount with steppers and decimal inputs */}
        {shiftType !== 'off' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Часов за смену:
              </label>
              <div className="flex items-center gap-1 bg-slate-900/90 rounded-xl p-1 border border-slate-700">
                <button
                  type="button"
                  onClick={() => adjustHours(-1)}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={hoursStr}
                  onChange={(e) => {
                    setHoursStr(e.target.value);
                    const n = parseInt(e.target.value, 10);
                    if (!isNaN(n) && n > 0 && n <= 24) setCustomHours(n);
                  }}
                  onBlur={() => {
                    if (hoursStr.trim() === '') setHoursStr(String(customHours));
                  }}
                  className="w-full text-center bg-transparent text-sm font-bold text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => adjustHours(1)}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700">
              <label className="text-[11px] font-semibold text-emerald-400 block mb-1">
                Оплата ({settings.currency}):
              </label>
              <div className="flex items-center gap-1 bg-slate-900/90 rounded-xl p-1 border border-slate-700">
                <button
                  type="button"
                  onClick={() => adjustEarned(-10)}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  inputMode="decimal"
                  value={earnedStr}
                  onChange={(e) => {
                    setEarnedStr(e.target.value);
                    const cleaned = e.target.value.replace(',', '.');
                    const n = parseFloat(cleaned);
                    if (!isNaN(n) && n >= 0) setCustomEarned(n);
                  }}
                  onBlur={() => {
                    if (earnedStr.trim() === '') setEarnedStr(String(customEarned));
                  }}
                  className="w-full text-center bg-transparent text-sm font-bold text-emerald-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => adjustEarned(10)}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Note */}
        <div>
          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
            Заметка к смене (необязательно):
          </label>
          <input
            type="text"
            placeholder="Например: доплата за переработку +15 руб"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          {currentShift && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-400 hover:bg-rose-900/50 transition-colors cursor-pointer"
              aria-label="Удалить смену"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Сохранить</span>
          </button>
        </div>
      </div>
    </div>
  );
};
