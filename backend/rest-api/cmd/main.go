package main

import (
	"log"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/shiftech/testify-platform/repository/postgres"
	"github.com/shiftech/testify-platform/rest-api/internal/handler"
	pgdriver "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Validation spike (see backend/VALIDATION.md S3). No auth — this is NOT
// production-ready. TODO before real deployment: JWT/Google auth middleware
// (TASKS.md T7.3), endpoints beyond GET /projects (T7.4).
func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is not set")
	}
	db, err := gorm.Open(pgdriver.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}

	projectHandler := &handler.ProjectHandler{Repo: postgres.NewProjectRepo(db)}
	healthHandler := &handler.HealthHandler{DB: db}

	e := echo.New()
	e.HideBanner = true
	e.GET("/health", healthHandler.Check)
	e.GET("/projects", projectHandler.List)

	port := os.Getenv("HTTP_PORT")
	if port == "" {
		port = "8081"
	}
	log.Printf("rest-api listening on :%s (validation spike, no auth)", port)
	log.Fatal(e.Start(":" + port))
}
