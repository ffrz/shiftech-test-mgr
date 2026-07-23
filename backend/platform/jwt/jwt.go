// Package jwt issues and verifies the stateless access token described in
// plan §5. Refresh tokens are NOT JWTs — they are opaque random strings
// whose hash is stored in refresh_tokens (see internal/service/auth), so
// they can be revoked server-side; this package only deals with the
// short-lived access token half.
package jwt

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/shiftech/testmgr-backend/internal/domain/user"
)

var (
	ErrInvalidToken = errors.New("jwt: invalid or expired token")
)

type Claims struct {
	UserID string    `json:"sub"`
	Email  string    `json:"email"`
	Role   user.Role `json:"role"`
	jwt.RegisteredClaims
}

type Service struct {
	secret    []byte
	accessTTL time.Duration
}

func NewService(secret string, accessTTL time.Duration) *Service {
	return &Service{secret: []byte(secret), accessTTL: accessTTL}
}

// IssueAccessToken signs a short-lived JWT carrying user id/email/role.
// Role is embedded here ONLY for coarse checks (e.g. quick UI hints) — the
// authoritative RequireApproved/RBAC checks re-verify against the DB where
// it matters (see plan §5b), so a stale role in an old token can't grant
// access it shouldn't.
func (s *Service) IssueAccessToken(p user.Profile) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID: p.ID,
		Email:  p.Email,
		Role:   p.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.accessTTL)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}

// Verify checks signature and expiry only — no DB round trip. Callers that
// need up-to-date approval/role status (which can change server-side before
// the token expires) must re-check against the DB; this function alone is
// only proof of "who signed in", not "who is still allowed in".
func (s *Service) Verify(rawToken string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(rawToken, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return s.secret, nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

// NewRefreshToken generates a random opaque token (returned to the client)
// and its SHA-256 hash (what actually gets stored in refresh_tokens) — the
// raw value is never persisted, mirroring how you'd never store a plaintext
// password.
func NewRefreshToken() (raw string, hash string, err error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", "", err
	}
	raw = hex.EncodeToString(buf)
	return raw, HashRefreshToken(raw), nil
}

func HashRefreshToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
