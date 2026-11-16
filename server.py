from __future__ import annotations

import json
import gzip
import hashlib
from collections import OrderedDict
import io
import math
import mimetypes
import os
import re
import secrets
import sqlite3
import ssl
import threading
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from time import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote, urlencode, urlparse
from urllib.request import Request, urlopen

from market_data import MarketDataBusy, RequestBudget, SharedResponseCache, load_local_env
from provider_budget import SharedProviderBudget, provider_work
from daily_puzzles import DailyError, DailyStore, utc_today
from result_history import ResultStore
from guest_progress import GuestHandlerMixin
from historical_visibility import EVENT_PACK_WINDOWS
from ranked_rules import LIVE_INTERVALS, RANKED_LOCK_SECONDS, RANKED_VERSION, to_alpaca_symbol, canonical_ranked_symbol
from history_api import HistoryHandlerMixin, authenticate_account
from account_database import cloud_database_enabled, DATABASES_DETACHED
from account_data import AccountData
from account_data_api import AccountDataHandlerMixin
from account_deletion import AccountDeletion
from account_guard import REQUEST_OWNER, REQUEST_SESSION_CREATED
from admin_api import AdminHandlerMixin, AdminService
from request_limits import AdmissionError, BoundedHTTPServer, HeaderReader, client_ip, route_policy, retry_seconds, setting
from learn_section import proxy_learn
from gemini_backend import GeminiBackend, handle_ai


ROOT = Path(__file__).resolve().parent
load_local_env(ROOT / ".env.local")
GEMINI_BACKEND = GeminiBackend.from_environment()
LEARN_PORT = setting("LEARN_PORT", 8767, maximum=65535) if os.getenv("PRETIUM_LEARN_PORT") else None
# Serve the app normally unless maintenance is explicitly enabled.
MAINTENANCE_MODE = os.getenv("PRETIUM_MAINTENANCE", "0").strip() != "0"
SUPABASE_URL = ""
SUPABASE_PUBLISHABLE_KEY = ""
SUPABASE_SECRET_KEY = ""
PUBLIC_STATIC_FILES = {
    "pretium-ai.js", "pretium-ai.css", "pretium-ai-mascot.js",
    "marketpulse.js", "marketpulse-news.js", "marketpulse-news.json", "marketpulse-history.json",
    "maintenance.html", "maintenance.css",
    "index.html", "404.html", "styles.css", "script.js", "daily-puzzles.js", "result-history.js", "i18n.js",
    "up-celebration.js", "down-celebration.js", "sideways-celebration.js", "xp-orbs.js", "coin-rewards.js", "market-celebrations.js",
    "up-animation-preview.html", "down-animation-preview.html",
    "sideways-animation-preview.html", "market-animation-preview.html",
}
PUBLIC_ASSET_SUFFIXES = {".avif", ".gif", ".ico", ".jpeg", ".jpg", ".png", ".svg", ".webp"}
PUBLIC_LANGUAGE_FILES = {f"{code}.json" for code in (
    "en", "es", "ko", "fr", "zh-CN", "zh-TW", "tl", "vi", "ar", "ru", "pt", "hi", "de", "ht", "pl", "ja"
)}
PUBLIC_ORIGIN = (os.getenv("PRETIUM_PUBLIC_ORIGIN") or os.getenv("RENDER_EXTERNAL_URL") or "").rstrip("/")
TRUST_TLS_PROXY = os.getenv("RENDER", "").lower() == "true" or os.getenv("PRETIUM_TRUST_TLS_PROXY") == "1"
CACHE: OrderedDict[str, tuple[float, object, int]] = OrderedDict()
CACHE_LOCK = threading.Lock()
MAX_CACHE_ENTRIES = 64
MAX_PROVIDER_RESPONSE_BYTES = 8 * 1024 * 1024
MAX_CACHE_BYTES = 32 * 1024 * 1024
TTL = 300
ALPACA_DATA_BASE_URL = os.getenv("ALPACA_DATA_BASE_URL", "https://data.alpaca.markets").rstrip("/")
ALPACA_API_KEY_ID = os.getenv("APCA_API_KEY_ID") or os.getenv("ALPACA_API_KEY_ID") or ""
ALPACA_API_SECRET_KEY = os.getenv("APCA_API_SECRET_KEY") or os.getenv("ALPACA_API_SECRET_KEY") or ""
ALPACA_STOCK_FEED = os.getenv("ALPACA_STOCK_FEED") or os.getenv("ALPACA_DATA_FEED") or "iex"
PROVIDER_BUDGET_PATH = Path(os.getenv("PRETIUM_DATA_DIR") or ROOT / ".local-data").resolve() / "daily.sqlite3"
ALPACA_BUDGET = SharedProviderBudget(PROVIDER_BUDGET_PATH, "alpaca", int(os.getenv("ALPACA_REQUESTS_PER_MINUTE") or "180"))
# The detached preview has no storage or settlement workers. Keep its public
# provider quota in memory; connected deployments retain shared admission.
YAHOO_BUDGET = RequestBudget(18) if DATABASES_DETACHED else SharedProviderBudget(PROVIDER_BUDGET_PATH, "yahoo", 180)
LIVE_BAR_CACHE = SharedResponseCache()
ALPACA_SOURCE = "Alpaca Market Data"
YAHOO_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search"
YAHOO_CHART_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart"
YAHOO_SOURCE = "Yahoo Finance"
PREVIEW_SOURCE = "Local preview fallback"
FALLBACK_SYMBOLS = {
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA", "RIVN", "AMD",
    "C", "BAC", "AIG",
    "NFLX", "INTC", "CSCO", "GME", "AMC", "BB", "NOK", "KOSS", "COIN", "MARA", "RIOT",
    "SPY", "QQQ", "IWM", "DIA", "SMH", "XLF", "TLT", "IEF", "SHY", "BND", "AGG",
    "GLD", "SLV", "USO", "AAL", "ZM", "MRNA", "XOM", "CVX", "EWU", "FXB",
    "BTC-USD", "ETH-USD", "EURUSD=X", "GBPUSD=X", "EURGBP=X", "CAD=X", "JPY=X", "DX-Y.NYB",
    "^GSPC", "^IXIC", "^DJI", "^VIX", "^FTSE",
    "GC=F", "CL=F", "SI=F", "HG=F", "NG=F", "ES=F", "NQ=F", "SVXY",
}

FALLBACK_NAMES = {
    "AAPL": "Apple Inc.",
    "MSFT": "Microsoft Corporation",
    "GOOGL": "Alphabet Inc.",
    "AMZN": "Amazon.com Inc.",
    "NVDA": "NVIDIA Corporation",
    "RIVN": "Rivian Automotive Inc.",
    "C": "Citigroup Inc.",
    "BAC": "Bank of America Corporation",
    "AIG": "American International Group Inc.",
    "BTC-USD": "Bitcoin USD",
    "ETH-USD": "Ethereum USD",
    "SPY": "SPDR S&P 500 ETF Trust",
    "QQQ": "Invesco QQQ Trust",
    "TLT": "iShares 20+ Year Treasury Bond ETF",
    "^GSPC": "S&P 500",
    "^IXIC": "NASDAQ Composite",
    "^VIX": "CBOE Volatility Index",
    "GC=F": "Gold Futures",
    "CL=F": "Crude Oil Futures",
    "EURUSD=X": "EUR/USD",
    "GBPUSD=X": "GBP/USD",
    "CAD=X": "USD/CAD",
}


def cache_key(url: str, headers: dict[str, str] | None = None) -> str:
    auth_marker = "auth" if headers and "APCA-API-KEY-ID" in headers else "anon"
    return f"{auth_marker}:{url}"


def fetch_json(url: str, headers: dict[str, str] | None = None, cache_ttl: int = TTL) -> object:
    key = cache_key(url, headers)
    with CACHE_LOCK:
        now = time()
        for expired in [item for item, (until, _, _) in CACHE.items() if until <= now]:
            del CACHE[expired]
        cached = CACHE.get(key) if cache_ttl else None
        if cached:
            CACHE.move_to_end(key)
            return cached[1]
    request_headers = {"User-Agent": "Mozilla/5.0 FinanceLabs_101/0.1"}
    if headers:
        request_headers.update(headers)
    request = Request(url, headers=request_headers)
    is_alpaca = url.startswith(f"{ALPACA_DATA_BASE_URL}/")
    if is_alpaca:
        ALPACA_BUDGET.take()
    else:
        YAHOO_BUDGET.take()
    try:
        with urlopen(request, timeout=10 if is_alpaca else 12) as response:
            body = response.read(MAX_PROVIDER_RESPONSE_BYTES + 1)
            if len(body) > MAX_PROVIDER_RESPONSE_BYTES:
                raise ValueError("Market-data response exceeds the server limit.")
            payload = json.loads(body.decode("utf-8"))
    except HTTPError as exc:
        if exc.code == 429:
            seconds = retry_seconds(exc.headers.get("Retry-After") if exc.headers else None, default=60)
            (ALPACA_BUDGET if is_alpaca else YAHOO_BUDGET).pause(seconds)
            raise MarketDataBusy(seconds) from None
        raise
    if cache_ttl:
        with CACHE_LOCK:
            CACHE[key] = (time() + cache_ttl, payload, len(body))
            CACHE.move_to_end(key)
            while len(CACHE) > MAX_CACHE_ENTRIES or sum(entry[2] for entry in CACHE.values()) > MAX_CACHE_BYTES:
                CACHE.popitem(last=False)
    return payload


