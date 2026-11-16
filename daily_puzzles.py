"""Versioned Daily puzzles and atomic attempts, independent of the HTTP host.

The HTTP adapter supplies a server-resolved principal. For now that principal is
an anonymous browser token; a future authenticated host can supply user:<id>.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
import secrets
import sqlite3
import threading
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from time import monotonic, time
from account_database import connect_database
from historical_visibility import hidden_history

CHOICES = ("Up", "Down", "Sideways", "Breakout", "Reversal", "Volatility spike")
DAILY_SYMBOLS = ("SPY", "QQQ", "BTC-USD", "GC=F", "TLT", "RIVN", "^GSPC")
MAX_ATTEMPTS = 100_000
MAX_GUEST_ATTEMPTS_PER_PEER_DAY = 30


def utc_today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


class DailyError(Exception):
    def __init__(self, status: int, message: str, retry_after=None):
        super().__init__(message)
        self.status = status
        self.retry_after = retry_after


def parse_day(value: str) -> date:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise DailyError(400, "Use a valid puzzle date (YYYY-MM-DD).")
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise DailyError(400, "Use a valid puzzle date (YYYY-MM-DD).") from None


def classify_outcome(candles: list[dict], observed_end: int) -> str:
    """Freeze the existing six-choice classifier as daily-v1."""
    outcome = candles[observed_end:]
    start = outcome[0]["open"]
    move = (outcome[-1]["close"] - start) / max(start, 1)
    volatility = sum(bar["high"] - bar["low"] for bar in outcome) / len(outcome) / max(start, 1)
    if volatility > .055:
        return "Volatility spike"
    if move > .06:
        return "Breakout"
    if move > .02:
        return "Up"
    if move < -.035:
        return "Down"
    if abs(move) < .012:
        return "Sideways"
    return "Reversal"


def select_daily_symbol(day: str) -> str:
    """Shuffle each UTC week's markets reproducibly, using every market once."""
    published = parse_day(day)
    week = published - timedelta(days=published.weekday())
    # Hash ranks avoid global random state and stay stable across Python versions.
    shuffled = sorted(DAILY_SYMBOLS, key=lambda symbol: (
        hashlib.sha256(f"daily-selection-v2:{week.isoformat()}:{symbol}".encode()).digest(), symbol))
    return shuffled[published.weekday()]


def build_puzzle(day: str, fetch_candles) -> dict:
    """Fetch genuine completed historical bars once; never use preview data."""
    published = parse_day(day)
    symbol = select_daily_symbol(day)
    # Keep the whole scenario before its publication day, including its answer.
    end = published - timedelta(days=7)
    start = end - timedelta(days=550)
    ticker, asset, currency, exchange, source, source_note, bars = fetch_candles(
        symbol, "2y", "1d", start.isoformat(), end.isoformat())
    candles = []
    for bar in bars:
        if not all(isinstance(bar.get(key), (int, float)) and math.isfinite(bar[key])
                   for key in ("time", "open", "high", "low", "close")):
            continue
        if (min(bar[key] for key in ("open", "high", "low", "close")) <= 0
                or bar["high"] < max(bar["open"], bar["close"], bar["low"])
                or bar["low"] > min(bar["open"], bar["close"])
                or not start <= datetime.fromtimestamp(bar["time"], timezone.utc).date() <= end):
            continue
        candles.append({key: bar.get(key, 0) for key in ("time", "open", "high", "low", "close", "volume")})
    candles = sorted({bar["time"]: bar for bar in candles}.values(), key=lambda bar: bar["time"])
    if len(candles) < 90:
        raise DailyError(503, "Today's puzzle could not be prepared from verified market history. Please try again shortly.")
    # Persisted once by DailyStore.prepare. A public date must not be a seed
    # from which a caller can compute the hidden window without seeing it.
    offset = secrets.randbelow(len(candles) - 72 + 1)
    candles = candles[offset:offset + 72]
    observed_end = 46
    return {"id": f"daily-v1:{day}", "date": day, "version": 1,
            "ticker": ticker, "name": ticker, "asset": asset, "currency": currency,
            "exchange": exchange, "source": source, "sourceNote": source_note,
            "timeframe": "3M", "interval": "1d", "observedEnd": observed_end,
            "candles": candles, "answer": classify_outcome(candles, observed_end)}


