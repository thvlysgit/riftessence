# API Diagnostics

The admin API diagnostics console is available at `/admin/diagnostics`. It is protected by the same server-side admin badge check as other administrative routes.

## What is retained

- Repeated HTTP 500-class responses, grouped by route, method, authenticated user, and sanitized error fingerprint.
- Rate-limit lockouts (HTTP 429) as warning incidents.
- Unhandled promise rejections, uncaught exceptions, startup failures, and shutdown failures.
- API process runs with a 30-second heartbeat and RSS/heap snapshots.
- An unclean-restart incident when the same container or dyno starts with a previous process run still marked active.
- Last success/failure and duration for the Riot verification/pending-rating worker and scrim auto-result worker.

Resolved incidents are retained for 30 days. Finished process runs are retained for 14 days.

## Privacy and security

Only admins can read or update diagnostics. Request bodies and client IP addresses are never stored. Credential-like key/value pairs, bearer values, JWT-shaped strings, and URL query strings are redacted before stdout logging and database persistence. Fields and stack traces are length-bounded.

## Interpreting common incidents

- `RATE_LIMITED_REQUEST`: a single client exhausted its 15-minute allowance. Filter by route and user, then inspect whether several browser tabs or high-frequency polling were active.
- `HANDLED_REQUEST_ERROR`: a route caught an exception and returned a controlled 500. The retained stack is the best starting point.
- `UNHANDLED_REQUEST_ERROR`: Fastify caught a thrown request error.
- `UNHANDLED_PROMISE_REJECTION` or `UNCAUGHT_EXCEPTION`: Node exited intentionally after a bounded attempt to retain the error.
- `UNCLEAN_PROCESS_RESTART`: the prior process disappeared without graceful shutdown. This covers native aborts and many OOM/SIGKILL cases that JavaScript handlers cannot intercept; use the last heartbeat memory snapshot and container stdout to narrow the OS-level cause.

## Deployment

The database migration must be applied before the new API process starts. The Docker API image already runs `prisma migrate deploy` in its startup command. After deployment, open `/admin/diagnostics` and confirm that persistence is `active`, a current process run is present, and both workers report a successful run.
