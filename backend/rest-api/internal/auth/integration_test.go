package auth_test

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/shiftech/testify-platform/rest-api/internal/auth"
	"github.com/shiftech/testify-platform/rest-api/internal/testsupport"
)

// TestRequireAuth_RealSupabaseSession exercises RequireAuth against a
// genuine Supabase Auth session token — not a token this test process
// signs itself — closing the gap the unit tests in jwt_test.go can't:
// proof that VerifyToken's claim shape and signing algorithm actually
// match what Supabase issues in production, not just what this codebase
// assumes it issues.
//
// Skips (not fails) when SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/
// SUPABASE_ANON_KEY aren't configured — see testsupport/README.md. Needs
// live network access to the Supabase project (fetches the real JWKS
// document).
func TestRequireAuth_RealSupabaseSession(t *testing.T) {
	client, err := testsupport.NewClientFromEnv(os.Getenv)
	if err != nil {
		t.Skip(err)
	}
	keys := auth.NewJWKSFetcher(os.Getenv("SUPABASE_URL"))

	user, err := client.CreateTestUser()
	if err != nil {
		t.Fatalf("CreateTestUser: %v", err)
	}
	defer func() {
		if err := user.Cleanup(); err != nil {
			t.Errorf("Cleanup: %v", err)
		}
	}()

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+user.AccessToken)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	var gotUserID string
	h := auth.RequireAuth(keys)(func(c echo.Context) error {
		gotUserID = auth.UserID(c)
		return c.String(http.StatusOK, "ok")
	})
	if err := h(c); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body: %s)", rec.Code, rec.Body.String())
	}
	if gotUserID != user.ID {
		t.Errorf("resolved user id = %q, want %q", gotUserID, user.ID)
	}
}
