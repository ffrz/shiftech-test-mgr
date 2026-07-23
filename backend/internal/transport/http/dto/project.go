package dto

import (
	"time"

	"github.com/shiftech/testmgr-backend/internal/domain/project"
)

type CreateProjectRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=255"`
	Description string `json:"description" validate:"max=2000"`
}

type UpdateProjectRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=255"`
	Description string `json:"description" validate:"max=2000"`
}

type ChangeProjectStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=active inactive archived"`
}

type ProjectResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func FromProject(p project.Project) ProjectResponse {
	return ProjectResponse{
		ID:          p.ID,
		Name:        p.Name,
		Description: p.Description,
		Status:      string(p.Status),
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
	}
}

func FromProjects(projects []project.Project) []ProjectResponse {
	result := make([]ProjectResponse, len(projects))
	for i, p := range projects {
		result[i] = FromProject(p)
	}
	return result
}
