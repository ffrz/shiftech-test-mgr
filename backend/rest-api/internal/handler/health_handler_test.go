package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestHealthCheckDBDisconnected(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := &HealthHandler{DB: nil}
	err := h.Check(c)
	if err != nil {
		t.Fatalf("Check returned error: %v", err)
	}

	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("status code = %d, want %d", rec.Code, http.StatusServiceUnavailable)
	}

	var resp HealthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp.Status != "degraded" {
		t.Errorf("status = %q, want degraded", resp.Status)
	}
	if resp.DB != "disconnected" {
		t.Errorf("db = %q, want disconnected", resp.DB)
	}
	if resp.Timestamp == "" {
		t.Error("timestamp should not be empty")
	}
}

func TestHealthCheckResponseFields(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := &HealthHandler{DB: nil}
	if err := h.Check(c); err != nil {
		t.Fatalf("Check returned error: %v", err)
	}

	var resp HealthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	validStatuses := map[string]bool{"ok": true, "degraded": true}
	if !validStatuses[resp.Status] {
		t.Errorf("status = %q, must be ok or degraded", resp.Status)
	}

	validDB := map[string]bool{"connected": true, "disconnected": true}
	if !validDB[resp.DB] {
		t.Errorf("db = %q, must be connected or disconnected", resp.DB)
	}

	if resp.Timestamp == "" {
		t.Error("timestamp should not be empty")
	}
}
