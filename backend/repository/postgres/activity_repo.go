package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

// ActivityRepo reads and writes the entity_activity timeline (comments +
// system events). Writes are scoped to the same project/entity/actor triple,
// matching the frontend's security-definer RPC contract.
type ActivityRepo struct {
	db *gorm.DB
}

func NewActivityRepo(db *gorm.DB) *ActivityRepo {
	return &ActivityRepo{db: db}
}

func (r *ActivityRepo) Create(ctx context.Context, input core.CreateActivityInput) error {
	payloadB, err := json.Marshal(input.Payload)
	if err != nil {
		return fmt.Errorf("activity create marshal payload: %w", err)
	}
	now := time.Now()
	return r.db.WithContext(ctx).Exec(`
		INSERT INTO entity_activity (id, project_id, entity_type, entity_id, actor_id, event_type, payload, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?)
	`, newUUID(), input.ProjectID, input.EntityType, input.EntityID, input.ActorID, input.EventType, string(payloadB), now).Error
}

func (r *ActivityRepo) ListForEntity(ctx context.Context, projectID, entityType, entityID string, limit int) ([]core.ActivityEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	var rows []activityRow
	if err := r.db.WithContext(ctx).
		Where("project_id = ? AND entity_type = ? AND entity_id = ? AND deleted_at IS NULL", projectID, entityType, entityID).
		Order("created_at DESC, id DESC").
		Limit(limit).
		Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("activity list: %w", err)
	}

	out := make([]core.ActivityEntry, len(rows))
	for i, row := range rows {
		out[i] = row.toDomain()
	}
	return out, nil
}

type activityRow struct {
	ID        string    `gorm:"column:id"`
	ActorID   string    `gorm:"column:actor_id"`
	EventType string    `gorm:"column:event_type"`
	Payload   jsonbMap  `gorm:"column:payload"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (activityRow) TableName() string { return "entity_activity" }

func (r activityRow) toDomain() core.ActivityEntry {
	return core.ActivityEntry{
		ID:        r.ID,
		EventType: r.EventType,
		ActorID:   r.ActorID,
		Payload:   map[string]any(r.Payload),
		CreatedAt: r.CreatedAt,
	}
}
