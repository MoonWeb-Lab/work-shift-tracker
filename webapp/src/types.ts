export type ShiftType = 'full' | 'half' | 'off' | 'sick';

export interface ShiftEntry {
  date: string; // YYYY-MM-DD
  type: ShiftType;
  hours: number;
  halfDayTime?: string; // e.g., '09:00 - 14:00'
  note?: string;
  earned: number;
}

export interface UserSettings {
  rateFull: number; // Ставка за полную смену
  rateHalf: number; // Ставка за полсмены
  currency: string; // BYN, RUB, etc.
  fullShiftHours: number; // Длительность полной смены (напр. 12)
  halfShiftHours: number; // Длительность полсмены (напр. 6)
  halfDayTimeSlot: string; // Время выхода на полдня, напр. '09:00 - 14:00'
  
  // Two-part payout dates & period cutoffs:
  advanceDay: number; // 1-я выплата (Аванс, по умолчанию 25-е число)
  firstPeriodEnd: number; // Конец 1-го периода (по умолчанию 15-е число)
  
  salaryDay: number; // 2-я выплата (Основная ЗП, по умолчанию 10-е число)
  secondPeriodStart: number; // Начало 2-го периода (по умолчанию 16-е число)

  notificationsEnabled: boolean;
  morningReminderTime: string;
  eveningReminderTime: string;
}

export interface MonthStats {
  totalEarned: number; // Общий заработок за весь просматриваемый месяц
  projectedSalary: number; // Прогноз на весь месяц
  fullShiftsCount: number;
  halfShiftsCount: number;
  offDaysCount: number;
  totalHours: number;

  // 1-я часть (1-е — 15-е текущего месяца, к выплате 25-го числа)
  advanceEarned: number;
  advanceShiftsCount: number;

  // 2-я часть текущего месяца (16-е — конец текущего месяца, к выплате 10-го числа следующего месяца)
  secondPartEarned: number;
  secondPartShiftsCount: number;

  // Выплата за предыдущий месяц (16-е — конец пред. месяца, к выплате 10-го числа текущего месяца)
  previousMonthSecondPartEarned: number;

  // Ближайшая выплата
  nextPayoutName: string; // 'Аванс (25-е число)' или 'Зарплата (10-е число)'
  nextPayoutDate: number; // 25 или 10
  nextPayoutAmount: number; // Сумма к получению в ближайшую выплату
  nextPayoutPeriodStr: string; // 'за 1–15 Ноября' или 'за 16–31 Октября'
  daysToNextPayout: number;
  remainingShiftsToNextPayout: number;

  // Legacy compatibility fields
  daysToSalary: number;
  remainingShiftsToSalary: number;
  weekEarned: number;
  weekShiftsRemaining: number;
}
