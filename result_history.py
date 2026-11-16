"""Account-owned puzzle history. Only the HTTP adapter resolves authenticated IDs.

Uses the same persistent SQLite file as Daily so Daily attempts and their rewards
can commit together. No client-provided outcome, XP, or balance is authoritative.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
import secrets
import sqlite3
import threading
import uuid
from collections import OrderedDict
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta
from pathlib import Path
from time import time

from daily_puzzles import CHOICES, DailyError, classify_outcome
from reward_wallet import RewardWallet
from ranked_rules import betting_deadline, RANKED_VERSION, canonical_ranked_symbol, ranked_puzzle_ids
from account_database import connect_database
from result_storage import StorageBudget, snapshot_bytes, METADATA_BYTES
from historical_visibility import hidden_history
from account_guard import schema as deletion_schema, check as check_deleted_account


def encode(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def reward_window(chart):
    # Next chart draws different outcomes from one cached download. Pay once per
    # outcome endpoint, independent of its visible context, split, mode or labels.
    return "outcome-v2:" + hashlib.sha256(encode({
        "ticker": chart["ticker"], "end": chart["candles"][-1]["time"]
    }).encode()).hexdigest()


def seen_window(chart):
    return reward_window({**chart, "ticker": canonical_ranked_symbol(chart["ticker"])})


def private_review_sql(alias="a"):
    # Include older match metadata without rewriting or deleting saved records.
    return f"""({alias}.mode='versus' AND (
        lower(coalesce(json_extract({alias}.payload,'$.competitiveMode'),''))='private'
        OR lower(coalesce(json_extract({alias}.payload,'$.matchType'),''))='private'
        OR lower(coalesce(json_extract({alias}.payload,'$.opponent'),'')) LIKE 'private match %'))"""


def stamp():
    return datetime.now(timezone.utc).isoformat()


def require(condition, message="Invalid history request.", status=400, *, signal=None):
    if not condition:
        from misconduct import rejection
        raise rejection(status, message, signal)


def text(value, maximum=160):
    return str(value or "")[:maximum]


# These are the existing chart's aggregation rules, not display-density buckets.
AGGREGATES = {"3m": 3, "4h": 4}
BUCKETS = {"10m": 600, "45m": 2700, "2h": 7200, "3h": 10800}
MONTHS = {"3mo": 3, "6mo": 6, "12mo": 12}
TIMEFRAMES = set(("1m 2m 3m 5m 10m 15m 30m 45m 1h 2h 3h 4h 1d 1w 1mo "
                  "3mo 6mo 12mo 1D 5D 1W 2W 1M 3M 6M YTD 1Y 5Y All").split())
MODES = {"free", "speed", "packs", "versus"}
HIDDEN_CHALLENGE_TTL = 3600


def aggregate(bars, timeframe):
    size = AGGREGATES.get(timeframe)
    groups = {}
    sessions = {}
    for index, bar in enumerate(bars):
        date = datetime.fromtimestamp(bar["time"], timezone.utc)
        day = date.date().isoformat()
        sessions.setdefault(day, bar["time"])
        if size:
            if index // size * size + size > len(bars):
                break
            key = index // size
        elif timeframe in MONTHS:
            months = MONTHS[timeframe]
            key = date.year * 12 + (date.month - 1) // months * months
        elif timeframe in BUCKETS:
            key = (day, int((bar["time"] - sessions[day]) // BUCKETS[timeframe]))
        else:
            key = index
        if key not in groups:
            groups[key] = dict(bar)
        else:
            group = groups[key]
            group.update(high=max(group["high"], bar["high"]), low=min(group["low"], bar["low"]),
                         close=bar["close"], volume=group.get("volume", 0) + bar.get("volume", 0))
    return list(groups.values())


class ResultStore:
    def __init__(self, path: Path):
        self.path = Path(path)
        self._schema_lock = threading.Lock()
        self._schema_ready = False
        self._guest_lock = threading.Lock()
        self._guest_challenges = OrderedDict()
        self._guest_candles = 0
        self._guest_admissions = {}
        self._guest_day = ""

    @staticmethod
    def schema(db):
        deletion_schema(db)
        import admin_controls
        admin_controls.schema(db)
        # execute(), rather than executescript(), preserves an enclosing Daily transaction.
        statements = [
            "CREATE TABLE IF NOT EXISTS result_charts (id TEXT PRIMARY KEY, payload TEXT NOT NULL)",
            """CREATE TABLE IF NOT EXISTS result_puzzles (
                id TEXT PRIMARY KEY, chart_id TEXT, payload TEXT NOT NULL)""",
            """CREATE TABLE IF NOT EXISTS result_assignments (
                owner TEXT NOT NULL, puzzle_id TEXT NOT NULL, mode TEXT NOT NULL, issued_at REAL NOT NULL,
                PRIMARY KEY(owner,puzzle_id,mode))""",
            """CREATE TABLE IF NOT EXISTS result_attempts (
                id TEXT PRIMARY KEY, owner TEXT NOT NULL, puzzle_id TEXT, mode TEXT NOT NULL,
                choice TEXT NOT NULL, answer TEXT, correct INTEGER, status TEXT NOT NULL,
                trust TEXT NOT NULL, at TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '{}',
                UNIQUE(owner,puzzle_id,mode))""",
            """CREATE TABLE IF NOT EXISTS result_review (
                owner TEXT NOT NULL, record_id TEXT NOT NULL, payload TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY(owner,record_id))""",
            """CREATE TABLE IF NOT EXISTS result_review_attempts (
                owner TEXT NOT NULL, retry_id TEXT NOT NULL, record_id TEXT NOT NULL,
                choice TEXT NOT NULL, correct INTEGER NOT NULL, at TEXT NOT NULL, xp REAL NOT NULL,
                PRIMARY KEY(owner,retry_id))""",
            """CREATE TABLE IF NOT EXISTS result_rewards (
                owner TEXT NOT NULL, source TEXT NOT NULL, kind TEXT NOT NULL,
                xp REAL NOT NULL, coins INTEGER NOT NULL, at TEXT NOT NULL,
                PRIMARY KEY(owner,source,kind))""",
            """CREATE TABLE IF NOT EXISTS result_matches (
                id TEXT PRIMARY KEY, status TEXT NOT NULL, at TEXT NOT NULL, trust TEXT NOT NULL)""",
            """CREATE TABLE IF NOT EXISTS result_match_players (
                match_id TEXT NOT NULL, owner TEXT NOT NULL, label TEXT NOT NULL,
                PRIMARY KEY(match_id,owner))""",
            """CREATE TABLE IF NOT EXISTS result_match_rounds (
                match_id TEXT NOT NULL, owner TEXT NOT NULL, round INTEGER NOT NULL, attempt_id TEXT NOT NULL UNIQUE,
                PRIMARY KEY(match_id,owner,round))""",
            """CREATE TABLE IF NOT EXISTS result_match_assignments (
                match_id TEXT NOT NULL, owner TEXT NOT NULL, round INTEGER NOT NULL, puzzle_id TEXT NOT NULL,
                PRIMARY KEY(match_id,owner,round), UNIQUE(owner,puzzle_id))""",
            """CREATE TABLE IF NOT EXISTS result_legacy (
                owner TEXT PRIMARY KEY, payload TEXT NOT NULL)""",
            """CREATE TABLE IF NOT EXISTS result_seen_charts (
                owner TEXT NOT NULL, window TEXT NOT NULL, PRIMARY KEY(owner,window))""",
            "CREATE INDEX IF NOT EXISTS result_history_order ON result_attempts(owner,at DESC,id DESC)",
            "CREATE INDEX IF NOT EXISTS result_history_mode ON result_attempts(owner,mode,at DESC,id DESC)",
            "CREATE INDEX IF NOT EXISTS result_rewards_owner ON result_rewards(owner,at)",
            "CREATE INDEX IF NOT EXISTS result_assignment_age ON result_assignments(issued_at,puzzle_id)",
            "CREATE INDEX IF NOT EXISTS result_assignment_puzzle ON result_assignments(puzzle_id,issued_at)",
            "CREATE INDEX IF NOT EXISTS result_attempt_puzzle ON result_attempts(puzzle_id)",
        ]
        for sql in statements:
            db.execute(sql)
        RewardWallet.schema(db)
        from guest_progress import GuestProgress
        GuestProgress.schema(db)
        migrated = db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='result_earning_windows'").fetchone()
        db.execute("CREATE TABLE IF NOT EXISTS result_earning_windows (owner TEXT NOT NULL, window TEXT NOT NULL, PRIMARY KEY(owner,window))")
        if not migrated:
            for row in db.execute("""SELECT a.owner,p.payload FROM result_attempts a JOIN result_puzzles p ON p.id=a.puzzle_id
                    JOIN result_rewards r ON r.owner=a.owner AND r.source=a.id
                    WHERE a.trust='server' AND a.status='completed' AND p.chart_id IS NOT NULL
                    AND r.kind='prediction' AND r.xp>0""").fetchall():
                db.execute("INSERT OR IGNORE INTO result_earning_windows VALUES (?,?)", (row[0], reward_window(json.loads(row[1]))))
        StorageBudget.schema(db)

    @contextmanager
    def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        db = connect_database(self.path)
        db.row_factory = sqlite3.Row
        try:
            # Initialization is committed before publishing readiness. Retrying a
            # failed initialization still runs every existing migration/check.
            with self._schema_lock:
                if not self._schema_ready:
                    db.execute("BEGIN IMMEDIATE")
                    self.schema(db)
                    db.commit()
                    self._schema_ready = True
            db.execute("BEGIN IMMEDIATE")
            check_deleted_account(db)
            from guest_progress import GuestProgress
            from account_guard import REQUEST_OWNER
            GuestProgress.check(db, REQUEST_OWNER.get())
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def chart(self, payload, owner=None):
        """Called only with the market adapter's own response, never request JSON."""
        saved = {key: payload.get(key) for key in ("ticker", "name", "asset", "currency", "source", "sourceNote", "interval", "candles")}
        bars = saved["candles"]
        self.validate_candles(bars)
        chart_id = hashlib.sha256(encode(saved).encode()).hexdigest()
        with self.connect() as db:
            budget = StorageBudget(db, "snapshot")
            size = snapshot_bytes("chart:" + chart_id, encode(saved))
            budget.reserve("chart:" + chart_id, "", size)
            if owner:
                budget.reserve("chart:" + chart_id, owner, size)
            db.execute("INSERT OR IGNORE INTO result_charts VALUES (?,?)", (chart_id, encode(saved)))
        return chart_id

    @staticmethod
    def save_puzzle(db, owner, puzzle_id, payload, chart_id=None):
        existing = db.execute("SELECT payload FROM result_puzzles WHERE id=?", (puzzle_id,)).fetchone()
        saved = existing[0] if existing else encode(payload)
        budget = StorageBudget(db, "guest_snapshot" if owner.startswith("guest:") else "snapshot")
        size = snapshot_bytes("puzzle:" + puzzle_id, saved)
        budget.reserve("puzzle:" + puzzle_id, "", size)
        budget.reserve("puzzle:" + puzzle_id, owner, size)
        db.execute("INSERT OR IGNORE INTO result_puzzles VALUES (?,?,?)", (puzzle_id, chart_id, saved))

    def expire_hidden(self):
        # Commit retirement independently, so a later admission failure cannot
        # restore expired snapshots. Never retire any accepted prediction.
        with self.connect() as db:
            from guest_progress import GuestProgress
            GuestProgress.prune(db)
            rows = db.execute("""SELECT p.id FROM result_assignments a JOIN result_puzzles p ON p.id=a.puzzle_id
                WHERE a.issued_at<? AND p.id LIKE 'hidden-v1:%'
                AND NOT EXISTS (SELECT 1 FROM result_attempts x WHERE x.puzzle_id=p.id)
                AND NOT EXISTS (SELECT 1 FROM result_assignments fresh WHERE fresh.puzzle_id=p.id AND fresh.issued_at>=?)
                GROUP BY p.id ORDER BY min(a.issued_at) LIMIT 256""", (time() - HIDDEN_CHALLENGE_TTL,) * 2).fetchall()
            for row in rows:
                puzzle = json.loads(db.execute("SELECT payload FROM result_puzzles WHERE id=?", (row[0],)).fetchone()[0])
                for assignment in db.execute("SELECT owner FROM result_assignments WHERE puzzle_id=?", (row[0],)).fetchall():
                    self.remember_seen(db, assignment[0], puzzle)
                db.execute("DELETE FROM result_assignments WHERE puzzle_id=?", (row[0],))
                db.execute("DELETE FROM result_puzzles WHERE id=?", (row[0],))
                db.execute("DELETE FROM result_storage_objects WHERE kind IN ('snapshot','guest_snapshot') AND object_id=?", ("puzzle:" + row[0],))

    @staticmethod
    def seen_windows(db, owner):
        seen = {row[0] for row in db.execute("SELECT window FROM result_seen_charts WHERE owner=?", (owner,))}
        # Include assignments made before seen tracking existed, including skips.
        for row in db.execute("""SELECT p.payload FROM result_assignments a JOIN result_puzzles p ON p.id=a.puzzle_id
                WHERE a.owner=? AND a.mode IN ('free','speed','packs','versus')
                AND coalesce(json_extract(p.payload,'$.seenTracked'),0)=0""", (owner,)):
            puzzle = json.loads(row[0])
            if puzzle.get("candles"):
                seen.add(seen_window(puzzle))
        return seen

    @staticmethod
    def remember_seen(db, owner, puzzle):
        window = seen_window(puzzle)
        kind = "guest_seen" if owner.startswith(("anon:", "guest:")) else "seen"
        StorageBudget(db, kind).reserve("seen:" + window, owner, 256)
        db.execute("INSERT OR IGNORE INTO result_seen_charts VALUES (?,?)", (owner, window))

    @staticmethod
    def validate_candles(bars):
        require(isinstance(bars, list) and 2 <= len(bars) <= 50000, "Chart cannot be saved.")
        for bar in bars:
            require(isinstance(bar, dict) and all(type(bar.get(key)) in (int, float) and math.isfinite(bar[key])
                        for key in ("time", "open", "high", "low", "close")), "Invalid chart prices.")

    def issue(self, owner, request):
        require(request.get("mode") in MODES and request.get("timeframe") in TIMEFRAMES)
        with self.connect() as db:
            from admin_controls import guard
            guard(db, owner, request["mode"], new=True)
            if request["mode"] == "versus":
                require(type(request.get("round")) is int and 1 <= request["round"] <= 5)
                match = db.execute("""SELECT m.id FROM result_matches m JOIN result_match_players p ON p.match_id=m.id
                    WHERE m.id=? AND p.owner=? AND m.status='active' AND m.trust='server'""", (request.get("matchId"), owner)).fetchone()
                require(match, "A server-matched opponent is required.", 403, signal="managed_match_bypass")
                if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='competitive_sessions'").fetchone():
                    require(not db.execute("SELECT 1 FROM competitive_sessions WHERE id=?", (request.get("matchId"),)).fetchone(),
                            "Live match rounds are assigned by the match server.", 403, signal="managed_match_bypass")
            row = db.execute("SELECT payload FROM result_charts WHERE id=?", (request.get("chartId"),)).fetchone()
            require(row, "Load a server chart before answering.", 409)
            chart = json.loads(row[0])
            bars = aggregate(chart["candles"], request["timeframe"]) if request["mode"] != "packs" else chart["candles"]
            times = [bar["time"] for bar in bars]
            first, last = request.get("firstTime"), request.get("lastTime")
            require(first in times and last in times, "Chart window does not match its saved data.", 409)
            bars = bars[times.index(first):times.index(last) + 1]
            observed = request.get("observedEnd")
            require(type(observed) is int and 1 <= observed < len(bars), "Choose a chart with a hidden outcome.")
            payload = {**{key: value for key, value in chart.items() if key != "candles"},
                       "candles": bars, "observedEnd": observed, "timeframe": request["timeframe"],
                       "version": "historical-v1", "answer": classify_outcome(bars, observed)}
            payload["earningWindow"] = reward_window(payload)
            # Identity is independent of mode and provider metadata; switching modes
            # or refetching an unchanged chart cannot mint additional rewards.
            identity = {key: payload[key] for key in ("ticker", "candles", "observedEnd", "version")}
            puzzle_id = "history:" + hashlib.sha256(encode(identity).encode()).hexdigest()
            self.save_puzzle(db, owner, puzzle_id, payload, request["chartId"])
            db.execute("INSERT OR IGNORE INTO result_assignments VALUES (?,?,?,?)", (owner, puzzle_id, request["mode"], time()))
            from admin_controls import accept
            accept(db, owner, puzzle_id, request["mode"])
            if request["mode"] == "versus":
                shared = db.execute("SELECT puzzle_id FROM result_match_assignments WHERE match_id=? AND round=? LIMIT 1",
                                    (request["matchId"], request["round"])).fetchone()
                require(not shared or shared[0] == puzzle_id, "Both players must use the same round puzzle.", 409)
                previous_attempt = db.execute("SELECT mode FROM result_attempts WHERE owner=? AND puzzle_id=?", (owner, puzzle_id)).fetchone()
                require(not previous_attempt or previous_attempt[0] == "versus", "Use a puzzle that has not already been answered outside this match.", 409)
                previous_match = db.execute("SELECT match_id FROM result_match_assignments WHERE owner=? AND puzzle_id=?", (owner, puzzle_id)).fetchone()
                require(not previous_match or previous_match[0] == request["matchId"], "Use a new puzzle for this match.", 409)
                prior = db.execute("SELECT puzzle_id FROM result_match_assignments WHERE match_id=? AND owner=? AND round=?",
                                   (request["matchId"], owner, request["round"])).fetchone()
                require(not prior or prior[0] == puzzle_id, "This match round is already assigned.", 409)
                db.execute("INSERT OR IGNORE INTO result_match_assignments VALUES (?,?,?,?)", (request["matchId"], owner, request["round"], puzzle_id))
        return {"puzzleId": puzzle_id}

    def issue_live(self, owner, payload, interval, history):
        saved = {**payload, "ticker": canonical_ranked_symbol(payload["ticker"]),
                 "timeframe": interval, "liveInterval": interval, "liveHistory": history,
                 "observedEnd": len(payload["candles"]), "version": RANKED_VERSION}
        if payload.get("verifiedLive") is not True or payload["serverTime"] >= betting_deadline(saved):
            return None
        puzzle_id = f"{RANKED_VERSION}:{saved['ticker']}:{interval}:{payload['targetStart']}"
        with self.connect() as db:
            if time() >= betting_deadline(saved):
                return None
            from admin_controls import guard, accept
            prior_assignment = db.execute("SELECT 1 FROM result_assignments WHERE owner=? AND puzzle_id=? AND mode='ranked'", (owner, puzzle_id)).fetchone()
            guard(db, owner, "ranked", new=not bool(prior_assignment), puzzle_id=puzzle_id)
            self.save_puzzle(db, owner, puzzle_id, saved)
            db.execute("INSERT OR IGNORE INTO result_assignments VALUES (?,?,?,?)", (owner, puzzle_id, "ranked", time()))
            accept(db, owner, puzzle_id, "ranked")
        return puzzle_id

    def issue_hidden(self, owner, payload, mode, timeframe, *, admission=None):
        """Only the market adapter supplies prices; the server selects the window."""
        require(mode in {"free", "speed", "packs"} and timeframe in TIMEFRAMES)
        self.validate_candles(payload["candles"])
        bars = aggregate(payload["candles"], timeframe) if mode != "packs" else payload["candles"]
        require(len(bars) >= 3, "Not enough market history to select a prediction window. Choose another timeframe.", 409)
        sizes = {"1m": 180, "2m": 180, "3m": 160, "5m": 150, "10m": 150, "15m": 140,
                 "30m": 140, "45m": 140, "1h": 160, "2h": 160, "3h": 160, "4h": 160,
                 "1d": 180, "1w": 156, "1mo": 120, "3mo": 80, "6mo": 60, "12mo": 48,
                 "1D": 78, "5D": 130, "1W": 195, "2W": 390, "1M": 48, "3M": 72,
                 "6M": 118, "YTD": 180, "1Y": 180, "5Y": 240, "All": 240}
        # Even short provider histories need multiple possible windows. A known
        # complete source series must never be the assigned prediction window.
        count = min(sizes[timeframe], max(2, len(bars) * 4 // 5))
        available = bars
        start = secrets.randbelow(len(bars) - count + 1)
        bars = bars[start:start + count]
        if timeframe == "All" and count >= 20:
            # Also vary All's hidden boundary within the server-selected
            # subwindow, preserving the multiple-window safeguard.
            first_split = max(1, int(count * .45))
            last_split = min(count - 1, int(count * .8))
            observed = first_split + secrets.randbelow(last_split - first_split + 1)
        else:
            observed = min(count - 1, max(1, int(count * .64)))
        puzzle_id = "hidden-v1:" + secrets.token_hex(24)
        saved = {**{key: value for key, value in payload.items() if key not in {"candles", "chartId"}},
                 "candles": bars, "observedEnd": observed, "timeframe": timeframe,
                 "version": "historical-hidden-v1", "answer": classify_outcome(bars, observed),
                 "seenTracked": True, "windowPolicy": 1}
        saved["earningWindow"] = reward_window(saved)
        issued_at = time()
        if owner.startswith("anon:"):
            require(admission, "Guest practice admission is unavailable.", 503)
            with self.connect() as db:
                from admin_controls import guard
                guard(db, owner, mode, new=True)
            # Guest candle snapshots stay transient. Only bounded chart hashes
            # persist, under a separate allowance from signed-in account data.
            with self._guest_lock:
                day = datetime.now(timezone.utc).date().isoformat()
                if self._guest_day != day:
                    self._guest_admissions.clear()
                    self._guest_day = day
                used = self._guest_admissions.get(admission, 0)
                require(used < 100, "Guest practice limit reached for today. Sign in to continue.", 429)
                require(admission in self._guest_admissions or len(self._guest_admissions) < 4096,
                        "Guest practice is busy. Please retry later.", 503)
                with self.connect() as db:
                    self.select_unseen(saved, available, count, start, observed, self.seen_windows(db, owner))
                    self.remember_seen(db, owner, saved)
                self._guest_admissions[admission] = used + 1
                while self._guest_challenges and (len(self._guest_challenges) >= 256 or self._guest_candles + count > 100000):
                    _, old = self._guest_challenges.popitem(last=False)
                    self._guest_candles -= len(old["puzzle"]["candles"])
                self._guest_challenges[puzzle_id] = dict(owner=owner, mode=mode, puzzle=saved, issued=issued_at, choice=None)
                self._guest_candles += count
        else:
            self.expire_hidden()
            with self.connect() as db:
                from admin_controls import guard, accept
                guard(db, owner, mode, new=True)
                if owner.startswith("guest:"):
                    from guest_progress import GuestProgress
                    GuestProgress.admit(db, owner)
                self.select_unseen(saved, available, count, start, observed, self.seen_windows(db, owner))
                self.save_puzzle(db, owner, puzzle_id, saved)
                db.execute("INSERT INTO result_assignments VALUES (?,?,?,?)", (owner, puzzle_id, mode, issued_at))
                accept(db, owner, puzzle_id, mode)
                self.remember_seen(db, owner, saved)
        return {**hidden_history(saved, keep_dates=mode == "packs"), "puzzleId": puzzle_id,
                "issuedAt": issued_at, "serverTime": time()}

    @staticmethod
    def select_unseen(saved, available, count, start, observed, seen):
        for offset in range(len(available) - count + 1):
            candidate = (start + offset) % (len(available) - count + 1)
            bars = available[candidate:candidate + count]
            if seen_window({"ticker": saved["ticker"], "candles": [bars[-1]]}) not in seen:
                saved.update(candles=bars, answer=classify_outcome(bars, observed))
                saved["earningWindow"] = reward_window(saved)
                return
        raise DailyError(409, "You have seen every available chart for this instrument and timeframe. Choose another instrument or timeframe.")

    def assigned_hidden(self, owner, request):
        require(set(request) <= {"puzzleId", "mode"}, "Reload this chart to use its server-assigned puzzle.", 409)
        require(request.get("mode") in {"free", "speed", "packs"})
        with self.connect() as db:
            row = db.execute("""SELECT p.payload,a.issued_at FROM result_puzzles p JOIN result_assignments a ON a.puzzle_id=p.id
                WHERE a.owner=? AND a.mode=? AND p.id=?""", (owner, request["mode"], request.get("puzzleId"))).fetchone()
            require(row and json.loads(row[0]).get("version") == "historical-hidden-v1",
                    "Reload this chart to use its server-assigned puzzle.", 403)
            completed = db.execute("SELECT 1 FROM result_attempts WHERE owner=? AND puzzle_id=?", (owner, request.get("puzzleId"))).fetchone()
            require(completed or json.loads(row[0]).get("windowPolicy") == 1,
                    "Reload this chart to select a new prediction window.", 409)
            require(completed or time() - row["issued_at"] <= HIDDEN_CHALLENGE_TTL,
                    "This practice chart expired. Reload the chart.", 409)
        return {"puzzleId": request["puzzleId"], "issuedAt": row["issued_at"], "serverTime": time()}

    def submit_guest(self, owner, puzzle_id, mode, choice):
        require(mode in {"free", "speed", "packs"})
        with self._guest_lock:
            row = self._guest_challenges.get(puzzle_id)
            require(row and row["owner"] == owner and row["mode"] == mode,
                    "This practice chart expired or belongs to another browser. Reload the chart.", 403)
            require(time() - row["issued"] <= 3600, "This practice chart expired. Reload the chart.", 409)
            created = row["choice"] is None
            if created:
                with self.connect() as db:
                    from admin_controls import guard_transient
                    guard_transient(db, owner, mode, row["issued"])
                if mode == "speed":
                    ticker = row["puzzle"]["ticker"]
                    limit = 8 if "-USD" in ticker else 10 if ticker.endswith(("=F", "=X")) else 12 if ticker.startswith("^") else 15
                    if time() - row["issued"] >= limit:
                        choice = "Timed out"
                row["choice"] = choice
            puzzle = row["puzzle"]
            return {"created": created, "record": {"choice": row["choice"], "answer": puzzle["answer"], "rewardEligible": False},
                    "reward": dict(xp=0, coins=0),
                    "reveal": {"puzzleId": puzzle_id, "observedEnd": puzzle["observedEnd"], "candles": puzzle["candles"]}}

    @staticmethod
    def reward(db, owner, source, kind, xp, coins):
        db.execute("INSERT OR IGNORE INTO result_rewards VALUES (?,?,?,?,?,?)", (owner, source, kind, xp, coins, stamp()))

    def _complete(self, db, owner, puzzle_id, mode, choice, puzzle, *, at=None, attempt_id=None):
        existing = db.execute("SELECT id FROM result_attempts WHERE owner=? AND puzzle_id=?", (owner, puzzle_id)).fetchone()
        if existing:
            return existing[0], False
        from admin_controls import guard, amounts
        guard(db, owner, mode, puzzle_id=puzzle_id)
        extra = {}
        # Recompute for puzzles issued before outcome-based reward identities.
        earning_window = reward_window(puzzle) if puzzle.get("version") == "historical-v1" else puzzle.get("earningWindow")
        eligible = not earning_window or not db.execute("SELECT 1 FROM result_earning_windows WHERE owner=? AND window=?", (owner, earning_window)).fetchone()
        if eligible and earning_window and puzzle.get("version") == "historical-v1":
            # Existing accounts can have paid outcomes stored under the old
            # whole-download key. Preserve those payments without rewriting data.
            paid = db.execute("""SELECT p.payload FROM result_attempts a JOIN result_puzzles p ON p.id=a.puzzle_id
                JOIN result_rewards r ON r.owner=a.owner AND r.source=a.id
                WHERE a.owner=? AND a.trust='server' AND a.status='completed'
                AND p.chart_id IS NOT NULL AND r.kind='prediction' AND r.xp>0""", (owner,)).fetchall()
            eligible = not any(reward_window(json.loads(row[0])) == earning_window for row in paid)
        eligible = eligible and owner.startswith(("user:", "guest:"))
        extra["rewardEligible"] = bool(eligible)
        if earning_window and eligible:
            db.execute("INSERT INTO result_earning_windows VALUES (?,?)", (owner, earning_window))
        if mode == "speed":
            ticker = puzzle["ticker"]
            limit = 8 if "-USD" in ticker else 10 if ticker.endswith(("=F", "=X")) else 12 if ticker.startswith("^") else 15
            issued = db.execute("SELECT issued_at FROM result_assignments WHERE owner=? AND puzzle_id=? AND mode='speed'", (owner, puzzle_id)).fetchone()
            elapsed = max(0, time() - issued[0])
            if elapsed >= limit:
                choice = "Timed out"
            seconds = min(limit, int(elapsed))
            extra.update(speedLimit=limit, speedSeconds=seconds, speedPoints=0)
        answer = puzzle["answer"]
        correct = choice == answer
        if mode == "speed" and correct:
            extra["speedPoints"] = math.floor(500 + 500 * (limit - seconds) / limit + .5)
        attempt_id = attempt_id or str(uuid.uuid4())
        at = at or stamp()
        streak = self._streak(db, owner)
        policy = amounts(db, owner, puzzle_id, mode)
        xp = policy["timeoutXp"] if choice == "Timed out" else policy["correctXp"] + streak * policy["streakXp"] if correct else policy["incorrectXp"]
        coins = {"free": policy["freeCoins"], "daily": policy["dailyCoins"], "ranked": policy["rankedCoins"]}.get(mode, 0) if correct else 0
        if not eligible:
            xp, coins = 0, 0
        db.execute("INSERT INTO result_attempts VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                   (attempt_id, owner, puzzle_id, mode, choice, answer, int(correct), "completed", "server", at, encode(extra)))
        self.reward(db, owner, attempt_id, "prediction", xp, coins)
        if mode == "versus":
            assignment = db.execute("SELECT match_id,round FROM result_match_assignments WHERE owner=? AND puzzle_id=?", (owner, puzzle_id)).fetchone()
            require(assignment, "Match round assignment not found.", 403)
            db.execute("INSERT OR IGNORE INTO result_match_rounds VALUES (?,?,?,?)", (assignment[0], owner, assignment[1], attempt_id))
        if eligible:
            from misconduct import observe_gameplay
            observe_gameplay(db, owner, mode)
        return attempt_id, True

    def create_match(self, players):
        """Server matchmaking adapter only. There is deliberately no public create endpoint."""
        require(isinstance(players, dict) and len(players) == 2 and all(key.startswith("user:") for key in players))
        match_id = str(uuid.uuid4())
        with self.connect() as db:
            from admin_controls import guard
            for player in players:
                guard(db, player, "versus", new=True)
            db.execute("INSERT INTO result_matches VALUES (?,'active',?,'server')", (match_id, stamp()))
            for owner, label in players.items():
                db.execute("INSERT INTO result_match_players VALUES (?,?,?)", (match_id, owner, text(label, 80)))
        return match_id

    def finish_match(self, owner, match_id):
        with self.connect() as db:
            if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='competitive_sessions'").fetchone():
                managed = db.execute("SELECT status FROM competitive_sessions WHERE id=?", (match_id,)).fetchone()
                if managed:
                    require(db.execute("SELECT 1 FROM result_match_players WHERE match_id=? AND owner=?", (match_id, owner)).fetchone(),
                            "Match not found.", 404)
                    require(managed[0] == "completed", "The live match server finalizes this match.", 409)
                    record_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{match_id}:{owner}"))
                    return self._response(db, owner, record_id, False)
            players = db.execute("SELECT owner,label FROM result_match_players WHERE match_id=?", (match_id,)).fetchall()
            require(len(players) == 2 and owner in {p["owner"] for p in players}, "Match not found.", 404)
            scores = {}
            for player in players:
                score = db.execute("""SELECT count(*),sum(a.correct) FROM result_match_rounds r JOIN result_attempts a ON a.id=r.attempt_id
                    WHERE r.match_id=? AND r.owner=? AND a.owner=r.owner AND a.trust='server' AND a.status='completed'""", (match_id, player["owner"])).fetchone()
                require(score[0] == 5, "Both players must finish all five rounds.", 409)
                scores[player["owner"]] = score[1]
            for player in players:
                other = next(p for p in players if p["owner"] != player["owner"])
                mine, theirs = scores[player["owner"]], scores[other["owner"]]
                record_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{match_id}:{player['owner']}"))
                payload = {"matchGroup": True, "matchId": match_id, "opponent": other["label"], "score": f"{mine}-{theirs}",
                           "winner": "Draw" if mine == theirs else "You win" if mine > theirs else "Opponent wins"}
                db.execute("INSERT OR IGNORE INTO result_attempts VALUES (?,?,NULL,'versus','',NULL,NULL,'completed','server',?,?)",
                           (record_id, player["owner"], stamp(), encode(payload)))
                if player["owner"] == owner:
                    mine_id = record_id
            db.execute("UPDATE result_matches SET status='completed' WHERE id=?", (match_id,))
            return self._response(db, owner, mine_id, False)

    def submit(self, owner, request, *, require_hidden=False):
        mode, puzzle_id, choice = request.get("mode"), request.get("puzzleId"), request.get("choice")
        require(mode in MODES | {"ranked"} and (choice in CHOICES or choice == "Timed out" and mode == "speed"))
        if owner.startswith("anon:"):
            return self.submit_guest(owner, puzzle_id, mode, choice)
        with self.connect() as db:
            from admin_controls import guard, visibility
            guard(db, owner, mode, puzzle_id=puzzle_id)
            prior = db.execute("SELECT id FROM result_attempts WHERE owner=? AND puzzle_id=?", (owner, puzzle_id)).fetchone()
            if prior:
                return self._response(db, owner, prior[0], False)
            if require_hidden and mode in MODES:
                saved_puzzle = db.execute("SELECT payload FROM result_puzzles WHERE id=?", (puzzle_id,)).fetchone()
                require(saved_puzzle, "Reload this chart to use its server-assigned puzzle.", 403,
                        signal="unassigned_puzzle")
                saved_version = json.loads(saved_puzzle[0]).get("version")
                require(saved_version == "historical-hidden-v1",
                        "Reload this chart to use its server-assigned puzzle.", 403,
                        signal="managed_match_bypass" if saved_version == "competitive-v1" else None)
            assignment = db.execute("SELECT issued_at FROM result_assignments WHERE owner=? AND puzzle_id=? AND mode=?", (owner, puzzle_id, mode)).fetchone()
            require(assignment, "This puzzle was not assigned to your account.", 403, signal="unassigned_puzzle")
            visibility(db, owner, puzzle_id, mode, request.get("visibility"))
            puzzle = json.loads(db.execute("SELECT payload FROM result_puzzles WHERE id=?", (puzzle_id,)).fetchone()[0])
            if puzzle.get("version") == "historical-hidden-v1":
                require(puzzle.get("windowPolicy") == 1,
                        "Reload this chart to select a new prediction window.", 409)
                require(time() - assignment[0] <= HIDDEN_CHALLENGE_TTL,
                        "This practice chart expired. Reload the chart.", 409)
            require(puzzle.get("version") != "competitive-v1", "Submit this prediction through the live match.", 403, signal="managed_match_bypass")
            if mode == "ranked":
                require(choice in CHOICES[:3])
                aliases = ranked_puzzle_ids(puzzle)
                placeholders = ",".join("?" for _ in aliases)
                prior = db.execute(f"""SELECT id FROM result_attempts WHERE owner=? AND mode='ranked'
                    AND puzzle_id IN ({placeholders}) ORDER BY at,id LIMIT 1""", (owner, *aliases)).fetchone()
                if prior:
                    return self._response(db, owner, prior[0], False)
                require(time() < betting_deadline(puzzle), "Betting closed five seconds before this candle started. Load a new Ranked puzzle.", 409)
                entry = db.execute("SELECT * FROM wallet_ranked WHERE owner=? AND puzzle_id=? AND status='open'", (owner, puzzle_id)).fetchone()
                require(entry, "Pay the 100-coin entry fee before making a Ranked prediction.", 403)
                # A concurrent tab may have edited the staged stake. Freeze the
                # confirmed stake and direction in this same writer transaction.
                stake = request.get("stake", entry["stake"])
                require(type(stake) is int and stake == entry["stake"], "Your stake changed. Review it before predicting.", 409)
                db.execute("UPDATE wallet_ranked SET choice=? WHERE owner=? AND puzzle_id=?", (choice, owner, puzzle_id))
                attempt_id = str(uuid.uuid4())
                submitted = stamp()
                db.execute("INSERT INTO result_attempts VALUES (?,?,?,?,?,NULL,NULL,?,?,?,?)",
                           (attempt_id, owner, puzzle_id, mode, choice, "pending", "server", submitted, encode({"submittedAt": submitted})))
                return self._response(db, owner, attempt_id, True)
            attempt_id, created = self._complete(db, owner, puzzle_id, mode, choice, puzzle)
            return self._response(db, owner, attempt_id, created)

    def live_pending(self, owner, attempt_id):
        with self.connect() as db:
            row = db.execute("SELECT * FROM result_attempts WHERE owner=? AND id=? AND mode='ranked'", (owner, attempt_id)).fetchone()
            require(row, "Live attempt not found.", 404)
            puzzle = json.loads(db.execute("SELECT payload FROM result_puzzles WHERE id=?", (row["puzzle_id"],)).fetchone()[0])
            return dict(row), puzzle

    def pending_live(self, limit=100):
        # Future candles must not consume settlement slots. Interleave owners so
        # one account's delayed feed cannot fill every retry batch; within each
        # owner's queue, the earliest settlement expiry is always first.
        with self.connect() as db:
            return [dict(row) for row in db.execute("""WITH due AS (
                SELECT a.owner,a.id,a.at,p.payload,
                    CAST(json_extract(p.payload,'$.targetEnd') AS REAL) AS target_end
                FROM result_attempts a JOIN result_puzzles p ON p.id=a.puzzle_id
                WHERE a.status='pending' AND a.mode='ranked'
                    AND CAST(json_extract(p.payload,'$.targetEnd') AS REAL)<=?
            ), scheduled AS (
                SELECT owner,id,at,payload,target_end,
                    row_number() OVER (PARTITION BY owner ORDER BY target_end,at,id) AS owner_position
                FROM due
            ) SELECT owner,id,payload FROM scheduled
                ORDER BY owner_position,target_end,at,id LIMIT ?""", (time(), limit))]

    def void_live(self, owner, attempt_id):
        with self.connect() as db:
            db.execute("UPDATE result_attempts SET status='void' WHERE owner=? AND id=? AND status='pending'", (owner, attempt_id))
            row = db.execute("SELECT puzzle_id FROM result_attempts WHERE owner=? AND id=? AND status='void'", (owner, attempt_id)).fetchone()
            if row:
                RewardWallet.settle(db, owner, row[0])
            return self._response(db, owner, attempt_id, False)

    def settle_live(self, owner, attempt_id, data):
        # data comes directly from the market adapter, never the browser.
        with self.connect() as db:
            row = db.execute("SELECT * FROM result_attempts WHERE owner=? AND id=? AND mode='ranked'", (owner, attempt_id)).fetchone()
            require(row, "Live attempt not found.", 404)
            if row["status"] != "pending":
                return self._response(db, owner, attempt_id, False)
            from admin_controls import blocked, amounts
            if blocked(db, owner, "ranked"):
                db.execute("UPDATE result_attempts SET status='void' WHERE id=?", (attempt_id,))
                RewardWallet.settle(db, owner, row["puzzle_id"])
                return self._response(db, owner, attempt_id, False)
            puzzle = json.loads(db.execute("SELECT payload FROM result_puzzles WHERE id=?", (row["puzzle_id"],)).fetchone()[0])
            require(time() >= puzzle["targetEnd"], "The Live candle has not closed.", 409)
            outcome = next((bar for bar in data.get("candles", []) if bar["time"] == puzzle["targetStart"]), None)
            require(data.get("verifiedLive") is True and outcome and data["serverTime"] >= puzzle["targetEnd"],
                    "The completed Live candle is not available yet.", 409)
            # Existing committed v1 rounds retain their original scoring contract.
            prior = outcome["open"] if puzzle.get("version") == RANKED_VERSION else puzzle["candles"][puzzle["observedEnd"] - 1]["close"]
            move = (outcome["close"] - prior) / prior
            tolerance = .0001 + 2.220446049250313e-16 * 8
            answer = "Up" if move > tolerance else "Down" if move < -tolerance else "Sideways"
            correct = row["choice"] == answer
            aliases = ranked_puzzle_ids(puzzle)
            placeholders = ",".join("?" for _ in aliases)
            paid = db.execute(f"""SELECT 1 FROM result_attempts a JOIN result_rewards r
                ON r.owner=a.owner AND r.source=a.id AND r.kind='prediction' AND r.xp>0
                WHERE a.owner=? AND a.mode='ranked' AND a.puzzle_id IN ({placeholders}) LIMIT 1""",
                (owner, *aliases)).fetchone()
            # Previously accepted alias bets still settle, but cannot mint a
            # second progression reward for the same underlying candle.
            extra = json.loads(row["payload"])
            extra["rewardEligible"] = not bool(paid)
            policy = amounts(db, owner, row["puzzle_id"], "ranked")
            xp = (policy["correctXp"] + self._streak(db, owner) * policy["streakXp"] if correct else policy["incorrectXp"]) if not paid else 0
            puzzle.update(answer=answer, candles=[*puzzle["candles"][:puzzle["observedEnd"]], outcome])
            # Freeze the completed snapshot once, shared by all participants.
            saved = encode(puzzle)
            allocation = db.execute("""SELECT payload_bytes FROM result_storage_objects
                WHERE kind='snapshot' AND object_id=? AND owner=''""", ("puzzle:" + row["puzzle_id"],)).fetchone()
            require(allocation and len(saved.encode("utf-8")) + METADATA_BYTES <= allocation[0],
                    "The Live candle exceeded its reserved storage. Please retry verified data.", 503)
            db.execute("UPDATE result_puzzles SET payload=? WHERE id=?", (saved, row["puzzle_id"]))
            db.execute("UPDATE result_attempts SET answer=?,correct=?,status='completed',at=?,payload=? WHERE id=?",
                       (answer, int(correct), stamp(), encode(extra), attempt_id))
            self.reward(db, owner, attempt_id, "prediction", xp, policy["rankedCoins"] if correct and not paid else 0)
            RewardWallet.settle(db, owner, row["puzzle_id"], correct)
            if not paid:
                from misconduct import observe_gameplay
                observe_gameplay(db, owner, "ranked")
            return self._response(db, owner, attempt_id, True)

    def daily_complete(self, db, owner, puzzle, choice, completed_at):
        """Runs inside DailyStore.submit's transaction, including replay recovery."""
        self.schema(db)
        payload = {**puzzle, "version": "daily-v1"}
        self.save_puzzle(db, owner, puzzle["id"], payload)
        return self._complete(db, owner, puzzle["id"], "daily", choice, payload, at=completed_at)

    @staticmethod
    def _streak(db, owner):
        streak = 0
        for row in db.execute("""SELECT a.correct FROM result_attempts a JOIN result_rewards r ON r.owner=a.owner AND r.source=a.id
                AND r.kind='prediction' AND r.xp>0 WHERE a.owner=? AND a.status='completed' AND a.trust='server'
                AND a.correct IS NOT NULL ORDER BY a.at DESC,a.rowid DESC""", (owner,)):
            if row[0] != 1:
                break
            streak += 1
        return streak

    def _summary(self, db, owner, offset=0):
        rewards = db.execute("SELECT coalesce(sum(xp),0),coalesce(sum(coins),0) FROM result_rewards WHERE owner=?", (owner,)).fetchone()
        counts = db.execute("SELECT count(*),coalesce(sum(correct),0) FROM result_attempts WHERE owner=? AND trust='server' AND status='completed' AND correct IS NOT NULL", (owner,)).fetchone()
        # Old imports remain available as history, never as account progression.
        legacy = {}
        # Summary queries include all history, independently of the loaded page.
        where = "owner=? AND trust='server' AND status='completed' AND correct IS NOT NULL AND coalesce(json_extract(payload,'$.matchGroup'),0)=0"
        def grouped(column):
            return {row[0]: {"total": row[1], "correct": row[2] or 0} for row in db.execute(
                f"SELECT {column},count(*),sum(correct) FROM result_attempts WHERE {where} GROUP BY {column}", (owner,))}
        modifier = f"{-offset:+d} minutes"
        days = {row[0]: {"total": row[1], "correct": row[2] or 0} for row in db.execute(
            f"SELECT date(at,?),count(*),sum(correct) FROM result_attempts WHERE {where} AND at>=? GROUP BY 1",
            (modifier, owner, (datetime.now(timezone.utc) - timedelta(days=366)).isoformat()))}
        root_where, _ = self._history_filter(owner, "")
        history_total = db.execute(f"SELECT count(*) FROM result_attempts a WHERE {root_where}", (owner,)).fetchone()[0]
        favorite_count = db.execute(f"""SELECT count(*) FROM result_attempts a WHERE {root_where} AND EXISTS
            (SELECT 1 FROM result_review r WHERE r.owner=a.owner AND r.record_id=a.id AND json_extract(r.payload,'$.favorite')=1)""", (owner,)).fetchone()[0]
        wallet = RewardWallet.read(db, owner)
        free_days = {row[0]: min(15, row[1]) for row in db.execute(
            """SELECT date(at,?),count(*) FROM result_attempts WHERE owner=? AND mode='free'
                AND trust='server' AND status='completed' AND choice IS NOT NULL AND correct IS NOT NULL
                GROUP BY 1""", (modifier, owner))}
        return {"xp": rewards[0], "coins": wallet["balance"], "wallet": wallet, "total": counts[0], "correct": counts[1],
                "freePlayDays": free_days,
                "streak": self._streak(db, owner), "legacy": legacy,
                "byMode": grouped("mode"), "byPattern": grouped("answer"), "byDay": days,
                "historyTotal": history_total, "favoriteCount": favorite_count}

    def summary(self, owner, offset=0):
        require(type(offset) is int and -840 <= offset <= 840)
        with self.connect() as db:
            return self._summary(db, owner, offset)

    def wallet_action(self, owner, request):
        with self.connect() as db:
            amount = RewardWallet.act(db, owner, request)
            return {"amount": amount, "summary": self._summary(db, owner)}

    def _record(self, db, row, full=False):
        record = json.loads(row["payload"])
        puzzle_row = db.execute("SELECT payload FROM result_puzzles WHERE id=?", (row["puzzle_id"],)).fetchone()
        puzzle = json.loads(puzzle_row[0]) if puzzle_row else {}
        record.update({key: puzzle[key] for key in ("ticker", "name", "asset", "timeframe", "source", "liveInterval", "liveHistory") if key in puzzle})
        record.update(id=row["id"], type="single", mode=row["mode"], choice=row["choice"], answer=row["answer"],
                      correct=None if row["correct"] is None else bool(row["correct"]), at=row["at"],
                      backend=True, trust=row["trust"], status=row["status"], puzzleId=row["puzzle_id"])
        if row["mode"] == "daily":
            record["dailyDate"] = puzzle.get("date", "")
        bars = puzzle.get("candles", [])
        if bars and row["status"] == "completed":
            observed = puzzle["observedEnd"]
            start, end = (0, len(bars)) if full else (max(0, observed - 28), min(len(bars), observed + 16))
            record.update(chartPreview=[[bar["time"] * 1000, bar["open"], bar["high"], bar["low"], bar["close"]] for bar in bars[start:end]],
                          chartObservedEnd=observed - start,
                          windowStart=datetime.fromtimestamp(bars[0]["time"], timezone.utc).isoformat(),
                          windowEnd=datetime.fromtimestamp(bars[-1]["time"], timezone.utc).isoformat())
        review = db.execute("SELECT payload,version FROM result_review WHERE owner=? AND record_id=?", (row["owner"], row["id"])).fetchone()
        if review:
            record.update(json.loads(review[0]), reviewVersion=review[1])
        # Report the original trade's recorded rewards, never infer them from
        # correctness or today's reward rules. Legacy imports have no ledger.
        record["rewardSummary"] = None
        if row["trust"] == "server" and row["status"] == "completed":
            reward = db.execute("SELECT xp,coins FROM result_rewards WHERE owner=? AND source=? AND kind='prediction'",
                                (row["owner"], row["id"])).fetchone()
            if reward:
                stake, bet_profit = 0, 0
                if row["mode"] == "ranked":
                    entry = db.execute("SELECT id,stake,cycle FROM wallet_ranked WHERE owner=? AND puzzle_id=?",
                                       (row["owner"], row["puzzle_id"])).fetchone()
                    if entry:
                        stake = entry["stake"]
                        payout = db.execute("SELECT coins FROM result_rewards WHERE owner=? AND source=? AND kind='payout'",
                                            (row["owner"], f"wallet:ranked:{entry['id']}:{entry['cycle']}")).fetchone()
                        bet_profit = max(0, payout[0] - stake) if payout else 0
                record["rewardSummary"] = dict(coinsBet=stake, coinsEarned=reward["coins"] + bet_profit, xpEarned=reward["xp"])
        if record.get("matchGroup"):
            record["type"] = "versus-match"
            rounds = db.execute("""SELECT a.*,mr.round FROM result_match_rounds mr JOIN result_attempts a ON a.id=mr.attempt_id
                WHERE mr.owner=? AND mr.match_id=? AND a.choice NOT IN ('Timed out','Skipped','Skip')
                ORDER BY mr.round""", (row["owner"], record.get("matchId", row["id"]))).fetchall()
            record["rounds"] = [{**self._record(db, r), "round": r["round"]} for r in rounds]
        return record

    def _response(self, db, owner, attempt_id, created):
        row = db.execute("SELECT * FROM result_attempts WHERE id=? AND owner=?", (attempt_id, owner)).fetchone()
        require(row, "Result not found.", 404)
        rewards = db.execute("SELECT coalesce(sum(xp),0) xp,coalesce(sum(coins),0) coins FROM result_rewards WHERE owner=? AND source=?", (owner, attempt_id)).fetchone()
        response = {"created": created, "record": self._record(db, row), "reward": dict(rewards), "summary": self._summary(db, owner)}
        puzzle_row = db.execute("SELECT payload FROM result_puzzles WHERE id=?", (row["puzzle_id"],)).fetchone()
        puzzle = json.loads(puzzle_row[0]) if puzzle_row else {}
        if row["status"] == "completed" and puzzle.get("version") == "historical-hidden-v1":
            response["reveal"] = {"puzzleId": row["puzzle_id"], "observedEnd": puzzle["observedEnd"], "candles": puzzle["candles"]}
        return response

    def detail(self, owner, attempt_id):
        with self.connect() as db:
            row = db.execute("SELECT * FROM result_attempts WHERE owner=? AND id=?", (owner, attempt_id)).fetchone()
            require(row, "Result not found.", 404)
            require(not self._private_review_result(db, row), "Private matches are not saved to Review.", 404)
            return self._record(db, row, full=True)

    @staticmethod
    def _private_review_result(db, row):
        if row["mode"] != "versus":
            return False
        linked = db.execute("SELECT match_id FROM result_match_rounds WHERE owner=? AND attempt_id=?",
                            (row["owner"], row["id"])).fetchone()
        match_id = linked[0] if linked else json.loads(row["payload"]).get("matchId")
        if db.execute(f"""SELECT 1 FROM result_attempts a WHERE a.owner=?
            AND (a.id=? OR a.id=? OR json_extract(a.payload,'$.matchId')=?) AND {private_review_sql()}""",
                      (row["owner"], row["id"], match_id, match_id)).fetchone():
            return True
        if match_id and db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='competitive_sessions'").fetchone():
            return bool(db.execute("SELECT 1 FROM competitive_sessions WHERE id=? AND kind='Private'", (match_id,)).fetchone())
        return False

    def response(self, owner, attempt_id, created=False):
        with self.connect() as db:
            return self._response(db, owner, attempt_id, created)

    def _history_filter(self, owner, mode, favorite=False, competitive=""):
        require(isinstance(mode, str))
        modes = mode.split(",") if mode else []
        require(all(value in MODES | {"ranked", "daily", "none"} for value in modes))
        require(isinstance(competitive, str))
        submodes = competitive.split(",") if competitive else []
        require(all(value in {"ranked", "private", "public", "tournament"} for value in submodes))
        args = [owner]
        where = "a.owner=? AND a.status='completed' AND NOT EXISTS (SELECT 1 FROM result_match_rounds mr WHERE mr.attempt_id=a.id)"
        where += " AND a.choice NOT IN ('Timed out','Skipped','Skip')"
        where += f" AND NOT {private_review_sql()}"
        if modes:
            where += " AND a.mode IN (" + ",".join("?" for _ in modes) + ")"
            args.extend(modes)
        if favorite:
            where += " AND EXISTS (SELECT 1 FROM result_review r WHERE r.owner=a.owner AND r.record_id=a.id AND json_extract(r.payload,'$.favorite')=1)"
        if submodes:
            # Match the browser's legacy Private-match fallback as well as new metadata.
            where += """ AND (a.mode<>'versus' OR lower(coalesce(nullif(json_extract(a.payload,'$.competitiveMode'),''),
                CASE WHEN json_extract(a.payload,'$.matchType')='private'
                    OR lower(json_extract(a.payload,'$.opponent')) LIKE 'private match %' THEN 'private' ELSE '' END)) IN (""" + ",".join("?" for _ in submodes) + "))"
            args.extend(submodes)
        return where, args

    def history(self, owner, *, cursor="", limit=50, mode="", favorite=False, competitive="", include_summary=True):
        require(type(limit) is int and 1 <= limit <= 100)
        where, args = self._history_filter(owner, mode, favorite, competitive)
        if cursor:
            try:
                at, record_id = json.loads(cursor)
                require(isinstance(at, str) and isinstance(record_id, str))
            except (ValueError, TypeError):
                raise DailyError(400, "Invalid history cursor.") from None
            where += " AND (a.at,a.id)<(?,?)"
            args.extend([at, record_id])
        with self.connect() as db:
            # Imported matches have a parent row for pagination and linked rounds.
            rows = db.execute(f"SELECT a.* FROM result_attempts a WHERE {where} ORDER BY a.at DESC,a.id DESC LIMIT ?", [*args, limit + 1]).fetchall()
            records = []
            for row in rows[:limit]:
                record = self._record(db, row)
                records.append(record)
            next_cursor = encode([rows[limit - 1]["at"], rows[limit - 1]["id"]]) if len(rows) > limit else None
            page = {"records": records, "nextCursor": next_cursor}
            if include_summary:
                page["summary"] = self._summary(db, owner)
            return page

    def shuffle(self, owner, *, mode="", competitive="", exclude="", round_number=""):
        where, args = self._history_filter(owner, mode, competitive=competitive)
        require(isinstance(exclude, str) and len(exclude) <= 160)
        require(isinstance(round_number, str) and (not round_number or round_number in {"1", "2", "3", "4", "5"}))
        # Join only lightweight candidate IDs. Fetch chart/Review data for the selected
        # record, rather than loading the entire account history into either process.
        source = """result_attempts a LEFT JOIN result_match_rounds mr ON mr.owner=a.owner
            AND mr.match_id=coalesce(json_extract(a.payload,'$.matchId'),a.id)
            AND EXISTS (SELECT 1 FROM result_attempts answered WHERE answered.id=mr.attempt_id
                AND answered.choice NOT IN ('Timed out','Skipped','Skip'))"""
        where += " AND (coalesce(json_extract(a.payload,'$.matchGroup'),0)=0 OR mr.round IS NOT NULL)"
        with self.connect() as db:
            eligible_where = where + " AND NOT (a.id=? AND coalesce(mr.round,0)=?)"
            eligible_args = [*args, exclude, int(round_number or 0)]
            count = db.execute(f"SELECT count(*) FROM {source} WHERE {eligible_where}", eligible_args).fetchone()[0]
            if not count:
                eligible_where, eligible_args = where, args
                count = db.execute(f"SELECT count(*) FROM {source} WHERE {where}", args).fetchone()[0]
            if not count:
                return {"record": None, "round": ""}
            selected = db.execute(f"SELECT a.id,mr.round FROM {source} WHERE {eligible_where} ORDER BY a.at DESC,a.id DESC,mr.round LIMIT 1 OFFSET ?",
                                  [*eligible_args, secrets.randbelow(count)]).fetchone()
            if not selected:
                return {"record": None, "round": ""}
            row = db.execute("SELECT * FROM result_attempts WHERE owner=? AND id=?", (owner, selected["id"])).fetchone()
            return {"record": self._record(db, row), "round": str(selected["round"] or "")}

    def review(self, owner, request):
        record_id, action = request.get("id"), request.get("action")
        require(action in {"hint", "checked", "favorite", "retry"})
        with self.connect() as db:
            if action == "retry":
                from admin_controls import guard
                guard(db, owner, "review", new=True)
            row = db.execute("SELECT * FROM result_attempts WHERE owner=? AND id=? AND status='completed'", (owner, record_id)).fetchone()
            require(row, "Result not found.", 404)
            require(not self._private_review_result(db, row), "Private matches are not saved to Review.", 404)
            prior = db.execute("SELECT payload,version FROM result_review WHERE owner=? AND record_id=?", (owner, record_id)).fetchone()
            state, version = (json.loads(prior[0]), prior[1]) if prior else ({}, 0)
            # Reward-consuming actions always merge on the server; metadata uses
            # an optimistic version so a stale tab cannot overwrite newer choices.
            if action in {"checked", "favorite"}:
                require(type(request.get("value")) is bool)
                require(request.get("version", version) == version, "Review changed on another device. Refresh and try again.", 409)
            gained = 0
            if action == "favorite":
                state["favorite"] = request["value"]
            elif action == "hint":
                if not row["correct"]:
                    state["reviewXpBlocked"] = True
            elif action == "checked":
                state.update(reviewChecked=request["value"], reviewedCorrect=False)
                if not row["correct"]:
                    state["reviewXpBlocked"] = True
            else:
                require(request.get("choice") in CHOICES)
                # Review is practice, not another stored prediction. A wrong
                # answer returns feedback without changing persistent state.
                correct = request["choice"] == row["answer"]
                if not correct or row["correct"] or state.get("reviewedCorrect"):
                    response = self._response(db, owner, record_id, False)
                    response["reviewXp"] = 0
                    return response
                elapsed = time() - datetime.fromisoformat(row["at"].replace("Z", "+00:00")).timestamp()
                eligible = row["trust"] == "server" and json.loads(row["payload"]).get("rewardEligible", True) and elapsed >= 10800 and not any(state.get(k) for k in (
                    "reviewXpBlocked", "reviewXpAwarded", "reviewChecked"))
                if eligible:
                    from admin_controls import amounts
                    policy = amounts(db, owner, row["puzzle_id"], row["mode"])
                    gained = (policy["correctXp"] + self._streak(db, owner) * policy["streakXp"]) / 2
                    self.reward(db, owner, record_id, "review", gained, 0)
                    state["reviewXpAwarded"] = gained
                state.update(reviewedCorrect=True, reviewChecked=True)
            db.execute("INSERT OR REPLACE INTO result_review VALUES (?,?,?,?)", (owner, record_id, encode(state), version + 1))
            response = self._response(db, owner, record_id, False)
            response["reviewXp"] = gained
            return response

    def import_legacy(self, owner, request):
        """Retired input boundary: browser-authored results cannot become account history."""
        from misconduct import rejection
        raise rejection(410, "Browser history imports are no longer accepted. New results must come from server-issued gameplay.", "retired_history_import")
