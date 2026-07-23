package dto

import "github.com/shiftech/testmgr-backend/internal/domain/user"

type GoogleCallbackRequest struct {
	Code string `json:"code" validate:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type TokenPairResponse struct {
	AccessToken  string          `json:"access_token"`
	RefreshToken string          `json:"refresh_token"`
	Profile      ProfileResponse `json:"profile"`
}

type ProfileResponse struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FullName  string `json:"full_name"`
	AvatarURL string `json:"avatar_url"`
	Role      string `json:"role"`
}

func FromProfile(p user.Profile) ProfileResponse {
	return ProfileResponse{
		ID:        p.ID,
		Email:     p.Email,
		FullName:  p.FullName,
		AvatarURL: p.AvatarURL,
		Role:      string(p.Role),
	}
}
