import asyncio
import logging
import json
from datetime import datetime, timedelta

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
from scheduler import setup_scheduler

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
        InlineKeyboardButton(text="📊 Подробный расчет ЗП", callback_data="btn_status"),
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

  # Set the Telegram bottom-left menu button to open Mini App
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
    f"👇 Нажми кнопку ниже, чтобы открыть интерактивный календарь смен в Telegram:"
  )

  await message.answer(welcome_text, parse_mode="HTML", reply_markup=get_miniapp_inline())
  await message.answer("💡 Также ты можешь использовать быстрые кнопки меню внизу экрана:", reply_markup=get_main_keyboard())

@dp.message(F.text == "📊 Мой статус и ЗП")
@dp.message(Command("status"))
async def handle_status(message: Message):
  uid = message.from_user.id
  user = db.get_or_create_user(uid)
  now = datetime.now()
  ym = now.strftime('%Y-%m')
  month_name = now.strftime('%B %Y')

  shifts = db.get_user_month_shifts(uid, ym)
  total_earned = sum(s['earned'] for s in shifts)
  full_count = sum(1 for s in shifts if s['shift_type'] == 'full')
  half_count = sum(1 for s in shifts if s['shift_type'] == 'half')
  total_hours = sum(s['hours'] for s in shifts)

  salary_day = user['salary_day']
  today_day = now.day

  if today_day <= salary_day:
    days_to_salary = salary_day - today_day
  else:
    days_in_month = 30
    days_to_salary = (days_in_month - today_day) + salary_day

  # Remaining shifts
  remaining_shifts = sum(
    1 for s in shifts 
    if int(s['date'].split('-')[2]) >= today_day and s['shift_type'] in ('full', 'half')
  )

  text = (
    f"📊 <b>Сводка по работе ({now.strftime('%d.%m.%Y')}):</b>\n\n"
    f"💰 <b>Заработано в этом месяце:</b> <code>{total_earned:,.0f} {user['currency']}</code>\n"
    f"⏳ <b>До зарплаты ({salary_day}-е число):</b> осталось <b>{days_to_salary} дней</b> ({remaining_shifts} смен)\n\n"
    f"📋 <b>Отработано:</b>\n"
    f"• Полных смен: <b>{full_count}</b>\n"
    f"• Смен на полдня: <b>{half_count}</b> ({user['half_day_slot']})\n"
    f"• Всего часов: <b>{total_hours:.0f} ч</b>\n\n"
    f"👇 Чтобы детально посмотреть календарь и прогноз, открой Mini App:"
  )

  kb = InlineKeyboardMarkup(
    inline_keyboard=[
      [InlineKeyboardButton(text="📱 Открыть Mini App", web_app=WebAppInfo(url=WEBAPP_URL))]
    ]
  )

  await message.answer(text, parse_mode="HTML", reply_markup=kb)

@dp.message(F.text == "➕ Быстрая смена")
@dp.message(Command("shift"))
async def handle_quick_shift(message: Message):
  today_str = datetime.now().strftime('%Y-%m-%d')
  user = db.get_or_create_user(message.from_user.id)
  existing = db.get_shift_for_date(message.from_user.id, today_str)

  status_str = "не отмечена"
  if existing:
    if existing['shift_type'] == 'full':
      status_str = f"🟢 Полная смена (+{existing['earned']} {user['currency']})"
    elif existing['shift_type'] == 'half':
      status_str = f"🟡 Полдня (+{existing['earned']} {user['currency']})"

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
    f"📅 <b>Отметка смены на сегодня ({datetime.now().strftime('%d.%m.%Y')}):</b>\n"
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
  today_str = datetime.now().strftime('%Y-%m-%d')

  if action == "full":
    db.record_shift(uid, today_str, 'full', 12.0, user['rate_full'], 'Отмечено через бота')
    msg = f"✅ Отлично! Сегодня отмечена <b>полная смена</b> (+{user['rate_full']:.0f} {user['currency']})."
  elif action == "half":
    db.record_shift(uid, today_str, 'half', 6.0, user['rate_half'], 'Отмечено через бота (полдня)')
    msg = f"✅ Отлично! Сегодня отмечена <b>смена на полдня</b> ({user['half_day_slot']}, +{user['rate_half']:.0f} {user['currency']})."
  else:
    db.record_shift(uid, today_str, 'off', 0, 0, '')
    msg = f"⚪ Сегодня отмечен <b>выходной день</b>."

  await callback.answer("Смена сохранена!")
  await callback.message.edit_text(
    f"{msg}\n\nБаланс и табель зарплаты обновлены в твоём счётчике! 💰",
    parse_mode="HTML",
    reply_markup=InlineKeyboardMarkup(
      inline_keyboard=[[InlineKeyboardButton(text="📱 Открыть Счётчик (Mini App)", web_app=WebAppInfo(url=WEBAPP_URL))]]
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
  text = (
    f"⚙️ <b>Текущие настройки:</b>\n\n"
    f"• Полная смена: <b>{user['rate_full']:.0f} {user['currency']}</b>\n"
    f"• Полдня: <b>{user['rate_half']:.0f} {user['currency']}</b>\n"
    f"• Время выхода на полдня: <b>{user['half_day_slot']}</b>\n"
    f"• День зарплаты: <b>{user['salary_day']}-е число месяца</b>\n"
    f"• День аванса: <b>{user['advance_day']}-е число месяца</b>\n"
    f"• Уведомления: <b>{'Включены 🔔' if user['notifications_enabled'] else 'Выключены 🔕'}</b>\n\n"
    f"💡 Быстро изменить ставки, валюту и время выхода можно прямо в Mini App:"
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
  now = datetime.now()
  ym = now.strftime('%Y-%m')
  shifts = db.get_user_month_shifts(message.from_user.id, ym)
  total_earned = sum(s['earned'] for s in shifts)

  await message.answer(
    f"🔔 <b>Тестовое уведомление от Счётчика:</b>\n\n"
    f"Привет, {message.from_user.first_name}!\n"
    f"Сегодня твой счётчик зафиксировал: <b>{total_earned:,.0f} {user['currency']}</b>.\n"
    f"Следующая зарплата наступит {user['salary_day']}-го числа.\n\n"
    f"Уведомления настроены и работают штатно! ✅",
    parse_mode="HTML"
  )

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
        rate_full=st.get('rateFull', 100),
        rate_half=st.get('rateHalf', 50),
        currency=st.get('currency', 'BYN'),
        salary_day=st.get('salaryDay', 10),
        advance_day=st.get('advanceDay', 25),
        half_day_slot=st.get('halfDayTimeSlot', '09:00 - 14:00'),
        notifications_enabled=1 if st.get('notificationsEnabled', True) else 0
      )
      await message.answer(
        f"✅ <b>Настройки успешно обновлены из Mini App!</b>\n\n"
        f"• Новая ставка за полную смену: <b>{st.get('rateFull')} {st.get('currency')}</b>\n"
        f"• Ставка за полсмены: <b>{st.get('rateHalf')} {st.get('currency')}</b>\n"
        f"• Время на полдня: <b>{st.get('halfDayTimeSlot')}</b>\n"
        f"• День зарплаты: <b>{st.get('salaryDay')}-е число</b>",
        parse_mode="HTML"
      )
    elif req_type == 'monthly_report':
      st = payload.get('stats', {})
      month_str = payload.get('month', '')
      await message.answer(
        f"📊 <b>Отчёт за {month_str} сохранён:</b>\n\n"
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
