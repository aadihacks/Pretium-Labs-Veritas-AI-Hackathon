"""Process-local admission controls. Hosting ingress must also bound public traffic."""
from collections import Counter
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import ipaddress
import math
import os
import socket
import threading
from http.client import LineTooLong
from time import monotonic
from http.server import ThreadingHTTPServer


def setting(name, default, minimum=1, maximum=100000):
    value = int(os.getenv("PRETIUM_" + name, str(default)))
    if not minimum <= value <= maximum:
        raise ValueError("Invalid PRETIUM_" + name)
    return value


def retry_seconds(value, default=30):
    """Accept HTTP seconds or a date; never reflect an upstream header verbatim."""
    try:
        seconds = float(value)
        if not math.isfinite(seconds):
            raise ValueError()
    except (TypeError, ValueError):
        try:
            seconds = (parsedate_to_datetime(value) - datetime.now(timezone.utc)).total_seconds()
        except (TypeError, ValueError, OverflowError):
            seconds = default
    return max(1, min(86400, math.ceil(seconds)))


class AdmissionError(Exception):
    def __init__(self, status=429, retry_after=1):
        super().__init__("Too many requests. Please wait and retry." if status == 429
                         else "Server is busy. Please retry shortly.")
        self.status, self.retry_after = status, retry_after


# (sustained requests/minute, initial burst). IP budgets allow shared networks;
# verified accounts have separate budgets. Paths/queries never become policy keys.
DEFAULTS = {
    "connections": (600, 120), "api": (600, 120), "global": (1200, 120),
    "login": (12, 8), "login_target": (6, 5),
    "market": (180, 40), "history": (300, 80),
    "assistant": (6, 3),
    "write": (180, 60), "events": (60, 20), "other": (120, 30),
    "account": (240, 60), "account_market": (90, 25),
    "account_write": (120, 40), "account_events": (12, 6),
}


def capacity_profile():
    profile = os.getenv("PRETIUM_CAPACITY_PROFILE", "standard").strip()
    if profile not in {"standard", "100"}:
        raise ValueError("Invalid PRETIUM_CAPACITY_PROFILE")
    return profile


def policy_defaults():
    defaults = dict(DEFAULTS)
    if capacity_profile() == "100":
        # Aggregate headroom for short requests from 100 active users. Individual
        # account/IP limits, login limits and external-provider budgets stay put.
        defaults["connections"] = (24000, 800)
        defaults["global"] = (12000, 400)
    return defaults


def route_policy(path, method):
    if path == "/api/pretium-ai/chat":
        return "assistant"
    if path in {"/api/account/username-login", "/api/account-data/delete"}:
        return "login"
    if path in {"/api/chart", "/api/live-chart", "/api/quote", "/api/search", "/api/daily/puzzle"}:
        return "market"
    if method not in {"GET", "HEAD"}:
        return "write"
    if path.startswith(("/api/progress/", "/api/daily/", "/api/account-data/")):
        return "history"
    return "other"


class RateLimiter:
    def __init__(self, policies=None, max_keys=10000, clock=monotonic):
        self.policies = policies or {name: (
            setting("LIMIT_" + name.upper() + "_PER_MINUTE", rate),
            setting("LIMIT_" + name.upper() + "_BURST", burst)
        ) for name, (rate, burst) in policy_defaults().items()}
        self.max_keys, self.clock = max_keys, clock
        self.buckets, self.lock, self.next_sweep = {}, threading.Lock(), 0

    def take(self, policy, identity):
        rate, burst = self.policies[policy]
        rate /= 60
        key = (policy, identity)
        with self.lock:
            now = self.clock()
            if now >= self.next_sweep:
                self.buckets = {k: v for k, v in self.buckets.items() if v[2] > now}
                self.next_sweep = now + 5
            previous = self.buckets.get(key)
            if previous is None and len(self.buckets) >= self.max_keys:
                # Never evict an active restricted key to admit an attacker key.
                raise AdmissionError(503, 5)
            tokens = min(burst, previous[0] + (now - previous[1]) * rate) if previous else burst
            allowed = tokens >= 1
            if allowed:
                tokens -= 1
            self.buckets[key] = (tokens, now, now + (burst - tokens) / rate)
            if not allowed:
                raise AdmissionError(503 if policy in {"global", "feedback_global"} else 429,
                                     max(1, math.ceil((1 - tokens) / rate)))


