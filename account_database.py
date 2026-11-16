"""Local SQLite / durable PostgreSQL boundary for the account stores.

Database connections are disabled for this detached prototype. The retained
storage adapters cannot open SQLite or PostgreSQL connections in this checkout.
"""
import json
import os
import re
import sqlite3
import ssl
import socket
import threading
from queue import Empty, LifoQueue
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from urllib.request import Request, urlopen

_config = None
_config_lock = threading.Lock()
_pool_lock = threading.Lock()
_pools = {}
_ddl = {}
_slots = threading.BoundedSemaphore(4)
LOCK_ID = 7410101
# This checkout is a detached prototype. Environment variables cannot reconnect it.
DATABASES_DETACHED = True


def require_database_connection():
    if DATABASES_DETACHED:
        raise sqlite3.OperationalError("Database connections are disabled in this project.")


def cloud_database_enabled():
    backend = os.getenv("PRETIUM_DATABASE_BACKEND", "").lower()
    return backend == "supabase" or os.getenv("RENDER", "").lower() == "true"


def database_config():
    require_database_connection()
    global _config
    with _config_lock:
        if _config is not None:
            return dict(_config)
        url, key = os.getenv("SUPABASE_URL", "").rstrip("/"), os.getenv("SUPABASE_SECRET_KEY", "")
        if not url.startswith("https://") or not key:
            raise sqlite3.OperationalError("Secure account database is not configured.")
        try:
            request = Request(url + "/rest/v1/fl101_backend_config?id=eq.primary&select=connection", headers={
                "apikey": key, "Authorization": "Bearer " + key})
            with urlopen(request, timeout=10) as response:
                rows = json.load(response)
            settings = rows[0]["connection"]
            if not isinstance(settings, dict) or set(settings) != {"host", "port", "database", "user", "password"}:
                raise ValueError("Invalid account database configuration")
            if not str(settings["host"]).endswith((".supabase.co", ".pooler.supabase.com")) or settings["port"] not in (5432, 6543):
                raise ValueError("Invalid account database host")
            _config = settings
            return dict(_config)
        except Exception:
            raise sqlite3.OperationalError("Secure account database is unavailable.") from None


def portable_sql(sql):
    """Translate only the small, server-owned SQLite dialect used by these stores."""
    ignore = bool(re.search(r"\bINSERT OR IGNORE\b", sql, re.I))
    replace = bool(re.search(r"\bINSERT OR REPLACE\b", sql, re.I))
    sql = re.sub(r"\bINSERT OR (?:IGNORE|REPLACE)\b", "INSERT", sql, flags=re.I)
    sql = re.sub(r"\bREAL\b", "DOUBLE PRECISION", sql, flags=re.I)
    sql = re.sub(r"\bINTEGER\b", "BIGINT", sql, flags=re.I)
    sql = re.sub(r"\bwindow\b", '"window"', sql)
    sql = re.sub(r"length\(CAST\(([\w.]+) AS BLOB\)\)", r"octet_length(\1)", sql, flags=re.I)
    if re.match(r"\s*CREATE TABLE", sql, re.I):
        end = sql.rfind(")")
        sql = sql[:end] + ", rowid BIGINT GENERATED ALWAYS AS IDENTITY" + sql[end:]
    def extract(match):
        column, key = match.groups()
        if key in {"matchGroup", "favorite", "rewardEligible", "seenTracked"}:
            # Absent eligibility predates this patch and retains the old meaning.
            default = 1 if key == "rewardEligible" else 0
            return f"(CASE WHEN {column}::jsonb->'{key}' IS NULL THEN {default} WHEN {column}::jsonb->'{key}'='true'::jsonb THEN 1 ELSE 0 END)"
        return f"({column}::jsonb->>'{key}')"
    sql = re.sub(r"json_extract\(([\w.]+),\s*'\$\.([\w]+)'\)", extract, sql)
    sql = re.sub(r"date\(at,\?\)", "((at::timestamptz + ?::interval)::date)", sql)
    sql = re.sub(r"SELECT 1 FROM sqlite_master WHERE type='table' AND name='([\w]+)'",
                 r"SELECT 1 FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='\1'", sql)
    if ignore:
        sql += " ON CONFLICT DO NOTHING"
    if replace:
        if "INTO wallet_ranked " in sql:
            sql += " ON CONFLICT(owner,id) DO UPDATE SET puzzle_id=excluded.puzzle_id,status=excluded.status,stake=excluded.stake,choice=excluded.choice,cycle=excluded.cycle"
        elif "INTO result_review " in sql:
            sql += " ON CONFLICT(owner,record_id) DO UPDATE SET payload=excluded.payload,version=excluded.version"
        else:
            raise sqlite3.OperationalError("Unsupported account database statement.")
    return sql


class Row:
    def __init__(self, names, values):
        self.names = names
        self.values = tuple(int(v) if isinstance(v, Decimal) and v == int(v) else float(v) if isinstance(v, Decimal)
                            else v.isoformat() if isinstance(v, (date, datetime)) else v for v in values)

    def keys(self):
        return self.names

    def __getitem__(self, key):
        return self.values[key if isinstance(key, int) else self.names.index(key)]

    def __iter__(self):
        return iter(self.values)


