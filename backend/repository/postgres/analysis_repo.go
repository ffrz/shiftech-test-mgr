package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/lib/pq"
	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

// AnalysisRepo derives on-demand metrics from test_results. Nothing is ever
// cached (TASKS.md T5.3 / ROADMAP.md Fase 5). Ported from the Node
// mcp_analysis_* RPCs (schema_058), adapted to test_runs.project_id which is
// set directly on every run in this schema (no coalesce through test_plans).
type AnalysisRepo struct {
	db *gorm.DB
}

func NewAnalysisRepo(db *gorm.DB) *AnalysisRepo {
	return &AnalysisRepo{db: db}
}

func (r *AnalysisRepo) RunSummary(ctx context.Context, projectID, testRunID string) (*core.AnalysisRunSummary, error) {
	var runRow testRunRow
	err := r.db.WithContext(ctx).Where("id = ? AND project_id = ?", testRunID, projectID).First(&runRow).Error
	if err == gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("TEST_RUN_NOT_FOUND")
	}
	if err != nil {
		return nil, fmt.Errorf("analysis run summary: %w", err)
	}
	run := runRow.toDomain()

	var counts struct {
		Executed int64 `gorm:"column:executed"`
		Pass     int64 `gorm:"column:pass"`
		Fail     int64 `gorm:"column:fail"`
	}
	if err := r.db.WithContext(ctx).Raw(`
		select
			count(*) filter (where status <> 'not_run') as executed,
			count(*) filter (where status = 'pass') as pass,
			count(*) filter (where status = 'fail') as fail
		from test_results
		where test_run_id = ?
	`, testRunID).Scan(&counts).Error; err != nil {
		return nil, fmt.Errorf("analysis run summary counts: %w", err)
	}

	passRate, failRate := 0.0, 0.0
	if counts.Executed > 0 {
		passRate = round2(100.0 * float64(counts.Pass) / float64(counts.Executed))
		failRate = round2(100.0 * float64(counts.Fail) / float64(counts.Executed))
	}

	var problematic []analysisProblematicRow
	if err := r.db.WithContext(ctx).Raw(`
		select
			result.id as test_result_id,
			result.test_case_id,
			coalesce(result.test_case_code, tc.code) as code,
			coalesce(result.test_case_title, tc.title) as title,
			coalesce(result.test_case_priority, tc.priority) as priority,
			result.status
		from test_results result
		left join test_cases tc on tc.id = result.test_case_id
		where result.test_run_id = ? and result.status in ('fail', 'blocked', 'skip')
		order by (case coalesce(result.test_case_priority, tc.priority)
			when 'critical' then 4 when 'high' then 3 when 'medium' then 2 else 1 end) desc,
			coalesce(result.test_case_code, tc.code), result.id
		limit 100
	`, testRunID).Scan(&problematic).Error; err != nil {
		return nil, fmt.Errorf("analysis run summary problematic: %w", err)
	}

	items := make([]core.AnalysisProblematicResult, len(problematic))
	for i, p := range problematic {
		items[i] = p.toDomain()
	}

	return &core.AnalysisRunSummary{
		Run:                run,
		PassRate:           passRate,
		FailureRate:        failRate,
		ProblematicResults: items,
	}, nil
}