def alpaca_configured() -> bool:
    return bool(ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY)


def alpaca_headers() -> dict[str, str]:
    if not alpaca_configured():
        raise RuntimeError("Alpaca credentials are unavailable.")
    return {
        "APCA-API-KEY-ID": ALPACA_API_KEY_ID,
        "APCA-API-SECRET-KEY": ALPACA_API_SECRET_KEY,
    }


def alpaca_json(path: str, params: dict[str, object]) -> object:
    url = f"{ALPACA_DATA_BASE_URL}{path}?{urlencode(params)}"
    return fetch_json(url, alpaca_headers())


def classify(symbol: str, quote_type: str | None, type_disp: str | None) -> str:
    upper = symbol.upper()
    text = f"{quote_type or ''} {type_disp or ''}".lower()
    if upper.endswith("-USD") or "cryptocurrency" in text:
        return "crypto"
    if upper.endswith("=X") or "currency" in text:
        return "forex"
    if upper.startswith("^") or "index" in text:
        return "indices"
    if upper.endswith("=F") or "future" in text:
        return "futures"
    if "etf" in text:
        if "treasury" in text or upper in {"TLT", "IEF", "SHY", "BND", "AGG"}:
            return "bonds"
        return "etfs"
    if upper in {"GC=F", "CL=F", "SI=F", "HG=F", "NG=F", "GLD", "SLV", "USO"}:
        return "commodities"
    return "stocks"


def normalize_symbol(symbol: str) -> str:
    return symbol.strip().upper().replace(" ", "")


def valid_symbol_shape(symbol: str) -> bool:
    return bool(re.fullmatch(r"[A-Z0-9./=\-^]{1,24}", normalize_symbol(symbol)))


def alpaca_timeframe(interval: str) -> str:
    clean = interval.lower()
    minute_match = re.fullmatch(r"([1-9]|[1-5][0-9])m", clean)
    if minute_match:
        return f"{minute_match.group(1)}Min"
    if clean in {"60m", "1h"}:
        return "1Hour"
    if clean in {"1wk", "1w"}:
        return "1Week"
    return "1Day"


def parse_date(value: str, *, end: bool = False) -> datetime:
    date = datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
    if end:
        date += timedelta(days=1)
    return date


def range_window(range_value: str, interval: str, start: str, end: str) -> tuple[str, str]:
    if start and end:
        return parse_date(start).isoformat().replace("+00:00", "Z"), parse_date(end, end=True).isoformat().replace("+00:00", "Z")
    now = datetime.now(timezone.utc).replace(microsecond=0)
    intraday = interval.endswith("m") or interval in {"60m", "1h"}
    days = {
        "1d": 7 if intraday else 5,
        "5d": 14 if intraday else 10,
        "1mo": 45,
        "3mo": 110,
        "6mo": 200,
        "1y": 380,
        "2y": 760,
        "5y": 1900,
        "10y": 3800,
    }.get(range_value, 380)
    start_dt = now - timedelta(days=days)
    return start_dt.isoformat().replace("+00:00", "Z"), now.isoformat().replace("+00:00", "Z")


def alpaca_bar_time(value: object) -> int:
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value or "")
    if not text:
        return int(time())
    try:
        return int(datetime.fromisoformat(text.replace("Z", "+00:00")).timestamp())
    except ValueError:
        return int(time())


def extract_alpaca_bars(data: object, alpaca_symbol: str) -> list[dict[str, object]]:
    bars_container = data.get("bars", {}) if isinstance(data, dict) else {}
    bars = []
    if isinstance(bars_container, dict):
        bars = bars_container.get(alpaca_symbol) or bars_container.get(alpaca_symbol.replace("/", "-")) or []
        if not bars and len(bars_container) == 1:
            bars = next(iter(bars_container.values()))
    elif isinstance(bars_container, list):
        bars = bars_container
    candles = []
    for bar in bars:
        if not isinstance(bar, dict):
            continue
        open_price = bar.get("o")
        high = bar.get("h")
        low = bar.get("l")
        close = bar.get("c")
        if None in {open_price, high, low, close}:
            continue
        candles.append({
            "time": alpaca_bar_time(bar.get("t")),
            "open": round(float(open_price), 4),
            "high": round(float(high), 4),
            "low": round(float(low), 4),
            "close": round(float(close), 4),
            "volume": int(bar.get("v") or 0),
        })
    return candles


def fetch_alpaca_candles(symbol: str, range_value: str, interval: str, start: str, end: str) -> tuple[str, str, list[dict[str, object]]]:
    alpaca_symbol, asset_kind = to_alpaca_symbol(symbol)
    if asset_kind == "unsupported":
        raise ValueError("This preview's Alpaca adapter supports US stocks, ETFs, and USD crypto pairs. Add a second provider for forex, futures, broad indices, and macro series.")
    start_iso, end_iso = range_window(range_value, interval, start, end)
    params: dict[str, object] = {
        "symbols": alpaca_symbol,
        "timeframe": alpaca_timeframe(interval),
        "start": start_iso,
        "end": end_iso,
        "limit": 10000,
        "sort": "asc",
    }
    if asset_kind == "stocks":
        params.update({"adjustment": "split", "feed": ALPACA_STOCK_FEED})
        data = alpaca_json("/v2/stocks/bars", params)
    else:
        data = alpaca_json("/v1beta3/crypto/us/bars", params)
    candles = extract_alpaca_bars(data, alpaca_symbol)
    if not candles:
        raise LookupError(f"No Alpaca Market Data bars found for {symbol}.")
    return alpaca_symbol, asset_kind, candles


def provider_error_message(exc: Exception) -> str:
    return "Yahoo Finance market data is temporarily unavailable. Please retry; no generated prices are substituted."


def fetch_yahoo_search(query: str) -> list[dict[str, object]]:
    url = f"{YAHOO_SEARCH_URL}?{urlencode({'q': query, 'quotesCount': 12, 'newsCount': 0})}"
    data = fetch_json(url)
    quotes = data.get("quotes", []) if isinstance(data, dict) else []
    results: list[dict[str, object]] = []
    seen: set[str] = set()
    for quote_data in quotes:
        if not isinstance(quote_data, dict):
            continue
        symbol = normalize_symbol(str(quote_data.get("symbol") or ""))
        if not symbol or symbol in seen or not valid_symbol_shape(symbol):
            continue
        quote_type = str(quote_data.get("quoteType") or quote_data.get("typeDisp") or "")
        type_disp = str(quote_data.get("typeDisp") or quote_data.get("quoteType") or "")
        name = (
            quote_data.get("shortname")
            or quote_data.get("longname")
            or quote_data.get("name")
            or symbol
        )
        seen.add(symbol)
        results.append({
            "ticker": symbol,
            "name": str(name),
            "exchange": quote_data.get("exchDisp") or quote_data.get("exchange") or YAHOO_SOURCE,
            "quoteType": quote_type or "Yahoo result",
            "asset": classify(symbol, quote_type, type_disp),
        })
    return results[:10]


def yahoo_chart_params(range_value: str, interval: str, start: str, end: str) -> dict[str, object]:
    params: dict[str, object] = {
        "interval": interval,
        "events": "history",
        "includePrePost": "false",
    }
    if start and end:
        params["period1"] = date_epoch(start)
        params["period2"] = date_epoch(end, end=True)
    elif range_value == "max":
        # Yahoo may silently coarsen range=max to quarterly bars. An explicit
        # history window preserves the requested weekly/monthly resolution.
        params["period1"] = -2208988800  # 1900-01-01, before available chart history.
        params["period2"] = int(time())
    else:
        params["range"] = range_value
    return params


