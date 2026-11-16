"""Authenticated JSON mutations and bounded live streams for Competitive."""
import json
import sqlite3
import threading
from time import monotonic
from urllib.parse import urlparse

from daily_puzzles import DailyError
from result_history import encode


class CompetitiveHandlerMixin:
    competitive_stream_lock = threading.Lock()
    competitive_streams = {}

    def handle_competitive_post(self, path):
        origin = self.headers.get("Origin")
        if origin and urlparse(origin).netloc.casefold() != self.headers.get("Host", "").casefold():
            self.reject_post(403, {"error": "Cross-origin match changes are not accepted."})
            return
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            self.reject_post(415, {"error": "JSON content required."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if not 2 <= length <= 4096:
            self.reject_post(413, {"error": "Invalid match request size."})
            return
        try:
            request = json.loads(self.rfile.read(length))
            if not isinstance(request, dict):
                raise DailyError(400, "Invalid match request.")
            owner = self.account_owner(self.headers)
            if path == "/api/competitive/join":
                payload = self.competitive_store.join(owner, self.competitive_label(self.headers, owner), request.get("kind", "Public"), request.get("code", ""))
            elif path == "/api/competitive/ready":
                payload = self.competitive_store.ready(owner, request.get("matchId"))
            elif path == "/api/competitive/answer":
                payload = self.competitive_store.answer(owner, request.get("matchId"), request.get("round"), request.get("choice"), visibility=request.get("visibility"))
            elif path == "/api/competitive/leave":
                payload = self.competitive_store.leave(owner)
            else:
                raise DailyError(404, "Unknown match endpoint.")
            self.send_json(200, payload)
        except DailyError as exc:
            self.send_json(exc.status, {"error": str(exc)}, retry_after=exc.retry_after)
        except (ValueError, TypeError, UnicodeDecodeError):
            self.send_json(400, {"error": "Invalid match request."})
        except (OSError, sqlite3.Error):
            self.send_json(503, {"error": "Competitive is temporarily unavailable. Please reconnect."})

    def handle_competitive_get(self, path):
        try:
            owner = self.account_owner(self.headers)
            if path == "/api/competitive/leaderboard":
                self.send_json(200, self.competitive_store.standings(owner))
                return
            if path == "/api/competitive/state":
                self.send_json(200, self.competitive_store.state(owner, touch=True))
                return
            if path != "/api/competitive/events":
                raise DailyError(404, "Unknown match endpoint.")
            with self.competitive_stream_lock:
                if self.competitive_streams.get(owner, 0) >= 3:
                    raise DailyError(429, "Too many live match tabs. Close an extra tab and retry.", 30)
                self.competitive_streams[owner] = self.competitive_streams.get(owner, 0) + 1
            try:
                self._competitive_events(owner)
            finally:
                with self.competitive_stream_lock:
                    self.competitive_streams[owner] -= 1
                    if not self.competitive_streams[owner]:
                        del self.competitive_streams[owner]
        except DailyError as exc:
            self.send_json(exc.status, {"error": str(exc)}, retry_after=exc.retry_after)
        except (OSError, sqlite3.Error):
            # A dropped stream is recovered by an authenticated state fetch.
            self.close_connection = True

    def _competitive_events(self, owner):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Accel-Buffering", "no")
        self.send_header("Connection", "close")
        self.end_headers()
        self.close_connection = True
        previous = None
        until = monotonic() + 25  # Revalidate the Supabase session on reconnect.
        pause = threading.Event()
        while monotonic() < until:
            state = self.competitive_store.state(owner, touch=True)
            signature = encode({"queue": state["queue"], "match": state["match"]})
            if signature != previous:
                self.wfile.write(("event: state\ndata: " + encode(state) + "\n\n").encode())
                previous = signature
            else:
                self.wfile.write(b": connected\n\n")
            self.wfile.flush()
            pause.wait(.5)
