# REST API

HTTP transport for the frontend, replacing Supabase as the direct backend.

Shares `core/` domain types and `repository/postgres/` implementations
with `mcp-server/`. The only difference is the transport layer:
Echo HTTP handlers instead of MCP tools.

Started as a no-auth validation spike (`../VALIDATION.md` S3) to prove the
shared-core architecture. Now building out per `../../docs/ROADMAP_V3.md`:

- **R3 (done)** — `internal/auth/`: Supabase Auth JWT verification
  (`RequireAuth`) + project-membership gating (`RequireProjectAccess`,
  replicates `has_project_access()`/`can_edit_project_content()`/
  `is_project_manager()` in Go, since RLS doesn't apply to a direct
  `DATABASE_URL` connection). Written in plain GORM — no raw SQL, no
  Postgres-only types — so it's tested against SQLite in-memory
  (`internal/auth/*_test.go`) without needing a live database.
- **R1/R2 (in progress)** — Issue endpoints first (the module G3 made
  full-parity), then the rest of the Testing Domain, each handler calling
  the same `service.*Service` MCP already uses — no logic duplicated
  between transports.

See `../RUNNING.md` for how to run it.
