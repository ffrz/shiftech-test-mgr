// Package database builds the *gorm.DB connection for whichever driver is
// selected via config.DatabaseConfig.Driver. Both drivers are imported
// statically, so switching DB_DRIVER=mysql|postgres is a config+restart
// change, never a rebuild.
package database

import (
	"fmt"
	"log/slog"

	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"github.com/shiftech/testmgr-backend/platform/config"
)

// New opens a pooled database connection for the configured driver.
func New(cfg config.DatabaseConfig, appLogger *slog.Logger) (*gorm.DB, error) {
	gormCfg := &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Warn),
	}

	var (
		db  *gorm.DB
		err error
	)

	switch cfg.Driver {
	case config.DriverMySQL:
		db, err = gorm.Open(mysql.Open(cfg.DSN()), gormCfg)
	case config.DriverPostgres:
		db, err = gorm.Open(postgres.Open(cfg.DSN()), gormCfg)
	default:
		return nil, fmt.Errorf("database: unsupported driver %q", cfg.Driver)
	}
	if err != nil {
		return nil, fmt.Errorf("database: failed to open %s connection: %w", cfg.Driver, err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("database: failed to get underlying sql.DB: %w", err)
	}
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("database: ping failed: %w", err)
	}

	appLogger.Info("database connected", "driver", cfg.Driver, "host", cfg.Host, "name", cfg.Name)
	return db, nil
}
