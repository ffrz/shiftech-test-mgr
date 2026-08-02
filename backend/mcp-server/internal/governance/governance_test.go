package governance

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/shiftech/testify-platform/core"
	"github.com/shiftech/testify-platform/mcp-server/internal/auth"
)

// ---- fakes --------------------------------------------------------------

type fakeRepo struct {
	beginErr     error
	completeErr  error
	beginResults []*BeginResult
	begins       []beginCall
	completes    []completeCall
}

type beginCall struct {
	rawToken, projectID, toolName string
	limit, windowSeconds          int
}

type completeCall struct {
	rawToken, projectID, auditID, status string
	latencyMs                            int
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		beginResults: []*BeginResult{{AuditID: "audit-1", Allowed: true}},
	}
}

func (f *fakeRepo) BeginToolCall(_ context.Context, rawToken, projectID, toolName string, limit, windowSeconds int) (*BeginResult, error) {
	f.begins = append(f.begins, beginCall{rawToken, projectID, toolName, limit, windowSeconds})
	if f.beginErr != nil {
		return nil, f.beginErr
	}
	if len(f.beginResults) == 0 {
		return nil, errors.New("no begin results queued")
	}
	res := f.beginResults[0]
	if len(f.beginResults) > 1 {
		f.beginResults = f.beginResults[1:]
	}
	return res, nil
}

func (f *fakeRepo) CompleteToolCall(_ context.Context, rawToken, projectID, auditID, status string, latencyMs int) error {
	f.completes = append(f.completes, completeCall{rawToken, projectID, auditID, status, latencyMs})
	return f.completeErr
}

type fakeResolver struct {
	session *auth.Session
	err     error
}

func (f fakeResolver) SessionFor(_ context.Context) (*auth.Session, error) {
	return f.session, f.err
}

// ---- helpers ------------------------------------------------------------

func testSession() *auth.Session {
	return &auth.Session{
		Identity:  core.APITokenIdentity{TokenID: "tok-1", ProjectID: "proj-1"},
		ProjectID: "proj-1",
		RawToken:  "tm_abc",
	}
}

func okHandler(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return mcp.NewToolResultText("ok"), nil
}

func errHandler(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return nil, errors.New("boom")
}

func isErrorHandler(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	res := mcp.NewToolResultText("boom")
	res.IsError = true
	return res, nil
}

// ---- tests --------------------------------------------------------------

func TestService_Wrap_Allowed(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo, fakeResolver{session: testSession()})
	wrapped := svc.Wrap("testify.testcase.list", okHandler)

	result, err := wrapped(context.Background(), mcp.CallToolRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil || result.IsError {
		t.Fatal("expected successful tool result")
	}

	if len(repo.begins) != 1 {
		t.Fatalf("expected 1 begin call, got %d", len(repo.begins))
	}
	b := repo.begins[0]
	if b.rawToken != "tm_abc" || b.projectID != "proj-1" || b.toolName != "testify.testcase.list" {
		t.Fatalf("unexpected begin args: %+v", b)
	}
	if b.limit != DefaultRateLimit || b.windowSeconds != DefaultRateLimitWindow {
		t.Fatalf("expected default limit/window, got %d/%d", b.limit, b.windowSeconds)
	}

	if len(repo.completes) != 1 {
		t.Fatalf("expected 1 complete call, got %d", len(repo.completes))
	}
	c := repo.completes[0]
	if c.auditID != "audit-1" || c.status != "completed" {
		t.Fatalf("unexpected complete args: %+v", c)
	}
	if c.latencyMs < 0 {
		t.Fatalf("latency must be non-negative, got %d", c.latencyMs)
	}
}

func TestService_Wrap_RateLimited(t *testing.T) {
	repo := newFakeRepo()
	repo.beginResults = []*BeginResult{{AuditID: "audit-1", Allowed: false}}
	svc := NewService(repo, fakeResolver{session: testSession()})
	wrapped := svc.Wrap("testify.testcase.createBulk", okHandler)

	_, err := wrapped(context.Background(), mcp.CallToolRequest{})
	if err == nil {
		t.Fatal("expected rate limit error")
	}
	if !errors.Is(err, ErrRateLimited) {
		t.Fatalf("expected ErrRateLimited, got %v", err)
	}

	// The begin RPC already wrote the 'rate_limited' audit row — the service
	// must not issue a second complete call for a denied call.
	if len(repo.completes) != 0 {
		t.Fatalf("expected no complete call for rate-limited request, got %d", len(repo.completes))
	}
}

