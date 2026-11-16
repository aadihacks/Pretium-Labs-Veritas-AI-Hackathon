"""Server-owned daily guest identities and one-time signup adoption.

The browser receives only a random HttpOnly cookie, never a writable ledger.
Account-only APIs remain authenticated independently of this guest identity.
"""
import hashlib
import json
import re
import secrets
import sqlite3
from datetime import datetime, timezone
from http.cookies import SimpleCookie
from time import time
from urllib.parse import urlparse

from account_guard import REQUEST_OWNER
from daily_puzzles import DailyError
from result_history import require
from result_storage import StorageBudget

COOKIE = "fl101_guest"
SESSION_SECONDS = 7 * 86400


def today():
    return datetime.now(timezone.utc).date().isoformat()


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def cookie_token(headers):
    try:
        cookies = SimpleCookie()
        cookies.load(headers.get("Cookie", ""))
        token = cookies[COOKIE].value if COOKIE in cookies else ""
        return token if re.fullmatch(r"[a-f0-9]{64}", token) else ""
    except Exception:
        return ""


class GuestProgress:
    def __init__(self, results):
        self.results = results

    @staticmethod
    def schema(db):
        db.execute("""CREATE TABLE IF NOT EXISTS guest_sessions (
            token_hash TEXT PRIMARY KEY, peer_hash TEXT NOT NULL, issued_day TEXT NOT NULL,
            expires REAL NOT NULL, claimed_by TEXT NOT NULL DEFAULT '')""")
        db.execute("""CREATE TABLE IF NOT EXISTS guest_practice_usage (
            peer_hash TEXT NOT NULL, day TEXT NOT NULL, used INTEGER NOT NULL,
            PRIMARY KEY(peer_hash,day))""")
        db.execute("CREATE INDEX IF NOT EXISTS guest_peer_day ON guest_sessions(peer_hash,issued_day)")
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS guest_claimed_account ON guest_sessions(claimed_by) WHERE claimed_by<>''")
        db.execute("""CREATE TABLE IF NOT EXISTS guest_signups (
            token_hash TEXT NOT NULL, signup_email TEXT NOT NULL, signup_owner TEXT NOT NULL,
            signup_at REAL NOT NULL, PRIMARY KEY(token_hash,signup_email,signup_owner))""")

    @staticmethod
    def prune(db):
        # Daily reset removes guest data only. A signup reservation keeps its
        # original day until confirmation/expiry; adopted rows already belong
        # to user: owners and cannot match this deletion boundary.
        db.execute("DELETE FROM guest_practice_usage WHERE day<?", (today(),))
        db.execute("DELETE FROM guest_signups WHERE NOT EXISTS (SELECT 1 FROM guest_sessions s WHERE s.token_hash=guest_signups.token_hash AND s.expires>?)", (time(),))
        db.execute("DELETE FROM guest_sessions WHERE expires<=?", (time(),))
        rows = db.execute("""SELECT DISTINCT owner FROM result_storage_objects
            WHERE owner LIKE 'guest:____-__-__:%' AND substr(owner,7,10)<?
            AND NOT EXISTS (SELECT 1 FROM guest_signups r JOIN guest_sessions s ON s.token_hash=r.token_hash
                WHERE r.signup_owner=result_storage_objects.owner AND s.expires>? AND s.claimed_by='')
            LIMIT 256""", (today(), time())).fetchall()
        for row in rows:
            owner = row[0]
            puzzles = db.execute("SELECT puzzle_id FROM result_assignments WHERE owner=?", (owner,)).fetchall()
            for table in ("result_assignments", "result_attempts", "result_review", "result_review_attempts",
                          "result_rewards", "result_earning_windows", "result_seen_charts", "wallet_claims",
                          "wallet_profiles", "result_storage_objects", "result_storage_admission",
                          "admin_accepted_rewards", "admin_voided"):
                db.execute(f"DELETE FROM {table} WHERE owner=?", (owner,))
            for puzzle in puzzles:
                if not db.execute("SELECT 1 FROM result_assignments WHERE puzzle_id=?", (puzzle[0],)).fetchone() and not db.execute("SELECT 1 FROM result_attempts WHERE puzzle_id=?", (puzzle[0],)).fetchone():
                    db.execute("DELETE FROM result_puzzles WHERE id=?", (puzzle[0],))
                    db.execute("DELETE FROM result_storage_objects WHERE kind='guest_snapshot' AND object_id=?", ("puzzle:" + puzzle[0],))

    def session(self, token, peer, *, create=False):
        with self.results.connect() as db:
            self.prune(db)
            row = db.execute("SELECT * FROM guest_sessions WHERE token_hash=?", (digest(token),)).fetchone() if token else None
            if row and row["expires"] > time() and not row["claimed_by"]:
                return token, "guest:" + today() + ":" + row["token_hash"]
            require(create, "Your guest session expired. Reload the page.", 401)
            # Persistent admission survives restarts and bounds cookie rotation.
            require(db.execute("SELECT count(*) FROM guest_sessions WHERE peer_hash=? AND issued_day=?",
                               (digest(peer), today())).fetchone()[0] < 5,
                    "Guest session limit reached for today. Sign in to continue.", 429)
            require(db.execute("SELECT count(*) FROM guest_sessions").fetchone()[0] < 20000,
                    "Guest sessions are at capacity. Sign in to continue.", 429)
            token = secrets.token_hex(32)
            db.execute("INSERT INTO guest_sessions(token_hash,peer_hash,issued_day,expires) VALUES (?,?,?,?)",
                       (digest(token), digest(peer), today(), time() + SESSION_SECONDS))
            return token, "guest:" + today() + ":" + digest(token)

    @staticmethod
    def check(db, owner):
        if not owner.startswith("guest:"):
            return
        parts = owner.split(":")
        require(len(parts) == 3 and parts[1] == today(), "Guest progress reset at midnight UTC. Reload the page.", 409)
        row = db.execute("SELECT expires,claimed_by FROM guest_sessions WHERE token_hash=?", (parts[2],)).fetchone()
        require(row and row[0] > time() and not row[1], "Your guest session changed. Reload the page.", 401)

    @staticmethod
    def admit(db, owner):
        GuestProgress.check(db, owner)
        peer = db.execute("SELECT peer_hash FROM guest_sessions WHERE token_hash=?", (owner.split(":")[2],)).fetchone()[0]
        row = db.execute("SELECT used FROM guest_practice_usage WHERE peer_hash=? AND day=?", (peer, today())).fetchone()
        require(not row or row[0] < 100, "Guest practice limit reached for today. Sign in to continue.", 429)
        if not row:
            require(db.execute("SELECT count(*) FROM guest_practice_usage").fetchone()[0] < 20000,
                    "Guest practice is at capacity. Sign in to continue.", 429)
            db.execute("INSERT INTO guest_practice_usage VALUES (?,?,0)", (peer, today()))
        db.execute("UPDATE guest_practice_usage SET used=used+1 WHERE peer_hash=? AND day=?", (peer, today()))

    def prepare_signup(self, token, email):
        require(isinstance(email, str) and len(email) <= 120 and re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email), "Invalid signup email.")
        with self.results.connect() as db:
            row = db.execute("SELECT expires,claimed_by FROM guest_sessions WHERE token_hash=?", (digest(token),)).fetchone() if token else None
            if not row or row[0] <= time() or row[1]:
                return {"prepared": False}
            owner = "guest:" + today() + ":" + digest(token)
            email_hash = digest(email.strip().lower())
            existing = db.execute("SELECT 1 FROM guest_signups WHERE token_hash=? AND signup_email=? AND signup_owner=?", (digest(token), email_hash, owner)).fetchone()
            if not existing:
                require(db.execute("SELECT count(*) FROM guest_signups WHERE token_hash=?", (digest(token),)).fetchone()[0] < 35,
                        "Too many signup changes. Retry your original signup.", 429)
                db.execute("INSERT INTO guest_signups VALUES (?,?,?,?)", (digest(token), email_hash, owner, time()))
        return {"prepared": True}

    def adopt(self, token, owner, user):
        require(owner.startswith("user:"), "Sign in to save guest progress.", 401)
        with self.results.connect() as db:
            row = db.execute("SELECT * FROM guest_sessions WHERE token_hash=?", (digest(token),)).fetchone() if token else None
            if not row:
                return {"adopted": False}
            if row["claimed_by"]:
                return {"adopted": row["claimed_by"] == owner}
            if row["expires"] <= time():
                return {"adopted": False}
            try:
                created = datetime.fromisoformat(user["created_at"].replace("Z", "+00:00")).timestamp()
            except (KeyError, TypeError, ValueError):
                raise DailyError(403, "Cannot verify when this account was created.") from None
            reservations = db.execute("SELECT signup_owner,signup_at FROM guest_signups WHERE token_hash=? AND signup_email=? AND signup_at<=? ORDER BY signup_at DESC",
                                      (digest(token), digest(str(user.get("email", "")).lower()), created + 5)).fetchall()
            reservation = next((r for r in reservations if created <= datetime.fromisoformat(r[0].split(":")[1]).replace(tzinfo=timezone.utc).timestamp() + 86400 + 600), None)
            # A retry preserves each day's first reservation. Only Auth's verified
            # creation time chooses the earned day, including midnight signups.
            if not user.get("email_confirmed_at") or not reservation:
                return {"adopted": False}
            require(not db.execute("SELECT 1 FROM guest_sessions WHERE claimed_by=?", (owner,)).fetchone(),
                    "This account has already saved guest progress.", 409)
            source = reservation[0]
            # Never merge unrelated account progress or replay starter/quest claims.
            require(not db.execute("SELECT 1 FROM result_rewards WHERE owner=?", (owner,)).fetchone()
                    and not db.execute("SELECT 1 FROM result_attempts WHERE owner=?", (owner,)).fetchone(),
                    "Guest progress can only be saved to a new, unused account.", 409)
            # Admission to the member budget is atomic with adoption. Guest data
            # never uses member capacity before an actual account is created.
            kinds = {"guest_snapshot": "snapshot", "guest_activity": "activity", "guest_seen": "seen"}
            for allocation in db.execute("SELECT kind,object_id,payload_bytes FROM result_storage_objects WHERE owner=?", (source,)).fetchall():
                kind = kinds.get(allocation[0], allocation[0])
                budget = StorageBudget(db, kind)
                if allocation[0] == "guest_snapshot":
                    budget.reserve(allocation[1], "", allocation[2])
                    db.execute("DELETE FROM result_storage_objects WHERE kind='guest_snapshot' AND object_id=? AND owner=''", (allocation[1],))
                budget.reserve(allocation[1], owner, allocation[2])
            db.execute("DELETE FROM result_storage_objects WHERE owner=?", (source,))
            db.execute("DELETE FROM result_storage_admission WHERE owner=?", (source,))
            for table in ("result_assignments", "result_attempts", "result_review", "result_review_attempts",
                          "result_rewards", "result_earning_windows", "result_seen_charts", "wallet_claims",
                          "wallet_profiles", "admin_accepted_rewards", "admin_voided"):
                db.execute(f"UPDATE {table} SET owner=? WHERE owner=?", (owner, source))
            db.execute("UPDATE guest_sessions SET claimed_by=? WHERE token_hash=?", (owner, digest(token)))
            db.execute("DELETE FROM guest_signups WHERE token_hash=?", (digest(token),))
        return {"adopted": True}


