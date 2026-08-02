package postgres

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"time"
)

// ---------------------------------------------------------------------------
// Cursor pagination — aligns with the Node MCP scheme (NvlFr-testify
// readService.ts): entities that carry a human-readable `code` page by
// (code, id) ASC (encodeCodeCursor); test results page by (created_at, id)
// ASC (encodeCreatedAtCursor). The Go repos page forward with the same
// keyspace so a cursor produced by MCP stays valid for the future REST API.
// ---------------------------------------------------------------------------

var (
	errInvalidCodeCursor      = errors.New("cursor is invalid: expected {code, id}")
	errInvalidCreatedAtCursor = errors.New("cursor is invalid: expected {createdAt, id}")
)

type codeCursorData struct {
	Code string `json:"code"`
	ID   string `json:"id"`
}

type createdAtCursorData struct {
	CreatedAt time.Time `json:"createdAt"`
	ID        string    `json:"id"`
}

// encodeCodeCursor encodes a {code, id} pair (base64url, same as Node).
func encodeCodeCursor(code, id string) string {
	b, _ := json.Marshal(codeCursorData{Code: code, ID: id})
	return base64.URLEncoding.EncodeToString(b)
}

// decodeCodeCursor parses a {code, id} cursor produced by encodeCodeCursor.
func decodeCodeCursor(raw string) (codeCursorData, error) {
	var data codeCursorData
	if raw == "" {
		return data, nil
	}
	b, err := base64.URLEncoding.DecodeString(raw)
	if err != nil {
		return data, errInvalidCodeCursor
	}
	if err := json.Unmarshal(b, &data); err != nil || data.Code == "" || data.ID == "" {
		return data, errInvalidCodeCursor
	}
	return data, nil
}

// encodeCreatedAtCursor encodes a {createdAt, id} pair (base64url, same as Node).
func encodeCreatedAtCursor(createdAt time.Time, id string) string {
	b, _ := json.Marshal(createdAtCursorData{CreatedAt: createdAt, ID: id})
	return base64.URLEncoding.EncodeToString(b)
}

// decodeCreatedAtCursor parses a {createdAt, id} cursor produced by
// encodeCreatedAtCursor.
func decodeCreatedAtCursor(raw string) (createdAtCursorData, error) {
	var data createdAtCursorData
	if raw == "" {
		return data, nil
	}
	b, err := base64.URLEncoding.DecodeString(raw)
	if err != nil {
		return data, errInvalidCreatedAtCursor
	}
	if err := json.Unmarshal(b, &data); err != nil || data.ID == "" || data.CreatedAt.IsZero() {
		return data, errInvalidCreatedAtCursor
	}
	return data, nil
}
