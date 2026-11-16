"""Private, stateless Gemini text-chat gateway for the local preview."""

from collections import deque
from http.client import HTTPException
import json
import os
import re
import threading
from time import monotonic
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

from request_limits import retry_seconds


MAX_REQUEST_BYTES = 32_768
MAX_RESPONSE_BYTES = 262_144
MAX_MESSAGES = 21
MAX_MESSAGE_CHARS = 8_000
MAX_TOTAL_CHARS = 16_000
MAX_OUTPUT_TOKENS = 2_048
PROVIDER_TIMEOUT = 20
DEFAULT_MODEL = "gemini-3.1-flash-lite"
SYSTEM_INSTRUCTION = (
    "You are the Pretium Labs assistant. Help users learn, reason, and understand "
    "markets and the app. Be clear about uncertainty and distinguish examples "
    "from verified facts. You have no access to live market data, accounts, "
    "portfolios, files, or tools. Do not claim to execute trades or change app "
    "data. Never request passwords, API keys, or sensitive personal information."
)


class AIError(Exception):
    def __init__(self, status, message, code, retry_after=None):
        super().__init__(message)
        self.status, self.code, self.retry_after = status, code, retry_after


class NoRedirects(HTTPRedirectHandler):
    # Never forward the provider credential to a redirected destination.
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def validate_messages(payload):
    if not isinstance(payload, dict) or set(payload) != {"messages"}:
        raise AIError(400, "Send a messages array only.", "invalid_request")
    messages = payload["messages"]
    if not isinstance(messages, list) or not 1 <= len(messages) <= MAX_MESSAGES:
        raise AIError(400, "Send between 1 and 21 messages.", "invalid_messages")
    contents, total = [], 0
    for index, message in enumerate(messages):
        expected_role = "user" if index % 2 == 0 else "assistant"
        if (not isinstance(message, dict) or set(message) != {"role", "content"}
                or message["role"] != expected_role):
            raise AIError(400, "Messages must alternate user and assistant, starting with user.", "invalid_messages")
        content = message["content"]
        if not isinstance(content, str) or not content.strip() or len(content) > MAX_MESSAGE_CHARS:
            raise AIError(400, "Each message needs 1 to 8000 characters of text.", "invalid_messages")
        # Reject lone surrogates, which cannot be sent as UTF-8 text.
        try:
            content.encode("utf-8")
        except UnicodeEncodeError:
            raise AIError(400, "Messages must contain valid Unicode text.", "invalid_messages") from None
        total += len(content)
        contents.append({"role": "user" if expected_role == "user" else "model", "parts": [{"text": content}]})
    if messages[-1]["role"] != "user" or total > MAX_TOTAL_CHARS:
        raise AIError(400, "End with a user message and keep the conversation within 16000 characters.", "invalid_messages")
    return contents


