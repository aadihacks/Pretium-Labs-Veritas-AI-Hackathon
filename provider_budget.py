"""Transactional provider admission; request parameters never select a workload."""
from contextlib import contextmanager
from contextvars import ContextVar
import hashlib
import json
import sqlite3

from account_database import cloud_database_enabled, connect_database
from market_data import MarketDataBusy

_WORK = ContextVar("provider_work", default=("public", "", ""))


@contextmanager
def provider_work(kind, owner="", peer=""):
    if kind not in {"public", "interactive", "system", "settlement"}:
        raise ValueError("Invalid provider workload")
    if kind == "interactive" and not owner.startswith("user:"):
        raise ValueError("Interactive work requires a verified account")
    token = _WORK.set((kind, owner, peer))
    try:
        yield
    finally:
        _WORK.reset(token)


class SharedProviderBudget:
    """One bounded rolling log per provider, shared by database users/replicas.

    BEGIN IMMEDIATE and the existing PostgreSQL advisory transaction lock make
    admission atomic. Commit before network access; failures still spend quota.
    The database clock avoids differences between replica clocks.
    """
    def __init__(self, path, provider, per_minute):
        if provider not in {"alpaca", "yahoo"} or not 4 <= per_minute <= 10000:
            raise ValueError("Invalid provider budget (expected 4..10000/minute)")
        self.path, self.provider, self.per_minute = path, provider, per_minute

    @contextmanager
    def transaction(self):
        db = None
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            db = connect_database(self.path)
            db.execute("BEGIN IMMEDIATE")
            from account_guard import check as check_deleted_account
            check_deleted_account(db)
            # The cloud adapter automatically enables RLS; no client policies.
            db.execute("CREATE TABLE IF NOT EXISTS market_provider_budget (provider TEXT PRIMARY KEY, payload TEXT NOT NULL)")
            db.execute("INSERT OR IGNORE INTO market_provider_budget(provider,payload) VALUES (?,?)",
                       (self.provider, '{"calls":[],"blocked":0}'))
            yield db
            db.commit()
        except (sqlite3.Error, OSError):
            if db is not None:
                db.rollback()
            # Database failure must never fall back to process-local admission.
            raise MarketDataBusy(5) from None
        except Exception:
            if db is not None:
                db.rollback()
            raise
        finally:
            if db is not None:
                db.close()

    @staticmethod
    def now(db):
        sql = ("SELECT EXTRACT(EPOCH FROM clock_timestamp())" if cloud_database_enabled()
               else "SELECT (julianday('now') - 2440587.5) * 86400.0")
        return float(db.execute(sql).fetchone()[0])

    def load(self, db):
        return json.loads(db.execute("SELECT payload FROM market_provider_budget WHERE provider=?",
                                     (self.provider,)).fetchone()[0])

    def save(self, db, state):
        db.execute("UPDATE market_provider_budget SET payload=? WHERE provider=?",
                   (json.dumps(state, separators=(",", ":")), self.provider))

    def take(self):
        kind, owner, peer = _WORK.get()
        owner = hashlib.sha256(owner.encode()).hexdigest() if owner else ""
        peer = hashlib.sha256(peer.encode()).hexdigest() if peer else ""
        with self.transaction() as db:
            now = self.now(db)
            state = self.load(db)
            calls = [c for c in state["calls"] if c[0] > now - 60]
            if state["blocked"] > now:
                raise MarketDataBusy(state["blocked"] - now)
            # Public work cannot borrow interactive or settlement capacity.
            # All non-settlement work combined leaves at least 25% reserved.
            limits = [(calls, self.per_minute)]
            if kind != "settlement":
                limits.append(([c for c in calls if c[1] != "settlement"], self.per_minute * 3 // 4))
            if kind in {"public", "interactive"}:
                limits.append(([c for c in calls if c[1] in {"public", "interactive"} and c[3] == peer], max(1, self.per_minute // 3)))
            if kind == "public":
                limits.append(([c for c in calls if c[1] == "public"], max(1, self.per_minute // 10)))
            elif kind == "interactive":
                limits.append(([c for c in calls if c[1] == "interactive" and c[2] == owner], max(1, self.per_minute // 6)))
            for matching, limit in limits:
                if len(matching) >= limit:
                    raise MarketDataBusy(min(c[0] for c in matching) + 60 - now)
            calls.append([now, kind, owner, peer])
            state["calls"] = calls
            self.save(db, state)

    def pause(self, seconds):
        with self.transaction() as db:
            now = self.now(db)
            state = self.load(db)
            state["blocked"] = max(state["blocked"], now + min(86400, max(1, seconds)))
            self.save(db, state)
