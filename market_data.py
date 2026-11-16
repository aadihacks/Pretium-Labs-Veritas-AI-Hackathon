"""Server-only setup and bounded request sharing for market-data providers."""
from __future__ import annotations

import math
import os
import threading
from collections import OrderedDict, deque
from pathlib import Path
from time import monotonic


def load_local_env(path: Path, target=None) -> None:
    """Read simple KEY=value settings without replacing existing values."""
    if target is None:
        target = os.environ
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip()
        if not key or not key.replace("_", "").isalnum():
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        target.setdefault(key, value)


class MarketDataBusy(RuntimeError):
    def __init__(self, retry_after: float):
        self.retry_after = max(1, math.ceil(retry_after))
        super().__init__(f"Live market data is busy. Retry in {self.retry_after} seconds.")


class RequestBudget:
    """One rolling-minute budget shared by every provider call in this process."""
    def __init__(self, per_minute: int):
        self.per_minute = max(1, per_minute)
        self.calls = deque()
        self.blocked_until = 0.0
        self.lock = threading.Lock()

    def take(self) -> None:
        with self.lock:
            now = monotonic()
            while self.calls and self.calls[0] <= now - 60:
                self.calls.popleft()
            if now < self.blocked_until:
                raise MarketDataBusy(self.blocked_until - now)
            if len(self.calls) >= self.per_minute:
                raise MarketDataBusy(self.calls[0] + 60 - now)
            self.calls.append(now)

    def pause(self, seconds: float) -> None:
        with self.lock:
            self.blocked_until = max(self.blocked_until, monotonic() + seconds)


class SharedResponseCache:
    """Combine identical concurrent requests; bound memory and cache failures briefly."""
    def __init__(self, max_entries: int = 32):
        self.max_entries = max_entries
        self.entries = OrderedDict()
        self.pending = {}
        self.lock = threading.Lock()

    def get(self, key: str, load, ttl: float = 5):
        with self.lock:
            now = monotonic()
            for expired in [k for k, (until, _, _) in self.entries.items() if until <= now]:
                del self.entries[expired]
            cached = self.entries.get(key)
            if cached:
                self.entries.move_to_end(key)
                if cached[2] is not None:
                    raise cached[2]
                return cached[1]
            event = self.pending.get(key)
            leader = event is None
            if leader:
                if len(self.pending) >= self.max_entries:
                    raise MarketDataBusy(2)
                event = self.pending[key] = threading.Event()
        if not leader:
            if not event.wait(timeout=10):
                raise MarketDataBusy(2)
            return self.get(key, load, ttl)
        value, error = None, None
        try:
            value = load()
            return value
        except Exception as exc:
            error = exc
            raise
        finally:
            with self.lock:
                # Admission failures belong to the calling workload. Sharing
                # one with settlement would let public work poison its reserve.
                if not isinstance(error, MarketDataBusy):
                    self.entries[key] = (monotonic() + (2 if error else ttl), value, error)
                    self.entries.move_to_end(key)
                    while len(self.entries) > self.max_entries:
                        self.entries.popitem(last=False)
                del self.pending[key]
                event.set()