func (r *AnalysisRepo) FlakyCandidates(ctx context.Context, projectID string, lookbackRuns, minExecutions, limit int) ([]core.FlakyCandidate, error) {
	var rows []flakyCandidateRow
	if err := r.db.WithContext(ctx).Raw(`
		with scoped as (
			select result.test_case_id, result.status, result.executed_at, run.started_at,
				row_number() over(partition by result.test_case_id order by run.started_at desc, run.id desc) as recent_rank
			from test_results result
			join test_runs run on run.id = result.test_run_id
			where run.project_id = ? and result.status in ('pass', 'fail')
		), windowed as (
			select scoped.*, lag(status) over(partition by test_case_id order by started_at) as previous_status
			from scoped where recent_rank <= ?
		), stats as (
			select
				test_case_id,
				count(*) as executions,
				count(*) filter (where status = 'pass') as pass_count,
				count(*) filter (where status = 'fail') as fail_count,
				count(*) filter (where previous_status is not null and previous_status <> status) as transitions,
				(array_agg(status order by started_at desc))[1] as latest_status,
				max(executed_at) as latest_executed_at
			from windowed
			group by test_case_id
		)
		select
			tc.id as test_case_id, tc.code, tc.title, tc.priority,
			s.executions, s.pass_count, s.fail_count, s.transitions,
			round(s.transitions::numeric / nullif(s.executions - 1, 0), 4)::float8 as flakiness_score,
			s.latest_status, s.latest_executed_at
		from stats s
		join test_cases tc on tc.id = s.test_case_id and tc.project_id = ?
		where s.executions >= ? and s.pass_count > 0 and s.fail_count > 0
		order by flakiness_score desc, s.executions desc, tc.code
		limit ?
	`, projectID, lookbackRuns, projectID, minExecutions, limit).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("analysis flaky candidates: %w", err)
	}

	out := make([]core.FlakyCandidate, len(rows))
	for i, row := range rows {
		out[i] = row.toDomain()
	}
	return out, nil
}

func (r *AnalysisRepo) SuggestRetest(ctx context.Context, projectID, testRunID string, lookbackRuns, limit int) ([]core.RetestSuggestion, error) {
	var rows []retestRow
	if err := r.db.WithContext(ctx).Raw(`
		with target as (
			select
				result.id,
				result.test_case_id,
				coalesce(result.test_case_code, tc.code) as case_code,
				coalesce(result.test_case_title, tc.title) as case_title,
				coalesce(result.test_case_priority, tc.priority) as case_priority,
				result.status
			from test_results result
			left join test_cases tc on tc.id = result.test_case_id
			join test_runs run on run.id = result.test_run_id
			where run.project_id = ? and run.id = ?
		), history as (
			select result.test_case_id, result.status, run.started_at,
				row_number() over(partition by result.test_case_id order by run.started_at desc, run.id desc) as rank
			from test_results result
			join test_runs run on run.id = result.test_run_id
			where run.project_id = ? and result.status in ('pass', 'fail')
		), windowed as (
			select history.*, lag(status) over(partition by test_case_id order by started_at) as previous_status
			from history where rank <= ?
		), flaky as (
			select
				test_case_id,
				case
					when count(*) > 1 and count(*) filter (where status = 'pass') > 0 and count(*) filter (where status = 'fail') > 0
						then round(count(*) filter (where previous_status is not null and previous_status <> status)::numeric / (count(*) - 1), 4)
					else 0
				end as flakiness_score
			from windowed
			group by test_case_id
		), ranked as (
			select
				target.test_case_id,
				target.case_code as code,
				target.case_title as title,
				target.case_priority as priority,
				target.status as latest_status,
				(case target.status
					when 'fail' then 100 when 'blocked' then 80 when 'not_run' then 55 when 'skip' then 35 else 0 end
					+ case target.case_priority when 'critical' then 30 when 'high' then 20 when 'medium' then 10 else 0 end
					+ least(issue_stats.open_count, 3) * 10
					+ coalesce(flaky.flakiness_score, 0) * 40)::numeric::float8 as score,
				array_remove(array[
					case when target.status = 'fail' then 'failed_in_target_run'
						when target.status = 'blocked' then 'blocked_in_target_run'
						when target.status = 'not_run' then 'not_run_in_target_run'
						when target.status = 'skip' then 'skipped_in_target_run' end,
					case when issue_stats.open_count > 0 then 'has_open_issue' end,
					case when coalesce(flaky.flakiness_score, 0) > 0 then 'recent_pass_fail_instability' end,
					case when target.case_priority in ('critical', 'high') then 'high_priority' end], null) as reasons,
				issue_stats.open_count as open_issue_count,
				coalesce(flaky.flakiness_score, 0)::float8 as flakiness_score
			from target
			left join flaky on flaky.test_case_id = target.test_case_id
			cross join lateral (
				select count(*) as open_count
				from issue_test_results itr
				join issues issue on issue.id = itr.issue_id
				join test_results issue_result on issue_result.id = itr.test_result_id
				where issue_result.test_case_id = target.test_case_id
				  and issue.status not in ('verified', 'closed', 'rejected', 'duplicate')
			) issue_stats
		)
		select * from ranked
		where latest_status <> 'pass' or open_issue_count > 0 or flakiness_score > 0
		order by score desc, code, test_case_id
		limit ?
	`, projectID, testRunID, projectID, lookbackRuns, limit).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("analysis suggest retest: %w", err)
	}

	out := make([]core.RetestSuggestion, len(rows))
	for i, row := range rows {
		out[i] = row.toDomain()
	}
	return out, nil
}

