package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"gorm.io/gorm"

	"github.com/shiftech/testmgr-backend/internal/repository/mysql"
	"github.com/shiftech/testmgr-backend/internal/repository/postgres"
	attachmentsvc "github.com/shiftech/testmgr-backend/internal/service/attachment"
	authsvc "github.com/shiftech/testmgr-backend/internal/service/auth"
	issuesvc "github.com/shiftech/testmgr-backend/internal/service/issue"
	projectsvc "github.com/shiftech/testmgr-backend/internal/service/project"
	testcasesvc "github.com/shiftech/testmgr-backend/internal/service/testcase"
	testplansvc "github.com/shiftech/testmgr-backend/internal/service/testplan"
	testrunsvc "github.com/shiftech/testmgr-backend/internal/service/testrun"
	transporthttp "github.com/shiftech/testmgr-backend/internal/transport/http"
	"github.com/shiftech/testmgr-backend/internal/transport/http/handler"
	"github.com/shiftech/testmgr-backend/platform/config"
	"github.com/shiftech/testmgr-backend/platform/database"
	"github.com/shiftech/testmgr-backend/platform/eventbus"
	"github.com/shiftech/testmgr-backend/platform/jwt"
	"github.com/shiftech/testmgr-backend/platform/logger"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		// Logger isn't up yet -- this is the one place a plain stderr write
		// is correct, since config failure means we can't even build the
		// structured logger's dependencies reliably.
		os.Stderr.WriteString("config error: " + err.Error() + "\n")
		os.Exit(1)
	}

	log := logger.New(cfg.Env, getLogLevel())

	if err := database.Migrate(cfg.DB, log); err != nil {
		log.Error("migration failed", "error", err)
		os.Exit(1)
	}

	db, err := database.New(cfg.DB, log)
	if err != nil {
		log.Error("database connection failed", "error", err)
		os.Exit(1)
	}

	profileRepo, refreshTokenRepo, projectMemberRepo, err := newAuthRepositories(cfg.DB.Driver, db)
	if err != nil {
		log.Error("failed to build repositories", "error", err)
		os.Exit(1)
	}
	projectRepo, err := newProjectRepository(cfg.DB.Driver, db)
	if err != nil {
		log.Error("failed to build repositories", "error", err)
		os.Exit(1)
	}
	testCaseRepo, err := newTestCaseRepository(cfg.DB.Driver, db)
	if err != nil {
		log.Error("failed to build repositories", "error", err)
		os.Exit(1)
	}
	testPlanRepo, err := newTestPlanRepository(cfg.DB.Driver, db)
	if err != nil {
		log.Error("failed to build repositories", "error", err)
		os.Exit(1)
	}
	testRunRepo, testCaseSnapshotRepo, testPlanCaseReader, err := newTestRunRepositories(cfg.DB.Driver, db)
	if err != nil {
		log.Error("failed to build repositories", "error", err)
		os.Exit(1)
	}
	issueRepo, err := newIssueRepository(cfg.DB.Driver, db)
	if err != nil {
		log.Error("failed to build repositories", "error", err)
		os.Exit(1)
	}
	attachmentRepo, err := newAttachmentRepository(cfg.DB.Driver, db)
	if err != nil {
		log.Error("failed to build repositories", "error", err)
		os.Exit(1)
	}

	events := eventbus.NewInMemory()

	jwtSvc := jwt.NewService(cfg.JWT.Secret, cfg.JWT.AccessTokenTTL)
	authService := authsvc.NewService(
		profileRepo,
		refreshTokenRepo,
		jwtSvc,
		authsvc.GoogleConfig{
			ClientID:     cfg.Google.ClientID,
			ClientSecret: cfg.Google.ClientSecret,
			RedirectURL:  cfg.Google.RedirectURL,
		},
		cfg.JWT.RefreshTokenTTL,
	)

	projectService := projectsvc.NewService(projectRepo)
	testCaseService := testcasesvc.NewService(testCaseRepo)
	testPlanService := testplansvc.NewService(testPlanRepo)
	testRunService := testrunsvc.NewService(testRunRepo, testCaseSnapshotRepo, testPlanCaseReader)
	issueService := issuesvc.NewService(issueRepo)
	attachmentService := attachmentsvc.NewService(attachmentRepo)

	healthHandler := handler.NewHealthHandler(cfg.DB.Driver)
	authHandler := handler.NewAuthHandler(authService, profileRepo)
	projectHandler := handler.NewProjectHandler(projectService, events)
	testCaseHandler := handler.NewTestCaseHandler(testCaseService, events)
	testPlanHandler := handler.NewTestPlanHandler(testPlanService, events)
	testRunHandler := handler.NewTestRunHandler(testRunService, events)
	issueHandler := handler.NewIssueHandler(issueService, events)
	attachmentHandler := handler.NewAttachmentHandler(attachmentService, events)

	e := transporthttp.NewRouter(log, cfg, jwtSvc,
		transporthttp.Deps{ProjectMembers: projectMemberRepo},
		transporthttp.Handlers{
			Health:     healthHandler,
			Auth:       authHandler,
			Project:    projectHandler,
			TestCase:   testCaseHandler,
			TestPlan:   testPlanHandler,
			TestRun:    testRunHandler,
			Issue:      issueHandler,
			Attachment: attachmentHandler,
		},
	)

	go func() {
		if err := e.Start(":" + cfg.HTTP.Port); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("server failed to start", "error", err)
			os.Exit(1)
		}
	}()
	log.Info("server started", "port", cfg.HTTP.Port, "driver", cfg.DB.Driver)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down")
	ctx, cancel := context.WithTimeout(context.Background(), cfg.HTTP.ShutdownTimeout)
	defer cancel()

	if err := e.Shutdown(ctx); err != nil {
		log.Error("graceful shutdown failed", "error", err)
	}

	sqlDB, err := db.DB()
	if err == nil {
		_ = sqlDB.Close()
	}

	log.Info("shutdown complete")
}

