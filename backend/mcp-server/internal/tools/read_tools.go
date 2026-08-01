package tools

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/shiftech/testify-platform/core"
)

// ReadTools registers discovery/read-only tools.
//
// Validation spike scope (see backend/VALIDATION.md S2): only
// testify.project.list is wired for now. The rest of the read tool group
// (project.get, testcase.search, testplan.list/get, testrun.list/get,
// testresult.list, issue.search/get) is planned in TASKS.md T3.2 and
// intentionally left out here.
type ReadTools struct {
	reg *Registry
}

func (t *ReadTools) Name() string { return "read" }

func (t *ReadTools) Register(s *server.MCPServer) error {
	tool := mcp.NewTool("testify.project.list",
		mcp.WithDescription("List projects accessible to this project-scoped API token."),
		mcp.WithReadOnlyHintAnnotation(true),
		mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
	)
	s.AddTool(tool, t.listProjects)
	return nil
}

func (t *ReadTools) listProjects(ctx context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	projects, err := t.reg.Repos.Project.List(ctx, core.ProjectFilter{Limit: 50})
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	// Scope results to the token's project — ProjectFilter has no ID field
	// yet (only OwnerID/Status), so filter in-memory for this spike tool.
	// TODO(TASKS.md T3.2/T4.3): move this into a proper repository filter
	// once more read tools need the same scoping.
	scoped := make([]core.Project, 0, 1)
	for _, p := range projects {
		if p.ID == session.ProjectID {
			scoped = append(scoped, p)
		}
	}

	return mcp.NewToolResultStructured(scoped, fmt.Sprintf("%d project(s) found", len(scoped))), nil
}
