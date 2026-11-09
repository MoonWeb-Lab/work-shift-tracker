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
  salaryDay: number; // День зарплаты (число месяца, 1-31)
  advanceDay?: number; // День аванса (1-31)
  notificationsEnabled: boolean;
  morningReminderTime: string;
  eveningReminderTime: string;
}

export interface MonthStats {
  totalEarned: number;
  projectedSalary: number;
  fullShiftsCount: number;
  halfShiftsCount: number;
  offDaysCount: number;
  totalHours: number;
  remainingShiftsToSalary: number;
  daysToSalary: number;
  weekEarned: number;
  weekShiftsRemaining: number;
}
