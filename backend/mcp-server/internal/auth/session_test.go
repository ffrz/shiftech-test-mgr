package auth

import (
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
