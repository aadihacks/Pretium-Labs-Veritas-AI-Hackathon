"""HTTP adapter for the shared result store; private, never statically served."""
import json
import re
import sqlite3
import uuid
from datetime import date, datetime, timezone
from time import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

from daily_puzzles import DailyError
from market_data import MarketDataBusy
from request_limits import retry_seconds


def require_account_eligibility(user):
    # Auth's app_metadata can only be written by trusted server/database code.
    # user_metadata and localStorage must never grant eligibility.
    eligibility = (user.get("app_metadata") or {}).get("fl101_eligibility")
    try:
        birth = eligibility["birth_date"]
        if not isinstance(birth, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", birth):
            raise ValueError("Invalid birth date")
        born = date.fromisoformat(birth)
        today = datetime.now(timezone.utc).date()
        age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
        if type(eligibility["minimum_age"]) is not int or eligibility["minimum_age"] != 13 or age < 13:
            raise ValueError("Minimum age not met")
    except (KeyError, TypeError, ValueError):
        raise DailyError(403, "This account does not meet the minimum age requirement. Contact privacy@financelabs101.com.") from None


def authenticate_account(headers, url, publishable_key, *, optional=False, user_out=None):
    authorization = headers.get("Authorization", "")
    if not authorization and optional:
        return None
    if not re.fullmatch(r"Bearer [A-Za-z0-9_.-]{32,8192}", authorization):
        raise DailyError(401, "Sign in to access saved account history.")
    if not (url and publishable_key):
        raise DailyError(503, "Account history authentication is not configured.")
    try:
        request = Request(f"{url}/auth/v1/user", headers={
            "Authorization": authorization, "apikey": publishable_key})
        with urlopen(request, timeout=10) as response:
            user = json.load(response)
        user_id = str(uuid.UUID(user.get("id", "")))
        if user.get("aud") != "authenticated" or user.get("is_anonymous") is True:
            raise ValueError("A signed-in account is required")
        require_account_eligibility(user)
        if user_out is not None:
            user_out.update(user)
        return "user:" + user_id
    except HTTPError as exc:
        if exc.code == 429:
            raise DailyError(429, "Too many authentication requests. Please wait and retry.",
                             retry_seconds(exc.headers.get("Retry-After"))) from None
        try:
            auth_error = json.load(exc)
        except (ValueError, TypeError, AttributeError, OSError):
            auth_error = {}
        if not isinstance(auth_error, dict):
            auth_error = {}
        if (auth_error.get("code") or auth_error.get("error_code")) == "user_not_found":
            error = DailyError(401, "This account has been deleted. Sign out on this device.")
            error.code = "account_deleted"
            raise error from None
        raise DailyError(401 if exc.code in {401, 403} else 503,
                         "Your session expired. Sign in again." if exc.code in {401, 403} else "Account authentication is temporarily unavailable.") from None
    except (ValueError, TypeError, AttributeError):
        raise DailyError(401, "Invalid account session.") from None
    except (URLError, TimeoutError, OSError):
        raise DailyError(503, "Account authentication is temporarily unavailable.") from None


class HistoryHandlerMixin:
    # The owning server injects result_store, account_owner and live_provider.
    def history_summary(self, owner):
        try:
            offset = int(self.headers.get("X-History-Offset", "0"))
        except ValueError:
            raise DailyError(400, "Invalid history timezone.") from None
        return self.result_store.summary(owner, offset)

    def handle_progress_get(self, path, query):
        try:
            owner = self.account_owner(self.headers)
            params = parse_qs(query)
            if path == "/api/progress/history":
                payload = self.result_store.history(owner, cursor=params.get("cursor", [""])[0],
                    limit=int(params.get("limit", ["50"])[0]), mode=params.get("mode", [""])[0],
                    favorite=params.get("favorite", [""])[0] == "true",
                    competitive=params.get("competitive", [""])[0], include_summary=False)
                if params.get("summary", ["true"])[0] != "false":
                    payload["summary"] = None  # Calculated once below, in the browser's timezone.
            elif path == "/api/progress/shuffle":
                payload = self.result_store.shuffle(owner, mode=params.get("mode", [""])[0],
                    competitive=params.get("competitive", [""])[0], exclude=params.get("exclude", [""])[0],
                    round_number=params.get("round", [""])[0])
            elif path == "/api/progress/summary":
                payload = self.history_summary(owner)
            elif path == "/api/progress/attempt":
                payload = self.result_store.detail(owner, params.get("id", [""])[0])
            else:
                raise DailyError(404, "Unknown history endpoint.")
            if "summary" in payload:
                payload["summary"] = self.history_summary(owner)
            self.send_json(200, payload, compress=True)
        except DailyError as exc:
            payload = {"error": str(exc)}
            if getattr(exc, "code", None):
                payload["code"] = exc.code
            self.send_json(exc.status, payload, retry_after=exc.retry_after)
        except (ValueError, TypeError):
            self.send_json(400, {"error": "Invalid history request."})
        except (OSError, sqlite3.Error):
            self.send_json(503, {"error": "Account history is temporarily unavailable. Please retry."})

    def handle_progress_post(self, path):
        owner = None
        origin = self.headers.get("Origin")
        if origin and urlparse(origin).netloc.casefold() != self.headers.get("Host", "").casefold():
            self.reject_post(403, {"error": "Cross-origin history changes are not accepted."})
            return
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            self.reject_post(415, {"error": "JSON content required."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        maximum = 4096
        if not 2 <= length <= maximum:
            self.reject_post(413, {"error": "History request is too large or empty."})
            return
        try:
            request = json.loads(self.rfile.read(length))
            if not isinstance(request, dict):
                raise DailyError(400, "History request must be an object.")
            owner = self.practice_owner() if path == "/api/practice/attempt" else self.account_owner(self.headers)
            if path == "/api/progress/puzzles":
                payload = self.result_store.assigned_hidden(owner, request)
            elif path == "/api/progress/wallet":
                payload = self.result_store.wallet_action(owner, request)
            elif path == "/api/progress/attempt":
                payload = self.result_store.submit(owner, request, require_hidden=True)
            elif path == "/api/practice/attempt":
                if request.get("mode") not in {"free", "speed", "packs"}:
                    raise DailyError(400, "Invalid practice mode.")
                payload = self.result_store.submit(owner, request, require_hidden=True)
                if owner.startswith("anon:"):
                    payload = {"created": payload["created"], "record": {key: payload["record"][key] for key in ("choice", "answer")},
                               "reveal": payload["reveal"]}
                elif owner.startswith("guest:"):
                    payload["guestDay"] = owner.split(":")[1]
            elif path == "/api/progress/review":
                payload = self.result_store.review(owner, request)
            elif path == "/api/progress/import":
                payload = self.result_store.import_legacy(owner, request)
            elif path == "/api/progress/matches/finalize":
                payload = self.result_store.finish_match(owner, request.get("id"))
            elif path == "/api/progress/live/settle":
                attempt, puzzle = self.result_store.live_pending(owner, request.get("id"))
                if attempt["status"] != "pending":
                    payload = self.result_store.response(owner, attempt["id"])
                elif time() > puzzle["targetEnd"] + 120:
                    payload = self.result_store.void_live(owner, attempt["id"])
                elif time() < puzzle["targetEnd"]:
                    raise DailyError(409, "The Live candle has not closed.")
                else:
                    data = self.live_provider(puzzle["ticker"], puzzle["liveInterval"], puzzle["liveHistory"], puzzle["targetStart"])
                    payload = self.result_store.settle_live(owner, attempt["id"], data)
            else:
                raise DailyError(404, "Unknown history endpoint.")
            if "summary" in payload:
                payload["summary"] = self.history_summary(owner)
            self.send_json(200, payload, compress=True)
        except DailyError as exc:
            from misconduct import observe
            observe(self.result_store, owner, exc)
            payload = {"error": str(exc)}
            if getattr(exc, "code", None):
                payload["code"] = exc.code
            self.send_json(exc.status, payload, retry_after=exc.retry_after)
        except (ValueError, TypeError, UnicodeDecodeError, OverflowError):
            self.send_json(400, {"error": "Invalid history request."})
        except MarketDataBusy as exc:
            self.send_json(429, {"error": str(exc)}, retry_after=exc.retry_after)
        except (OSError, sqlite3.Error, RuntimeError):
            self.send_json(503, {"error": "Account history is temporarily unavailable. Please retry."})
