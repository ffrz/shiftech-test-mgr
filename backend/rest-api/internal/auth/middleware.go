package auth

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

// contextUserIDKey is the echo.Context key RequireAuth stores the
// authenticated user's UUID under. Handlers read it via UserID(c).
const contextUserIDKey = "auth.user_id"

// RequireAuth verifies the Authorization: Bearer <supabase-jwt> header and
// attaches the resolved user UUID to the request context. It is the REST
// equivalent of mcp-server/internal/auth.Load — same "verify once per
// request, everything downstream reads from context" shape — but verifies a
// Supabase Auth session JWT (a logged-in human) instead of an api_tokens
// bearer token (an agent).
func RequireAuth(jwtSecret string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			header := c.Request().Header.Get("Authorization")
			const prefix = "Bearer "
			if !strings.HasPrefix(header, prefix) {
				return c.JSON(http.StatusUnauthorized, echo.Map{"error": "missing bearer token"})
			}
			rawToken := strings.TrimPrefix(header, prefix)

			userID, err := VerifyToken(rawToken, jwtSecret)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, echo.Map{"error": err.Error()})
			}

			c.Set(contextUserIDKey, userID)
			return next(c)
		}
	}
}

// UserID returns the authenticated user's UUID set by RequireAuth. Only
// valid for handlers mounted behind RequireAuth.
func UserID(c echo.Context) string {
	id, _ := c.Get(contextUserIDKey).(string)
	return id
}

// RequireProjectAccess gates a route on the caller having an accepted
// project_members row for the :project_id (or :id, for routes where the
// project itself is the resource) path param. minRole controls which roles
// pass: RoleMember for "any accepted member" (mirrors has_project_access()),
// RoleSupervisor for "manager or supervisor" (mirrors
// can_edit_project_content()), RoleManager for "manager only" (mirrors
// is_project_manager()). Must run after RequireAuth.
func RequireProjectAccess(repo *AccessRepository, minRole Role) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			userID := UserID(c)
			if userID == "" {
				return c.JSON(http.StatusUnauthorized, echo.Map{"error": "missing authenticated user"})
			}

			projectID := c.Param("project_id")
			if projectID == "" {
				projectID = c.Param("id")
			}
			if projectID == "" {
				return c.JSON(http.StatusBadRequest, echo.Map{"error": "project id is required"})
			}

			role, ok, err := repo.RoleFor(c.Request().Context(), projectID, userID)
			if err != nil {
				return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
			}
			if !ok || !roleSatisfies(role, minRole) {
				return c.JSON(http.StatusForbidden, echo.Map{"error": "no access to this project"})
			}
			return next(c)
		}
	}
}

// roleSatisfies checks role against a minimum required privilege level.
// Ordering matches CLAUDE.md's ProjectMember roles from least to most
// privileged: member < tester < supervisor < manager. RoleTester is treated
// as equivalent to RoleMember for access-gating purposes (this API doesn't
// yet have a route that specifically requires "tester or above" — add a
// case here if one shows up).
func roleSatisfies(actual, min Role) bool {
	rank := map[Role]int{
		RoleMember:     0,
		RoleTester:     0,
		RoleSupervisor: 1,
		RoleManager:    2,
	}
	return rank[actual] >= rank[min]
}
