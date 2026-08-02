package tools

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"github.com/mark3labs/mcp-go/server"
	"github.com/shiftech/testify-platform/core"
	"github.com/shiftech/testify-platform/mcp-server/internal/auth"
	"github.com/shiftech/testify-platform/service"
)

// ---------------------------------------------------------------------------
// mock repo
// ---------------------------------------------------------------------------

type writeMockRepoRepo struct {
	getConfig func(ctx context.Context, projectID, repositoryID string) (*core.ProjectRepositoryConfig, error)
}

func (m *writeMockRepoRepo) GetConfig(ctx context.Context, projectID, repositoryID string) (*core.ProjectRepositoryConfig, error) {
	return m.getConfig(ctx, projectID, repositoryID)
}

const testRepositoryID = "123e4567-e89b-12d3-a456-426614174010"

func repoReg(session *auth.Session, m *writeMockRepoRepo) *Registry {
	reg := &Registry{Session: session}
	if m != nil {
		reg.Services.Repo = service.NewRepoService(m)
	}
	return reg
}

// newLocalRepo creates a throwaway git repository on disk so the service's
// git-backed tools run against a real checkout (local_path mode), matching
// how the Node reference exercises them.
func newLocalRepo(t *testing.T, files map[string]string) string {
	t.Helper()
	dir := t.TempDir()
	gitDir(t, dir, "init", "-q")
	gitDir(t, dir, "config", "user.email", "test@testify.local")
	gitDir(t, dir, "config", "user.name", "Testify Test")
	for name, content := range files {
		path := filepath.Join(dir, filepath.FromSlash(name))
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatalf("mkdir %s: %v", name, err)
		}
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			t.Fatalf("write %s: %v", name, err)
		}
	}
	gitDir(t, dir, "add", "-A")
	gitDir(t, dir, "commit", "-q", "-m", "initial")
	return dir
}

func gitDir(t *testing.T, dir string, args ...string) {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git %v: %v\n%s", args, err, out)
	}
}

func localPathConfig(dir string) *core.ProjectRepositoryConfig {
	cfg := core.ProjectRepositoryConfig{
		ID:         testRepositoryID,
		Name:       "app",
		SourceType: core.RepoSourceLocalPath,
		URLOrPath:  dir,
	}
	return &cfg
}

// ---------------------------------------------------------------------------
// Register — all 4 repo tools registered
// ---------------------------------------------------------------------------

func TestRepoToolsRegister(t *testing.T) {
	r := &RepoTools{reg: &Registry{}}
	if r.Name() != "repo" {
		t.Errorf("Name() = %q", r.Name())
	}

	svr := server.NewMCPServer("test", "0.0.0")
	if err := r.Register(svr); err != nil {
		t.Fatalf("Register: %v", err)
	}
	got := svr.ListTools()
	if len(got) != 4 {
		t.Fatalf("registered %d tools, want 4", len(got))
	}
	for _, name := range repoToolNames() {
		if _, ok := got[name]; !ok {
			t.Errorf("tool %q not registered", name)
		}
	}
}

func repoToolNames() []string {
	return []string{
		"testify.repo.list_files",
		"testify.repo.read_file",
		"testify.repo.search",
		"testify.repo.diff",
	}
}

// ---------------------------------------------------------------------------
// argument validation (no git needed)
// ---------------------------------------------------------------------------

func TestRepo_RejectsBadRepositoryID(t *testing.T) {
	reg := repoReg(writeSession(), &writeMockRepoRepo{})
	r := &RepoTools{reg: reg}

	res, _ := r.listFiles(context.Background(), call("testify.repo.list_files", map[string]any{
		"repository_id": "nope",
	}))
	assertErrorResult(t, "bad repository id", res, "repository_id")
}

func TestRepo_RejectsUnknownRepository(t *testing.T) {
	reg := repoReg(writeSession(), &writeMockRepoRepo{
		getConfig: func(ctx context.Context, projectID, repositoryID string) (*core.ProjectRepositoryConfig, error) {
			return nil, nil
		},
	})
	r := &RepoTools{reg: reg}

	res, _ := r.readFile(context.Background(), call("testify.repo.read_file", map[string]any{
		"repository_id": testRepositoryID,
		"path":          "main.go",
	}))
	assertErrorResult(t, "unknown repo", res, "NOT_FOUND")
}

