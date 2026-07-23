// Standalone migration CLI — analogous to `php artisan migrate:rollback` /
// `make:migration`. The server binary (cmd/api) runs migrations
// automatically at boot; this CLI is only for operations that must stay
// manual: rollback, forcing a version after a failed migration, and
// scaffolding new migration files.
//
// Usage:
//
//	go run ./cmd/migrate up
//	go run ./cmd/migrate down 1
//	go run ./cmd/migrate force 3
//	go run ./cmd/migrate create add_attachments_table
package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/mysql"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"

	"github.com/shiftech/testmgr-backend/platform/config"
)

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(1)
	}

	cmd := os.Args[1]

	if cmd == "create" {
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "usage: migrate create <name>")
			os.Exit(1)
		}
		if err := createMigration(os.Args[2]); err != nil {
			fmt.Fprintln(os.Stderr, "error:", err)
			os.Exit(1)
		}
		return
	}

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "config error:", err)
		os.Exit(1)
	}

	m, err := migrate.New(fmt.Sprintf("file://migrations/%s", cfg.DB.Driver), dsn(cfg))
	if err != nil {
		fmt.Fprintln(os.Stderr, "migrate init error:", err)
		os.Exit(1)
	}
	defer func() { _, _ = m.Close() }()

	switch cmd {
	case "up":
		err = m.Up()
	case "down":
		steps := 1
		if len(os.Args) >= 3 {
			steps, _ = strconv.Atoi(os.Args[2])
		}
		err = m.Steps(-steps)
	case "force":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "usage: migrate force <version>")
			os.Exit(1)
		}
		version, convErr := strconv.Atoi(os.Args[2])
		if convErr != nil {
			fmt.Fprintln(os.Stderr, "invalid version:", os.Args[2])
			os.Exit(1)
		}
		err = m.Force(version)
	default:
		usage()
		os.Exit(1)
	}

	if err != nil && err != migrate.ErrNoChange {
		fmt.Fprintln(os.Stderr, "migrate error:", err)
		os.Exit(1)
	}
	fmt.Println("migrate: done")
}

// createMigration scaffolds up/down SQL files in BOTH driver folders with
// identical timestamp-based names, since migration versions must stay
// aligned across mysql/ and postgres/ (see plan §3 — no drift allowed).
func createMigration(name string) error {
	ts := time.Now().Format("20060102150405")
	for _, driver := range []string{"mysql", "postgres"} {
		dir := filepath.Join("migrations", driver)
		for _, suffix := range []string{"up", "down"} {
			path := filepath.Join(dir, fmt.Sprintf("%s_%s.%s.sql", ts, name, suffix))
			f, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o644)
			if err != nil {
				return fmt.Errorf("create %s: %w", path, err)
			}
			_ = f.Close()
			fmt.Println("created", path)
		}
	}
	return nil
}

func dsn(cfg *config.Config) string {
	switch cfg.DB.Driver {
	case config.DriverMySQL:
		return fmt.Sprintf(
			"mysql://%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=UTC",
			cfg.DB.User, cfg.DB.Password, cfg.DB.Host, cfg.DB.Port, cfg.DB.Name,
		)
	case config.DriverPostgres:
		return fmt.Sprintf(
			"postgres://%s:%s@%s:%s/%s?sslmode=%s",
			cfg.DB.User, cfg.DB.Password, cfg.DB.Host, cfg.DB.Port, cfg.DB.Name, cfg.DB.SSLMode,
		)
	default:
		return ""
	}
}

func usage() {
	fmt.Fprintln(os.Stderr, `usage:
  migrate up
  migrate down [n]
  migrate force <version>
  migrate create <name>`)
}
