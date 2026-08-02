package main

import (
	"log"
	"net/http"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/shiftech/testify-platform/repository/postgres"
	"github.com/shiftech/testify-platform/rest-api/internal/handler"
	"github.com/shiftech/testify-platform/service"
	pgdriver "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Validation spike (see backend/VALIDATION.md S3), now extended for the
// frontend adapter-switching experiment (see frontend/src/config, adapter
// pattern for Project data source). No auth — this is NOT production-ready.
// TODO before real deployment: JWT/Google auth middleware (TASKS.md T7.3),
// endpoints beyond Project (T7.4).
func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is not set")
	}
	db, err := gorm.Open(pgdriver.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}

	projectService := service.NewProjectService(postgres.NewProjectRepo(db))
	projectHandler := &handler.ProjectHandler{Service: projectService}
	healthHandler := &handler.HealthHandler{DB: db}

	e := echo.New()
	e.HideBanner = true
	// CORS: this experiment is called directly from the Vite dev server
	// (frontend runs on a different origin than this API), unlike Supabase
	// which the frontend already trusts unconditionally.
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet},
	}))
	e.GET("/health", healthHandler.Check)
	e.GET("/projects", projectHandler.List)
	e.GET("/projects/:id", projectHandler.Get)

	port := os.Getenv("HTTP_PORT")
	if port == "" {
		port = "8081"
	}
	log.Printf("rest-api listening on :%s (validation spike, no auth)", port)
	log.Fatal(e.Start(":" + port))
}
