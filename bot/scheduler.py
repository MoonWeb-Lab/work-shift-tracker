import logging
from datetime import datetime, timedelta
from aiogram import Bot
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import database as db

logger = logging.getLogger(__name__)

async def check_morning_shifts(bot: Bot):
  """Called every morning at 08:00"""
  today_str = datetime.now().strftime('%Y-%m-%d')
  users = db.get_all_active_users()

  for u in users:
    uid = u['user_id']
    shift = db.get_shift_for_date(uid, today_str)
    curr = u['currency']

    try:
      if shift and shift['shift_type'] == 'full':
        await bot.send_message(
          chat_id=uid,
          text=(
            f"🔔 <b>Доброе утро, {u['first_name'] or 'друг'}!</b>\n\n"
            f"Сегодня у тебя запланирована <b>полная смена</b> ({shift['hours']} ч).\n"
            f"💰 Оплата за смену: <b>{shift['earned']} {curr}</b>\n\n"
            f"Хорошего и продуктивного рабочего дня! 💪"
          ),
          parse_mode="HTML"
        )
      elif shift and shift['shift_type'] == 'half':
        slot = u.get('half_day_slot', '09:00 - 14:00')
        await bot.send_message(
          chat_id=uid,
          text=(
            f"🔔 <b>Доброе утро, {u['first_name'] or 'друг'}!</b>\n\n"
            f"Сегодня у тебя смена <b>на полдня</b> ({shift['hours']} ч).\n"
            f"⏰ Время выхода: <b>{slot}</b>\n"
            f"💰 Оплата за смену: <b>{shift['earned']} {curr}</b>\n\n"
            f"Лёгкой и спокойной смены! ☕"
          ),
          parse_mode="HTML"
        )
    except Exception as e:
      logger.warning(f"Failed to send morning notification to {uid}: {e}")

async def check_evening_reminders(bot: Bot):
  """Called every evening at 21:00"""
  today_str = datetime.now().strftime('%Y-%m-%d')
  users = db.get_all_active_users()

  for u in users:
    uid = u['user_id']
    shift = db.get_shift_for_date(uid, today_str)
    if shift and shift['shift_type'] in ('full', 'half'):
      try:
        await bot.send_message(
          chat_id=uid,
          text=(
            f"💼 <b>Смена подошла к концу!</b>\n\n"
            f"За сегодняшний день заработано: <b>+{shift['earned']} {u['currency']}</b>.\n"
            f"Смена учтена в общем табеле зарплаты. Отличного вечера и приятного отдыха! 🌙"
          ),
          parse_mode="HTML"
        )
      except Exception as e:
        logger.warning(f"Failed to send evening reminder to {uid}: {e}")

async def check_salary_notifications(bot: Bot):
  """Called daily at 09:30 to check for salary day"""
  now = datetime.now()
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
        logger.warning(f"Failed to send salary notification to {uid}: {e}")

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
        logger.warning(f"Failed to send pre-salary notification to {uid}: {e}")

def setup_scheduler(bot: Bot) -> AsyncIOScheduler:
  scheduler = AsyncIOScheduler(timezone="Europe/Minsk")
  
  # Morning reminder at 08:00
  scheduler.add_job(check_morning_shifts, 'cron', hour=8, minute=0, args=[bot])
  
  # Evening reminder at 21:00
  scheduler.add_job(check_evening_reminders, 'cron', hour=21, minute=0, args=[bot])
  
  # Salary day check at 09:30
  scheduler.add_job(check_salary_notifications, 'cron', hour=9, minute=30, args=[bot])
  
  scheduler.start()
  logger.info("Scheduler started with Minsk timezone")
  return scheduler
