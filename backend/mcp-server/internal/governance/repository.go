package governance

import (
	"context"

	"github.com/shiftech/testify-platform/mcp-server/internal/auth"
)

// Repository abstracts the two governance RPCs (mcp_begin_tool_call /
// mcp_complete_tool_call). The token and project are passed per call because
// the raw bearer token is only known at call time (HTTP transport serves many
// clients from one process); the RPCs hash the token server-side.
type Repository interface {
	// BeginToolCall reserves a call slot and writes the audit 'started' row.
	// It returns the audit row id and whether the call is within the limit.
	BeginToolCall(ctx context.Context, rawToken, projectID, toolName string, limit, windowSeconds int) (*BeginResult, error)
	// CompleteToolCall finalizes the audit row with status and latency.
	CompleteToolCall(ctx context.Context, rawToken, projectID, auditID, status string, latencyMs int) error
}

// BeginResult is the begin RPC's response row.
type BeginResult struct {
	AuditID string
	Allowed bool
}

// SessionResolver supplies the active session for one tool call, so the
// middleware can resolve the raw token + project scope without depending on
// tools.Registry (which would create an import cycle).
type SessionResolver interface {
	SessionFor(ctx context.Context) (*auth.Session, error)
}
