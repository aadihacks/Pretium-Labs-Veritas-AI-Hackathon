"""Bounded, server-observed review evidence. Never grants or removes access."""
import hashlib
import json
import math
import sqlite3
import uuid
from datetime import datetime
from time import time

from account_guard import check as check_account
from daily_puzzles import DailyError

SLOTS = 256
MAX_COUNT = 2147483647
WINDOW_SECONDS = 60
REPEAT_THRESHOLD = 10
SIGNALS = {
    "admin_access_denied": "Console owner authorization rejected",
    "admin_request_rejected": "Other rejected console mutation (context only)",
    "unassigned_puzzle": "Submission for a puzzle not assigned to this account",
    "managed_match_bypass": "Request bypassing server match assignment/submission",
    "order_id_conflict": "Order identity reused with different intent",
    "retired_history_import": "Attempt to import browser-authored results",
}
PLAY_MODES = {"free": "Freeplay", "speed": "Speed", "packs": "Event packs",
              "daily": "Daily", "ranked": "Ranked", "versus": "Competitive"}
PLAY_SIGNALS = {mode: "rapid_correct_" + mode for mode in PLAY_MODES}
SIGNALS.update({PLAY_SIGNALS[mode]: label + ": sustained fast correct answers (review only)"
                for mode, label in PLAY_MODES.items()})
PLAY_SAMPLE = 30
PLAY_CORRECT = 27
PLAY_FAST_CORRECT = 24
PLAY_FAST_SECONDS = 2
PLAY_PERIOD_SECONDS = 3600
ACTION = "security-observation"


def rejection(status, message, signal=None):
    """Attach an internal signal at the owning check, not from browser input."""
    error = DailyError(status, message)
    if signal in SIGNALS:
        error.security_signal = signal
    return error


def slot_id(owner):
    return "security:" + str(int(hashlib.sha256(owner.encode()).hexdigest(), 16) % SLOTS)


def _actor(owner):
    if not isinstance(owner, str) or not owner.startswith("user:"):
        return False
    try:
        return owner == "user:" + str(uuid.UUID(owner[5:]))
    except ValueError:
        return False


def _signals(row, owner):
    if not row or row[0] != owner:
        return {}
    try:
        signals = json.loads(row[1])["signals"]
        clean = {}
        for name in SIGNALS:
            if name not in signals:
                continue
            event = signals[name]
            counters = ("count", "windowCount", "peakWindowCount")
            times = ("firstAt", "lastAt", "windowStart", "flaggedAt")
            if (any(type(event.get(k)) is not int or not 0 <= event[k] <= MAX_COUNT for k in counters)
                    or any(type(event.get(k)) not in (int, float) or not math.isfinite(event[k]) or event[k] < 0 for k in times)):
                continue
            clean[name] = {k: event[k] for k in (*counters, *times)}
            sample = _play_sample(event.get("sample"))
            if name in PLAY_SIGNALS.values() and sample:
                clean[name]["sample"] = sample
        return clean
    except (ValueError, TypeError, KeyError):
        return {}


def _play_sample(value):
    if not isinstance(value, dict):
        return None
    counters = ("correct", "fastCorrect")
    times = ("firstIssuedAt", "lastSubmittedAt")
    if (any(type(value.get(k)) is not int or not 0 <= value[k] <= PLAY_SAMPLE for k in counters)
            or any(type(value.get(k)) not in (int, float) or not math.isfinite(value[k]) or value[k] < 0 for k in times)):
        return None
    return {k: value[k] for k in (*counters, *times)}


def record(db, owner, signal, *, sample=None):
    """Caller holds the existing serialized writer transaction; no raw requests."""
    if not _actor(owner) or signal not in SIGNALS:
        return False
    now = time()
    operation = slot_id(owner)
    prior = db.execute("SELECT actor,detail FROM admin_audit WHERE id=?", (operation,)).fetchone()
    events = _signals(prior, owner)
    event = events.get(signal, {"count": 0, "firstAt": now, "lastAt": now,
                                "windowStart": now, "windowCount": 0,
                                "peakWindowCount": 0, "flaggedAt": 0})
    if not 0 <= now - event["windowStart"] < WINDOW_SECONDS:
        event["windowStart"], event["windowCount"] = now, 0
    event["count"] = min(MAX_COUNT, event["count"] + 1)
    event["windowCount"] = min(MAX_COUNT, event["windowCount"] + 1)
    event["peakWindowCount"] = max(event["peakWindowCount"], event["windowCount"])
    event["lastAt"] = now
    if (signal in PLAY_SIGNALS.values()
            or signal != "admin_request_rejected" and event["windowCount"] >= REPEAT_THRESHOLD):
        event["flaggedAt"] = now
    events[signal] = event
    if signal in PLAY_SIGNALS.values() and _play_sample(sample):
        event["sample"] = _play_sample(sample)
    detail = json.dumps({"version": 1, "signals": events}, sort_keys=True, separators=(",", ":"), allow_nan=False)
    # Every field is server-owned, finite and bounded; accounts share this pool.
    # Collision replacement intentionally loses older evidence, never receipts.
    db.execute("""INSERT INTO admin_audit (id,actor,target,action,reason,result,detail,at)
        VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
        actor=excluded.actor,target=excluded.target,action=excluded.action,
        reason=excluded.reason,result=excluded.result,detail=excluded.detail,at=excluded.at""",
        (operation, owner, owner, ACTION, "Server-observed activity; human review required",
         "review" if any(e["flaggedAt"] for e in events.values()) else "observed", detail, now))
    return True


