package postgres

import (
	"context"
	"fmt"

	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

// NotificationRepo creates rows via the create_notification security-definer
// RPC (supabase/migrations/20260728000001_notifications.sql) — the same one
// the frontend calls, so MCP-triggered notifications go through the exact
// same insert path (RLS bypass handled inside the RPC, not here).
type NotificationRepo struct {
	db *gorm.DB
}

func NewNotificationRepo(db *gorm.DB) *NotificationRepo {
	return &NotificationRepo{db: db}
}

func (r *NotificationRepo) Create(ctx context.Context, input core.CreateNotificationInput) error {
	err := r.db.WithContext(ctx).Exec(
		`select create_notification(?, ?, ?, ?, ?, ?)`,
		input.UserID, input.Type, input.Title, input.Body, input.ReferenceType, input.ReferenceID,
	).Error
	if err != nil {
		return fmt.Errorf("notification create: %w", err)
	}
	return nil
}