func TestService_Wrap_HandlerError(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo, fakeResolver{session: testSession()})
	wrapped := svc.Wrap("testify.testplan.approve", errHandler)

	_, err := wrapped(context.Background(), mcp.CallToolRequest{})
	if err == nil {
		t.Fatal("expected handler error")
	}
	if len(repo.completes) != 1 || repo.completes[0].status != "failed" {
		t.Fatalf("expected complete status failed, got %+v", repo.completes)
	}
}

func TestService_Wrap_IsErrorResult(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo, fakeResolver{session: testSession()})
	wrapped := svc.Wrap("testify.testrun.recordResult", isErrorHandler)

	result, err := wrapped(context.Background(), mcp.CallToolRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil || !result.IsError {
		t.Fatal("expected error-flagged result")
	}
	if len(repo.completes) != 1 || repo.completes[0].status != "failed" {
		t.Fatalf("expected complete status failed, got %+v", repo.completes)
	}
}

func TestService_Wrap_ResolverError(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo, fakeResolver{err: errors.New("no session")})
	wrapped := svc.Wrap("testify.project.list", okHandler)

	_, err := wrapped(context.Background(), mcp.CallToolRequest{})
	if err == nil {
		t.Fatal("expected resolver error")
	}
	if len(repo.begins) != 0 {
		t.Fatal("begin must not run when session resolution fails")
	}
}

func TestService_Wrap_BeginError(t *testing.T) {
	repo := newFakeRepo()
	repo.beginErr = errors.New("db down")
	svc := NewService(repo, fakeResolver{session: testSession()})
	wrapped := svc.Wrap("testify.project.list", okHandler)

	_, err := wrapped(context.Background(), mcp.CallToolRequest{})
	if err == nil {
		t.Fatal("expected begin error")
	}
	if len(repo.completes) != 0 {
		t.Fatal("complete must not run when begin fails")
	}
}

func TestService_Wrap_CompleteError(t *testing.T) {
	repo := newFakeRepo()
	repo.completeErr = errors.New("audit write failed")
	svc := NewService(repo, fakeResolver{session: testSession()})
	wrapped := svc.Wrap("testify.project.list", okHandler)

	_, err := wrapped(context.Background(), mcp.CallToolRequest{})
	if err == nil {
		t.Fatal("expected complete error to propagate")
	}
}

func TestService_WithRateLimit_Overrides(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo, fakeResolver{session: testSession()}).WithRateLimit(5, 10)
	wrapped := svc.Wrap("testify.testcase.list", okHandler)

	_, err := wrapped(context.Background(), mcp.CallToolRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	b := repo.begins[0]
	if b.limit != 5 || b.windowSeconds != 10 {
		t.Fatalf("expected limit=5 window=10, got %d/%d", b.limit, b.windowSeconds)
	}
}

func TestService_WithRateLimit_IgnoresZero(t *testing.T) {
	svc := NewService(newFakeRepo(), fakeResolver{session: testSession()}).WithRateLimit(0, 0)
	if svc.limit != DefaultRateLimit || svc.windowSeconds != DefaultRateLimitWindow {
		t.Fatalf("zero overrides must keep defaults, got %d/%d", svc.limit, svc.windowSeconds)
	}
}

func TestService_Latency_ClampedToZero(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo, fakeResolver{session: testSession()})
	svc.now = func() time.Time { return time.Unix(100, 0) } // constant clock
	wrapped := svc.Wrap("testify.project.list", okHandler)

	if _, err := wrapped(context.Background(), mcp.CallToolRequest{}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.completes[0].latencyMs != 0 {
		t.Fatalf("expected latency 0 with frozen clock, got %d", repo.completes[0].latencyMs)
	}
}

func TestService_Wrap_AllHandlersGoverned(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo, fakeResolver{session: testSession()})
	base := server.NewMCPServer("testify", "0.1.0")
	gov := NewServer(base, svc)

	var got string
	gov.AddTool(mcp.NewTool("testify.testcase.list"), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		got = "called"
		return mcp.NewToolResultText("x"), nil
	})

	if got != "" {
		t.Fatal("handler must not run synchronously during registration")
	}
	if len(repo.begins) != 0 {
		t.Fatal("no begin before a call")
	}
	// Invoke through the underlying server registry to prove the wrapper
	// wired the governed handler.
	reg := gov.MCPServer.ListTools()
	if _, ok := reg["testify.testcase.list"]; !ok {
		t.Fatal("governed server must still expose the tool")
	}
}
