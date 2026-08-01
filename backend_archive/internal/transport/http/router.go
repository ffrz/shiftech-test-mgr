package http

import (
	"log/slog"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"

	"github.com/shiftech/testmgr-backend/internal/service/auth"
	"github.com/shiftech/testmgr-backend/internal/transport/http/handler"
	"github.com/shiftech/testmgr-backend/internal/transport/http/middleware"
	"github.com/shiftech/testmgr-backend/internal/transport/http/response"
	"github.com/shiftech/testmgr-backend/platform/config"
	"github.com/shiftech/testmgr-backend/platform/jwt"
)

// Handlers aggregates every resource handler the router wires up. It grows
// one field per module as modules are implemented (project, testcase,
// testplan, ...) -- kept here rather than passed as loose parameters so
// router.go's signature doesn't change every time a module is added.
type Handlers struct {
	Health     *handler.HealthHandler
	Auth       *handler.AuthHandler
	Project    *handler.ProjectHandler
	Module     *handler.ModuleHandler
	Tag        *handler.TagHandler
	TestRole   *handler.TestRoleHandler
	TestCase   *handler.TestCaseHandler
	TestPlan   *handler.TestPlanHandler
	TestRun    *handler.TestRunHandler
	Issue      *handler.IssueHandler
	Attachment *handler.AttachmentHandler
}

// Deps carries the cross-cutting dependencies routes need directly (as
// opposed to handlers, which already have their own service/eventbus
// injected) -- currently just the project-membership lookup RBAC middleware
// needs.
type Deps struct {
	ProjectMembers auth.ProjectMemberRepository
}

