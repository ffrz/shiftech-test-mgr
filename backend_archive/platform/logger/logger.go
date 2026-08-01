// Package logger provides a single structured (JSON) slog.Logger for the
// whole application. No fmt.Println anywhere else in the codebase.
package logger

import (
	"log/slog"
	"os"
)

// New builds the process-wide logger. level: "debug"|"info"|"warn"|"error".
func New(env string, level string) *slog.Logger {
	var lvl slog.Level
	switch level {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: lvl,
	})

	logger := slog.New(handler).With("env", env)
	slog.SetDefault(logger)
	return logger
}