class Cursor:
    def __init__(self, cursor=None):
        if cursor is None:
            self.rowcount, self.rows = 0, iter([])
            return
        self.rowcount = cursor.rowcount
        names = [column[0] for column in cursor.description] if cursor.description else []
        self.rows = iter([Row(names, values) for values in cursor.fetchall()] if names else [])
        cursor.close()

    def fetchone(self):
        return next(self.rows, None)

    def fetchall(self):
        return list(self.rows)

    def __iter__(self):
        return self.rows


class PostgresConnection:
    def __init__(self):
        require_database_connection()
        self.native = None
        self.broken = False
        self.closed = False
        wire = None
        if not _slots.acquire(timeout=2):
            raise sqlite3.OperationalError("Secure account database is busy. Please retry.")
        try:
            from pg8000 import dbapi
            dbapi.paramstyle = "qmark"
            schema = os.getenv("PRETIUM_DATABASE_SCHEMA", "financelabs")
            if not re.fullmatch(r"financelabs(?:_[a-z0-9_]{1,40})?", schema):
                raise ValueError("Invalid account schema")
            settings = database_config()
            if settings["host"].endswith(".pooler.supabase.com") and "." not in settings["user"]:
                project = os.environ["SUPABASE_URL"].split("//", 1)[1].split(".", 1)[0]
                settings["user"] += "." + project
            self.pool_key = (settings["host"], settings["user"], schema)
            with _pool_lock:
                self.pool = _pools.setdefault(self.pool_key, LifoQueue())
                _ddl.setdefault(self.pool_key, set())
            try:
                self.native = self.pool.get_nowait()
            except Empty:
                tls = ssl.create_default_context()
                tls.load_verify_locations(str(Path(__file__).parent / "supabase" / "database-ca.crt"))
                wire = socket.create_connection((settings["host"], settings["port"]), timeout=15)
                wire.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
                wire.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
                self.native = dbapi.connect(**settings, sock=wire, ssl_context=tls,
                    timeout=15, application_name="financelabs101", startup_params={"search_path": schema + ",pg_catalog"})
                setup = self.native.cursor()
                setup.execute("SET statement_timeout='15s'")
                setup.execute("SET lock_timeout='15s'")
                setup.execute("SET idle_in_transaction_session_timeout='20s'")
                setup.close()
                self.native.commit()
            self.locked = False
            self.pending_ddl = set()
            self.row_factory = None
        except Exception:
            try:
                if self.native is not None:
                    self.native.close()
                elif wire is not None:
                    wire.close()
            finally:
                _slots.release()
            raise sqlite3.OperationalError("Secure account database connection failed.") from None

    def execute(self, sql, parameters=()):
        try:
            ddl = bool(re.match(r"\s*CREATE (?:TABLE|INDEX)", sql, re.I))
            if ddl and sql in _ddl[self.pool_key]:
                return Cursor()
            if not self.locked:
                # Same writer serialization as SQLite BEGIN IMMEDIATE, including
                # across Render restarts/processes. Released by commit/rollback.
                cursor = self.native.cursor()
                cursor.execute("SELECT pg_advisory_xact_lock(?)", (LOCK_ID,))
                cursor.close()
                self.locked = True
            if sql.strip().upper() == "BEGIN IMMEDIATE":
                sql = "SELECT 1"
            cursor = self.native.cursor()
            cursor.execute(portable_sql(sql), parameters)
            if ddl:
                table = re.match(r"\s*CREATE TABLE IF NOT EXISTS ([a-z_]+)", sql, re.I)
                if table:
                    guard = self.native.cursor()
                    guard.execute('ALTER TABLE "' + table[1] + '" ENABLE ROW LEVEL SECURITY')
                    guard.close()
                self.pending_ddl.add(sql)
            return Cursor(cursor)
        except sqlite3.Error:
            raise
        except Exception as error:
            self.broken = True
            raise sqlite3.OperationalError("Account database transaction failed.") from error

    def executescript(self, sql):
        for statement in sql.split(";"):
            if statement.strip():
                self.execute(statement)

    def commit(self):
        try:
            self.native.commit()
            with _pool_lock:
                _ddl[self.pool_key].update(self.pending_ddl)
            self.pending_ddl.clear()
            self.locked = False
        except Exception as error:
            self.broken = True
            raise sqlite3.OperationalError("Account database commit failed.") from error

    def rollback(self):
        try:
            self.native.rollback()
            self.pending_ddl.clear()
            self.locked = False
        except Exception as error:
            self.broken = True
            raise sqlite3.OperationalError("Account database rollback failed.") from error

    def close(self):
        if self.closed:
            return
        self.closed = True
        try:
            if self.broken or self.locked:
                self.native.close()
            else:
                self.pool.put_nowait(self.native)
        finally:
            _slots.release()


def connect_database(path):
    require_database_connection()
    if cloud_database_enabled():
        return PostgresConnection()
    return sqlite3.connect(path, timeout=15)
