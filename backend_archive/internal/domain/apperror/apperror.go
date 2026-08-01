// Package apperror defines the typed error vocabulary shared by every
// service. Services never return raw fmt.Errorf strings for expected
// failure modes (not found, validation, conflict, forbidden) — they return
// an *Error built by one of the constructors here. The transport layer is
// the only place that translates these into HTTP status codes, so handlers
// never re-derive status codes from error strings.
package apperror

import (
	"errors"
	"fmt"
)

type Kind string

const (
	KindNotFound     Kind = "not_found"
	KindValidation   Kind = "validation"
	KindConflict     Kind = "conflict"
	KindForbidden    Kind = "forbidden"
	KindUnauthorized Kind = "unauthorized"
	KindInternal     Kind = "internal"
)

// Error is the concrete error type every layer above repository should deal
// in. Fields is only populated for KindValidation, one entry per invalid
// field, so the transport layer can return per-field messages like a Laravel
// FormRequest 422 response.
type Error struct {
	Kind    Kind
	Message string
	Fields  map[string]string
	cause   error
}

func (e *Error) Error() string {
	if e.cause != nil {
		return fmt.Sprintf("%s: %s: %v", e.Kind, e.Message, e.cause)
	}
	return fmt.Sprintf("%s: %s", e.Kind, e.Message)
}

func (e *Error) Unwrap() error { return e.cause }

func NotFound(message string) *Error {
	return &Error{Kind: KindNotFound, Message: message}
}

func Validation(message string, fields map[string]string) *Error {
	return &Error{Kind: KindValidation, Message: message, Fields: fields}
}

func Conflict(message string) *Error {
	return &Error{Kind: KindConflict, Message: message}
}

func Forbidden(message string) *Error {
	return &Error{Kind: KindForbidden, Message: message}
}

func Unauthorized(message string) *Error {
	return &Error{Kind: KindUnauthorized, Message: message}
}

// Internal wraps an unexpected error (e.g. a driver-level failure) that
// should be logged with full detail but never leak its message to the HTTP
// response body.
func Internal(cause error) *Error {
	return &Error{Kind: KindInternal, Message: "internal server error", cause: cause}
}

// As is a thin wrapper around errors.As for callers that don't want to
// import "errors" just to type-switch on *Error.
func As(err error) (*Error, bool) {
	var appErr *Error
	if errors.As(err, &appErr) {
		return appErr, true
	}
	return nil, false
}