def extract_yahoo_candles(data: object) -> tuple[dict[str, object], list[dict[str, object]]]:
    chart = data.get("chart", {}) if isinstance(data, dict) else {}
    if isinstance(chart, dict) and chart.get("error"):
        error = chart.get("error") or {}
        if isinstance(error, dict):
            raise LookupError(error.get("description") or error.get("code") or "Yahoo Finance chart error.")
        raise LookupError("Yahoo Finance chart error.")
    results = chart.get("result") if isinstance(chart, dict) else None
    if not results:
        raise LookupError("No Yahoo Finance chart result.")
    result = results[0]
    if not isinstance(result, dict):
        raise LookupError("Yahoo Finance returned an invalid chart result.")
    timestamps = result.get("timestamp") or []
    indicators = result.get("indicators") or {}
    quote_blocks = indicators.get("quote") if isinstance(indicators, dict) else None
    quote_data = quote_blocks[0] if quote_blocks and isinstance(quote_blocks[0], dict) else {}
    candles: list[dict[str, object]] = []
    for idx, timestamp in enumerate(timestamps):
        try:
            open_price = quote_data.get("open", [])[idx]
            high = quote_data.get("high", [])[idx]
            low = quote_data.get("low", [])[idx]
            close = quote_data.get("close", [])[idx]
            volume = quote_data.get("volume", [0])[idx] or 0
        except (IndexError, TypeError):
            continue
        values = [open_price, high, low, close]
        if any(value is None for value in values):
            continue
        floats = [float(value) for value in values]
        if not all(math.isfinite(value) for value in floats):
            continue
        candles.append({
            "time": int(timestamp),
            "open": round(floats[0], 4),
            "high": round(floats[1], 4),
            "low": round(floats[2], 4),
            "close": round(floats[3], 4),
            "volume": int(volume or 0),
        })
    return result.get("meta") or {}, candles


def fetch_yahoo_candles(symbol: str, range_value: str, interval: str, start: str, end: str) -> tuple[str, str, str, str, list[dict[str, object]]]:
    ticker = normalize_symbol(symbol)
    if not valid_symbol_shape(ticker):
        raise ValueError("Use a valid market symbol: letters, numbers, dot, slash, dash, equals, or caret.")
    url = f"{YAHOO_CHART_BASE_URL}/{quote(ticker, safe='')}?{urlencode(yahoo_chart_params(range_value, interval, start, end))}"
    data = fetch_json(url)
    meta, candles = extract_yahoo_candles(data)
    if start and end:
        # Yahoo can include the period2 boundary for 24-hour markets. Do not
        # let an extra day's candle invalidate or extend a published event.
        first, stop = date_epoch(start), date_epoch(end, end=True)
        candles = [bar for bar in candles if first <= bar["time"] < stop]
    if not candles:
        raise LookupError(f"No Yahoo Finance bars found for {symbol}.")
    resolved = normalize_symbol(str(meta.get("symbol") or ticker))
    quote_type = str(meta.get("instrumentType") or meta.get("quoteType") or "")
    exchange = str(meta.get("exchangeName") or meta.get("fullExchangeName") or YAHOO_SOURCE)
    currency = str(meta.get("currency") or "USD")
    return resolved, classify(resolved, quote_type, quote_type), currency, exchange, candles


def fetch_provider_candles(symbol: str, range_value: str, interval: str, start: str, end: str) -> tuple[str, str, str, str, str, str, list[dict[str, object]]]:
    try:
        ticker, asset_kind, currency, exchange, candles = fetch_yahoo_candles(symbol, range_value, interval, start, end)
        return ticker, asset_kind, currency, exchange, YAHOO_SOURCE, "Yahoo Finance chart data.", candles
    except MarketDataBusy:
        raise
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, LookupError, RuntimeError, ValueError) as exc:
        raise LookupError(f"Yahoo Finance could not verify {symbol}: {exc}") from exc


def preview_fallback_allowed(symbol: str) -> bool:
    ticker = normalize_symbol(symbol)
    return valid_symbol_shape(ticker) and ticker in FALLBACK_SYMBOLS


LIVE_RANGES = {"1D": 1, "5D": 5, "1W": 7, "2W": 14, "1M": 31, "3M": 93,
               "6M": 186, "YTD": None, "1Y": 366, "5Y": 1830, "All": None}


