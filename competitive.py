"""Real-player matches, owned by the existing authenticated Python host.

All durable state shares ResultStore's transactional database. No browser can
choose an opponent, round snapshot, deadline, score, or reward.
"""
from __future__ import annotations

import json
import secrets
import threading
import uuid
from datetime import datetime, timedelta, timezone
from time import time

from daily_puzzles import CHOICES, DailyError, classify_outcome
from result_history import encode, require, stamp, seen_window
from result_storage import StorageBudget, METADATA_BYTES
from historical_visibility import hidden_history
from ranked_rules import canonical_ranked_symbol


def build_rounds(fetch_candles):
    symbol = secrets.choice(("SPY", "QQQ", "AAPL", "MSFT", "BTC-USD"))
    end = datetime.now(timezone.utc).date() - timedelta(days=7)
    start = end - timedelta(days=730)
    ticker, asset, currency, exchange, source, note, bars = fetch_candles(
        symbol, "2y", "1d", start.isoformat(), end.isoformat())
    require(source and "preview" not in source.lower() and "fallback" not in source.lower(),
            "Verified market history is unavailable. Please retry.", 503)
    # Reuse the result store's price validation before selecting server windows.
    require(len(bars) >= 5 * 72, "Not enough verified market history for five separate rounds.", 503)
    # Sample spaced starts without rejection loops, then randomize round order.
    # Each full reveal must be disjoint from every other round's hidden prices.
    rng = secrets.SystemRandom()
    starts = sorted(rng.sample(range(len(bars) - 5 * 72 + 5), 5))
    windows = [offset + index * 71 for index, offset in enumerate(starts)]
    rng.shuffle(windows)
    return [dict(ticker=ticker, name=ticker, asset=asset, currency=currency, exchange=exchange,
                 source=source, sourceNote=note, timeframe="3M", interval="1d",
                 candles=bars[offset:offset + 72], observedEnd=46, version="competitive-v1",
                 answer=classify_outcome(bars[offset:offset + 72], 46)) for offset in windows]


