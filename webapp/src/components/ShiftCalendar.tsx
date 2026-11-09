import React, { useState } from 'react';
import { ShiftEntry, UserSettings } from '../types';
import { hapticFeedback, hapticNotification } from '../utils/telegram';
import {
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';

interface ShiftCalendarProps {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
  shifts: Record<string, ShiftEntry>;
  onToggleShift: (dateStr: string) => void;
  onOpenDayDetails: (dateStr: string) => void;
  onClearMonthShifts: (yearMonth: string) => void;
  settings: UserSettings;
}

export const ShiftCalendar: React.FC<ShiftCalendarProps> = ({
  currentDate,
  onMonthChange,
  shifts,
  onToggleShift,
  onOpenDayDetails,
  onClearMonthShifts,
  settings,
}) => {
  const [showClearModal, setShowClearModal] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const ymStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const monthName = currentDate.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    hapticFeedback('light');
    onMonthChange(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    hapticFeedback('light');
    onMonthChange(new Date(year, month + 1, 1));
  };

  const handleTodayMonth = () => {
    hapticFeedback('light');
    onMonthChange(new Date());
  };

  // Count active shifts for current month
  const currentMonthShiftsCount = Object.keys(shifts).filter(
    (k) => k.startsWith(ymStr) && shifts[k].type !== 'off'
  ).length;

  const handleConfirmClear = () => {
    hapticFeedback('heavy');
    hapticNotification('warning');
    onClearMonthShifts(ymStr);
    setShowClearModal(false);
  };

  // Days calculations
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Day of week offset (Monday = 0 ... Sunday = 6)
  let startOffset = firstDayOfMonth.getDay() - 1;
  if (startOffset === -1) startOffset = 6;

  const todayStr = new Date().toISOString().split('T')[0];

  const calendarDays = [];
  // Empty pad for previous month
  for (let i = 0; i < startOffset; i++) {
    calendarDays.push(null);
  }
  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const weekDayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="space-y-3 px-4">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between glass-panel px-4 py-2.5 rounded-2xl">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          aria-label="Предыдущий месяц"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleTodayMonth}
          className="text-center group cursor-pointer focus:outline-none"
        >
          <div className="text-base font-extrabold text-white capitalize group-hover:text-emerald-400 transition-colors">
            {monthName}
          </div>
          <div className="text-[10px] text-slate-400 group-hover:text-slate-300">
            {currentMonthShiftsCount} активных смен
          </div>
        </button>

        <button
          onClick={handleNextMonth}
          className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          aria-label="Следующий месяц"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Weekday Names Header */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 py-1">
        {weekDayNames.map((name, i) => (
          <div
            key={name}
            className={i >= 5 ? 'text-rose-400/80 font-bold' : ''}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarDays.map((dayNum, idx) => {
          if (dayNum === null) {
            return <div key={`empty-${idx}`} className="h-14 sm:h-16" />;
          }

          const dayStr = String(dayNum).padStart(2, '0');
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${dayStr}`;
          const isToday = dateStr === todayStr;
          const shift = shifts[dateStr];

          const isSalaryDay = dayNum === settings.salaryDay;
          const isAdvanceDay = settings.advanceDay && dayNum === settings.advanceDay;

          // Shift status styling
          let borderClass = 'border-slate-800/70 hover:border-slate-700';
          let bgClass = 'bg-slate-900/60 hover:bg-slate-800/50';

          if (shift?.type === 'full') {
            bgClass = 'bg-emerald-950/40 hover:bg-emerald-900/50';
            borderClass = 'border-emerald-500/80 ring-1 ring-emerald-500/30';
          } else if (shift?.type === 'half') {
            bgClass = 'bg-amber-950/40 hover:bg-amber-900/50';
            borderClass = 'border-amber-500/80 ring-1 ring-amber-500/30';
          }

          return (
            <div
              key={dateStr}
              onClick={() => {
                hapticFeedback('light');
                onToggleShift(dateStr);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                onOpenDayDetails(dateStr);
              }}
              className={`relative h-14 sm:h-16 rounded-xl border p-1 flex flex-col justify-between cursor-pointer transition-all active:scale-95 select-none ${bgClass} ${borderClass} ${
                isToday ? 'ring-2 ring-emerald-400' : ''
              }`}
            >
              {/* Day Header: Number + Markers */}
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs font-bold leading-none ${
                    isToday
                      ? 'text-emerald-300 font-extrabold'
                      : 'text-slate-200'
                  }`}
                >
                  {dayNum}
                </span>

                <div className="flex items-center gap-0.5">
                  {isSalaryDay && (
                    <span
                      title="День зарплаты"
                      className="text-[9px] px-1 rounded bg-amber-500/30 text-amber-300 font-black leading-tight border border-amber-500/40"
                    >
                      ЗП
                    </span>
                  )}
                  {isAdvanceDay && (
                    <span
                      title="День аванса"
                      className="text-[8px] px-1 rounded bg-teal-500/30 text-teal-300 font-black leading-tight border border-teal-500/40"
                    >
                      АВ
                    </span>
                  )}
                </div>
              </div>

              {/* Shift Badge & Earnings */}
              <div className="flex flex-col items-center justify-center my-auto">
                {shift?.type === 'full' && (
                  <span className="text-[10px] font-black text-emerald-400 leading-tight">
                    +{shift.earned}
                  </span>
                )}
                {shift?.type === 'half' && (
                  <span className="text-[10px] font-black text-amber-400 leading-tight">
                    +{shift.earned}
                  </span>
                )}
                {(!shift || shift.type === 'off') && (
                  <span className="text-[9px] text-slate-500 leading-none">вых</span>
                )}
              </div>

              {/* Time Slot indicator if half day */}
              <div className="text-[8px] text-slate-400/80 truncate w-full text-center">
                {shift?.type === 'half' && (shift.halfDayTime || 'полдня')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Legend and Hint */}
      <div className="glass-card p-3 rounded-2xl flex items-center justify-between text-xs text-slate-300 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            <span className="text-[11px]">Полная ({settings.rateFull} {settings.currency})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
            <span className="text-[11px]">Полдня ({settings.rateHalf} {settings.currency})</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 italic">
          Клик — сменить тип
        </div>
      </div>

      {/* Action Bar with Today Shift, Details, and Safe Clear Shifts Button */}
      <div className="space-y-2 pt-1">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              hapticFeedback('medium');
              onToggleShift(todayStr);
            }}
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Смена сегодня</span>
          </button>

          <button
            onClick={() => onOpenDayDetails(todayStr)}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition-all"
          >
            <PlusCircle className="w-4 h-4 text-teal-400" />
            <span>Детали дня</span>
          </button>
        </div>

        {/* Protected Clear Month Shifts Button (Cannot be pressed accidentally) */}
        {currentMonthShiftsCount > 0 && (
          <button
            onClick={() => {
              hapticFeedback('medium');
              setShowClearModal(true);
            }}
            className="w-full py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 active:scale-95 text-slate-400 hover:text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Очистить смены за {monthName} ({currentMonthShiftsCount})</span>
          </button>
        )}
      </div>

      {/* ACCIDENTAL PRESS PROTECTION: Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xl">
            {/* Modal Icon and Title */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Сбросить все смены?
                  </h3>
                  <div className="text-[11px] text-slate-400 capitalize">
                    За {monthName}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowClearModal(false)}
                className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Вы собираетесь удалить все отмеченные смены (<b>{currentMonthShiftsCount} смен</b>) за {monthName}.
              Заработанная сумма за месяц будет обнулена. Данные также обновятся в боте.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-all"
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={handleConfirmClear}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Да, очистить всё</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
