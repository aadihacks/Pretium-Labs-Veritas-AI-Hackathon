"""Private account documents and server-executed paper portfolios.

Owner IDs come exclusively from the authenticated HTTP adapter. Documents are
user-authored content; neither documents nor legacy imports grant rewards.
"""
import hashlib
import json
import math
import re
from contextlib import contextmanager
from datetime import datetime, timezone

from daily_puzzles import DailyError
from result_storage import StorageBudget
from provider_budget import provider_work


def encoded(value):
    try:
        return json.dumps(value, separators=(",", ":"), sort_keys=True, allow_nan=False)
    except (ValueError, TypeError):
        raise DailyError(400, "Account values must contain valid finite numbers.") from None


def require(ok, message="Invalid account request.", status=400, *, signal=None):
    if not ok:
        from misconduct import rejection
        raise rejection(status, message, signal)


DOCUMENT_LIMITS = {"settings": 16384, "learning": 131072, "news": 32768,
                   "quant": 65536, "workspace": 131072}


class AccountData:
    def __init__(self, results, quote, lessons=(), packs=("covid",)):
        self.results, self.quote, self.lessons = results, quote, lessons
        self.scopes = {"live", *("pack:" + key for key in packs)}

    @contextmanager
    def connect(self):
        with self.results.connect() as db:
            self.schema(db)
            yield db

    @staticmethod
    def schema(db):
        for sql in (
            """CREATE TABLE IF NOT EXISTS account_documents (owner TEXT NOT NULL,
                kind TEXT NOT NULL, payload TEXT NOT NULL, version INTEGER NOT NULL,
                PRIMARY KEY(owner,kind))""",
            """CREATE TABLE IF NOT EXISTS account_lessons (owner TEXT NOT NULL,
                lesson INTEGER NOT NULL, completed_at TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
                PRIMARY KEY(owner,lesson))""",
            """CREATE TABLE IF NOT EXISTS account_learning_archives (owner TEXT NOT NULL,
                archived_at TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(owner,archived_at))""",
            """CREATE TABLE IF NOT EXISTS paper_portfolios (owner TEXT NOT NULL,
                scope TEXT NOT NULL, payload TEXT NOT NULL, version INTEGER NOT NULL,
                PRIMARY KEY(owner,scope))""",
            """CREATE TABLE IF NOT EXISTS paper_orders (owner TEXT NOT NULL,
                request_id TEXT NOT NULL, scope TEXT NOT NULL, intent TEXT NOT NULL,
                payload TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(owner,request_id))""",
            "CREATE INDEX IF NOT EXISTS paper_order_history ON paper_orders(owner,scope,created_at,request_id)",
        ):
            db.execute(sql)

    def state(self, owner):
        with self.connect() as db:
            documents = {r[0]: {"value": json.loads(r[1]), "version": r[2]}
                         for r in db.execute("SELECT kind,payload,version FROM account_documents WHERE owner=?", (owner,))}
            portfolios = {r[0]: {"value": json.loads(r[1]), "version": r[2]}
                          for r in db.execute("SELECT scope,payload,version FROM paper_portfolios WHERE owner=?", (owner,))}
            lessons = [r[0] for r in db.execute("SELECT lesson FROM account_lessons WHERE owner=? AND active=1", (owner,))]
        return {"documents": documents, "portfolios": portfolios, "lessons": lessons}

    def document(self, owner, request):
        require(set(request) == {"kind", "value", "version"})
        kind, value, version = request["kind"], request["value"], request["version"]
        require(kind in DOCUMENT_LIMITS and type(version) is int and version >= 0)
        require(isinstance(value, (dict, list)))
        if kind in {"settings", "learning", "quant", "workspace"}:
            require(isinstance(value, dict))
        else:
            require(isinstance(value, list))
        if kind == "news":
            require(len(value) <= 1000 and all(isinstance(item, str) and len(item) <= 200 for item in value))
        if kind == "settings":
            require(set(value) <= {"theme", "sound", "animations", "language", "randomizer", "accuracyModes", "drawingTools", "reviewHintViews"})
            require(value.get("theme", "light") in {"light", "dark", "gamify"})
            require(isinstance(value.get("animations", {}), dict) and isinstance(value.get("randomizer", {}), dict))
            require(isinstance(value.get("accuracyModes", []), list) and all(item in {"free", "ranked", "daily", "speed", "versus"} for item in value.get("accuracyModes", [])))
        if kind == "workspace":
            require(isinstance(value.get("symbol"), str) and isinstance(value.get("timeframe"), str))
            require(isinstance(value.get("drawings"), list) and isinstance(value.get("drawingHistory"), list))
        payload = encoded(value)
        require(len(payload.encode()) <= DOCUMENT_LIMITS[kind], "This saved item is too large.", 413)
        # Completion claims and entitlement fields never belong to this endpoint.
        if kind == "learning":
            require(isinstance(value, dict) and set(value) <= {"activity", "legacyCompleted"})
            require(isinstance(value.get("activity", {}), dict) and isinstance(value.get("legacyCompleted", []), list))
        with self.connect() as db:
            row = db.execute("SELECT version,payload FROM account_documents WHERE owner=? AND kind=?", (owner, kind)).fetchone()
            require((row[0] if row else 0) == version, "This data changed on another device. Refresh before saving.", 409)
            # Bounded global admission includes updates, not only new documents.
            total = db.execute("SELECT coalesce(sum(length(CAST(payload AS BLOB))),0) FROM account_documents").fetchone()[0]
            require(total - (len(row[1].encode()) if row else 0) + len(payload.encode()) <= 64 * 1024**2, "Account document storage is full.", 429)
            if row:
                db.execute("UPDATE account_documents SET payload=?,version=? WHERE owner=? AND kind=?", (payload, version + 1, owner, kind))
            else:
                db.execute("INSERT INTO account_documents VALUES (?,?,?,?)", (owner, kind, payload, 1))
        return {"kind": kind, "value": value, "version": version + 1}

    def lesson(self, owner, request):
        require(set(request) == {"lesson", "answers"})
        index, answers = request["lesson"], request["answers"]
        require(type(index) is int and 0 <= index < len(self.lessons))
        expected = self.lessons[index]
        require(isinstance(answers, list) and len(answers) == len(expected)
                and all(type(a) is int and 0 <= a < 3 for a in answers))
        require(answers == expected, "Answer every question correctly to complete this lesson.", 409)
        with self.connect() as db:
            from admin_controls import guard
            guard(db, owner, "lessons", new=True)
            db.execute("INSERT OR IGNORE INTO account_lessons VALUES (?,?,?,1)", (owner, index, datetime.now(timezone.utc).isoformat()))
            db.execute("UPDATE account_lessons SET active=1 WHERE owner=? AND lesson=?", (owner, index))
        return {"completed": index}

    def reset_learning(self, owner, request):
        require(request == {"confirm": "reset-learning"})
        with self.connect() as db:
            count = db.execute("SELECT count(*) FROM account_learning_archives WHERE owner=?", (owner,)).fetchone()[0]
            require(count < 20, "Learning reset archive limit reached.", 429)
            row = db.execute("SELECT payload,version FROM account_documents WHERE owner=? AND kind='learning'", (owner,)).fetchone()
            lessons = [r[0] for r in db.execute("SELECT lesson FROM account_lessons WHERE owner=? AND active=1", (owner,))]
            payload = encoded({"learning": json.loads(row[0]) if row else {}, "lessons": lessons})
            archived_at = datetime.now(timezone.utc).isoformat()
            StorageBudget(db, "paper").reserve("learning-reset:" + archived_at, owner, len(payload.encode()) + 1024)
            db.execute("INSERT INTO account_learning_archives VALUES (?,?,?)", (owner, archived_at, payload))
            db.execute("UPDATE account_lessons SET active=0 WHERE owner=?", (owner,))
            if row:
                db.execute("UPDATE account_documents SET payload=?,version=? WHERE owner=? AND kind='learning'", (encoded({"activity": {}}), row[1] + 1, owner))
        return {"reset": True}

    @staticmethod
    def empty():
        return {"cash": 100, "positions": {}, "orders": [], "realized": 0, "replayTime": 0}

    def scope(self, value):
        require(isinstance(value, str) and value in self.scopes)
        return value

    def history(self, owner, scope, offset=0):
        self.scope(scope)
        require(type(offset) is int and 0 <= offset <= 20000)
        with self.connect() as db:
            rows = db.execute("SELECT payload FROM paper_orders WHERE owner=? AND scope=? ORDER BY created_at DESC,request_id DESC LIMIT 100 OFFSET ?", (owner, scope, offset)).fetchall()
        return {"orders": [json.loads(r[0]) for r in rows], "nextOffset": offset + 100 if len(rows) == 100 else None}

    def export_history(self, owner, offset=0):
        require(type(offset) is int and 0 <= offset <= 100000)
        with self.connect() as db:
            rows = db.execute("SELECT * FROM result_attempts WHERE owner=? AND status='completed' ORDER BY at,id LIMIT 10 OFFSET ?", (owner, offset)).fetchall()
            records = [self.results._record(db, row, full=True) for row in rows]
        return {"records": records, "nextOffset": offset + 10 if len(rows) == 10 else None}

    def learning_archives(self, owner):
        with self.connect() as db:
            return [{"at": r[0], "value": json.loads(r[1])} for r in db.execute(
                "SELECT archived_at,payload FROM account_learning_archives WHERE owner=? ORDER BY archived_at", (owner,))]

    def trade(self, owner, request):
        require(set(request) <= {"id", "scope", "side", "symbol", "amount", "quantity", "time"})
        request_id = request.get("id", "")
        require(isinstance(request_id, str) and re.fullmatch(r"[a-zA-Z0-9-]{16,80}", request_id))
        scope, side = self.scope(request.get("scope")), request.get("side")
        require(side in {"buy", "sell", "sellAll", "advance"})
        intent = hashlib.sha256(encoded(request).encode()).hexdigest()
        with self.connect() as db:
            from admin_controls import guard
            guard(db, owner, "paper", new=True)
            prior = db.execute("SELECT intent,payload FROM paper_orders WHERE owner=? AND request_id=?", (owner, request_id)).fetchone()
            if prior:
                require(prior[0] == intent, "An order ID cannot be reused for a different order.", 409, signal="order_id_conflict")
                row = db.execute("SELECT payload,version FROM paper_portfolios WHERE owner=? AND scope=?", (owner, scope)).fetchone()
                return {"scope": scope, "value": json.loads(row[0]), "version": row[1], "order": json.loads(prior[1])}
            row = db.execute("SELECT payload,version FROM paper_portfolios WHERE owner=? AND scope=?", (owner, scope)).fetchone()
            baseline = json.loads(row[0]) if row else self.empty()
            version = row[1] if row else 0
        symbol = request.get("symbol", "")
        require(isinstance(symbol, str) and (side in {"sellAll", "advance"} or re.fullmatch(r"[A-Z0-9.^=/\-]{1,24}", symbol)))
        replay = request.get("time", 0)
        require(type(replay) is int and replay >= 0)
        if scope == "live":
            require(replay == 0 and side != "advance")
        else:
            require(replay >= baseline["replayTime"], "The replay cannot move backwards.", 409)
        symbols = list(baseline["positions"]) if side == "sellAll" else [symbol]
        if side == "advance":
            symbols = list(dict.fromkeys([symbol, *baseline["positions"]]))
        with provider_work("interactive", owner):
            quotes = {ticker: self.quote(scope, ticker, replay) for ticker in symbols}
        for quote in quotes.values():
            require(isinstance(quote.get("price"), (int, float)) and math.isfinite(quote["price"]) and quote["price"] > 0, "A verified positive price is required.", 503)
        with self.connect() as db:
            guard(db, owner, "paper", new=True)
            prior = db.execute("SELECT intent,payload FROM paper_orders WHERE owner=? AND request_id=?", (owner, request_id)).fetchone()
            if prior:
                require(prior[0] == intent, "Order ID conflict.", 409, signal="order_id_conflict")
                row = db.execute("SELECT payload,version FROM paper_portfolios WHERE owner=? AND scope=?", (owner, scope)).fetchone()
                return {"scope": scope, "value": json.loads(row[0]), "version": row[1], "order": json.loads(prior[1])}
            row = db.execute("SELECT payload,version FROM paper_portfolios WHERE owner=? AND scope=?", (owner, scope)).fetchone()
            require((row[1] if row else 0) == version, "Portfolio changed. Refresh and retry the order.", 409)
            account = json.loads(row[0]) if row else self.empty()
            count = db.execute("SELECT count(*) FROM paper_orders WHERE owner=?", (owner,)).fetchone()[0]
            total = db.execute("SELECT count(*) FROM paper_orders").fetchone()[0]
            require(count < 20000 and total < 200000, "Paper trade storage is full.", 429)
            trades = []
            for ticker, quote in quotes.items():
                if side == "advance":
                    position = account["positions"].get(ticker)
                    if position:
                        position.update(lastPrice=quote["price"], lastUpdated=quote.get("lastUpdated", ""), source=quote.get("source", ""))
                    continue
                price, position = quote["price"], account["positions"].get(ticker)
                if side == "buy":
                    require(position or len(account["positions"]) < 100, "A paper portfolio can hold at most 100 instruments.", 409)
                    amount = request.get("amount")
                    require(type(amount) in (int, float) and math.isfinite(amount) and .01 <= amount <= account["cash"], "That buy is larger than your paper cash or is invalid.", 409)
                    quantity = amount / price
                    old = position or {"quantity": 0, "avgCost": 0}
                    quantity_total = old["quantity"] + quantity
                    require(quantity_total < 1e15, "Position is too large.")
                    account["positions"][ticker] = {**quote, "ticker": ticker, "quantity": quantity_total,
                        "avgCost": (old["quantity"] * old["avgCost"] + amount) / quantity_total, "lastPrice": price}
                    account["cash"] -= amount
                else:
                    quantity = position["quantity"] if side == "sellAll" and position else request.get("quantity")
                    require(position and type(quantity) in (int, float) and math.isfinite(quantity) and 0 < quantity <= position["quantity"], "You cannot sell more than you hold.", 409)
                    amount = quantity * price
                    account["cash"] += amount
                    account["realized"] += (price - position["avgCost"]) * quantity
                    position["quantity"] -= quantity
                    if position["quantity"] <= 1e-12:
                        del account["positions"][ticker]
                trades.append({"id": request_id + ":" + ticker, "side": "buy" if side == "buy" else "sell",
                    "ticker": ticker, "name": quote.get("name", ticker), "quantity": quantity, "price": price,
                    "notional": amount, "at": datetime.fromtimestamp(replay, timezone.utc).isoformat() if replay else datetime.now(timezone.utc).isoformat(), "source": quote.get("source", "Verified market data")})
            account["cash"] = round(account["cash"], 10)
            account["orders"] = (trades + account["orders"])[:80]
            account["replayTime"] = replay
            response = {"scope": scope, "value": account, "version": version + 1, "order": {"id": request_id, "trades": trades}}
            payload = encoded(account)
            require(len(payload.encode()) < 262144, "Portfolio storage is full.", 429)
            total_bytes = db.execute("SELECT coalesce(sum(length(CAST(payload AS BLOB))),0) FROM paper_portfolios").fetchone()[0]
            require(total_bytes - (len(row[0].encode()) if row else 0) + len(payload.encode()) <= 32 * 1024**2, "Portfolio storage is full.", 429)
            StorageBudget(db, "paper").reserve(request_id, owner, len(encoded(response["order"]).encode()) + 1024)
            if row:
                db.execute("UPDATE paper_portfolios SET payload=?,version=? WHERE owner=? AND scope=?", (payload, version + 1, owner, scope))
            else:
                db.execute("INSERT INTO paper_portfolios VALUES (?,?,?,?)", (owner, scope, payload, 1))
            db.execute("INSERT INTO paper_orders VALUES (?,?,?,?,?,?)", (owner, request_id, scope, intent, encoded(response["order"]), datetime.now(timezone.utc).isoformat()))
        return response
