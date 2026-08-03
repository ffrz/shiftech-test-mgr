package auth

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"sync"
	"time"
)

// jwk is one entry of a JWKS response. This project's Supabase instance
// signs with ES256 (EC P-256) — see the "kty":"EC" entries at
// {SUPABASE_URL}/auth/v1/.well-known/jwks.json — so only the EC fields are
// modeled. If Supabase ever also serves RSA keys, this struct and
// jwk.publicKey would need an RSA branch too.
type jwk struct {
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	Kid string `json:"kid"`
	X   string `json:"x"`
	Y   string `json:"y"`
	Alg string `json:"alg"`
}

func (k jwk) publicKey() (*ecdsa.PublicKey, error) {
	if k.Kty != "EC" || k.Crv != "P-256" {
		return nil, fmt.Errorf("unsupported jwk kty/crv: %s/%s", k.Kty, k.Crv)
	}
	xBytes, err := base64.RawURLEncoding.DecodeString(k.X)
	if err != nil {
		return nil, fmt.Errorf("decode x: %w", err)
	}
	yBytes, err := base64.RawURLEncoding.DecodeString(k.Y)
	if err != nil {
		return nil, fmt.Errorf("decode y: %w", err)
	}
	return &ecdsa.PublicKey{
		Curve: elliptic.P256(),
		X:     new(big.Int).SetBytes(xBytes),
		Y:     new(big.Int).SetBytes(yBytes),
	}, nil
}

// jwksResponse is the well-known JWKS document shape (RFC 7517 §5).
type jwksResponse struct {
	Keys []jwk `json:"keys"`
}

// JWKSFetcher resolves a Supabase Auth signing key by "kid", fetched from
// {SUPABASE_URL}/auth/v1/.well-known/jwks.json and cached in memory. Keys
// only rotate on Supabase's own schedule (long-lived, not per-request), so a
// simple TTL cache is enough — no need to re-fetch on every token
// verification.
type JWKSFetcher struct {
	url        string
	httpClient *http.Client
	ttl        time.Duration

	mu        sync.Mutex
	cachedAt  time.Time
	keysByKid map[string]*ecdsa.PublicKey
}

// NewJWKSFetcher builds a fetcher for {supabaseURL}/auth/v1/.well-known/jwks.json.
func NewJWKSFetcher(supabaseURL string) *JWKSFetcher {
	return &JWKSFetcher{
		url:        supabaseURL + "/auth/v1/.well-known/jwks.json",
		httpClient: &http.Client{Timeout: 10 * time.Second},
		ttl:        10 * time.Minute,
	}
}

// PublicKey returns the EC public key for the given "kid", fetching (or
// re-fetching, if the cache is stale or the kid is unknown) the JWKS
// document as needed.
func (f *JWKSFetcher) PublicKey(kid string) (*ecdsa.PublicKey, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	if key, ok := f.keysByKid[kid]; ok && time.Since(f.cachedAt) < f.ttl {
		return key, nil
	}

	if err := f.refreshLocked(); err != nil {
		return nil, err
	}
	key, ok := f.keysByKid[kid]
	if !ok {
		return nil, fmt.Errorf("no jwks key found for kid %q", kid)
	}
	return key, nil
}

func (f *JWKSFetcher) refreshLocked() error {
	resp, err := f.httpClient.Get(f.url)
	if err != nil {
		return fmt.Errorf("fetch jwks: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read jwks response: %w", err)
	}
	if resp.StatusCode >= 300 {
		return fmt.Errorf("fetch jwks: status %d: %s", resp.StatusCode, body)
	}

	var parsed jwksResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return fmt.Errorf("parse jwks: %w", err)
	}

	keys := make(map[string]*ecdsa.PublicKey, len(parsed.Keys))
	for _, k := range parsed.Keys {
		if k.Kty != "EC" {
			continue // skip key types this fetcher doesn't support (see jwk doc comment)
		}
		pub, err := k.publicKey()
		if err != nil {
			continue
		}
		keys[k.Kid] = pub
	}

	f.keysByKid = keys
	f.cachedAt = time.Now()
	return nil
}