// NewRouter builds the Echo instance with global middleware and routes
// mounted. Every route past the auth group requires RequireAuth +
// RequireApproved (the global gate matching the frontend's ProtectedRoute,
// now actually enforced server-side, see plan §5b); routes scoped to a
// specific project additionally require the matching RequireProject*
// middleware, which re-checks project_members fresh from the DB on every
// request.
//
// Several TestPlan/TestRun/Issue routes are nested under
// /projects/:projectId/... purely for that RBAC lookup (requireProjectRole
// reads :projectId first) even though the resource itself is addressed by
// its own :id further down the path -- the handler ignores :projectId and
// loads by :id, same pattern the frontend's repositories use (looking a row
// up by its own id, project scoping is enforced by RLS/here by middleware
// only, not by a WHERE project_id= filter in the handler).
func NewRouter(logger *slog.Logger, cfg *config.Config, jwtSvc *jwt.Service, deps Deps, h Handlers) *echo.Echo {
	e := echo.New()
	e.HTTPErrorHandler = response.HTTPErrorHandler
	e.HideBanner = true
	e.HidePort = true

	e.Use(echomw.RequestID())
	e.Use(middleware.Recover(logger))
	e.Use(echomw.CORS())

	e.GET("/healthz", h.Health.Check)

	api := e.Group("/api/v1")

	authGroup := api.Group("/auth")
	authGroup.POST("/google/callback", h.Auth.GoogleCallback)
	authGroup.POST("/refresh", h.Auth.Refresh)
	authGroup.POST("/logout", h.Auth.Logout)
	authGroup.GET("/me", h.Auth.Me, middleware.RequireAuth(jwtSvc))

	approved := api.Group("", middleware.RequireAuth(jwtSvc), middleware.RequireApproved())

	access := middleware.RequireProjectAccess(deps.ProjectMembers)
	manageTests := middleware.RequireProjectManageTests(deps.ProjectMembers)
	manageIssues := middleware.RequireProjectManageIssues(deps.ProjectMembers)

	projects := approved.Group("/projects")
	projects.GET("", h.Project.List)
	projects.POST("", h.Project.Create)
	projects.GET("/:id", h.Project.GetByID, middleware.RequireProjectAccess(deps.ProjectMembers))
	projects.PUT("/:id", h.Project.Update, middleware.RequireProjectEdit(deps.ProjectMembers))
	projects.PATCH("/:id/status", h.Project.ChangeStatus, middleware.RequireProjectEdit(deps.ProjectMembers))
	projects.DELETE("/:id", h.Project.DeletePermanently, middleware.RequireProjectDelete(deps.ProjectMembers))

	// --- Modules, nested under a project ---
	modules := projects.Group("/:projectId/modules")
	modules.GET("", h.Module.List, access)
	modules.POST("", h.Module.Create, middleware.RequireProjectEdit(deps.ProjectMembers))
	modules.PUT("/:id", h.Module.Update, middleware.RequireProjectEdit(deps.ProjectMembers))
	modules.DELETE("/:id", h.Module.Delete, middleware.RequireProjectEdit(deps.ProjectMembers))

	// --- Tags, nested under a project ---
	tags := projects.Group("/:projectId/tags")
	tags.GET("", h.Tag.List, access)
	tags.POST("", h.Tag.Create, middleware.RequireProjectEdit(deps.ProjectMembers))
	tags.PUT("/:id", h.Tag.Rename, middleware.RequireProjectEdit(deps.ProjectMembers))
	tags.DELETE("/:id", h.Tag.Delete, middleware.RequireProjectEdit(deps.ProjectMembers))

	// --- Test Roles, nested under a project ---
	testRoles := projects.Group("/:projectId/test-roles")
	testRoles.GET("", h.TestRole.List, access)
	testRoles.POST("", h.TestRole.Create, middleware.RequireProjectEdit(deps.ProjectMembers))
	testRoles.PUT("/:id", h.TestRole.Update, middleware.RequireProjectEdit(deps.ProjectMembers))
	testRoles.DELETE("/:id", h.TestRole.Delete, middleware.RequireProjectEdit(deps.ProjectMembers))

	// --- Test Cases, nested under a project ---
	testCases := projects.Group("/:projectId/test-cases")
	testCases.GET("", h.TestCase.List, access)
	testCases.POST("", h.TestCase.Create, manageTests)
	testCases.GET("/:id", h.TestCase.GetByID, access)
	testCases.PUT("/:id", h.TestCase.Update, manageTests)
	testCases.DELETE("/:id", h.TestCase.Delete, manageTests)

	// --- Test Plans, nested under a project ---
	testPlans := projects.Group("/:projectId/test-plans")
	testPlans.GET("", h.TestPlan.List, access)
	testPlans.POST("", h.TestPlan.Create, manageTests)
	testPlans.GET("/:id", h.TestPlan.GetByID, access)
	testPlans.PUT("/:id", h.TestPlan.Update, manageTests)
	testPlans.PATCH("/:id/status", h.TestPlan.ChangeStatus, manageTests)
	testPlans.POST("/:id/duplicate", h.TestPlan.Duplicate, manageTests)
	testPlans.DELETE("/:id", h.TestPlan.Delete, manageTests)
	testPlans.GET("/:id/cases", h.TestPlan.ListCases, access)
	testPlans.POST("/:id/cases", h.TestPlan.AddCase, manageTests)
	testPlans.DELETE("/:id/cases/:caseId", h.TestPlan.RemoveCase, manageTests)
	testPlans.PUT("/:id/cases/reorder", h.TestPlan.ReorderCases, manageTests)
	testPlans.GET("/:id/test-runs", h.TestRun.ListByPlan, access)

	// --- Test Runs, nested under a project ---
	testRuns := projects.Group("/:projectId/test-runs")
	testRuns.GET("", h.TestRun.List, access)
	testRuns.POST("/from-plan", h.TestRun.Start, manageTests)
	testRuns.POST("/custom", h.TestRun.StartCustom, manageTests)
	testRuns.GET("/:id", h.TestRun.GetByID, access)
	testRuns.GET("/:id/with-results", h.TestRun.GetWithResults, access)
	testRuns.PUT("/:id", h.TestRun.Rename, manageTests)
	testRuns.PATCH("/:id/complete", h.TestRun.Complete, manageTests)
	testRuns.PATCH("/:id/reopen", h.TestRun.Reopen, manageTests)
	testRuns.DELETE("/:id", h.TestRun.Delete, manageTests)
	testRuns.PATCH("/:id/results/:resultId", h.TestRun.RecordResult, manageTests)
	testRuns.POST("/:id/results/:resultId/sync", h.TestRun.SyncResult, manageTests)
	testRuns.PATCH("/:id/result-steps/:stepId", h.TestRun.RecordStepResult, manageTests)
	testRuns.GET("/:id/issues", h.Issue.ListByTestRun, access)
	testRuns.GET("/:id/results/:resultId/issues", h.Issue.ListByTestResult, access)

	// --- Issues, nested under a project ---
	issues := projects.Group("/:projectId/issues")
	issues.GET("", h.Issue.List, access)
	issues.POST("", h.Issue.Create, manageIssues)
	issues.GET("/:id", h.Issue.GetByID, access)
	issues.PUT("/:id", h.Issue.Update, manageIssues)
	issues.PATCH("/:id/status", h.Issue.ChangeStatus, manageIssues)
	issues.PATCH("/:id/assign", h.Issue.Assign, manageIssues)
	issues.DELETE("/:id", h.Issue.Delete, manageIssues)
	issues.POST("/:id/test-results", h.Issue.LinkTestResult, manageIssues)
	issues.DELETE("/:id/test-results/:resultId", h.Issue.UnlinkTestResult, manageIssues)
	issues.GET("/:issueId/attachments", h.Attachment.List, access)
	issues.POST("/:issueId/attachments", h.Attachment.Create, manageIssues)
	issues.DELETE("/:issueId/attachments/:id", h.Attachment.Delete, manageIssues)

	return e
}
