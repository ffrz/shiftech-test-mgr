package auth

import (
	"errors"
	"fmt"

	"github.com/golang-jwt/jwt/v5"
)

// Claims is the subset of a Supabase Auth JWT this API cares about. Supabase
// signs the access token with HS256 using the project's JWT secret
// (SUPABASE_JWT_SECRET) — this is the legacy shared-secret scheme, supported
// by every Supabase project regardless of whether JWKS/RS256 is also
// enabled. "sub" is the auth.users UUID, which is the same UUID as
// public.users(id)/public.profiles(id) in this schema (CLAUDE.md §Auth & RBAC).
type Claims struct {
	jwt.RegisteredClaims
}

// UserID returns the authenticated user's UUID (the JWT "sub" claim).
func (c Claims) UserID() string {
	return c.Subject
}

// VerifyToken parses and validates a Supabase Auth access token against the
// project's JWT secret. Returns the authenticated user's UUID on success.
func VerifyToken(rawToken, secret string) (string, error) {
	if rawToken == "" {
		return "", errors.New("token is empty")
	}
	if secret == "" {
		return "", errors.New("SUPABASE_JWT_SECRET is not configured")
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(rawToken, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil {
		return "", fmt.Errorf("verify token: %w", err)
	}
	if !token.Valid {
		return "", errors.New("token is invalid")
	}
	if claims.UserID() == "" {
		return "", errors.New("token has no subject (user id)")
	}
	return claims.UserID(), nil
}
