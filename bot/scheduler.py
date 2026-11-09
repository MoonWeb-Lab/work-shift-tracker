import logging
from datetime import datetime, timedelta
import zoneinfo
from aiogram import Bot
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import database as db

logger = logging.getLogger(__name__)

# Minsk timezone
MINSK_TZ = zoneinfo.ZoneInfo("Europe/Minsk")

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

    # 1. Check Morning Shift Reminder
    if current_hm == m_time:
      shift = db.get_shift_for_date(uid, today_str)
      if shift and shift['shift_type'] == 'full':
        try:
          await bot.send_message(
            chat_id=uid,
            text=(
              f"🔔 <b>Доброе утро, {u['first_name'] or 'друг'}!</b>\n\n"
              f"Сегодня у тебя запланирована <b>полная смена</b> ({shift['hours']:.0f} ч).\n"
              f"💰 Оплата за смену: <b>+{shift['earned']:.0f} {curr}</b>\n\n"
              f"Хорошего и продуктивного рабочего дня! 💪"
            ),
            parse_mode="HTML"
          )
          logger.info(f"Morning shift notification sent to {uid}")
        except Exception as e:
          logger.warning(f"Failed morning alert to {uid}: {e}")

      elif shift and shift['shift_type'] == 'half':
        slot = u.get('half_day_slot', '09:00 - 14:00')
        try:
          await bot.send_message(
            chat_id=uid,
            text=(
              f"🔔 <b>Доброе утро, {u['first_name'] or 'друг'}!</b>\n\n"
              f"Сегодня у тебя смена <b>на полдня</b> ({shift['hours']:.0f} ч).\n"
              f"⏰ Время выхода: <b>{slot}</b>\n"
              f"💰 Оплата за смену: <b>+{shift['earned']:.0f} {curr}</b>\n\n"
              f"Лёгкой и спокойной смены! ☕"
            ),
            parse_mode="HTML"
          )
          logger.info(f"Morning half-day notification sent to {uid}")
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
              f"Смена учтена в табеле зарплаты. Приятного вечера и отличного отдыха! 🌙"
            ),
            parse_mode="HTML"
          )
          logger.info(f"Evening notification sent to {uid}")
        except Exception as e:
          logger.warning(f"Failed evening alert to {uid}: {e}")

async def check_salary_notifications(bot: Bot):
  """Called daily at 09:30 to check for salary day"""
  now = datetime.now(MINSK_TZ)
  today_day = now.day
  ym = now.strftime('%Y-%m')
  users = db.get_all_active_users()

  for u in users:
    uid = u['user_id']
    salary_day = u['salary_day']
    curr = u['currency']

    # 1. Salary Day Alert
    if today_day == salary_day:
      shifts = db.get_user_month_shifts(uid, ym)
      total_earned = sum(s['earned'] for s in shifts)
      full_count = sum(1 for s in shifts if s['shift_type'] == 'full')
      half_count = sum(1 for s in shifts if s['shift_type'] == 'half')
      total_hours = sum(s['hours'] for s in shifts)

      try:
        await bot.send_message(
          chat_id=uid,
          text=(
            f"🎉 <b>СЕГОДНЯ ДЕНЬ ЗАРПЛАТЫ!</b> 💰\n\n"
            f"Итоговая сумма к получению: <b>{total_earned:,.0f} {curr}</b>\n"
            f"📅 Отработано в этом периоде:\n"
            f"• Полных смен: <b>{full_count}</b>\n"
            f"• Смен на полдня: <b>{half_count}</b>\n"
            f"• Всего часов: <b>{total_hours:.0f} ч</b>\n\n"
            f"Поздравляем с выплатой! Проверь начисление на карте или в кассе. 🥂"
          ),
          parse_mode="HTML"
        )
      except Exception as e:
        logger.warning(f"Failed salary notification to {uid}: {e}")

    # 2. Day Before Salary Alert
    elif (salary_day > 1 and today_day == salary_day - 1) or (salary_day == 1 and now.day == 28):
      shifts = db.get_user_month_shifts(uid, ym)
      total_earned = sum(s['earned'] for s in shifts)
      try:
        await bot.send_message(
          chat_id=uid,
          text=(
            f"⏳ <b>Завтра день зарплаты!</b> 💰\n\n"
            f"Твой начисленный заработок к выплате: <b>{total_earned:,.0f} {curr}</b>.\n"
            f"Остался всего 1 день до получения денег! 🚀"
          ),
          parse_mode="HTML"
        )
      except Exception as e:
        logger.warning(f"Failed pre-salary notification to {uid}: {e}")

def setup_scheduler(bot: Bot) -> AsyncIOScheduler:
  scheduler = AsyncIOScheduler(timezone="Europe/Minsk")
  
  # Run minutely reminder check to match each user's exact chosen morning & evening hours
  scheduler.add_job(check_minutely_reminders, 'interval', minutes=1, args=[bot])
  
  # Salary day check at 09:30
  scheduler.add_job(check_salary_notifications, 'cron', hour=9, minute=30, args=[bot])
  
  scheduler.start()
  logger.info("Scheduler started with minutely personalized checks (Europe/Minsk)")
  return scheduler
