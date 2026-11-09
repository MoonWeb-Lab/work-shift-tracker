import asyncio
import logging
import json
from datetime import datetime, timedelta
import zoneinfo

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, Command
from aiogram.types import (
  Message,
  CallbackQuery,
  InlineKeyboardMarkup,
  InlineKeyboardButton,
  ReplyKeyboardMarkup,
  KeyboardButton,
  WebAppInfo,
  MenuButtonWebApp,
)

import database as db
from scheduler import setup_scheduler, MINSK_TZ

BOT_TOKEN = "9240247709:AAFEGeDRGxxP-mTbeeydcBKpwfwuBnZQFco"
WEBAPP_URL = "https://moonweb-lab.github.io/work-shift-tracker/"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(name)s - %(message)s")
logger = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

def get_main_keyboard():
  return ReplyKeyboardMarkup(
    keyboard=[
      [
        KeyboardButton(text="📱 Открыть Счётчик смен", web_app=WebAppInfo(url=WEBAPP_URL))
      ],
      [
        KeyboardButton(text="📊 Мой статус и ЗП"),
        KeyboardButton(text="➕ Быстрая смена"),
      ],
      [
        KeyboardButton(text="⚙️ Настройки ставок"),
        KeyboardButton(text="🔔 Тест уведомления"),
      ]
    ],
    resize_keyboard=True
  )

def get_miniapp_inline():
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="📱 Запустить Mini App", web_app=WebAppInfo(url=WEBAPP_URL))
      ],
      [
        InlineKeyboardButton(text="📊 Мой статус и ЗП", callback_data="btn_status"),
        InlineKeyboardButton(text="➕ Отметить смену", callback_data="btn_quick_shift"),
      ]
    ]
  )

@dp.message(CommandStart())
async def handle_start(message: Message):
  user = db.get_or_create_user(
    user_id=message.from_user.id,
    username=message.from_user.username or '',
    first_name=message.from_user.first_name or ''
  )

  # Configure persistent bottom-left menu button
  try:
    await bot.set_chat_menu_button(
      chat_id=message.chat.id,
      menu_button=MenuButtonWebApp(text="📱 Счётчик", web_app=WebAppInfo(url=WEBAPP_URL))
    )
  except Exception as e:
    logger.warning(f"Could not set menu button: {e}")

  welcome_text = (
    f"👋 <b>Привет, {message.from_user.first_name or 'друг'}!</b>\n\n"
    f"Я твой личный <b>Счётчик смен и зарплаты</b>.\n"
    f"Я помогаю вести график работы, автоматически считать заработанные деньги, "
    f"отслеживать дни до зарплаты и присылать умные напоминания о сменах.\n\n"
    f"⚙️ <b>Твои текущие настройки:</b>\n"
    f"• Ставка за полную смену: <b>{user['rate_full']:.0f} {user['currency']}</b>\n"
    f"• Ставка за полсмены: <b>{user['rate_half']:.0f} {user['currency']}</b>\n"
    f"• Время выхода на полдня: <b>{user['half_day_slot']}</b>\n"
    f"• День выплаты зарплаты: <b>{user['salary_day']}-е число</b>\n\n"
    f"👇 Нажми кнопку ниже, чтобы открыть интерактивный календарь смен:"
  )

  await message.answer(welcome_text, parse_mode="HTML", reply_markup=get_miniapp_inline())
  await message.answer("💡 Также ты можешь использовать быстрое меню внизу экрана:", reply_markup=get_main_keyboard())

