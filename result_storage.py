"""Transactional write admission and retained-allocation capacity.

The ledger charges serialized payload plus metadata headroom. It counts logical
allocations, not provider disk usage; database capacity still needs monitoring.
All callers must hold the stores' existing database writer transaction.
"""
import os

from daily_puzzles import DailyError
from account_database import cloud_database_enabled


# (account records, account bytes, global records, global bytes). Independent
# legacy/activity allowances cannot consume the snapshot allowance for new games.
LIMITS = {
    "seen": (100000, 32 * 1024**2, 1000000, 256 * 1024**2),
    "guest_seen": (10000, 4 * 1024**2, 100000, 32 * 1024**2),
    "guest_snapshot": (256, 4 * 1024**2, 20000, 64 * 1024**2),
    "guest_activity": (512, 1024**2, 20000, 16 * 1024**2),
    "paper": (20000, 8 * 1024**2, 200000, 64 * 1024**2),
    "snapshot": (10000, 16 * 1024**2, 100000, 192 * 1024**2),
    "legacy": (5000, 8 * 1024**2, 25000, 32 * 1024**2),
    "activity": (20000, 4 * 1024**2, 100000, 16 * 1024**2),
}
METADATA_BYTES = 1024
LIVE_RESERVE_BYTES = 4096
ADMISSION_SECONDS = 24 * 60 * 60
UNANSWERED_SECONDS = 3600
ROLLING_KINDS = {"snapshot", "activity", "seen"}
# Retention and traffic are independent allowances. Daily overrides must not
# silently raise the total retained capacity; saved objects are never pruned.
RETAINED_LIMITS = {kind: LIMITS[kind] for kind in ROLLING_KINDS}


def storage_now(db):
    sql = ("SELECT EXTRACT(EPOCH FROM clock_timestamp())" if cloud_database_enabled()
           else "SELECT (julianday('now') - 2440587.5) * 86400.0")
    return float(db.execute(sql).fetchone()[0])


def retained_snapshot(alias="s"):
    # A pending prediction is already accepted work. Its candle-size reservation
    # and every later completed reveal stay durable; only admission expires.
    return f"""EXISTS (SELECT 1 FROM result_attempts a JOIN result_puzzles p ON p.id=a.puzzle_id
        WHERE a.trust='server' AND ({alias}.owner='' OR a.owner={alias}.owner)
        AND (p.id=substr({alias}.object_id,8) AND {alias}.object_id LIKE 'puzzle:%'
             OR p.chart_id=substr({alias}.object_id,7) AND {alias}.object_id LIKE 'chart:%'))"""


class StorageCapacityError(DailyError):
    code = "storage_capacity"

    def __init__(self):
        super().__init__(429, "New history requests are temporarily at capacity. Existing results are still available.")


def snapshot_bytes(object_id, payload):
    # Live settlement can always append its one outcome candle after admission.
    copies = 2 if object_id.startswith("puzzle:competitive:") else 1
    reserve = LIVE_RESERVE_BYTES if object_id.startswith("puzzle:live-v") else 0
    return len(payload.encode("utf-8")) * copies + METADATA_BYTES + reserve


