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
	_, err := r.create(ctx, input)
	return err
}

func (r *ActivityRepo) CreateComment(ctx context.Context, input core.CreateActivityInput) (*core.ActivityEntry, error) {
	return r.create(ctx, input)
}

func (r *ActivityRepo) create(ctx context.Context, input core.CreateActivityInput) (*core.ActivityEntry, error) {
	payloadB, err := json.Marshal(input.Payload)
	if err != nil {
		return nil, fmt.Errorf("activity create marshal payload: %w", err)
	}
	now := time.Now()
	id := newUUID()
	if err := r.db.WithContext(ctx).Exec(`
		INSERT INTO entity_activity (id, project_id, entity_type, entity_id, actor_id, event_type, payload, parent_comment_id, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?)
	`, id, input.ProjectID, input.EntityType, input.EntityID, input.ActorID, input.EventType, string(payloadB), input.ParentCommentID, now).Error; err != nil {
		return nil, fmt.Errorf("activity create: %w", err)
	}
	return &core.ActivityEntry{ID: id, EventType: input.EventType, ActorID: input.ActorID, Payload: input.Payload, ParentCommentID: input.ParentCommentID, CreatedAt: now}, nil
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

func (r *ActivityRepo) GetCommentForEntity(ctx context.Context, projectID, entityType, entityID, commentID string) (*core.ActivityEntry, error) {
	var row activityRow
	err := r.db.WithContext(ctx).
		Where("id = ? AND project_id = ? AND entity_type = ? AND entity_id = ? AND event_type = 'comment' AND deleted_at IS NULL", commentID, projectID, entityType, entityID).
		First(&row).Error
	if err != nil {
		return nil, fmt.Errorf("activity comment get: %w", err)
	}
	entry := row.toDomain()
	return &entry, nil
}

type activityRow struct {
	ID              string    `gorm:"column:id"`
	ActorID         string    `gorm:"column:actor_id"`
	EventType       string    `gorm:"column:event_type"`
	Payload         jsonbMap  `gorm:"column:payload"`
	ParentCommentID *string   `gorm:"column:parent_comment_id"`
	CreatedAt       time.Time `gorm:"column:created_at"`
}

func (activityRow) TableName() string { return "entity_activity" }

func (r activityRow) toDomain() core.ActivityEntry {
	return core.ActivityEntry{
		ID:              r.ID,
		EventType:       r.EventType,
		ActorID:         r.ActorID,
		Payload:         map[string]any(r.Payload),
		ParentCommentID: r.ParentCommentID,
		CreatedAt:       r.CreatedAt,
	}
}
