package core

import "time"

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

type ProjectStatus string

const (
	ProjectStatusActive   ProjectStatus = "active"
	ProjectStatusInactive ProjectStatus = "inactive"
	ProjectStatusArchived ProjectStatus = "archived"
)

type ProjectVisibility string

const (
	VisibilityPrivate  ProjectVisibility = "private"
	VisibilityUnlisted ProjectVisibility = "unlisted"
	VisibilityPublic   ProjectVisibility = "public"
)

// ProjectOwnerType is a polymorphic-owner placeholder; only "user" exists so
// far (see 20260725000007_project_ownership_and_visibility.sql).
type ProjectOwnerType string

const (
	OwnerTypeUser ProjectOwnerType = "user"
)

type Project struct {
	ID          string            `json:"id"`
	OwnerID     string            `json:"ownerId"`
	OwnerType   ProjectOwnerType  `json:"ownerType"`
	Name        string            `json:"name"`
	Description *string           `json:"description"`
	Status      ProjectStatus     `json:"status"`
	Visibility  ProjectVisibility `json:"visibility"`
	CreatedAt   time.Time         `json:"createdAt"`
	UpdatedAt   time.Time         `json:"updatedAt"`
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

type Module struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"projectId"`
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ---------------------------------------------------------------------------
// Test Case
// ---------------------------------------------------------------------------

type TestCasePriority string

const (
	PriorityLow      TestCasePriority = "low"
	PriorityMedium   TestCasePriority = "medium"
	PriorityHigh     TestCasePriority = "high"
	PriorityCritical TestCasePriority = "critical"
)

type TestCaseStatus string

const (
	TestCaseStatusActive   TestCaseStatus = "active"
	TestCaseStatusArchived TestCaseStatus = "archived"
)

type StepType string

const (
	StepSimple   StepType = "simple"
	StepDetailed StepType = "detailed"
)

// TestCaseStep is one structured row of test_case_steps, only present when the
// parent TestCase.StepType == "detailed".
type TestCaseStep struct {
	ID             string    `json:"id"`
	TestCaseID     string    `json:"testCaseId"`
	StepNumber     int       `json:"stepNumber"`
	Action         string    `json:"action"`
	ExpectedResult *string   `json:"expectedResult"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type ExternalLink struct {
	URL   string `json:"url"`
	Label string `json:"label,omitempty"`
}

// TestCase is a reusable template — it never stores a pass/fail result itself.
// Results live on TestResult, one row per (TestRun x TestCase).
type TestCase struct {
	ID             string           `json:"id"`
	ProjectID      string           `json:"projectId"`
	ModuleID       *string          `json:"moduleId"`
	Code           string           `json:"code"`
	Title          string           `json:"title"`
	Objective      *string          `json:"objective"`
	Preconditions  *string          `json:"preconditions"`
	Steps          string           `json:"steps"`
	ExpectedResult string           `json:"expectedResult"`
	Priority       TestCasePriority `json:"priority"`
	Status         TestCaseStatus   `json:"status"`
	Notes          *string          `json:"notes"`
	StepType       StepType         `json:"stepType"`
	TargetRoleID   *string          `json:"targetRoleId"`
	AssignedTo     *string          `json:"assignedTo"`
	ExternalLinks  []ExternalLink   `json:"externalLinks"`
	CreatedBy      *string          `json:"createdBy"`
	// DetailedSteps carries the structured test_case_steps rows for a
	// step_type="detailed" case. It is populated on full reads (Get) and
	// omitted from list payloads. The "steps" text field above remains the
	// single source blob, matching the frontend TestCase domain type.
	DetailedSteps []TestCaseStep `json:"detailedSteps,omitempty"`
	// Tags are tag names, resolved from the tags table (backend convenience;
	// the frontend resolves them via joins instead).
	Tags      []string  `json:"tags"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ---------------------------------------------------------------------------
// Test Plan
// ---------------------------------------------------------------------------

type TestPlan struct {
	ID          string         `json:"id"`
	Code        string         `json:"code"`
	Name        string         `json:"name"`
	Description *string        `json:"description"`
	Status      TestPlanStatus `json:"status"`
	ProjectID   string         `json:"projectId"`
	CreatedBy   *string        `json:"createdBy"`
	// CaseIDs is the ordered scope of test case IDs for the plan (backend
	// convenience, resolved from test_plan_cases).
	CaseIDs   []string  `json:"caseIds"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Tag struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	ProjectID string    `json:"projectId"`
	CreatedAt time.Time `json:"createdAt"`
}

type TestRole struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	ProjectID string    `json:"projectId"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ---------------------------------------------------------------------------
// Test Run & Test Result
// ---------------------------------------------------------------------------

type TestRunStatus string

const (
	RunInProgress TestRunStatus = "in_progress"
	RunCompleted  TestRunStatus = "completed"
)

type TestResultStatus string

const (
	ResultPass    TestResultStatus = "pass"
	ResultFail    TestResultStatus = "fail"
	ResultSkip    TestResultStatus = "skip"
	ResultBlocked TestResultStatus = "blocked"
	ResultNotRun  TestResultStatus = "not_run"
)

type TestRun struct {
	ID          string        `json:"id"`
	ProjectID   string        `json:"projectId"`
	TestPlanID  *string       `json:"testPlanId"`
	Code        string        `json:"code"`
	Name        string        `json:"name"`
	Status      TestRunStatus `json:"status"`
	StartedAt   time.Time     `json:"startedAt"`
	CompletedAt *time.Time    `json:"completedAt"`
	Notes       *string       `json:"notes"`
	StartedBy   *string       `json:"startedBy"`
	CreatedAt   time.Time     `json:"createdAt"`
	UpdatedAt   time.Time     `json:"updatedAt"`
}

// TestResult is a snapshot of the test case content as it was when the run
// started — the run screen displays this snapshot, never a live join, so a
// completed run's history stays accurate even if the source test case is
// edited or archived afterwards.
type TestResult struct {
	ID                     string           `json:"id"`
	TestRunID              string           `json:"testRunId"`
	TestCaseID             string           `json:"testCaseId"`
	TesterID               *string          `json:"testerId"`
	Status                 TestResultStatus `json:"status"`
	ExecutedAt             *time.Time       `json:"executedAt"`
	Notes                  *string          `json:"notes"`
	TestCaseCode           string           `json:"testCaseCode"`
	TestCaseTitle          string           `json:"testCaseTitle"`
	TestCaseObjective      *string          `json:"testCaseObjective"`
	TestCasePreconditions  *string          `json:"testCasePreconditions"`
	TestCaseSteps          string           `json:"testCaseSteps"`
	TestCaseExpectedResult string           `json:"testCaseExpectedResult"`
	TestCasePriority       TestCasePriority `json:"testCasePriority"`
	TestCaseNotes          *string          `json:"testCaseNotes"`
	// Order is a snapshot of test_plan_cases.order at the moment the run
	// started, so a run's item order always matches the plan's order then.
	Order     int       `json:"order"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type RunSummary struct {
	Pass    int `json:"pass"`
	Fail    int `json:"fail"`
	Skip    int `json:"skip"`
	Blocked int `json:"blocked"`
	NotRun  int `json:"notRun"`
	Total   int `json:"total"`
}

// ---------------------------------------------------------------------------
// Issue
// ---------------------------------------------------------------------------

type IssueStatus string

const (
	IssueBacklog    IssueStatus = "backlog"
	IssueOpen       IssueStatus = "open"
	IssueInProgress IssueStatus = "in_progress"
	IssueResolved   IssueStatus = "resolved"
	IssueVerified   IssueStatus = "verified"
	IssueClosed     IssueStatus = "closed"
	IssueRejected   IssueStatus = "rejected"
	IssueDuplicate  IssueStatus = "duplicate"
)

type TestPlanStatus string

const (
	PlanDraft     TestPlanStatus = "draft"
	PlanActive    TestPlanStatus = "active"
	PlanCompleted TestPlanStatus = "completed"
	PlanArchived  TestPlanStatus = "archived"
)

type IssueType string

const (
	IssueBug         IssueType = "bug"
	IssueFeature     IssueType = "feature"
	IssueImprovement IssueType = "improvement"
	IssueTask        IssueType = "task"
)

type IssuePriority string

const (
	IssuePriorityLow      IssuePriority = "low"
	IssuePriorityMedium   IssuePriority = "medium"
	IssuePriorityHigh     IssuePriority = "high"
	IssuePriorityCritical IssuePriority = "critical"
)

// Issue is project-level (not a child of exactly one TestResult) — it can
// stand alone (a feature request, a general finding) or be linked to any
// number of TestResults via the issue_test_results junction.
type Issue struct {
	ID             string        `json:"id"`
	Code           string        `json:"code"`
	ProjectID      string        `json:"projectId"`
	ModuleID       *string       `json:"moduleId"`
	Type           IssueType     `json:"type"`
	Title          string        `json:"title"`
	Description    *string       `json:"description"`
	ActualResult   *string       `json:"actualResult"`
	ExpectedResult *string       `json:"expectedResult"`
	Priority       IssuePriority `json:"priority"`
	Status         IssueStatus   `json:"status"`
	AssignedTo     *string       `json:"assignedTo"`
	TargetRoleID   *string       `json:"targetRoleId"`
	ExternalLinks  []ExternalLink `json:"externalLinks"`
	CreatedBy      *string       `json:"createdBy"`
	CreatedAt      time.Time     `json:"createdAt"`
	UpdatedAt      time.Time     `json:"updatedAt"`
}

// ---------------------------------------------------------------------------
// Profiles (public identity)
// ---------------------------------------------------------------------------

// Profile is the minimal public display identity used to render people in MCP
// responses. It mirrors the frontend profiles table — email/role intentionally
// stay out (they live in the private users table), so tool responses only
// ever expose the same public identity the app itself shows.
type Profile struct {
	ID          string  `json:"id"`
	Username    string  `json:"username"`
	DisplayName *string `json:"displayName"`
}

// ---------------------------------------------------------------------------
// Issue workflow context (issue.inspect / issue.can_close)
// ---------------------------------------------------------------------------

// IssueLink is one TestResult linked to an Issue via issue_test_results,
// resolved with its run and test-case context so a reader can judge the
// issue's current state without extra round-trips. TesterID is carried
// internally for actor resolution and is omitted from serialized output.
type IssueLink struct {
	TestResultID  string           `json:"testResultId"`
	Status        TestResultStatus `json:"status"`
	ExecutedAt    *time.Time       `json:"executedAt"`
	Notes         *string          `json:"notes"`
	TesterID      *string          `json:"-"`
	Tester        *Profile         `json:"tester,omitempty"`
	TestRunID     string           `json:"testRunId"`
	TestRunCode   string           `json:"testRunCode"`
	TestRunName   string           `json:"testRunName"`
	TestRunStatus TestRunStatus    `json:"testRunStatus"`
	TestCaseID    string           `json:"testCaseId"`
	TestCaseCode  string           `json:"testCaseCode"`
	TestCaseTitle string           `json:"testCaseTitle"`
}

// ActivityEntry is one row of entity_activity (a comment or a system event)
// for an entity, with its actor resolved for display. ActorID is carried
// internally for actor resolution and is omitted from serialized output.
type ActivityEntry struct {
	ID        string         `json:"id"`
	EventType string         `json:"eventType"`
	ActorID   string         `json:"-"`
	Actor     *Profile       `json:"actor,omitempty"`
	Payload   map[string]any `json:"payload"`
	CreatedAt time.Time      `json:"createdAt"`
}

// CreateActivityInput carries the fields needed to insert one row into
// entity_activity (a system event like a status transition). Comments use
// a separate path through the frontend's security-definer RPC.
type CreateActivityInput struct {
	ProjectID  string
	EntityType string
	EntityID   string
	ActorID    string
	EventType  string
	Payload    map[string]any
}

// AttachmentInfo is one entity_attachments row — metadata only, file bytes
// stay in storage and never travel through an MCP response.
type AttachmentInfo struct {
	ID          string    `json:"id"`
	FileName    string    `json:"fileName"`
	URL         string    `json:"url"`
	ContentType *string   `json:"contentType,omitempty"`
	FileSize    *int      `json:"fileSize,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
}

// CanCloseResult is the domain answer to "may this issue be closed now?". It
// is computed by IssueService (status rules + linked result health), never
// inferred by the client — the AI is expected to trust and echo it.
type CanCloseResult struct {
	CanClose      bool        `json:"canClose"`
	CurrentStatus IssueStatus `json:"currentStatus"`
	Reasons       []string    `json:"reasons"`
	Blockers      []string    `json:"blockers"`
}

// IssueInspect is the full context a QA agent needs to make a decision about
// one issue. testify.issue.inspect returns the whole aggregate in a single
// response so the agent never has to chain several CRUD calls.
type IssueInspect struct {
	Issue       Issue            `json:"issue"`
	Assignee    *Profile         `json:"assignee,omitempty"`
	Reporter    *Profile         `json:"reporter,omitempty"`
	Module      *Module          `json:"module,omitempty"`
	Tags        []string         `json:"tags"`
	Links       []IssueLink      `json:"links"`
	Activity    []ActivityEntry  `json:"activity"`
	Attachments []AttachmentInfo `json:"attachments"`
	CanClose    CanCloseResult   `json:"canClose"`
}

// ---------------------------------------------------------------------------
// Test run detail (testrun.summary)
// ---------------------------------------------------------------------------

// RunDetail is a test run with its on-the-fly summary and the individual
// result rows, returned by testify.testrun.summary.
type RunDetail struct {
	Run     TestRun      `json:"run"`
	Summary RunSummary   `json:"summary"`
	Results []TestResult `json:"results"`
}

// ---------------------------------------------------------------------------
// API Token
// ---------------------------------------------------------------------------

type TokenScope string

const (
	ScopeReadProject    TokenScope = "read:project"
	ScopeReadTestCase   TokenScope = "read:test-cases"
	ScopeReadTestPlan   TokenScope = "read:test-plans"
	ScopeReadTestRun    TokenScope = "read:test-runs"
	ScopeReadIssue      TokenScope = "read:issues"
	ScopeReadAutomation TokenScope = "read:automation"
	ScopeWriteTestCase  TokenScope = "write:test-cases"
	ScopeWriteTestPlan  TokenScope = "write:test-plans"
	ScopeWriteTestRun   TokenScope = "write:test-runs"
	ScopeWriteIssue     TokenScope = "write:issues"
	ScopeWriteAutomation TokenScope = "write:automation"
)

type APITokenIdentity struct {
	TokenID   string       `json:"tokenId"`
	ProjectID string       `json:"projectId"`
	Scopes    []TokenScope `json:"scopes"`
	// CreatedBy is the profile UUID of the token's creator — the human actor
	// behind automation-driven writes (map_script, enqueue, rerun_failed).
	// Populated by TokenRepo.Authenticate.
	CreatedBy string `json:"createdBy"`
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

type PageResult[T any] struct {
	Items      []T    `json:"items"`
	NextCursor string `json:"nextCursor"`
	HasMore    bool   `json:"hasMore"`
	Total      int    `json:"total"`
}

// ---------------------------------------------------------------------------
// Automation (Playwright local runner orchestration)
// ---------------------------------------------------------------------------

// AutomationRunner is a registered local runner that pulls jobs outbound and
// executes them against the app under test. Token hashes are never exposed in
// domain payloads — only the prefix is shown.
type AutomationRunner struct {
	ID          string     `json:"id"`
	ProjectID   string     `json:"projectId"`
	Name        string     `json:"name"`
	Labels      []string   `json:"labels"`
	TokenPrefix string     `json:"tokenPrefix"`
	Active      bool       `json:"active"`
	// LastSeenAt is updated by every heartbeat/poll/report call.
	LastSeenAt *time.Time `json:"lastSeenAt"`
	// Status is computed on read: "online" when active and last_seen_at is
	// within 90 seconds, otherwise "offline".
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// AutomationScript maps one Test Case to a local script reference (path/spec
// id). The executable script body never leaves the runner.
type AutomationScript struct {
	ID           string    `json:"id"`
	ProjectID    string    `json:"projectId"`
	TestCaseID   string    `json:"testCaseId"`
	ScriptRef    string    `json:"scriptRef"`
	RunnerLabels []string  `json:"runnerLabels"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type AutomationJobStatus string

const (
	JobQueued   AutomationJobStatus = "queued"
	JobRunning  AutomationJobStatus = "running"
	JobPassed   AutomationJobStatus = "passed"
	JobFailed   AutomationJobStatus = "failed"
	JobCanceled AutomationJobStatus = "canceled"
)

// AutomationJob is the unit of execution pulled by a runner. Its result lands
// in the corresponding test_results row.
type AutomationJob struct {
	ID             string             `json:"id"`
	ProjectID      string             `json:"projectId"`
	TestRunID      string             `json:"testRunId"`
	TestCaseID     string             `json:"testCaseId"`
	ScriptRef      string             `json:"scriptRef"`
	RequiredLabels []string           `json:"requiredLabels"`
	Status         AutomationJobStatus `json:"status"`
	Attempt        int                `json:"attempt"`
	MaxAttempts    int                `json:"maxAttempts"`
	RunnerID       *string            `json:"runnerId"`
	ErrorMessage   *string            `json:"errorMessage"`
	QueuedAt       time.Time          `json:"queuedAt"`
	StartedAt      *time.Time         `json:"startedAt"`
	FinishedAt     *time.Time         `json:"finishedAt"`
	CreatedAt      time.Time          `json:"createdAt"`
	UpdatedAt      time.Time          `json:"updatedAt"`
}

// AutomationEnqueueResult is returned by automation.enqueue.
type AutomationEnqueueResult struct {
	RunID    string `json:"runId"`
	RunCode  string `json:"runCode"`
	JobCount int    `json:"jobCount"`
}

// RerunFailedResult is returned by automation.rerun_failed. When the selected
// scope exceeds the safety limit and no explicit human confirmation was given,
// ConfirmationRequired is true and only the scope metadata is populated.
type RerunFailedResult struct {
	RunID                string `json:"runId"`
	RunCode              string `json:"runCode"`
	JobCount             int    `json:"jobCount"`
	SelectedCount        int    `json:"selectedCount"`
	SourceTestCaseID     string `json:"sourceTestCaseId"`
	ConfirmationRequired bool   `json:"confirmationRequired"`
	SelectionLimit       int    `json:"selectionLimit"`
}

// ---------------------------------------------------------------------------
// Analysis (on-demand metrics)
// ---------------------------------------------------------------------------

type AnalysisProblematicResult struct {
	TestResultID string            `json:"testResultId"`
	TestCaseID   string            `json:"testCaseId"`
	Code         *string           `json:"code"`
	Title        *string           `json:"title"`
	Priority     *TestCasePriority `json:"priority"`
	Status       TestResultStatus  `json:"status"`
}

// AnalysisRunSummary summarizes one regression run. All metrics are computed
// on demand — never cached.
type AnalysisRunSummary struct {
	Run                TestRun                       `json:"run"`
	PassRate           float64                       `json:"passRate"`
	FailureRate        float64                       `json:"failureRate"`
	ProblematicResults []AnalysisProblematicResult   `json:"problematicResults"`
}

type FlakyCandidate struct {
	TestCaseID      string           `json:"testCaseId"`
	Code            string           `json:"code"`
	Title           string           `json:"title"`
	Priority        TestCasePriority `json:"priority"`
	Executions      int64            `json:"executions"`
	PassCount       int64            `json:"passCount"`
	FailCount       int64            `json:"failCount"`
	Transitions     int64            `json:"transitions"`
	FlakinessScore  float64          `json:"flakinessScore"`
	LatestStatus    string           `json:"latestStatus"`
	LatestExecutedAt time.Time       `json:"latestExecutedAt"`
}

type RetestSuggestion struct {
	TestCaseID     string           `json:"testCaseId"`
	Code           string           `json:"code"`
	Title          string           `json:"title"`
	Priority       TestCasePriority `json:"priority"`
	LatestStatus   TestResultStatus `json:"latestStatus"`
	Score          float64          `json:"score"`
	Reasons        []string         `json:"reasons"`
	OpenIssueCount int64            `json:"openIssueCount"`
	FlakinessScore float64          `json:"flakinessScore"`
}

// ---------------------------------------------------------------------------
// Project Repository (source-code context for regression selection)
// ---------------------------------------------------------------------------

type RepositorySourceType string

const (
	RepoSourceLocalPath      RepositorySourceType = "local_path"
	RepoSourceGithubPublic   RepositorySourceType = "github_public"
	RepoSourceGithubPrivate  RepositorySourceType = "github_private"
	RepoSourceGitURL         RepositorySourceType = "git_url"
)

// ProjectRepositoryConfig is the scoped configuration of one project
// repository, including the decrypted Vault credential (never persisted or
// logged by consumers). The credential is used only to clone/fetch over
// HTTP(S) via a Basic auth git extra-header.
type ProjectRepositoryConfig struct {
	ID            string               `json:"id"`
	Name          string               `json:"name"`
	SourceType    RepositorySourceType `json:"sourceType"`
	URLOrPath     string               `json:"urlOrPath"`
	DefaultBranch *string              `json:"defaultBranch"`
	Subdirectory  *string              `json:"subdirectory"`
	Credential    *string              `json:"credential"`
}

// RepoFileChange is one entry of a repo.diff --name-status result.
type RepoFileChange struct {
	Status       string  `json:"status"`
	Path         string  `json:"path"`
	PreviousPath *string `json:"previousPath,omitempty"`
}

// RepoDiff is returned by repo.diff for regression selection.
type RepoDiff struct {
	Base      string          `json:"base"`
	Head      string          `json:"head"`
	Files     []RepoFileChange `json:"files"`
	Patch     string          `json:"patch"`
	Truncated bool            `json:"truncated"`
}

// RepoListFilesResult is returned by repo.list_files.
type RepoListFilesResult struct {
	RepositoryID string   `json:"repositoryId"`
	Files        []string `json:"files"`
	Truncated    bool     `json:"truncated"`
}

// RepoReadFileResult is returned by repo.read_file.
type RepoReadFileResult struct {
	RepositoryID string `json:"repositoryId"`
	Path         string `json:"path"`
	Content      string `json:"content"`
	Bytes        int    `json:"bytes"`
}

// RepoMatch is one repo.search hit.
type RepoMatch struct {
	Path string `json:"path"`
	Line int    `json:"line"`
	Text string `json:"text"`
}

// RepoSearchResult is returned by repo.search.
type RepoSearchResult struct {
	RepositoryID string      `json:"repositoryId"`
	Matches      []RepoMatch `json:"matches"`
	Truncated    bool        `json:"truncated"`
}
