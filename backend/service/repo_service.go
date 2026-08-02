package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/shiftech/testify-platform/core"
)

// RepoService implements the repository context tools (TASKS.md T5.5).
// Ported from the Node repoService.ts. Strategy: the MCP server keeps a
// local checkout of each remote repository (cached under
// TM_REPOSITORY_CACHE_DIR, default os.TempDir()/testify-repos) and shells out
// to the system `git` binary — the same approach as the Node reference, so no
// third-party Git library is introduced (matching the codebase's minimal
// dependency surface). local_path repositories are used in place.
//
// Every filesystem access is confined to the configured repository
// subdirectory: absolute paths, NUL bytes, and any path escaping the scope
// are rejected before a file is read.
const (
	maxRepoFileBytes    = 128 * 1024
	maxRepoResults      = 100
	maxRepoPatchBytes   = 192 * 1024
	maxRepoQueryLength  = 500
	maxRepoPathLength   = 1000
	maxRepoRevisionLen  = 200
	defaultRepoBranch   = "main"
)

var (
	repoUUIDPattern    = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
	repoRevisionPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._/@{}^~:+-]{0,199}$`)
	repoGrepLinePattern = regexp.MustCompile(`^(.+?):(\d+):(.*)$`)
)

type RepoService struct {
	repo core.RepoRepository
}

func NewRepoService(repo core.RepoRepository) *RepoService {
	return &RepoService{repo: repo}
}

func (s *RepoService) ListFiles(ctx context.Context, projectID, repositoryID, path string, limit int) (*core.RepoListFilesResult, error) {
	lim, err := validateRepoLimit(limit, 100)
	if err != nil {
		return nil, err
	}
	root, cfg, err := s.resolveRepository(ctx, projectID, repositoryID)
	if err != nil {
		return nil, err
	}
	scope, err := s.scopePath(root, cfg, path, false)
	if err != nil {
		return nil, err
	}

	output, err := s.runGit(ctx, root, cfg, "ls-files", "-z", "--", s.gitPath(root, scope))
	if err != nil {
		return nil, err
	}
	files := make([]string, 0)
	for _, file := range strings.Split(output, "\x00") {
		if file == "" {
			continue
		}
		rel, err := filepath.Rel(scope, filepath.Join(root, filepath.FromSlash(file)))
		if err != nil {
			continue
		}
		rel = filepath.ToSlash(rel)
		if rel == "" || strings.HasPrefix(rel, "../") {
			continue
		}
		files = append(files, rel)
	}

	truncated := len(files) > lim
	if truncated {
		files = files[:lim]
	}
	return &core.RepoListFilesResult{RepositoryID: repositoryID, Files: files, Truncated: truncated}, nil
}

func (s *RepoService) ReadFile(ctx context.Context, projectID, repositoryID, path string) (*core.RepoReadFileResult, error) {
	if path == "" || len(path) > maxRepoPathLength {
		return nil, fmt.Errorf("INVALID_PATH: path must be a repository-relative file of at most %d characters", maxRepoPathLength)
	}
	root, cfg, err := s.resolveRepository(ctx, projectID, repositoryID)
	if err != nil {
		return nil, err
	}
	target, err := s.scopePath(root, cfg, path, true)
	if err != nil {
		return nil, err
	}

	info, err := os.Stat(target)
	if err != nil {
		return nil, fmt.Errorf("NOT_FOUND: repository path was not found")
	}
	if !info.Mode().IsRegular() {
		return nil, fmt.Errorf("NOT_A_FILE: path is not a file — pass a file returned by repo.list_files")
	}
	if info.Size() > maxRepoFileBytes {
		return nil, fmt.Errorf("FILE_TOO_LARGE: file exceeds the 128 KiB read limit — read a smaller source file")
	}

	content, err := os.ReadFile(target)
	if err != nil {
		return nil, fmt.Errorf("repo read: %w", err)
	}
	if bytes.Contains(content, []byte{0}) {
		return nil, fmt.Errorf("BINARY_FILE: binary files cannot be read — choose a text source file")
	}

	return &core.RepoReadFileResult{RepositoryID: repositoryID, Path: path, Content: string(content), Bytes: len(content)}, nil
}

func (s *RepoService) Search(ctx context.Context, projectID, repositoryID, query, path string, limit int) (*core.RepoSearchResult, error) {
	lim, err := validateRepoLimit(limit, 50)
	if err != nil {
		return nil, err
	}
	if query == "" || len(query) > maxRepoQueryLength || strings.ContainsAny(query, "\x00\n") {
		return nil, fmt.Errorf("INVALID_ARGUMENT: query must be a single line of at most 500 characters")
	}
	root, cfg, err := s.resolveRepository(ctx, projectID, repositoryID)
	if err != nil {
		return nil, err
	}
	scope, err := s.scopePath(root, cfg, path, false)
	if err != nil {
		return nil, err
	}

	output, err := s.gitGrep(ctx, root, cfg, "grep", "-I", "-n", "-F", "-e", query, "--", s.gitPath(root, scope))
	if err != nil {
		return nil, err
	}

	matches := make([]core.RepoMatch, 0)
	for _, line := range strings.Split(output, "\n") {
		if line == "" {
			continue
		}
		m := repoGrepLinePattern.FindStringSubmatch(line)
		if m == nil {
			continue
		}
		rel, err := filepath.Rel(scope, filepath.Join(root, filepath.FromSlash(m[1])))
		if err != nil || strings.HasPrefix(rel, "..") {
			continue
		}
		var ln int
		fmt.Sscanf(m[2], "%d", &ln)
		matches = append(matches, core.RepoMatch{Path: filepath.ToSlash(rel), Line: ln, Text: m[3]})
	}

	truncated := len(matches) > lim
	if truncated {
		matches = matches[:lim]
	}
	return &core.RepoSearchResult{RepositoryID: repositoryID, Matches: matches, Truncated: truncated}, nil
}

func (s *RepoService) Diff(ctx context.Context, projectID, repositoryID, base, head, path string) (*core.RepoDiff, error) {
	if err := assertRepoRevision(base, "base"); err != nil {
		return nil, err
	}
	if head == "" {
		head = "HEAD"
	}
	if err := assertRepoRevision(head, "head"); err != nil {
		return nil, err
	}
	root, cfg, err := s.resolveRepository(ctx, projectID, repositoryID)
	if err != nil {
		return nil, err
	}
	scope, err := s.scopePath(root, cfg, path, false)
	if err != nil {
		return nil, err
	}

	rangeArg := base + ".." + head
	scopeArg := s.gitPath(root, scope)

	names, err := s.runGit(ctx, root, cfg, "diff", "--name-status", "--find-renames", rangeArg, "--", scopeArg)
	if err != nil {
		return nil, err
	}
	files := make([]core.RepoFileChange, 0)
	for _, line := range strings.Split(strings.TrimSpace(names), "\n") {
		if line == "" {
			continue
		}
		parts := strings.Split(line, "\t")
		switch len(parts) {
		case 2:
			files = append(files, core.RepoFileChange{Status: parts[0], Path: parts[1]})
		case 3:
			prev := parts[1]
			files = append(files, core.RepoFileChange{Status: parts[0], Path: parts[2], PreviousPath: &prev})
		}
	}

	patch, err := s.runGit(ctx, root, cfg, "diff", "--no-ext-diff", "--unified=3", rangeArg, "--", scopeArg)
	if err != nil {
		return nil, err
	}
	truncated := len(patch) > maxRepoPatchBytes
	if truncated {
		patch = patch[:maxRepoPatchBytes]
	}

	return &core.RepoDiff{Base: base, Head: head, Files: files, Patch: patch, Truncated: truncated}, nil
}

// ---------------------------------------------------------------------------
// repository resolution & git operations
// ---------------------------------------------------------------------------

// resolveRepository loads the scoped active config and prepares a local
// checkout. It returns the checkout root and the configuration.
func (s *RepoService) resolveRepository(ctx context.Context, projectID, repositoryID string) (string, *core.ProjectRepositoryConfig, error) {
	if !repoUUIDPattern.MatchString(repositoryID) {
		return "", nil, fmt.Errorf("INVALID_ARGUMENT: repository_id must be a valid UUID")
	}
	cfg, err := s.repo.GetConfig(ctx, projectID, repositoryID)
	if err != nil {
		return "", nil, err
	}
	if cfg == nil {
		return "", nil, fmt.Errorf("NOT_FOUND: active repository was not found — check that it belongs to the scoped project and is active")
	}
	root, err := s.prepare(ctx, *cfg)
	if err != nil {
		return "", nil, err
	}
	if _, err := s.runGit(ctx, root, cfg, "rev-parse", "--is-inside-work-tree"); err != nil {
		return "", nil, fmt.Errorf("NOT_FOUND: repository checkout is not a git work tree")
	}
	return root, cfg, nil
}

func (s *RepoService) prepare(ctx context.Context, cfg core.ProjectRepositoryConfig) (string, error) {
	if cfg.SourceType == core.RepoSourceLocalPath {
		root, err := filepath.EvalSymlinks(cfg.URLOrPath)
		if err != nil {
			return "", fmt.Errorf("NOT_FOUND: local repository path was not found")
		}
		return root, nil
	}

	remote, err := safeRepoURL(cfg.URLOrPath)
	if err != nil {
		return "", err
	}
	branch := defaultRepoBranch
	if cfg.DefaultBranch != nil && *cfg.DefaultBranch != "" {
		branch = *cfg.DefaultBranch
	}

	cacheDir := os.Getenv("TM_REPOSITORY_CACHE_DIR")
	if cacheDir == "" {
		cacheDir = filepath.Join(os.TempDir(), "testify-repos")
	}
	if err := os.MkdirAll(cacheDir, 0o755); err != nil {
		return "", fmt.Errorf("repo cache dir: %w", err)
	}
	root := filepath.Join(cacheDir, cfg.ID)

	if _, err := os.Stat(filepath.Join(root, ".git")); err != nil {
		if _, err := s.runGitEnv(ctx, "", gitCredentialEnv(cfg), "clone", "--no-tags", "--single-branch", "--branch", branch, "--", remote, root); err != nil {
			return "", fmt.Errorf("repo clone: %w", err)
		}
	} else {
		if _, err := s.runGitEnv(ctx, root, gitCredentialEnv(cfg), "fetch", "--quiet", "origin", branch); err != nil {
			return "", fmt.Errorf("repo fetch: %w", err)
		}
		if _, err := s.runGitEnv(ctx, root, gitCredentialEnv(cfg), "checkout", "--quiet", branch); err != nil {
			return "", fmt.Errorf("repo checkout: %w", err)
		}
		if _, err := s.runGitEnv(ctx, root, gitCredentialEnv(cfg), "reset", "--quiet", "--hard", "origin/"+branch); err != nil {
			return "", fmt.Errorf("repo reset: %w", err)
		}
	}

	canonical, err := filepath.EvalSymlinks(root)
	if err != nil {
		return root, nil
	}
	return canonical, nil
}

// runGit runs `git -C root <args>` with the credential-free environment and
// returns combined output.
func (s *RepoService) runGit(ctx context.Context, root string, cfg *core.ProjectRepositoryConfig, args ...string) (string, error) {
	return s.runGitEnv(ctx, root, gitCredentialEnv(*cfg), args...)
}

func (s *RepoService) runGitEnv(ctx context.Context, root string, extraEnv []string, args ...string) (string, error) {
	cmdArgs := make([]string, 0, len(args)+2)
	if root != "" {
		cmdArgs = append(cmdArgs, "-C", root)
	}
	cmdArgs = append(cmdArgs, args...)
	cmd := exec.CommandContext(ctx, "git", cmdArgs...)
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	cmd.Env = append(cmd.Env, extraEnv...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return string(out), fmt.Errorf("git %s: %w", args[0], err)
	}
	return string(out), nil
}

// gitGrep treats `git grep` exit code 1 (valid search with no matches) as an
// empty result instead of an error.
func (s *RepoService) gitGrep(ctx context.Context, root string, cfg *core.ProjectRepositoryConfig, args ...string) (string, error) {
	out, err := s.runGit(ctx, root, cfg, args...)
	if err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) && exitErr.ExitCode() == 1 {
			return "", nil
		}
		return "", err
	}
	return out, nil
}

// gitCredentialEnv injects the Vault credential as a Basic auth git
// extra-header, mirroring the Node gitEnvironment. Returns nil when there is
// no credential.
func gitCredentialEnv(cfg core.ProjectRepositoryConfig) []string {
	if cfg.Credential == nil || *cfg.Credential == "" {
		return nil
	}
	auth := base64.StdEncoding.EncodeToString([]byte("x-access-token:" + *cfg.Credential))
	return []string{
		"GIT_CONFIG_COUNT=1",
		"GIT_CONFIG_KEY_0=http.extraHeader",
		"GIT_CONFIG_VALUE_0=Authorization: Basic " + auth,
	}
}

// safeRepoURL requires a credential-free HTTP(S) URL, mirroring the Node
// safeRemoteUrl guard.
func safeRepoURL(raw string) (string, error) {
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.User != nil {
		return "", fmt.Errorf("repo url: repository URL must be a credential-free HTTP(S) URL")
	}
	return u.String(), nil
}

// ---------------------------------------------------------------------------
// path scoping
// ---------------------------------------------------------------------------

// scopePath resolves a repository-relative request against the configured
// subdirectory and verifies it stays inside. mustExist=false additionally
// rejects non-existent paths (mirrors the Node behaviour for list/search).
func (s *RepoService) scopePath(root string, cfg *core.ProjectRepositoryConfig, requested string, mustExist bool) (string, error) {
	if strings.ContainsRune(requested, 0) || filepath.IsAbs(requested) {
		return "", fmt.Errorf("INVALID_PATH: path must be repository-relative")
	}
	configured, err := s.resolveUnder(root, cfg)
	if err != nil {
		return "", err
	}
	target, err := filepath.Abs(filepath.Join(configured, requested))
	if err != nil {
		return "", fmt.Errorf("INVALID_PATH: path must be repository-relative")
	}
	if err := assertContained(configured, target); err != nil {
		return "", err
	}

	if !mustExist {
		if _, err := os.Stat(target); err != nil {
			return "", fmt.Errorf("NOT_FOUND: repository path was not found — check the configured subdirectory and requested path")
		}
	}
	canonical, err := filepath.EvalSymlinks(target)
	if err != nil {
		canonical = target
	}
	if err := assertContained(configured, canonical); err != nil {
		return "", err
	}
	return canonical, nil
}

func (s *RepoService) resolveUnder(root string, cfg *core.ProjectRepositoryConfig) (string, error) {
	sub := "."
	if cfg.Subdirectory != nil && *cfg.Subdirectory != "" {
		sub = *cfg.Subdirectory
	}
	configured, err := filepath.Abs(filepath.Join(root, filepath.FromSlash(sub)))
	if err != nil {
		return "", fmt.Errorf("INVALID_PATH: path must be repository-relative")
	}
	if err := assertContained(root, configured); err != nil {
		return "", err
	}
	return configured, nil
}

// assertContained fails when child is not inside parent.
func assertContained(parent, child string) error {
	rel, err := filepath.Rel(parent, child)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) || filepath.IsAbs(rel) {
		return fmt.Errorf("INVALID_PATH: path escapes the repository scope — use a path under the configured repository subdirectory")
	}
	return nil
}

func (s *RepoService) gitPath(root, scope string) string {
	rel, err := filepath.Rel(root, scope)
	if err != nil {
		return "."
	}
	p := filepath.ToSlash(rel)
	if p == "" {
		return "."
	}
	return p
}

// ---------------------------------------------------------------------------
// validation helpers
// ---------------------------------------------------------------------------

func validateRepoLimit(n, def int) (int, error) {
	if n == 0 {
		n = def
	}
	if n < 1 || n > maxRepoResults {
		return 0, fmt.Errorf("INVALID_PAGINATION: limit must be between 1 and 100")
	}
	return n, nil
}

func assertRepoRevision(value, field string) error {
	if value == "" || strings.HasPrefix(value, "-") || len(value) > maxRepoRevisionLen || !repoRevisionPattern.MatchString(value) {
		return fmt.Errorf("INVALID_REVISION: %s is not a safe commit or tag — use a commit SHA, branch, or tag name", field)
	}
	return nil
}
