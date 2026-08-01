package tools

import "testing"

func TestIsUUID(t *testing.T) {
	valid := []string{
		"123e4567-e89b-12d3-a456-426614174000",
		"00000000-0000-0000-0000-000000000000",
		"123e4567-e89b-42d3-a456-426614174000",
	}
	invalid := []string{
		"",
		"not-a-uuid",
		"123e4567e89b12d3a456426614174000",      // missing dashes
		"123e4567-e89b-12d3-a456-42661417400",   // too short
		"123e4567-e89b-12d3-a456-42661417400g",  // non-hex
		"123e4567-e89b-12d3-a456-4266141740000", // too long
	}

	for _, s := range valid {
		if !isUUID(s) {
			t.Errorf("isUUID(%q) = false, want true", s)
		}
	}
	for _, s := range invalid {
		if isUUID(s) {
			t.Errorf("isUUID(%q) = true, want false", s)
		}
	}
}

func TestValidPriority(t *testing.T) {
	valid := []string{"low", "medium", "high", "critical"}
	invalid := []string{"", "LOW", "urgent", "medium "}

	for _, s := range valid {
		if !validPriority(s) {
			t.Errorf("validPriority(%q) = false, want true", s)
		}
	}
	for _, s := range invalid {
		if validPriority(s) {
			t.Errorf("validPriority(%q) = true, want false", s)
		}
	}
}

func TestValidTestCaseStatus(t *testing.T) {
	valid := []string{"active", "archived"}
	invalid := []string{"", "draft", "ready", "ACTIVE"}

	for _, s := range valid {
		if !validTestCaseStatus(s) {
			t.Errorf("validTestCaseStatus(%q) = false, want true", s)
		}
	}
	for _, s := range invalid {
		if validTestCaseStatus(s) {
			t.Errorf("validTestCaseStatus(%q) = true, want false", s)
		}
	}
}

func TestValidRunStatus(t *testing.T) {
	valid := []string{"in_progress", "completed"}
	invalid := []string{"", "in-progress", "done", "IN_PROGRESS"}

	for _, s := range valid {
		if !validRunStatus(s) {
			t.Errorf("validRunStatus(%q) = false, want true", s)
		}
	}
	for _, s := range invalid {
		if validRunStatus(s) {
			t.Errorf("validRunStatus(%q) = true, want false", s)
		}
	}
}

func TestValidResultStatus(t *testing.T) {
	valid := []string{"pass", "fail", "skip", "blocked", "not_run"}
	invalid := []string{"", "passed", "error", "notrun", "PASS"}

	for _, s := range valid {
		if !validResultStatus(s) {
			t.Errorf("validResultStatus(%q) = false, want true", s)
		}
	}
	for _, s := range invalid {
		if validResultStatus(s) {
			t.Errorf("validResultStatus(%q) = true, want false", s)
		}
	}
}

func TestValidLimit(t *testing.T) {
	cases := []struct {
		in   int
		want int
	}{
		{0, 1},
		{-5, 1},
		{1, 1},
		{50, 50},
		{100, 100},
		{101, 100},
		{1000, 100},
	}

	for _, c := range cases {
		if got := validLimit(c.in); got != c.want {
			t.Errorf("validLimit(%d) = %d, want %d", c.in, got, c.want)
		}
	}
}

func TestValidIssueStatus(t *testing.T) {
	valid := []string{"backlog", "open", "in_progress", "resolved", "verified", "closed", "rejected", "duplicate"}
	invalid := []string{"", "OPEN", "pending", "done", "in-progress"}

	for _, s := range valid {
		if !validIssueStatus(s) {
			t.Errorf("validIssueStatus(%q) = false, want true", s)
		}
	}
	for _, s := range invalid {
		if validIssueStatus(s) {
			t.Errorf("validIssueStatus(%q) = true, want false", s)
		}
	}
}
