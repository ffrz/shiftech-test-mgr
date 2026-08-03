package main

import (
	"context"
	"log"
	"os"
	"strconv"

	"github.com/mark3labs/mcp-go/server"
	"github.com/shiftech/testify-platform/mcp-server/internal/auth"
	"github.com/shiftech/testify-platform/mcp-server/internal/governance"
	"github.com/shiftech/testify-platform/mcp-server/internal/tools"
	"github.com/shiftech/testify-platform/repository/postgres"
	"github.com/shiftech/testify-platform/service"
	pgdriver "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	ctx := context.Background()

	// 1. Connect to Supabase Postgres
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is not set")
	}
	db, err := gorm.Open(pgdriver.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}

	// 2. Wire repositories (postgres implements core ports), then wrap each
	// in its service — tool handlers only ever see Services, never Repos.
	tokenRepo := postgres.NewTokenRepo(db)
	issueRepo := postgres.NewIssueRepo(db)
	testResultRepo := postgres.NewTestResultRepo(db)
	services := tools.Services{
		Project:    service.NewProjectService(postgres.NewProjectRepo(db)),
		TestCase:   service.NewTestCaseService(postgres.NewTestCaseRepo(db)),
		TestPlan:   service.NewTestPlanService(postgres.NewTestPlanRepo(db)),
		TestRun:    service.NewTestRunService(postgres.NewTestRunRepo(db), testResultRepo),
		TestResult: service.NewTestResultService(testResultRepo),
		Issue: service.NewIssueService(issueRepo, service.IssueContextSources{
			Profiles:      postgres.NewProfileRepo(db),
			Activity:      postgres.NewActivityRepo(db),
			Attachments:   postgres.NewAttachmentRepo(db),
			Notifications: postgres.NewNotificationRepo(db),
		}),
		Module:     service.NewModuleService(postgres.NewModuleRepo(db)),
		Tag:        service.NewTagService(postgres.NewTagRepo(db)),
		TestRole:   service.NewTestRoleService(postgres.NewTestRoleRepo(db)),
		Automation: service.NewAutomationService(postgres.NewAutomationRepo(db)),
		Analysis:   service.NewAnalysisService(postgres.NewAnalysisRepo(db)),
		Repo:       service.NewRepoService(postgres.NewRepoRepo(db)),
		Token:      tokenRepo,
	}

	// 3. Authenticate session
	session, err := auth.Load(ctx, tokenRepo)
	if err != nil {
		log.Fatalf("auth: %v", err)
	}
	log.Printf("authenticated: token=%s project=%s scopes=%v",
		session.Identity.TokenID, session.ProjectID, session.Identity.Scopes)

	// 4. Choose tool set based on read-only flag
	registry := &tools.Registry{Session: session, Services: services}
	var registrars []tools.ToolRegistrar
	if os.Getenv("TM_MCP_READONLY") == "1" {
		registrars = registry.ReadOnly()
	} else {
		registrars = registry.Full()
	}

	// 5. Start MCP server (stdio transport), optionally governed.
	log.Printf("starting MCP server with %d tool groups", len(registrars))
	mcpServer := server.NewMCPServer("testify", "0.1.0")
	target := toolAdder(mcpServer)
	if os.Getenv("TM_MCP_GOVERNANCE") == "1" {
		gov := governance.NewService(governance.NewPostgresRepository(db), registry).
			WithRateLimit(governanceLimit(), governanceWindow())
		target = governance.NewServer(mcpServer, gov)
	}
	for _, registrar := range registrars {
		if err := registrar.Register(target); err != nil {
			log.Fatalf("register tool group %s: %v", registrar.Name(), err)
		}
	}

	if err := server.ServeStdio(mcpServer); err != nil {
		log.Fatalf("mcp server error: %v", err)
	}
}

// toolAdder adapts *server.MCPServer to the minimal registrar interface.
func toolAdder(s *server.MCPServer) tools.ToolAdder { return s }

// governanceLimit and governanceWindow read the per-window call budget from
// env with the RPC defaults as fallback.
func governanceLimit() int {
	return governanceInt("TM_TOOL_RATE_LIMIT", governance.DefaultRateLimit)
}

func governanceWindow() int {
	return governanceInt("TM_TOOL_RATE_LIMIT_WINDOW_SECONDS", governance.DefaultRateLimitWindow)
}

func governanceInt(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		return def
	}
	return n
}
