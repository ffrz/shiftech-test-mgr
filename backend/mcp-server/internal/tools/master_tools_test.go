package tools

import (
	"context"
	"errors"
	"testing"

	"github.com/shiftech/testify-platform/core"
	"github.com/shiftech/testify-platform/service"
)

type masterTagRepo struct {
	get          func(context.Context, string) (*core.Tag, error)
	findOrCreate func(context.Context, string, string) (*core.Tag, error)
}

func (m *masterTagRepo) ListByProject(context.Context, string) ([]core.Tag, error) { return nil, nil }
func (m *masterTagRepo) Get(ctx context.Context, id string) (*core.Tag, error) {
	if m.get == nil {
		return nil, errors.New("not used")
	}
	return m.get(ctx, id)
}
func (m *masterTagRepo) FindOrCreate(ctx context.Context, projectID, name string) (*core.Tag, error) {
	return m.findOrCreate(ctx, projectID, name)
}
func (m *masterTagRepo) Update(context.Context, string, string) (*core.Tag, error) {
	return nil, errors.New("not used")
}
func (m *masterTagRepo) Delete(context.Context, string) error { return errors.New("not used") }

func TestCreateTagUsesScopedProjectAndTrimsName(t *testing.T) {
	repo := &masterTagRepo{findOrCreate: func(_ context.Context, projectID, name string) (*core.Tag, error) {
		if projectID != testProjectID || name != "smoke" {
			t.Fatalf("FindOrCreate = %q/%q", projectID, name)
		}
		return &core.Tag{ID: testResultID, ProjectID: projectID, Name: name}, nil
	}}
	reg := &Registry{Session: writeSession(core.ScopeWriteTestCase)}
	reg.Services.Tag = service.NewTagService(repo)
	res, _ := (&WriteTools{reg: reg}).createTag(context.Background(), call("testify.tag.create", map[string]any{"name": "  smoke  "}))
	if res == nil || res.IsError {
		t.Fatalf("createTag result = %+v", res)
	}
}

func TestUpdateTagRejectsCrossProjectEntity(t *testing.T) {
	repo := &masterTagRepo{get: func(context.Context, string) (*core.Tag, error) {
		return &core.Tag{ID: testResultID, ProjectID: "123e4567-e89b-12d3-a456-426614174099"}, nil
	}}
	reg := &Registry{Session: writeSession(core.ScopeWriteTestCase)}
	reg.Services.Tag = service.NewTagService(repo)
	res, _ := (&WriteTools{reg: reg}).updateTag(context.Background(), call("testify.tag.update", map[string]any{
		"tag_id": testResultID, "name": "regression",
	}))
	assertErrorResult(t, "cross-project tag", res, "scoped project")
}
