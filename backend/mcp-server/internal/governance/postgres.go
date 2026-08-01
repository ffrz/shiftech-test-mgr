package governance

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"
)

// PostgresRepository implements Repository against the two security-definer
// RPCs created by the T1.2 migration
// (supabase/migrations/20260801140000_backend_mcp_governance.sql). The raw
// token is only used to hash inside the RPC — it is never stored or logged.
type PostgresRepository struct {
	db *gorm.DB
}

func NewPostgresRepository(db *gorm.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) BeginToolCall(ctx context.Context, rawToken, projectID, toolName string, limit, windowSeconds int) (*BeginResult, error) {
	var rows []struct {
		AuditID string `gorm:"column:audit_id"`
		Allowed bool   `gorm:"column:allowed"`
	}
	err := r.db.WithContext(ctx).Raw(
		`select audit_id, allowed from mcp_begin_tool_call(?, ?, ?, ?, ?)`,
		rawToken, projectID, toolName, limit, windowSeconds,
	).Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("governance begin: %w", err)
	}
	if len(rows) == 0 {
		return nil, errors.New("governance begin: no result row")
	}
	return &BeginResult{AuditID: rows[0].AuditID, Allowed: rows[0].Allowed}, nil
}

func (r *PostgresRepository) CompleteToolCall(ctx context.Context, rawToken, projectID, auditID, status string, latencyMs int) error {
	err := r.db.WithContext(ctx).Raw(
		`select mcp_complete_tool_call(?, ?, ?, ?, ?)`,
		rawToken, projectID, auditID, status, latencyMs,
	).Scan(nil).Error
	if err != nil {
		return fmt.Errorf("governance complete: %w", err)
	}
	return nil
}
