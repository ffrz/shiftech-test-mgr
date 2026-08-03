# testsupport

Provisions disposable Supabase Auth users for automated REST API tests, so
tests never need to drive a real Google OAuth consent screen.

`Client.CreateTestUser()` creates a user directly via the Supabase Admin API
(`POST /auth/v1/admin/users`, `email_confirm: true`) and exchanges it for a
real session access token (`POST /auth/v1/token?grant_type=password`). The
same `handle_new_user()` trigger that fires for a real Google sign-in also
fires here, so the resulting `users`/`profiles` rows — and the token itself
— are indistinguishable from a real logged-in user's as far as
`rest-api/internal/auth` and RLS are concerned.

## Env vars

| Var | Where to find it | Notes |
|---|---|---|
| `SUPABASE_URL` | Dashboard → Project Settings → API → Project URL | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Project Settings → API → Project API keys → `service_role` (click Reveal) | **Bypasses RLS entirely.** Only ever goes in `backend/.env` (gitignored), never the frontend, never committed, never logged. |
| `SUPABASE_ANON_KEY` | Same page → `anon` `public` | Same key the frontend already ships — used here only for the password-grant token exchange. |

Tests that need a real session (`*_integration_test.go`, or any test calling
`testsupport.NewClientFromEnv`) skip themselves with `t.Skip` when these
vars are unset, so `go test ./...` stays green in an environment that
doesn't have them configured (CI without secrets, a contributor's first
`git clone`, etc).

## Usage

```go
func TestSomethingThatNeedsARealSession(t *testing.T) {
	client, err := testsupport.NewClientFromEnv(os.Getenv)
	if err != nil {
		t.Skip(err) // no Supabase admin creds configured — skip, don't fail
	}
	user, err := client.CreateTestUser()
	if err != nil {
		t.Fatalf("CreateTestUser: %v", err)
	}
	defer user.Cleanup()

	// user.AccessToken is a real Supabase JWT — use it exactly like a
	// frontend request would: Authorization: Bearer <user.AccessToken>
}
```

## What this is *not*

This is not a new login method for the product. `CLAUDE.md` §Auth & RBAC is
unambiguous: Testify signup/login is Google OAuth only. `testsupport` never
runs outside of test binaries, is never imported by `cmd/main.go`, and the
users it creates have throwaway `@example.invalid` emails that could never
receive a real Google OAuth callback.
