package middleware

import (
	"github.com/labstack/echo/v4"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/project"
	"github.com/shiftech/testmgr-backend/internal/domain/user"
	"github.com/shiftech/testmgr-backend/internal/service/auth"
)

// requireProjectRole is the shared implementation behind every
// RequireProject* middleware below — each just supplies a different policy
// check function from service/auth/policy.go. Global admins bypass the
// per-project check entirely (admin always has full access across every
// project, per ARCHITECTURE.md §4.1). Membership is always looked up fresh
// from the DB on every request (never cached in the JWT) — see plan §5b for
// why that freshness matters for this specific check.
func requireProjectRole(
	members auth.ProjectMemberRepository,
	check func(project.Member) error,
) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			role, _ := c.Get(ContextKeyRole).(user.Role)
			if role == user.RoleAdmin {
				return next(c)
			}

			projectID := c.Param("projectId")
			if projectID == "" {
				projectID = c.Param("id") // routes nested directly under /projects/:id
			}
			if projectID == "" {
				return apperror.Forbidden("project id required for this route")
			}

			userID := UserIDFromContext(c)
			member, err := members.FindByProjectAndUser(c.Request().Context(), projectID, userID)
			if err != nil {
				return apperror.Forbidden("not a member of this project")
			}
			if check != nil {
				if err := check(*member); err != nil {
					return err
				}
			}
			return next(c)
		}
	}
}

// RequireProjectAccess: minimum bar for reading project-scoped resources —
// admin, or any registered project_members row (any role qualifies).
func RequireProjectAccess(members auth.ProjectMemberRepository) echo.MiddlewareFunc {
	return requireProjectRole(members, nil)
}

func RequireProjectEdit(members auth.ProjectMemberRepository) echo.MiddlewareFunc {
	return requireProjectRole(members, auth.CanEditProject)
}

func RequireProjectDelete(members auth.ProjectMemberRepository) echo.MiddlewareFunc {
	return requireProjectRole(members, auth.CanDeleteProject)
}

func RequireProjectManageTests(members auth.ProjectMemberRepository) echo.MiddlewareFunc {
	return requireProjectRole(members, auth.CanManageTests)
}

func RequireProjectManageIssues(members auth.ProjectMemberRepository) echo.MiddlewareFunc {
	return requireProjectRole(members, auth.CanManageIssues)
}