class StorageBudget:
    @staticmethod
    def schema(db):
        present = db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='result_storage_objects'").fetchone()
        db.execute("""CREATE TABLE IF NOT EXISTS result_storage_objects (
            kind TEXT NOT NULL, object_id TEXT NOT NULL, owner TEXT NOT NULL,
            payload_bytes INTEGER NOT NULL, PRIMARY KEY(kind,object_id,owner))""")
        db.execute("CREATE INDEX IF NOT EXISTS result_storage_owner ON result_storage_objects(kind,owner)")
        db.execute("CREATE INDEX IF NOT EXISTS result_storage_chart_lookup ON result_puzzles(chart_id)")
        admission_present = db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='result_storage_admission'").fetchone()
        db.execute("""CREATE TABLE IF NOT EXISTS result_storage_admission (
            kind TEXT NOT NULL, object_id TEXT NOT NULL, owner TEXT NOT NULL,
            admitted_at REAL NOT NULL, payload_bytes INTEGER NOT NULL,
            PRIMARY KEY(kind,object_id,owner,admitted_at))""")
        db.execute("CREATE INDEX IF NOT EXISTS result_storage_recent ON result_storage_admission(kind,admitted_at,owner)")
        db.execute("CREATE INDEX IF NOT EXISTS result_storage_admission_object ON result_storage_admission(kind,object_id,owner,admitted_at)")
        if present:
            if not admission_present:
                # Existing completed history is not new traffic. Give outstanding
                # snapshots a full grace period before considering retirement.
                StorageBudget.seed_outstanding(db)
            return
        # The adapter translates this SQLite byte-length expression to
        # octet_length on PostgreSQL, including for existing Unicode JSON.
        puzzle_size = "length(CAST(p.payload AS BLOB))*(CASE WHEN p.id LIKE 'competitive:%' THEN 2 ELSE 1 END)+1024+(CASE WHEN p.id LIKE 'live-v%' THEN 4096 ELSE 0 END)"
        db.execute("""INSERT INTO result_storage_objects SELECT 'snapshot','chart:'||id,'',length(CAST(payload AS BLOB))+1024
            FROM result_charts""")
        db.execute(f"""INSERT INTO result_storage_objects SELECT 'snapshot','puzzle:'||p.id,'',{puzzle_size}
            FROM result_puzzles p""")
        db.execute(f"""INSERT INTO result_storage_objects SELECT 'snapshot','puzzle:'||p.id,links.owner,{puzzle_size}
            FROM result_puzzles p JOIN (SELECT owner,puzzle_id FROM result_assignments
                UNION SELECT owner,puzzle_id FROM result_attempts WHERE puzzle_id IS NOT NULL) links ON links.puzzle_id=p.id""")
        db.execute("""INSERT INTO result_storage_objects SELECT 'legacy',id,owner,length(CAST(payload AS BLOB))+1024
            FROM result_attempts WHERE trust='legacy'""")
        db.execute("""INSERT INTO result_storage_objects SELECT 'activity','review:'||retry_id,owner,1024
            FROM result_review_attempts""")
        db.execute("""INSERT INTO result_storage_objects SELECT 'activity','wallet:'||source||':'||kind,owner,
            CASE WHEN kind='entry' THEN 3072 ELSE 1024 END FROM result_rewards
            WHERE kind IN ('entry','bet','claim','purchase')""")
        if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='competitive_sessions'").fetchone():
            db.execute("""INSERT INTO result_storage_objects SELECT 'activity','session:'||id,'',4096
                FROM competitive_sessions""")
            db.execute("""INSERT INTO result_storage_objects SELECT 'activity','session:'||session_id,owner,4096
                FROM competitive_seats""")
            db.execute("""INSERT INTO result_storage_objects SELECT 'activity','queue:'||owner,owner,1024
                FROM competitive_queue""")
        if not admission_present:
            StorageBudget.seed_outstanding(db)

    @staticmethod
    def seed_outstanding(db):
        db.execute(f"""INSERT INTO result_storage_admission
            SELECT s.kind,s.object_id,s.owner,?,s.payload_bytes FROM result_storage_objects s
            WHERE s.kind='snapshot' AND NOT {retained_snapshot()}""", (storage_now(db),))

    def __init__(self, db, kind):
        self.db, self.kind = db, kind
        self.now = storage_now(db)
        self.rolling = kind in ROLLING_KINDS
        self.retire_cancelled_lobbies(db, self.now)
        if kind == "snapshot":
            self.retire_unanswered(db, self.now)
        # Expiring admission receipts never deletes result data or idempotency
        # identities. Outstanding snapshots keep their timestamp for safe expiry.
        db.execute("""DELETE FROM result_storage_admission WHERE admitted_at<? AND kind NOT IN ('snapshot','activity')""",
                   (self.now - ADMISSION_SECONDS,))
        db.execute("""DELETE FROM result_storage_admission WHERE admitted_at<? AND kind='activity'
            AND (object_id NOT LIKE 'session:%' OR NOT EXISTS (SELECT 1 FROM result_storage_objects s
                WHERE s.kind='activity' AND s.object_id=result_storage_admission.object_id))""", (self.now - ADMISSION_SECONDS,))
        db.execute(f"""DELETE FROM result_storage_admission WHERE admitted_at<? AND kind='snapshot'
            AND (NOT EXISTS (SELECT 1 FROM result_storage_objects s WHERE s.kind='snapshot'
                AND s.object_id=result_storage_admission.object_id AND s.owner=result_storage_admission.owner)
            OR EXISTS (SELECT 1 FROM result_storage_objects s WHERE s.kind='snapshot'
                AND s.object_id=result_storage_admission.object_id AND s.owner=result_storage_admission.owner
                AND {retained_snapshot()}))""", (self.now - ADMISSION_SECONDS,))
        self.table = "result_storage_admission" if self.rolling else "result_storage_objects"
        self.recent = " AND admitted_at>=?" if self.rolling else ""
        self.parameters = (kind, self.now - ADMISSION_SECONDS) if self.rolling else (kind,)
        self.global_usage = tuple(db.execute("""SELECT count(*),coalesce(sum(payload_bytes),0)
            FROM """ + self.table + " WHERE kind=?" + self.recent, self.parameters).fetchone())
        self.accounts = {}
        self.retained_accounts = {}
        if self.rolling:
            self.retained_global_usage = tuple(db.execute("""SELECT count(*),coalesce(sum(payload_bytes),0)
                FROM result_storage_objects WHERE kind=?""", (kind,)).fetchone())
        names = ("ACCOUNT_RECORDS", "ACCOUNT_BYTES", "GLOBAL_RECORDS", "GLOBAL_BYTES")
        try:
            self.limits = tuple(int(os.getenv(f"PRETIUM_STORAGE_{kind.upper()}_{name}", default))
                                for name, default in zip(names, LIMITS[kind]))
            self.retained_limits = (tuple(int(os.getenv(f"PRETIUM_STORAGE_{kind.upper()}_RETAINED_{name}", default))
                                          for name, default in zip(names, RETAINED_LIMITS[kind]))
                                    if self.rolling else self.limits)
            if any(value <= 0 for value in (*self.limits, *self.retained_limits)):
                raise ValueError
        except (ValueError, TypeError):
            raise DailyError(503, "Account storage limits are unavailable.") from None

    @staticmethod
    def retire_unanswered(db, now):
        # Bounded cleanup of old unaccepted objects only. Pending/finished
        # predictions, paid Ranked entries and active match rounds are protected.
        competitive = db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='competitive_rounds'").fetchone()
        active_round = ("""AND NOT EXISTS (SELECT 1 FROM competitive_rounds cr JOIN competitive_sessions c ON c.id=cr.session_id
            WHERE s.object_id='puzzle:'||cr.puzzle_id AND c.status NOT IN ('cancelled','completed'))""" if competitive else "")
        rows = db.execute(f"""SELECT s.object_id,s.owner FROM result_storage_objects s
            JOIN result_storage_admission r ON r.kind=s.kind AND r.object_id=s.object_id AND r.owner=s.owner
            WHERE s.kind='snapshot' AND r.admitted_at<? AND NOT {retained_snapshot()}
            AND NOT EXISTS (SELECT 1 FROM result_storage_admission fresh WHERE fresh.kind=s.kind
                AND fresh.object_id=s.object_id AND fresh.owner=s.owner AND fresh.admitted_at>=?)
            AND NOT EXISTS (SELECT 1 FROM result_assignments a JOIN result_puzzles p ON p.id=a.puzzle_id
                WHERE (s.owner='' OR a.owner=s.owner) AND a.issued_at>=?
                AND (s.object_id='puzzle:'||p.id OR s.object_id='chart:'||p.chart_id))
            AND NOT EXISTS (SELECT 1 FROM wallet_ranked w JOIN result_puzzles p ON p.id=w.puzzle_id
                WHERE (s.owner='' OR w.owner=s.owner) AND w.status='open'
                AND (s.object_id='puzzle:'||p.id OR s.object_id='chart:'||p.chart_id))
            AND (s.owner<>'' OR s.object_id NOT LIKE 'chart:%'
                OR NOT EXISTS (SELECT 1 FROM result_puzzles p WHERE s.object_id='chart:'||p.chart_id))
            {active_round}
            GROUP BY s.object_id,s.owner ORDER BY min(r.admitted_at) LIMIT 256""", (now - UNANSWERED_SECONDS,) * 3).fetchall()
        for row in rows:
            object_id, owner = row
            if object_id.startswith("puzzle:"):
                puzzle_id = object_id[7:]
                saved = db.execute("SELECT payload FROM result_puzzles WHERE id=?", (puzzle_id,)).fetchone()
                if saved:
                    import json
                    from result_history import ResultStore
                    owners = db.execute("SELECT owner FROM result_assignments WHERE puzzle_id=?" + (" AND owner=?" if owner else ""),
                                        (puzzle_id, owner) if owner else (puzzle_id,)).fetchall()
                    try:
                        for assigned in owners:
                            ResultStore.remember_seen(db, assigned[0], json.loads(saved[0]))
                    except StorageCapacityError:
                        # Keep the old assignment when its seen identity cannot
                        # be retained. Cleanup must not block saved-chart retries.
                        continue
                db.execute("DELETE FROM result_assignments WHERE puzzle_id=?" + (" AND owner=?" if owner else ""),
                           (puzzle_id, owner) if owner else (puzzle_id,))
                if not owner:
                    db.execute("DELETE FROM result_puzzles WHERE id=?", (puzzle_id,))
            elif object_id.startswith("chart:"):
                if not owner:
                    db.execute("DELETE FROM result_charts WHERE id=?", (object_id[6:],))
            else:
                continue
            db.execute("DELETE FROM result_storage_objects WHERE kind='snapshot' AND object_id=?" + (" AND owner=?" if owner else ""),
                       (object_id, owner) if owner else (object_id,))
            # Recent admissions remain charged even after retirement. Otherwise
            # expiry/completion cycles could reset the write budget immediately.

    @staticmethod
    def retire_cancelled_lobbies(db, now):
        if not db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='competitive_sessions'").fetchone():
            return
        rows = db.execute("""SELECT c.id FROM competitive_sessions c JOIN result_storage_admission r
            ON r.kind='activity' AND r.object_id='session:'||c.id AND r.owner=''
            WHERE c.status='cancelled' AND r.admitted_at<?
            AND NOT EXISTS (SELECT 1 FROM result_matches m WHERE m.id=c.id)
            GROUP BY c.id ORDER BY min(r.admitted_at) LIMIT 256""", (now - ADMISSION_SECONDS,)).fetchall()
        for row in rows:
            for table in ("competitive_seats", "competitive_answers", "competitive_rounds"):
                db.execute("DELETE FROM " + table + " WHERE session_id=?", (row[0],))
            db.execute("DELETE FROM competitive_sessions WHERE id=?", (row[0],))
            db.execute("DELETE FROM result_storage_objects WHERE kind='activity' AND object_id=?", ("session:" + row[0],))

    def outstanding(self, owner=None):
        where = " AND s.owner=?" if owner is not None else ""
        return tuple(self.db.execute(f"""SELECT count(*),coalesce(sum(s.payload_bytes),0)
            FROM result_storage_objects s WHERE s.kind='snapshot' AND NOT {retained_snapshot()}{where}""",
            (owner,) if owner is not None else ()).fetchone())

    def reserve(self, object_id, owner, payload_bytes):
        if self.db.execute("SELECT 1 FROM result_storage_objects WHERE kind=? AND object_id=? AND owner=?",
                           (self.kind, object_id, owner)).fetchone():
            return
        if self.rolling:
            if owner not in self.retained_accounts:
                self.retained_accounts[owner] = tuple(self.db.execute("""SELECT count(*),coalesce(sum(payload_bytes),0)
                    FROM result_storage_objects WHERE kind=? AND owner=?""", (self.kind, owner)).fetchone())
            retained_own_rows, retained_own_bytes = self.retained_accounts[owner]
            retained_rows, retained_bytes = self.retained_global_usage
            if ((owner and (retained_own_rows + 1 > self.retained_limits[0] or retained_own_bytes + payload_bytes > self.retained_limits[1])) or
                    retained_rows + 1 > self.retained_limits[2] or retained_bytes + payload_bytes > self.retained_limits[3]):
                raise StorageCapacityError()
        if self.kind == "activity" and not object_id.startswith(("review:", "wallet:", "session:", "queue:")):
            # Other callers (for example account feedback) do not create game
            # history. Keep their cumulative limit rather than weakening it.
            prefix = object_id.split(":", 1)[0] + ":"
            rows, size = self.db.execute("""SELECT count(*),coalesce(sum(payload_bytes),0) FROM result_storage_objects
                WHERE kind='activity' AND substr(object_id,1,length(?))=?""", (prefix, prefix)).fetchone()
            own_rows, own_size = self.db.execute("""SELECT count(*),coalesce(sum(payload_bytes),0) FROM result_storage_objects
                WHERE kind='activity' AND owner=? AND substr(object_id,1,length(?))=?""", (owner, prefix, prefix)).fetchone()
            if own_rows + 1 > self.limits[0] or own_size + payload_bytes > self.limits[1] or rows + 1 > self.limits[2] or size + payload_bytes > self.limits[3]:
                raise StorageCapacityError()
        if owner not in self.accounts:
            self.accounts[owner] = tuple(self.db.execute("""SELECT count(*),coalesce(sum(payload_bytes),0)
                FROM """ + self.table + " WHERE kind=? AND owner=?" + self.recent,
                (self.kind, owner, self.now - ADMISSION_SECONDS) if self.rolling else (self.kind, owner)).fetchone())
        account_rows, account_bytes = self.accounts[owner]
        global_rows, global_bytes = self.global_usage
        if ((owner and (account_rows + 1 > self.limits[0] or account_bytes + payload_bytes > self.limits[1])) or
                global_rows + 1 > self.limits[2] or global_bytes + payload_bytes > self.limits[3]):
            raise StorageCapacityError()
        if self.kind == "snapshot":
            pending_rows, pending_bytes = self.outstanding(owner)
            total_rows, total_bytes = self.outstanding()
            if ((owner and (pending_rows + 1 > self.limits[0] or pending_bytes + payload_bytes > self.limits[1])) or
                    total_rows + 1 > self.limits[2] or total_bytes + payload_bytes > self.limits[3]):
                raise StorageCapacityError()
        self.db.execute("INSERT INTO result_storage_objects VALUES (?,?,?,?)",
                        (self.kind, object_id, owner, payload_bytes))
        if self.rolling:
            self.db.execute("INSERT INTO result_storage_admission VALUES (?,?,?,?,?)",
                            (self.kind, object_id, owner, self.now, payload_bytes))
        self.accounts[owner] = (account_rows + 1, account_bytes + payload_bytes)
        self.global_usage = (global_rows + 1, global_bytes + payload_bytes)
        if self.rolling:
            self.retained_accounts[owner] = (retained_own_rows + 1, retained_own_bytes + payload_bytes)
            self.retained_global_usage = (retained_rows + 1, retained_bytes + payload_bytes)
