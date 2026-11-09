import sqlite3
import os
from datetime import datetime
from typing import Optional, Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(__file__), 'shifts.db')

def get_connection():
  conn = sqlite3.connect(DB_PATH)
  conn.row_factory = sqlite3.Row
  return conn

def init_db():
  with get_connection() as conn:
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        rate_full REAL DEFAULT 100.0,
        rate_half REAL DEFAULT 50.0,
        currency TEXT DEFAULT 'BYN',
        salary_day INTEGER DEFAULT 10,
        advance_day INTEGER DEFAULT 25,
        half_day_slot TEXT DEFAULT '09:00 - 14:00',
        notifications_enabled INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    """)

    # Shifts table
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        shift_type TEXT NOT NULL,
        hours REAL DEFAULT 12.0,
        earned REAL DEFAULT 100.0,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date),
        FOREIGN KEY(user_id) REFERENCES users(user_id)
      )
    """)

    conn.commit()

def get_or_create_user(user_id: int, username: str = '', first_name: str = '') -> Dict[str, Any]:
  with get_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    if row:
      return dict(row)
    
    cursor.execute("""
      INSERT INTO users (user_id, username, first_name)
      VALUES (?, ?, ?)
    """, (user_id, username, first_name))
    conn.commit()

    cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
    return dict(cursor.fetchone())

def update_user_settings(user_id: int, **kwargs):
  if not kwargs:
    return
  with get_connection() as conn:
    cursor = conn.cursor()
    fields = [f"{k} = ?" for k in kwargs.keys()]
    values = list(kwargs.values()) + [user_id]
    cursor.execute(f"UPDATE users SET {', '.join(fields)} WHERE user_id = ?", values)
    conn.commit()

def record_shift(user_id: int, date_str: str, shift_type: str, hours: float, earned: float, note: str = ''):
  with get_connection() as conn:
    cursor = conn.cursor()
    if shift_type == 'off':
      cursor.execute("DELETE FROM shifts WHERE user_id = ? AND date = ?", (user_id, date_str))
    else:
      cursor.execute("""
        INSERT INTO shifts (user_id, date, shift_type, hours, earned, note)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, date) DO UPDATE SET
          shift_type = excluded.shift_type,
          hours = excluded.hours,
          earned = excluded.earned,
          note = excluded.note
      """, (user_id, date_str, shift_type, hours, earned, note))
    conn.commit()

def get_user_month_shifts(user_id: int, year_month: str) -> List[Dict[str, Any]]:
  """year_month format: YYYY-MM"""
  with get_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("""
      SELECT * FROM shifts
      WHERE user_id = ? AND date LIKE ?
      ORDER BY date ASC
    """, (user_id, f"{year_month}%"))
    return [dict(r) for r in cursor.fetchall()]

def get_shift_for_date(user_id: int, date_str: str) -> Optional[Dict[str, Any]]:
  with get_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM shifts WHERE user_id = ? AND date = ?", (user_id, date_str))
    row = cursor.fetchone()
    return dict(row) if row else None

def get_all_active_users() -> List[Dict[str, Any]]:
  with get_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE notifications_enabled = 1")
    return [dict(r) for r in cursor.fetchall()]
