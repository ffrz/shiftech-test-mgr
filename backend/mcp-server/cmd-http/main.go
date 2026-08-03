// Command mcp-server-http runs the MCP server over StreamableHTTP instead
// of stdio — see backend/RUNNING.md "MCP over HTTP (remote / VPS)".
//
// Unlike cmd/main.go (stdio, one process = one client = one token loaded
// once at startup), this process serves many concurrent clients. Each
// request supplies its own token via the Authorization header and its own
// project scope via X-Testify-Project-Id; auth.LoadFromToken runs per
// request and the resulting Session is attached to that request's context
// (auth.WithSession) so tool handlers resolve it via Registry.SessionFor.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/mark3labs/mcp-go/server"
	"github.com/shiftech/testify-platform/core"
	"github.com/shiftech/testify-platform/mcp-server/internal/auth"
	"github.com/shiftech/testify-platform/mcp-server/internal/governance"
	"github.com/shiftech/testify-platform/mcp-server/internal/tools"
	"github.com/shiftech/testify-platform/repository/postgres"
	"github.com/shiftech/testify-platform/service"
	pgdriver "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is not set")
	}
	db, err := gorm.Open(pgdriver.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}

	tokenRepo := postgres.NewTokenRepo(db)
	issueRepo := postgres.NewIssueRepo(db)
	testResultRepo := postgres.NewTestResultRepo(db)
	activityRepo := postgres.NewActivityRepo(db)
	services := tools.Services{
		Project:    service.NewProjectService(postgres.NewProjectRepo(db)),
		TestCase:   service.NewTestCaseService(postgres.NewTestCaseRepo(db), activityRepo),
		TestPlan:   service.NewTestPlanService(postgres.NewTestPlanRepo(db), activityRepo),
		TestRun:    service.NewTestRunService(postgres.NewTestRunRepo(db), testResultRepo, activityRepo),
		TestResult: service.NewTestResultService(testResultRepo),
		Issue: service.NewIssueService(issueRepo, service.IssueContextSources{
			Profiles:      postgres.NewProfileRepo(db),
			Activity:      activityRepo,
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

	// No Session set here — HTTP transport has no single client to
	// authenticate at startup. Each request's Session is derived by
	// authenticateRequest below and attached to that request's context.
	registry := &tools.Registry{Services: services}
	var registrars []tools.ToolRegistrar
	if os.Getenv("TM_MCP_READONLY") == "1" {
		registrars = registry.ReadOnly()
	} else {
		registrars = registry.Full()
	}

	mcpServer := server.NewMCPServer("testify", "0.1.0")
	var target tools.ToolAdder = mcpServer
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

	httpServer := server.NewStreamableHTTPServer(mcpServer,
		server.WithEndpointPath("/mcp"),
		server.WithHTTPContextFunc(authenticateRequest(tokenRepo)),
	)

	addr := os.Getenv("HTTP_PORT")
	if addr == "" {
		addr = "8082"
	}
	log.Printf("mcp-server (HTTP) listening on :%s, endpoint /mcp", addr)
	if err := httpServer.Start(":" + addr); err != nil {
		log.Fatalf("mcp http server error: %v", err)
	}
}

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

// authenticateRequest reads "Authorization: Bearer <token>" and
// "X-Testify-Project-Id: <uuid>" from each incoming request, authenticates
// the token, and attaches the resulting Session to the request's context.
// Auth failures are NOT rejected here — tool handlers call
// Registry.SessionFor and return a tool-level error if no session is
// present, keeping this hook a pure context-decorator (matches
// HTTPContextFunc's signature, which has no way to abort the request).
func authenticateRequest(tokenRepo core.TokenRepository) server.HTTPContextFunc {
	return func(ctx context.Context, r *http.Request) context.Context {
		rawToken := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		projectID := r.Header.Get("X-Testify-Project-Id")
		if rawToken == "" || projectID == "" {
			return ctx
		}

		session, err := auth.LoadFromToken(ctx, tokenRepo, rawToken, projectID)
		if err != nil {
			// Leave ctx undecorated; Registry.SessionFor will surface a
			// clear "no session available" error from the tool handler
			// instead of failing the HTTP request generically here.
			return ctx
		}
		return auth.WithSession(ctx, session)
	}
}
