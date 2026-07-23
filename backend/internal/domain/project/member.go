package project

// MemberRole is per-project access role — distinct from user.Role, which is
// the global TestManager role (pending/user/admin). See ARCHITECTURE.md §4.1.
type MemberRole string

const (
	MemberRoleManager    MemberRole = "manager"
	MemberRoleSupervisor MemberRole = "supervisor"
	MemberRoleTester     MemberRole = "tester"
	MemberRoleMember     MemberRole = "member"
)

type Member struct {
	ID        string
	ProjectID string
	UserID    string
	Role      MemberRole
}
