"""Narrow owner operations. No SQL console, impersonation or email editing."""
import hashlib
import json
import math
import uuid
from time import time
from datetime import datetime, timezone

import admin_controls as controls
from account_database import cloud_database_enabled
from daily_puzzles import DailyError
from reward_wallet import MAX_COINS


def require(ok, message="Invalid administration request.", status=400):
    if not ok:
        raise DailyError(status, message)


def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


class AdminStore:
    def __init__(self, results):
        self.results = results

    @staticmethod
    def player_id(value):
        try:
            return "user:" + str(uuid.UUID(str(value).removeprefix("user:")))
        except ValueError:
            raise DailyError(400, "Select an exact account ID.") from None

    @staticmethod
    def totals(db, owner):
        row = db.execute("SELECT coalesce(sum(xp),0),coalesce(sum(coins),0) FROM result_rewards WHERE owner=?", (owner,)).fetchone()
        return {"xp": row[0], "coins": row[1]}

    def lookup(self, db, query):
        require(isinstance(query, str) and len(query) <= 150)
        if cloud_database_enabled():
            rows = db.execute("SELECT id,email,username FROM financelabs.admin_lookup_players(?)", (query,)).fetchall()
            return [{"id": "user:" + str(r[0]), "email": r[1], "username": r[2] or "Player"} for r in rows]
        return [{"id": r[0], "username": "Local fixture", "email": ""} for r in db.execute("SELECT DISTINCT owner FROM result_rewards WHERE owner LIKE 'user:%' AND owner LIKE ? ORDER BY owner LIMIT 30", ("%" + query + "%",))]

    def evidence(self, db, owner):
        from examples.fair_play.analyzer import analyze
        from legacy_match_records import LegacyMatchRecords
        LegacyMatchRecords.schema(db)
        rows = db.execute("""SELECT a.*,p.payload puzzle,s.issued_at,v.count,v.seconds,c.at competitive_submitted FROM result_attempts a
            JOIN result_puzzles p ON p.id=a.puzzle_id
            JOIN result_assignments s ON s.owner=a.owner AND s.puzzle_id=a.puzzle_id AND s.mode=a.mode
            LEFT JOIN admin_visibility v ON v.owner=a.owner AND v.puzzle_id=a.puzzle_id AND v.mode=a.mode
            LEFT JOIN result_match_assignments m ON m.owner=a.owner AND m.puzzle_id=a.puzzle_id
            LEFT JOIN competitive_answers c ON c.owner=a.owner AND c.session_id=m.match_id AND c.round=m.round
            WHERE a.owner=? AND a.status='completed' AND a.trust='server'
            ORDER BY a.at DESC,a.id DESC LIMIT 2000""", (owner,)).fetchall()
        attempts, timeline = [], []
        for r in rows:
            p, metadata = json.loads(r["puzzle"]), json.loads(r["payload"])
            if metadata.get("matchGroup") or metadata.get("rewardEligible") is False:
                continue
            submitted = r["competitive_submitted"] if r["mode"] == "versus" and r["competitive_submitted"] is not None else metadata.get("submittedAt") or r["at"]
            entry = {"player_id": owner, "puzzle_id": r["puzzle_id"], "mode": r["mode"],
                     "category": str(p.get("asset") or "unknown"), "timeframe": str(p.get("timeframe") or "unknown"),
                     "correct": bool(r["correct"]), "issued_at": r["issued_at"], "submitted_at": submitted,
                     "tab_away_count": r["count"], "tab_away_seconds": r["seconds"]}
            attempts.append(entry)
            timeline.append({**entry, "id": r["id"], "telemetryTrust": "untrusted browser report" if r["count"] is not None else "unknown"})
        from misconduct import evidence as security_evidence
        return {"report": analyze(attempts), "timeline": timeline[:100], "sampleLimit": 2000,
                "security": security_evidence(db, owner),
                "label": "Review priority — never cheating probability. No automatic punishment."}

    def read(self, db, screen, params):
        controls.expire(db)
        if screen == "overview":
            return {"openCases": db.execute("SELECT count(*) FROM admin_cases WHERE closed IS NULL").fetchone()[0],
                    "restrictions": db.execute("SELECT count(*) FROM admin_restrictions WHERE revoked=0 AND (expires IS NULL OR expires>?)", (time(),)).fetchone()[0],
                    "jobs": [dict(r) for r in db.execute("SELECT * FROM admin_jobs ORDER BY cutoff DESC LIMIT 50")],
                    "mail": [dict(r) for r in db.execute("SELECT id,owner,state,error,at FROM admin_outbox ORDER BY at DESC LIMIT 50")],
                    "controls": [dict(r) for r in db.execute("SELECT * FROM admin_controls ORDER BY scope")],
                    "version": controls.version(db, "controls"), "policyVersion": controls.version(db, "policy"),
                    "policy": self.policy(db), "serverTime": time()}
        if screen == "players":
            return {"players": self.lookup(db, params.get("q", ""))}
        if screen in {"player", "evidence"}:
            owner = self.player_id(params.get("id", ""))
            if screen == "evidence":
                return self.evidence(db, owner)
            return {"id": owner, "version": controls.version(db, owner), "totals": self.totals(db, owner),
                    "restrictions": [dict(r) for r in db.execute("SELECT * FROM admin_restrictions WHERE owner=? ORDER BY at DESC LIMIT 50", (owner,))],
                    "session": dict(r) if (r := db.execute("SELECT * FROM admin_sessions WHERE owner=?", (owner,)).fetchone()) else {"locked": 0, "cutoff": 0},
                    "adjustments": [dict(r) for r in db.execute("SELECT * FROM admin_adjustments WHERE owner=? ORDER BY rowid DESC LIMIT 50", (owner,))],
                    "cases": [dict(r) for r in db.execute("SELECT * FROM admin_cases WHERE owner=? ORDER BY at DESC LIMIT 50", (owner,))]}
        if screen == "cases":
            return {"cases": [dict(r) for r in db.execute("SELECT * FROM admin_cases ORDER BY at DESC LIMIT 100")]}
        if screen == "audit":
            clauses, values = [], []
            for key in ("target", "action", "actor", "result"):
                if params.get(key):
                    clauses.append(key + "=?"); values.append(params[key])
            for key, op in (("from", ">="), ("to", "<=")):
                if params.get(key):
                    value = datetime.fromisoformat(params[key].replace("Z", "+00:00"))
                    require(value.tzinfo is not None, "Audit dates require a timezone.")
                    clauses.append("at" + op + "?"); values.append(value.timestamp())
            before = float(params.get("before", time() + 1))
            clauses.append("at<?"); values.append(before)
            rows = [dict(r) for r in db.execute("SELECT * FROM admin_audit WHERE " + " AND ".join(clauses) + " ORDER BY at DESC,id DESC LIMIT 100", tuple(values))]
            return {"events": rows, "nextBefore": rows[-1]["at"] if len(rows) == 100 else None}
        raise DailyError(404, "Unknown admin endpoint.")

    @staticmethod
    def policy(db):
        row = db.execute("SELECT amounts FROM admin_policies ORDER BY version DESC LIMIT 1").fetchone()
        return json.loads(row[0]) if row else controls.DEFAULT_REWARDS.copy()

    @staticmethod
    def audit(db, operation, actor, target, action, reason, result, detail):
        db.execute("INSERT INTO admin_audit VALUES (?,?,?,?,?,?,?,?)", (operation, actor, target, action, reason, result, encoded(detail), time()))

    def mutate(self, db, actor, request):
        require(isinstance(request, dict) and set(request) == {"requestId", "expectedVersion", "action", "target", "reason", "value"})
        request_id = str(uuid.UUID(request["requestId"]))
        action, target, value, reason = request["action"], request["target"], request["value"], request["reason"]
        require(isinstance(reason, str) and 3 <= len(reason.strip()) <= 1000, "Give a reason (3–1000 characters).")
        require(isinstance(action, str) and isinstance(target, str) and isinstance(value, dict))
        require(type(request["expectedVersion"]) is int and request["expectedVersion"] >= 0)
        intent = hashlib.sha256(encoded(request).encode()).hexdigest()
        prior = db.execute("SELECT actor,intent,result FROM admin_operations WHERE id=?", (request_id,)).fetchone()
        if prior:
            require(prior[0] == actor and prior[1] == intent, "Request ID conflict. Refresh before trying a new operation.", 409)
            return json.loads(prior[2])
        if action == "control":
            require(target == "controls")
        elif action == "policy":
            require(target == "policy")
        else:
            target = self.player_id(target)
            require(target != actor, "Owner self-moderation and economy changes are disabled.")
            if cloud_database_enabled():
                require(db.execute("SELECT financelabs.admin_user_exists(?)", (target[5:],)).fetchone()[0], "Account not found.", 404)
        require(controls.version(db, target) == request["expectedVersion"], "State changed. Refresh before confirming again.", 409)
        detail = {}
        if action == "restrict":
            require(set(value) == {"scope", "duration"} and value["scope"] in {"competitive", "all"})
            duration = value["duration"]
            require(duration is None or type(duration) is int and 60 <= duration <= 366 * 86400)
            db.execute("INSERT INTO admin_restrictions VALUES (?,?,?,?,0,?,?)", (request_id, target, value["scope"], time() + duration if duration else None, reason, time()))
            self.job(db, request_id, target, value["scope"])
            detail = {"jobId": request_id, "state": "pending"}
        elif action == "unrestrict":
            require(set(value) == {"id"})
            self.require_jobs_done(db)
            row = db.execute("SELECT id FROM admin_restrictions WHERE id=? AND owner=? AND revoked=0", (value["id"], target)).fetchone()
            require(row, "Active restriction not found.", 404)
            db.execute("UPDATE admin_restrictions SET revoked=1 WHERE id=?", (value["id"],))
        elif action in {"lock", "unlock", "invalidate", "recover"}:
            require(value == {})
            if action == "recover":
                require(cloud_database_enabled(), "Recovery email requires Supabase.", 503)
                verified = db.execute("SELECT email FROM financelabs.admin_verified_email(?)", (target[5:],)).fetchone()
                require(verified and verified[0], "This account has no verified email.", 409)
                db.execute("INSERT INTO admin_outbox VALUES (?,?,'pending','',?)", (request_id, target, time()))
                detail = {"state": "pending", "mailId": request_id}
            else:
                row = db.execute("SELECT cutoff,locked FROM admin_sessions WHERE owner=?", (target,)).fetchone()
                cutoff = time() if action in {"lock", "invalidate"} else row[0] if row else 0
                locked = 1 if action == "lock" else 0 if action == "unlock" else row[1] if row else 0
                db.execute("INSERT INTO admin_sessions VALUES (?,?,?) ON CONFLICT(owner) DO UPDATE SET cutoff=excluded.cutoff,locked=excluded.locked", (target, cutoff, locked))
                if action == "lock":
                    self.job(db, request_id, target, "all")
                    detail = {"jobId": request_id, "state": "pending"}
                if action == "unlock":
                    self.require_jobs_done(db)
        elif action == "adjust":
            require(set(value) == {"kind", "xp", "coins", "expectedTotals"} and value["kind"] in {"delta", "total"})
            totals = self.totals(db, target)
            require(totals == value["expectedTotals"], "Balance changed. Refresh before adjusting.", 409)
            xp, coins = value["xp"], value["coins"]
            require(type(xp) in (int, float) and math.isfinite(xp) and type(coins) is int)
            if value["kind"] == "total":
                xp -= totals["xp"]; coins -= totals["coins"]
            self.adjust(db, request_id, target, xp, coins)
            detail = self.totals(db, target)
        elif action == "reverse":
            require(set(value) == {"id", "expectedTotals"})
            require(self.totals(db, target) == value["expectedTotals"], "Balance changed. Refresh first.", 409)
            row = db.execute("SELECT xp,coins FROM admin_adjustments WHERE id=? AND owner=?", (value["id"], target)).fetchone()
            require(row and not db.execute("SELECT 1 FROM admin_adjustments WHERE reverses=?", (value["id"],)).fetchone(), "Adjustment missing or already reversed.", 409)
            self.adjust(db, request_id, target, -row[0], -row[1], value["id"])
            detail = self.totals(db, target)
        elif action == "control":
            require(set(value) == {"scope", "state"} and value["scope"] in controls.MODES | {"all"} and value["state"] in {"open", "pause", "freeze", "maintenance"})
            require(value["state"] != "maintenance" or value["scope"] == "all")
            if value["state"] in {"open", "pause"}:
                self.require_jobs_done(db)
            db.execute("INSERT INTO admin_controls VALUES (?,?,?) ON CONFLICT(scope) DO UPDATE SET state=excluded.state,at=excluded.at", (value["scope"], value["state"], time()))
            if value["state"] in {"freeze", "maintenance"}:
                db.execute("INSERT INTO admin_freezes VALUES (?,?) ON CONFLICT(scope) DO UPDATE SET at=excluded.at", (value["scope"], time()))
                self.job(db, request_id, "", value["scope"])
                detail = {"jobId": request_id, "state": "pending"}
        elif action == "case":
            require(set(value) == {"id", "state", "note"} and value["state"] in {"open", "monitor", "dismissed", "closed"})
            require(isinstance(value["note"], str) and len(value["note"]) <= 4000)
            case_id = str(uuid.UUID(value["id"])) if value["id"] else request_id
            prior_case = db.execute("SELECT owner FROM admin_cases WHERE id=?", (case_id,)).fetchone()
            require(not prior_case or prior_case[0] == target, "Case belongs to another account.", 409)
            snapshot = self.evidence(db, target)
            for attempt in snapshot["timeline"]:
                attempt.pop("tab_away_count", None)
                attempt.pop("tab_away_seconds", None)
            evidence = encoded(snapshot)
            closed = time() if value["state"] in {"dismissed", "closed"} else None
            db.execute("INSERT INTO admin_cases VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,note=excluded.note,evidence=excluded.evidence,closed=excluded.closed", (case_id, target, value["state"], value["note"], evidence, time(), closed))
            detail = {"caseId": case_id}
        elif action == "policy":
            require(set(value) == set(controls.DEFAULT_REWARDS) and all(type(n) is int and 0 <= n <= 1000000 for n in value.values()))
            policy = controls.version(db, "policy") + 1
            db.execute("INSERT INTO admin_policies VALUES (?,?,?)", (policy, encoded(value), time()))
        else:
            raise DailyError(400, "Unknown administration action.")
        result = {"requestId": request_id, "version": controls.bump(db, target), "result": detail, "status": detail.get("state", "successful")}
        db.execute("INSERT INTO admin_operations VALUES (?,?,?,?,?,?,?)", (request_id, actor, target, action, intent, encoded(result), time()))
        self.audit(db, request_id, actor, target, action, reason, result["status"], detail)
        return result

    @staticmethod
    def require_jobs_done(db):
        require(not db.execute("SELECT 1 FROM admin_jobs WHERE state<>'completed' LIMIT 1").fetchone(), "Reconciliation is unfinished. Inspect pending/failed operations before reopening.", 409)

    @staticmethod
    def job(db, request_id, owner, scope):
        db.execute("INSERT INTO admin_jobs(id,owner,scope,cutoff,state) VALUES (?,?,?,?,'pending')", (request_id, owner, scope, time()))

    def adjust(self, db, request_id, owner, xp, coins, reverses=None):
        totals = self.totals(db, owner)
        require(0 <= totals["xp"] + xp <= MAX_COINS and 0 <= totals["coins"] + coins <= MAX_COINS,
                "Adjustment would create a negative or overflowing balance.", 409)
        require(abs(xp) <= MAX_COINS and abs(coins) <= MAX_COINS)
        db.execute("INSERT INTO admin_adjustments VALUES (?,?,?,?,?)", (request_id, owner, xp, coins, reverses))
        db.execute("INSERT INTO result_rewards VALUES (?,?, 'admin-adjustment',?,?,?)", (owner, "admin:" + request_id, xp, coins, controls.stamp()))
