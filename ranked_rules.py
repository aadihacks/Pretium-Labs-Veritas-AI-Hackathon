"""Shared server-owned contract for full, future Ranked candles."""

import re
from itertools import product

LIVE_INTERVALS = {"1m": 60, "2m": 120, "3m": 180, "5m": 300,
                  "10m": 600, "15m": 900, "30m": 1800, "45m": 2700,
                  "1h": 3600, "2h": 7200, "3h": 10800, "4h": 14400}
RANKED_VERSION = "live-v2"
RANKED_LOCK_SECONDS = 5


def to_alpaca_symbol(symbol):
    upper = symbol.strip().upper().replace(" ", "")
    crypto_aliases = {
        "BTC-USD": "BTC/USD", "BTCUSD": "BTC/USD", "BTC/USD": "BTC/USD",
        "ETH-USD": "ETH/USD", "ETHUSD": "ETH/USD", "ETH/USD": "ETH/USD",
    }
    if upper in crypto_aliases:
        return crypto_aliases[upper], "crypto"
    if upper.endswith("-USD") and len(upper) <= 12:
        return upper.replace("-USD", "/USD"), "crypto"
    if "/" in upper and upper.endswith("/USD"):
        return upper, "crypto"
    if upper.startswith("^") or upper.endswith("=F") or upper.endswith("=X") or "=" in upper:
        return upper, "unsupported"
    if re.fullmatch(r"[A-Z][A-Z0-9.-]{0,13}", upper):
        return upper, "stocks"
    return upper, "unsupported"


def canonical_ranked_symbol(symbol):
    ticker, asset = to_alpaca_symbol(symbol)
    # Preserve the catalog's hyphen spelling when it is an accepted alias.
    if asset == "crypto" and len(ticker) <= 12:
        candidate = ticker.replace("/USD", "-USD")
        if to_alpaca_symbol(candidate) == (ticker, asset):
            return candidate
    return ticker


def ranked_puzzle_ids(puzzle):
    """Include persisted pre-canonicalization aliases without rewriting history."""
    ticker, asset = to_alpaca_symbol(puzzle["ticker"])
    symbols = {ticker}
    if asset == "crypto":
        if len(ticker) <= 12:
            # The provider parser replaces every -USD when the suffix is -USD.
            # Include mixed spellings already persisted by that parser too.
            parts = ticker.split("/USD")
            for separators in product(("/USD", "-USD"), repeat=len(parts) - 1):
                candidate = "".join(part + separator for part, separator in zip(parts, separators)) + parts[-1]
                if to_alpaca_symbol(candidate) == (ticker, asset):
                    symbols.add(candidate)
        if ticker in {"BTC/USD", "ETH/USD"}:
            symbols.add(ticker.replace("/", ""))
    return tuple(f"{puzzle['version']}:{symbol}:{puzzle['liveInterval']}:{puzzle['targetStart']}"
                 for symbol in sorted(symbols))


def betting_deadline(puzzle):
    """Fail closed for legacy/malformed contracts; never trust a client deadline."""
    start, end = puzzle.get("targetStart"), puzzle.get("targetEnd")
    step = LIVE_INTERVALS.get(puzzle.get("liveInterval"))
    if (puzzle.get("version") != RANKED_VERSION or not step
            or type(start) is not int or type(end) is not int
            or start % step or end != start + step):
        return 0
    return start - RANKED_LOCK_SECONDS
