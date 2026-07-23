// Package entitycode ports the frontend's set_test_plan_code/set_test_run_code/
// set_issue_code DB triggers into application code, since entity_code_sequences
// (see migrations) is deliberately a plain counter table with no DB-side
// generation logic -- see its migration comment. Both MySQL and Postgres
// repositories share this helper because it is expressed entirely in
// portable GORM, keeping code generation identical across drivers.
package entitycode

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

type sequenceRow struct {
	ProjectID string `gorm:"column:project_id"`
	Prefix    string `gorm:"column:prefix"`
	LastValue int    `gorm:"column:last_value"`
}

func (sequenceRow) TableName() string { return "entity_code_sequences" }

// Next atomically increments the (projectID, prefix) counter and returns the
// next formatted code, e.g. Next(ctx, tx, projectID, "TP") -> "TP-0001".
// Must be called within the same transaction as the row insert that consumes
// the code, so a failed insert does not burn a gap-free sequence value
// unnecessarily -- callers should wrap both in db.Transaction.
func Next(ctx context.Context, tx *gorm.DB, projectID, prefix string) (string, error) {
	var row sequenceRow
	err := tx.WithContext(ctx).
		Raw(`SELECT project_id, prefix, last_value FROM entity_code_sequences WHERE project_id = ? AND prefix = ? FOR UPDATE`, projectID, prefix).
		Scan(&row).Error
	if err != nil {
		return "", err
	}

	next := row.LastValue + 1
	if row.Prefix == "" {
		// No row yet for this (project, prefix) pair -- insert starting at 1.
		if err := tx.WithContext(ctx).Exec(
			`INSERT INTO entity_code_sequences (project_id, prefix, last_value) VALUES (?, ?, ?)`,
			projectID, prefix, 1,
		).Error; err != nil {
			return "", err
		}
		next = 1
	} else {
		if err := tx.WithContext(ctx).Exec(
			`UPDATE entity_code_sequences SET last_value = ? WHERE project_id = ? AND prefix = ?`,
			next, projectID, prefix,
		).Error; err != nil {
			return "", err
		}
	}

	return fmt.Sprintf("%s-%04d", prefix, next), nil
}
