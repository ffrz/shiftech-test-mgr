package governance

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// ErrRateLimited is returned to the MCP client when a tool call exceeds the
// configured per-window limit. Handlers never see it directly — the middleware
// short-circuits before the underlying handler runs.
var ErrRateLimited = errors.New("MCP tool rate limit exceeded")

// DefaultRateLimit and DefaultRateLimitWindow are the fallbacks used when the
// environment does not configure them. They mirror the RPC defaults.
const (
	DefaultRateLimit       = 120
	DefaultRateLimitWindow = 60
)

// Service wraps every tool handler with the same lifecycle the Node
// governanceService.execute implements: begin -> (deny if over limit) ->
// run handler -> complete with status + latency. It is deliberately
// middleware: tool handlers have no idea governance exists.
type Service struct {
	repo     Repository
	sessions SessionResolver

	limit         int
	windowSeconds int

	now func() time.Time
}

// NewService builds the governance middleware. limit/window default to the
// RPC defaults when zero; call WithRateLimit to override.
func NewService(repo Repository, sessions SessionResolver) *Service {
	return &Service{
		repo:          repo,
		sessions:      sessions,
		limit:         DefaultRateLimit,
		windowSeconds: DefaultRateLimitWindow,
		now:           time.Now,
	}
}

// WithRateLimit overrides the per-window call budget.
func (s *Service) WithRateLimit(limit, windowSeconds int) *Service {
	if limit > 0 {
		s.limit = limit
	}
	if windowSeconds > 0 {
		s.windowSeconds = windowSeconds
	}
	return s
}

// Wrap returns a handler that is governed by this service. toolName is the
// testify.* tool identifier recorded in the audit trail.
func (s *Service) Wrap(toolName string, handler server.ToolHandlerFunc) server.ToolHandlerFunc {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		session, err := s.sessions.SessionFor(ctx)
		if err != nil {
			return nil, fmt.Errorf("governance: %w", err)
		}

		started := s.now()
		audit, err := s.repo.BeginToolCall(ctx, session.RawToken, session.ProjectID, toolName, s.limit, s.windowSeconds)
		if err != nil {
			return nil, fmt.Errorf("governance: %w", err)
		}
		if !audit.Allowed {
			return nil, ErrRateLimited
		}

		result, handlerErr := handler(ctx, req)
		status := "completed"
		if handlerErr != nil {
			status = "failed"
		} else if result != nil && result.IsError {
			status = "failed"
		}

		latency := int(s.now().Sub(started).Milliseconds())
		if latency < 0 {
			latency = 0
		}
		// Matches the Node governanceService: a failed audit write is
		// propagated (the call is reported as failed), never silently
		// swallowed — a missing audit trail is itself a failure.
		if err := s.repo.CompleteToolCall(ctx, session.RawToken, session.ProjectID, audit.AuditID, status, latency); err != nil {
			return nil, fmt.Errorf("governance: %w", err)
		}
		return result, handlerErr
	}
}