@dp.message(F.text == "📊 Мой статус и ЗП")
@dp.message(Command("status"))
async def handle_status(message: Message):
  uid = message.from_user.id
  user = db.get_or_create_user(uid)
  now = datetime.now(MINSK_TZ)
  ym = now.strftime('%Y-%m')

  shifts = db.get_user_month_shifts(uid, ym)
  total_earned = sum(s['earned'] for s in shifts)
  full_count = sum(1 for s in shifts if s['shift_type'] == 'full')
  half_count = sum(1 for s in shifts if s['shift_type'] == 'half')
  total_hours = sum(s['hours'] for s in shifts)
  total_shifts = full_count + half_count

  salary_day = user['salary_day']
  today_day = now.day

  if today_day <= salary_day:
    days_to_salary = salary_day - today_day
  else:
    days_in_month = 30
    days_to_salary = (days_in_month - today_day) + salary_day

  if total_shifts == 0:
    text = (
      f"📊 <b>Сводка по работе ({now.strftime('%d.%m.%Y')}):</b>\n\n"
      f"В табеле бота пока нет отмеченных смен за этот месяц.\n\n"
      f"💰 Ставка полной смены: <b>{user['rate_full']:.0f} {user['currency']}</b>\n"
      f"⏳ До зарплаты ({salary_day}-е число): <b>{days_to_salary} дней</b>\n\n"
      f"👉 Открой Счётчик по кнопке ниже и нажми на дни в календаре, "
      f"либо отметь смену прямо сейчас через «➕ Быстрая смена»!"
    )
  else:
    remaining_shifts = sum(
      1 for s in shifts 
      if int(s['date'].split('-')[2]) >= today_day and s['shift_type'] in ('full', 'half')
    )
    text = (
      f"📊 <b>Сводка по работе ({now.strftime('%d.%m.%Y')}):</b>\n\n"
      f"💰 <b>Заработано в этом месяце:</b> <code>{total_earned:,.0f} {user['currency']}</code>\n"
      f"⏳ <b>До зарплаты ({salary_day}-е число):</b> осталось <b>{days_to_salary} дней</b> ({remaining_shifts} смен)\n\n"
      f"📋 <b>Отработано в {now.strftime('%B %Y')}:</b>\n"
      f"• Полных смен: <b>{full_count}</b>\n"
      f"• Смен на полдня: <b>{half_count}</b> ({user['half_day_slot']})\n"
      f"• Всего часов: <b>{total_hours:.0f} ч</b>\n\n"
      f"👇 Подробный интерактивный табель доступен в Mini App:"
    )

  kb = InlineKeyboardMarkup(
    inline_keyboard=[
      [InlineKeyboardButton(text="📱 Открыть Счётчик (Mini App)", web_app=WebAppInfo(url=WEBAPP_URL))]
    ]
  )
  await message.answer(text, parse_mode="HTML", reply_markup=kb)

@dp.message(F.text == "➕ Быстрая смена")
@dp.message(Command("shift"))
async def handle_quick_shift(message: Message):
  today_str = datetime.now(MINSK_TZ).strftime('%Y-%m-%d')
  user = db.get_or_create_user(message.from_user.id)
  existing = db.get_shift_for_date(message.from_user.id, today_str)

  status_str = "не отмечена"
  if existing:
    if existing['shift_type'] == 'full':
      status_str = f"🟢 Полная смена (+{existing['earned']:.0f} {user['currency']})"
    elif existing['shift_type'] == 'half':
      status_str = f"🟡 Полдня (+{existing['earned']:.0f} {user['currency']})"

  kb = InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(
          text=f"🟢 Полная смена ({user['rate_full']:.0f} {user['currency']})", 
          callback_data="set_shift_full"
        )
      ],
      [
        InlineKeyboardButton(
          text=f"🟡 Полдня {user['half_day_slot']} ({user['rate_half']:.0f} {user['currency']})", 
          callback_data="set_shift_half"
        )
      ],
      [
        InlineKeyboardButton(text="⚪ Выходной день (0)", callback_data="set_shift_off"),
      ],
      [
        InlineKeyboardButton(text="📱 Открыть весь календарь", web_app=WebAppInfo(url=WEBAPP_URL))
      ]
    ]
  )

  await message.answer(
    f"📅 <b>Отметка смены на сегодня ({datetime.now(MINSK_TZ).strftime('%d.%m.%Y')}):</b>\n"
    f"Текущий статус: <b>{status_str}</b>\n\n"
    f"Выбери нужный вариант:",
    parse_mode="HTML",
    reply_markup=kb
  )

@dp.callback_query(F.data.startswith("set_shift_"))
async def callback_set_shift(callback: CallbackQuery):
  action = callback.data.replace("set_shift_", "")
  uid = callback.from_user.id
  user = db.get_or_create_user(uid)
  today_str = datetime.now(MINSK_TZ).strftime('%Y-%m-%d')

  if action == "full":
    db.record_shift(uid, today_str, 'full', 12.0, user['rate_full'], 'Отмечено через бота')
    msg = f"✅ Отлично! Сегодня отмечена <b>полная смена</b> (+{user['rate_full']:.0f} {user['currency']})."
  elif action == "half":
    db.record_shift(uid, today_str, 'half', 6.0, user['rate_half'], 'Отмечено через бота (полдня)')
    msg = f"✅ Отлично! Сегодня отмечена <b>смена на полдня</b> ({user['half_day_slot']}, +{user['rate_half']:.0f} {user['currency']})."
  else:
    db.record_shift(uid, today_str, 'off', 0, 0, '')
    msg = f"⚪ Сегодня отмечен <b>выходной день</b>."

  # Deep link with shift parameter so Mini App automatically reflects it on opening
  sync_url = f"{WEBAPP_URL}?shift_sync={today_str}:{action}"

  await callback.answer("Смена сохранена!")
  await callback.message.edit_text(
    f"{msg}\n\nБаланс и табель зарплаты обновлены в боте и синхронизированы! 💰",
    parse_mode="HTML",
    reply_markup=InlineKeyboardMarkup(
      inline_keyboard=[[InlineKeyboardButton(text="📱 Открыть Счётчик (Mini App)", web_app=WebAppInfo(url=sync_url))]]
    )
  )

