import logging
from datetime import datetime, timedelta
import calendar
import zoneinfo
from aiogram import Bot
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import database as db

logger = logging.getLogger(__name__)

# Minsk timezone
MINSK_TZ = zoneinfo.ZoneInfo("Europe/Minsk")

def get_payout_details(u: dict, now: datetime):
  """Calculates nearest payout and amounts for 2-part salary scheme"""
  uid = u['user_id']
  y, m, day = now.year, now.month, now.day
  curr = u['currency']
  advance_day = u.get('advance_day') or 25
  salary_day = u.get('salary_day') or 10
  first_cutoff = u.get('first_period_end') or 15
  second_cutoff = u.get('second_period_start') or 16

  # Prev month calculation
  if m == 1:
    prev_y, prev_m = y - 1, 12
  else:
    prev_y, prev_m = y, m - 1
  last_day_prev = calendar.monthrange(prev_y, prev_m)[1]
  last_day_curr = calendar.monthrange(y, m)[1]

  # 1. Period 1 (1–15 curr month -> paid on 25th)
  p1_start = f"{y}-{m:02d}-01"
  p1_end = f"{y}-{m:02d}-{first_cutoff:02d}"
  shifts_p1 = db.get_user_period_shifts(uid, p1_start, p1_end)
  amount_p1 = sum(s['earned'] for s in shifts_p1)

  # 2. Period 2 prev month (16–end prev month -> paid on 10th of curr month)
  p2_prev_start = f"{prev_y}-{prev_m:02d}-{second_cutoff:02d}"
  p2_prev_end = f"{prev_y}-{prev_m:02d}-{last_day_prev:02d}"
  shifts_p2_prev = db.get_user_period_shifts(uid, p2_prev_start, p2_prev_end)
  amount_p2_prev = sum(s['earned'] for s in shifts_p2_prev)

  # 3. Period 2 curr month (16–end curr month -> paid on 10th of next month)
  p2_curr_start = f"{y}-{m:02d}-{second_cutoff:02d}"
  p2_curr_end = f"{y}-{m:02d}-{last_day_curr:02d}"
  shifts_p2_curr = db.get_user_period_shifts(uid, p2_curr_start, p2_curr_end)
  amount_p2_curr = sum(s['earned'] for s in shifts_p2_curr)

  # Total month earned
  shifts_month = db.get_user_month_shifts(uid, f"{y}-{m:02d}")
  total_month = sum(s['earned'] for s in shifts_month)

  if day <= salary_day:
    # Nearest is 10th (for 16-end of prev month)
    days_left = salary_day - day
    return {
      'next_name': f"Зарплата ({salary_day}-е число)",
      'next_day': salary_day,
      'next_amount': amount_p2_prev,
      'next_period_str': f"за 16–{last_day_prev} число пред. месяца",
      'days_left': days_left,
      'total_month': total_month,
      'amount_p1': amount_p1,
      'amount_p2': amount_p2_curr,
    }
  elif day <= advance_day:
    # Nearest is 25th (for 1-15 of curr month)
    days_left = advance_day - day
    return {
      'next_name': f"Аванс ({advance_day}-е число)",
      'next_day': advance_day,
      'next_amount': amount_p1,
      'next_period_str': f"за 1–{first_cutoff} число тек. месяца",
      'days_left': days_left,
      'total_month': total_month,
      'amount_p1': amount_p1,
      'amount_p2': amount_p2_curr,
    }
  else:
    # Passed 25th: nearest is 10th of NEXT month (for 16-end of curr month)
    days_left = (last_day_curr - day) + salary_day
    return {
      'next_name': f"Зарплата ({salary_day}-е число след. месяца)",
      'next_day': salary_day,
      'next_amount': amount_p2_curr,
      'next_period_str': f"за {second_cutoff}–{last_day_curr} число тек. месяца",
      'days_left': days_left,
      'total_month': total_month,
      'amount_p1': amount_p1,
      'amount_p2': amount_p2_curr,
    }

