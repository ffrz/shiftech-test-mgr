package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"golang.org/x/oauth2"
	googleoauth "golang.org/x/oauth2/google"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/user"
	"github.com/shiftech/testmgr-backend/platform/jwt"
)

// GoogleConfig holds the OAuth client details needed to exchange an
// authorization code for the caller's Google profile.
type GoogleConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

type Service struct {
	profiles      ProfileRepository
	refreshTokens RefreshTokenRepository
	jwtSvc        *jwt.Service
	oauthCfg      *oauth2.Config
	refreshTTL    time.Duration
}

func NewService(
	profiles ProfileRepository,
	refreshTokens RefreshTokenRepository,
	jwtSvc *jwt.Service,
	google GoogleConfig,
	refreshTTL time.Duration,
) *Service {
	return &Service{
		profiles:      profiles,
		refreshTokens: refreshTokens,
		jwtSvc:        jwtSvc,
		refreshTTL:    refreshTTL,
		oauthCfg: &oauth2.Config{
			ClientID:     google.ClientID,
			ClientSecret: google.ClientSecret,
			RedirectURL:  google.RedirectURL,
			Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
			Endpoint:     googleoauth.Endpoint,
		},
	}
}

// TokenPair is what the client receives after a successful login or refresh.
type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

type googleUserInfo struct {
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

// LoginWithGoogleCode exchanges an OAuth authorization code for the caller's
// Google identity, upserts the matching profile row (creating it with role
// "pending" on first login — approval flow unchanged from before, see
// ARCHITECTURE.md §6.1), and issues a fresh access+refresh token pair.
func (s *Service) LoginWithGoogleCode(ctx context.Context, code string) (*TokenPair, *user.Profile, error) {
	token, err := s.oauthCfg.Exchange(ctx, code)
	if err != nil {
		return nil, nil, apperror.Unauthorized("failed to exchange authorization code")
	}

	info, err := s.fetchGoogleUserInfo(ctx, token)
	if err != nil {
		return nil, nil, apperror.Unauthorized("failed to fetch Google profile")
	}

	profile, err := s.profiles.FindByEmail(ctx, info.Email)
	if err != nil {
		if appErr, ok := apperror.As(err); !ok || appErr.Kind != apperror.KindNotFound {
			return nil, nil, err
		}
		profile = &user.Profile{
			Email:     info.Email,
			FullName:  info.Name,
			AvatarURL: info.Picture,
			Role:      user.RolePending,
		}
		if err := s.profiles.Create(ctx, profile); err != nil {
			return nil, nil, err
		}
	}

	if profile.DeletedAt != nil {
		return nil, nil, apperror.Forbidden("account has been deactivated")
	}

	pair, err := s.issueTokenPair(ctx, *profile)
	if err != nil {
		return nil, nil, err
	}
	return pair, profile, nil
}

func (s *Service) fetchGoogleUserInfo(ctx context.Context, token *oauth2.Token) (*googleUserInfo, error) {
	client := s.oauthCfg.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("google userinfo request failed: %s: %s", resp.Status, string(body))
	}

	var info googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}
	return &info, nil
}

// Refresh validates the presented raw refresh token against its stored hash,
// rejecting it if revoked or expired, then rotates it: the old token is
// revoked and a new access+refresh pair is issued. Rotation limits the blast
// radius of a leaked refresh token to a single use.
func (s *Service) Refresh(ctx context.Context, rawRefreshToken string) (*TokenPair, error) {
	hash := jwt.HashRefreshToken(rawRefreshToken)
	stored, err := s.refreshTokens.FindByHash(ctx, hash)
	if err != nil {
		return nil, apperror.Unauthorized("invalid refresh token")
	}
	if !stored.IsValid(time.Now()) {
		return nil, apperror.Unauthorized("refresh token expired or revoked")
	}

	profile, err := s.profiles.FindByID(ctx, stored.UserID)
	if err != nil {
		return nil, apperror.Unauthorized("account no longer exists")
	}
	if profile.DeletedAt != nil {
		return nil, apperror.Forbidden("account has been deactivated")
	}

	if err := s.refreshTokens.Revoke(ctx, stored.ID); err != nil {
		return nil, err
	}
	return s.issueTokenPair(ctx, *profile)
}

// Logout revokes a single refresh token (the one presented) — signing out
// of the current device/session only, unlike RevokeAllSessions.
func (s *Service) Logout(ctx context.Context, rawRefreshToken string) error {
	hash := jwt.HashRefreshToken(rawRefreshToken)
	stored, err := s.refreshTokens.FindByHash(ctx, hash)
	if err != nil {
		return nil // already invalid/gone — logout is idempotent
	}
	return s.refreshTokens.Revoke(ctx, stored.ID)
}

// RevokeAllSessions is what an admin action (suspend/revoke user) calls —
// see plan §5: every outstanding refresh token for the user stops working,
// forcing re-login everywhere within one access-token TTL.
func (s *Service) RevokeAllSessions(ctx context.Context, userID string) error {
	return s.refreshTokens.RevokeAllForUser(ctx, userID)
}

func (s *Service) issueTokenPair(ctx context.Context, profile user.Profile) (*TokenPair, error) {
	accessToken, err := s.jwtSvc.IssueAccessToken(profile)
	if err != nil {
		return nil, apperror.Internal(err)
	}

	rawRefresh, hash, err := jwt.NewRefreshToken()
	if err != nil {
		return nil, apperror.Internal(err)
	}
	err = s.refreshTokens.Create(ctx, &user.RefreshToken{
		UserID:    profile.ID,
		TokenHash: hash,
		ExpiresAt: time.Now().Add(s.refreshTTL),
	})
	if err != nil {
		return nil, err
	}

	return &TokenPair{AccessToken: accessToken, RefreshToken: rawRefresh}, nil
}
