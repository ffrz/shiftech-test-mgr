package auth

import (
	"context"
	"errors"
	"testing"

	"github.com/shiftech/testify-platform/core"
)

func TestSessionHasScope(t *testing.T) {
	s := &Session{
		Identity: core.APITokenIdentity{
			TokenID:   "tok-1",
			ProjectID: "proj-1",
			Scopes: []core.TokenScope{
				core.ScopeReadProject,
				core.ScopeReadTestCase,
				core.ScopeWriteTestCase,
			},
		},
		ProjectID: "proj-1",
	}

	tests := []struct {
		name  string
		scope core.TokenScope
		want  bool
	}{
		{"has read:project", core.ScopeReadProject, true},
		{"has read:test-cases", core.ScopeReadTestCase, true},
		{"has write:test-cases", core.ScopeWriteTestCase, true},
		{"missing read:test-plans", core.ScopeReadTestPlan, false},
		{"missing write:test-runs", core.ScopeWriteTestRun, false},
		{"missing read:issues", core.ScopeReadIssue, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := s.HasScope(tt.scope)
			if got != tt.want {
				t.Errorf("HasScope(%q) = %v, want %v", tt.scope, got, tt.want)
			}
		})
	}
}

func TestSessionHasScopeEmptyScopes(t *testing.T) {
	s := &Session{
		Identity: core.APITokenIdentity{
			TokenID:   "tok-1",
			ProjectID: "proj-1",
			Scopes:    []core.TokenScope{},
		},
		ProjectID: "proj-1",
	}

	if s.HasScope(core.ScopeReadProject) {
		t.Error("HasScope should return false for token with no scopes")
	}
}

func TestSessionHasScopeNilScopes(t *testing.T) {
	s := &Session{
		Identity: core.APITokenIdentity{
			TokenID:   "tok-1",
			ProjectID: "proj-1",
			Scopes:    nil,
		},
		ProjectID: "proj-1",
	}

	if s.HasScope(core.ScopeReadProject) {
		t.Error("HasScope should return false for nil scopes")
	}
}

func TestSessionEnsureScope(t *testing.T) {
	s := &Session{
		Identity: core.APITokenIdentity{
			TokenID:   "tok-1",
			ProjectID: "proj-1",
			Scopes: []core.TokenScope{
				core.ScopeReadProject,
				core.ScopeWriteTestCase,
			},
		},
		ProjectID: "proj-1",
	}

	tests := []struct {
		name    string
		scope   core.TokenScope
		wantErr bool
	}{
		{"allowed: read:project", core.ScopeReadProject, false},
		{"allowed: write:test-cases", core.ScopeWriteTestCase, false},
		{"denied: read:test-plans", core.ScopeReadTestPlan, true},
		{"denied: write:issues", core.ScopeWriteIssue, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := s.EnsureScope(tt.scope)
			if (err != nil) != tt.wantErr {
				t.Errorf("EnsureScope(%q) error = %v, wantErr = %v", tt.scope, err, tt.wantErr)
			}
		})
	}
}

func TestSessionEnsureScopeEmptyScopes(t *testing.T) {
	s := &Session{
		Identity: core.APITokenIdentity{
			TokenID:   "tok-1",
			ProjectID: "proj-1",
			Scopes:    []core.TokenScope{},
		},
		ProjectID: "proj-1",
	}

	err := s.EnsureScope(core.ScopeReadProject)
	if err == nil {
		t.Error("EnsureScope should fail for empty scopes")
	}
}

