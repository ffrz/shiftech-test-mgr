package dto

import (
	"time"

	"github.com/shiftech/testmgr-backend/internal/domain/tag"
)

type CreateTagRequest struct {
	Name string `json:"name" validate:"required,min=1,max=255"`
}

type RenameTagRequest struct {
	Name string `json:"name" validate:"required,min=1,max=255"`
}

type TagResponse struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"project_id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

func FromTag(t tag.Tag) TagResponse {
	return TagResponse{
		ID:        t.ID,
		ProjectID: t.ProjectID,
		Name:      t.Name,
		CreatedAt: t.CreatedAt,
	}
}

func FromTags(tags []tag.Tag) []TagResponse {
	result := make([]TagResponse, len(tags))
	for i, t := range tags {
		result[i] = FromTag(t)
	}
	return result
}