def live_chart_payload(symbol: str, interval: str, history: str, target: int | None = None) -> dict[str, object]:
    """Only completed provider bars can open or resolve a Live puzzle."""
    if interval not in LIVE_INTERVALS or history not in LIVE_RANGES:
        raise ValueError("Choose a supported Live candle interval and date range.")
    if not valid_symbol_shape(symbol):
        raise ValueError("Use a valid market symbol.")
    ticker, asset = to_alpaca_symbol(symbol)
    if asset == "unsupported":
        raise ValueError("Live currently supports US stocks, ETFs, and USD crypto pairs.")
    if asset == "stocks" and not alpaca_configured():
        raise RuntimeError("Live needs Alpaca market-data keys on the server. Add them to .env.local and restart the server. Historical puzzles are still available.")
    if asset == "stocks" and ALPACA_STOCK_FEED not in {"iex", "sip"}:
        raise RuntimeError("Live requires a real-time IEX or SIP feed; delayed feeds cannot score Live puzzles.")
    now = int(time())
    step = LIVE_INTERVALS[interval]
    boundary = now // step * step
    # Choose a whole future candle with its pre-open submission window intact.
    target_start = (now + RANKED_LOCK_SECONDS) // step * step + step if target is None else target
    if target is not None and (target % step or target > boundary or target < now - step - 3600):
        raise ValueError("This Live candle has expired. Load a new Live puzzle.")
    # Minute-aligned URLs let users share bars across intervals and requests.
    # The end excludes the forming minute; a new minute always gets a new key.
    minute_end = now // 60 * 60
    if target is not None:
        start = target
    elif history == "YTD":
        current = datetime.fromtimestamp(now, timezone.utc)
        start = int(datetime(current.year, 1, 1, tzinfo=timezone.utc).timestamp())
    elif history == "All":
        # The existing single-request limit still bounds Live history to 10,000 bars.
        start = 1451606400  # Alpaca historical stock coverage starts in 2016.
    else:
        start = minute_end - LIVE_RANGES[history] * 86400
    params = {"symbols": ticker, "timeframe": "1Min", "start": datetime.fromtimestamp(start, timezone.utc).isoformat(),
              "end": datetime.fromtimestamp(minute_end, timezone.utc).isoformat(), "limit": 10000, "sort": "desc"}
    if asset == "stocks":
        params.update({"feed": ALPACA_STOCK_FEED, "adjustment": "split"})
    path = "/v2/stocks/bars" if asset == "stocks" else "/v1beta3/crypto/us/bars"
    url = f"{ALPACA_DATA_BASE_URL}{path}?{urlencode(params)}"
    headers = alpaca_headers() if alpaca_configured() else {}
    data = LIVE_BAR_CACHE.get(url, lambda: fetch_json(url, headers, cache_ttl=0))
    received = int(time())
    if target is None and (received // step * step != boundary or received >= target_start - RANKED_LOCK_SECONDS):
        raise LookupError("The candle changed while loading. Load the next Live puzzle.")
    minutes = sorted({bar["time"]: bar for bar in extract_alpaca_bars(data, ticker)
                      if bar["time"] + 60 <= now}.values(), key=lambda bar: bar["time"])
    if target is None and (not minutes or now - (minutes[-1]["time"] + 60) > 90):
        raise LookupError("No fresh market candles. This market may be closed or its feed delayed. Try an active symbol or crypto.")
    groups: dict[int, list[dict[str, object]]] = {}
    for bar in minutes:
        bucket = int(bar["time"]) // step * step
        if bucket + step <= now:
            groups.setdefault(bucket, []).append(bar)
    candles = []
    for bucket, bars in groups.items():
        # Do not score partial candles, session gaps, or truncated history buckets.
        if len(bars) != step // 60 or bars[0]["time"] != bucket or bars[-1]["time"] != bucket + step - 60:
            continue
        candles.append({"time": bucket, "open": bars[0]["open"], "close": bars[-1]["close"],
                        "high": max(bar["high"] for bar in bars), "low": min(bar["low"] for bar in bars),
                        "volume": sum(bar["volume"] for bar in bars)})
    if target is None:
        candles = [bar for bar in candles if bar["time"] < boundary]
        if len(candles) < 2:
            raise LookupError("Not enough complete Live candles in this date range. Choose a shorter interval or longer date range.")
    else:
        candles = [bar for bar in candles if bar["time"] == target]
    canonical = canonical_ranked_symbol(symbol)
    return {"ticker": canonical, "name": FALLBACK_NAMES.get(canonical, symbol),
            "asset": asset, "currency": "USD", "exchange": ALPACA_SOURCE, "source": ALPACA_SOURCE,
            "sourceNote": f"{ALPACA_STOCK_FEED.upper()} feed" if asset == "stocks" else "Crypto market data",
            "verifiedLive": True, "serverTime": received, "intervalSeconds": step,
            "targetStart": target_start, "targetEnd": target_start + step,
            "bettingClosesAt": target_start - RANKED_LOCK_SECONDS, "rankedVersion": RANKED_VERSION,
            "historyLimited": bool(data.get("next_page_token")) if isinstance(data, dict) else False,
            "candles": candles}


def fallback_search(query: str, allow_exact: bool = True) -> list[dict[str, object]]:
    q = normalize_symbol(query)
    text = query.strip().lower()
    matches = []
    seen = set()
    for symbol in sorted(FALLBACK_SYMBOLS):
        name = FALLBACK_NAMES.get(symbol, symbol)
        if q and q not in symbol and text not in name.lower():
            continue
        seen.add(symbol)
        matches.append({
            "ticker": symbol,
            "name": name,
            "exchange": "Preview catalog",
            "quoteType": "Preview symbol",
            "asset": classify(symbol, None, None),
        })
    if allow_exact and q and valid_symbol_shape(q) and q in FALLBACK_SYMBOLS and q not in seen:
        alpaca_symbol, asset_kind = to_alpaca_symbol(q)
        label = "Preview exact lookup" if asset_kind != "unsupported" else "Provider extension needed"
        matches.insert(0, {
            "ticker": q,
            "name": FALLBACK_NAMES.get(q, f"Search exact symbol {alpaca_symbol}"),
            "exchange": label,
            "quoteType": asset_kind,
            "asset": classify(q, None, None),
        })
    return matches[:10]


def date_epoch(value: str, *, end: bool = False) -> int:
    date = datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
    if end:
        date += timedelta(days=1)
    return int(date.timestamp())


def fallback_interval_seconds(interval: str) -> int:
    if interval.endswith("m") and interval[:-1].isdigit():
        return int(interval[:-1]) * 60
    if interval in {"60m", "1h"}:
        return 3600
    if interval == "1wk":
        return 7 * 86400
    if interval.endswith("mo") and interval[:-2].isdigit():
        return int(interval[:-2]) * 30 * 86400
    return 86400


def fallback_count(range_value: str, interval: str, start: str, end: str) -> int:
    if interval.endswith("m") or interval in {"60m", "1h"}:
        return {"1d": 180, "5d": 240, "1mo": 320, "3mo": 360, "6mo": 420}.get(range_value, 260)
    return {"1d": 96, "5d": 160, "1mo": 90, "3mo": 140, "6mo": 180, "1y": 260, "2y": 320, "5y": 360, "10y": 520}.get(range_value, 260)


def fallback_start_epoch(count: int, step: int, start: str) -> int:
    if start:
        try:
            return date_epoch(start)
        except ValueError:
            pass
    end_dt = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    return int((end_dt - timedelta(seconds=step * count)).timestamp())


def fallback_window_times(start: str, end: str, step: int) -> list[int]:
    first = int(parse_date(start).timestamp())
    last = int(parse_date(end).timestamp())
    if first > last:
        raise ValueError("Invalid chart date window")
    # Long intraday windows are sampled across the requested period instead of
    # allocating millions of preview bars or silently omitting the end date.
    maximum = 520 if step < 86400 else 2000
    count = min(maximum, (last - first) // step + 1)
    if count == maximum and first + (count - 1) * step < last:
        return [first + (last - first) * index // (count - 1) for index in range(count)]
    return [first + index * step for index in range(count)]


def fallback_candles(symbol: str, range_value: str, interval: str, start: str, end: str) -> list[dict[str, object]]:
    ticker = symbol.upper()
    step = fallback_interval_seconds(interval)
    if start and end:
        timestamps = fallback_window_times(start, end, step)
    else:
        count = fallback_count(range_value, interval, start, end)
        start_ts = fallback_start_epoch(count, step, start)
        timestamps = range(start_ts, start_ts + count * step, step)
        if range_value == "ytd":
            now = datetime.now(timezone.utc)
            first = datetime(now.year, 1, 1, tzinfo=timezone.utc)
            timestamps = [int((first + timedelta(days=index)).timestamp())
                          for index in range((now - first).days + 1)]
        elif interval.endswith("mo"):
            months = int(interval[:-2])
            now = datetime.now(timezone.utc)
            month_index = now.year * 12 + now.month - 1
            timestamps = []
            for index in range(count):
                year, month = divmod(month_index - (count - index) * months, 12)
                timestamps.append(int(datetime(year, month + 1, 1, tzinfo=timezone.utc).timestamp()))
    seed = sum((idx + 1) * ord(char) for idx, char in enumerate(ticker))
    price = 18 + (seed % 240)
    if ticker.startswith("^"):
        price *= 12
    if ticker.endswith("-USD"):
        price *= 120
    candles = []
    for idx, timestamp in enumerate(timestamps):
        drift = ((seed % 9) - 4) * 0.00035 + math.sin((idx + seed % 23) / 16) * 0.004
        pulse = math.sin((idx * 5 + seed) / 11) * (0.006 + (seed % 5) * 0.001)
        open_price = max(0.1, price)
        close = max(0.1, open_price * (1 + drift + pulse))
        spread = max(open_price, close) * (0.006 + abs(math.sin(idx + seed)) * 0.012)
        high = max(open_price, close) + spread
        low = max(0.1, min(open_price, close) - spread)
        volume = int(900_000 + (seed % 500_000) + abs(math.sin(idx / 7 + seed)) * 2_000_000)
        candles.append({
            "time": timestamp,
            "open": round(open_price, 4),
            "high": round(high, 4),
            "low": round(low, 4),
            "close": round(close, 4),
            "volume": volume,
        })
        price = close
    return candles


def fallback_payload(symbol: str, range_value: str, interval: str, start: str, end: str, reason: str) -> dict[str, object]:
    ticker = symbol.upper()
    return {
        "ticker": ticker,
        "name": FALLBACK_NAMES.get(ticker, ticker),
        "exchange": "Local preview fallback",
        "asset": classify(ticker, None, None),
        "currency": "USD",
        "range": range_value,
        "interval": interval,
        "start": start,
        "end": end,
        "source": PREVIEW_SOURCE,
        "sourceNote": reason,
        "candles": fallback_candles(ticker, range_value, interval, start, end),
    }


def fallback_quote_payload(symbol: str, reason: str) -> dict[str, object]:
    ticker = symbol.upper()
    candles = fallback_candles(ticker, "5d", "5m", "", "")
    last = candles[-1]
    prior = candles[-2] if len(candles) > 1 else last
    price = float(last["close"])
    previous = float(prior["close"]) or price
    change = price - previous
    return {
        "ticker": ticker,
        "name": FALLBACK_NAMES.get(ticker, ticker),
        "exchange": "Local preview fallback",
        "asset": classify(ticker, None, None),
        "currency": "USD",
        "price": round(price, 4),
        "change": round(change, 4),
        "changePercent": round((change / previous) * 100, 4) if previous else 0,
        "marketState": "PREVIEW",
        "quoteTime": int(time()),
        "source": PREVIEW_SOURCE,
        "sourceNote": reason,
    }


def game_candles(*args):
    # Only server-selected Daily/Competitive preparation uses this callback.
    # These games must not inherit an anonymous HTTP caller's public quota.
    with provider_work("system"):
        return fetch_provider_candles(*args)


RESULT_STORE = ResultStore(Path(os.getenv("PRETIUM_DATA_DIR") or ROOT / ".local-data").resolve() / "daily.sqlite3")
ACCOUNT_CATALOG = json.loads((ROOT / "account-catalog.json").read_text(encoding="utf-8"))


def account_paper_quote(scope, symbol, replay_time):
    if not valid_symbol_shape(symbol):
        raise DailyError(400, "Use a valid market symbol.")
    if scope == "live":
        range_value, interval, start, end = "5d", "5m", "", ""
    else:
        pack = ACCOUNT_CATALOG["packs"].get(scope[5:])
        if not pack or symbol not in pack["symbols"]:
            raise DailyError(400, "This symbol is not in the selected Event Pack.")
        range_value, interval, start, end = "", "1d", pack["start"], pack["end"]
        day = datetime.fromtimestamp(replay_time, timezone.utc).date().isoformat()
        if not start <= day <= end:
            raise DailyError(400, "Replay time is outside this Event Pack.")
    # AccountData.trade establishes the verified owner's provider workload.
    ticker, asset, currency, exchange, source, note, candles = fetch_provider_candles(symbol, range_value, interval, start, end)
    if scope != "live":
        candles = [bar for bar in candles if bar["time"] <= replay_time]
        if not candles:
            raise DailyError(409, "Choose an available historical candle.")
    if not candles:
        raise DailyError(503, "No verified market price is available.")
    return {"ticker": normalize_symbol(ticker), "name": FALLBACK_NAMES.get(symbol, symbol),
            "price": candles[-1]["close"], "currency": currency, "asset": asset, "source": source,
            "lastUpdated": datetime.now(timezone.utc).isoformat()}


ACCOUNT_DATA = AccountData(RESULT_STORE, account_paper_quote, ACCOUNT_CATALOG["lessons"], ACCOUNT_CATALOG["packs"])
DAILY_STORE = DailyStore(
    Path(os.getenv("PRETIUM_DATA_DIR") or ROOT / ".local-data").resolve() / "daily.sqlite3",
    game_candles,
    os.getenv("PRETIUM_DAILY_START_DATE") or None,
    result_store=RESULT_STORE,
)
def account_principal(headers, *, optional=False):
    return authenticate_account(headers, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, optional=optional)


def reauthenticate_deletion(owner, password, headers):
    try:
        request = Request(SUPABASE_URL + "/auth/v1/user", headers={"Authorization": headers.get("Authorization", ""), "apikey": SUPABASE_PUBLISHABLE_KEY})
        with urlopen(request, timeout=10) as response:
            user = json.load(response)
        if "user:" + user.get("id", "") != owner or not user.get("email"):
            raise DailyError(401, "Sign in again before deleting your account.")
        request = Request(SUPABASE_URL + "/auth/v1/token?grant_type=password", data=json.dumps({"email": user["email"], "password": password}).encode(),
                          headers={"apikey": SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json"}, method="POST")
        with urlopen(request, timeout=10) as response:
            verified = json.load(response)
        if "user:" + verified.get("user", {}).get("id", "") != owner:
            raise DailyError(401, "The current password could not be verified.")
    except HTTPError as exc:
        raise DailyError(401 if exc.code in {400, 401, 403} else 503,
                         "The current password could not be verified." if exc.code in {400, 401, 403} else "Account authentication is temporarily unavailable.") from None
    except (URLError, TimeoutError, OSError, ValueError, TypeError):
        raise DailyError(503, "Account authentication is temporarily unavailable.") from None


ACCOUNT_DELETION = AccountDeletion(RESULT_STORE, reauthenticate_deletion)
ADMIN_SERVICE = AdminService(RESULT_STORE, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)


def settle_pending_results(stop):
    """Resolve accepted Live predictions even when their browser disconnects."""
    if DATABASES_DETACHED:
        return
    while not stop.is_set():
        try:
            ADMIN_SERVICE.tick()
            data_by_target = {}
            for attempt in RESULT_STORE.pending_live():
                puzzle = json.loads(attempt["payload"])
                if time() < puzzle["targetEnd"]:
                    continue
                if time() > puzzle["targetEnd"] + 120:
                    RESULT_STORE.void_live(attempt["owner"], attempt["id"])
                    continue
                key = (puzzle["ticker"], puzzle["liveInterval"], puzzle["liveHistory"], puzzle["targetStart"])
                try:
                    if key not in data_by_target:
                        with provider_work("settlement"):
                            data_by_target[key] = live_chart_payload(*key)
                    RESULT_STORE.settle_live(attempt["owner"], attempt["id"], data_by_target[key])
                except (DailyError, OSError, ValueError, RuntimeError):
                    # Feed delays remain pending until the existing two-minute deadline.
                    continue
        except (OSError, sqlite3.Error):
            pass
        stop.wait(5)


def daily_principal(headers) -> str:
    """Daily access requires a verified account, including reads and archives."""
    if re.fullmatch(r"Bearer [a-f0-9]{64}", headers.get("Authorization", "")):
        raise DailyError(401, "Sign in or create an account to play Daily Puzzles.")
    return account_principal(headers)


class Handler(AdminHandlerMixin, GuestHandlerMixin, AccountDataHandlerMixin, HistoryHandlerMixin, SimpleHTTPRequestHandler):
    admin_service = ADMIN_SERVICE
    result_store = RESULT_STORE
    account_data = ACCOUNT_DATA
    account_deletion = ACCOUNT_DELETION
    def live_provider(self, *args):
        # HistoryHandlerMixin calls this only after loading an owned, pending
        # attempt and checking its close/deadline. HTTP targets never reach it.
        with provider_work("settlement"):
            return live_chart_payload(*args)

    def handle(self):
        self._work_releases = []
        try:
            super().handle()
        except (ConnectionError, TimeoutError):
            # Client disconnects and deadline shutdowns are expected, including
            # Windows' socket-aborted errors; all permits still release below.
            self.close_connection = True
        finally:
            REQUEST_OWNER.set("")
            REQUEST_SESSION_CREATED.set(None)
            for release in reversed(self._work_releases):
                release()

    def account_owner(self, headers, *, optional=False):
        if not hasattr(self, "_verified_owner"):
            owner = account_principal(headers, optional=optional)
            if owner:
                from admin_auth import game_session
                REQUEST_SESSION_CREATED.set(game_session(self.result_store, owner, headers.get("Authorization", "")))
            if owner and hasattr(getattr(self, "server", None), "limiter"):
                try:
                    limiter = self.server.limiter
                    limiter.take("account", owner)
                    policy = route_policy(urlparse(self.path).path, self.command)
                    specific = {"market": "account_market", "write": "account_write", "events": "account_events"}.get(policy)
                    if specific:
                        limiter.take(specific, owner)
                    if policy != "events":
                        self._work_releases.append(self.server.account_work.acquire(owner))
                except AdmissionError as exc:
                    raise DailyError(exc.status, str(exc), exc.retry_after) from None
            self._verified_owner = owner
        if not self._verified_owner and not optional:
            raise DailyError(401, "Sign in to access saved account history.")
        REQUEST_OWNER.set(self._verified_owner or "")
        return self._verified_owner

    def daily_owner(self):
        if re.fullmatch(r"Bearer [a-f0-9]{64}", self.headers.get("Authorization", "")):
            raise DailyError(401, "Sign in or create an account to play Daily Puzzles.")
        return self.account_owner(self.headers)

    def practice_owner(self):
        token = self.headers.get("Authorization", "")
        if not token:
            return self.guest_owner()
        if re.fullmatch(r"Bearer [a-f0-9]{64}", token):
            return "anon:" + hashlib.sha256(token[7:].encode()).hexdigest()
        return self.account_owner(self.headers)

    def guest_account(self, user):
        owner = authenticate_account(self.headers, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, user_out=user)
        from admin_auth import game_session
        REQUEST_SESSION_CREATED.set(game_session(self.result_store, owner, self.headers.get("Authorization", "")))
        REQUEST_OWNER.set(owner)
        return owner

    def admit_api_request(self):
        if not hasattr(self.server, "limiter"):
            return True  # Legacy isolated adapters; application startup uses BoundedHTTPServer.
        path = urlparse(self.path).path
        if len(self.path) > 4096:
            self.send_json(414, {"error": "Request URL is too long."})
            return False
        # Reject ambiguous framing before any body read or upstream operation.
        lengths = self.headers.get_all("Content-Length", [])
        if (self.headers.get("Transfer-Encoding") is not None or len(lengths) > 1
                or (lengths and (len(lengths[0]) > 10 or not lengths[0].isascii() or not lengths[0].isdigit()))):
            self.send_json(400, {"error": "Invalid request framing."})
            return False
        if lengths and int(lengths[0]) > 1048576:
            self.send_json(413, {"error": "Request body is too large."})
            return False
        if not path.startswith("/api/") and path != "/healthz":
            return True
        try:
            self._client_ip = client_ip(self.client_address[0], self.headers, self.server.trusted_proxies)
            limiter = self.server.limiter
            limiter.take("api", self._client_ip)
            limiter.take("global", "all")
            policy = route_policy(path, self.command)
            limiter.take(policy, self._client_ip)
            pool = self.server.stream_work if policy == "events" else self.server.api_work
            self._work_releases.append(pool.acquire(self._client_ip))
        except AdmissionError as exc:
            self.send_json(exc.status, {"error": str(exc)}, retry_after=exc.retry_after)
            return False
        except ValueError:
            self.send_json(400, {"error": "Invalid proxy client address."})
            return False
        return True

    def is_https(self):
        # Forwarded headers are authoritative only behind a configured TLS proxy
        # that replaces client-supplied X-Forwarded-Proto and isolates the origin.
        return isinstance(self.connection, ssl.SSLSocket) or (
            TRUST_TLS_PROXY and self.headers.get("X-Forwarded-Proto", "").lower() == "https")

    def is_local_preview(self):
        # A forged Host header or a loopback proxy peer must not exempt hosting.
        return (not TRUST_TLS_PROXY
                and self.server.server_address[0] in {"127.0.0.1", "::1"}
                and self.client_address[0] in {"127.0.0.1", "::1"}
                and urlparse("//" + self.headers.get("Host", "")).hostname in {"localhost", "127.0.0.1", "::1"})

    def parse_request(self):
        original_reader = self.rfile
        self.rfile = HeaderReader(original_reader)
        try:
            parsed = super().parse_request()
        finally:
            self.rfile = original_reader
        if not parsed:
            return False
        self.close_connection = True
        if hasattr(self.server, "parsed_request"):
            self.server.parsed_request(self.connection)
        if self.is_https() or self.is_local_preview():
            path = urlparse(self.path).path
            admin_or_health = path.startswith("/api/admin/v1/") or path == "/healthz"
            dynamic_maintenance = False if DATABASES_DETACHED else self.admin_service.maintenance
            # Admin/health/refund processing must survive both maintenance switches.
            refund_path = path == "/api/progress/wallet" or path == "/api/guest/wallet"
            if (MAINTENANCE_MODE or dynamic_maintenance) and not (admin_or_health or refund_path):
                self.handle_maintenance_request()
                return False
            if not self.admit_api_request():
                return False
            if path.startswith("/api/ai/"):
                return handle_ai(self, GEMINI_BACKEND)
            if path == "/learn" or path.startswith(("/learn/", "/api/learn/")):
                return proxy_learn(self, LEARN_PORT)
            return True
        origin = urlparse(PUBLIC_ORIGIN)
        if (self.command in {"GET", "HEAD"} and origin.scheme == "https" and origin.hostname
                and not origin.username and not origin.password and origin.path in {"", "/"}
                and not origin.query and not origin.fragment):
            self.send_response(308)
            # Always use the configured origin, never a request-supplied host.
            self.send_header("Location", PUBLIC_ORIGIN + "/" + self.path.lstrip("/"))
        else:
            # Do not process or replay credential-bearing requests sent over HTTP.
            self.send_response(426)
        self.send_header("Content-Length", "0")
        self.send_header("Connection", "close")
        self.close_connection = True
        self.end_headers()
        return False

    def handle_maintenance_request(self):
        # Intercept before dispatch, including HEAD and every write method. No
        # authentication, game, or storage handler runs during the pause.
        path = urlparse(self.path).path
        assets = {
            "/maintenance.css": "text/css; charset=utf-8",
            "/assets/pretiumlabs-logo.svg": "image/svg+xml",
            "/assets/pretiumlabs-mark.svg": "image/svg+xml",
        }
        read_only = self.command in {"GET", "HEAD"}
        status = 503
        if read_only and path in assets:
            body = (ROOT / path.lstrip("/")).read_bytes()
            content_type = assets[path]
            status = 200
        elif read_only and path == "/healthz":
            # Hosting health checks must work without opening a database.
            body = b'{"status":"ok","maintenance":true}'
            content_type = "application/json"
            status = 200
        elif path.startswith("/api/") or not read_only:
            body = b'{"error":"Pretium Labs is under maintenance. Please try again later.","maintenance":true}'
            content_type = "application/json"
        else:
            body = (ROOT / "maintenance.html").read_bytes()
            content_type = "text/html; charset=utf-8"
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if status == 503:
            self.send_header("Retry-After", "3600")
        # Never dispatch an unread request body as another request on this socket.
        self.send_header("Connection", "close")
        self.close_connection = True
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def rate_peer(self) -> str:
        # Share the ingress identity rules with persistent guest Daily admission.
        if hasattr(self, "_client_ip"):
            return self._client_ip
        return client_ip(self.client_address[0], self.headers,
                         getattr(self.server, "trusted_proxies", ()))

    timeout = 10

    def end_headers(self):
        cookie = self.__dict__.pop("_guest_cookie", None)
        if cookie:
            self.send_header("Set-Cookie", cookie)
        if hasattr(self, "headers") and self.is_https():
            self.send_header("Strict-Transport-Security", "max-age=31536000")
        # App documents/scripts must never be reused from cache.
        if not self.path.startswith("/assets/"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def translate_path(self, path: str) -> str:
        clean = urlparse(path).path.lstrip("/") or "index.html"
        target = (ROOT / clean).resolve()
        try:
            relative = target.relative_to(ROOT)
        except ValueError:
            return str(ROOT / "__not_found__")
        if len(relative.parts) == 1 and relative.name in PUBLIC_STATIC_FILES:
            return str(target)
        if len(relative.parts) == 2 and relative.parts[0] == "locales" and relative.name in PUBLIC_LANGUAGE_FILES:
            return str(target)
        if (len(relative.parts) >= 2 and relative.parts[0] == "assets"
                and target.suffix.lower() in PUBLIC_ASSET_SUFFIXES and target.is_file()):
            return str(target)
        return str(ROOT / "__not_found__")

    def send_head(self):
        if self.translate_path(self.path) == str(ROOT / "__not_found__"):
            self.send_error(404)
            return None
        return super().send_head()

    def send_json(self, status: int, payload: object, retry_after: int | None = None, *, compress: bool = False) -> None:
        if status == 429 and retry_after is None:
            retry_after = 30
        if retry_after is not None and isinstance(payload, dict):
            payload = {**payload, "retryAfter": retry_after}
        body = json.dumps(payload).encode("utf-8")
        encoding = re.search(r"(?:^|,)\s*gzip\s*(?:;\s*q=([01](?:\.\d+)?))?\s*(?:,|$)",
                             self.headers.get("Accept-Encoding", ""), re.I) if compress else None
        use_gzip = bool(encoding and float(encoding.group(1) or "1") > 0 and len(body) >= 1024)
        if use_gzip:
            body = gzip.compress(body, compresslevel=1, mtime=0)
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        if compress:
            self.send_header("Vary", "Accept-Encoding")
        if use_gzip:
            self.send_header("Content-Encoding", "gzip")
        self.send_header("Content-Length", str(len(body)))
        if retry_after is not None:
            self.send_header("Retry-After", str(retry_after))
        self.end_headers()
        if getattr(self, "command", "GET") != "HEAD":
            self.wfile.write(body)

    def reject_post(self, status: int, payload: object) -> None:
        # An unread small POST body can reset the response socket on Windows.
        # Bound both the bytes and wait so invalid requests cannot hold a thread.
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if 0 < length <= 8192:
            previous_timeout = self.connection.gettimeout()
            try:
                self.connection.settimeout(0.5)
                self.rfile.read(length)
            except OSError:
                pass
            finally:
                self.connection.settimeout(previous_timeout)
        self.send_json(status, payload)

    def do_POST(self) -> None:
        if urlparse(self.path).path == PRETIUM_AI_PATH:
            handle_chat(self, available=not PUBLIC_ORIGIN and self.is_local_preview())
            return
        if DATABASES_DETACHED:
            self.reject_post(410, {"error": "Account storage is disconnected in this preview."})
            return
        self.__dict__.pop("_verified_owner", None)
        REQUEST_OWNER.set("")
        REQUEST_SESSION_CREATED.set(None)
        if urlparse(self.path).path.startswith("/api/admin/v1/"):
            self.handle_admin(urlparse(self.path).path, write=True)
            return
        if urlparse(self.path).path.startswith("/api/guest/"):
            self.handle_guest(urlparse(self.path).path, write=True)
            return
        if urlparse(self.path).path.startswith("/api/account-data/"):
            self.handle_account_data(urlparse(self.path).path, write=True)
            return
        if urlparse(self.path).path.startswith("/api/progress/") or urlparse(self.path).path == "/api/practice/attempt":
            self.handle_progress_post(urlparse(self.path).path)
            return
        if urlparse(self.path).path == "/api/account/username-login":
            self.handle_username_login()
            return
        if urlparse(self.path).path == "/api/daily/attempt":
            self.handle_daily_attempt()
            return
        self.reject_post(404, {"error": "Unknown endpoint"})

    def handle_username_login(self) -> None:
        origin = self.headers.get("Origin")
        if origin and urlparse(origin).netloc.casefold() != self.headers.get("Host", "").casefold():
            self.reject_post(403, {"error": "Cross-origin login is not accepted"})
            return
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            self.reject_post(415, {"error": "JSON content required"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if not 2 <= length <= 2048:
            self.reject_post(413, {"error": "Invalid login request size"})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except TimeoutError:
            self.send_json(408, {"error": "Request body timed out."})
            return
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "Invalid login request"})
            return
        if not isinstance(payload, dict):
            self.send_json(400, {"error": "Invalid login request"})
            return
        username = payload.get("username")
        password = payload.get("password")
        if (not isinstance(username, str) or not re.fullmatch(r"[A-Za-z0-9_]{3,30}", username.strip())
                or not isinstance(password, str) or not 1 <= len(password) <= 96):
            self.send_json(401, {"error": "Username or password is incorrect."})
            return
        if not (SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY):
            self.send_json(503, {"error": "Username login is not configured on this server yet."})
            return

        username = username.strip()
        if hasattr(self.server, "limiter"):
            try:
                target = hashlib.sha256(username.casefold().encode()).hexdigest()
                self.server.limiter.take("login_target", (self._client_ip, target))
            except AdmissionError as exc:
                self.send_json(exc.status, {"error": str(exc)}, retry_after=exc.retry_after)
                return
        api_headers = {
            "apikey": SUPABASE_SECRET_KEY,
            "Content-Type": "application/json",
        }
        try:
            resolve_request = Request(
                f"{SUPABASE_URL}/rest/v1/rpc/resolve_username_for_login",
                data=json.dumps({"requested_username": username}).encode("utf-8"),
                headers=api_headers,
                method="POST",
            )
            with urlopen(resolve_request, timeout=10) as response:
                user_id = json.loads(response.read().decode("utf-8"))
            if not isinstance(user_id, str) or not re.fullmatch(r"[0-9a-fA-F-]{36}", user_id):
                self.send_json(401, {"error": "Username or password is incorrect."})
                return

            user_request = Request(
                f"{SUPABASE_URL}/auth/v1/admin/users/{quote(user_id, safe='')}",
                headers=api_headers,
            )
            with urlopen(user_request, timeout=10) as response:
                user_payload = json.loads(response.read().decode("utf-8"))
            email = user_payload.get("email") if isinstance(user_payload, dict) else None
            if not isinstance(email, str) or not email:
                self.send_json(401, {"error": "Username or password is incorrect."})
                return

            token_request = Request(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                data=json.dumps({"email": email, "password": password}).encode("utf-8"),
                headers={
                    "apikey": SUPABASE_PUBLISHABLE_KEY,
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urlopen(token_request, timeout=12) as response:
                session = json.loads(response.read().decode("utf-8"))
            self.send_json(200, session)
        except HTTPError as error:
            if error.code == 429:
                self.send_json(429, {"error": "Too many sign-in requests. Please wait and retry."},
                               retry_after=retry_seconds(error.headers.get("Retry-After")))
                return
            # Do not reveal whether a username exists or expose Supabase internals.
            status = 401 if error.code in {400, 401, 403, 404} else 503
            self.send_json(status, {"error": "Username or password is incorrect." if status == 401 else "Sign-in is temporarily unavailable."})
        except (URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError):
            self.send_json(503, {"error": "Sign-in is temporarily unavailable. Try again."})

    def handle_auth_config_script(self) -> None:
        payload = {
            "url": SUPABASE_URL,
            "publishableKey": SUPABASE_PUBLISHABLE_KEY,
        }
        body = f"window.PRETIUM_SUPABASE_CONFIG = {json.dumps(payload)};".encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/javascript; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path in {"/api/marketpulse/classifications", "/api/marketpulse/overview"}:
            if parsed.query:
                self.send_json(400, {"error": "This public endpoint accepts no input."})
            else:
                load_news = public_daily_overview if parsed.path.endswith("/overview") else public_classifications
                self.send_json(200, load_news(), compress=True)
            return
        if DATABASES_DETACHED:
            path = parsed.path
            if path == "/healthz":
                self.send_json(200, {"status": "ok", "accountStorage": "disabled", "maintenance": MAINTENANCE_MODE})
            elif path in {"/api/search", "/api/quote", "/api/chart", "/api/live-chart"}:
                if "practice" in parse_qs(parsed.query):
                    self.send_json(410, {"error": "Server-saved predictions are disconnected in this preview."})
                    return
                {"/api/search": self.handle_search, "/api/quote": self.handle_quote,
                 "/api/chart": self.handle_chart, "/api/live-chart": self.handle_live_chart}[path](parsed.query)
            elif path.startswith("/api/"):
                self.send_json(410, {"error": "Account storage is disconnected in this preview."})
            else:
                super().do_GET()
            return
        self.__dict__.pop("_verified_owner", None)
        REQUEST_OWNER.set("")
        REQUEST_SESSION_CREATED.set(None)
        if parsed.path.startswith("/api/admin/v1/"):
            self.handle_admin(parsed.path, parsed.query)
            return
        if parsed.path.startswith("/api/guest/"):
            self.handle_guest(parsed.path)
            return
        if parsed.path.startswith("/api/account-data/"):
            self.handle_account_data(parsed.path, parsed.query)
            return
        if parsed.path == "/healthz":
            if MAINTENANCE_MODE:
                self.handle_maintenance_request()
                return
            try:
                with self.result_store.connect() as db:
                    db.execute("SELECT 1").fetchone()
                    maintenance = bool(db.execute("SELECT 1 FROM admin_controls WHERE scope='all' AND state='maintenance'").fetchone())
                self.send_json(200, {"status": "ok", "accountStorage": "supabase" if cloud_database_enabled() else "sqlite",
                    "commit": os.getenv("RENDER_GIT_COMMIT", "local"), "maintenance": maintenance})
            except (OSError, sqlite3.Error):
                self.send_json(503, {"status": "unavailable", "error": "Secure account database is unavailable."})
            return
        if parsed.path in {"/api/chart", "/api/live-chart", "/api/search", "/api/quote"}:
            try:
                if parsed.path == "/api/chart" and "practice" in parse_qs(parsed.query):
                    self.practice_owner()
                else:
                    self.account_owner(self.headers, optional=parsed.path != "/api/live-chart")
            except DailyError as exc:
                self.send_json(exc.status, {"error": str(exc)}, retry_after=exc.retry_after)
                return
        if parsed.path.startswith("/api/progress/"):
            self.handle_progress_get(parsed.path, parsed.query)
            return
        if parsed.path == "/api/auth/config.js":
            self.handle_auth_config_script()
            return
        if parsed.path in {"/api/daily/status", "/api/daily/puzzle"}:
            self.handle_daily_get(parsed.path, parsed.query)
            return
        market_handlers = {"/api/search": self.handle_search, "/api/quote": self.handle_quote,
                           "/api/chart": self.handle_chart, "/api/live-chart": self.handle_live_chart}
        if parsed.path in market_handlers:
            owner = getattr(self, "_verified_owner", None)
            try:
                with provider_work("interactive" if owner else "public", owner or "", self.rate_peer()):
                    market_handlers[parsed.path](parsed.query)
            except DailyError as exc:
                self.send_json(exc.status, {"error": str(exc), **({"code": exc.code} if getattr(exc, "code", None) else {})}, retry_after=exc.retry_after)
            return
        static_path = Path(parsed.path)
        if static_path.suffix in {".py", ".pyc"} or "__pycache__" in static_path.parts:
            self.send_error(404)
            return
        return super().do_GET()

    def handle_daily_get(self, path: str, query: str) -> None:
        try:
            principal = self.daily_owner()
            params = parse_qs(query)
            if path == "/api/daily/status":
                payload = DAILY_STORE.status(principal, params.get("month", [None])[0])
            else:
                payload = DAILY_STORE.get(params.get("date", [utc_today()])[0], principal)
            self.send_json(200, payload)
        except DailyError as exc:
            self.send_json(exc.status, {"error": str(exc)}, retry_after=exc.retry_after)
        except (OSError, sqlite3.Error):
            self.send_json(503, {"error": "Daily puzzle storage is unavailable. Please try again shortly."})

    def handle_daily_attempt(self) -> None:
        origin = self.headers.get("Origin")
        if origin and urlparse(origin).netloc.casefold() != self.headers.get("Host", "").casefold():
            self.reject_post(403, {"error": "Cross-origin Daily submissions are not accepted."})
            return
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            self.reject_post(415, {"error": "JSON content required"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if not 2 <= length <= 1024:
            self.reject_post(413, {"error": "Invalid Daily submission size."})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict) or any(not isinstance(payload.get(key), str) for key in ("date", "puzzleId", "choice")):
                raise DailyError(400, "Provide a puzzle date, ID, and prediction.")
            principal = self.daily_owner()
            response = DAILY_STORE.submit(payload["date"], principal, payload["puzzleId"], payload["choice"], peer=self.rate_peer(), visibility=payload.get("visibility"))
            if response.get("result"):
                response["result"]["summary"] = self.history_summary(principal)
            self.send_json(200, response)
        except TimeoutError:
            self.send_json(408, {"error": "Request body timed out."})
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "Invalid JSON"})
        except DailyError as exc:
            self.send_json(exc.status, {"error": str(exc)}, retry_after=exc.retry_after)
        except (OSError, sqlite3.Error):
            self.send_json(503, {"error": "Your answer could not be saved. Please retry the same prediction."})

    def handle_search(self, query: str) -> None:
        q = parse_qs(query).get("q", [""])[0].strip()
        if not q:
            self.send_json(200, {"quotes": []})
            return
        try:
            yahoo_quotes = fetch_yahoo_search(q)
            if yahoo_quotes:
                self.send_json(200, {
                    "quotes": yahoo_quotes,
                    "source": YAHOO_SOURCE,
                    "sourceNote": "Yahoo Finance search data; Alpaca is reserved for Live puzzles.",
                })
                return
            self.send_json(200, {
                "quotes": fallback_search(q, allow_exact=False),
                "source": YAHOO_SOURCE,
                "sourceNote": "No provider match found for that query.",
            })
            return
        except MarketDataBusy as exc:
            self.send_json(429, {"error": str(exc)}, retry_after=exc.retry_after)
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, LookupError, RuntimeError, ValueError) as exc:
            self.send_json(200, {
                "quotes": fallback_search(q, allow_exact=True),
                "source": PREVIEW_SOURCE,
                "sourceNote": provider_error_message(exc),
            })

    def handle_quote(self, query: str) -> None:
        symbol = parse_qs(query).get("symbol", [""])[0].strip()
        if not symbol:
            self.send_json(400, {"error": "Missing symbol"})
            return
        if not valid_symbol_shape(symbol):
            self.send_json(400, {"error": "Use a valid market symbol."})
            return
        try:
            ticker, asset_kind, currency, exchange, source, source_note, candles = fetch_provider_candles(symbol, "5d", "5m", "", "")
            if len(candles) < 2:
                ticker, asset_kind, currency, exchange, source, source_note, candles = fetch_provider_candles(symbol, "1mo", "1d", "", "")
            last = candles[-1]
            prior = candles[-2] if len(candles) > 1 else last
            price = float(last["close"])
            previous = float(prior["close"]) or price
            change = price - previous
            self.send_json(200, {
                "ticker": normalize_symbol(ticker or symbol),
                "name": FALLBACK_NAMES.get(normalize_symbol(symbol), FALLBACK_NAMES.get(normalize_symbol(ticker), normalize_symbol(ticker or symbol))),
                "exchange": exchange,
                "asset": asset_kind,
                "currency": currency,
                "price": round(price, 4),
                "change": round(change, 4),
                "changePercent": round((change / previous) * 100, 4) if previous else 0,
                "marketState": "LATEST_AVAILABLE",
                "quoteTime": int(last["time"]),
                "source": f"{source} latest available bar",
                "sourceNote": source_note,
            })
        except MarketDataBusy as exc:
            self.send_json(429, {"error": str(exc)}, retry_after=exc.retry_after)
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, LookupError, RuntimeError, ValueError) as exc:
            self.send_json(502, {"error": f"Market data could not verify {symbol}. {provider_error_message(exc)}"})

    def handle_live_chart(self, query: str) -> None:
        params = parse_qs(query)
        try:
            target_text = params.get("target", [""])[0]
            payload = live_chart_payload(params.get("symbol", [""])[0], params.get("interval", ["1m"])[0],
                                         params.get("history", ["1D"])[0], int(target_text) if target_text else None)
            owner = None if DATABASES_DETACHED else self.account_owner(self.headers, optional=True)
            if owner and not target_text:
                payload["puzzleId"] = RESULT_STORE.issue_live(owner, payload, params.get("interval", ["1m"])[0], params.get("history", ["1D"])[0])
            self.send_json(200, payload, compress=True)
        except DailyError as exc:
            self.send_json(exc.status, {"error": str(exc)}, retry_after=exc.retry_after)
        except sqlite3.Error:
            self.send_json(503, {"error": "Account history is temporarily unavailable."})
        except ValueError as exc:
            self.send_json(400, {"error": str(exc)})
        except MarketDataBusy as exc:
            self.send_json(429, {"error": str(exc), "retryAfter": exc.retry_after}, retry_after=exc.retry_after)
        except RuntimeError as exc:
            self.send_json(503, {"error": str(exc)})
        except HTTPError as exc:
            if exc.code == 401:
                self.send_json(503, {"error": "Alpaca rejected the server API keys. Check .env.local and restart the server."})
            elif exc.code == 403:
                self.send_json(503, {"error": "Alpaca denied access to this feed. Basic accounts should use ALPACA_STOCK_FEED=iex; SIP needs the appropriate subscription."})
            else:
                self.send_json(502, {"error": "Alpaca market data is temporarily unavailable. Please retry."})
        except (URLError, TimeoutError, json.JSONDecodeError, LookupError) as exc:
            message = str(exc) if isinstance(exc, LookupError) else "Live market data is unavailable. Check your provider connection and real-time feed access."
            if isinstance(exc, LookupError) and message.startswith("No fresh market candles"):
                # A closed market is an application state, not a broken gateway.
                # Proxies can replace a 502 body and hide this status from clients.
                self.send_json(200, {"marketClosed": True, "error": message})
                return
            self.send_json(502, {"error": message})

    def handle_chart(self, query: str) -> None:
        params = parse_qs(query)
        symbol = params.get("symbol", [""])[0].strip()
        range_value = params.get("range", ["5y"])[0]
        interval = params.get("interval", ["1d"])[0]
        start = params.get("start", [""])[0].strip()
        end = params.get("end", [""])[0].strip()
        practice = params.get("practice", [""])[0]
        if "practice" in params and (practice not in {"free", "speed", "packs"}
                or practice in {"free", "speed"} and (start or end)
                or practice == "packs" and (interval != "1d" or (start, end) not in EVENT_PACK_WINDOWS)):
            self.send_json(400, {"error": "Use a server-selected practice window or a published Event Pack."})
            return
        if not symbol:
            self.send_json(400, {"error": "Missing symbol"})
            return
        if not valid_symbol_shape(symbol):
            self.send_json(400, {"error": "Use a valid market symbol."})
            return
        if bool(start) != bool(end):
            self.send_json(400, {"error": "Provide both chart start and end dates"})
            return
        if start and end:
            try:
                start_date = parse_date(start)
                end_date = parse_date(end)
                parse_date(end, end=True)
                if start_date > end_date:
                    raise ValueError("Start date is after end date")
            except (ValueError, OverflowError):
                self.send_json(400, {"error": "Invalid chart date window"})
                return
        try:
            ticker, asset_kind, currency, exchange, source, source_note, candles = fetch_provider_candles(symbol, range_value, interval, start, end)
            if len(candles) < 40:
                raise LookupError(f"Not enough market history for {symbol}.")
            payload = {
                "ticker": normalize_symbol(ticker or symbol),
                "name": FALLBACK_NAMES.get(normalize_symbol(symbol), FALLBACK_NAMES.get(normalize_symbol(ticker), normalize_symbol(ticker or symbol))),
                "exchange": exchange,
                "asset": asset_kind,
                "currency": currency,
                "range": range_value,
                "interval": interval,
                "start": start,
                "end": end,
                "source": source,
                "sourceNote": source_note,
                "candles": candles,
            }
            if "practice" in params:
                owner = self.practice_owner()
                admission = "guest-peer:" + hashlib.sha256(self.rate_peer().encode()).hexdigest() if owner.startswith("anon:") else None
                payload = self.result_store.issue_hidden(owner, payload, params["practice"][0], params.get("timeframe", [""])[0], admission=admission)
            elif not DATABASES_DETACHED and (owner := self.account_owner(self.headers, optional=True)):
                payload["chartId"] = RESULT_STORE.chart(payload, owner=owner)
            self.send_json(200, payload, compress=True)
        except DailyError as exc:
            self.send_json(exc.status, {"error": str(exc)}, retry_after=exc.retry_after)
        except sqlite3.Error:
            self.send_json(503, {"error": "Account history is temporarily unavailable."})
        except MarketDataBusy as exc:
            self.send_json(429, {"error": str(exc)}, retry_after=exc.retry_after)
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, LookupError, RuntimeError, ValueError) as exc:
            self.send_json(502, {"error": f"Market data could not verify {symbol}. {provider_error_message(exc)}"})

    def guess_type(self, path: str) -> str:
        return mimetypes.guess_type(path)[0] or "application/octet-stream"


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Pretium Labs application server")
    parser.add_argument("--prepare-daily", metavar="YYYY-MM-DD", help="Save a Daily snapshot (up to seven days ahead), then exit")
    args = parser.parse_args()
    if args.prepare_daily:
        if DATABASES_DETACHED:
            parser.error("Daily snapshots are page-only; database preparation is disabled.")
        puzzle = DAILY_STORE.prepare(args.prepare_daily, prepare_future=True)
        print(f"Prepared {puzzle['id']} ({puzzle['ticker']}). Existing snapshots are preserved.")
        raise SystemExit(0)
    server = BoundedHTTPServer((os.getenv("HOST", "127.0.0.1"), int(os.getenv("PORT", "8766"))), Handler)
    print(f"Pretium Labs preview running at http://{server.server_address[0]}:{server.server_port}/index.html")
    print("Database connections disabled. Practice data and results stay in this page.")
    settlement_stop = threading.Event()
    settlement_thread = threading.Thread(target=settle_pending_results, args=(settlement_stop,), daemon=True)
    if not DATABASES_DETACHED:
        settlement_thread.start()
    try:
        server.serve_forever()
    finally:
        settlement_stop.set()
        if settlement_thread.is_alive():
            settlement_thread.join(timeout=15)
        server.server_close()
