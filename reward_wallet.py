"""Transactional account wallet. Browser balances and eligibility are never inputs."""
import json
import uuid
from datetime import datetime, timezone
from time import time

from daily_puzzles import DailyError
from ranked_rules import betting_deadline, ranked_puzzle_ids
from result_storage import StorageBudget, METADATA_BYTES

MAX_COINS = 9007199254740991
QUESTS = {"free": (3, 50), "correct": (3, 75), "daily": (1, 100)}


def require(ok, message="Invalid wallet request.", status=409):
    if not ok:
        raise DailyError(status, message)


class RewardWallet:
    @staticmethod
    def schema(db):
        db.execute("""CREATE TABLE IF NOT EXISTS wallet_claims (
            owner TEXT NOT NULL, source TEXT NOT NULL, PRIMARY KEY(owner,source))""")
        db.execute("""CREATE TABLE IF NOT EXISTS wallet_ranked (
            owner TEXT NOT NULL, id TEXT NOT NULL, puzzle_id TEXT NOT NULL, status TEXT NOT NULL,
            stake INTEGER NOT NULL DEFAULT 0, choice TEXT NOT NULL DEFAULT '', cycle INTEGER NOT NULL DEFAULT 1,
            PRIMARY KEY(owner,id))""")
        db.execute("CREATE TABLE IF NOT EXISTS wallet_profiles (owner TEXT PRIMARY KEY, nickname TEXT NOT NULL)")

    @staticmethod
    def balance(db, owner):
        return db.execute("SELECT coalesce(sum(coins),0) FROM result_rewards WHERE owner=?", (owner,)).fetchone()[0]

    @classmethod
    def credit(cls, db, owner, source, kind, amount):
        if db.execute("SELECT 1 FROM result_rewards WHERE owner=? AND source=? AND kind=?", (owner, source, kind)).fetchone():
            return 0
        require(type(amount) is int and 0 <= cls.balance(db, owner) + amount <= MAX_COINS, "Not enough coins, or coin balance limit reached.")
        if kind not in {"refund", "payout"}:
            # Entry reserves its eventual refund/payout before any debit. Those
            # accepted obligations must still finish when new activity is full.
            size = METADATA_BYTES * (3 if kind == "entry" else 1)
            StorageBudget(db, "guest_activity" if owner.startswith("guest:") else "activity").reserve("wallet:" + source + ":" + kind, owner, size)
        db.execute("INSERT INTO result_rewards VALUES (?,?,?,0,?,?)",
                   (owner, source, kind, amount, datetime.now(timezone.utc).isoformat()))
        return amount

    @classmethod
    def refund(cls, db, owner, row):
        if not row or row["status"] != "open":
            return 0
        source = f"wallet:ranked:{row['id']}:{row['cycle']}"
        amount = cls.credit(db, owner, source, "refund", 100 + row["stake"])
        db.execute("UPDATE wallet_ranked SET status='refunded' WHERE owner=? AND id=?", (owner, row["id"]))
        return amount

    @classmethod
    def settle(cls, db, owner, puzzle_id, correct=None):
        row = db.execute("SELECT * FROM wallet_ranked WHERE owner=? AND puzzle_id=?", (owner, puzzle_id)).fetchone()
        if not row or row["status"] != "open":
            return 0
        if correct is None:
            return cls.refund(db, owner, row)
        amount = cls.credit(db, owner, f"wallet:ranked:{row['id']}:{row['cycle']}", "payout", row["stake"] * 2 if correct else 0)
        db.execute("UPDATE wallet_ranked SET status='settled' WHERE owner=? AND id=?", (owner, row["id"]))
        return amount

    @classmethod
    def read(cls, db, owner):
        # Unanswered entries expire safely, even if the browser disappeared.
        for row in db.execute("""SELECT w.*,p.payload FROM wallet_ranked w JOIN result_puzzles p ON p.id=w.puzzle_id
                WHERE w.owner=? AND w.status='open' AND w.choice=''""", (owner,)).fetchall():
            if time() >= betting_deadline(json.loads(row["payload"])):
                cls.refund(db, owner, row)
        date = datetime.now(timezone.utc).date().isoformat()
        counts = db.execute("""SELECT count(CASE WHEN a.mode='free' AND a.correct=1 THEN 1 END),
            count(CASE WHEN a.mode IN ('free','daily','ranked') AND a.correct=1 THEN 1 END),
            count(CASE WHEN a.mode='daily' AND json_extract(p.payload,'$.date')=? THEN 1 END)
            FROM result_attempts a LEFT JOIN result_puzzles p ON p.id=a.puzzle_id
            WHERE a.owner=? AND a.trust='server' AND a.status='completed' AND substr(a.at,1,10)=?
            AND coalesce(json_extract(a.payload,'$.rewardEligible'),1)=1""", (date, owner, date)).fetchone()
        claims = [r[0] for r in db.execute("SELECT source FROM wallet_claims WHERE owner=?", (owner,))]
        nickname = db.execute("SELECT nickname FROM wallet_profiles WHERE owner=?", (owner,)).fetchone()
        return {"version": 2, "balance": cls.balance(db, owner), "seen": [],
                "claimedLevels": [int(s[6:]) for s in claims if s.startswith("level:")],
                "ranked": [dict(r) for r in db.execute("SELECT id,status,stake,choice FROM wallet_ranked WHERE owner=?", (owner,))],
                "nickname": nickname[0] if nickname else None,
                "day": {"date": date, "progress": {k: min(QUESTS[k][0], n) for k, n in zip(QUESTS, counts)},
                        "claimed": [k for k in QUESTS if f"quest:{date}:{k}" in claims]}}

    @classmethod
    def act(cls, db, owner, request):
        action = request.get("action")
        from admin_controls import guard
        # Refund processing remains available during freezes and restrictions.
        if action not in {"refund", "nickname"}:
            guard(db, owner, "ranked" if action in {"entry", "bet"} else "free", new=action == "entry",
                  puzzle_id=request.get("puzzleId"))
        state = cls.read(db, owner)
        if action in {"level", "quest"}:
            if action == "level":
                level = request.get("level")
                require(type(level) is int and 1 <= level <= 120)
                amount = 500 if (level - 1) % 20 == 0 else 250 if (level - 1) % 20 == 8 else 0
                xp = db.execute("SELECT coalesce(sum(xp),0) FROM result_rewards WHERE owner=?", (owner,)).fetchone()[0]
                require(amount and xp >= (level - 1) * level * 250, "This level reward is locked.")
                source = f"level:{level}"
            else:
                quest = request.get("quest")
                require(isinstance(quest, str) and quest in QUESTS)
                target, amount = QUESTS[quest]
                require(state["day"]["progress"][quest] >= target, "This quest is not complete.")
                source = f"quest:{state['day']['date']}:{quest}"
            if db.execute("SELECT 1 FROM wallet_claims WHERE owner=? AND source=?", (owner, source)).fetchone():
                return 0
            db.execute("INSERT INTO wallet_claims VALUES (?,?)", (owner, source))
            return cls.credit(db, owner, "wallet:" + source, "claim", amount)
        if action == "nickname":
            nickname, request_id = request.get("nickname"), request.get("requestId")
            require(isinstance(nickname, str) and 1 <= len(nickname.strip()) <= 15)
            require(isinstance(request_id, str) and 16 <= len(request_id) <= 100)
            source = "wallet:nickname:" + request_id
            if db.execute("SELECT 1 FROM result_rewards WHERE owner=? AND source=? AND kind='purchase'", (owner, source)).fetchone():
                return 0
            if state["nickname"] == nickname.strip():
                return 0
            cls.credit(db, owner, source, "purchase", -50)
            db.execute("INSERT INTO wallet_profiles VALUES (?,?) ON CONFLICT(owner) DO UPDATE SET nickname=excluded.nickname", (owner, nickname.strip()))
            return -50
        require(action in {"entry", "bet", "refund"})
        round_id = request.get("id")
        require(isinstance(round_id, str) and 1 <= len(round_id) <= 280)
        row = db.execute("SELECT * FROM wallet_ranked WHERE owner=? AND id=?", (owner, round_id)).fetchone()
        if action == "entry":
            puzzle_id = request.get("puzzleId")
            puzzle = db.execute("""SELECT p.payload FROM result_puzzles p JOIN result_assignments a ON a.puzzle_id=p.id
                WHERE a.owner=? AND a.mode='ranked' AND p.id=?""", (owner, puzzle_id)).fetchone()
            if not puzzle:
                from misconduct import rejection
                raise rejection(403, "This Live puzzle was not assigned to your account.", "unassigned_puzzle")
            puzzle = json.loads(puzzle[0])
            require(round_id == f"{puzzle['ticker']}:{puzzle['liveInterval']}:{puzzle['targetStart']}")
            require(time() < betting_deadline(puzzle), "Betting closed five seconds before this candle started. Load a new Ranked puzzle.")
            aliases = ranked_puzzle_ids(puzzle)
            placeholders = ",".join("?" for _ in aliases)
            require(not db.execute(f"SELECT 1 FROM result_attempts WHERE owner=? AND mode='ranked' AND puzzle_id IN ({placeholders})",
                                   (owner, *aliases)).fetchone(), "This round has already been played.")
            require(not db.execute(f"""SELECT 1 FROM wallet_ranked WHERE owner=? AND puzzle_id IN ({placeholders})
                AND id<>? AND status='open'""", (owner, *aliases, round_id)).fetchone(),
                "This Ranked candle already has an entry under another symbol alias.")
            if row and row["status"] == "open":
                return 0
            require(not row or row["status"] == "refunded")
            require(not db.execute("SELECT 1 FROM wallet_ranked WHERE owner=? AND status='open' AND id<>?",
                                   (owner, round_id)).fetchone(),
                    "Finish your paid Ranked round before entering another.")
            cycle = row["cycle"] + 1 if row else 1
            require(cycle <= 16, "Too many entry changes for this candle. Load the next Ranked puzzle.", 429)
            cls.credit(db, owner, f"wallet:ranked:{round_id}:{cycle}", "entry", -100)
            db.execute("INSERT OR REPLACE INTO wallet_ranked VALUES (?,?,?,'open',0,'',?)", (owner, round_id, puzzle_id, cycle))
            return -100
        require(row, "Pay the Ranked entry fee first.")
        if action == "refund":
            attempt = db.execute("SELECT status FROM result_attempts WHERE owner=? AND puzzle_id=?", (owner, row["puzzle_id"])).fetchone()
            require(not attempt or attempt[0] == "void", "A submitted prediction cannot be cancelled.")
            if row["status"] == "open" and not attempt:
                puzzle = json.loads(db.execute("SELECT payload FROM result_puzzles WHERE id=?", (row["puzzle_id"],)).fetchone()[0])
                require(time() >= betting_deadline(puzzle),
                        "Your buy-in commits you to this Ranked round. Predict before betting closes.")
            return cls.refund(db, owner, row)
        puzzle = json.loads(db.execute("SELECT payload FROM result_puzzles WHERE id=?", (row["puzzle_id"],)).fetchone()[0])
        require(row["status"] == "open" and not row["choice"] and time() < betting_deadline(puzzle), "Betting is closed.")
        amount = request.get("amount")
        require(type(amount) is int and 1 <= amount <= MAX_COINS // 2)
        if row["stake"] == amount:
            return 0
        prefix = f"wallet:ranked:{round_id}:"
        changes = db.execute("""SELECT count(*) FROM result_rewards WHERE owner=? AND kind='bet'
            AND substr(source,1,length(?))=?""", (owner, prefix, prefix)).fetchone()[0]
        require(changes < 32, "Too many stake changes for this candle. Your current stake is still saved.", 429)
        # Replacements debit or refund only the difference. Retrying the current
        # amount is a no-op; distinct edits need distinct ledger sources.
        difference = row["stake"] - amount
        cls.credit(db, owner, f"wallet:ranked:{round_id}:{row['cycle']}:bet:{uuid.uuid4()}", "bet", difference)
        db.execute("UPDATE wallet_ranked SET stake=? WHERE owner=? AND id=?", (amount, owner, round_id))
        return difference
