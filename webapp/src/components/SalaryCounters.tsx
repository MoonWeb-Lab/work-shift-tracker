import React from 'react';
import { MonthStats, UserSettings } from '../types';
import { Wallet, Clock, CalendarDays, Hourglass, Zap, Coins } from 'lucide-react';

interface SalaryCountersProps {
  stats: MonthStats;
  settings: UserSettings;
}

export const SalaryCounters: React.FC<SalaryCountersProps> = ({ stats, settings }) => {
  const formatMoney = (val: number) => {
    return val.toLocaleString('ru-RU') + ' ' + settings.currency;
  };

  const advanceDay = settings.advanceDay || 25;
  const salaryDay = settings.salaryDay || 10;
  const firstCutoff = settings.firstPeriodEnd || 15;
  const secondCutoff = settings.secondPeriodStart || 16;

  return (
    <div className="space-y-3 px-4 pt-3">
      {/* 1. Main Next Payout Highlight Banner */}
      <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-xl shadow-emerald-950/20">
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>Ближайшая выплата</span>
            </span>
            <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              {stats.nextPayoutPeriodStr}
            </span>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {formatMoney(stats.nextPayoutAmount)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {stats.nextPayoutName} • к начислению
            </div>
          </div>

          {/* Sub-row: Countdown to payout & Month Total */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            <div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Hourglass className="w-3.5 h-3.5 text-amber-400" />
                <span>Осталось до выплаты:</span>
              </div>
              <div className="text-sm font-bold text-amber-300 mt-0.5">
                {stats.daysToNextPayout} дн. {stats.remainingShiftsToNextPayout > 0 ? `• ${stats.remainingShiftsToNextPayout} см.` : ''}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1">
                <Wallet className="w-3.5 h-3.5 text-teal-400" />
                <span>Всего за месяц:</span>
              </div>
              <div className="text-sm font-bold text-teal-300 mt-0.5">
                {formatMoney(stats.totalEarned)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Two Distinct Salary Parts (1–15 & 16–конец месяца) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Part 1: Advance (Paid on 25th) */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-teal-500/30 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-teal-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>1-я часть ({advanceDay}-е)</span>
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            Период: с 1 по {firstCutoff}-е число
          </div>
          <div className="text-lg font-black text-white pt-1">
            {formatMoney(stats.advanceEarned)}
          </div>
          <div className="text-[10px] text-teal-300/80 font-medium">
            {stats.advanceShiftsCount} смен отработано
          </div>
        </div>

        {/* Part 2: Main Salary (Paid on 10th) */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>2-я часть ({salaryDay}-е)</span>
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            Период: с {secondCutoff}-го по конец
          </div>
          <div className="text-lg font-black text-white pt-1">
            {formatMoney(stats.secondPartEarned)}
          </div>
          <div className="text-[10px] text-amber-300/80 font-medium">
            {stats.secondPartShiftsCount} смен отработано
          </div>
        </div>
      </div>

      {/* 3. Grid of Work Metrics */}
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

      {/* 4. Weekly Quick Pulse */}
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
