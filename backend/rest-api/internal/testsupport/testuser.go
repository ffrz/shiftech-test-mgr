// Package testsupport provisions disposable Supabase Auth users for
// automated REST API tests, so tests never need to drive a real Google
// OAuth consent screen. It uses the Supabase Admin API (service_role key)
// to create a user directly in auth.users — the same handle_new_user()
// trigger that fires for a real Google sign-in also fires here, so the
// resulting users/profiles rows are indistinguishable from a real user's.
// The access token it returns is a genuine Supabase session JWT, verified
// by rest-api/internal/auth the same way as any other session.
//
// Never used outside of tests: it requires SUPABASE_SERVICE_ROLE_KEY, a
// credential that bypasses RLS entirely and must never be embedded in the
// running server or the frontend.
package testsupport

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// TestUser is a disposable Supabase Auth user created for one test. Call
// Cleanup (or defer it) to delete the user afterward — nothing expires
// these automatically.
type TestUser struct {
	ID          string
	Email       string
	AccessToken string

	client *Client
}

// Client talks to the Supabase Admin API. Construct with NewClientFromEnv in
// most tests; the fields are exported so a test can point it at a different
// project if ever needed.
type Client struct {
	// BaseURL is the Supabase project URL, e.g. https://xxxx.supabase.co
	// (SUPABASE_URL).
	BaseURL string
	// ServiceRoleKey is the service_role secret (SUPABASE_SERVICE_ROLE_KEY)
	// — bypasses RLS, admin-only, never exposed to the frontend.
	ServiceRoleKey string
	// AnonKey is the anon/public key (SUPABASE_ANON_KEY) — required by the
	// password grant token endpoint, same key the frontend already ships.
	AnonKey string

	httpClient *http.Client
}

// NewClientFromEnv builds a Client from SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// and SUPABASE_ANON_KEY. Returns an error naming the missing variable(s) so a
// misconfigured test environment fails fast with a clear message instead of
// a confusing HTTP error deep in CreateTestUser.
func NewClientFromEnv(getenv func(string) string) (*Client, error) {
	baseURL := getenv("SUPABASE_URL")
	serviceRoleKey := getenv("SUPABASE_SERVICE_ROLE_KEY")
	anonKey := getenv("SUPABASE_ANON_KEY")

	var missing []string
	if baseURL == "" {
		missing = append(missing, "SUPABASE_URL")
	}
	if serviceRoleKey == "" {
		missing = append(missing, "SUPABASE_SERVICE_ROLE_KEY")
	}
	if anonKey == "" {
		missing = append(missing, "SUPABASE_ANON_KEY")
	}
	if len(missing) > 0 {
		return nil, fmt.Errorf("testsupport: missing env var(s): %v (see backend/rest-api/internal/testsupport/README.md)", missing)
	}

	return &Client{
		BaseURL:        baseURL,
		ServiceRoleKey: serviceRoleKey,
		AnonKey:        anonKey,
		httpClient:     &http.Client{Timeout: 15 * time.Second},
	}, nil
}

// CreateTestUser provisions a new, pre-confirmed Supabase Auth user with a
// random email/password and exchanges it for a real session access token.
// The email is confirmed at creation time (email_confirm: true) so no
// verification step is needed. Call Cleanup when done.
func (c *Client) CreateTestUser() (*TestUser, error) {
	email := fmt.Sprintf("testsupport+%d@example.invalid", time.Now().UnixNano())
	password := randomPassword()

	userID, err := c.adminCreateUser(email, password)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	token, err := c.passwordGrantToken(email, password)
	if err != nil {
		// Best-effort cleanup — the user was created but we couldn't get a
		// session for it, so don't leave it behind for a human to notice later.
		_ = c.adminDeleteUser(userID)
		return nil, fmt.Errorf("sign in test user: %w", err)
	}

	return &TestUser{ID: userID, Email: email, AccessToken: token, client: c}, nil
}

// Cleanup deletes the test user from auth.users. The ON DELETE CASCADE on
// users/profiles (see supabase/migrations — profiles.id references users.id
// references auth.users.id) takes the rest of the row graph with it.
func (u *TestUser) Cleanup() error {
	return u.client.adminDeleteUser(u.ID)
}

func (c *Client) adminCreateUser(email, password string) (string, error) {
	body, _ := json.Marshal(map[string]any{
		"email":         email,
		"password":      password,
		"email_confirm": true,
	})
	req, err := http.NewRequest(http.MethodPost, c.BaseURL+"/auth/v1/admin/users", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	c.setAdminHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("admin create user: status %d: %s", resp.StatusCode, respBody)
	}

	var parsed struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("parse create user response: %w", err)
	}
	if parsed.ID == "" {
		return "", fmt.Errorf("create user response had no id: %s", respBody)
	}
	return parsed.ID, nil
}

func (c *Client) passwordGrantToken(email, password string) (string, error) {
	body, _ := json.Marshal(map[string]any{
		"email":    email,
		"password": password,
	})
	req, err := http.NewRequest(http.MethodPost, c.BaseURL+"/auth/v1/token?grant_type=password", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", c.AnonKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("password grant: status %d: %s", resp.StatusCode, respBody)
	}

	var parsed struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("parse token response: %w", err)
	}
	if parsed.AccessToken == "" {
		return "", fmt.Errorf("token response had no access_token: %s", respBody)
	}
	return parsed.AccessToken, nil
}

func (c *Client) adminDeleteUser(userID string) error {
	req, err := http.NewRequest(http.MethodDelete, c.BaseURL+"/auth/v1/admin/users/"+userID, nil)
	if err != nil {
		return err
	}
	c.setAdminHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("admin delete user: status %d: %s", resp.StatusCode, respBody)
	}
	return nil
}

func (c *Client) setAdminHeaders(req *http.Request) {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", c.ServiceRoleKey)
	req.Header.Set("Authorization", "Bearer "+c.ServiceRoleKey)
}

// randomPassword returns a password meeting Supabase Auth's minimum
// requirements. It never needs to be remembered — the token is exchanged
// once, immediately, in CreateTestUser.
func randomPassword() string {
	return fmt.Sprintf("Testsupport-%d-!Aa", time.Now().UnixNano())
}