class CompetitiveStore:
    def __init__(self, results, provider, *, clock=time):
        self.results, self.provider, self.clock = results, provider, clock
        self.prepare_lock = threading.Lock()

    @staticmethod
    def schema(db):
        for statement in (
            """CREATE TABLE IF NOT EXISTS competitive_sessions (
                id TEXT PRIMARY KEY, kind TEXT NOT NULL, code TEXT UNIQUE, status TEXT NOT NULL,
                round INTEGER NOT NULL DEFAULT 0, starts REAL NOT NULL DEFAULT 0,
                deadline REAL NOT NULL DEFAULT 0, next_at REAL NOT NULL DEFAULT 0,
                winner TEXT, reason TEXT NOT NULL DEFAULT '')""",
            """CREATE TABLE IF NOT EXISTS competitive_seats (
                owner TEXT PRIMARY KEY, session_id TEXT NOT NULL, name TEXT NOT NULL,
                ready INTEGER NOT NULL DEFAULT 0, touched REAL NOT NULL)""",
            "CREATE INDEX IF NOT EXISTS competitive_seats_session ON competitive_seats(session_id)",
            "CREATE INDEX IF NOT EXISTS competitive_sessions_status ON competitive_sessions(status)",
            """CREATE TABLE IF NOT EXISTS competitive_queue (
                owner TEXT PRIMARY KEY, name TEXT NOT NULL, joined REAL NOT NULL, touched REAL NOT NULL)""",
            "CREATE INDEX IF NOT EXISTS competitive_queue_order ON competitive_queue(joined,owner)",
            """CREATE TABLE IF NOT EXISTS competitive_rounds (
                session_id TEXT NOT NULL, round INTEGER NOT NULL, puzzle_id TEXT NOT NULL UNIQUE,
                payload TEXT NOT NULL, PRIMARY KEY(session_id,round))""",
            """CREATE TABLE IF NOT EXISTS competitive_answers (
                session_id TEXT NOT NULL, round INTEGER NOT NULL, owner TEXT NOT NULL,
                choice TEXT NOT NULL, at REAL NOT NULL, PRIMARY KEY(session_id,round,owner))""",
        ):
            db.execute(statement)

    def _session(self, db, owner):
        return db.execute("""SELECT s.* FROM competitive_sessions s JOIN competitive_seats p
            ON p.session_id=s.id WHERE p.owner=?""", (owner,)).fetchone()

    def _expire(self, db):
        now = self.clock()
        db.execute("DELETE FROM competitive_queue WHERE touched<?", (now - 45,))
        db.execute("""UPDATE competitive_sessions SET status='cancelled', reason='A player left the lobby.'
            WHERE status IN ('waiting','preparing') AND id IN
            (SELECT session_id FROM competitive_seats WHERE touched<?)""", (now - 120,))

    def _new_session(self, db, kind, players, code=None):
        session_id = str(uuid.uuid4())
        budget = StorageBudget(db, "activity")
        budget.reserve("session:" + session_id, "", METADATA_BYTES * 4)
        for owner, _ in players:
            budget.reserve("session:" + session_id, owner, METADATA_BYTES * 4)
        db.execute("INSERT INTO competitive_sessions(id,kind,code,status) VALUES (?,?,?,'waiting')",
                   (session_id, kind, code))
        for owner, name in players:
            db.execute("INSERT INTO competitive_seats VALUES (?,?,?,0,?)",
                       (owner, session_id, name[:80], self.clock()))
            db.execute("DELETE FROM competitive_queue WHERE owner=?", (owner,))
        return session_id

    def join(self, owner, name, kind="Public", code=""):
        require(kind in {"Public", "Private"})
        require(isinstance(code, str) and (not code or len(code) == 5 and code.isascii() and code.isalnum()),
                "Enter the full five-character room code.")
        with self.results.connect() as db:
            self.schema(db)
            from admin_controls import guard
            guard(db, owner, "versus", new=True)
            self._expire(db)
            prior = self._session(db, owner)
            if prior and prior["status"] in {"completed", "cancelled"}:
                db.execute("DELETE FROM competitive_seats WHERE owner=?", (owner,))
                prior = None
            if prior:
                return self._state(db, owner)
            if kind == "Private":
                if code:
                    session = db.execute("SELECT * FROM competitive_sessions WHERE code=? AND status='waiting'", (code.upper(),)).fetchone()
                    require(session, "That private lobby was not found or has already started.", 404)
                    players = db.execute("SELECT owner FROM competitive_seats WHERE session_id=?", (session["id"],)).fetchall()
                    require(len(players) == 1, "That lobby is full.", 409)
                    StorageBudget(db, "activity").reserve("session:" + session["id"], owner, METADATA_BYTES * 4)
                    db.execute("INSERT INTO competitive_seats VALUES (?,?,?,0,?)", (owner, session["id"], name[:80], self.clock()))
                    db.execute("DELETE FROM competitive_queue WHERE owner=?", (owner,))
                else:
                    room = None
                    for _ in range(10):
                        candidate = ''.join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(5))
                        if not db.execute("SELECT 1 FROM competitive_sessions WHERE code=?", (candidate,)).fetchone():
                            room = candidate
                            break
                    require(room, "A room code could not be created. Please retry.", 503)
                    self._new_session(db, kind, [(owner, name)], room)
            else:
                opponent = db.execute("SELECT * FROM competitive_queue WHERE owner<>? ORDER BY joined,owner LIMIT 1", (owner,)).fetchone()
                if opponent:
                    self._new_session(db, kind, [(opponent["owner"], opponent["name"]), (owner, name)])
                else:
                    StorageBudget(db, "activity").reserve("queue:" + owner, owner, METADATA_BYTES)
                    db.execute("""INSERT INTO competitive_queue VALUES (?,?,?,?)
                        ON CONFLICT(owner) DO UPDATE SET touched=excluded.touched,name=excluded.name""",
                               (owner, name[:80], self.clock(), self.clock()))
            return self._state(db, owner)

    def ready(self, owner, session_id):
        with self.results.connect() as db:
            self.schema(db)
            self._expire(db)
            session = self._session(db, owner)
            require(session and session["id"] == session_id, "Match not found.", 404)
            if session["status"] == "waiting":
                from admin_controls import guard
                guard(db, owner, "versus", new=True)
                db.execute("UPDATE competitive_seats SET ready=1,touched=? WHERE owner=?", (self.clock(), owner))
                players = db.execute("SELECT * FROM competitive_seats WHERE session_id=?", (session_id,)).fetchall()
                if len(players) == 2 and all(player["ready"] for player in players):
                    db.execute("UPDATE competitive_sessions SET status='preparing',reason='' WHERE id=?", (session_id,))
        try:
            self.prepare(session_id)
        except DailyError as exc:
            if exc.status in {429, 503}:
                with self.results.connect() as db:
                    changed = db.execute("UPDATE competitive_sessions SET status='waiting',reason=? WHERE id=? AND status='preparing'",
                                         (str(exc), session_id))
                    if changed.rowcount:
                        db.execute("UPDATE competitive_seats SET ready=0 WHERE session_id=?", (session_id,))
            raise
        return self.state(owner)

    def prepare(self, session_id):
        # Fetch outside the database transaction. Other queues/answers keep working.
        with self.prepare_lock:
            with self.results.connect() as db:
                self.schema(db)
                session = db.execute("SELECT * FROM competitive_sessions WHERE id=?", (session_id,)).fetchone()
                if not session or session["status"] != "preparing":
                    return
            for _ in range(8):
                try:
                    rounds = self.provider()
                    require(len(rounds) == 5, "Five verified rounds are required.", 503)
                    ranges = {}
                    for puzzle in rounds:
                        self.results.validate_candles(puzzle["candles"])
                        ticker = canonical_ranked_symbol(puzzle["ticker"])
                        times = [bar["time"] for bar in puzzle["candles"]]
                        require(all(a < b for a, b in zip(times, times[1:]))
                                and all(times[-1] < start or times[0] > end
                                        for start, end in ranges.get(ticker, [])),
                                "Match rounds must use separate historical candles.", 503)
                        ranges.setdefault(ticker, []).append((times[0], times[-1]))
                    with self.results.connect() as db:
                        session = db.execute("SELECT * FROM competitive_sessions WHERE id=?", (session_id,)).fetchone()
                        if session["status"] != "preparing":
                            return
                        players = db.execute("SELECT * FROM competitive_seats WHERE session_id=?", (session_id,)).fetchall()
                        require(len(players) == 2, "Both players must be present.", 409)
                        from admin_controls import guard
                        for player in players:
                            guard(db, player["owner"], "versus", new=True)
                        windows = {seen_window(puzzle) for puzzle in rounds}
                        if len(windows) != 5 or any(windows & self.results.seen_windows(db, p["owner"]) for p in players):
                            continue
                        db.execute("INSERT INTO result_matches VALUES (?,'active',?,'server')", (session_id, stamp()))
                        for player in players:
                            db.execute("INSERT INTO result_match_players VALUES (?,?,?)", (session_id, player["owner"], player["name"]))
                        for number, puzzle in enumerate(rounds, 1):
                            puzzle = {**puzzle, "seenTracked": True}
                            puzzle_id = f"competitive:{session_id}:{number}"
                            for player in players:
                                self.results.save_puzzle(db, player["owner"], puzzle_id, puzzle)
                                from admin_controls import accept
                                accept(db, player["owner"], puzzle_id, "versus")
                                self.results.remember_seen(db, player["owner"], puzzle)
                            db.execute("INSERT INTO competitive_rounds VALUES (?,?,?,?)", (session_id, number, puzzle_id, encode(puzzle)))
                        self._start_round(db, session_id, 1)
                    return
                except Exception as exc:
                    if getattr(exc, "code", None) == "storage_capacity":
                        raise
                    break
            with self.results.connect() as db:
                changed = db.execute("UPDATE competitive_sessions SET status='waiting',reason=? WHERE id=? AND status='preparing'",
                    ("Five fresh charts could not be loaded for both players. Ready up to retry.", session_id))
                if changed.rowcount:
                    db.execute("UPDATE competitive_seats SET ready=0 WHERE session_id=?", (session_id,))

    def _start_round(self, db, session_id, number):
        now = self.clock()
        db.execute("UPDATE competitive_sessions SET status='active',round=?,starts=?,deadline=?,reason='' WHERE id=?",
                   (number, now + 3, now + 23, session_id))
        puzzle_id = db.execute("SELECT puzzle_id FROM competitive_rounds WHERE session_id=? AND round=?", (session_id, number)).fetchone()[0]
        for player in db.execute("SELECT owner FROM competitive_seats WHERE session_id=?", (session_id,)).fetchall():
            db.execute("INSERT OR IGNORE INTO result_assignments VALUES (?,?,?,?)", (player[0], puzzle_id, "versus", now + 3))
            db.execute("INSERT OR IGNORE INTO result_match_assignments VALUES (?,?,?,?)", (session_id, player[0], number, puzzle_id))

    def _finish(self, db, session, forfeiter=None):
        players = db.execute("SELECT * FROM competitive_seats WHERE session_id=?", (session["id"],)).fetchall()
        from admin_controls import blocked
        if any(blocked(db, p["owner"], "versus") for p in players):
            db.execute("UPDATE competitive_sessions SET status='cancelled',winner=NULL,reason='Voided by administration; completed rounds retained.' WHERE id=?", (session["id"],))
            db.execute("UPDATE result_matches SET status='void' WHERE id=? AND status<>'completed'", (session["id"],))
            return
        scores = {p["owner"]: db.execute("""SELECT coalesce(sum(a.correct),0) FROM result_match_rounds r
            JOIN result_attempts a ON a.id=r.attempt_id WHERE r.match_id=? AND r.owner=?""", (session["id"], p["owner"])).fetchone()[0] for p in players}
        winner = next((p["owner"] for p in players if p["owner"] != forfeiter), None) if forfeiter else None
        if not forfeiter and len(set(scores.values())) > 1:
            winner = max(scores, key=scores.get)
        reason = "Opponent left the match." if forfeiter else "All five rounds completed."
        for player in players:
            if session["kind"] == "Private":
                continue  # Private scores/rewards persist without a Review group.
            other = next(p for p in players if p["owner"] != player["owner"])
            record_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{session['id']}:{player['owner']}"))
            payload = dict(matchGroup=True, matchId=session["id"], opponent=other["name"],
                           score=f"{scores[player['owner']]}-{scores[other['owner']]}",
                           winner="Draw" if winner is None else "You win" if winner == player["owner"] else "Opponent wins",
                           competitiveMode=session["kind"], matchType="private" if session["kind"] == "Private" else "random",
                           endedReason=reason, forfeit=bool(forfeiter))
            db.execute("INSERT OR IGNORE INTO result_attempts VALUES (?,?,NULL,'versus','',NULL,NULL,'completed','server',?,?)",
                       (record_id, player["owner"], stamp(), encode(payload)))
        db.execute("UPDATE result_matches SET status='completed' WHERE id=?", (session["id"],))
        db.execute("UPDATE competitive_sessions SET status='completed',winner=?,reason=? WHERE id=?", (winner, reason, session["id"]))

    def _advance(self, db, session):
        now = self.clock()
        if session["status"] in {"active", "reveal"}:
            from admin_controls import blocked
            if any(blocked(db, p[0], "versus") for p in db.execute("SELECT owner FROM competitive_seats WHERE session_id=?", (session["id"],))):
                db.execute("UPDATE competitive_sessions SET status='cancelled',winner=NULL,reason='Voided by administration; completed rounds retained.' WHERE id=?", (session["id"],))
                db.execute("UPDATE result_matches SET status='void' WHERE id=? AND status<>'completed'", (session["id"],))
                return
        if session["status"] == "active":
            count = db.execute("SELECT count(*) FROM competitive_answers WHERE session_id=? AND round=?", (session["id"], session["round"])).fetchone()[0]
            if now >= session["deadline"] or count == 2:
                saved = db.execute("SELECT * FROM competitive_rounds WHERE session_id=? AND round=?", (session["id"], session["round"])).fetchone()
                puzzle = json.loads(saved["payload"])
                for player in db.execute("SELECT owner FROM competitive_seats WHERE session_id=?", (session["id"],)).fetchall():
                    answer = db.execute("SELECT choice FROM competitive_answers WHERE session_id=? AND round=? AND owner=?", (session["id"], session["round"], player[0])).fetchone()
                    self.results._complete(db, player[0], saved["puzzle_id"], "versus", answer[0] if answer else "Timed out", puzzle)
                db.execute("UPDATE competitive_sessions SET status='reveal',next_at=? WHERE id=?", (now + 4, session["id"]))
        elif session["status"] == "reveal" and now >= session["next_at"]:
            if session["round"] == 5:
                self._finish(db, session)
            else:
                self._start_round(db, session["id"], session["round"] + 1)

    def _state(self, db, owner):
        now = self.clock()
        session = self._session(db, owner)
        queue = db.execute("SELECT joined FROM competitive_queue WHERE owner=?", (owner,)).fetchone()
        response = dict(serverTime=now, queue=dict(mode="Public", startedAt=queue[0] * 1000) if queue else None, match=None)
        if not session:
            return response
        self._advance(db, session)
        session = self._session(db, owner)
        players = []
        roster = db.execute("""SELECT p.owner,p.label name,1 ready,coalesce(s.touched,0) touched
            FROM result_match_players p LEFT JOIN competitive_seats s ON s.owner=p.owner AND s.session_id=p.match_id
            WHERE p.match_id=? ORDER BY p.rowid""", (session["id"],)).fetchall() if session["status"] == "completed" else db.execute(
                "SELECT * FROM competitive_seats WHERE session_id=? ORDER BY rowid", (session["id"],)).fetchall()
        for player in roster:
            score = db.execute("""SELECT coalesce(sum(a.correct),0) FROM result_match_rounds r
                JOIN result_attempts a ON a.id=r.attempt_id WHERE r.match_id=? AND r.owner=?""", (session["id"], player["owner"])).fetchone()[0]
            answered = db.execute("SELECT choice FROM competitive_answers WHERE session_id=? AND round=? AND owner=?", (session["id"], session["round"], player["owner"])).fetchone()
            players.append(dict(id=player["owner"][5:], name=player["name"], ready=bool(player["ready"]), score=score,
                                answered=bool(answered), connected=now-player["touched"] < 25))
        match = dict(id=session["id"], kind=session["kind"], code=session["code"], status=session["status"],
                     round=session["round"], total=5, startsAt=session["starts"], deadline=session["deadline"],
                     nextAt=session["next_at"], me=owner[5:], players=players, winner=session["winner"][5:] if session["winner"] else None,
                     reason=session["reason"], puzzle=None, choice=None, outcome=None)
        if session["round"]:
            row = db.execute("SELECT * FROM competitive_rounds WHERE session_id=? AND round=?", (session["id"], session["round"])).fetchone()
            puzzle = json.loads(row["payload"])
            mine = db.execute("SELECT choice FROM competitive_answers WHERE session_id=? AND round=? AND owner=?", (session["id"], session["round"], owner)).fetchone()
            match["choice"] = mine[0] if mine else None
            if session["status"] in {"reveal", "completed"}:
                match["puzzle"] = {key: value for key, value in puzzle.items() if key not in {"answer", "candles"}}
                match["puzzle"]["candles"] = puzzle["candles"][:puzzle["observedEnd"]]
                match["outcome"] = dict(answer=puzzle["answer"], candles=puzzle["candles"], correct=bool(mine and mine[0] == puzzle["answer"]))
            else:
                match["puzzle"] = hidden_history(puzzle, hide_instrument=True)
        response["match"] = match
        return response

    def state(self, owner, *, touch=False):
        with self.results.connect() as db:
            self.schema(db)
            self._expire(db)
            if touch:
                db.execute("UPDATE competitive_seats SET touched=? WHERE owner=? AND touched<?", (self.clock(), owner, self.clock()-5))
                db.execute("UPDATE competitive_queue SET touched=? WHERE owner=? AND touched<?", (self.clock(), owner, self.clock()-5))
            return self._state(db, owner)

    def answer(self, owner, session_id, number, choice, visibility=None):
        require(choice in CHOICES and type(number) is int)
        with self.results.connect() as db:
            self.schema(db)
            session = self._session(db, owner)
            require(session and session["id"] == session_id, "Match not found.", 404)
            from admin_controls import guard, visibility as save_visibility
            guard(db, owner, "versus")
            prior = db.execute("SELECT 1 FROM competitive_answers WHERE session_id=? AND round=? AND owner=?", (session_id, number, owner)).fetchone()
            if not prior:
                require(session["status"] == "active" and number == session["round"] and session["starts"] <= self.clock() < session["deadline"],
                        "This round is not accepting predictions.", 409)
                db.execute("INSERT INTO competitive_answers VALUES (?,?,?,?,?)", (session_id, number, owner, choice, self.clock()))
                puzzle = db.execute("SELECT puzzle_id FROM competitive_rounds WHERE session_id=? AND round=?", (session_id, number)).fetchone()
                if puzzle:
                    save_visibility(db, owner, puzzle[0], "versus", visibility)
            return self._state(db, owner)

    def leave(self, owner):
        with self.results.connect() as db:
            self.schema(db)
            session = self._session(db, owner)
            if session and session["status"] in {"active", "reveal"}:
                self._finish(db, session, forfeiter=owner)
                return self._state(db, owner)
            if session and session["status"] in {"waiting", "preparing"}:
                db.execute("UPDATE competitive_sessions SET status='cancelled',reason='A player left the lobby.' WHERE id=?", (session["id"],))
            db.execute("DELETE FROM competitive_seats WHERE owner=?", (owner,))
            db.execute("DELETE FROM competitive_queue WHERE owner=?", (owner,))
            return self._state(db, owner)

    def tick(self):
        with self.results.connect() as db:
            self.schema(db)
            self._expire(db)
            for session in db.execute("SELECT * FROM competitive_sessions WHERE status IN ('active','reveal')").fetchall():
                self._advance(db, session)

    def standings(self, owner):
        with self.results.connect() as db:
            self.schema(db)
            rows = db.execute("""WITH totals AS (
                SELECT p.owner, count(*) matches, sum(CASE WHEN s.winner=p.owner THEN 1 ELSE 0 END) wins
                FROM result_match_players p JOIN competitive_sessions s ON s.id=p.match_id
                WHERE s.status='completed' AND s.kind='Public' GROUP BY p.owner
            ), ranked AS (
                SELECT *,row_number() OVER (ORDER BY wins DESC,matches DESC,owner) place FROM totals
            ) SELECT r.*, (SELECT label FROM result_match_players names WHERE names.owner=r.owner
                ORDER BY rowid DESC LIMIT 1) name FROM ranked r WHERE place<=10 OR owner=? ORDER BY place""", (owner,)).fetchall()
            mine = next((row for row in rows if row["owner"] == owner), None)
            return dict(rows=[[row["name"], f"{row['wins']} {'win' if row['wins']==1 else 'wins'}", row["owner"][5:]] for row in rows if row["place"] <= 10],
                        you=dict(rank=mine["place"] if mine else None, wins=mine["wins"] if mine else 0))
