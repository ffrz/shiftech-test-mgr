package dto

import (
	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
)

var validate = validator.New()

// BindAndValidate is the standard bind -> validate sequence every handler
// uses (see plan §5b) — c.Bind() for JSON/form/query decoding, then struct
// tag validation, both failures translated into the same apperror.Validation
// shape so the client always gets a consistent 422 body regardless of which
// step failed.
func BindAndValidate(c echo.Context, req any) error {
	if err := c.Bind(req); err != nil {
		return apperror.Validation("invalid request body", nil)
	}
	if err := validate.Struct(req); err != nil {
		fields := make(map[string]string)
		for _, fe := range err.(validator.ValidationErrors) {
			fields[fe.Field()] = fe.Tag()
		}
		return apperror.Validation("validation failed", fields)
	}
	return nil
}
