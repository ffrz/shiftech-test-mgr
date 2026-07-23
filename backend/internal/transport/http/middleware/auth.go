package middleware

import (
	"strings"

	"github.com/labstack/echo/v4"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/user"
	"github.com/shiftech/testmgr-backend/platform/jwt"
)

const (
	ContextKeyUserID = "user_id"
	ContextKeyEmail  = "email"
	ContextKeyRole   = "role"
)

// RequireAuth verifies the bearer JWT and stashes the claims on the Echo
// context for downstream handlers/middleware. Signature+expiry only — see
// jwt.Service.Verify's doc comment for why this alone is not an
// authorization check.
func RequireAuth(jwtSvc *jwt.Service) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			token := extractBearerToken(c)
			if token == "" {
				return apperror.Unauthorized("missing bearer token")
			}
			claims, err := jwtSvc.Verify(token)
			if err != nil {
				return apperror.Unauthorized("invalid or expired token")
			}
			c.Set(ContextKeyUserID, claims.UserID)
			c.Set(ContextKeyEmail, claims.Email)
			c.Set(ContextKeyRole, claims.Role)
			return next(c)
		}
	}
}

// RequireApproved gates on the GLOBAL role (pending/user/admin) — the outer
// gate matching the frontend's ProtectedRoute, now actually enforced
// server-side. Must run after RequireAuth.
//
// Deliberately re-reads the role from the JWT claims set by RequireAuth
// rather than querying the DB again here — role changes made by an admin
// take effect on next login/refresh (short TTL bounds the staleness window;
// see plan §5 for why this is acceptable for the coarse global gate, as
// opposed to project-level RBAC below which is always DB-fresh).
func RequireApproved() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			role, _ := c.Get(ContextKeyRole).(user.Role)
			if role != user.RoleUser && role != user.RoleAdmin {
				return apperror.Forbidden("account is not approved")
			}
			return next(c)
		}
	}
}

// RequireAdmin gates on global role == admin.
func RequireAdmin() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			role, _ := c.Get(ContextKeyRole).(user.Role)
			if role != user.RoleAdmin {
				return apperror.Forbidden("admin role required")
			}
			return next(c)
		}
	}
}

func extractBearerToken(c echo.Context) string {
	header := c.Request().Header.Get("Authorization")
	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return ""
	}
	return strings.TrimPrefix(header, prefix)
}

// UserIDFromContext is the one place handlers should pull the authenticated
// user id from — keeps the echo.Context string-key lookup out of every
// handler file.
func UserIDFromContext(c echo.Context) string {
	id, _ := c.Get(ContextKeyUserID).(string)
	return id
}
