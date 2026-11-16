"""Same-origin routing for the Learn module's private Next.js service."""

from http.client import HTTPConnection, HTTPException
import re
from urllib.parse import urlsplit


LEARN_PAGES = re.compile(
    r"/learn(?:/(?:lessons(?:/[a-z0-9-]+)?|patterns|tutor|simulator|progress))?/?"
)
# Next encodes the brackets in dynamic route directories such as [id].
LEARN_ASSETS = re.compile(r"/learn/_next/static/(?:(?:[\w.-]+|%5[Bb]\w+%5[Dd])/)*[\w.-]+", re.ASCII)
LEARN_API_METHODS = {
    "/api/learn/status": "GET",
    "/api/learn/tutor": "POST",
    "/api/learn/patterns": "POST",
    "/api/learn/payment-plan": "POST",
}
REQUEST_HEADERS = (
    "Accept", "Content-Type", "If-Modified-Since", "If-None-Match", "Origin",
    "Sec-Fetch-Site", "RSC", "Next-Router-State-Tree", "Next-Router-Prefetch",
    "Next-Router-Segment-Prefetch", "Next-Url",
)
RESPONSE_HEADERS = {
    "cache-control", "content-encoding", "content-length", "content-type", "etag",
    "last-modified", "retry-after", "vary", "x-learn-model",
}


def learn_method(path):
    if path in LEARN_API_METHODS:
        return LEARN_API_METHODS[path]
    if LEARN_PAGES.fullmatch(path):
        return "GET"
    if LEARN_ASSETS.fullmatch(path) and all(part not in {".", ".."} for part in path.split("/")):
        return "GET"
    return None


def proxy_learn(handler, port):
    target = urlsplit(handler.path)
    method = learn_method(target.path)
    if method is None:
        handler.send_error(404)
        return False
    allowed = (method, "HEAD") if method == "GET" else (method,)
    if handler.command not in allowed:
        handler.send_response(405)
        handler.send_header("Allow", ", ".join(allowed))
        handler.send_header("Content-Length", "0")
        handler.end_headers()
        return False
    if port is None:
        handler.send_json(503, {"error": "Pretium Labs Learn is temporarily unavailable."})
        return False

    body = None
    if method == "POST":
        size = int(handler.headers.get("Content-Length", "0"))
        if size > 16_384:
            handler.reject_post(413, {"error": "Learn request is too large."})
            return False
        try:
            body = handler.rfile.read(size)
        except OSError:
            handler.send_json(408, {"error": "Learn request body timed out."})
            return False
        if len(body) != size:
            handler.send_json(400, {"error": "Incomplete Learn request."})
            return False

    headers = {name: handler.headers[name] for name in REQUEST_HEADERS if name in handler.headers}
    headers["Host"] = handler.headers.get("Host", "127.0.0.1")
    headers["X-Pretium-Learn-Host"] = "platform"
    if "Origin" in headers:
        scheme = "https" if handler.is_https() else "http"
        if headers["Origin"] != scheme + "://" + headers["Host"] and headers.get("Sec-Fetch-Site") != "same-origin":
            handler.send_json(403, {"error": "Use the app’s own origin."})
            return False
    path = target.path.rstrip("/") or "/learn"
    if target.query:
        path += "?" + target.query
    upstream = HTTPConnection("127.0.0.1", port, timeout=25)
    committed = False
    try:
        upstream.request(handler.command, path, body=body, headers=headers)
        response = upstream.getresponse()
        committed = True
        handler.send_response(response.status)
        handler.send_header("Connection", "close")
        for name, value in response.getheaders():
            if name.lower() in RESPONSE_HEADERS:
                handler.send_header(name, value)
            elif name.lower() == "location" and value.startswith("/learn/") and learn_method(urlsplit(value).path):
                handler.send_header(name, value)
        handler.end_headers()
        if handler.command != "HEAD":
            while block := response.read1(16_384):
                handler.wfile.write(block)
                handler.wfile.flush()
    except (OSError, HTTPException):
        if not committed:
            handler.send_json(503, {"error": "Pretium Labs Learn is temporarily unavailable."})
    finally:
        upstream.close()
    return False
