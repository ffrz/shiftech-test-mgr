// Migration runner built on golang-migrate. Runs automatically at server
// startup (see cmd/api/main.go) — there is never a manual "run this SQL by
// hand" step. cmd/migrate provides a standalone CLI for operations that are
// intentionally NOT automatic: rollback, force-version after a failed
// migration, and scaffolding new migration files.
package database

import (
	"errors"
	"fmt"
	"log/slog"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/mysql"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"

	"github.com/shiftech/testmgr-backend/platform/config"
)

// migrationsPath returns the folder holding this driver's up/down SQL files.
// MySQL and PostgreSQL migrations live in parallel folders (see
// migrations/mysql, migrations/postgres) because DDL is not portable
// between the two dialects — see plan §3.
func migrationsPath(driver config.Driver) string {
	return fmt.Sprintf("file://migrations/%s", driver)
}

// Migrate applies all pending up migrations for the configured driver.
// It is idempotent: running it again when there is nothing pending is a
// no-op, not an error.
func Migrate(cfg config.DatabaseConfig, appLogger *slog.Logger) error {
	m, err := migrate.New(migrationsPath(cfg.Driver), migrateDSN(cfg))
	if err != nil {
		return fmt.Errorf("migrate: failed to initialize migrator: %w", err)
	}
	defer func() {
		_, _ = m.Close()
	}()

	if err := m.Up(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			appLogger.Info("migrate: no pending migrations", "driver", cfg.Driver)
			return nil
		}
		return fmt.Errorf("migrate: failed to apply migrations: %w", err)
	}

	version, dirty, err := m.Version()
	if err != nil {
		return fmt.Errorf("migrate: failed to read applied version: %w", err)
	}
	appLogger.Info("migrate: migrations applied", "driver", cfg.Driver, "version", version, "dirty", dirty)
	return nil
}

// migrateDSN builds the connection string in the scheme golang-migrate's
// database drivers expect (which differs slightly from GORM's DSN format).
func migrateDSN(cfg config.DatabaseConfig) string {
	switch cfg.Driver {
	case config.DriverMySQL:
		// golang-migrate's mysql driver needs the mysql:// scheme prefix
		// even though the underlying DSN is the standard go-sql-driver format.
		return fmt.Sprintf(
			"mysql://%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=UTC",
			cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.Name,
		)
	case config.DriverPostgres:
		return fmt.Sprintf(
			"postgres://%s:%s@%s:%s/%s?sslmode=%s",
			cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.Name, cfg.SSLMode,
		)
	default:
		return ""
	}
}
