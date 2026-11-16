"""Private administration state and transaction-level gameplay barriers.

No HTTP identity or client score grants authority here. All callers use the
existing serialized account transaction; jobs and settlement use the same lock.
"""
import json
import os
from time import time
from datetime import datetime, timezone

MODES = {"free", "speed", "packs", "daily", "ranked", "versus", "lessons", "paper", "review"}
COMPETITIVE = {"ranked", "versus"}
DEFAULT_REWARDS = {"correctXp": 120, "incorrectXp": 30, "timeoutXp": 15, "streakXp": 4,
                   "freeCoins": 10, "dailyCoins": 50, "rankedCoins": 25}


def stamp():
    return datetime.now(timezone.utc).isoformat()


def fail(message, status=403):
    from daily_puzzles import DailyError
    raise DailyError(status, message)


def schema(db):
    for sql in (
        "CREATE TABLE IF NOT EXISTS admin_owner (slot INTEGER PRIMARY KEY, owner TEXT NOT NULL, enabled INTEGER NOT NULL)",
        "CREATE TABLE IF NOT EXISTS admin_versions (target TEXT PRIMARY KEY, version INTEGER NOT NULL)",
        """CREATE TABLE IF NOT EXISTS admin_restrictions (id TEXT PRIMARY KEY, owner TEXT NOT NULL,
           scope TEXT NOT NULL, expires REAL, revoked INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL, at REAL NOT NULL)""",
        "CREATE INDEX IF NOT EXISTS admin_restriction_owner ON admin_restrictions(owner,revoked,expires)",
        """CREATE TABLE IF NOT EXISTS admin_sessions (owner TEXT PRIMARY KEY, cutoff REAL NOT NULL DEFAULT 0,
           locked INTEGER NOT NULL DEFAULT 0)""",
        "CREATE TABLE IF NOT EXISTS admin_controls (scope TEXT PRIMARY KEY, state TEXT NOT NULL, at REAL NOT NULL)",
        "CREATE TABLE IF NOT EXISTS admin_freezes (scope TEXT PRIMARY KEY, at REAL NOT NULL)",
        """CREATE TABLE IF NOT EXISTS admin_operations (id TEXT PRIMARY KEY, actor TEXT NOT NULL, target TEXT NOT NULL,
           action TEXT NOT NULL, intent TEXT NOT NULL, result TEXT NOT NULL, at REAL NOT NULL)""",
        """CREATE TABLE IF NOT EXISTS admin_audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, target TEXT NOT NULL,
           action TEXT NOT NULL, reason TEXT NOT NULL, result TEXT NOT NULL, detail TEXT NOT NULL, at REAL NOT NULL)""",
        "CREATE INDEX IF NOT EXISTS admin_audit_time ON admin_audit(at,id)",
        """CREATE TABLE IF NOT EXISTS admin_cases (id TEXT PRIMARY KEY, owner TEXT NOT NULL, state TEXT NOT NULL,
           note TEXT NOT NULL, evidence TEXT NOT NULL, at REAL NOT NULL, closed REAL)""",
        """CREATE TABLE IF NOT EXISTS admin_jobs (id TEXT PRIMARY KEY, owner TEXT NOT NULL, scope TEXT NOT NULL,
           cutoff REAL NOT NULL, state TEXT NOT NULL, processed INTEGER NOT NULL DEFAULT 0, error TEXT NOT NULL DEFAULT '')""",
        """CREATE TABLE IF NOT EXISTS admin_voided (owner TEXT NOT NULL, puzzle_id TEXT NOT NULL, mode TEXT NOT NULL,
           PRIMARY KEY(owner,puzzle_id,mode))""",
        """CREATE TABLE IF NOT EXISTS admin_policies (version INTEGER PRIMARY KEY, amounts TEXT NOT NULL, at REAL NOT NULL)""",
        """CREATE TABLE IF NOT EXISTS admin_accepted_rewards (owner TEXT NOT NULL, puzzle_id TEXT NOT NULL, mode TEXT NOT NULL,
           policy INTEGER NOT NULL, amounts TEXT NOT NULL, PRIMARY KEY(owner,puzzle_id,mode))""",
        """CREATE TABLE IF NOT EXISTS admin_visibility (owner TEXT NOT NULL, puzzle_id TEXT NOT NULL, mode TEXT NOT NULL,
           count INTEGER NOT NULL, seconds REAL NOT NULL, at REAL NOT NULL, PRIMARY KEY(owner,puzzle_id,mode))""",
        """CREATE TABLE IF NOT EXISTS admin_adjustments (id TEXT PRIMARY KEY, owner TEXT NOT NULL, xp REAL NOT NULL,
           coins INTEGER NOT NULL, reverses TEXT UNIQUE)""",
        """CREATE TABLE IF NOT EXISTS admin_outbox (id TEXT PRIMARY KEY, owner TEXT NOT NULL,
           state TEXT NOT NULL, error TEXT NOT NULL, at REAL NOT NULL)""",
    ):
        db.execute(sql)


