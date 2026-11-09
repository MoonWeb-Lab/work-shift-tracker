import { useState, useEffect, useMemo } from 'react';
import { ShiftEntry, ShiftType, UserSettings, MonthStats } from './types';
import { initTelegramApp, hapticFeedback } from './utils/telegram';
import { Header } from './components/Header';
import { SalaryCounters } from './components/SalaryCounters';
import { ShiftCalendar } from './components/ShiftCalendar';
import { DayDetailsModal } from './components/DayDetailsModal';
import { SettingsModal } from './components/SettingsModal';
import { StatsView } from './components/StatsView';
import { Calendar, BarChart3, Settings } from 'lucide-react';

const DEFAULT_SETTINGS: UserSettings = {
  rateFull: 100,
  rateHalf: 50,
  currency: 'BYN',
  fullShiftHours: 12,
  halfShiftHours: 6,
  halfDayTimeSlot: '09:00 - 14:00',
  advanceDay: 25,
  firstPeriodEnd: 15,
  salaryDay: 10,
  secondPeriodStart: 16,
  notificationsEnabled: true,
  morningReminderTime: '08:00',
  eveningReminderTime: '21:00',
};

export function App() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'calendar' | 'stats'>('calendar');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [selectedDayDetailsDate, setSelectedDayDetailsDate] = useState<string | null>(null);

  // 1. Settings state
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('shift_tracker_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_SETTINGS;
  });

  // 2. Shifts database state
  const [shifts, setShifts] = useState<Record<string, ShiftEntry>>(() => {
    try {
      const saved = localStorage.getItem('shift_tracker_shifts');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    
    // Default initial shifts for current month
    const demo: Record<string, ShiftEntry> = {};
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    demo[`${y}-${m}-02`] = { date: `${y}-${m}-02`, type: 'full', hours: 12, earned: 100 };
    demo[`${y}-${m}-03`] = { date: `${y}-${m}-03`, type: 'full', hours: 12, earned: 100 };
    demo[`${y}-${m}-06`] = { date: `${y}-${m}-06`, type: 'half', hours: 6, halfDayTime: '09:00 - 14:00', earned: 50 };
    demo[`${y}-${m}-08`] = { date: `${y}-${m}-08`, type: 'full', hours: 12, earned: 100 };
    return demo;
  });

  // Telegram App Ready
  useEffect(() => {
    initTelegramApp();
  }, []);

  // Listen for shifts passed from bot's "➕ Быстрая смена"
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shiftSync = params.get('shift_sync');
    if (shiftSync) {
      const [date, type] = shiftSync.split(':');
      if (date && type) {
        setShifts((prev) => {
          const next = { ...prev };
          if (type === 'off') {
            delete next[date];
          } else {
            next[date] = {
              date,
              type: type as ShiftType,
              hours: type === 'full' ? settings.fullShiftHours : settings.halfShiftHours,
              earned: type === 'full' ? settings.rateFull : settings.rateHalf,
            };
          }
          return next;
        });
      }
    }
  }, [settings]);

  // Save settings on update
  useEffect(() => {
    try {
      localStorage.setItem('shift_tracker_settings', JSON.stringify(settings));
    } catch (e) {}
  }, [settings]);

  // Save shifts on update
  useEffect(() => {
    try {
      localStorage.setItem('shift_tracker_shifts', JSON.stringify(shifts));
    } catch (e) {}
  }, [shifts]);

  // Toggle shift on calendar tap (off -> full -> half -> off)
  const handleToggleShift = (dateStr: string) => {
    setShifts((prev) => {
      const current = prev[dateStr];
      const next = { ...prev };

      if (!current || current.type === 'off') {
        // Turn to full shift
        next[dateStr] = {
          date: dateStr,
          type: 'full',
          hours: settings.fullShiftHours,
          earned: settings.rateFull,
        };
      } else if (current.type === 'full') {
        // Turn to half shift
        next[dateStr] = {
          date: dateStr,
          type: 'half',
          hours: settings.halfShiftHours,
          halfDayTime: settings.halfDayTimeSlot,
          earned: settings.rateHalf,
        };
      } else {
        // Delete / turn to off
        delete next[dateStr];
      }

      return next;
    });
  };

  const handleSaveShift = (entry: ShiftEntry) => {
    setShifts((prev) => {
      const next = { ...prev };
      if (entry.type === 'off') {
        delete next[entry.date];
      } else {
        next[entry.date] = entry;
      }
      return next;
    });
  };

  const handleDeleteShift = (dateStr: string) => {
    setShifts((prev) => {
      const next = { ...prev };
      delete next[dateStr];
      return next;
    });
  };

  // Safe Month Shifts Clear
  const handleClearMonthShifts = (yearMonthStr: string) => {
    setShifts((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (k.startsWith(yearMonthStr)) {
          delete next[k];
        }
      }
      return next;
    });
  };

  // Compute stats for current viewed month
  const stats: MonthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const todayDayNum = today.getDate();

    let totalEarned = 0;
    let projectedSalary = 0;
    let fullShiftsCount = 0;
    let halfShiftsCount = 0;
    let offDaysCount = 0;
    let totalHours = 0;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const firstCutoff = settings.firstPeriodEnd || 15;
    const secondCutoff = settings.secondPeriodStart || 16;
    const firstPayDay = settings.advanceDay || 25;
    const secondPayDay = settings.salaryDay || 10;

    let advanceEarned = 0;
    let advanceShiftsCount = 0;
    let secondPartEarned = 0;
    let secondPartShiftsCount = 0;

    // Iterate through all days of this month
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const entry = shifts[dStr];

      if (entry && entry.type !== 'off') {
        if (entry.type === 'full') fullShiftsCount++;
        if (entry.type === 'half') halfShiftsCount++;
        totalHours += entry.hours || 0;

        // Earned so far vs projected
        if (isCurrentMonth) {
          if (d <= todayDayNum) {
            totalEarned += entry.earned;
          }
          projectedSalary += entry.earned;
        } else {
          totalEarned += entry.earned;
          projectedSalary += entry.earned;
        }

        // Two-part period distribution
        if (d <= firstCutoff) {
          advanceEarned += entry.earned;
          advanceShiftsCount++;
        } else if (d >= secondCutoff) {
          secondPartEarned += entry.earned;
          secondPartShiftsCount++;
        }
      } else {
        offDaysCount++;
      }
    }

    // Previous month calculation (for second payout on 10th of current month)
    const prevDate = new Date(year, month - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth();
    const lastDayPrev = new Date(prevYear, prevMonth + 1, 0).getDate();
    let previousMonthSecondPartEarned = 0;
    for (let d = secondCutoff; d <= lastDayPrev; d++) {
      const dStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const entry = shifts[dStr];
      if (entry && entry.type !== 'off') {
        previousMonthSecondPartEarned += entry.earned;
      }
    }

    // Month names for display
    const currMonthName = currentDate.toLocaleDateString('ru-RU', { month: 'long' });
    const prevMonthName = prevDate.toLocaleDateString('ru-RU', { month: 'long' });

    // Nearest Payout Logic
    let nextPayoutName = `Зарплата (${secondPayDay}-е число)`;
    let nextPayoutDate = secondPayDay;
    let nextPayoutAmount = 0;
    let nextPayoutPeriodStr = '';
    let daysToNextPayout = 0;
    let remainingShiftsToNextPayout = 0;

    if (isCurrentMonth) {
      if (todayDayNum <= secondPayDay) {
        // Nearest payout is 10th of current month (for 16-end of prev month)
        nextPayoutName = `Зарплата (${secondPayDay}-е число)`;
        nextPayoutDate = secondPayDay;
        nextPayoutAmount = previousMonthSecondPartEarned;
        nextPayoutPeriodStr = `за 16–${lastDayPrev} ${prevMonthName}`;
        daysToNextPayout = secondPayDay - todayDayNum;
        remainingShiftsToNextPayout = 0;
      } else if (todayDayNum <= firstPayDay) {
        // Nearest payout is 25th of current month (for 1-15 of curr month)
        nextPayoutName = `Аванс (${firstPayDay}-е число)`;
        nextPayoutDate = firstPayDay;
        nextPayoutAmount = advanceEarned;
        nextPayoutPeriodStr = `за 1–${firstCutoff} ${currMonthName}`;
        daysToNextPayout = firstPayDay - todayDayNum;
        for (let d = todayDayNum; d <= firstCutoff; d++) {
          const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (shifts[dStr] && shifts[dStr].type !== 'off') remainingShiftsToNextPayout++;
        }
      } else {
        // Passed 25th: next payout is 10th of next month (for 16-end of curr month)
        nextPayoutName = `Зарплата (${secondPayDay}-е число)`;
        nextPayoutDate = secondPayDay;
        nextPayoutAmount = secondPartEarned;
        nextPayoutPeriodStr = `за ${secondCutoff}–${daysInMonth} ${currMonthName}`;
        daysToNextPayout = (daysInMonth - todayDayNum) + secondPayDay;
        for (let d = todayDayNum; d <= daysInMonth; d++) {
          const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (shifts[dStr] && shifts[dStr].type !== 'off') remainingShiftsToNextPayout++;
        }
      }
    } else {
      nextPayoutName = `Зарплата (${secondPayDay}-е число)`;
      nextPayoutDate = secondPayDay;
      nextPayoutAmount = totalEarned;
      nextPayoutPeriodStr = `за ${currMonthName}`;
      daysToNextPayout = secondPayDay;
      remainingShiftsToNextPayout = 0;
    }

    // Calculate weekly metrics
    let weekEarned = 0;
    let weekShiftsRemaining = 0;
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const entry = shifts[dStr];
      if (entry && entry.type !== 'off') {
        if (d <= today) {
          weekEarned += entry.earned;
        } else {
          weekShiftsRemaining++;
        }
      }
    }

    return {
      totalEarned,
      projectedSalary,
      fullShiftsCount,
      halfShiftsCount,
      offDaysCount,
      totalHours,
      advanceEarned,
      advanceShiftsCount,
      secondPartEarned,
      secondPartShiftsCount,
      previousMonthSecondPartEarned,
      nextPayoutName,
      nextPayoutDate,
      nextPayoutAmount,
      nextPayoutPeriodStr,
      daysToNextPayout,
      remainingShiftsToNextPayout,
      daysToSalary: daysToNextPayout,
      remainingShiftsToSalary: remainingShiftsToNextPayout,
      weekEarned,
      weekShiftsRemaining,
    };
  }, [currentDate, shifts, settings]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between max-w-md mx-auto shadow-2xl relative pb-20 select-none">
      {/* Top Header */}
      <Header
        onOpenSettings={() => setSettingsModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 space-y-4 pt-1">
        {/* Top Salary Summary Cards */}
        <SalaryCounters
          stats={stats}
          settings={settings}
        />

        {/* Tab 1: Calendar View */}
        {activeTab === 'calendar' && (
          <ShiftCalendar
            currentDate={currentDate}
            onMonthChange={setCurrentDate}
            shifts={shifts}
            onToggleShift={handleToggleShift}
            onOpenDayDetails={(dateStr) => setSelectedDayDetailsDate(dateStr)}
            onClearMonthShifts={handleClearMonthShifts}
            settings={settings}
          />
        )}

        {/* Tab 2: Analytics & Salary Breakdown */}
        {activeTab === 'stats' && (
          <StatsView
            stats={stats}
            settings={settings}
            shifts={shifts}
            currentDate={currentDate}
          />
        )}
      </main>

      {/* Bottom Floating Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 max-w-lg mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-6 py-2.5 flex items-center justify-around z-20">
        <button
          onClick={() => {
            hapticFeedback('light');
            setActiveTab('calendar');
          }}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
            activeTab === 'calendar' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-bold">Смены</span>
        </button>

        <button
          onClick={() => {
            hapticFeedback('light');
            setActiveTab('stats');
          }}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
            activeTab === 'stats' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-bold">Зарплата</span>
        </button>

        <button
          onClick={() => {
            hapticFeedback('light');
            setSettingsModalOpen(true);
          }}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-bold">Настройки</span>
        </button>
      </nav>

      {/* Day Details Modal */}
      {selectedDayDetailsDate && (
        <DayDetailsModal
          isOpen={Boolean(selectedDayDetailsDate)}
          onClose={() => setSelectedDayDetailsDate(null)}
          dateStr={selectedDayDetailsDate}
          currentShift={shifts[selectedDayDetailsDate]}
          onSaveShift={handleSaveShift}
          onDeleteShift={handleDeleteShift}
          settings={settings}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
      />
    </div>
  );
}

export default App;
