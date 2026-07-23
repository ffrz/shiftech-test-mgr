package model

// TestCaseSnapshotRow is a narrow read-only projection of test_cases used
// only to seed test_results snapshots when a Test Run starts -- this
// package deliberately does NOT depend on the (separately-owned) testcase
// module's model, since TestCase CRUD is out of scope for this module (see
// task constraints); it only ever reads the columns it needs.
type TestCaseSnapshotRow struct {
	ID             string `gorm:"column:id"`
	Code           string `gorm:"column:code"`
	Title          string `gorm:"column:title"`
	Objective      string `gorm:"column:objective"`
	Preconditions  string `gorm:"column:preconditions"`
	Steps          string `gorm:"column:steps"`
	ExpectedResult string `gorm:"column:expected_result"`
	Priority       string `gorm:"column:priority"`
	StepType       string `gorm:"column:step_type"`
}

func (TestCaseSnapshotRow) TableName() string { return "test_cases" }

type TestCaseStepSnapshotRow struct {
	ID         string `gorm:"column:id"`
	TestCaseID string `gorm:"column:test_case_id"`
}

func (TestCaseStepSnapshotRow) TableName() string { return "test_case_steps" }