def version(db, target):
    row = db.execute("SELECT version FROM admin_versions WHERE target=?", (target,)).fetchone()
    return row[0] if row else 0


def bump(db, target):
    db.execute("INSERT INTO admin_versions VALUES (?,1) ON CONFLICT(target) DO UPDATE SET version=admin_versions.version+1", (target,))
    return version(db, target)


def scope_modes(scope):
    return MODES if scope == "all" else COMPETITIVE if scope == "competitive" else {scope}


def blocked(db, owner, mode, *, new=False):
    now = time()
    if os.getenv("PRETIUM_MAINTENANCE", "0").strip() != "0":
        return "The service is under maintenance."
    session = db.execute("SELECT locked FROM admin_sessions WHERE owner=?", (owner,)).fetchone()
    if session and session[0]:
        return "This account is locked for recovery."
    for job in db.execute("SELECT owner,scope FROM admin_jobs WHERE state<>'completed' AND (owner='' OR owner=?)", (owner,)):
        if mode in scope_modes(job[1]):
            return "Affected games are still being reconciled. Please wait."
    restrictions = db.execute("SELECT scope FROM admin_restrictions WHERE owner=? AND revoked=0 AND (expires IS NULL OR expires>?)", (owner, now))
    if any(mode in scope_modes(r[0]) for r in restrictions):
        return "Gameplay is restricted for this account. Contact support for help."
    for row in db.execute("SELECT scope,state FROM admin_controls WHERE state<>'open'"):
        if mode in scope_modes(row[0]) and (new or row[1] in {"freeze", "maintenance"}):
            return "New play is paused." if row[1] == "pause" else "Play is frozen; unfinished affected games are being voided and refunded."
    return None


def guard(db, owner, mode, *, new=False, puzzle_id=None):
    if mode not in MODES:
        fail("Unknown gameplay mode.", 400)
    if puzzle_id and db.execute("SELECT 1 FROM admin_voided WHERE owner=? AND puzzle_id=? AND mode=?", (owner, puzzle_id, mode)).fetchone():
        fail("This unfinished game was voided by administration.", 409)
    reason = blocked(db, owner, mode, new=new)
    if reason:
        fail(reason)


def guard_transient(db, owner, mode, issued):
    guard(db, owner, mode)
    if any(mode in scope_modes(r[0]) and issued <= r[1] for r in db.execute("SELECT scope,at FROM admin_freezes")):
        fail("This unfinished guest game was voided by a service freeze.", 409)


def accept(db, owner, puzzle_id, mode):
    """Snapshot policy at first acceptance. Legacy assignments retain defaults."""
    row = db.execute("SELECT version,amounts FROM admin_policies ORDER BY version DESC LIMIT 1").fetchone()
    policy, amounts = (row[0], row[1]) if row else (0, json.dumps(DEFAULT_REWARDS))
    db.execute("INSERT OR IGNORE INTO admin_accepted_rewards VALUES (?,?,?,?,?)", (owner, puzzle_id, mode, policy, amounts))


def amounts(db, owner, puzzle_id, mode):
    row = db.execute("SELECT amounts FROM admin_accepted_rewards WHERE owner=? AND puzzle_id=? AND mode=?", (owner, puzzle_id, mode)).fetchone()
    return json.loads(row[0]) if row else DEFAULT_REWARDS.copy()


def visibility(db, owner, puzzle_id, mode, report):
    if not owner.startswith("user:") or report is None:
        return
    # First, bounded report only. Browser reports can be forged and never grant
    # authority. Invalid or missing data stays unknown rather than counting zero.
    if not isinstance(report, dict) or set(report) != {"count", "seconds"}:
        return
    count, seconds = report["count"], report["seconds"]
    issued = db.execute("SELECT issued_at FROM result_assignments WHERE owner=? AND puzzle_id=? AND mode=?", (owner, puzzle_id, mode)).fetchone()
    if (not issued or type(count) is not int or not 0 <= count <= 1000 or type(seconds) not in (int, float)
            or not 0 <= seconds <= min(86400, max(0, time() - issued[0])) or count == 0 and seconds != 0):
        return
    db.execute("INSERT OR IGNORE INTO admin_visibility VALUES (?,?,?,?,?,?)", (owner, puzzle_id, mode, count, seconds, time()))


