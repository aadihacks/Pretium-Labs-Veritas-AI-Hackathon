# Request admission and overload handling

Run the application with `python server.py`. Its `BoundedHTTPServer` applies
connection admission before spawning a worker and API admission before reading
bodies, authenticating sessions, contacting market providers, or writing data.
Database-backed `/healthz` checks share API admission; maintenance health checks
remain cheap and do not open a database.
The existing maintenance switch is preserved. Provider admission initializes a
private `market_provider_budget` table through the existing database adapter.

The standard profile below retains the initial single-process limits. An opt-in
100-user profile is described below; neither profile guarantees hosted capacity.
The limiter uses token buckets: an idle caller may use its burst allowance, then
tokens refill at the configured requests per minute. Query strings and unknown
route suffixes share canonical policies. Changing tokens does not reset IP
limits; signed-in account limits use only the remotely verified identity.
Daily guest tokens retain IP limits and never establish verified account quotas.

| Policy | Requests/minute | Burst | Scope |
| --- | ---: | ---: | --- |
| connections | 600 | 120 | Direct socket peer |
| api | 600 | 120 | Client IP, all API routes |
| global | 1200 | 120 | All API requests in this process |
| login | 12 | 8 | Client IP |
| login_target | 6 | 5 | Client IP + hashed, case-normalized username |
| feedback | 3 | 3 | Client IP |
| feedback_global | 30 | 10 | All feedback in this process |
| market | 180 | 40 | Client IP; chart, live chart, quote, search, Daily puzzle |
| history | 300 | 80 | Client IP; account, Daily and Competitive reads |
| write | 180 | 60 | Client IP; remaining API mutations, including unknown routes |
| events | 60 | 20 | Client IP; stream connections |
| other | 120 | 30 | Client IP; remaining API reads |
| account | 240 | 60 | Verified account, all account-authenticated operations |
| account_market | 90 | 25 | Verified account; charts |
| account_write | 120 | 40 | Verified account; mutations |
| account_events | 12 | 6 | Verified account; stream connections |

Override a policy with `PRETIUM_LIMIT_<POLICY>_PER_MINUTE` and
`PRETIUM_LIMIT_<POLICY>_BURST` (upper-case policy name). Values must be positive
integers. Login targets combine caller and username so another IP cannot lock
out a victim account globally. Rejections include JSON retry metadata and
`Retry-After`: caller limits return 429, global exhaustion returns 503.
Pre-worker connection rejections have an empty body and the same retry header.

## Resource limits

| Setting | Default | Effect |
| --- | ---: | --- |
| PRETIUM_CONNECTIONS | 64 | Maximum accepted connection workers |
| PRETIUM_CONNECTIONS_PER_IP | 24 | Maximum workers per direct socket peer |
| PRETIUM_API_WORKERS | 16 | Active ordinary API requests; also account work capacity |
| PRETIUM_API_PER_IP | 6 | Active ordinary API requests per client IP |
| PRETIUM_STREAMS | 12 | Active stream requests, including authentication |
| PRETIUM_STREAMS_PER_IP | 6 | Active stream requests per client IP |
| PRETIUM_HEADER_SECONDS | 10 | Header deadline and socket inactivity limit |
| PRETIUM_REQUEST_SECONDS | 45 | Absolute socket deadline after parsing headers |
| PRETIUM_LIMIT_KEYS | 10000 | Maximum rate-state keys |
| PRETIUM_FEEDBACK_MAX_BYTES | 10485760 | Stop feedback writes once this file size is reached |

Verified accounts additionally have at most three simultaneous ordinary API
operations and three streams. Work pools refuse immediately rather than queue.
Streams use a separate pool so they do not consume ordinary API capacity.
Database slot acquisition waits at most two seconds; existing database
statement/network timeouts remain. Headers are capped at 32 KiB in aggregate,
URLs at 4096 characters, and bodies at 1 MiB, with smaller existing route limits.
Ambiguous Content-Length and Transfer-Encoding framing is rejected. Connections
close after each request. Deadlines close sockets; they do not kill Python work
already executing in a handler. Existing upstream and database timeouts, along
with finite worker caps, bound that remaining work.

The limiter expires fully replenished buckets and refuses new keys at capacity;
it never evicts an active restricted identity. The ordinary provider cache holds
at most 64 entries. Existing live-provider caching and request budgets remain.
Full feedback storage is preserved and returns 503; it is never rotated or
deleted automatically. The final permitted record may exceed the file threshold
by one record (route maximum 8192 bytes). Archive feedback through a separate
authorized maintenance operation before raising or reclaiming the limit.

The current Competitive client restores state once on entry. It polls only while
queued or in an unfinished match: one second after an active-match response, two
seconds otherwise, and five seconds in hidden tabs. Idle/completed users hold no
stream and run no recurring network or clock timer. Active queues/matches keep
updating when the player visits another mode. Account reset and pagehide cancel
pending work. Failed polls back off with jitter and respect Retry-After; healthy
polls reset the backoff. Ranked settlement failures retain their own backoff.
Clients do not automatically replay arbitrary mutations. The bounded legacy SSE
endpoint remains available for older clients with its existing separate limits.

## Opt-in 100-user profile

Set `PRETIUM_CAPACITY_PROFILE=100` before starting the server to select aggregate
headroom for 100-user workloads. Omit it (or use `standard`) for the conservative
defaults above. Unknown names fail startup. Explicit individual limit settings
still override profile values.

| Aggregate setting | Standard | 100-user profile |
| --- | ---: | ---: |
| All API requests/minute (burst) | 1200 (120) | 12000 (400) |
| Direct-peer connections/minute (burst) | 600 (120) | 24000 (800) |
| Ordinary API/account work slots | 16 | 32 |
| Connection workers | 64 | 96 |
| Connection workers per direct peer | 24 | 96 |
| Socket accept backlog | 32 | 128 |

