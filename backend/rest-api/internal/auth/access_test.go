package auth

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// newTestDB spins up an in-memory SQLite database with just the
// project_members columns this package touches. Kept intentionally minimal
// (no FKs to projects/profiles) — AccessRepository only ever queries this
// one table. See docs/ROADMAP_V3.md R3 for why SQLite instead of a real
// Postgres instance: this repository is written in plain GORM specifically
// so it's portable, and testing that portability is the point.
func newTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&projectMemberRow{}); err != nil {
		t.Fatalf("automigrate: %v", err)
	}
	return db
}

func seedMember(t *testing.T, db *gorm.DB, row projectMemberRow) {
	t.Helper()
	if err := db.Create(&row).Error; err != nil {
		t.Fatalf("seed member: %v", err)
	}
}

func TestAccessRepository_RoleFor_NoMembership(t *testing.T) {
	db := newTestDB(t)
	repo := NewAccessRepository(db)

	_, ok, err := repo.RoleFor(context.Background(), "proj1", "user1")
	if err != nil {
		t.Fatalf("RoleFor: %v", err)
	}
	if ok {
		t.Error("expected no membership")
	}
}

func TestAccessRepository_RoleFor_AcceptedMember(t *testing.T) {
	db := newTestDB(t)
	seedMember(t, db, projectMemberRow{ProjectID: "proj1", UserID: "user1", Role: "manager", Status: "accepted"})
	repo := NewAccessRepository(db)

	role, ok, err := repo.RoleFor(context.Background(), "proj1", "user1")
	if err != nil {
		t.Fatalf("RoleFor: %v", err)
	}
	if !ok || role != RoleManager {
		t.Errorf("role = %q, ok = %v, want manager/true", role, ok)
	}
}

func TestAccessRepository_RoleFor_InvitedNotAccepted(t *testing.T) {
	// Mirrors has_project_access()'s status = 'accepted' filter — an invited
	// (not yet accepted) member must not be treated as having access.
	db := newTestDB(t)
	seedMember(t, db, projectMemberRow{ProjectID: "proj1", UserID: "user1", Role: "manager", Status: "invited"})
	repo := NewAccessRepository(db)

	_, ok, err := repo.RoleFor(context.Background(), "proj1", "user1")
	if err != nil {
		t.Fatalf("RoleFor: %v", err)
	}
	if ok {
		t.Error("invited (not accepted) membership should not grant access")
	}
}

func TestAccessRepository_HasAccess(t *testing.T) {
	db := newTestDB(t)
	seedMember(t, db, projectMemberRow{ProjectID: "proj1", UserID: "user1", Role: "member", Status: "accepted"})
	repo := NewAccessRepository(db)

	ok, err := repo.HasAccess(context.Background(), "proj1", "user1")
	if err != nil {
		t.Fatalf("HasAccess: %v", err)
	}
	if !ok {
		t.Error("expected access for accepted member")
	}

	ok, err = repo.HasAccess(context.Background(), "proj1", "stranger")
	if err != nil {
		t.Fatalf("HasAccess: %v", err)
	}
	if ok {
		t.Error("expected no access for non-member")
	}
}

func TestAccessRepository_CanEditContent(t *testing.T) {
	db := newTestDB(t)
	seedMember(t, db, projectMemberRow{ProjectID: "proj1", UserID: "manager1", Role: "manager", Status: "accepted"})
	seedMember(t, db, projectMemberRow{ProjectID: "proj1", UserID: "supervisor1", Role: "supervisor", Status: "accepted"})
	seedMember(t, db, projectMemberRow{ProjectID: "proj1", UserID: "tester1", Role: "tester", Status: "accepted"})
	seedMember(t, db, projectMemberRow{ProjectID: "proj1", UserID: "member1", Role: "member", Status: "accepted"})
	repo := NewAccessRepository(db)

	cases := []struct {
		userID string
		want   bool
	}{
		{"manager1", true},
		{"supervisor1", true},
		{"tester1", false},
		{"member1", false},
	}
	for _, tc := range cases {
		got, err := repo.CanEditContent(context.Background(), "proj1", tc.userID)
		if err != nil {
			t.Fatalf("CanEditContent(%s): %v", tc.userID, err)
		}
		if got != tc.want {
			t.Errorf("CanEditContent(%s) = %v, want %v", tc.userID, got, tc.want)
		}
	}
}

func TestAccessRepository_IsManager(t *testing.T) {
	db := newTestDB(t)
	seedMember(t, db, projectMemberRow{ProjectID: "proj1", UserID: "manager1", Role: "manager", Status: "accepted"})
	seedMember(t, db, projectMemberRow{ProjectID: "proj1", UserID: "supervisor1", Role: "supervisor", Status: "accepted"})
	repo := NewAccessRepository(db)

	ok, err := repo.IsManager(context.Background(), "proj1", "manager1")
	if err != nil || !ok {
		t.Errorf("IsManager(manager1) = %v, %v, want true, nil", ok, err)
	}
	ok, err = repo.IsManager(context.Background(), "proj1", "supervisor1")
	if err != nil || ok {
		t.Errorf("IsManager(supervisor1) = %v, %v, want false, nil", ok, err)
	}
}

func TestAccessRepository_ScopedPerProject(t *testing.T) {
	// A manager in one project must not be treated as having any role in a
	// different project — RoleFor filters on project_id, not just user_id.
	db := newTestDB(t)
	seedMember(t, db, projectMemberRow{ProjectID: "proj1", UserID: "user1", Role: "manager", Status: "accepted"})
	repo := NewAccessRepository(db)

	_, ok, err := repo.RoleFor(context.Background(), "proj2", "user1")
	if err != nil {
		t.Fatalf("RoleFor: %v", err)
	}
	if ok {
		t.Error("membership in proj1 should not grant access to proj2")
	}
}
