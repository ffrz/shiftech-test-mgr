package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/shiftech/testify-platform/repository/postgres"
	"github.com/shiftech/testify-platform/rest-api/internal/auth"
	"github.com/shiftech/testify-platform/rest-api/internal/handler"
	"github.com/shiftech/testify-platform/service"
	pgdriver "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Was a no-auth validation spike (see backend/VALIDATION.md S3); now carries
// real Supabase Auth JWT verification + project-membership gating (ROADMAP_V3
// R3) ahead of the Issue endpoints (R1) built on top of it.
func main() {
	_ = godotenv.Load()
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is not set")
	}
	db, err := gorm.Open(pgdriver.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	if supabaseURL == "" {
		log.Fatal("SUPABASE_URL is not set")
	}
	jwks := auth.NewJWKSFetcher(supabaseURL)
	accessRepo := auth.NewAccessRepository(db)

	projectService := service.NewProjectService(postgres.NewProjectRepo(db))
	projectHandler := &handler.ProjectHandler{Service: projectService}
	healthHandler := &handler.HealthHandler{DB: db}

	activityRepo := postgres.NewActivityRepo(db)

	issueService := service.NewIssueService(postgres.NewIssueRepo(db), service.IssueContextSources{
		Profiles:      postgres.NewProfileRepo(db),
		Activity:      activityRepo,
		Attachments:   postgres.NewAttachmentRepo(db),
		Notifications: postgres.NewNotificationRepo(db),
	})
	issueHandler := &handler.IssueHandler{Service: issueService}

	testCaseService := service.NewTestCaseService(postgres.NewTestCaseRepo(db), activityRepo)
	testCaseHandler := &handler.TestCaseHandler{Service: testCaseService}

	testPlanService := service.NewTestPlanService(postgres.NewTestPlanRepo(db), activityRepo)
	testPlanHandler := &handler.TestPlanHandler{Service: testPlanService}

	testRunService := service.NewTestRunService(postgres.NewTestRunRepo(db), postgres.NewTestResultRepo(db), activityRepo)
	testRunHandler := &handler.TestRunHandler{Service: testRunService}

	e := echo.New()
	e.HideBanner = true
	// CORS: this experiment is called directly from the Vite dev server
	// (frontend runs on a different origin than this API), unlike Supabase
	// which the frontend already trusts unconditionally.
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodDelete},
		AllowHeaders: []string{"Authorization", "Content-Type"},
	}))
	e.GET("/health", healthHandler.Check)

	// Every route below requires a valid Supabase session JWT.
	authed := e.Group("", auth.RequireAuth(jwks))
	authed.GET("/projects", projectHandler.List)
	authed.GET("/projects/:id", projectHandler.Get, auth.RequireProjectAccess(accessRepo, auth.RoleMember))

	// Issue routes — all project-scoped via :project_id in the path, so
	// RequireProjectAccess can gate them naturally.
	issues := authed.Group("/projects/:project_id/issues", auth.RequireProjectAccess(accessRepo, auth.RoleMember))
	issues.GET("", issueHandler.List)
	issues.GET("/:id", issueHandler.Get)
	issues.POST("", issueHandler.Create)
	issues.PATCH("/:id/status", issueHandler.UpdateStatus)
	issues.PATCH("/:id/assign", issueHandler.Assign)

	// Test Case routes — list/search needs member access, mutations need
	// supervisor (mirrors can_edit_project_content in the frontend).
	tc := authed.Group("/projects/:project_id/test-cases", auth.RequireProjectAccess(accessRepo, auth.RoleMember))
	tc.GET("", testCaseHandler.List)
	tc.GET("/:id", testCaseHandler.Get)
	tc.POST("", testCaseHandler.Create)
	tc.PATCH("/:id", testCaseHandler.Update)
	tc.POST("/:id/duplicate", testCaseHandler.Duplicate)
	tc.POST("/:id/archive", testCaseHandler.Archive)
	tc.POST("/:id/reactivate", testCaseHandler.Reactivate)

	// Test Plan routes.
	tp := authed.Group("/projects/:project_id/test-plans", auth.RequireProjectAccess(accessRepo, auth.RoleMember))
	tp.GET("", testPlanHandler.List)
	tp.GET("/:id", testPlanHandler.Get)
	tp.POST("", testPlanHandler.Create)
	tp.POST("/:id/cases", testPlanHandler.AddCases)
	tp.DELETE("/:id/cases", testPlanHandler.RemoveCases)
	tp.POST("/:id/approve", testPlanHandler.Approve)
	tp.PATCH("/:id/status", testPlanHandler.ChangeStatus)

	// Test Run routes.
	tr := authed.Group("/projects/:project_id/test-runs", auth.RequireProjectAccess(accessRepo, auth.RoleMember))
	tr.GET("", testRunHandler.List)
	tr.GET("/:id", testRunHandler.Get)
	tr.POST("", testRunHandler.Create)
	tr.PATCH("/:id/results/:result_id", testRunHandler.RecordResult)
	tr.POST("/:id/complete", testRunHandler.Complete)
	tr.POST("/:id/reopen", testRunHandler.Reopen)
	tr.GET("/:id/summary", testRunHandler.Summary)

	port := os.Getenv("HTTP_PORT")
	if port == "" {
		port = "8081"
	}
	log.Printf("rest-api listening on :%s", port)
	log.Fatal(e.Start(":" + port))
}