class WorkPool:
    """No waiting queue; both global work and each caller's work are finite."""
    def __init__(self, total, per_caller):
        self.total, self.per_caller = total, per_caller
        self.active, self.callers, self.lock = 0, Counter(), threading.Lock()

    def acquire(self, caller):
        with self.lock:
            if self.callers[caller] >= self.per_caller:
                raise AdmissionError(429, 2)
            if self.active >= self.total:
                raise AdmissionError(503, 2)
            self.active += 1
            self.callers[caller] += 1
        def release():
            with self.lock:
                self.active -= 1
                self.callers[caller] -= 1
                if not self.callers[caller]:
                    del self.callers[caller]
        return release


class HeaderReader:
    """Bound cumulative headers in addition to http.server's per-line bounds."""
    def __init__(self, stream):
        self.stream, self.remaining = stream, 32768

    def readline(self, size=-1):
        value = self.stream.readline(min(size, self.remaining + 1) if size >= 0 else self.remaining + 1)
        self.remaining -= len(value)
        if self.remaining < 0:
            raise LineTooLong("request headers")
        return value

    def __getattr__(self, name):
        return getattr(self.stream, name)


def client_ip(peer, headers, trusted_proxies=()):
    address = ipaddress.ip_address(peer)
    def trusted(ip):
        return any(ip in network for network in trusted_proxies)
    # Forwarded headers from a direct caller are never an identity assertion.
    if trusted(address) and headers.get("X-Forwarded-For"):
        value = headers["X-Forwarded-For"]
        if len(value) > 1024 or len(value.split(",")) > 16:
            raise ValueError("Invalid proxy chain")
        chain = [ipaddress.ip_address(part.strip()) for part in value.split(",")]
        while chain and trusted(address):
            address = chain.pop()
    # Normalize mapped IPv4, and share IPv6 /64 quotas to prevent address rotation.
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        address = address.ipv4_mapped
    return str(ipaddress.ip_network(f"{address}/64", strict=False)) if address.version == 6 else str(address)


class BoundedHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 32

    def __init__(self, *args, **kwargs):
        expanded = capacity_profile() == "100"
        self.limiter = RateLimiter(max_keys=setting("LIMIT_KEYS", 10000))
        self.api_work = WorkPool(setting("API_WORKERS", 32 if expanded else 16), setting("API_PER_IP", 6))
        self.stream_work = WorkPool(setting("STREAMS", 12), setting("STREAMS_PER_IP", 6))
        self.connections = WorkPool(setting("CONNECTIONS", 96 if expanded else 64), setting("CONNECTIONS_PER_IP", 96 if expanded else 24))
        self.account_work = WorkPool(setting("API_WORKERS", 32 if expanded else 16), 3)
        self.request_queue_size = 128 if expanded else 32
        self.trusted_proxies = tuple(ipaddress.ip_network(value.strip()) for value in
            os.getenv("PRETIUM_TRUSTED_PROXIES", "").split(",") if value.strip())
        self.header_seconds = setting("HEADER_SECONDS", 10, maximum=60)
        self.request_seconds = setting("REQUEST_SECONDS", 45, minimum=30, maximum=120)
        self.deadlines, self.deadline_lock = {}, threading.Lock()
        super().__init__(*args, **kwargs)

    def process_request(self, request, client_address):
        release = None
        try:
            peer = client_ip(client_address[0], {})
            self.limiter.take("connections", peer)
            release = self.connections.acquire(peer)
        except AdmissionError as exc:
            # No response worker is created; a short nonblocking write is best effort.
            try:
                request.setblocking(False)
                request.send((f"HTTP/1.1 {exc.status} {'Too Many Requests' if exc.status == 429 else 'Service Unavailable'}\r\n"
                              f"Retry-After: {exc.retry_after}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").encode())
            except OSError:
                pass
            self.shutdown_request(request)
            return
        request.settimeout(self.header_seconds)
        with self.deadline_lock:
            self.deadlines[request] = (monotonic() + self.header_seconds, release)
        try:
            super().process_request(request, client_address)
        except Exception:
            self._release_connection(request)
            raise

    def parsed_request(self, request):
        request.settimeout(min(self.header_seconds, self.request_seconds))
        with self.deadline_lock:
            if request in self.deadlines:
                _, release = self.deadlines[request]
                self.deadlines[request] = (monotonic() + self.request_seconds, release)

    def service_actions(self):
        with self.deadline_lock:
            expired = [request for request, (deadline, _) in self.deadlines.items() if deadline <= monotonic()]
        for request in expired:
            try:
                request.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            request.close()

    def _release_connection(self, request):
        with self.deadline_lock:
            entry = self.deadlines.pop(request, None)
        if entry:
            entry[1]()

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self._release_connection(request)