func TestSessionEnsureScopeAllScopes(t *testing.T) {
	allScopes := []core.TokenScope{
		core.ScopeReadProject,
		core.ScopeReadTestCase,
		core.ScopeReadTestPlan,
		core.ScopeReadTestRun,
		core.ScopeReadIssue,
		core.ScopeReadAutomation,
		core.ScopeWriteTestCase,
		core.ScopeWriteTestPlan,
		core.ScopeWriteTestRun,
		core.ScopeWriteIssue,
		core.ScopeWriteAutomation,
	}

	s := &Session{
		Identity: core.APITokenIdentity{
			TokenID:   "tok-full",
			ProjectID: "proj-1",
			Scopes:    allScopes,
		},
		ProjectID: "proj-1",
	}

	for _, scope := range allScopes {
		t.Run("has "+string(scope), func(t *testing.T) {
			if !s.HasScope(scope) {
				t.Errorf("HasScope(%q) should be true", scope)
			}
			if err := s.EnsureScope(scope); err != nil {
				t.Errorf("EnsureScope(%q) should not error: %v", scope, err)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// LoadFromToken
// ---------------------------------------------------------------------------

type mockTokenRepo struct {
	authFn func(ctx context.Context, token string) (*core.APITokenIdentity, error)
}

func (m *mockTokenRepo) Authenticate(ctx context.Context, token string) (*core.APITokenIdentity, error) {
	return m.authFn(ctx, token)
}

func (m *mockTokenRepo) ValidateScopes(ctx context.Context, tokenID string, required ...core.TokenScope) error {
	return nil
}

func TestLoadFromToken(t *testing.T) {
	identity := &core.APITokenIdentity{
		TokenID:   "tok-1",
		ProjectID: "proj-1",
		Scopes:    []core.TokenScope{core.ScopeReadProject},
	}
	repo := &mockTokenRepo{authFn: func(ctx context.Context, token string) (*core.APITokenIdentity, error) {
		return identity, nil
	}}

	s, err := LoadFromToken(context.Background(), repo, "tm_abc", "proj-1")
	if err != nil {
		t.Fatalf("LoadFromToken: %v", err)
	}
	if s.ProjectID != "proj-1" {
		t.Errorf("ProjectID = %q, want proj-1", s.ProjectID)
	}
	if s.Identity.TokenID != "tok-1" {
		t.Errorf("Identity.TokenID = %q, want tok-1", s.Identity.TokenID)
	}
}

func TestLoadFromTokenEmptyToken(t *testing.T) {
	repo := &mockTokenRepo{}
	if _, err := LoadFromToken(context.Background(), repo, "", "proj-1"); err == nil {
		t.Error("LoadFromToken with empty token should error")
	}
}

func TestLoadFromTokenEmptyProjectID(t *testing.T) {
	repo := &mockTokenRepo{}
	if _, err := LoadFromToken(context.Background(), repo, "tm_abc", ""); err == nil {
		t.Error("LoadFromToken with empty project ID should error")
	}
}

func TestLoadFromTokenProjectMismatch(t *testing.T) {
	identity := &core.APITokenIdentity{
		TokenID:   "tok-1",
		ProjectID: "proj-other",
	}
	repo := &mockTokenRepo{authFn: func(ctx context.Context, token string) (*core.APITokenIdentity, error) {
		return identity, nil
	}}

	if _, err := LoadFromToken(context.Background(), repo, "tm_abc", "proj-1"); err == nil {
		t.Error("LoadFromToken with mismatched project should error")
	}
}

func TestLoadFromTokenRepoError(t *testing.T) {
	repo := &mockTokenRepo{authFn: func(ctx context.Context, token string) (*core.APITokenIdentity, error) {
		return nil, errors.New("invalid token")
	}}
	if _, err := LoadFromToken(context.Background(), repo, "tm_abc", "proj-1"); err == nil {
		t.Error("LoadFromToken with repo error should propagate")
	}
}

// ---------------------------------------------------------------------------
// Load (env-based)
// ---------------------------------------------------------------------------

func TestLoadMissingEnvToken(t *testing.T) {
	t.Setenv("TM_API_TOKEN", "")
	t.Setenv("TM_PROJECT_ID", "proj-1")
	if _, err := Load(context.Background(), &mockTokenRepo{}); err == nil {
		t.Error("Load without TM_API_TOKEN should error")
	}
}

func TestLoadMissingEnvProject(t *testing.T) {
	t.Setenv("TM_API_TOKEN", "tm_abc")
	t.Setenv("TM_PROJECT_ID", "")
	if _, err := Load(context.Background(), &mockTokenRepo{}); err == nil {
		t.Error("Load without TM_PROJECT_ID should error")
	}
}

func TestLoadFromEnv(t *testing.T) {
	identity := &core.APITokenIdentity{
		TokenID:   "tok-1",
		ProjectID: "proj-1",
		Scopes:    []core.TokenScope{core.ScopeReadProject},
	}
	repo := &mockTokenRepo{authFn: func(ctx context.Context, token string) (*core.APITokenIdentity, error) {
		return identity, nil
	}}

	t.Setenv("TM_API_TOKEN", "tm_abc")
	t.Setenv("TM_PROJECT_ID", "proj-1")
	s, err := Load(context.Background(), repo)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if s.ProjectID != "proj-1" {
		t.Errorf("ProjectID = %q, want proj-1", s.ProjectID)
	}
}

// ---------------------------------------------------------------------------
// context helpers
// ---------------------------------------------------------------------------

func TestWithSessionFromContext(t *testing.T) {
	s := &Session{ProjectID: "proj-1"}
	ctx := WithSession(context.Background(), s)

	got, ok := FromContext(ctx)
	if !ok {
		t.Fatal("FromContext should find session")
	}
	if got != s {
		t.Errorf("FromContext = %v, want same session pointer", got)
	}
}

func TestFromContextMissing(t *testing.T) {
	if _, ok := FromContext(context.Background()); ok {
		t.Error("FromContext on empty context should return ok=false")
	}
}

// ---------------------------------------------------------------------------
// AssertProjectReferences (T4.3) — recursive project-scope guard
// ---------------------------------------------------------------------------

func testSessionProject() *Session {
	return &Session{
		Identity:  core.APITokenIdentity{TokenID: "tok-1", ProjectID: "proj-1"},
		ProjectID: "proj-1",
	}
}

func TestAssertProjectReferences_NoRefs(t *testing.T) {
	if err := testSessionProject().AssertProjectReferences(nil); err != nil {
		t.Errorf("nil args: %v", err)
	}
	if err := testSessionProject().AssertProjectReferences(map[string]any{}); err != nil {
		t.Errorf("empty args: %v", err)
	}
	if err := testSessionProject().AssertProjectReferences(map[string]any{"title": "T", "limit": 50}); err != nil {
		t.Errorf("args without project ref: %v", err)
	}
}

func TestAssertProjectReferences_TopLevelMatch(t *testing.T) {
	args := map[string]any{"project_id": "proj-1", "title": "T"}
	if err := testSessionProject().AssertProjectReferences(args); err != nil {
		t.Errorf("matching project_id: %v", err)
	}
}

func TestAssertProjectReferences_CamelCaseMatch(t *testing.T) {
	args := map[string]any{"projectId": "proj-1"}
	if err := testSessionProject().AssertProjectReferences(args); err != nil {
		t.Errorf("matching projectId: %v", err)
	}
}

func TestAssertProjectReferences_Mismatch(t *testing.T) {
	s := testSessionProject()
	cases := []map[string]any{
		{"project_id": "proj-OTHER"},
		{"projectId": "proj-OTHER"},
	}
	for _, args := range cases {
		if err := s.AssertProjectReferences(args); err == nil {
			t.Errorf("args %v: expected mismatch error", args)
		}
	}
}

func TestAssertProjectReferences_NestedObject(t *testing.T) {
	args := map[string]any{
		"cases": []any{
			map[string]any{"title": "A", "project_id": "proj-1"},
			map[string]any{"title": "B", "project_id": "proj-OTHER"},
		},
	}
	if err := testSessionProject().AssertProjectReferences(args); err == nil {
		t.Error("expected error for nested project mismatch")
	}
}

func TestAssertProjectReferences_NestedObjectAllMatch(t *testing.T) {
	args := map[string]any{
		"cases": []any{
			map[string]any{"title": "A", "project_id": "proj-1"},
			map[string]any{"title": "B", "projectId": "proj-1"},
		},
	}
	if err := testSessionProject().AssertProjectReferences(args); err != nil {
		t.Errorf("nested all match: %v", err)
	}
}

func TestAssertProjectReferences_ArrayElements(t *testing.T) {
	args := map[string]any{
		"ids": []any{"a", "b"},
	}
	if err := testSessionProject().AssertProjectReferences(args); err != nil {
		t.Errorf("array of strings without project refs: %v", err)
	}

	bad := map[string]any{
		"ids": []any{"a", map[string]any{"project_id": "proj-OTHER"}},
	}
	if err := testSessionProject().AssertProjectReferences(bad); err == nil {
		t.Error("expected error for project ref inside array element")
	}
}

func TestAssertProjectReferences_NonStringRef(t *testing.T) {
	if err := testSessionProject().AssertProjectReferences(map[string]any{"project_id": 42}); err == nil {
		t.Error("expected error for non-string project reference")
	}
}