async def check_minutely_reminders(bot: Bot):
  """Checks every minute whether any user has a scheduled morning or evening reminder right now"""
  now = datetime.now(MINSK_TZ)
  current_hm = now.strftime('%H:%M')
  today_str = now.strftime('%Y-%m-%d')
  users = db.get_all_active_users()

  for u in users:
    uid = u['user_id']
    m_time = u.get('morning_reminder_time') or '08:00'
    e_time = u.get('evening_reminder_time') or '21:00'
    curr = u['currency']

    payout = get_payout_details(u, now)

    # 1. Check Morning Shift Reminder
    if current_hm == m_time:
      shift = db.get_shift_for_date(uid, today_str)
      if shift and shift['shift_type'] in ('full', 'half'):
        if shift['shift_type'] == 'full':
          text = (
            f"🔔 <b>Доброе утро, {u['first_name'] or 'друг'}!</b>\n\n"
            f"Сегодня у тебя запланирована <b>полная смена</b> ({shift['hours']:.0f} ч).\n"
            f"💵 Оплата за смену: <b>+{shift['earned']:.0f} {curr}</b>\n\n"
            f"💰 <b>Уже заработано в этом месяце:</b> <code>{payout['total_month']:,.0f} {curr}</code>\n"
            f"⏳ Ближайшая выплата: <b>{payout['next_name']}</b> ({payout['next_period_str']})\n"
            f"   К начислению: <b>{payout['next_amount']:,.0f} {curr}</b> (осталось {payout['days_left']} дн.)\n\n"
            f"Хорошего и продуктивного рабочего дня! 💪"
          )
        else:
          slot = u.get('half_day_slot', '09:00 - 14:00')
          text = (
            f"🔔 <b>Доброе утро, {u['first_name'] or 'друг'}!</b>\n\n"
            f"Сегодня у тебя смена <b>на полдня</b> ({shift['hours']:.0f} ч).\n"
            f"⏰ Время выхода: <b>{slot}</b>\n"
            f"💵 Оплата за смену: <b>+{shift['earned']:.0f} {curr}</b>\n\n"
            f"💰 <b>Уже заработано в этом месяце:</b> <code>{payout['total_month']:,.0f} {curr}</code>\n"
            f"⏳ Ближайшая выплата: <b>{payout['next_name']}</b> ({payout['next_period_str']})\n"
            f"   К начислению: <b>{payout['next_amount']:,.0f} {curr}</b> (осталось {payout['days_left']} дн.)\n\n"
            f"Лёгкой и спокойной смены! ☕"
          )

        try:
          await bot.send_message(chat_id=uid, text=text, parse_mode="HTML")
          logger.info(f"Morning shift notification sent to {uid}")
        except Exception as e:
          logger.warning(f"Failed morning alert to {uid}: {e}")

    # 2. Check Evening Checkout Reminder
    if current_hm == e_time:
      shift = db.get_shift_for_date(uid, today_str)
      if shift and shift['shift_type'] in ('full', 'half'):
        try:
          await bot.send_message(
            chat_id=uid,
            text=(
              f"💼 <b>Смена подошла к концу!</b>\n\n"
              f"За сегодняшний день заработано: <b>+{shift['earned']:.0f} {curr}</b>.\n"
              f"💰 <b>Всего заработано в этом месяце:</b> <code>{payout['total_month']:,.0f} {curr}</code>!\n"
              f"⏳ Ближайшая выплата: <b>{payout['next_name']}</b> ({payout['next_period_str']})\n"
              f"   К начислению: <b>{payout['next_amount']:,.0f} {curr}</b> (осталось {payout['days_left']} дн.)\n\n"
              f"Смена сохранена в табеле. Отличного вечера и приятного отдыха! 🌙"
            ),
            parse_mode="HTML"
          )
          logger.info(f"Evening notification sent to {uid}")
        except Exception as e:
          logger.warning(f"Failed evening alert to {uid}: {e}")

async def check_salary_notifications(bot: Bot):
  """Called daily at 09:30 to check for 1st (25th) or 2nd (10th) salary payment day"""
  now = datetime.now(MINSK_TZ)
  today_day = now.day
  users = db.get_all_active_users()

  for u in users:
    uid = u['user_id']
    curr = u['currency']
    advance_day = u.get('advance_day') or 25
    salary_day = u.get('salary_day') or 10
    payout = get_payout_details(u, now)

    # 1. 25th of month (Payment 1: 1-15 of curr month)
    if today_day == advance_day:
      try:
        await bot.send_message(
          chat_id=uid,
          text=(
            f"🎉 <b>СЕГОДНЯ ВЫПЛАТА АВАНСА ({advance_day}-е число)!</b> 💰\n\n"
            f"💵 Сумма к получению за период с 1 по 15 число: <b>{payout['amount_p1']:,.0f} {curr}</b>\n\n"
            f"Поздравляем с выплатой 1-й части зарплаты! 🥂"
          ),
          parse_mode="HTML"
        )
      except Exception as e:
        logger.warning(f"Failed advance notification to {uid}: {e}")

    # 2. 10th of month (Payment 2: 16-end of prev month)
    elif today_day == salary_day:
      try:
        await bot.send_message(
          chat_id=uid,
          text=(
            f"🎉 <b>СЕГОДНЯ ДЕНЬ ЗАРПЛАТЫ ({salary_day}-е число)!</b> 💰\n\n"
            f"💵 Сумма к получению за 16–конец предыдущего месяца: <b>{payout['next_amount']:,.0f} {curr}</b>\n\n"
            f"Поздравляем с получением основной зарплаты! 🥂"
          ),
          parse_mode="HTML"
        )
      except Exception as e:
        logger.warning(f"Failed salary notification to {uid}: {e}")

def setup_scheduler(bot: Bot) -> AsyncIOScheduler:
  scheduler = AsyncIOScheduler(timezone="Europe/Minsk")
  
  # Run minutely reminder check to match each user's exact chosen morning & evening hours
  scheduler.add_job(check_minutely_reminders, 'interval', minutes=1, args=[bot])
  
  # Salary day check at 09:30
  scheduler.add_job(check_salary_notifications, 'cron', hour=9, minute=30, args=[bot])
  
  scheduler.start()
  logger.info("Scheduler started with minutely personalized checks (Europe/Minsk)")
  return scheduler
