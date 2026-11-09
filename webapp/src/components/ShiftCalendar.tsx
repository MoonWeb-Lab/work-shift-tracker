import React from 'react';
import { ShiftEntry, ShiftType, UserSettings } from '../types';
import { hapticFeedback } from '../utils/telegram';
import { ChevronLeft, ChevronRight, PlusCircle, CheckCircle2 } from 'lucide-react';

interface ShiftCalendarProps {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
  shifts: Record<string, ShiftEntry>;
  onToggleShift: (dateStr: string) => void;
  onOpenDayDetails: (dateStr: string) => void;
  settings: UserSettings;
}

export const ShiftCalendar: React.FC<ShiftCalendarProps> = ({
  currentDate,
  onMonthChange,
  shifts,
  onToggleShift,
  onOpenDayDetails,
  settings,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

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
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dayNum: d, dateStr: dStr });
  }

  const weekDayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getShiftBadge = (type: ShiftType) => {
    switch (type) {
      case 'full':
        return {
          bg: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
          dot: 'bg-emerald-400',
          label: 'Смена',
        };
      case 'half':
        return {
          bg: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
          dot: 'bg-amber-400',
          label: '0.5 см.',
        };
      case 'sick':
        return {
          bg: 'bg-sky-500/20 border-sky-500/50 text-sky-300',
          dot: 'bg-sky-400',
          label: 'Отпуск',
        };
      default:
        return null;
    }
  };

  return (
    <div className="px-4 pt-3 pb-6 space-y-3">
      {/* Month Navigation Header */}
      <div className="glass-panel p-3 rounded-2xl flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 rounded-xl hover:bg-slate-700/60 active:scale-95 text-slate-300 transition-all cursor-pointer"
          aria-label="Предыдущий месяц"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleTodayMonth}
          className="text-sm font-bold text-white capitalize flex items-center gap-1.5 hover:text-emerald-400 transition-colors cursor-pointer"
        >
          <span>{monthName}</span>
        </button>

        <button
          onClick={handleNextMonth}
          className="p-1.5 rounded-xl hover:bg-slate-700/60 active:scale-95 text-slate-300 transition-all cursor-pointer"
          aria-label="Следующий месяц"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 py-1">
        {weekDayLabels.map((wd, idx) => (
          <div key={wd} className={idx >= 5 ? 'text-rose-400/80' : ''}>
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarDays.map((item, index) => {
          if (!item) {
            return <div key={`empty-${index}`} className="aspect-square opacity-0" />;
          }

          const { dayNum, dateStr } = item;
          const shift = shifts[dateStr];
          const isToday = dateStr === todayStr;
          const isSalaryDay = dayNum === settings.salaryDay;
          const isAdvanceDay = settings.advanceDay && dayNum === settings.advanceDay;
          const badge = shift ? getShiftBadge(shift.type) : null;

          return (
            <div
              key={dateStr}
              onClick={() => {
                hapticFeedback('medium');
                onToggleShift(dateStr);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                hapticFeedback('heavy');
                onOpenDayDetails(dateStr);
              }}
              className={`relative aspect-square rounded-2xl p-1 flex flex-col justify-between items-center cursor-pointer transition-all active:scale-90 select-none border ${
                badge
                  ? `${badge.bg} shadow-sm`
                  : 'bg-slate-800/40 border-slate-800/80 hover:border-slate-700 text-slate-300'
              } ${isToday ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : ''}`}
            >
              {/* Day Number + Salary Badge */}
              <div className="w-full flex items-center justify-between text-[11px] px-1 font-bold">
                <span className={isToday ? 'text-emerald-400 font-black' : ''}>
                  {dayNum}
                </span>

                {isSalaryDay && (
                  <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1 rounded-sm leading-none py-0.5">
                    ЗП
                  </span>
                )}
                {isAdvanceDay && (
                  <span className="text-[9px] bg-teal-400 text-slate-950 font-black px-1 rounded-sm leading-none py-0.5">
                    АВ
                  </span>
                )}
              </div>

              {/* Shift Dot / Status */}
              <div className="w-full flex flex-col items-center justify-center">
                {badge ? (
                  <div className="flex flex-col items-center">
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} mb-0.5`} />
                    <span className="text-[9px] font-bold leading-none">{badge.label}</span>
                  </div>
                ) : (
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

      {/* Quick Today Action Bar */}
      <div className="grid grid-cols-2 gap-2 pt-1">
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
    </div>
  );
};
