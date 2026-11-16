"""Authenticated, same-origin account-workspace API."""
import json
import sqlite3
from urllib.parse import parse_qs, urlparse
from urllib.error import HTTPError, URLError

from daily_puzzles import DailyError
from market_data import MarketDataBusy


class AccountDataHandlerMixin:
    def handle_account_data(self, path, query="", *, write=False):
        owner = None
        try:
            owner = self.account_owner(self.headers)
            if write:
                origin = self.headers.get("Origin")
                if origin and urlparse(origin).netloc.casefold() != self.headers.get("Host", "").casefold():
                    self.reject_post(403, {"error": "Cross-origin account changes are not accepted."})
                    return
                if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
                    self.reject_post(415, {"error": "JSON content required."})
                    return
                length = int(self.headers.get("Content-Length", "0"))
                if not 2 <= length <= 300000:
                    self.reject_post(413, {"error": "Account request is too large or empty."})
                    return
                request = json.loads(self.rfile.read(length))
                if not isinstance(request, dict):
                    raise DailyError(400, "Invalid account request.")
                if path == "/api/account-data/delete":
                    result = self.account_deletion.delete(owner, request, self.headers)
                    self.send_json(200, result)
                    return
                action = {"/api/account-data/document": self.account_data.document,
                          "/api/account-data/lesson": self.account_data.lesson,
                          "/api/account-data/reset-learning": self.account_data.reset_learning,
                          "/api/account-data/order": self.account_data.trade}.get(path)
                if action is None:
                    raise DailyError(404, "Unknown account endpoint.")
                result = action(owner, request)
            elif path == "/api/account-data/state":
                result = self.account_data.state(owner)
            elif path == "/api/account-data/orders":
                params = parse_qs(query)
                result = self.account_data.history(owner, params.get("scope", ["live"])[0], int(params.get("offset", ["0"])[0]))
            elif path == "/api/account-data/export-history":
                result = self.account_data.export_history(owner, int(parse_qs(query).get("offset", ["0"])[0]))
            elif path == "/api/account-data/learning-archives":
                result = self.account_data.learning_archives(owner)
            else:
                raise DailyError(404, "Unknown account endpoint.")
            self.send_json(200, result, compress=True)
        except DailyError as exc:
            if write and getattr(exc, "security_signal", None):
                from misconduct import observe
                observe(self.account_data.results, owner, exc)
            self.send_json(exc.status, {"error": str(exc), **({"code": exc.code} if getattr(exc, "code", None) else {})}, retry_after=exc.retry_after)
        except MarketDataBusy as exc:
            self.send_json(429, {"error": str(exc)}, retry_after=exc.retry_after)
        except (ValueError, TypeError, KeyError, UnicodeError, OverflowError, RecursionError):
            self.send_json(400, {"error": "Invalid account request."})
        except (sqlite3.Error, OSError, HTTPError, URLError, RuntimeError, LookupError):
            self.send_json(503, {"error": "Account data or verified market prices are unavailable. Reconnect and retry."})
