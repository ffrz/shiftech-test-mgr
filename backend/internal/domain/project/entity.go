package project

import "time"

type Status string

const (
	StatusActive   Status = "active"
	StatusInactive Status = "inactive"
	StatusArchived Status = "archived"
)

// Project is the top-level container for all test management data for a
// given effort — see ARCHITECTURE.md §4.
type Project struct {
	ID          string
	Name        string
	Description string
	Status      Status
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type SortField string

const (
	SortByName      SortField = "name"
	SortByCreatedAt SortField = "createdAt"
	SortByUpdatedAt SortField = "updatedAt"
)

type SortDirection string

const (
	SortAsc  SortDirection = "asc"
	SortDesc SortDirection = "desc"
)

// Query mirrors the frontend's ProjectQuery (projectRepository.ts) —
// search/status filter/sort all happen in the database, not in application
// code, matching the existing behavior.
type Query struct {
	Search        string
	Status        Status // empty means "all"
	SortField     SortField
	SortDirection SortDirection
}
