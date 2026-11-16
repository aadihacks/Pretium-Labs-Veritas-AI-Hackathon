"""Online Supabase identity verification and live session checks, never metadata roles."""
import base64
import json
import os
import re
import uuid
import sqlite3
from time import time
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from account_database import cloud_database_enabled
from daily_puzzles import DailyError


def claims_after_verification(authorization):
    try:
        token = authorization[7:]
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError()
        payload = json.loads(base64.urlsafe_b64decode(parts[1] + "=" * (-len(parts[1]) % 4)))
        if not isinstance(payload, dict) or payload.get("aud") != "authenticated" or payload.get("exp", 0) <= time():
            raise ValueError()
        uuid.UUID(payload["session_id"])
        return payload
    except (ValueError, KeyError, TypeError):
        raise DailyError(401, "A current authenticated session is required.") from None


def live_session(db, owner, claims):
    if claims.get("sub") != owner[5:]:
        raise DailyError(401, "Session identity mismatch.")
    row = db.execute("SELECT created_at,not_after FROM financelabs.admin_live_session(?,?)", (claims["session_id"], owner[5:])).fetchone()
    if not row:
        raise DailyError(401, "This session was revoked. Sign in again.")
    created = datetime.fromisoformat(str(row[0]).replace("Z", "+00:00")).timestamp()
    if row[1] and datetime.fromisoformat(str(row[1]).replace("Z", "+00:00")).timestamp() <= time():
        raise DailyError(401, "This session expired. Sign in again.")
    return created


def set_subject(db, owner):
    if cloud_database_enabled():
        # Only a principal verified by Auth (or a protected server-shell/worker
        # action) reaches here. Private functions additionally check auth.uid().
        db.execute("SELECT set_config('request.jwt.claim.sub',?,true)", (owner[5:],))
        db.execute("SELECT set_config('request.jwt.claims',?,true)", (json.dumps({"sub": owner[5:]}),))


def check_cutoff(db, owner, created):
    row = db.execute("SELECT cutoff,locked FROM admin_sessions WHERE owner=?", (owner,)).fetchone()
    if row and (row[1] or created <= row[0]):
        raise DailyError(401, "This account is locked or its game sessions were invalidated. A new login is required.")


def authenticate(headers, url, key, *, fresh=False):
    if not cloud_database_enabled():
        raise DailyError(503, "Owner access requires the private Supabase database; SQLite never grants administrator access.")
    authorization = headers.get("Authorization", "")
    if not re.fullmatch(r"Bearer [A-Za-z0-9_.-]{32,8192}", authorization) or not url.startswith("https://") or not key:
        raise DailyError(401, "Sign in with the dedicated owner account.")
    try:
        with urlopen(Request(url + "/auth/v1/user", headers={"Authorization": authorization, "apikey": key}), timeout=10) as response:
            user = json.load(response)
    except HTTPError as error:
        raise DailyError(401 if error.code in {401, 403} else 503, "Owner authentication could not be verified.") from None
    except (URLError, OSError, ValueError):
        raise DailyError(503, "Owner authentication is unavailable.") from None
    claims = claims_after_verification(authorization)  # /user validated this exact token first.
    try:
        owner = "user:" + str(uuid.UUID(user["id"]))
        factors = user.get("factors") or []
        valid_totp = any(f.get("factor_type") == "totp" and f.get("status") == "verified" for f in factors)
        times = [a["timestamp"] for a in claims.get("amr", []) if a.get("method") == "totp" and type(a.get("timestamp")) in (int, float)]
        if (user.get("is_anonymous") or not user.get("email_confirmed_at") or not valid_totp
                or claims.get("aal") != "aal2" or claims.get("sub") != owner[5:]
                or not times or max(times) > time() + 30 or fresh and time() - max(times) > 300):
            raise ValueError()
    except (KeyError, TypeError, ValueError, AttributeError):
        raise DailyError(403, "Verified authenticator MFA is required; verify a fresh code before consequential actions.") from None
    return owner, claims


def authorize(db, owner, claims):
    row = db.execute("SELECT owner,enabled FROM admin_owner WHERE slot=1").fetchone()
    if not row or row[0] != owner or row[1] != 1:
        from misconduct import rejection
        raise rejection(403, "This account is not the active console owner.", "admin_access_denied")
    check_cutoff(db, owner, live_session(db, owner, claims))


def game_session(results, owner, authorization):
    """A refreshed token retains its session_id/creation time and stays invalid."""
    if not cloud_database_enabled():
        return None
    claims = claims_after_verification(authorization)
    try:
        with results.connect() as db:
            set_subject(db, owner)
            created = live_session(db, owner, claims)
            check_cutoff(db, owner, created)
    except (sqlite3.Error, OSError):
        raise DailyError(503, "Live account sessions could not be verified. Please retry.") from None
    return created
