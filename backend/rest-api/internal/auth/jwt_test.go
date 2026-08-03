package auth

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// testJWKS spins up an httptest.Server serving a JWKS document for one
// freshly generated EC P-256 key, and returns a JWKSFetcher pointed at it
// plus the private key to sign test tokens with. Mirrors the real shape at
// {SUPABASE_URL}/auth/v1/.well-known/jwks.json (see jwks.go doc comment for
// why ES256/JWKS rather than the legacy HS256 shared-secret scheme).
func testJWKS(t *testing.T) (*JWKSFetcher, *ecdsa.PrivateKey, string) {
	t.Helper()
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	kid := "test-kid-1"

	doc := jwksResponse{Keys: []jwk{{
		Kty: "EC",
		Crv: "P-256",
		Kid: kid,
		Alg: "ES256",
		X:   base64.RawURLEncoding.EncodeToString(priv.PublicKey.X.Bytes()),
		Y:   base64.RawURLEncoding.EncodeToString(priv.PublicKey.Y.Bytes()),
	}}}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(doc)
	}))
	t.Cleanup(srv.Close)

	fetcher := &JWKSFetcher{
		url:        srv.URL,
		httpClient: srv.Client(),
		ttl:        time.Minute,
	}
	return fetcher, priv, kid
}

func signToken(t *testing.T, priv *ecdsa.PrivateKey, kid string, claims jwt.Claims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["kid"] = kid
	signed, err := token.SignedString(priv)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return signed
}

func TestVerifyToken_ValidToken(t *testing.T) {
	keys, priv, kid := testJWKS(t)
	raw := signToken(t, priv, kid, &Claims{RegisteredClaims: jwt.RegisteredClaims{
		Subject:   "11111111-1111-1111-1111-111111111111",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}})

	userID, err := VerifyToken(raw, keys)
	if err != nil {
		t.Fatalf("VerifyToken: %v", err)
	}
	if userID != "11111111-1111-1111-1111-111111111111" {
		t.Errorf("userID = %q", userID)
	}
}

func TestVerifyToken_WrongKey(t *testing.T) {
	// Signed by a different key than the one JWKS serves — simulates a
	// forged or stale token.
	keys, _, kid := testJWKS(t)
	otherPriv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	raw := signToken(t, otherPriv, kid, &Claims{RegisteredClaims: jwt.RegisteredClaims{
		Subject:   "user1",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}})

	if _, err := VerifyToken(raw, keys); err == nil {
		t.Error("expected error for token signed by an untrusted key")
	}
}

func TestVerifyToken_UnknownKid(t *testing.T) {
	keys, priv, _ := testJWKS(t)
	raw := signToken(t, priv, "not-the-real-kid", &Claims{RegisteredClaims: jwt.RegisteredClaims{
		Subject:   "user1",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}})

	if _, err := VerifyToken(raw, keys); err == nil {
		t.Error("expected error for unknown kid")
	}
}

func TestVerifyToken_Expired(t *testing.T) {
	keys, priv, kid := testJWKS(t)
	raw := signToken(t, priv, kid, &Claims{RegisteredClaims: jwt.RegisteredClaims{
		Subject:   "user1",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)),
	}})

	if _, err := VerifyToken(raw, keys); err == nil {
		t.Error("expected error for expired token")
	}
}

func TestVerifyToken_EmptyToken(t *testing.T) {
	keys, _, _ := testJWKS(t)
	if _, err := VerifyToken("", keys); err == nil {
		t.Error("expected error for empty token")
	}
}

func TestVerifyToken_NilFetcher(t *testing.T) {
	_, priv, kid := testJWKS(t)
	raw := signToken(t, priv, kid, &Claims{RegisteredClaims: jwt.RegisteredClaims{Subject: "user1"}})
	if _, err := VerifyToken(raw, nil); err == nil {
		t.Error("expected error when JWKS fetcher is not configured")
	}
}

func TestVerifyToken_NoSubject(t *testing.T) {
	keys, priv, kid := testJWKS(t)
	raw := signToken(t, priv, kid, &Claims{RegisteredClaims: jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}})
	if _, err := VerifyToken(raw, keys); err == nil {
		t.Error("expected error for token with no subject")
	}
}

func TestVerifyToken_RejectsAlgNone(t *testing.T) {
	// "alg: none" is the classic JWT bypass — a token with no signature that
	// naive verifiers accept because they only check the claims, not the
	// algorithm. jwt.WithValidMethods([]string{"ES256"}) in VerifyToken must
	// reject this outright.
	keys, _, kid := testJWKS(t)
	token := jwt.NewWithClaims(jwt.SigningMethodNone, &Claims{RegisteredClaims: jwt.RegisteredClaims{
		Subject:   "attacker",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}})
	token.Header["kid"] = kid
	raw, err := token.SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatalf("sign alg=none token: %v", err)
	}
	if _, err := VerifyToken(raw, keys); err == nil {
		t.Error("expected VerifyToken to reject an alg=none token")
	}
}

func TestVerifyToken_RejectsHS256(t *testing.T) {
	// A token forged with HS256 using the *public* key bytes as an HMAC
	// secret is a known asymmetric-to-symmetric confusion attack. Rejecting
	// every alg but ES256 (jwt.WithValidMethods) closes it structurally.
	keys, _, kid := testJWKS(t)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, &Claims{RegisteredClaims: jwt.RegisteredClaims{
		Subject:   "attacker",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}})
	token.Header["kid"] = kid
	raw, err := token.SignedString([]byte("guessed-or-known-bytes"))
	if err != nil {
		t.Fatalf("sign hs256 token: %v", err)
	}
	if _, err := VerifyToken(raw, keys); err == nil {
		t.Error("expected VerifyToken to reject an HS256-signed token")
	}
}
