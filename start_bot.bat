@echo off
chcp 65001 > nul
echo ====================================================
echo  Запуск Telegram-бота: Счётчик смен и зарплаты
echo  Бот: @schetchik_raboti_bot
echo ====================================================
cd /d "%~dp0bot"
"C:\Users\user\AppData\Local\Python\bin\python.exe" main.py
pause
