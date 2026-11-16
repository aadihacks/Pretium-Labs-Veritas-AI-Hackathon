"""Permanent account deletion under the existing database writer lock.

Auth deletion is a narrow private PostgreSQL function invoked in the SAME
transaction as application cleanup. A failed Auth operation rolls everything
back, including the deletion barrier and any match forfeit.
"""
import json
import uuid
import os
from datetime import datetime, timezone

from account_database import cloud_database_enabled
from account_guard import owner_digest
from daily_puzzles import DailyError


OWNED_TABLES = (
    "account_documents", "account_lessons", "account_learning_archives", "account_feedback",
    "paper_portfolios", "paper_orders", "result_assignments", "result_attempts",
    "result_review", "result_review_attempts", "result_rewards", "result_match_players",
    "result_match_rounds", "result_match_assignments", "result_legacy", "result_seen_charts",
    "result_earning_windows", "wallet_claims", "wallet_ranked", "wallet_profiles",
    "competitive_seats", "competitive_queue", "competitive_answers", "result_storage_objects", "result_storage_admission",
    "admin_owner", "admin_restrictions", "admin_sessions", "admin_cases", "admin_visibility",
    "admin_voided", "admin_accepted_rewards", "admin_adjustments", "admin_outbox", "admin_jobs",
)


def exists(db, name):
    # Names are module-owned constants; request data never forms an identifier.
    return bool(db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='" + name + "'").fetchone())


def purge_application(db, owner, competitive):
    from admin_controls import schema, purge_owner
    schema(db)
    purge_owner(db, owner)
    if exists(db, "competitive_sessions"):
        session = competitive._session(db, owner)
        if session and session["status"] in {"active", "reveal"}:
            competitive._finish(db, session, forfeiter=owner)
        if session:
            db.execute("UPDATE competitive_sessions SET status='cancelled',reason='A player deleted their account.' WHERE id=?", (session["id"],))
        db.execute("UPDATE competitive_sessions SET winner='deleted' WHERE winner=?", (owner,))
    # A surviving player's fixed score, outcome and rewards are retained. Only
    # the copied display name of the removed opponent is anonymized.
    rows = db.execute("""SELECT DISTINCT a.id,a.payload FROM result_attempts a
        JOIN result_match_players p ON p.match_id=json_extract(a.payload,'$.matchId')
        WHERE p.owner=? AND a.owner<>? AND a.mode='versus'""", (owner, owner)).fetchall()
    for row in rows:
        payload = json.loads(row[1])
        payload["opponent"] = "Deleted account"
        db.execute("UPDATE result_attempts SET payload=? WHERE id=?", (json.dumps(payload, separators=(",", ":")), row[0]))
    for table in OWNED_TABLES:
        if exists(db, table):
            db.execute("DELETE FROM " + table + " WHERE owner=?", (owner,))
    if exists(db, "guest_sessions"):
        db.execute("DELETE FROM guest_signups WHERE token_hash IN (SELECT token_hash FROM guest_sessions WHERE claimed_by=?)", (owner,))
        db.execute("DELETE FROM guest_sessions WHERE claimed_by=?", (owner,))
    if exists(db, "daily_attempts"):
        db.execute("DELETE FROM daily_attempts WHERE principal=?", (owner,))
    if exists(db, "market_provider_budget"):
        digest = owner_digest(owner)
        for row in db.execute("SELECT provider,payload FROM market_provider_budget").fetchall():
            state = json.loads(row[1])
            state["calls"] = [call for call in state.get("calls", []) if len(call) < 3 or call[2] != digest]
            db.execute("UPDATE market_provider_budget SET payload=? WHERE provider=?", (json.dumps(state, separators=(",", ":")), row[0]))
    db.execute("INSERT OR IGNORE INTO account_deletions VALUES (?,?)", (owner_digest(owner), datetime.now(timezone.utc).isoformat()))


class AccountDeletion:
    def __init__(self, results, reauthenticate, delete_identity=None, connected=cloud_database_enabled):
        from legacy_match_records import LegacyMatchRecords
        self.results, self.competitive = results, LegacyMatchRecords()
        self.reauthenticate, self.connected = reauthenticate, connected
        self.delete_identity = delete_identity or self.postgres_identity

    @staticmethod
    def postgres_identity(db, owner):
        # The private function reads auth.uid(); only the trusted backend can
        # invoke it. Its subject is set from the verified principal, never JSON.
        db.execute("SELECT set_config('request.jwt.claim.sub',?,true)", (owner[5:],))
        db.execute("SELECT set_config('request.jwt.claims',?,true)", (json.dumps({"sub": owner[5:], "role": "authenticated"}),))
        result = db.execute("SELECT financelabs.delete_authenticated_identity()").fetchone()
        if not result or result[0] is not True:
            raise DailyError(503, "Account deletion could not be completed.")

    def delete(self, owner, request, headers):
        if not isinstance(request, dict) or set(request) != {"confirm", "password"} or request.get("confirm") != "DELETE":
            raise DailyError(400, "Confirm permanent deletion by typing DELETE.")
        password = request["password"]
        if not isinstance(password, str) or not 1 <= len(password) <= 1024:
            raise DailyError(400, "Enter your current password.")
        try:
            if not owner.startswith("user:") or str(uuid.UUID(owner[5:])) != owner[5:]:
                raise ValueError()
        except (ValueError, TypeError, AttributeError):
            raise DailyError(401, "Sign in to delete your account.") from None
        if not self.connected():
            raise DailyError(503, "Account deletion is unavailable here. Your account has not been deleted.")
        if self.delete_identity == self.postgres_identity and os.getenv("PRETIUM_DATABASE_SCHEMA", "financelabs") != "financelabs":
            raise DailyError(503, "Permanent account deletion is disabled for isolated test schemas.")
        self.reauthenticate(owner, password, headers)
        with self.results.connect() as db:
            purge_application(db, owner, self.competitive)
            self.delete_identity(db, owner)
        return {"deleted": True}
