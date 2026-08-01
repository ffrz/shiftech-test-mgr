// Package config loads and validates application configuration from environment
// variables. Loading fails fast at startup if a required variable is missing,
// so misconfiguration never surfaces later as a nil-pointer panic mid-request.
package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Driver string

const (
	DriverMySQL    Driver = "mysql"
	DriverPostgres Driver = "postgres"
)

type Config struct {
	Env    string // "development" | "production" | "test"
	HTTP   HTTPConfig
	DB     DatabaseConfig
	JWT    JWTConfig
	Google GoogleConfig
}

type HTTPConfig struct {
	Port            string
	ShutdownTimeout time.Duration
}

type DatabaseConfig struct {
	Driver          Driver
	Host            string
	Port            string
	User            string
	Password        string
	Name            string
	SSLMode         string // postgres only ("disable"|"require"); ignored for mysql
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

type JWTConfig struct {
	Secret          string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
}

// GoogleConfig is intentionally NOT part of the fail-fast required set —
// local infra work (DB/migration/health-check testing) shouldn't require a
// live Google OAuth app to be configured. The auth service surfaces a clear
// error at actual login-attempt time if these are empty.
type GoogleConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

// DSN builds the driver-specific connection string.
func (d DatabaseConfig) DSN() string {
	switch d.Driver {
	case DriverMySQL:
		return fmt.Sprintf(
			"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=UTC",
			d.User, d.Password, d.Host, d.Port, d.Name,
		)
	case DriverPostgres:
		return fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=UTC",
			d.Host, d.Port, d.User, d.Password, d.Name, d.SSLMode,
		)
	default:
		return ""
	}
}

// Load reads configuration from the process environment. It returns an error
// (never panics) if a required variable is missing or malformed, so callers
// (main.go) can log and exit(1) cleanly.
func Load() (*Config, error) {
	driver := Driver(getEnv("DB_DRIVER", string(DriverMySQL)))
	if driver != DriverMySQL && driver != DriverPostgres {
		return nil, fmt.Errorf("config: DB_DRIVER must be %q or %q, got %q", DriverMySQL, DriverPostgres, driver)
	}

	required := map[string]string{
		"DB_HOST":    "",
		"DB_PORT":    "",
		"DB_USER":    "",
		"DB_NAME":    "",
		"JWT_SECRET": "",
	}
	for k := range required {
		v := os.Getenv(k)
		if v == "" {
			return nil, fmt.Errorf("config: required environment variable %s is not set", k)
		}
		required[k] = v
	}

	accessTTL, err := parseDuration("JWT_ACCESS_TTL", "15m")
	if err != nil {
		return nil, err
	}
	refreshTTL, err := parseDuration("JWT_REFRESH_TTL", "720h") // 30 days
	if err != nil {
		return nil, err
	}
	shutdownTimeout, err := parseDuration("HTTP_SHUTDOWN_TIMEOUT", "10s")
	if err != nil {
		return nil, err
	}

	maxOpenConns, err := parseInt("DB_MAX_OPEN_CONNS", "25")
	if err != nil {
		return nil, err
	}
	maxIdleConns, err := parseInt("DB_MAX_IDLE_CONNS", "10")
	if err != nil {
		return nil, err
	}
	connMaxLifetime, err := parseDuration("DB_CONN_MAX_LIFETIME", "1h")
	if err != nil {
		return nil, err
	}

	cfg := &Config{
		Env: getEnv("APP_ENV", "development"),
		HTTP: HTTPConfig{
			Port:            getEnv("HTTP_PORT", "8080"),
			ShutdownTimeout: shutdownTimeout,
		},
		DB: DatabaseConfig{
			Driver:          driver,
			Host:            required["DB_HOST"],
			Port:            required["DB_PORT"],
			User:            required["DB_USER"],
			Password:        os.Getenv("DB_PASSWORD"), // may legitimately be empty in local dev
			Name:            required["DB_NAME"],
			SSLMode:         getEnv("DB_SSLMODE", "disable"),
			MaxOpenConns:    maxOpenConns,
			MaxIdleConns:    maxIdleConns,
			ConnMaxLifetime: connMaxLifetime,
		},
		JWT: JWTConfig{
			Secret:          required["JWT_SECRET"],
			AccessTokenTTL:  accessTTL,
			RefreshTokenTTL: refreshTTL,
		},
		Google: GoogleConfig{
			ClientID:     os.Getenv("GOOGLE_OAUTH_CLIENT_ID"),
			ClientSecret: os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
			RedirectURL:  os.Getenv("GOOGLE_OAUTH_REDIRECT_URL"),
		},
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func parseDuration(key, fallback string) (time.Duration, error) {
	raw := getEnv(key, fallback)
	d, err := time.ParseDuration(raw)
	if err != nil {
		return 0, fmt.Errorf("config: invalid duration for %s=%q: %w", key, raw, err)
	}
	return d, nil
}

func parseInt(key, fallback string) (int, error) {
	raw := getEnv(key, fallback)
	n, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("config: invalid integer for %s=%q: %w", key, raw, err)
	}
	return n, nil
}
