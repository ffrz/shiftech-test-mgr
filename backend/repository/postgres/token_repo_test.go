package postgres

import (
	"testing"

	"github.com/lib/pq"
	"github.com/shiftech/testify-platform/core"
)

func TestSha256Hex(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "known hash",
			input: "hello",
			want:  "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
		},
		{
			name:  "empty string",
			input: "",
			want:  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		},
		{
			name:  "token-like string",
			input: "tm_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
			want:  "f6896e54286e40305c5b10589681bd3a965145f3ee9b91ce358693a5d8ee1f7c",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := sha256Hex(tt.input)
			if got != tt.want {
				t.Errorf("sha256Hex(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestSha256HexDeterministic(t *testing.T) {
	input := "test-token-value"
	h1 := sha256Hex(input)
	h2 := sha256Hex(input)
	if h1 != h2 {
		t.Errorf("sha256Hex should be deterministic: %q != %q", h1, h2)
	}
}

func TestSha256HexLength(t *testing.T) {
	inputs := []string{"a", "hello world", "", "longer-string-with-numbers-12345"}
	for _, input := range inputs {
		t.Run(input, func(t *testing.T) {
			got := sha256Hex(input)
			if len(got) != 64 {
				t.Errorf("sha256Hex(%q) length = %d, want 64", input, len(got))
			}
		})
	}
}

func TestToScopes(t *testing.T) {
	tests := []struct {
		name    string
		raw     pq.StringArray
		wantLen int
		want    []core.TokenScope
	}{
		{
			name:    "empty array",
			raw:     pq.StringArray{},
			wantLen: 0,
		},
		{
			name:    "single scope",
			raw:     pq.StringArray{"read:project"},
			wantLen: 1,
			want:    []core.TokenScope{core.ScopeReadProject},
		},
		{
			name:    "multiple scopes",
			raw:     pq.StringArray{"read:project", "read:test-cases", "write:test-cases"},
			wantLen: 3,
			want:    []core.TokenScope{core.ScopeReadProject, core.ScopeReadTestCase, core.ScopeWriteTestCase},
		},
		{
			name:    "all read scopes",
			raw:     pq.StringArray{"read:project", "read:test-cases", "read:test-plans", "read:test-runs", "read:issues", "read:automation"},
			wantLen: 6,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := toScopes(tt.raw)
			if len(got) != tt.wantLen {
				t.Errorf("toScopes() len = %d, want %d", len(got), tt.wantLen)
			}
			if tt.want != nil {
				for i, wantScope := range tt.want {
					if got[i] != wantScope {
						t.Errorf("toScopes()[%d] = %q, want %q", i, got[i], wantScope)
					}
				}
			}
		})
	}
}

func TestToScopesNilInput(t *testing.T) {
	got := toScopes(nil)
	if got == nil {
		t.Error("toScopes(nil) should return non-nil slice")
	}
	if len(got) != 0 {
		t.Errorf("toScopes(nil) len = %d, want 0", len(got))
	}
}
