"""Dedicated admin API and durable reconciliation worker, outside static assets."""
import json
import os
import sqlite3
from time import time
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

import admin_auth
import admin_controls as controls
from admin_store import AdminStore
from daily_puzzles import DailyError

FRESH_ACTIONS = {"restrict", "unrestrict", "lock", "unlock", "invalidate", "recover", "adjust", "reverse", "control", "policy"}


class AdminService:
    def __init__(self, results, auth_url, publishable_key):
        self.results, self.auth_url, self.key = results, auth_url, publishable_key
        self.store = AdminStore(results)
        # Cover display is refreshed by the durable worker. Gameplay protection
        # never uses this cache: guards read committed control rows directly.
        self.maintenance = False

    def request(self, headers, screen, params, body=None):
        if os.getenv("PRETIUM_ADMIN_ENABLED") != "1":
            raise DailyError(404, "Administration is disabled.")
        if body is not None and os.getenv("PRETIUM_ADMIN_MUTATIONS_ENABLED") != "1":
            raise DailyError(403, "Console is read-only; hosted mutation verification must precede enablement.")
        if body is not None and not isinstance(body, dict):
            raise DailyError(400, "Admin request must be an object.")
        actor, claims = admin_auth.authenticate(headers, self.auth_url, self.key, fresh=body is not None and body.get("action") in FRESH_ACTIONS)
        try:
            with self.results.connect() as db:
                admin_auth.set_subject(db, actor)
                admin_auth.authorize(db, actor, claims)  # Membership and session checked under writer lock every time.
                if body is not None:
                    if screen != "operations":
                        raise DailyError(404, "Unknown admin mutation endpoint.")
                    result = self.store.mutate(db, actor, body)
                    self.maintenance = bool(db.execute("SELECT 1 FROM admin_controls WHERE scope='all' AND state='maintenance'").fetchone())
                    return result
                if screen == "session":
                    return {"owner": actor, "readOnly": os.getenv("PRETIUM_ADMIN_MUTATIONS_ENABLED") != "1",
                            "environment": os.getenv("PRETIUM_ADMIN_ENVIRONMENT", "Production"),
                            "environmentOverride": os.getenv("PRETIUM_MAINTENANCE", "0").strip() != "0",
                            "serverTime": time(), "mfaFreshSeconds": 300}
                return self.store.read(db, screen, params)
        except DailyError as error:
            # The rejected transaction has rolled back. Review evidence has a
            # fixed shared capacity, separate from successful operation receipts.
            if body is not None:
                from misconduct import observe
                observe(self.results, actor, error, admin=True)
            raise

    def tick(self):
        # These obligations continue when API access is disabled or maintenance
        # is on. A saved freeze cannot leave refunds dependent on the console.
        with self.results.connect() as db:
            controls.expire(db)
            self.maintenance = bool(db.execute("SELECT 1 FROM admin_controls WHERE scope='all' AND state='maintenance'").fetchone())
            jobs = [r[0] for r in db.execute("SELECT id FROM admin_jobs WHERE state IN ('pending','failed') ORDER BY cutoff LIMIT 5")]
        for job_id in jobs:
            try:
                with self.results.connect() as db:
                    job = db.execute("SELECT * FROM admin_jobs WHERE id=?", (job_id,)).fetchone()
                    if job and job["state"] != "completed":
                        controls.reconcile(db, job)
                        current = db.execute("SELECT state,processed FROM admin_jobs WHERE id=?", (job_id,)).fetchone()
                        if current[0] == "completed":
                            db.execute("UPDATE admin_audit SET result='successful',detail=? WHERE id=?", (json.dumps({"processed": current[1]}), job_id))
            except (sqlite3.Error, DailyError, OSError, ValueError):
                with self.results.connect() as db:
                    db.execute("UPDATE admin_jobs SET state='failed',error='Reconciliation failed; worker will retry. Inspect server logs privately.' WHERE id=?", (job_id,))
        self.mail_tick()

    def mail_tick(self):
        with self.results.connect() as db:
            # A previous worker may still be sending. Never automatically retry
            # 'sending', even across restart: provider-side acceptance is unknown.
            row = db.execute("SELECT id,owner FROM admin_outbox WHERE state='pending' ORDER BY at LIMIT 1").fetchone()
            if not row:
                return
            operation, owner = row[0], row[1]
            actor = db.execute("SELECT actor FROM admin_operations WHERE id=?", (operation,)).fetchone()
            if actor:
                admin_auth.set_subject(db, actor[0])
            email = db.execute("SELECT email FROM financelabs.admin_verified_email(?)", (owner[5:],)).fetchone()
            if not email or not email[0]:
                db.execute("UPDATE admin_outbox SET state='failed',error='Verified address is unavailable.' WHERE id=?", (operation,))
                return
            db.execute("UPDATE admin_outbox SET state='sending',error='Delivery unconfirmed until provider response; no automatic resend.' WHERE id=?", (operation,))
            # Commit dispatch claim before invoking the external mail provider.
        state, message = "successful", ""
        try:
            request = Request(self.auth_url + "/auth/v1/recover", data=json.dumps({"email": email[0]}).encode(),
                              headers={"apikey": self.key, "Content-Type": "application/json"}, method="POST")
            with urlopen(request, timeout=10) as response:
                response.read(4096)
        except HTTPError:
            state, message = "failed", "Provider rejected recovery. Inspect private provider logs before submitting a new request."
        except (URLError, OSError, TimeoutError):
            state, message = "uncertain", "Delivery could not be confirmed. No automatic resend; inspect provider logs."
        with self.results.connect() as db:
            db.execute("UPDATE admin_outbox SET state=?,error=? WHERE id=?", (state, message, operation))
            db.execute("UPDATE admin_audit SET result=?,detail=? WHERE id=?", (state, json.dumps({"message": message}), operation))


class AdminHandlerMixin:
    def handle_admin(self, path, query="", *, write=False):
        try:
            # Only the launcher makes bearer requests, without browser CORS.
            # Reject browser-origin requests entirely; no public admin assets.
            if self.headers.get("Origin") or self.headers.get("Sec-Fetch-Site") in {"cross-site", "same-site"}:
                raise DailyError(403, "Admin API is available through the local launcher only.")
            body = None
            if write:
                if self.headers.get("Content-Type", "").split(";", 1)[0] != "application/json":
                    raise DailyError(415, "JSON required.")
                size = int(self.headers.get("Content-Length", "0"))
                if not 2 <= size <= 16384:
                    raise DailyError(413, "Admin request is too large or empty.")
                body = json.loads(self.rfile.read(size))
            params = {k: v[0] for k, v in parse_qs(query).items()}
            result = self.admin_service.request(self.headers, path.removeprefix("/api/admin/v1/"), params, body)
            self.send_json(200, result)
        except DailyError as error:
            self.send_json(error.status, {"error": str(error)}, retry_after=error.retry_after)
        except (ValueError, TypeError, KeyError, UnicodeError, OverflowError):
            self.send_json(400, {"error": "Invalid administration request."})
        except (OSError, sqlite3.Error):
            self.send_json(503, {"error": "Private administration storage is unavailable."})
