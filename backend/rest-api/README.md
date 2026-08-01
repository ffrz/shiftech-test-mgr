# REST API

HTTP transport for the frontend, replacing Supabase as the direct backend.

Shares `core/` domain types and `repository/postgres/` implementations
with `mcp-server/`. The only difference is the transport layer:
Echo HTTP handlers instead of MCP tools.

**Status: validation spike only** (see `../VALIDATION.md` S3) — one
endpoint (`GET /projects`), no auth. Full build-out is `../TASKS.md` Fase 7,
which starts after MCP server coverage (Fase 2-6) is done.

See `../RUNNING.md` for how to run it.