def observe_gameplay(db, owner, mode):
    """After a new eligible result, flag a sustained pattern, never a player.

    The caller owns the serialized gameplay transaction. A savepoint keeps a
    failed evidence write from changing settlement/rewards, including on Postgres.
    No browser timings, correctness claims, or visibility reports are consumed.
    """
    if not _actor(owner) or mode not in PLAY_MODES:
        return False
    db.execute("SAVEPOINT gameplay_observation")
    try:
        rows = db.execute("""SELECT a.correct,a.at,a.puzzle_id,
            json_extract(a.payload,'$.submittedAt') submitted,
            s.issued_at,json_extract(p.payload,'$.version') version
            FROM result_attempts a
            JOIN result_assignments s ON s.owner=a.owner AND s.puzzle_id=a.puzzle_id AND s.mode=a.mode
            JOIN result_puzzles p ON p.id=a.puzzle_id
            WHERE a.owner=? AND a.mode=? AND a.trust='server' AND a.status='completed'
            AND a.correct IS NOT NULL AND coalesce(json_extract(a.payload,'$.matchGroup'),0)=0
            AND coalesce(json_extract(a.payload,'$.rewardEligible'),1)=1
            ORDER BY a.at DESC,a.id DESC LIMIT ?""", (owner, mode, PLAY_SAMPLE)).fetchall()
        matched = False
        if len(rows) == PLAY_SAMPLE:
            competitive_times = {}
            competitive_ids = [r["puzzle_id"] for r in rows if mode == "versus" and r["version"] == "competitive-v1"]
            if competitive_ids:
                placeholders = ",".join("?" for _ in competitive_ids)
                competitive_times = dict(db.execute(f"""SELECT m.puzzle_id,c.at FROM competitive_answers c
                    JOIN result_match_assignments m ON m.owner=c.owner AND m.match_id=c.session_id AND m.round=c.round
                    WHERE m.owner=? AND m.puzzle_id IN ({placeholders})""", (owner, *competitive_ids)).fetchall())
            correct, fast, issued_times, submitted_times = 0, 0, [], []
            for row in rows:
                submitted = row["submitted"] or row["at"]
                if mode == "versus" and row["version"] == "competitive-v1":
                    # Round reveal can wait for the opponent; use the frozen
                    # server answer time rather than that later completion.
                    if row["puzzle_id"] not in competitive_times:
                        break
                    submitted = competitive_times[row["puzzle_id"]]
                if isinstance(submitted, str):
                    parsed = datetime.fromisoformat(submitted.replace("Z", "+00:00"))
                    if parsed.tzinfo is None:
                        break
                    submitted = parsed.timestamp()
                issued = row["issued_at"]
                if (not all(type(v) in (int, float) and math.isfinite(v) for v in (issued, submitted))
                        or not 0 <= issued <= submitted <= time()):
                    break
                correct += int(bool(row["correct"]))
                fast += int(bool(row["correct"]) and submitted - issued <= PLAY_FAST_SECONDS)
                issued_times.append(issued)
                submitted_times.append(submitted)
            else:
                matched = (correct >= PLAY_CORRECT and fast >= PLAY_FAST_CORRECT
                           and max(submitted_times) - min(issued_times) <= PLAY_PERIOD_SECONDS
                           and time() - max(submitted_times) <= PLAY_PERIOD_SECONDS)
            if matched:
                record(db, owner, PLAY_SIGNALS[mode], sample={"correct": correct, "fastCorrect": fast,
                    "firstIssuedAt": min(issued_times), "lastSubmittedAt": max(submitted_times)})
        db.execute("RELEASE SAVEPOINT gameplay_observation")
        return matched
    except (sqlite3.Error, ValueError, TypeError, OverflowError, OSError):
        db.execute("ROLLBACK TO SAVEPOINT gameplay_observation")
        db.execute("RELEASE SAVEPOINT gameplay_observation")
        return False


def observe(results, owner, error, *, admin=False):
    """Run after failed work rolled back. Telemetry must preserve its response."""
    signal = getattr(error, "security_signal", None)
    if signal not in SIGNALS:
        signal = "admin_request_rejected" if admin else None
    if not _actor(owner) or signal is None:
        return False
    try:
        with results.connect() as db:
            check_account(db, owner)  # Do not resurrect deleted account evidence.
            return record(db, owner, signal)
    except (DailyError, sqlite3.Error, OSError, ValueError):
        return False


def evidence(db, owner):
    row = db.execute("SELECT actor,detail FROM admin_audit WHERE id=?", (slot_id(owner),)).fetchone()
    events = _signals(row, owner)
    now = time()
    return {"source": "server-validated rejections and gameplay patterns; intent is not established",
            "automaticPunishment": False, "windowSeconds": WINDOW_SECONDS,
            "repeatThreshold": REPEAT_THRESHOLD, "globalSlots": SLOTS,
            "gameplayPolicy": {"sampleSize": PLAY_SAMPLE, "minimumCorrect": PLAY_CORRECT,
                               "minimumFastCorrect": PLAY_FAST_CORRECT, "fastSeconds": PLAY_FAST_SECONDS,
                               "maximumPeriodSeconds": PLAY_PERIOD_SECONDS, "groupBy": "mode",
                               "countMeaning": "Each gameplay event is a matching window; windows may overlap."},
            "events": [{"signal": name, "label": SIGNALS[name], **event,
                        "reviewSuggested": event["flaggedAt"] > 0 and 0 <= now - event["flaggedAt"] <= 30 * 86400}
                       for name, event in sorted(events.items())],
            "limitations": "Bounded summaries can be replaced by hash collisions or expire. Missing evidence does not prove fair play. Fast correct patterns can reflect skill or familiar charts; thresholds need calibration. Guests, successful retries, Review answers, reward-ineligible replays, tab-away reports and ordinary errors do not trigger gameplay flags. Timing includes network and loading delay; slower lookups and external tools may go undetected."}
