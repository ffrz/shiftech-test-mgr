# backend/ — STATUS: PENDING

This directory is an **experimental Go backend** (`cmd/api`, `cmd/migrate`,
`internal/{domain,repository,service,transport}`, `platform/{config,database,eventbus,jwt,logger}`).

**As of 2026-07-25, this track is paused.** The team decided to reach MVP on the
Platform Evolution redesign (see [`docs/ARCHITECTURE_V2.md`](../docs/ARCHITECTURE_V2.md)
and [`docs/ROADMAP_V2.md`](../docs/ROADMAP_V2.md)) entirely on the existing
Supabase-backed frontend first, and only resume/reconsider this custom backend
afterward.

Do not build new features here until the Platform Evolution MVP ships and the
team explicitly resumes this track. Existing code is left in place, not deleted —
it's a reference for when backend work restarts, not dead weight to clean up.

Why the design still expects a Go backend eventually: see `docs/ARCHITECTURE_V2.md`
§8 (API Boundary Proposal) — the frontend's Repository layer is kept swappable
specifically so this backend can replace Supabase calls later with minimal
disruption to the Testing Context.
