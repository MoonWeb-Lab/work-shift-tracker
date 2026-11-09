import React from 'react';
import { MonthStats, UserSettings, ShiftEntry } from '../types';
import { hapticFeedback, sendDataToBot, hapticNotification } from '../utils/telegram';
import { Send, CheckCircle2, Clock } from 'lucide-react';

interface StatsViewProps {
  stats: MonthStats;
  settings: UserSettings;
  shifts: Record<string, ShiftEntry>;
  currentDate: Date;
}

export const StatsView: React.FC<StatsViewProps> = ({
  stats,
  settings,
  shifts,
  currentDate,
}) => {
  const [sentReport, setSentReport] = React.useState(false);

  const monthName = currentDate.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });

  const formatMoney = (val: number) => {
    return val.toLocaleString('ru-RU') + ' ' + settings.currency;
  };

  const handleSendReportToBot = () => {
    hapticFeedback('medium');
    const reportData = {
      type: 'monthly_report',
      month: monthName,
      stats: {
        earned: stats.totalEarned,
        projected: stats.projectedSalary,
        fullShifts: stats.fullShiftsCount,
        halfShifts: stats.halfShiftsCount,
        totalHours: stats.totalHours,
        daysToSalary: stats.daysToSalary,
        remainingShifts: stats.remainingShiftsToSalary,
      },
      shiftsCount: Object.keys(shifts).length,
    };

    const sent = sendDataToBot(reportData);
    if (sent) {
      hapticNotification('success');
      setSentReport(true);
      setTimeout(() => setSentReport(false), 2500);
    } else {
      alert(`Сводка готова для бота:\nЗаработано: ${formatMoney(stats.totalEarned)}\nПрогноз: ${formatMoney(stats.projectedSalary)}\nСмен: ${stats.fullShiftsCount + stats.halfShiftsCount}`);
    }
  };

  return (
    <div className="px-4 pt-3 pb-8 space-y-4">
      {/* Month Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-white capitalize">
          Аналитика: {monthName}
        </h2>
        <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          {stats.fullShiftsCount + stats.halfShiftsCount} раб. смен
        </span>
      </div>

      {/* Salary Overview Card */}
      <div className="glass-panel p-4 rounded-3xl space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Финансовые показатели
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Фактически заработано:</span>
            <span className="text-base font-extrabold text-white">{formatMoney(stats.totalEarned)}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Прогноз до дня зарплаты ({settings.salaryDay} ч):</span>
            <span className="text-base font-extrabold text-teal-400">{formatMoney(stats.projectedSalary)}</span>
          </div>

          <div className="flex justify-between items-center text-sm border-t border-slate-800 pt-2">
            <span className="text-slate-400">Средний заработок за смену:</span>
            <span className="font-bold text-slate-200">
              {stats.fullShiftsCount + stats.halfShiftsCount > 0
                ? formatMoney(Math.round(stats.totalEarned / (stats.fullShiftsCount + stats.halfShiftsCount)))
                : `0 ${settings.currency}`}
            </span>
          </div>
        </div>
      </div>

      {/* Workload Breakdown */}
      <div className="glass-panel p-4 rounded-3xl space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Отработанное время и нагрузка
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Полных смен:</div>
            <div className="text-lg font-black text-emerald-400">{stats.fullShiftsCount}</div>
            <div className="text-[10px] text-slate-500">по {settings.fullShiftHours} ч</div>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Смен на полдня:</div>
            <div className="text-lg font-black text-amber-400">{stats.halfShiftsCount}</div>
            <div className="text-[10px] text-slate-500">{settings.halfDayTimeSlot || `${settings.halfShiftHours} ч`}</div>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Всего часов:</div>
            <div className="text-lg font-black text-sky-400">{stats.totalHours} ч</div>
            <div className="text-[10px] text-slate-500">в табеле</div>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Выходных дней:</div>
            <div className="text-lg font-black text-slate-300">{stats.offDaysCount}</div>
            <div className="text-[10px] text-slate-500">отдых</div>
          </div>
        </div>
      </div>

      {/* Countdown to Salary */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>Ближайшая выплата</span>
          </div>
          <div className="text-sm text-slate-300 mt-1">
            Осталось отработать: <span className="font-extrabold text-white">{stats.remainingShiftsToSalary} смен</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Дата зарплаты: {settings.salaryDay}-е число месяца ({stats.daysToSalary} дн.)
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black text-amber-300">
            {stats.daysToSalary}
          </div>
          <div className="text-[10px] text-amber-400/80 uppercase font-bold">дней</div>
        </div>
      </div>

      {/* Send Report CTA */}
      <div className="pt-2">
        <button
          onClick={handleSendReportToBot}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-95 text-white font-bold text-sm shadow-xl shadow-teal-950/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          {sentReport ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <span>Отчёт отправлен в чат Telegram!</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Отправить отчёт в бота Telegram</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