func TestRepo_RejectsLimitOutOfRange(t *testing.T) {
	dir := newLocalRepo(t, map[string]string{"a.txt": "a"})
	reg := repoReg(writeSession(), &writeMockRepoRepo{
		getConfig: func(ctx context.Context, projectID, repositoryID string) (*core.ProjectRepositoryConfig, error) {
			return localPathConfig(dir), nil
		},
	})
	r := &RepoTools{reg: reg}

	res, _ := r.listFiles(context.Background(), call("testify.repo.list_files", map[string]any{
		"repository_id": testRepositoryID,
		"limit":         float64(150),
	}))
	assertErrorResult(t, "limit out of range", res, "INVALID_PAGINATION")
}

func TestRepo_RejectsEscapingPath(t *testing.T) {
	dir := newLocalRepo(t, map[string]string{"a.txt": "a"})
	reg := repoReg(writeSession(), &writeMockRepoRepo{
		getConfig: func(ctx context.Context, projectID, repositoryID string) (*core.ProjectRepositoryConfig, error) {
			return localPathConfig(dir), nil
		},
	})
	r := &RepoTools{reg: reg}

	res, _ := r.readFile(context.Background(), call("testify.repo.read_file", map[string]any{
		"repository_id": testRepositoryID,
		"path":          "../outside.txt",
	}))
	assertErrorResult(t, "escaping path", res, "INVALID_PATH")
}

func TestRepo_RejectsUnsafeRemoteURL(t *testing.T) {
	reg := repoReg(writeSession(), &writeMockRepoRepo{
		getConfig: func(ctx context.Context, projectID, repositoryID string) (*core.ProjectRepositoryConfig, error) {
			cfg := core.ProjectRepositoryConfig{
				ID:         testRepositoryID,
				Name:       "app",
				SourceType: core.RepoSourceGitURL,
				URLOrPath:  "git@github.com:org/repo.git",
			}
			return &cfg, nil
		},
	})
	r := &RepoTools{reg: reg}

	res, _ := r.listFiles(context.Background(), call("testify.repo.list_files", map[string]any{
		"repository_id": testRepositoryID,
	}))
	assertErrorResult(t, "unsafe url", res, "repo url")
}

// ---------------------------------------------------------------------------
// list_files
// ---------------------------------------------------------------------------