// round2 rounds to two decimal places, matching the reference RPC's
// round(..., 2) on pass/failure rates.
func round2(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

type analysisProblematicRow struct {
	TestResultID string `gorm:"column:test_result_id"`
	TestCaseID   string `gorm:"column:test_case_id"`
	Code         string `gorm:"column:code"`
	Title        string `gorm:"column:title"`
	Priority     string `gorm:"column:priority"`
	Status       string `gorm:"column:status"`
}

func (r analysisProblematicRow) toDomain() core.AnalysisProblematicResult {
	return core.AnalysisProblematicResult{
		TestResultID: r.TestResultID,
		TestCaseID:   r.TestCaseID,
		Code:         emptyToNil(r.Code),
		Title:        emptyToNil(r.Title),
		Priority:     toPriorityPtr(r.Priority),
		Status:       core.TestResultStatus(r.Status),
	}
}

// toPriorityPtr maps a priority text column to an optional typed priority,
// preserving null for missing/absent values.
func toPriorityPtr(s string) *core.TestCasePriority {
	if s == "" {
		return nil
	}
	p := core.TestCasePriority(s)
	return &p
}

type flakyCandidateRow struct {
	TestCaseID      string     `gorm:"column:test_case_id"`
	Code            string     `gorm:"column:code"`
	Title           string     `gorm:"column:title"`
	Priority        string     `gorm:"column:priority"`
	Executions      int64      `gorm:"column:executions"`
	PassCount       int64      `gorm:"column:pass_count"`
	FailCount       int64      `gorm:"column:fail_count"`
	Transitions     int64      `gorm:"column:transitions"`
	FlakinessScore  float64    `gorm:"column:flakiness_score"`
	LatestStatus    string     `gorm:"column:latest_status"`
	LatestExecutedAt time.Time `gorm:"column:latest_executed_at"`
}

func (r flakyCandidateRow) toDomain() core.FlakyCandidate {
	return core.FlakyCandidate{
		TestCaseID:       r.TestCaseID,
		Code:             r.Code,
		Title:            r.Title,
		Priority:         core.TestCasePriority(r.Priority),
		Executions:       r.Executions,
		PassCount:        r.PassCount,
		FailCount:        r.FailCount,
		Transitions:      r.Transitions,
		FlakinessScore:   r.FlakinessScore,
		LatestStatus:     r.LatestStatus,
		LatestExecutedAt: r.LatestExecutedAt,
	}
}

type retestRow struct {
	TestCaseID     string         `gorm:"column:test_case_id"`
	Code           string         `gorm:"column:code"`
	Title          string         `gorm:"column:title"`
	Priority       string         `gorm:"column:priority"`
	LatestStatus   string         `gorm:"column:latest_status"`
	Score          float64        `gorm:"column:score"`
	Reasons        pq.StringArray `gorm:"column:reasons"`
	OpenIssueCount int64          `gorm:"column:open_issue_count"`
	FlakinessScore float64        `gorm:"column:flakiness_score"`
}

func (r retestRow) toDomain() core.RetestSuggestion {
	return core.RetestSuggestion{
		TestCaseID:     r.TestCaseID,
		Code:           r.Code,
		Title:          r.Title,
		Priority:       core.TestCasePriority(r.Priority),
		LatestStatus:   core.TestResultStatus(r.LatestStatus),
		Score:          r.Score,
		Reasons:        []string(r.Reasons),
		OpenIssueCount: r.OpenIssueCount,
		FlakinessScore: r.FlakinessScore,
	}
}
