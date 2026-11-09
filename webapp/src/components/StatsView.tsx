import React, { useState } from 'react';
import { MonthStats, UserSettings, ShiftEntry } from '../types';
import {
  hapticFeedback,
  hapticNotification,
  sendDirectTelegramMessage,
  sendDataToBot,
  WEBAPP_URL,
} from '../utils/telegram';
import { Send, CheckCircle2, Clock, Loader2, Calendar, TrendingUp } from 'lucide-react';

interface StatsViewProps {
  stats: MonthStats;
  settings: UserSettings;
  shifts: Record<string, ShiftEntry>;
  currentDate: Date;
}

export const StatsView: React.FC<StatsViewProps> = ({
  stats,
  settings,
  shifts: _shifts,
  currentDate,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [sentReport, setSentReport] = useState(false);

  const monthName = currentDate.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });

  const formatMoney = (val: number) => {
    return val.toLocaleString('ru-RU') + ' ' + settings.currency;
  };

  const handleSendReportToBot = async () => {
    hapticFeedback('medium');
    setIsSending(true);

    const advanceDay = settings.advanceDay || 25;
    const salaryDay = settings.salaryDay || 10;
    const p1End = settings.firstPeriodEnd || 15;
    const p2Start = settings.secondPeriodStart || 16;

    const reportHtml = (
      `📊 <b>Сводка смен и выплат за ${monthName}</b>\n\n` +
      `💰 <b>Всего заработано за месяц:</b> <code>${formatMoney(stats.totalEarned)}</code>\n\n` +
      `💵 <b>Две выплаты зарплаты:</b>\n` +
      `• <b>1-я выплата (Аванс, ${advanceDay}-е число):</b>\n` +
      `  Период 1–${p1End} число: <b>${formatMoney(stats.advanceEarned)}</b> (${stats.advanceShiftsCount} смен)\n` +
      `• <b>2-я выплата (Зарплата, ${salaryDay}-е число):</b>\n` +
      `  Период ${p2Start}–конец месяца: <b>${formatMoney(stats.secondPartEarned)}</b> (${stats.secondPartShiftsCount} смен)\n\n` +
      `⏳ <b>Ближайшая выплата:</b> ${stats.nextPayoutName} (${stats.nextPayoutPeriodStr})\n` +
      `• Сумма к получению: <b>${formatMoney(stats.nextPayoutAmount)}</b>\n` +
      `• Осталось: <b>${stats.daysToNextPayout} дн.</b> (осталось отработать: <b>${stats.remainingShiftsToNextPayout} смен</b>)\n\n` +
      `📋 <b>Отработанное время:</b>\n` +
      `• Полных смен (${settings.fullShiftHours} ч): <b>${stats.fullShiftsCount}</b>\n` +
      `• Смен на полдня (${settings.halfDayTimeSlot || `${settings.halfShiftHours} ч`}): <b>${stats.halfShiftsCount}</b>\n` +
      `• Всего часов: <b>${stats.totalHours} ч</b> | Выходных: <b>${stats.offDaysCount}</b>\n\n` +
      `✅ <i>Данные из Mini App успешно занесены в память бота!</i>`
    );

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '📱 Открыть Счётчик (Mini App)',
            web_app: { url: WEBAPP_URL },
          },
        ],
      ],
    };

    // 1. Direct Telegram Bot API message (always works, instant ping on phone)
    await sendDirectTelegramMessage(reportHtml, replyMarkup);

    // 2. Fallback to tg.sendData if running via ReplyKeyboard
    sendDataToBot({
      type: 'monthly_report',
      month: monthName,
      stats: {
        earned: stats.totalEarned,
        advanceEarned: stats.advanceEarned,
        secondPartEarned: stats.secondPartEarned,
        nextPayoutAmount: stats.nextPayoutAmount,
        nextPayoutName: stats.nextPayoutName,
        fullShifts: stats.fullShiftsCount,
        halfShifts: stats.halfShiftsCount,
        totalHours: stats.totalHours,
        daysToNextPayout: stats.daysToNextPayout,
        remainingShifts: stats.remainingShiftsToNextPayout,
      },
    });

    setIsSending(false);
    hapticNotification('success');
    setSentReport(true);
    setTimeout(() => setSentReport(false), 3500);
  };

  const advanceDay = settings.advanceDay || 25;
  const salaryDay = settings.salaryDay || 10;
  const p1End = settings.firstPeriodEnd || 15;
  const p2Start = settings.secondPeriodStart || 16;

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

      {/* Countdown & Nearest Payout Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/40 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
            <Clock className="w-4 h-4" />
            <span>Ближайшая выплата: {stats.nextPayoutName}</span>
          </div>
          <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
            {stats.nextPayoutPeriodStr}
          </span>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <div>
            <div className="text-[11px] text-slate-400">Сумма к начислению:</div>
            <div className="text-2xl font-black text-amber-300">
              {formatMoney(stats.nextPayoutAmount)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Осталось:</div>
            <div className="text-base font-extrabold text-white">
              {stats.daysToNextPayout} дн. <span className="text-xs font-normal text-slate-400">({stats.remainingShiftsToNextPayout} смен)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Payouts Breakdown */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-teal-400" />
          <span>Схема 2-х выплат за месяц</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card 1: 1-st Payment (Advance) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-teal-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-300">1-я часть (Аванс)</span>
              <span className="text-[10px] text-teal-400 font-semibold bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
                {advanceDay}-е число
              </span>
            </div>

            <div className="text-xl font-black text-white">
              {formatMoney(stats.advanceEarned)}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <span>Период: 1–{p1End} число</span>
              <span className="font-semibold text-teal-400">{stats.advanceShiftsCount} смен</span>
            </div>
          </div>

          {/* Card 2: 2-nd Payment (Main Salary) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">2-я часть (Зарплата)</span>
              <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                {salaryDay}-е число
              </span>
            </div>

            <div className="text-xl font-black text-white">
              {formatMoney(stats.secondPartEarned)}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <span>Период: {p2Start}–конец</span>
              <span className="font-semibold text-amber-400">{stats.secondPartShiftsCount} смен</span>
            </div>
          </div>
        </div>
      </div>

      {/* Salary Overview Card */}
      <div className="glass-panel p-4 rounded-3xl space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span>Итоговые финансовые показатели</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Всего заработано за весь месяц:</span>
            <span className="text-base font-black text-emerald-400">{formatMoney(stats.totalEarned)}</span>
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

      {/* Send Report CTA with guaranteed Direct Bot API delivery */}
      <div className="pt-2">
        <button
          onClick={handleSendReportToBot}
          disabled={isSending}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-95 text-white font-bold text-sm shadow-xl shadow-teal-950/40 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
        >
          {isSending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>Отправка отчета в Telegram...</span>
            </>
          ) : sentReport ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <span>Отчёт успешно отправлен в бот! ✅</span>
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
