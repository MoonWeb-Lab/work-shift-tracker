import { useState, useEffect, useMemo } from 'react';
import { ShiftEntry, UserSettings, MonthStats } from './types';
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
  salaryDay: 10,
  advanceDay: 25,
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
    
    // Default demo shifts for current month
    const demo: Record<string, ShiftEntry> = {};
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    // Pre-populate a few realistic shifts
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
            totalEarned += entry.earned || 0;
          }
        } else if (currentDate < today) {
          totalEarned += entry.earned || 0;
        }

        projectedSalary += entry.earned || 0;
      } else {
        offDaysCount++;
      }
    }

    // Days to salary
    let daysToSalary = 0;
    let remainingShiftsToSalary = 0;

    if (isCurrentMonth) {
      if (todayDayNum <= settings.salaryDay) {
        daysToSalary = settings.salaryDay - todayDayNum;
        // Count planned shifts between today and salaryDay
        for (let d = todayDayNum; d <= settings.salaryDay; d++) {
          const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (shifts[dStr] && shifts[dStr].type !== 'off') {
            remainingShiftsToSalary++;
          }
        }
      } else {
        // Next month salary
        const daysRemainingThisMonth = daysInMonth - todayDayNum;
        daysToSalary = daysRemainingThisMonth + settings.salaryDay;
        // Count remaining this month
        for (let d = todayDayNum; d <= daysInMonth; d++) {
          const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (shifts[dStr] && shifts[dStr].type !== 'off') {
            remainingShiftsToSalary++;
          }
        }
      }
    }

    // Weekly calculations (current week Monday to Sunday)
    let weekEarned = 0;
    let weekShiftsRemaining = 0;

    const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // 1 = Mon ... 7 = Sun
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDayOfWeek - 1));

    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const dStr = day.toISOString().split('T')[0];
      const entry = shifts[dStr];

      if (entry && entry.type !== 'off') {
        if (i < currentDayOfWeek) {
          weekEarned += entry.earned || 0;
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
      remainingShiftsToSalary,
      daysToSalary,
      weekEarned,
      weekShiftsRemaining,
    };
  }, [currentDate, shifts, settings]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-lg mx-auto pb-16">
      {/* 1. Top Header */}
      <Header onOpenSettings={() => setSettingsModalOpen(true)} />

      {/* 2. Top Tab Switcher */}
      <div className="px-4 pt-3">
        <div className="p-1 bg-slate-900 border border-slate-800 rounded-2xl grid grid-cols-2 gap-1 text-xs font-bold">
          <button
            onClick={() => {
              hapticFeedback('light');
              setActiveTab('calendar');
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>График и Смены</span>
          </button>

          <button
            onClick={() => {
              hapticFeedback('light');
              setActiveTab('stats');
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Аналитика и ЗП</span>
          </button>
        </div>
      </div>

      {/* 3. Main Body */}
      <main className="flex-1">
        {activeTab === 'calendar' ? (
          <>
            {/* Live Counters */}
            <SalaryCounters stats={stats} settings={settings} />

            {/* Shift Calendar */}
            <ShiftCalendar
              currentDate={currentDate}
              onMonthChange={setCurrentDate}
              shifts={shifts}
              onToggleShift={handleToggleShift}
              onOpenDayDetails={setSelectedDayDetailsDate}
              settings={settings}
            />
          </>
        ) : (
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