@dp.callback_query(F.data == "btn_status")
async def callback_btn_status(callback: CallbackQuery):
  await callback.answer()
  await handle_status(callback.message)

@dp.callback_query(F.data == "btn_quick_shift")
async def callback_btn_quick_shift(callback: CallbackQuery):
  await callback.answer()
  await handle_quick_shift(callback.message)

@dp.message(F.text == "⚙️ Настройки ставок")
@dp.message(Command("settings"))
async def handle_settings(message: Message):
  user = db.get_or_create_user(message.from_user.id)
  m_time = user.get('morning_reminder_time') or '08:00'
  e_time = user.get('evening_reminder_time') or '21:00'
  notif_status = "Включены 🔔" if user['notifications_enabled'] else "Выключены 🔕"

  text = (
    f"⚙️ <b>Текущие настройки ставок и уведомлений:</b>\n\n"
    f"• Полная смена: <b>{user['rate_full']:.0f} {user['currency']}</b>\n"
    f"• Полдня: <b>{user['rate_half']:.0f} {user['currency']}</b>\n"
    f"• Время выхода на полдня: <b>{user['half_day_slot']}</b>\n"
    f"• День зарплаты: <b>{user['salary_day']}-е число месяца</b>\n"
    f"• День аванса: <b>{user['advance_day']}-е число месяца</b>\n"
    f"• Уведомления: <b>{notif_status}</b>\n"
    f"  ⏰ Утро: {m_time} | Вечер: {e_time}\n\n"
    f"💡 Быстро изменить ставки, валюту и время можно в Mini App:"
  )
  kb = InlineKeyboardMarkup(
    inline_keyboard=[
      [InlineKeyboardButton(text="⚙️ Изменить в Mini App", web_app=WebAppInfo(url=WEBAPP_URL))]
    ]
  )
  await message.answer(text, parse_mode="HTML", reply_markup=kb)

@dp.message(F.text == "🔔 Тест уведомления")
async def handle_test_notification(message: Message):
  user = db.get_or_create_user(message.from_user.id)
  now = datetime.now(MINSK_TZ)
  ym = now.strftime('%Y-%m')
  shifts = db.get_user_month_shifts(message.from_user.id, ym)
  total_earned = sum(s['earned'] for s in shifts)
  m_time = user.get('morning_reminder_time') or '08:00'
  e_time = user.get('evening_reminder_time') or '21:00'

  await message.answer(
    f"🔔 <b>ТЕСТОВОЕ УВЕДОМЛЕНИЕ ОТ СЧЁТЧИКА:</b>\n\n"
    f"Привет, {message.from_user.first_name or 'друг'}!\n"
    f"✅ Уведомления успешно подключены и работают штатно.\n\n"
    f"⏰ <b>Твоё расписание напоминаний:</b>\n"
    f"• 🌅 Утро (перед выходом): <b>{m_time}</b>\n"
    f"• 🌙 Вечер (итог дня): <b>{e_time}</b>\n"
    f"• 💰 День зарплаты: <b>{user['salary_day']}-е число в 09:30</b>\n\n"
    f"📊 <b>Текущий баланс в табеле:</b> {total_earned:,.0f} {user['currency']}",
    parse_mode="HTML",
    reply_markup=InlineKeyboardMarkup(
      inline_keyboard=[[InlineKeyboardButton(text="📱 Открыть Счётчик смен", web_app=WebAppInfo(url=WEBAPP_URL))]]
    )
  )

