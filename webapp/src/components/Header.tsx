import React from 'react';
import { tg } from '../utils/telegram';
import { Settings, Calendar as CalendarIcon } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const telegramUser = tg?.initDataUnsafe?.user;
  const userName = telegramUser?.first_name || 'Сотрудник';

  const todayStr = new Date().toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-950/40">
          <CalendarIcon className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white tracking-tight flex items-center gap-1">
              {userName}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          <div className="text-[11px] text-slate-400 capitalize">
            {todayStr}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white transition-all border border-slate-700/60 shadow-sm"
          aria-label="Настройки"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
