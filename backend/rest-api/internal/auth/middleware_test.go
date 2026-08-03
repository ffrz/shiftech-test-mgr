package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

func okHandler(c echo.Context) error {
	return c.String(http.StatusOK, "ok")
}

func TestRequireAuth_MissingHeader(t *testing.T) {
	keys, _, _ := testJWKS(t)
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := RequireAuth(keys)(okHandler)
	if err := h(c); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", rec.Code)
	}
}

func TestRequireAuth_InvalidToken(t *testing.T) {
	keys, _, _ := testJWKS(t)
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer not-a-jwt")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := RequireAuth(keys)(okHandler)
	if err := h(c); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", rec.Code)
	}
}

func TestRequireAuth_ValidToken_SetsUserID(t *testing.T) {
	keys, priv, kid := testJWKS(t)
	raw := signToken(t, priv, kid, &Claims{RegisteredClaims: jwt.RegisteredClaims{
		Subject:   "user-123",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}})

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+raw)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	var capturedUserID string
	h := RequireAuth(keys)(func(c echo.Context) error {
		capturedUserID = UserID(c)
		return c.String(http.StatusOK, "ok")
	})
	if err := h(c); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if capturedUserID != "user-123" {
		t.Errorf("UserID = %q, want user-123", capturedUserID)
	}
}

func TestRequireProjectAccess_NoUserID(t *testing.T) {
	db := newTestDB(t)
	repo := NewAccessRepository(db)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("project_id")
	c.SetParamValues("proj1")

	h := RequireProjectAccess(repo, RoleMember)(okHandler)
	if err := h(c); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", rec.Code)
	}
}

func TestRequireProjectAccess_NoMembership(t *testing.T) {
	db := newTestDB(t)
	repo := NewAccessRepository(db)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set(contextUserIDKey, "user1")
	c.SetParamNames("project_id")
	c.SetParamValues("proj1")

	h := RequireProjectAccess(repo, RoleMember)(okHandler)
	if err := h(c); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", rec.Code)
	}
}

func TestRequireProjectAccess_InsufficientRole(t *testing.T) {
	db := newTestDB(t)
	seedMember(t, db, projectMemberRow{ProjectID: "proj1", UserID: "user1", Role: "member", Status: "accepted"})
	repo := NewAccessRepository(db)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set(contextUserIDKey, "user1")
	c.SetParamNames("project_id")
	c.SetParamValues("proj1")

	h := RequireProjectAccess(repo, RoleManager)(okHandler)
	if err := h(c); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", rec.Code)
	}
}

func TestRequireProjectAccess_SufficientRole(t *testing.T) {
	db := newTestDB(t)
	seedMember(t, db, projectMemberRow{ProjectID: "proj1", UserID: "user1", Role: "manager", Status: "accepted"})
	repo := NewAccessRepository(db)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set(contextUserIDKey, "user1")
	c.SetParamNames("project_id")
	c.SetParamValues("proj1")

	h := RequireProjectAccess(repo, RoleManager)(okHandler)
	if err := h(c); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
}

func TestRequireProjectAccess_FallsBackToIDParam(t *testing.T) {
	// Routes where the project itself is the resource (e.g. GET /projects/:id)
	// don't have a :project_id param — RequireProjectAccess must fall back to :id.
	db := newTestDB(t)
	seedMember(t, db, projectMemberRow{ProjectID: "proj1", UserID: "user1", Role: "member", Status: "accepted"})
	repo := NewAccessRepository(db)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set(contextUserIDKey, "user1")
	c.SetParamNames("id")
	c.SetParamValues("proj1")

	h := RequireProjectAccess(repo, RoleMember)(okHandler)
	if err := h(c); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
}