Individual IP/account budgets, login throttles, account concurrency, body/header
limits, deadlines, database slots, provider budgets and legacy stream limits are
unchanged. Slots remain finite and overload is refused. Increased pre-header peer
headroom accommodates a shared ingress proxy; it does not establish trust in
forwarded headers or bypass post-header per-client admission. Verified proxy
configuration below is still necessary. Never use an all-address proxy range.

The profile is a capacity setting, not automatic scaling or a production SLA.

## Trusted proxy and public hosting setup

`PRETIUM_TRUSTED_PROXIES` is an explicit comma-separated list of proxy CIDRs;
it defaults to empty. TLS proxy trust is separate and does not enable IP-header
trust. An untrusted peer's X-Forwarded-For is ignored. For trusted peers, the
chain is parsed from right to left, stopping at the first untrusted address.
IPv4 spellings are normalized; IPv6 addresses share a /64 quota.

Only configure proxy ranges after verifying that the ingress strips or safely
appends caller forwarding headers and the origin cannot be reached through an
unprotected alternate path. Do not configure all-address ranges. When every
connection comes from one trusted proxy, the pre-header peer connection cap
still applies: set CONNECTIONS_PER_IP to the intended proxy capacity, no larger
than the global connection cap. Without verified proxy configuration callers
behind that proxy conservatively share its IP limits.

Before public rollout:

1. Put managed flood protection or a suitable production reverse proxy ahead of
   Python. Configure connection, header/body-size, request-duration and rate
   controls there; keep SSE unbuffered and permit its 25-second lifetime.
2. Verify direct-origin denial using every origin hostname/address. A DNS proxy
   alone does not establish origin protection. Document the exact trusted chain.
3. Keep one application process/replica for these process-local counters and
   Alpaca budgets. Before scaling, implement shared limits/provider budgets at
   a trusted common boundary. Restarts currently reset counters; they never
   restore data or bypass authentication.
4. Confirm Supabase Auth rate limits/CAPTCHA separately. Browser-direct Auth
   calls do not pass through this Python limiter. No Supabase forwarding setting
   is changed here; server-proxied login can still share an upstream IP bucket.
   [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
   require explicit forwarding enablement and a supported secret API key.
5. Run a controlled mixed workload on a representative isolated host: normal
   shared-network logins/gameplay plus invalid authentication, random URLs,
   extra streams and slow clients. Measure normal p95/p99 latency, RSS, threads,
   sockets, database waiters, provider calls, refusals and recovery. Start with
   these finite defaults and tune them to observed legitimate bursts and memory
   headroom. Do not load-test public services without authorization.

Application controls reduce resource exhaustion; they cannot absorb a network
flood or guarantee that the service cannot crash. Python's HTTP server remains
an interim runtime; [Python's production warning](https://docs.python.org/3/library/http.server.html)
still applies. This patch does not resume or deploy hosting, change DNS/edge
rules, alter provider settings, or modify persistent account data.

## Verification and recovery

Use `python -m unittest discover -s tests -p test_request_limits.py` for local
socket tests covering spam, identity rotation, bounded state, capacity, absolute
deadlines, framing, retry metadata, storage limits and recovery. Run the existing
security, account/history, market, consent, Daily and Competitive suites too.
Use `node --test tests/competitive-client.test.cjs tests/result-history.test.cjs`
for retry and existing account behavior. Browser verification uses port 8765.

If a threshold rejects legitimate work, adjust that policy and restart, keeping
finite resource caps. Source/configuration changes can be reverted independently
of account data. No migration or data restore is part of this change. Any later
deployment or destructive maintenance must follow AGENTS.md backup requirements.

## Shared provider admission

Each cache miss is admitted immediately before provider network access using
`market_provider_budget` in the same database as account storage. SQLite uses
BEGIN IMMEDIATE; hosted replicas share the existing PostgreSQL transaction lock,
state and database clock. No database failure falls back to a local allowance.
Two provider rows retain only the rolling minute of accepted calls and hashed
account/IP identities; arbitrary queries and denied calls do not add rows.

For each provider total N (Alpaca: ALPACA_REQUESTS_PER_MINUTE, default 180;
Yahoo: 180), public requests share at most floor(N/10) calls/minute. Public, verified interactive and
server-selected Daily/Competitive preparation together use at most floor(3N/4), reserving at least
25% for accepted Live settlement. Interactive accounts share floor(N/6) each,
and public/interactive requests share floor(N/3) per canonical IP (minimum one).
All tiers, including settlement, remain subject to the hard total and persisted
upstream cooldown. Alpaca N must be 4..10000 and must not exceed the verified
upstream entitlement. All replicas sharing credentials must use the same
account database/schema and configured total; other credential consumers must
be budgeted separately. Existing ingress limits are still process-local.

Live/Ranked chart requests require an eligible account before fetching, including
caller-supplied target requests. Only persisted pending-attempt settlement uses
the reserve. Server-selected Daily/Competitive preparation uses the non-public
allowance while remaining below the combined non-settlement ceiling. Signed-in
search/quote requests send the existing verified account headers. Search, quote, ordinary charts and guest practice remain public
within the public allowance. Cache hits and coalesced Live followers spend no
additional quota. Exhaustion preserves the existing 429/Retry-After behavior.

This is additive schema initialization, not a data cleanup. Back up the existing
account datastore before applying/deploying a change under the repository backup
policy; generation and isolated tests do not modify it. Keep the deployment
single-replica until shared PostgreSQL admission has passed staging validation.