class GeminiBackend:
    def __init__(self, api_key="", model=DEFAULT_MODEL, *, opener=None, clock=monotonic):
        self._api_key = api_key.strip()
        self.model = model.strip()
        if self._api_key and not re.fullmatch(r"[A-Za-z0-9_-]{1,256}", self._api_key):
            raise ValueError("GEMINI_API_KEY has an invalid format; check the private server configuration.")
        if not re.fullmatch(r"gemini-[a-z0-9][a-z0-9._-]{0,79}", self.model):
            raise ValueError("GEMINI_MODEL must be a Gemini model ID, not a URL.")
        self._open = opener or build_opener(NoRedirects()).open
        self._clock = clock
        self._attempts = deque()
        self._active = 0
        self._paused_until = 0
        self._lock = threading.Lock()

    @classmethod
    def from_environment(cls):
        return cls(os.getenv("GEMINI_API_KEY", ""), os.getenv("GEMINI_MODEL", DEFAULT_MODEL))

    def status(self):
        return {"provider": "gemini", "configured": bool(self._api_key),
                "model": self.model, "localOnly": True, "storesConversations": False}

    def _admit(self):
        with self._lock:
            now = self._clock()
            while self._attempts and self._attempts[0] <= now - 86_400:
                self._attempts.popleft()
            if self._paused_until > now:
                raise AIError(429, "Gemini is busy. Please retry later.", "provider_rate_limit",
                              retry_seconds(self._paused_until - now))
            if self._active >= 2:
                raise AIError(429, "Two AI requests are already running. Please wait.", "busy", 2)
            if len(self._attempts) >= 200:
                raise AIError(429, "The local AI daily request limit has been reached.", "daily_limit",
                              retry_seconds(self._attempts[0] + 86_400 - now))
            recent = [stamp for stamp in self._attempts if stamp > now - 60]
            if len(recent) >= 12:
                raise AIError(429, "The local AI minute request limit has been reached.", "rate_limit",
                              retry_seconds(recent[0] + 60 - now))
            self._attempts.append(now)
            self._active += 1

    def chat(self, payload):
        contents = validate_messages(payload)
        if not self._api_key:
            raise AIError(503, "Gemini is not configured. Start the server with start_gemini.py.", "not_configured")
        self._admit()
        try:
            return self._generate(contents)
        finally:
            with self._lock:
                self._active -= 1

    def _generate(self, contents):
        request = Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            data=json.dumps({"contents": contents,
                             "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
                             "generationConfig": {"maxOutputTokens": MAX_OUTPUT_TOKENS, "candidateCount": 1}}).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": self._api_key}, method="POST")
        try:
            with self._open(request, timeout=PROVIDER_TIMEOUT) as response:
                raw = response.read(MAX_RESPONSE_BYTES + 1)
            if len(raw) > MAX_RESPONSE_BYTES:
                raise AIError(502, "Gemini returned too much data. Try a shorter question.", "invalid_response")
            result = json.loads(raw)
        except HTTPError as exc:
            try:
                if exc.code == 429:
                    delay = retry_seconds(exc.headers.get("Retry-After") if exc.headers else None, default=60)
                    with self._lock:
                        self._paused_until = max(self._paused_until, self._clock() + delay)
                    raise AIError(429, "Gemini quota is busy or exhausted. Check your provider quota.", "provider_rate_limit", delay) from None
                if exc.code in {401, 403}:
                    raise AIError(503, "Gemini rejected the server credential. Check your API key and access.", "provider_auth") from None
                if exc.code == 404:
                    raise AIError(503, "The configured Gemini model is unavailable. Check GEMINI_MODEL.", "model_unavailable") from None
                raise AIError(502, "Gemini could not complete the request. Try again later.", "provider_error") from None
            finally:
                exc.close()
        except (TimeoutError, URLError, OSError, HTTPException):
            raise AIError(503, "Gemini could not be reached in time. Please retry.", "provider_unavailable") from None
        except (ValueError, UnicodeError, RecursionError):
            raise AIError(502, "Gemini returned an invalid response.", "invalid_response") from None
        try:
            if result.get("promptFeedback", {}).get("blockReason"):
                raise AIError(422, "Gemini could not answer this request. Try rephrasing it.", "blocked")
            candidate = result["candidates"][0]
            finish = candidate.get("finishReason", "")
            if finish not in {"STOP", "MAX_TOKENS"}:
                raise AIError(422, "Gemini could not answer this request. Try rephrasing it.", "blocked")
            reply = "".join(part["text"] for part in candidate["content"]["parts"]
                            if isinstance(part.get("text"), str) and not part.get("thought"))
            if not reply.strip():
                raise ValueError("empty reply")
            usage = result.get("usageMetadata", {})
            counts = {name: usage[name] for name in ("promptTokenCount", "candidatesTokenCount", "totalTokenCount")
                      if type(usage.get(name)) is int and usage[name] >= 0}
            return {"reply": reply, "model": self.model, "finishReason": finish,
                    "truncated": finish == "MAX_TOKENS", "usage": counts}
        except (KeyError, IndexError, TypeError, AttributeError, ValueError):
            raise AIError(502, "Gemini returned an invalid response.", "invalid_response") from None


def handle_ai(handler, backend):
    """Runs after the platform's transport, maintenance, and admission checks."""
    # Accounts are detached. Do not turn this into an unauthenticated hosted relay.
    if not handler.is_local_preview():
        handler.reject_post(403, {"error": "AI is available only on the local preview.", "code": "local_only"})
        return False
    origin = handler.headers.get("Origin")
    if ((origin and origin != "http://" + handler.headers.get("Host", ""))
            or handler.headers.get("Sec-Fetch-Site", "none") not in {"none", "same-origin"}):
        handler.reject_post(403, {"error": "Use the app's own origin.", "code": "cross_origin"})
        return False
    path = urlparse(handler.path).path
    expected = {"/api/ai/status": ("GET", "HEAD"), "/api/ai/chat": ("POST",)}.get(path)
    if expected is None:
        handler.reject_post(404, {"error": "Unknown AI endpoint.", "code": "not_found"})
        return False
    if handler.command not in expected:
        handler.reject_post(405, {"error": "Unsupported AI request method.", "code": "method_not_allowed"})
        return False
    if path == "/api/ai/status":
        handler.send_json(200, backend.status())
        return False
    if handler.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
        handler.reject_post(415, {"error": "JSON content required.", "code": "invalid_content_type"})
        return False
    try:
        length = int(handler.headers.get("Content-Length", "0"))
    except ValueError:
        length = 0
    if not 2 <= length <= MAX_REQUEST_BYTES:
        handler.reject_post(413, {"error": "AI requests must be between 2 and 32768 bytes.", "code": "invalid_size"})
        return False
    try:
        raw = handler.rfile.read(length)
        if len(raw) != length:
            raise AIError(400, "Incomplete AI request.", "invalid_request")
        payload = json.loads(raw.decode("utf-8"))
        handler.send_json(200, backend.chat(payload))
    except (TimeoutError, OSError):
        handler.send_json(408, {"error": "AI request body timed out.", "code": "request_timeout"})
    except (ValueError, UnicodeError, RecursionError):
        handler.send_json(400, {"error": "Invalid JSON request.", "code": "invalid_json"})
    except AIError as exc:
        handler.send_json(exc.status, {"error": str(exc), "code": exc.code}, retry_after=exc.retry_after)
    return False