class DailyStore:
    def __init__(self, path: Path, fetch_candles, first_date: str | None = None, result_store=None):
        self.path = Path(path)
        self.fetch_candles = fetch_candles
        self.initial_first_date = first_date
        self.result_store = result_store
        self.prepare_lock = threading.Lock()
        self.failed_until: dict[str, float] = {}
        self._schema_lock = threading.Lock()
        self._schema_ready = False

    @contextmanager
    def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        db = connect_database(self.path)
        db.row_factory = sqlite3.Row
        try:
            with self._schema_lock:
                if not self._schema_ready:
                    self.initialize(db)
                    db.commit()
                    self._schema_ready = True
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def initialize(self, db):
        db.executescript("""
                CREATE TABLE IF NOT EXISTS daily_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS daily_puzzles (date TEXT PRIMARY KEY, payload TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS daily_attempts (
                    principal TEXT NOT NULL, date TEXT NOT NULL, choice TEXT NOT NULL,
                    correct INTEGER NOT NULL, completed_at TEXT NOT NULL,
                    PRIMARY KEY (principal, date));
                CREATE TABLE IF NOT EXISTS daily_guest_admissions (
                    peer TEXT NOT NULL, day TEXT NOT NULL, attempts INTEGER NOT NULL,
                    PRIMARY KEY (peer, day));
            """)
        first = self.initial_first_date or utc_today()
        parse_day(first)
        db.execute("INSERT OR IGNORE INTO daily_settings VALUES ('first_date', ?)", (first,))
        import admin_controls
        admin_controls.schema(db)
        if self.result_store:
            self.result_store.schema(db)

    def first_date(self) -> str:
        with self.connect() as db:
            return db.execute("SELECT value FROM daily_settings WHERE key='first_date'").fetchone()[0]

    def validate_date(self, day: str, *, prepare_future=False):
        parse_day(day)
        last = (parse_day(utc_today()) + timedelta(days=7)).isoformat() if prepare_future else utc_today()
        if day < self.first_date() or day > last:
            raise DailyError(404, "This puzzle date is not available.")

    def prepare(self, day: str, *, prepare_future=False) -> dict:
        self.validate_date(day, prepare_future=prepare_future)
        with self.prepare_lock:
            with self.connect() as db:
                row = db.execute("SELECT payload FROM daily_puzzles WHERE date=?", (day,)).fetchone()
                if row:
                    return json.loads(row[0])
            if self.failed_until.get(day, 0) > monotonic():
                raise DailyError(503, "Daily puzzle preparation is temporarily unavailable. Please try again in a minute.")
            try:
                puzzle = build_puzzle(day, self.fetch_candles)
            except Exception:
                self.failed_until = {day: monotonic() + 60}
                raise DailyError(503, "Daily puzzle preparation is temporarily unavailable. Please try again in a minute.") from None
            with self.connect() as db:
                # Unique date also protects against simultaneous host processes.
                db.execute("INSERT OR IGNORE INTO daily_puzzles VALUES (?, ?)", (day, json.dumps(puzzle, allow_nan=False)))
                return json.loads(db.execute("SELECT payload FROM daily_puzzles WHERE date=?", (day,)).fetchone()[0])

    @staticmethod
    def attempt_record(row, puzzle: dict) -> dict | None:
        if row is None:
            return None
        return {"completed": True, "puzzleId": puzzle["id"], "date": row["date"],
                "ticker": puzzle["ticker"], "choice": row["choice"], "correct": bool(row["correct"]),
                "answer": puzzle["answer"], "completedAt": row["completed_at"]}

    def status(self, principal: str, month: str | None = None) -> dict:
        today = utc_today()
        month = month or today[:7]
        parse_day(f"{month}-01")
        if len(month) != 7:
            raise DailyError(400, "Use a valid calendar month (YYYY-MM).")
        with self.connect() as db:
            rows = db.execute("""SELECT a.*, p.payload FROM daily_attempts a
                JOIN daily_puzzles p ON a.date=p.date
                WHERE a.principal=? AND (substr(a.date,1,7)=? OR a.date=?)""", (principal, month, today)).fetchall()
        attempts = {row["date"]: self.attempt_record(row, json.loads(row["payload"])) for row in rows}
        reset_at = datetime.combine(parse_day(today) + timedelta(days=1), datetime.min.time(), timezone.utc).timestamp()
        return {"today": today, "firstDate": self.first_date(), "timezone": "UTC",
                "secondsUntilReset": max(1, reset_at - datetime.now(timezone.utc).timestamp()),
                "archiveUnlocked": today in attempts, "attempts": attempts}

    def get(self, day: str, principal: str) -> dict:
        self.validate_date(day)
        status = self.status(principal)
        if day != status["today"] and not status["archiveUnlocked"]:
            raise DailyError(403, "Complete today's puzzle to unlock the archive.")
        puzzle = self.prepare(day)
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT * FROM daily_attempts WHERE principal=? AND date=?", (principal, day)).fetchone()
            if not row:
                from admin_controls import guard, accept
                assigned = self.result_store and db.execute("SELECT 1 FROM result_assignments WHERE owner=? AND puzzle_id=? AND mode='daily'", (principal, puzzle["id"])).fetchone()
                guard(db, principal, "daily", new=not bool(assigned), puzzle_id=puzzle["id"])
                if self.result_store:
                    self.result_store.save_puzzle(db, principal, puzzle["id"], {**puzzle, "version": "daily-v1"})
                    db.execute("INSERT OR IGNORE INTO result_assignments VALUES (?,?,'daily',?)", (principal, puzzle["id"], time()))
                    accept(db, principal, puzzle["id"], "daily")
        attempt = self.attempt_record(row, puzzle)
        if attempt:
            public = {key: value for key, value in puzzle.items() if key != "answer"}
            public["candleTimes"] = [bar["time"] for bar in puzzle["candles"]]
        else:
            public = hidden_history(puzzle, hide_instrument=True)
        public.update(attempt=attempt, today=status["today"], firstDate=status["firstDate"])
        return public

    def submit(self, day: str, principal: str, puzzle_id: str, choice: str, *, peer: str | None = None, visibility=None) -> dict:
        if choice not in CHOICES:
            raise DailyError(400, "Choose one of the six available predictions.")
        public = self.get(day, principal)
        if puzzle_id != public["id"]:
            raise DailyError(409, "The puzzle changed. Reload it before answering.")
        puzzle = self.prepare(day)
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            from account_guard import check as check_deleted_account
            check_deleted_account(db, principal)
            existing = db.execute("SELECT 1 FROM daily_attempts WHERE principal=? AND date=?", (principal, day)).fetchone()
            if not existing:
                from admin_controls import guard, visibility as save_visibility
                guard(db, principal, "daily", puzzle_id=puzzle_id)
                if self.result_store:
                    save_visibility(db, principal, puzzle_id, "daily", visibility)
            if not existing and principal.startswith("anon:"):
                if not peer:
                    raise DailyError(503, "Guest admission is unavailable. Please try again later.")
                today = utc_today()
                count = db.execute("SELECT attempts FROM daily_guest_admissions WHERE peer=? AND day=?",
                                   (peer, today)).fetchone()
                if count and count[0] >= MAX_GUEST_ATTEMPTS_PER_PEER_DAY:
                    raise DailyError(429, "Too many guest Daily attempts. Please try again tomorrow.")
            if (not existing and not principal.startswith("user:")
                    and db.execute("SELECT COUNT(*) FROM daily_attempts WHERE principal NOT LIKE 'user:%'").fetchone()[0] >= MAX_ATTEMPTS):
                raise DailyError(503, "Daily attempt storage is full. Please try again later.")
            cursor = db.execute("INSERT OR IGNORE INTO daily_attempts VALUES (?, ?, ?, ?, ?)",
                                (principal, day, choice, int(choice == puzzle["answer"]), datetime.now(timezone.utc).isoformat()))
            created = cursor.rowcount == 1
            result_id = None
            if self.result_store and principal.startswith("user:"):
                saved = db.execute("SELECT * FROM daily_attempts WHERE principal=? AND date=?", (principal, day)).fetchone()
                result_id, _ = self.result_store.daily_complete(db, principal, puzzle, saved["choice"], saved["completed_at"])
            if created and principal.startswith("anon:"):
                db.execute("INSERT INTO daily_guest_admissions VALUES (?, ?, 1) "
                           "ON CONFLICT(peer, day) DO UPDATE SET attempts=attempts+1", (peer, today))
                db.execute("DELETE FROM daily_guest_admissions WHERE day < ?",
                           ((parse_day(today) - timedelta(days=2)).isoformat(),))
        # Retries return the original result, never a second attempt.
        public = self.get(day, principal)
        response = {"created": created, "puzzle": public}
        if result_id:
            response["result"] = self.result_store.response(principal, result_id, created)
        return response
