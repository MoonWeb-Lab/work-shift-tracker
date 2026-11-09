import React from 'react';
import { MonthStats, UserSettings } from '../types';
import { Wallet, TrendingUp, Clock, CalendarDays, Hourglass, Zap } from 'lucide-react';

interface SalaryCountersProps {
  stats: MonthStats;
  settings: UserSettings;
}

export const SalaryCounters: React.FC<SalaryCountersProps> = ({ stats, settings }) => {
  const formatMoney = (val: number) => {
    return val.toLocaleString('ru-RU') + ' ' + settings.currency;
  };

  return (
    <div className="space-y-3 px-4 pt-3">
      {/* Main Income Banner */}
      <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-xl shadow-emerald-950/20">
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Wallet className="w-4 h-4" />
              <span>Заработано в этом месяце</span>
            </span>
            <span className="text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              Факт
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {formatMoney(stats.totalEarned)}
            </span>
          </div>

          {/* Sub-row: Projected salary & Countdown */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            <div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                <span>Прогноз к зарплате:</span>
              </div>
              <div className="text-sm font-bold text-teal-300 mt-0.5">
                ~{formatMoney(stats.projectedSalary)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1">
                <Hourglass className="w-3.5 h-3.5 text-amber-400" />
                <span>До зарплаты ({settings.salaryDay} ч):</span>
              </div>
              <div className="text-sm font-bold text-amber-300 mt-0.5">
                {stats.daysToSalary} дн. • {stats.remainingShiftsToSalary} смен
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Work Metrics */}
      <div className="grid grid-cols-3 gap-2">
        {/* Full shifts */}
        <div className="glass-panel p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Полные</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-white">{stats.fullShiftsCount}</span>
            <span className="text-[10px] text-slate-400 ml-1">смен</span>
          </div>
          <div className="text-[10px] text-emerald-400/80 font-medium mt-0.5">
            по {settings.fullShiftHours}ч
          </div>
        </div>

        {/* Half shifts */}
        <div className="glass-panel p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Полдня</span>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-white">{stats.halfShiftsCount}</span>
            <span className="text-[10px] text-slate-400 ml-1">смен</span>
          </div>
          <div className="text-[10px] text-amber-400/80 font-medium mt-0.5 truncate">
            {settings.halfDayTimeSlot || `${settings.halfShiftHours}ч`}
          </div>
        </div>

        {/* Total Hours */}
        <div className="glass-panel p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Отработано</span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-white">{stats.totalHours}</span>
            <span className="text-[10px] text-slate-400 ml-1">часов</span>
          </div>
          <div className="text-[10px] text-sky-400/80 font-medium mt-0.5">
            {stats.fullShiftsCount + stats.halfShiftsCount} дней работы
          </div>
        </div>
      </div>

      {/* Weekly Quick Pulse */}
      <div className="glass-card p-3 rounded-2xl flex items-center justify-between gap-3 border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Текущая неделя</div>
            <div className="text-[11px] text-slate-400">
              Заработано: <span className="text-emerald-400 font-semibold">{formatMoney(stats.weekEarned)}</span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs font-semibold bg-slate-800 px-2.5 py-1 rounded-xl text-slate-300 border border-slate-700/60 inline-flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Осталось {stats.weekShiftsRemaining} см.</span>
          </span>
        </div>
      </div>
    </div>
  );
};
