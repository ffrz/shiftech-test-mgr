// Package middleware holds cross-cutting Echo middleware: panic recovery,
// request logging, and (once auth lands in a later phase) JWT verification
// and per-project RBAC guards described in plan §5 / §5b.
package middleware

import (
	"fmt"
	"log/slog"
	"runtime/debug"

	"github.com/labstack/echo/v4"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
)

// Recover catches genuinely unexpected panics (nil pointer, etc.) — never
// used for ordinary error flow (not found, validation), which services
// signal via returned *apperror.Error instead. The stack trace goes to the
// log only; the client only ever sees a generic 500 body.
func Recover(logger *slog.Logger) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) (err error) {
			defer func() {
				if r := recover(); r != nil {
					logger.Error("panic recovered",
						"error", fmt.Sprint(r),
						"stack", string(debug.Stack()),
						"path", c.Request().URL.Path,
					)
					err = apperror.Internal(fmt.Errorf("panic: %v", r))
				}
			}()
			return next(c)
		}
	}
}
