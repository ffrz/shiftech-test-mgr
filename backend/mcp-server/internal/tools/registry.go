package tools

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/shiftech/testify-platform/core"
	"github.com/shiftech/testify-platform/mcp-server/internal/auth"
	"github.com/shiftech/testify-platform/service"
)

// Registry holds all tool groups and wires them to the MCP server.
// Follows the same pattern as the Node MCP: ToolRegistrar → Service → Repository.
//
// Session is set once at startup under stdio transport (one process = one
// client, see mcp-server/cmd/main.go). It is left nil under HTTP transport
// (one process = many concurrent clients, see mcp-server/cmd-http/main.go),
// where each request's Session is attached to its own context instead
// (auth.WithSession, via HTTPContextFunc) — tool handlers must call
// SessionFor(ctx) rather than read r.Session directly, so the same handler
// works under both transports.
type Registry struct {
	Session  *auth.Session
	Services Services
}

// SessionFor resolves the Session for one tool call: the context-scoped
// session (HTTP transport) takes precedence if present, otherwise falls
// back to the Registry-wide session (stdio transport).
func (r *Registry) SessionFor(ctx context.Context) (*auth.Session, error) {
	if s, ok := auth.FromContext(ctx); ok {
		return s, nil
	}
	if r.Session != nil {
		return r.Session, nil
	}
	return nil, fmt.Errorf("no session available for this call")
}

// Services holds one service per aggregate. Tool handlers depend on these,
// never on core.XxxRepository directly — repositories are only constructed
// and injected into services once, at wiring time in main.go.
type Services struct {
	Project    *service.ProjectService
	TestCase   *service.TestCaseService
	TestPlan   *service.TestPlanService
	TestRun    *service.TestRunService
	TestResult *service.TestResultService
	Issue      *service.IssueService
	Module     *service.ModuleService
	Tag        *service.TagService
	TestRole   *service.TestRoleService
	Token      core.TokenRepository // auth check, not a business-logic repo — no service wrapper needed
}

// ReadOnly returns a subset of registrars for TM_MCP_READONLY=1 mode.
func (r *Registry) ReadOnly() []ToolRegistrar {
	return []ToolRegistrar{
		&ReadTools{r},
	}
}

// Full returns all registrars (read + write).
func (r *Registry) Full() []ToolRegistrar {
	return []ToolRegistrar{
		&ReadTools{r},
		&WriteTools{r},
		// &AutomationTools{r},
		// &AnalysisTools{r},
	}
}

// ToolRegistrar is the interface every tool group implements.
// Register registers all tools from this group onto the MCP server.
type ToolRegistrar interface {
	Register(s ToolAdder) error
	Name() string
}

// ToolAdder is the minimal server surface registrars need. It is satisfied by
// *server.MCPServer and by the governance wrapper (*governance.Server), so
// main wiring can choose whether tool calls are governed without touching
// any registrar code.
type ToolAdder interface {
	AddTool(tool mcp.Tool, handler server.ToolHandlerFunc)
}

// EnsureWriteScope is a helper used by write tools.
func EnsureWriteScope(s *auth.Session, scope core.TokenScope) error {
	if s == nil {
		return fmt.Errorf("session not initialised")
	}
	return s.EnsureScope(scope)
}
