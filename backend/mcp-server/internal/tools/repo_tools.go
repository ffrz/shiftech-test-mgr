package tools

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
)

// RepoTools exposes the project repository context (TASKS.md T5.5). Ported
// from repoTools.ts. All four tools are read-only, session-scoped, and operate
// against a local git checkout of the configured repository.
type RepoTools struct {
	reg *Registry
}

func (t *RepoTools) Name() string { return "repo" }

func (t *RepoTools) Register(s ToolAdder) error {
	s.AddTool(mcp.NewTool("testify.repo.list_files",
		mcp.WithDescription("List files under the configured repository scope. Returns at most 100 repository-relative paths."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("repository_id", mcp.Description("Project repository UUID"), mcp.Required()),
		mcp.WithString("path", mcp.Description("Repository-relative directory; empty for the configured scope root")),
		mcp.WithNumber("limit", mcp.Description("Maximum files, default 100"), mcp.Min(1), mcp.Max(100)),
	), t.listFiles)
	s.AddTool(mcp.NewTool("testify.repo.read_file",
		mcp.WithDescription("Read one text source file (up to 128 KiB) from the configured repository scope."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("repository_id", mcp.Description("Project repository UUID"), mcp.Required()),
		mcp.WithString("path", mcp.Description("Repository-relative file path"), mcp.Required()),
	), t.readFile)
	s.AddTool(mcp.NewTool("testify.repo.search",
		mcp.WithDescription("Literal text search over tracked files (git grep) inside the repository scope. At most 100 matches."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("repository_id", mcp.Description("Project repository UUID"), mcp.Required()),
		mcp.WithString("query", mcp.Description("Literal string, single line, at most 500 characters"), mcp.Required()),
		mcp.WithString("path", mcp.Description("Repository-relative directory to constrain the search; empty for the whole scope")),
		mcp.WithNumber("limit", mcp.Description("Maximum matches, default 50"), mcp.Min(1), mcp.Max(100)),
	), t.search)
	s.AddTool(mcp.NewTool("testify.repo.diff",
		mcp.WithDescription("Diff between two revisions inside the repository scope (base..head). Patch is truncated at 192 KiB."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("repository_id", mcp.Description("Project repository UUID"), mcp.Required()),
		mcp.WithString("base", mcp.Description("Base commit, branch, or tag (e.g. the merge base)"), mcp.Required()),
		mcp.WithString("head", mcp.Description("Head revision, default HEAD")),
		mcp.WithString("path", mcp.Description("Repository-relative directory to constrain the diff; empty for the whole scope")),
	), t.diff)

	return nil
}

func (t *RepoTools) listFiles(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	repositoryID, err := req.RequireString("repository_id")
	if err != nil || !isUUID(repositoryID) {
		return mcp.NewToolResultError("repository_id must be a valid UUID"), nil
	}

	result, err := t.reg.Services.Repo.ListFiles(
		ctx,
		session.ProjectID,
		repositoryID,
		req.GetString("path", ""),
		req.GetInt("limit", 100),
	)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(result, fmt.Sprintf("%d file(s) under scope", len(result.Files))), nil
}

func (t *RepoTools) readFile(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	repositoryID, err := req.RequireString("repository_id")
	if err != nil || !isUUID(repositoryID) {
		return mcp.NewToolResultError("repository_id must be a valid UUID"), nil
	}
	path, err := req.RequireString("path")
	if err != nil {
		return mcp.NewToolResultError("path is required"), nil
	}

	result, err := t.reg.Services.Repo.ReadFile(ctx, session.ProjectID, repositoryID, path)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(result, fmt.Sprintf("%d bytes read", result.Bytes)), nil
}

func (t *RepoTools) search(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	repositoryID, err := req.RequireString("repository_id")
	if err != nil || !isUUID(repositoryID) {
		return mcp.NewToolResultError("repository_id must be a valid UUID"), nil
	}
	query, err := req.RequireString("query")
	if err != nil {
		return mcp.NewToolResultError("query is required"), nil
	}

	result, err := t.reg.Services.Repo.Search(
		ctx,
		session.ProjectID,
		repositoryID,
		query,
		req.GetString("path", ""),
		req.GetInt("limit", 50),
	)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(result, fmt.Sprintf("%d match(es) found", len(result.Matches))), nil
}

func (t *RepoTools) diff(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	repositoryID, err := req.RequireString("repository_id")
	if err != nil || !isUUID(repositoryID) {
		return mcp.NewToolResultError("repository_id must be a valid UUID"), nil
	}
	base, err := req.RequireString("base")
	if err != nil {
		return mcp.NewToolResultError("base is required"), nil
	}

	result, err := t.reg.Services.Repo.Diff(
		ctx,
		session.ProjectID,
		repositoryID,
		base,
		req.GetString("head", ""),
		req.GetString("path", ""),
	)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(result, fmt.Sprintf("%d changed file(s)", len(result.Files))), nil
}
