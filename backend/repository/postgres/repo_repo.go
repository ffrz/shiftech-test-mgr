package postgres

import (
	"context"
	"fmt"

	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

// RepoRepo reads project_repositories configuration. It only touches the
// database — the actual git operations run in the service layer against a
// local checkout (TASKS.md T5.5). The credential comes from Vault via
// vault.decrypted_secrets and is decrypted server-side only.
type RepoRepo struct {
	db *gorm.DB
}

func NewRepoRepo(db *gorm.DB) *RepoRepo {
	return &RepoRepo{db: db}
}

func (r *RepoRepo) GetConfig(ctx context.Context, projectID, repositoryID string) (*core.ProjectRepositoryConfig, error) {
	var row projectRepositoryRow
	err := r.db.WithContext(ctx).Raw(`
		select r.id, r.name, r.source_type, r.url_or_path, r.default_branch, r.subdirectory, ds.decrypted_secret as credential
		from project_repositories r
		left join vault.decrypted_secrets ds on ds.id = r.credential_id
		where r.id = ? and r.project_id = ? and r.is_active
	`, repositoryID, projectID).Scan(&row).Error
	if err != nil {
		return nil, fmt.Errorf("repo config: %w", err)
	}
	if row.ID == "" {
		return nil, nil
	}
	out := row.toDomain()
	return &out, nil
}

type projectRepositoryRow struct {
	ID            string  `gorm:"column:id"`
	Name          string  `gorm:"column:name"`
	SourceType    string  `gorm:"column:source_type"`
	URLOrPath     string  `gorm:"column:url_or_path"`
	DefaultBranch *string `gorm:"column:default_branch"`
	Subdirectory  *string `gorm:"column:subdirectory"`
	Credential    *string `gorm:"column:credential"`
}

func (r projectRepositoryRow) toDomain() core.ProjectRepositoryConfig {
	return core.ProjectRepositoryConfig{
		ID:            r.ID,
		Name:          r.Name,
		SourceType:    core.RepositorySourceType(r.SourceType),
		URLOrPath:     r.URLOrPath,
		DefaultBranch: r.DefaultBranch,
		Subdirectory:  r.Subdirectory,
		Credential:    r.Credential,
	}
}