class GuestHandlerMixin:
    @property
    def guest_progress(self):
        return GuestProgress(self.result_store)

    def guest_owner(self, *, create=False):
        token = cookie_token(self.headers)
        token, owner = self.guest_progress.session(token, self.rate_peer(), create=create)
        if create:
            secure = "; Secure" if self.is_https() else ""
            self._guest_cookie = f"{COOKIE}={token}; Path=/api; Max-Age={SESSION_SECONDS}; HttpOnly; SameSite=Strict{secure}"
        REQUEST_OWNER.set(owner)
        return owner

    def handle_guest(self, path, *, write=False):
        try:
            require(self.headers.get("Sec-Fetch-Site", "") != "cross-site", "Cross-site guest requests are not accepted.", 403)
            request = {}
            if write:
                origin = self.headers.get("Origin")
                require(not origin or urlparse(origin).netloc.casefold() == self.headers.get("Host", "").casefold(),
                        "Cross-origin guest changes are not accepted.", 403)
                require(self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() == "application/json", "JSON content required.", 415)
                length = int(self.headers.get("Content-Length", "0"))
                require(2 <= length <= 4096, "Guest request is too large or empty.", 413)
                request = json.loads(self.rfile.read(length))
                require(isinstance(request, dict), "Invalid guest request.")
            if path == "/api/guest/signout" and write:
                self._guest_cookie = f"{COOKIE}=; Path=/api; Max-Age=0; HttpOnly; SameSite=Strict"
                self.send_json(200, {"signedOut": True})
                return
            if path == "/api/guest/adopt" and write:
                user = {}
                owner = self.guest_account(user)
                REQUEST_OWNER.set(owner)
                result = self.guest_progress.adopt(cookie_token(self.headers), owner, user)
            elif path == "/api/guest/signup" and write:
                require(set(request) == {"email"})
                result = self.guest_progress.prepare_signup(cookie_token(self.headers), request["email"])
            else:
                owner = self.guest_owner(create=path == "/api/guest/session" and not write)
                if path == "/api/guest/session" and not write:
                    result = {"day": owner.split(":")[1], "summary": self.result_store.summary(owner)}
                elif path == "/api/guest/wallet" and write:
                    # All currently purchasable features require a real account.
                    require(request.get("action") in {"level", "quest"}, "This purchase requires an account.", 403)
                    result = self.result_store.wallet_action(owner, request)
                    result["day"] = owner.split(":")[1]
                else:
                    raise DailyError(404, "Unknown guest endpoint.")
            self.send_json(200, result, compress=True)
        except DailyError as exc:
            self.send_json(exc.status, {"error": str(exc)}, retry_after=exc.retry_after)
        except (ValueError, TypeError, UnicodeError):
            self.send_json(400, {"error": "Invalid guest request."})
        except (OSError, sqlite3.Error):
            self.send_json(503, {"error": "Guest progress is temporarily unavailable. Please retry."})
