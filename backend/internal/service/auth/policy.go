// policy.go ports the SQL RBAC helper functions that used to live in
// Postgres (is_admin, is_approved, has_project_access,
// can_edit_project_content, can_delete_project_content, can_run_tests,
// can_manage_issues — see ARCHITECTURE.md §4.1) into plain Go functions.
// Called from BOTH middleware (route-level gating) and directly from
// service methods that need a granular check the URL param alone can't
// express — see plan §5b for why the duplication is intentional
// defense-in-depth, not redundancy to clean up.
package auth

import (
	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/project"
)

func CanEditProject(member project.Member) error {
	if member.Role != project.MemberRoleManager && member.Role != project.MemberRoleSupervisor {
		return apperror.Forbidden("insufficient project role: requires manager or supervisor")
	}
	return nil
}

// CanDeleteProject: only manager may permanently delete project content —
// supervisor/tester cannot, matching can_delete_project_content() in the
// source RLS.
func CanDeleteProject(member project.Member) error {
	if member.Role != project.MemberRoleManager {
		return apperror.Forbidden("insufficient project role: requires manager")
	}
	return nil
}

func CanManageTests(member project.Member) error {
	if member.Role != project.MemberRoleManager && member.Role != project.MemberRoleTester {
		return apperror.Forbidden("insufficient project role: requires manager or tester")
	}
	return nil
}

func CanManageIssues(member project.Member) error {
	if member.Role != project.MemberRoleManager && member.Role != project.MemberRoleTester {
		return apperror.Forbidden("insufficient project role: requires manager or tester")
	}
	return nil
}
