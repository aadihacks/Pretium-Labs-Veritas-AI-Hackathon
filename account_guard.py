"""Transaction-level deletion barrier for authenticated request work."""
import hashlib
from contextvars import ContextVar


REQUEST_OWNER = ContextVar("account_request_owner", default="")
REQUEST_SESSION_CREATED = ContextVar("account_session_created", default=None)


def owner_digest(owner):
    return hashlib.sha256(owner.encode()).hexdigest()


def schema(db):
    db.execute("""CREATE TABLE IF NOT EXISTS account_deletions (
        owner_hash TEXT PRIMARY KEY, deleted_at TEXT NOT NULL)""")


def check(db, owner=None):
    owner = REQUEST_OWNER.get() if owner is None else owner
    if not owner or not owner.startswith("user:"):
        return
    schema(db)
    if db.execute("SELECT 1 FROM account_deletions WHERE owner_hash=?", (owner_digest(owner),)).fetchone():
        from daily_puzzles import DailyError
        error = DailyError(401, "This account has been deleted. Sign out on this device.")
        error.code = "account_deleted"
        raise error
    created = REQUEST_SESSION_CREATED.get()
    if created is not None:
        from admin_auth import check_cutoff
        check_cutoff(db, owner, created)