func TestRepoListFiles_Valid(t *testing.T) {
	dir := newLocalRepo(t, map[string]string{"src/a.ts": "a", "src/b.ts": "b", "README.md": "# r"})
	reg := repoReg(writeSession(), &writeMockRepoRepo{
		getConfig: func(ctx context.Context, projectID, repositoryID string) (*core.ProjectRepositoryConfig, error) {
			return localPathConfig(dir), nil
		},
	})
	r := &RepoTools{reg: reg}

	res, _ := r.listFiles(context.Background(), call("testify.repo.list_files", map[string]any{
		"repository_id": testRepositoryID,
		"path":          "src",
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	result, ok := res.StructuredContent.(*core.RepoListFilesResult)
	if !ok {
		t.Fatalf("unexpected content type %T", res.StructuredContent)
	}
	if len(result.Files) != 2 || result.Files[0] != "a.ts" || result.Files[1] != "b.ts" {
		t.Errorf("files = %v, want [a.ts b.ts]", result.Files)
	}
	if result.Truncated {
		t.Error("unexpected truncation")
	}
}

func TestRepoListFiles_Truncated(t *testing.T) {
	dir := newLocalRepo(t, map[string]string{"a.txt": "a", "b.txt": "b", "c.txt": "c"})
	reg := repoReg(writeSession(), &writeMockRepoRepo{
		getConfig: func(ctx context.Context, projectID, repositoryID string) (*core.ProjectRepositoryConfig, error) {
			return localPathConfig(dir), nil
		},
	})
	r := &RepoTools{reg: reg}

	res, _ := r.listFiles(context.Background(), call("testify.repo.list_files", map[string]any{
		"repository_id": testRepositoryID,
		"limit":         float64(1),
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	result := res.StructuredContent.(*core.RepoListFilesResult)
	if len(result.Files) != 1 || !result.Truncated {
		t.Errorf("files=%v truncated=%v, want 1 file truncated", result.Files, result.Truncated)
	}
}

// ---------------------------------------------------------------------------
// read_file
// ---------------------------------------------------------------------------

func TestRepoReadFile_Valid(t *testing.T) {
	dir := newLocalRepo(t, map[string]string{"src/main.go": "package main\nfunc main() {}\n"})
	reg := repoReg(writeSession(), &writeMockRepoRepo{
		getConfig: func(ctx context.Context, projectID, repositoryID string) (*core.ProjectRepositoryConfig, error) {
			return localPathConfig(dir), nil
		},
	})
	r := &RepoTools{reg: reg}

	res, _ := r.readFile(context.Background(), call("testify.repo.read_file", map[string]any{
		"repository_id": testRepositoryID,
		"path":          "src/main.go",
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	result := res.StructuredContent.(*core.RepoReadFileResult)
	if !contains(result.Content, "package main") || result.Bytes == 0 {
		t.Errorf("content=%q bytes=%d", result.Content, result.Bytes)
	}
}

func TestRepoReadFile_Missing(t *testing.T) {
	dir := newLocalRepo(t, map[string]string{"a.txt": "a"})
	reg := repoReg(writeSession(), &writeMockRepoRepo{
		getConfig: func(ctx context.Context, projectID, repositoryID string) (*core.ProjectRepositoryConfig, error) {
			return localPathConfig(dir), nil
		},
	})
	r := &RepoTools{reg: reg}

	res, _ := r.readFile(context.Background(), call("testify.repo.read_file", map[string]any{
		"repository_id": testRepositoryID,
		"path":          "missing.txt",
	}))
	assertErrorResult(t, "missing file", res, "NOT_FOUND")
}

func TestRepoReadFile_MissingPath(t *testing.T) {
	reg := repoReg(writeSession(), &writeMockRepoRepo{})
	r := &RepoTools{reg: reg}

	res, _ := r.readFile(context.Background(), call("testify.repo.read_file", map[string]any{
		"repository_id": testRepositoryID,
	}))
	assertErrorResult(t, "missing path", res, "path")
}

// ---------------------------------------------------------------------------
// search
// ---------------------------------------------------------------------------

func TestRepoSearch_Valid(t *testing.T) {
	dir := newLocalRepo(t, map[string]string{"src/a.ts": "const greeting = \"hello\";", "src/b.ts": "const x = 1;"})
	reg := repoReg(writeSession(), &writeMockRepoRepo{
		getConfig: func(ctx context.Context, projectID, repositoryID string) (*core.ProjectRepositoryConfig, error) {
			return localPathConfig(dir), nil
		},
	})
	r := &RepoTools{reg: reg}

	res, _ := r.search(context.Background(), call("testify.repo.search", map[string]any{
		"repository_id": testRepositoryID,
		"query":         "hello",
		"path":          "src",
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	result := res.StructuredContent.(*core.RepoSearchResult)
	if len(result.Matches) != 1 {
		t.Fatalf("matches = %d, want 1", len(result.Matches))
	}
	if result.Matches[0].Path != "a.ts" || result.Matches[0].Line != 1 || !contains(result.Matches[0].Text, "hello") {
		t.Errorf("match = %+v", result.Matches[0])
	}
}

func TestRepoSearch_NoMatches(t *testing.T) {
	dir := newLocalRepo(t, map[string]string{"a.ts": "const x = 1;"})
	reg := repoReg(writeSession(), &writeMockRepoRepo{
		getConfig: func(ctx context.Context, projectID, repositoryID string) (*core.ProjectRepositoryConfig, error) {
			return localPathConfig(dir), nil
		},
	})
	r := &RepoTools{reg: reg}

	res, _ := r.search(context.Background(), call("testify.repo.search", map[string]any{
		"repository_id": testRepositoryID,
		"query":         "not-present",
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success for no matches, got %+v", res)
	}
	result := res.StructuredContent.(*core.RepoSearchResult)
	if len(result.Matches) != 0 || result.Truncated {
		t.Errorf("matches=%v truncated=%v, want empty", result.Matches, result.Truncated)
	}
}

func TestRepoSearch_RejectsEmptyQuery(t *testing.T) {
	reg := repoReg(writeSession(), &writeMockRepoRepo{})
	r := &RepoTools{reg: reg}

	res, _ := r.search(context.Background(), call("testify.repo.search", map[string]any{
		"repository_id": testRepositoryID,
	}))
	assertErrorResult(t, "empty query", res, "query")
}

// ---------------------------------------------------------------------------
// diff
// ---------------------------------------------------------------------------

func TestRepoDiff_Valid(t *testing.T) {
	dir := newLocalRepo(t, map[string]string{"main.go": "package main\n\nvar V = 1\n"})
	gitDir(t, dir, "commit", "-q", "--allow-empty", "-m", "second")
	if err := os.WriteFile(filepath.Join(dir, "main.go"), []byte("package main\n\nvar V = 2\n"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	gitDir(t, dir, "add", "-A")
	gitDir(t, dir, "commit", "-q", "-m", "third")

	reg := repoReg(writeSession(), &writeMockRepoRepo{
		getConfig: func(ctx context.Context, projectID, repositoryID string) (*core.ProjectRepositoryConfig, error) {
			return localPathConfig(dir), nil
		},
	})
	r := &RepoTools{reg: reg}

	res, _ := r.diff(context.Background(), call("testify.repo.diff", map[string]any{
		"repository_id": testRepositoryID,
		"base":          "HEAD~2",
		"head":          "HEAD",
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	result := res.StructuredContent.(*core.RepoDiff)
	if result.Base != "HEAD~2" || result.Head != "HEAD" {
		t.Errorf("range = %s..%s", result.Base, result.Head)
	}
	if len(result.Files) != 1 || result.Files[0].Path != "main.go" || result.Files[0].Status != "M" {
		t.Errorf("files = %+v, want single modified main.go", result.Files)
	}
	if !contains(result.Patch, "var V = 1") || !contains(result.Patch, "var V = 2") {
		t.Errorf("patch missing expected hunks:\n%s", result.Patch)
	}
	if result.Truncated {
		t.Error("unexpected truncation")
	}
}

func TestRepoDiff_RejectsUnsafeRevision(t *testing.T) {
	dir := newLocalRepo(t, map[string]string{"a.txt": "a"})
	reg := repoReg(writeSession(), &writeMockRepoRepo{
		getConfig: func(ctx context.Context, projectID, repositoryID string) (*core.ProjectRepositoryConfig, error) {
			return localPathConfig(dir), nil
		},
	})
	r := &RepoTools{reg: reg}

	res, _ := r.diff(context.Background(), call("testify.repo.diff", map[string]any{
		"repository_id": testRepositoryID,
		"base":          "-o/dev/null",
	}))
	assertErrorResult(t, "unsafe revision", res, "INVALID_REVISION")
}

func TestRepoDiff_MissingBase(t *testing.T) {
	reg := repoReg(writeSession(), &writeMockRepoRepo{})
	r := &RepoTools{reg: reg}

	res, _ := r.diff(context.Background(), call("testify.repo.diff", map[string]any{
		"repository_id": testRepositoryID,
	}))
	assertErrorResult(t, "missing base", res, "base")
}

// ---------------------------------------------------------------------------

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (func() bool {
		for i := 0; i+len(sub) <= len(s); i++ {
			if s[i:i+len(sub)] == sub {
				return true
			}
		}
		return false
	})()
}

// compile-time interface check
var _ core.RepoRepository = (*writeMockRepoRepo)(nil)
