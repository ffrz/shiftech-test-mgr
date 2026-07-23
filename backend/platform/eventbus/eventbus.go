// Package eventbus is the internal pub/sub used to push data-change
// notifications to SSE-connected clients (replacing Supabase Realtime's
// postgres_changes). Service methods that mutate data call Publish after a
// successful commit; the SSE handler subscribes and streams events out.
//
// Broadcaster is an interface so the single-instance in-memory
// implementation (inmemory.go) can later be swapped for a Redis-backed one
// if horizontal scaling becomes a real need — without touching any service
// or handler code.
package eventbus

import "context"

type Event struct {
	Table  string `json:"table"`  // e.g. "test_results", "issues" — mirrors the Supabase Realtime payload shape
	Action string `json:"action"` // "insert" | "update" | "delete"
	Data   any    `json:"data"`   // minimal row data needed to resolve a frontend query key (id, project_id, ...)
}

// Broadcaster publishes events to, and hands out subscriptions for,
// connected clients.
type Broadcaster interface {
	Publish(ctx context.Context, e Event)
	// Subscribe returns a channel of events and an unsubscribe function.
	// Callers must invoke the unsubscribe function when done (typically via
	// defer) to release the subscriber slot.
	Subscribe(ctx context.Context) (<-chan Event, func())
}
