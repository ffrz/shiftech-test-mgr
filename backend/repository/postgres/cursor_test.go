package postgres

import (
	"testing"
	"time"
)

func TestEncodeDecodeCodeCursor(t *testing.T) {
	code, id := "TC-0001", "123e4567-e89b-12d3-a456-426614174000"
	encoded := encodeCodeCursor(code, id)
	if encoded == "" {
		t.Fatal("encodeCodeCursor returned empty string")
	}

	decoded, err := decodeCodeCursor(encoded)
	if err != nil {
		t.Fatalf("decodeCodeCursor: %v", err)
	}
	if decoded.Code != code || decoded.ID != id {
		t.Errorf("roundtrip mismatch: got {%q, %q}, want {%q, %q}", decoded.Code, decoded.ID, code, id)
	}
}

func TestDecodeCodeCursorInvalid(t *testing.T) {
	invalid := []string{
		"%%%not-base64%%%",
		"aGVsbG8=", // base64 of "hello", not a JSON object
		"e30=",     // base64 of "{}", missing code/id
	}
	for _, raw := range invalid {
		if _, err := decodeCodeCursor(raw); err == nil {
			t.Errorf("decodeCodeCursor(%q) should error, got nil", raw)
		}
	}
}

func TestDecodeCodeCursorEmptyIsOK(t *testing.T) {
	decoded, err := decodeCodeCursor("")
	if err != nil {
		t.Fatalf("decodeCodeCursor(\"\") should not error: %v", err)
	}
	if decoded.Code != "" || decoded.ID != "" {
		t.Errorf("decodeCodeCursor(\"\") = {%q, %q}, want empty", decoded.Code, decoded.ID)
	}
}

func TestEncodeDecodeCreatedAtCursor(t *testing.T) {
	createdAt := time.Date(2026, 8, 1, 12, 30, 45, 0, time.UTC)
	id := "123e4567-e89b-12d3-a456-426614174000"
	encoded := encodeCreatedAtCursor(createdAt, id)
	if encoded == "" {
		t.Fatal("encodeCreatedAtCursor returned empty string")
	}

	decoded, err := decodeCreatedAtCursor(encoded)
	if err != nil {
		t.Fatalf("decodeCreatedAtCursor: %v", err)
	}
	if !decoded.CreatedAt.Equal(createdAt) || decoded.ID != id {
		t.Errorf("roundtrip mismatch: got {%v, %q}, want {%v, %q}", decoded.CreatedAt, decoded.ID, createdAt, id)
	}
}

func TestDecodeCreatedAtCursorInvalid(t *testing.T) {
	invalid := []string{
		"%%%not-base64%%%",
		"e30=", // "{}" — missing createdAt/id
	}
	for _, raw := range invalid {
		if _, err := decodeCreatedAtCursor(raw); err == nil {
			t.Errorf("decodeCreatedAtCursor(%q) should error, got nil", raw)
		}
	}
}
