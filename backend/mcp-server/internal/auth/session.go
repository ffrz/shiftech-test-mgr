package auth

import (
	"context"
	"fmt"
	"os"

	"github.com/shiftech/testify-platform/core"
)

// Session holds the validated API token identity and project scope
// for one call. Under stdio transport there is one Session per process
// (one client per process). Under HTTP transport there is one Session per
// request, derived from the Authorization header — see LoadFromToken and
// FromContext.
type Session struct {
	Identity  core.APITokenIdentity
	ProjectID string
	// RawToken keeps the bearer token for the duration of this session so
	// governance middleware can pass it to the mcp_begin_tool_call /
	// mcp_complete_tool_call RPCs (they hash it server-side). Stored in
	// memory only, never logged or persisted.
	RawToken string
}

// Load creates a Session by authenticating the API token from env.
// Used by the stdio transport (mcp-server/cmd/main.go), where one process
// serves exactly one client for its whole lifetime.
func Load(ctx context.Context, tokenRepo core.TokenRepository) (*Session, error) {
	rawToken := os.Getenv("TM_API_TOKEN")
	if rawToken == "" {
		return nil, fmt.Errorf("TM_API_TOKEN is not set")
	}
	projectID := os.Getenv("TM_PROJECT_ID")
	if projectID == "" {
		return nil, fmt.Errorf("TM_PROJECT_ID is not set")
	}
	return LoadFromToken(ctx, tokenRepo, rawToken, projectID)
}

// LoadFromToken authenticates a raw API token against an expected project
// scope. Used per-request by the HTTP transport (mcp-server/cmd-http),
// where a single process serves many clients concurrently and each
// request carries its own token.
func LoadFromToken(ctx context.Context, tokenRepo core.TokenRepository, rawToken, projectID string) (*Session, error) {
	if rawToken == "" {
		return nil, fmt.Errorf("API token is empty")
	}
	if projectID == "" {
		return nil, fmt.Errorf("project ID is empty")
	}

	id, err := tokenRepo.Authenticate(ctx, rawToken)
	if err != nil {
		return nil, fmt.Errorf("authenticate: %w", err)
	}
	if id.ProjectID != projectID {
		return nil, fmt.Errorf("token project %s does not match requested project %s", id.ProjectID, projectID)
	}

	return &Session{
		Identity:  *id,
		ProjectID: projectID,
		RawToken:  rawToken,
	}, nil
}

// HasScope checks whether the session's token includes a given scope.
func (s *Session) HasScope(scope core.TokenScope) bool {
	for _, sc := range s.Identity.Scopes {
		if sc == scope {
			return true
		}
	}
	return false
}

// EnsureScope returns an error if the session lacks the required scope.
func (s *Session) EnsureScope(required core.TokenScope) error {
	if !s.HasScope(required) {
		return fmt.Errorf("missing scope: %s", required)
	}
	return nil
}

// projectRefKeys are the argument keys that may carry a project reference.
// Mirrors the Node authService inspectProjectReferences: it walks every
// argument (recursively into objects and arrays) looking for a
// "project_id"/"projectId" key and asserts it matches the session scope.
var projectRefKeys = []string{"project_id", "projectId"}

// AssertProjectReferences walks the tool arguments recursively and verifies
// that every project reference matches the session's project scope. This is
// the defence-in-depth layer behind MCP scopes: even if a token carries the
// right write:xxx scope, a tool call can only ever target the project the
// token was issued for. Returns an error on the first mismatch, or nil when
// the arguments carry no project reference at all.
func (s *Session) AssertProjectReferences(args map[string]any) error {
	if len(args) == 0 {
		return nil
	}
	return s.walkProjectReferences("arguments", args)
}

func (s *Session) walkProjectReferences(path string, node any) error {
	switch v := node.(type) {
	case map[string]any:
		for key, val := range v {
			child := path + "." + key
			for _, refKey := range projectRefKeys {
				if key == refKey {
					if err := s.assertProjectRef(child, val); err != nil {
						return err
					}
				}
			}
			if err := s.walkProjectReferences(child, val); err != nil {
				return err
			}
		}
	case []any:
		for i, item := range v {
			if err := s.walkProjectReferences(fmt.Sprintf("%s[%d]", path, i), item); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *Session) assertProjectRef(path string, val any) error {
	strVal, ok := val.(string)
	if !ok {
		return fmt.Errorf("%s must be a string project reference", path)
	}
	if strVal != s.ProjectID {
		return fmt.Errorf("%s references project %q, but session is scoped to project %q", path, strVal, s.ProjectID)
	}
	return nil
}

// contextKey avoids collisions with context keys from other packages.
type contextKey struct{}

var sessionContextKey = contextKey{}

// WithSession returns a new context carrying the given Session. Used by the
// HTTP transport's HTTPContextFunc to attach a per-request Session before
// any tool handler runs.
func WithSession(ctx context.Context, s *Session) context.Context {
	return context.WithValue(ctx, sessionContextKey, s)
}

// FromContext retrieves the Session attached by WithSession. Tool handlers
// call this instead of reading a Registry field directly, so the same
// handler code works under both stdio (session set once via Registry) and
// HTTP (session set per-request via context) — see Registry.SessionFor.
func FromContext(ctx context.Context) (*Session, bool) {
	s, ok := ctx.Value(sessionContextKey).(*Session)
	return s, ok
}
