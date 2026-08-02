package service

import (
	"context"

	"github.com/shiftech/testify-platform/core"
)

// AnalysisService wraps core.AnalysisRepository. All metrics are computed on
// demand and never cached (TASKS.md T5.3). Defaults and clamps mirror the
// reference RPCs: lookback_runs 2..50 (default 10), min_executions 2..50
// (default 3), limit 1..100 (default 25).
type AnalysisService struct {
	repo core.AnalysisRepository
}

func NewAnalysisService(repo core.AnalysisRepository) *AnalysisService {
	return &AnalysisService{repo: repo}
}

func (s *AnalysisService) RunSummary(ctx context.Context, projectID, testRunID string) (*core.AnalysisRunSummary, error) {
	return s.repo.RunSummary(ctx, projectID, testRunID)
}

func (s *AnalysisService) FlakyCandidates(ctx context.Context, projectID string, lookbackRuns, minExecutions, limit int) ([]core.FlakyCandidate, error) {
	lookback := clampRange(defaultIfZero(lookbackRuns, 10), 2, 50)
	minExec := clampRange(defaultIfZero(minExecutions, 3), 2, 50)
	lim := clampRange(defaultIfZero(limit, 25), 1, 100)
	return s.repo.FlakyCandidates(ctx, projectID, lookback, minExec, lim)
}

func (s *AnalysisService) SuggestRetest(ctx context.Context, projectID, testRunID string, lookbackRuns, limit int) ([]core.RetestSuggestion, error) {
	lookback := clampRange(defaultIfZero(lookbackRuns, 10), 2, 50)
	lim := clampRange(defaultIfZero(limit, 25), 1, 100)
	return s.repo.SuggestRetest(ctx, projectID, testRunID, lookback, lim)
}

func defaultIfZero(v, def int) int {
	if v <= 0 {
		return def
	}
	return v
}

func clampRange(v, min, max int) int {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}
