package auth

import (
	"errors"
	"fmt"

	"github.com/golang-jwt/jwt/v5"
)

// Claims is the subset of a Supabase Auth JWT this API cares about. "sub" is
// the auth.users UUID, which is the same UUID as public.users(id)/
// public.profiles(id) in this schema (CLAUDE.md §Auth & RBAC).
type Claims struct {
	jwt.RegisteredClaims
}

// UserID returns the authenticated user's UUID (the JWT "sub" claim).
func (c Claims) UserID() string {
	return c.Subject
}

// VerifyToken parses and validates a Supabase Auth access token against this
// project's published signing keys, and returns the authenticated user's
// UUID on success.
//
// This project's Supabase instance signs with ES256 against the new
// asymmetric signing-keys system (verified by fetching
// {SUPABASE_URL}/auth/v1/.well-known/jwks.json — confirmed empirically:
// the legacy HS256 SUPABASE_JWT_SECRET rejects real tokens with "signing
// method ES256 is invalid"). Every Supabase project publishes this endpoint
// once ES256/JWKS is enabled, and it needs no secret to query — the
// keys are public by design, only the private signing key is not.
func VerifyToken(rawToken string, keys *JWKSFetcher) (string, error) {
	if rawToken == "" {
		return "", errors.New("token is empty")
	}
	if keys == nil {
		return "", errors.New("JWKS fetcher is not configured")
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(rawToken, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodECDSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		kid, _ := t.Header["kid"].(string)
		if kid == "" {
			return nil, errors.New("token header has no kid")
		}
		return keys.PublicKey(kid)
	}, jwt.WithValidMethods([]string{"ES256"}))
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
