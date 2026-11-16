"""Compatibility for stored matches from the retired Competitive feature.

No matchmaking, play, polling, standings, or public API remains. These helpers
only preserve old evidence and the existing account-deletion finalizer.
"""
import uuid
from result_history import stamp, encode


class LegacyMatchRecords:
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

