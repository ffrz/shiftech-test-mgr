package handler

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type HealthHandler struct {
	DB *gorm.DB
}

type HealthResponse struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
	DB        string `json:"db"`
}

func (h *HealthHandler) Check(c echo.Context) error {
	dbStatus := "connected"
	if err := h.pingDB(); err != nil {
		dbStatus = "disconnected"
	}

	status := "ok"
	httpCode := http.StatusOK
	if dbStatus == "disconnected" {
		status = "degraded"
		httpCode = http.StatusServiceUnavailable
	}

	return c.JSON(httpCode, HealthResponse{
		Status:    status,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		DB:        dbStatus,
	})
}

func (h *HealthHandler) pingDB() error {
	if h.DB == nil {
		return gorm.ErrInvalidDB
	}
	sqlDB, err := h.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}
