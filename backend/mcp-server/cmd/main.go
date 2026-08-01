package main

import (
	"context"
	"log"
	"os"

	"github.com/mark3labs/mcp-go/server"
	"github.com/shiftech/testify-platform/mcp-server/internal/auth"
	"github.com/shiftech/testify-platform/mcp-server/internal/tools"
	"github.com/shiftech/testify-platform/repository/postgres"
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

	// 2. Wire repositories (postgres implements core ports)
	tokenRepo := postgres.NewTokenRepo(db)
	repos := tools.Repos{
		Project:  postgres.NewProjectRepo(db),
		TestCase: nil, // TODO: implement
		TestPlan: nil, // TODO: implement
		TestRun:  nil, // TODO: implement
		Issue:    nil, // TODO: implement
		Token:    tokenRepo,
	}

	// 3. Authenticate session
	session, err := auth.Load(ctx, tokenRepo)
	if err != nil {
		log.Fatalf("auth: %v", err)
	}
	log.Printf("authenticated: token=%s project=%s scopes=%v",
		session.Identity.TokenID, session.ProjectID, session.Identity.Scopes)

	// 4. Choose tool set based on read-only flag
	registry := &tools.Registry{Session: session, Repos: repos}
	var registrars []tools.ToolRegistrar
	if os.Getenv("TM_MCP_READONLY") == "1" {
		registrars = registry.ReadOnly()
	} else {
		registrars = registry.Full()
	}

	// 5. Start MCP server (stdio transport)
	log.Printf("starting MCP server with %d tool groups", len(registrars))
	mcpServer := server.NewMCPServer("testify", "0.1.0")
	for _, registrar := range registrars {
		if err := registrar.Register(mcpServer); err != nil {
			log.Fatalf("register tool group %s: %v", registrar.Name(), err)
		}
	}

	if err := server.ServeStdio(mcpServer); err != nil {
		log.Fatalf("mcp server error: %v", err)
	}
}
