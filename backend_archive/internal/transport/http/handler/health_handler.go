package handler

import (
	"github.com/labstack/echo/v4"

	"github.com/shiftech/testmgr-backend/internal/transport/http/response"
	"github.com/shiftech/testmgr-backend/platform/config"
)

type HealthHandler struct {
	driver config.Driver
}

func NewHealthHandler(driver config.Driver) *HealthHandler {
	return &HealthHandler{driver: driver}
}

// Check reports 200 with the active DB driver — used to verify a
// DB_DRIVER switch actually took effect after a restart.
func (h *HealthHandler) Check(c echo.Context) error {
	return response.OK(c, map[string]string{
		"status": "ok",
		"driver": string(h.driver),
	})
}
