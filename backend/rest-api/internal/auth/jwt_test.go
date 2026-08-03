package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func signToken(t *testing.T, secret string, claims jwt.Claims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return signed
}

func TestVerifyToken_ValidToken(t *testing.T) {
	secret := "test-secret"
	raw := signToken(t, secret, &Claims{RegisteredClaims: jwt.RegisteredClaims{
		Subject:   "11111111-1111-1111-1111-111111111111",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}})

	userID, err := VerifyToken(raw, secret)
	if err != nil {
		t.Fatalf("VerifyToken: %v", err)
	}
	if userID != "11111111-1111-1111-1111-111111111111" {
		t.Errorf("userID = %q", userID)
	}
}

func TestVerifyToken_WrongSecret(t *testing.T) {
	raw := signToken(t, "correct-secret", &Claims{RegisteredClaims: jwt.RegisteredClaims{
		Subject:   "user1",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}})

	if _, err := VerifyToken(raw, "wrong-secret"); err == nil {
		t.Error("expected error for wrong secret")
	}
}

func TestVerifyToken_Expired(t *testing.T) {
	secret := "test-secret"
	raw := signToken(t, secret, &Claims{RegisteredClaims: jwt.RegisteredClaims{
		Subject:   "user1",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)),
	}})

	if _, err := VerifyToken(raw, secret); err == nil {
		t.Error("expected error for expired token")
	}
}

func TestVerifyToken_EmptyToken(t *testing.T) {
	if _, err := VerifyToken("", "secret"); err == nil {
		t.Error("expected error for empty token")
	}
}

func TestVerifyToken_EmptySecret(t *testing.T) {
	raw := signToken(t, "whatever", &Claims{RegisteredClaims: jwt.RegisteredClaims{Subject: "user1"}})
	if _, err := VerifyToken(raw, ""); err == nil {
		t.Error("expected error when SUPABASE_JWT_SECRET is not configured")
	}
}

func TestVerifyToken_NoSubject(t *testing.T) {
	secret := "test-secret"
	raw := signToken(t, secret, &Claims{RegisteredClaims: jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}})
	if _, err := VerifyToken(raw, secret); err == nil {
		t.Error("expected error for token with no subject")
	}
}

func TestVerifyToken_RejectsAlgNone(t *testing.T) {
	// "alg: none" is the classic JWT bypass — a token with no signature that
	// naive verifiers accept because they only check the claims, not the
	// algorithm. jwt.WithValidMethods([]string{"HS256"}) in VerifyToken must
	// reject this outright.
	token := jwt.NewWithClaims(jwt.SigningMethodNone, &Claims{RegisteredClaims: jwt.RegisteredClaims{
		Subject:   "attacker",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}})
	raw, err := token.SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatalf("sign alg=none token: %v", err)
	}
	if _, err := VerifyToken(raw, "test-secret"); err == nil {
		t.Error("expected VerifyToken to reject an alg=none token")
	}
}