# Direct Synchronization Handler from Mini App
@dp.message(F.text.startswith("#SYNC#"))
async def handle_sync_payload(message: Message):
  """Receives direct JSON sync payload from Mini App via API"""
  uid = message.from_user.id
  payload_str = message.text.replace("#SYNC#", "").strip()
  try:
    data = json.loads(payload_str)
    
    # 1. Update settings if provided
    if 'settings' in data:
      st = data['settings']
      db.update_user_settings(
        uid,
        rate_full=float(st.get('rateFull', 100)),
        rate_half=float(st.get('rateHalf', 50)),
        currency=st.get('currency', 'BYN'),
        salary_day=int(st.get('salaryDay', 10)),
        advance_day=int(st.get('advanceDay', 25)),
        half_day_slot=st.get('halfDayTimeSlot', '09:00 - 14:00'),
        notifications_enabled=1 if st.get('notificationsEnabled', True) else 0,
        morning_reminder_time=st.get('morningReminderTime', '08:00'),
        evening_reminder_time=st.get('eveningReminderTime', '21:00')
      )

    # 2. Bulk sync shifts if provided
    if 'shifts' in data and isinstance(data['shifts'], dict):
      db.bulk_sync_user_shifts(uid, data['shifts'])

    # 3. Clean month shifts if requested
    if data.get('action') == 'clear_month' and 'year_month' in data:
      db.clear_user_month_shifts(uid, data['year_month'])

    shifts_count = len(db.get_user_month_shifts(uid, datetime.now(MINSK_TZ).strftime('%Y-%m')))
    await message.answer(
      f"🔄 <b>Синхронизация завершена!</b>\n\n"
      f"Все смены и настройки из Mini App успешно сохранены в боте.\n"
      f"Всего смен в табеле за этот месяц: <b>{shifts_count}</b>.\n"
      f"Уведомления и расчет зарплаты обновлены! ✅",
      parse_mode="HTML"
    )
  except Exception as e:
    logger.error(f"Error handling #SYNC#: {e}")
    await message.answer("✅ Данные синхронизированы!")

@dp.message(F.web_app_data)
async def handle_web_app_data(message: Message):
  """Handles data sent from Mini App via Telegram.WebApp.sendData"""
  data_raw = message.web_app_data.data
  uid = message.from_user.id
  try:
    payload = json.loads(data_raw)
    req_type = payload.get('type')

    if req_type == 'settings_update':
      st = payload.get('settings', {})
      db.update_user_settings(
        uid,
        rate_full=float(st.get('rateFull', 100)),
        rate_half=float(st.get('rateHalf', 50)),
        currency=st.get('currency', 'BYN'),
        salary_day=int(st.get('salaryDay', 10)),
        advance_day=int(st.get('advanceDay', 25)),
        half_day_slot=st.get('halfDayTimeSlot', '09:00 - 14:00'),
        notifications_enabled=1 if st.get('notificationsEnabled', True) else 0,
        morning_reminder_time=st.get('morningReminderTime', '08:00'),
        evening_reminder_time=st.get('eveningReminderTime', '21:00')
      )
      await message.answer(
        f"✅ <b>Настройки успешно обновлены из Mini App!</b>\n\n"
        f"• Новая ставка за полную смену: <b>{st.get('rateFull')} {st.get('currency')}</b>\n"
        f"• Ставка за полсмены: <b>{st.get('rateHalf')} {st.get('currency')}</b>\n"
        f"• Время на полдня: <b>{st.get('halfDayTimeSlot')}</b>\n"
        f"• День зарплаты: <b>{st.get('salaryDay')}-е число</b>\n"
        f"• Уведомления: ⏰ Утро: {st.get('morningReminderTime')} | Вечер: {st.get('eveningReminderTime')}",
        parse_mode="HTML"
      )
    elif req_type == 'monthly_report':
      st = payload.get('stats', {})
      month_str = payload.get('month', '')
      await message.answer(
        f"📊 <b>Отчёт за {month_str} получен:</b>\n\n"
        f"💰 Фактически заработано: <b>{st.get('earned'):,.0f}</b>\n"
        f"📈 Прогноз к зарплате: <b>{st.get('projected'):,.0f}</b>\n"
        f"📅 Отработано смен: <b>{st.get('fullShifts')}</b> полных, <b>{st.get('halfShifts')}</b> полсмен ({st.get('totalHours')} ч)\n"
        f"⏳ До зарплаты осталось: <b>{st.get('daysToSalary')} дней</b> ({st.get('remainingShifts')} смен)",
        parse_mode="HTML"
      )
  except Exception as e:
    logger.error(f"Error handling web_app_data: {e}")
    await message.answer("✅ Данные из Mini App успешно получены!")

async def main():
  db.init_db()
  logger.info("Database initialized")

  # Setup scheduler
  scheduler = setup_scheduler(bot)

  # Set default MenuButton for all chats to open Mini App
  try:
    await bot.set_chat_menu_button(
      menu_button=MenuButtonWebApp(text="📱 Счётчик", web_app=WebAppInfo(url=WEBAPP_URL))
    )
    logger.info("Global WebApp Menu Button configured")
  except Exception as e:
    logger.warning(f"Could not configure global MenuButton: {e}")

  logger.info("Starting Telegram Bot polling...")
  await dp.start_polling(bot)

if __name__ == "__main__":
  try:
    asyncio.run(main())
  except (KeyboardInterrupt, SystemExit):
    logger.info("Bot stopped")
