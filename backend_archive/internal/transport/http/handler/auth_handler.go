package handler

import (
	"github.com/labstack/echo/v4"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/service/auth"
	"github.com/shiftech/testmgr-backend/internal/transport/http/dto"
	"github.com/shiftech/testmgr-backend/internal/transport/http/middleware"
	"github.com/shiftech/testmgr-backend/internal/transport/http/response"
)

type AuthHandler struct {
	authSvc  *auth.Service
	profiles auth.ProfileRepository
}

func NewAuthHandler(authSvc *auth.Service, profiles auth.ProfileRepository) *AuthHandler {
	return &AuthHandler{authSvc: authSvc, profiles: profiles}
}

// GoogleCallback exchanges the authorization code the frontend received from
// Google for an access+refresh token pair, creating the profile row (role
// "pending") on first login. Mirrors the shape the old Supabase Auth session
// object gave the frontend (see plan §5), just issued by us now.
func (h *AuthHandler) GoogleCallback(c echo.Context) error {
	var req dto.GoogleCallbackRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	pair, profile, err := h.authSvc.LoginWithGoogleCode(c.Request().Context(), req.Code)
	if err != nil {
		return err
	}

	return response.Created(c, dto.TokenPairResponse{
		AccessToken:  pair.AccessToken,
		RefreshToken: pair.RefreshToken,
		Profile:      dto.FromProfile(*profile),
	})
}

// Refresh rotates a refresh token: the presented one is revoked and a new
// pair is issued, so a leaked refresh token is only usable once.
func (h *AuthHandler) Refresh(c echo.Context) error {
	var req dto.RefreshRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	pair, err := h.authSvc.Refresh(c.Request().Context(), req.RefreshToken)
	if err != nil {
		return err
	}

	return response.OK(c, map[string]string{
		"access_token":  pair.AccessToken,
		"refresh_token": pair.RefreshToken,
	})
}

// Logout revokes the single presented refresh token (current
// device/session only).
func (h *AuthHandler) Logout(c echo.Context) error {
	var req dto.LogoutRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}
	if err := h.authSvc.Logout(c.Request().Context(), req.RefreshToken); err != nil {
		return err
	}
	return response.NoContent(c)
}

// Me returns the authenticated caller's own profile — requires RequireAuth
// (not RequireApproved), since a "pending" user still needs to see their own
// status to render the pending-approval screen.
func (h *AuthHandler) Me(c echo.Context) error {
	userID := middleware.UserIDFromContext(c)
	if userID == "" {
		return apperror.Unauthorized("missing authenticated user")
	}
	profile, err := h.profiles.FindByID(c.Request().Context(), userID)
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromProfile(*profile))
}