func getLogLevel() string {
	if v := os.Getenv("LOG_LEVEL"); v != "" {
		return v
	}
	return "info"
}

// newAuthRepositories selects the driver-specific repository implementation
// based on cfg.DB.Driver -- the only place in the app that branches on
// driver to pick a concrete type; everywhere else (service, handler) only
// ever sees the interfaces defined in service/auth/port.go.
func newAuthRepositories(driver config.Driver, db *gorm.DB) (
	authsvc.ProfileRepository,
	authsvc.RefreshTokenRepository,
	authsvc.ProjectMemberRepository,
	error,
) {
	switch driver {
	case config.DriverMySQL:
		return mysql.NewProfileRepository(db),
			mysql.NewRefreshTokenRepository(db),
			mysql.NewProjectMemberRepository(db),
			nil
	case config.DriverPostgres:
		return postgres.NewProfileRepository(db),
			postgres.NewRefreshTokenRepository(db),
			postgres.NewProjectMemberRepository(db),
			nil
	default:
		return nil, nil, nil, fmt.Errorf("unsupported database driver: %s", driver)
	}
}

func newProjectRepository(driver config.Driver, db *gorm.DB) (projectsvc.Repository, error) {
	switch driver {
	case config.DriverMySQL:
		return mysql.NewProjectRepository(db), nil
	case config.DriverPostgres:
		return postgres.NewProjectRepository(db), nil
	default:
		return nil, fmt.Errorf("unsupported database driver: %s", driver)
	}
}

func newTestCaseRepository(driver config.Driver, db *gorm.DB) (testcasesvc.Repository, error) {
	switch driver {
	case config.DriverMySQL:
		return mysql.NewTestCaseRepository(db), nil
	case config.DriverPostgres:
		return postgres.NewTestCaseRepository(db), nil
	default:
		return nil, fmt.Errorf("unsupported database driver: %s", driver)
	}
}

func newTestPlanRepository(driver config.Driver, db *gorm.DB) (testplansvc.Repository, error) {
	switch driver {
	case config.DriverMySQL:
		return mysql.NewTestPlanRepository(db), nil
	case config.DriverPostgres:
		return postgres.NewTestPlanRepository(db), nil
	default:
		return nil, fmt.Errorf("unsupported database driver: %s", driver)
	}
}

func newTestRunRepositories(driver config.Driver, db *gorm.DB) (
	testrunsvc.Repository,
	testrunsvc.TestCaseRepository,
	testrunsvc.TestPlanCaseRepository,
	error,
) {
	switch driver {
	case config.DriverMySQL:
		return mysql.NewTestRunRepository(db),
			mysql.NewTestCaseSnapshotRepository(db),
			mysql.NewTestPlanCaseReader(db),
			nil
	case config.DriverPostgres:
		return postgres.NewTestRunRepository(db),
			postgres.NewTestCaseSnapshotRepository(db),
			postgres.NewTestPlanCaseReader(db),
			nil
	default:
		return nil, nil, nil, fmt.Errorf("unsupported database driver: %s", driver)
	}
}

func newIssueRepository(driver config.Driver, db *gorm.DB) (issuesvc.Repository, error) {
	switch driver {
	case config.DriverMySQL:
		return mysql.NewIssueRepository(db), nil
	case config.DriverPostgres:
		return postgres.NewIssueRepository(db), nil
	default:
		return nil, fmt.Errorf("unsupported database driver: %s", driver)
	}
}

func newAttachmentRepository(driver config.Driver, db *gorm.DB) (attachmentsvc.Repository, error) {
	switch driver {
	case config.DriverMySQL:
		return mysql.NewAttachmentRepository(db), nil
	case config.DriverPostgres:
		return postgres.NewAttachmentRepository(db), nil
	default:
		return nil, fmt.Errorf("unsupported database driver: %s", driver)
	}
}
