package dto

import (
	"time"

	"github.com/shiftech/testmgr-backend/internal/domain/module"
)

type CreateModuleRequest struct {
	Name string `json:"name" validate:"required,min=1,max=255"`
	Code string `json:"code" validate:"omitempty,max=50"`
}

type UpdateModuleRequest struct {
	Name string `json:"name" validate:"required,min=1,max=255"`
	Code string `json:"code" validate:"required,max=50"`
}

type ModuleResponse struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"project_id"`
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func FromModule(m module.Module) ModuleResponse {
	return ModuleResponse{
		ID:        m.ID,
		ProjectID: m.ProjectID,
		Code:      m.Code,
		Name:      m.Name,
		CreatedAt: m.CreatedAt,
		UpdatedAt: m.UpdatedAt,
	}
}

func FromModules(modules []module.Module) []ModuleResponse {
	result := make([]ModuleResponse, len(modules))
	for i, m := range modules {
		result[i] = FromModule(m)
	}
	return result
}
