"""The intentionally passwordless, shared usercode account."""
from datetime import datetime, timezone
from contextlib import closing
from pathlib import Path
import secrets
import sqlite3
from account_database import require_database_connection


class AdminAccountStore:
    def __init__(self, path: Path):
        self.path = path

    def login(self) -> dict:
        require_database_connection()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.path, timeout=15)) as connection, connection:
            connection.execute("""CREATE TABLE IF NOT EXISTS shared_admin (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                created_at TEXT NOT NULL, daily_token TEXT NOT NULL)""")
            connection.execute(
                "INSERT OR IGNORE INTO shared_admin VALUES (1, ?, ?)",
                (datetime.now(timezone.utc).isoformat(), secrets.token_hex(32)),
            )
            created_at, daily_token = connection.execute(
                "SELECT created_at, daily_token FROM shared_admin WHERE id = 1"
            ).fetchone()
        return {
            "account": {
                "id": "shared-admin", "name": "Admin", "username": "usercode",
                "email": "usercode@admin.local", "role": "admin",
                "createdAt": created_at,
            },
            "dailyToken": daily_token,
        }