def expire(db):
    now = time()
    db.execute("DELETE FROM admin_visibility WHERE at<?", (now - 30 * 86400,))
    db.execute("DELETE FROM admin_cases WHERE closed IS NOT NULL AND closed<?", (now - 180 * 86400,))
    db.execute("DELETE FROM admin_audit WHERE at<?", (now - 365 * 86400,))
    for table in ("admin_accepted_rewards", "admin_voided"):
        db.execute("DELETE FROM " + table + " WHERE NOT EXISTS (SELECT 1 FROM result_assignments a WHERE a.owner=" + table + ".owner AND a.puzzle_id=" + table + ".puzzle_id) AND NOT EXISTS (SELECT 1 FROM result_attempts r WHERE r.owner=" + table + ".owner AND r.puzzle_id=" + table + ".puzzle_id)")
    # Operation receipts deliberately outlive audit retention: old request IDs
    # must never cause a second adjustment or email after a pruning boundary.


def reconcile(db, job, limit=100):
    """Bounded resumable batch. Barriers become effective before this worker."""
    from reward_wallet import RewardWallet
    modes = sorted(scope_modes(job["scope"]))
    placeholders = ",".join("?" for _ in modes)
    owner_clause = " AND a.owner=?" if job["owner"] else ""
    params = [*modes, job["cutoff"]] + ([job["owner"]] if job["owner"] else [])
    rows = db.execute(f"""SELECT a.owner,a.puzzle_id,a.mode FROM result_assignments a
        WHERE a.mode IN ({placeholders}) AND a.issued_at<=? {owner_clause}
        AND NOT EXISTS (SELECT 1 FROM admin_voided v WHERE v.owner=a.owner AND v.puzzle_id=a.puzzle_id AND v.mode=a.mode)
        AND NOT EXISTS (SELECT 1 FROM result_attempts r WHERE r.owner=a.owner AND r.puzzle_id=a.puzzle_id AND r.status='completed')
        ORDER BY a.owner,a.puzzle_id,a.mode LIMIT {int(limit)}""", tuple(params)).fetchall()
    for row in rows:
        db.execute("INSERT OR IGNORE INTO admin_voided VALUES (?,?,?)", tuple(row))
        db.execute("UPDATE result_attempts SET status='void' WHERE owner=? AND puzzle_id=? AND status='pending'", (row[0], row[1]))
        if row[2] == "ranked":
            RewardWallet.settle(db, row[0], row[1])
    count = len(rows)
    if "versus" in modes and db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='competitive_sessions'").fetchone():
        sessions = db.execute("""SELECT s.id FROM competitive_sessions s WHERE s.status IN ('waiting','preparing','active','reveal')
            AND (?='' OR EXISTS (SELECT 1 FROM competitive_seats p WHERE p.session_id=s.id AND p.owner=?)) LIMIT 100""",
            (job["owner"], job["owner"])).fetchall()
        for session in sessions:
            db.execute("UPDATE competitive_sessions SET status='cancelled',winner=NULL,reason='Voided by administration; completed rounds retained.' WHERE id=?", (session[0],))
            db.execute("UPDATE result_matches SET status='void' WHERE id=? AND status<>'completed'", (session[0],))
        db.execute("DELETE FROM competitive_queue WHERE ?='' OR owner=?", (job["owner"], job["owner"]))
        count += len(sessions)
    db.execute("UPDATE admin_jobs SET processed=processed+?,state=?,error='' WHERE id=?", (count, "pending" if count else "completed", job["id"]))


def purge_owner(db, owner):
    for table in ("admin_restrictions", "admin_sessions", "admin_cases", "admin_visibility", "admin_voided", "admin_accepted_rewards", "admin_adjustments", "admin_outbox"):
        db.execute("DELETE FROM " + table + " WHERE owner=?", (owner,))
    db.execute("DELETE FROM admin_versions WHERE target=?", (owner,))
    db.execute("DELETE FROM admin_jobs WHERE owner=?", (owner,))
    # Minimize free text and evidence on deletion; retain only anonymous action
    # type/result/time. Request receipts retain a digest of their old intent.
    db.execute("UPDATE admin_audit SET target='deleted',reason='Removed on account deletion',detail='{}' WHERE target=?", (owner,))
    db.execute("UPDATE admin_operations SET target='deleted',result='{}' WHERE target=?", (owner,))
    db.execute("UPDATE admin_audit SET actor='deleted' WHERE actor=?", (owner,))
    db.execute("UPDATE admin_operations SET actor='deleted' WHERE actor=?", (owner,))
    db.execute("DELETE FROM admin_owner WHERE owner=?", (owner,))
