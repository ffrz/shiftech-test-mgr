// Package response is the single place every HTTP handler goes through to
// write a JSON body — success envelope helpers and the centralized error
// handler. Kept separate from the router/http package (rather than living
// alongside router.go) so handler packages can import it without creating
// an import cycle back to the package that imports handlers.
package response

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
)

type envelope struct {
	Data  any        `json:"data,omitempty"`
	Meta  any        `json:"meta,omitempty"`
	Error *errorBody `json:"error,omitempty"`
}

type errorBody struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

func OK(c echo.Context, data any) error {
	return c.JSON(http.StatusOK, envelope{Data: data})
}

func OKWithMeta(c echo.Context, data any, meta any) error {
	return c.JSON(http.StatusOK, envelope{Data: data, Meta: meta})
}

func Created(c echo.Context, data any) error {
	return c.JSON(http.StatusCreated, envelope{Data: data})
}

func NoContent(c echo.Context) error {
	return c.NoContent(http.StatusNoContent)
}

// HTTPErrorHandler is registered as Echo's global error handler
// (e.HTTPErrorHandler). Every error returned from a handler — whether a
// typed *apperror.Error from the service layer or something unexpected —
// funnels through here exactly once, so status-code translation never
// happens ad hoc in individual handlers.
func HTTPErrorHandler(err error, c echo.Context) {
	if c.Response().Committed {
		return
	}

	if appErr, ok := apperror.As(err); ok {
		status, code := statusFor(appErr.Kind)
		body := envelope{Error: &errorBody{
			Code:    code,
			Message: appErr.Message,
			Fields:  appErr.Fields,
		}}
		_ = c.JSON(status, body)
		return
	}

	if httpErr, ok := err.(*echo.HTTPError); ok {
		_ = c.JSON(httpErr.Code, envelope{Error: &errorBody{
			Code:    "http_error",
			Message: httpMessage(httpErr),
		}})
		return
	}

	// Unexpected error: never leak internal details to the client, only to logs.
	c.Logger().Error(err)
	_ = c.JSON(http.StatusInternalServerError, envelope{Error: &errorBody{
		Code:    string(apperror.KindInternal),
		Message: "internal server error",
	}})
}

func statusFor(kind apperror.Kind) (int, string) {
	switch kind {
	case apperror.KindNotFound:
		return http.StatusNotFound, string(kind)
	case apperror.KindValidation:
		return http.StatusUnprocessableEntity, string(kind)
	case apperror.KindConflict:
		return http.StatusConflict, string(kind)
	case apperror.KindForbidden:
		return http.StatusForbidden, string(kind)
	case apperror.KindUnauthorized:
		return http.StatusUnauthorized, string(kind)
	default:
		return http.StatusInternalServerError, string(apperror.KindInternal)
	}
}

func httpMessage(e *echo.HTTPError) string {
	if msg, ok := e.Message.(string); ok {
		return msg
	}
	return "request error"
}
