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

	issueService := service.NewIssueService(postgres.NewIssueRepo(db), service.IssueContextSources{
		Profiles:      postgres.NewProfileRepo(db),
		Activity:      postgres.NewActivityRepo(db),
		Attachments:   postgres.NewAttachmentRepo(db),
		Notifications: postgres.NewNotificationRepo(db),
	})
	issueHandler := &handler.IssueHandler{Service: issueService}

	e := echo.New()
	e.HideBanner = true
	// CORS: this experiment is called directly from the Vite dev server
	// (frontend runs on a different origin than this API), unlike Supabase
	// which the frontend already trusts unconditionally.
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPatch},
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

	port := os.Getenv("HTTP_PORT")
	if port == "" {
		port = "8081"
	}
	log.Printf("rest-api listening on :%s", port)
	log.Fatal(e.Start(":" + port))
}
