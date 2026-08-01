package dto

import (
	"time"

	"github.com/shiftech/testmgr-backend/internal/domain/testrole"
)

type CreateTestRoleRequest struct {
	Name string `json:"name" validate:"required,min=1,max=255"`
}

type UpdateTestRoleRequest struct {
	Name string `json:"name" validate:"required,min=1,max=255"`
}

type TestRoleResponse struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"project_id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func FromTestRole(r testrole.TestRole) TestRoleResponse {
	return TestRoleResponse{
		ID:        r.ID,
		ProjectID: r.ProjectID,
		Name:      r.Name,
		CreatedAt: r.CreatedAt,
		UpdatedAt: r.UpdatedAt,
	}
}

func FromTestRoles(roles []testrole.TestRole) []TestRoleResponse {
	result := make([]TestRoleResponse, len(roles))
	for i, r := range roles {
		result[i] = FromTestRole(r)
	}
	return result
}
