package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/shiftech/testify-platform/core"
)

// ---------------------------------------------------------------------------
// mock repos — minimal function-field mocks per interface
// ---------------------------------------------------------------------------

type mockProjectRepo struct {
	list func(ctx context.Context, filter core.ProjectFilter) ([]core.Project, error)
	get  func(ctx context.Context, id string) (*core.Project, error)
}

func TestIssueService_AddComment_TrimsAndNotifiesUniqueMentions(t *testing.T) {
	issueRepo := &mockIssueRepo{get: func(context.Context, string) (*core.Issue, error) {
		return &core.Issue{ID: "123e4567-e89b-12d3-a456-426614174006", ProjectID: "p1", Title: "Bug"}, nil
	}}
	profiles := &mockProfileRepo{
		getMany: func(context.Context, []string) (map[string]core.Profile, error) {
			return map[string]core.Profile{"actor1": {ID: "actor1", Username: "author"}}, nil
		},
		getByUsername: func(_ context.Context, username string) (*core.Profile, error) {
			switch strings.ToLower(username) {
			case "alice":
				return &core.Profile{ID: "alice-id", Username: "alice"}, nil
			case "author":
				return &core.Profile{ID: "actor1", Username: "author"}, nil
			default:
				return nil, nil
			}
		},
	}
	var created core.CreateActivityInput
	activity := &mockActivityRepo{create: func(_ context.Context, input core.CreateActivityInput) error {
		created = input
		return nil
	}}
	var notifications []core.CreateNotificationInput
	notificationRepo := &mockNotificationRepo{create: func(_ context.Context, input core.CreateNotificationInput) error {
		notifications = append(notifications, input)
		return nil
	}}
	s := NewIssueService(issueRepo, IssueContextSources{
		Profiles: profiles, Activity: activity, Attachments: &mockAttachmentRepo{}, Notifications: notificationRepo,
	})

	entry, err := s.AddComment(context.Background(), "p1", "123e4567-e89b-12d3-a456-426614174006", "actor1", "  Hi @Alice @alice @author @missing  ", nil)
	if err != nil {
		t.Fatalf("AddComment: %v", err)
	}
	if entry.EventType != "comment" || created.Payload["body"] != "Hi @Alice @alice @author @missing" {
		t.Fatalf("created comment = %+v", created)
	}
	if len(notifications) != 1 || notifications[0].UserID != "alice-id" || notifications[0].Type != "mention" {
		t.Fatalf("notifications = %+v, want one mention for alice", notifications)
	}
}

func (m *mockProjectRepo) List(ctx context.Context, filter core.ProjectFilter) ([]core.Project, error) {
	return m.list(ctx, filter)
}
func (m *mockProjectRepo) Get(ctx context.Context, id string) (*core.Project, error) {
	return m.get(ctx, id)
}

type mockTestCaseRepo struct {
	list       func(ctx context.Context, filter core.TestCaseFilter) (*core.PageResult[core.TestCase], error)
	get        func(ctx context.Context, id string) (*core.TestCase, error)
	create     func(ctx context.Context, input core.CreateTestCaseInput) (*core.TestCase, error)
	update     func(ctx context.Context, id string, input core.UpdateTestCaseInput) (*core.TestCase, error)
	duplicate  func(ctx context.Context, id, newTitle string) (*core.TestCase, error)
	archive    func(ctx context.Context, id string) error
	reactivate func(ctx context.Context, id string) error
}

func (m *mockTestCaseRepo) List(ctx context.Context, filter core.TestCaseFilter) (*core.PageResult[core.TestCase], error) {
	return m.list(ctx, filter)
}
func (m *mockTestCaseRepo) Get(ctx context.Context, id string) (*core.TestCase, error) {
	return m.get(ctx, id)
}
func (m *mockTestCaseRepo) Create(ctx context.Context, input core.CreateTestCaseInput) (*core.TestCase, error) {
	return m.create(ctx, input)
}
func (m *mockTestCaseRepo) Update(ctx context.Context, id string, input core.UpdateTestCaseInput) (*core.TestCase, error) {
	return m.update(ctx, id, input)
}
func (m *mockTestCaseRepo) Duplicate(ctx context.Context, id, newTitle string) (*core.TestCase, error) {
	return m.duplicate(ctx, id, newTitle)
}
func (m *mockTestCaseRepo) Archive(ctx context.Context, id string) error {
	return m.archive(ctx, id)
}
func (m *mockTestCaseRepo) Reactivate(ctx context.Context, id string) error {
	if m.reactivate != nil {
		return m.reactivate(ctx, id)
	}
	return nil
}

type mockTestPlanRepo struct {
	list         func(ctx context.Context, filter core.TestPlanFilter) (*core.PageResult[core.TestPlan], error)
	get          func(ctx context.Context, id string) (*core.TestPlan, error)
	create       func(ctx context.Context, input core.CreateTestPlanInput) (*core.TestPlan, error)
	addCases     func(ctx context.Context, planID string, caseIDs []string) error
	removeCases  func(ctx context.Context, planID string, caseIDs []string) error
	approve      func(ctx context.Context, id, approverID string) error
	changeStatus func(ctx context.Context, id string, status core.TestPlanStatus) error
}

func (m *mockTestPlanRepo) List(ctx context.Context, filter core.TestPlanFilter) (*core.PageResult[core.TestPlan], error) {
	return m.list(ctx, filter)
}
func (m *mockTestPlanRepo) Get(ctx context.Context, id string) (*core.TestPlan, error) {
	return m.get(ctx, id)
}
func (m *mockTestPlanRepo) Create(ctx context.Context, input core.CreateTestPlanInput) (*core.TestPlan, error) {
	return m.create(ctx, input)
}
func (m *mockTestPlanRepo) AddCases(ctx context.Context, planID string, caseIDs []string) error {
	return m.addCases(ctx, planID, caseIDs)
}
func (m *mockTestPlanRepo) RemoveCases(ctx context.Context, planID string, caseIDs []string) error {
	return m.removeCases(ctx, planID, caseIDs)
}
func (m *mockTestPlanRepo) Approve(ctx context.Context, id, approverID string) error {
	return m.approve(ctx, id, approverID)
}
func (m *mockTestPlanRepo) ChangeStatus(ctx context.Context, id string, status core.TestPlanStatus) error {
	if m.changeStatus != nil {
		return m.changeStatus(ctx, id, status)
	}
	return nil
}

type mockTestRunRepo struct {
	list         func(ctx context.Context, filter core.TestRunFilter) (*core.PageResult[core.TestRun], error)
	get          func(ctx context.Context, id string) (*core.TestRun, error)
	create       func(ctx context.Context, input core.CreateTestRunInput) (*core.TestRun, error)
	recordResult func(ctx context.Context, resultID string, input core.RecordResultInput) error
	complete     func(ctx context.Context, id string) error
	reopen       func(ctx context.Context, id string) error
	summary      func(ctx context.Context, id string) (*core.RunSummary, error)
}

func (m *mockTestRunRepo) List(ctx context.Context, filter core.TestRunFilter) (*core.PageResult[core.TestRun], error) {
	return m.list(ctx, filter)
}
func (m *mockTestRunRepo) Get(ctx context.Context, id string) (*core.TestRun, error) {
	return m.get(ctx, id)
}
func (m *mockTestRunRepo) Create(ctx context.Context, input core.CreateTestRunInput) (*core.TestRun, error) {
	return m.create(ctx, input)
}
func (m *mockTestRunRepo) RecordResult(ctx context.Context, resultID string, input core.RecordResultInput) error {
	return m.recordResult(ctx, resultID, input)
}
func (m *mockTestRunRepo) Complete(ctx context.Context, id string) error {
	return m.complete(ctx, id)
}
func (m *mockTestRunRepo) Reopen(ctx context.Context, id string) error {
	if m.reopen != nil {
		return m.reopen(ctx, id)
	}
	return nil
}
func (m *mockTestRunRepo) Summary(ctx context.Context, id string) (*core.RunSummary, error) {
	return m.summary(ctx, id)
}

type mockIssueRepo struct {
	list         func(ctx context.Context, filter core.IssueFilter) (*core.PageResult[core.Issue], error)
	get          func(ctx context.Context, id string) (*core.Issue, error)
	create       func(ctx context.Context, input core.CreateIssueInput) (*core.Issue, error)
	updateStatus func(ctx context.Context, id string, status core.IssueStatus) error
	assign       func(ctx context.Context, id string, assignedTo *string) error
	getByCode    func(ctx context.Context, projectID, code string) (*core.Issue, error)
	listLinks    func(ctx context.Context, issueID string) ([]core.IssueLink, error)
	listTagNames func(ctx context.Context, issueID string) ([]string, error)
}

func (m *mockIssueRepo) List(ctx context.Context, filter core.IssueFilter) (*core.PageResult[core.Issue], error) {
	return m.list(ctx, filter)
}
func (m *mockIssueRepo) Get(ctx context.Context, id string) (*core.Issue, error) {
	return m.get(ctx, id)
}
func (m *mockIssueRepo) Create(ctx context.Context, input core.CreateIssueInput) (*core.Issue, error) {
	return m.create(ctx, input)
}
func (m *mockIssueRepo) UpdateStatus(ctx context.Context, id string, status core.IssueStatus) error {
	return m.updateStatus(ctx, id, status)
}
func (m *mockIssueRepo) Assign(ctx context.Context, id string, assignedTo *string) error {
	if m.assign != nil {
		return m.assign(ctx, id, assignedTo)
	}
	return nil
}
func (m *mockIssueRepo) GetByCode(ctx context.Context, projectID, code string) (*core.Issue, error) {
	if m.getByCode != nil {
		return m.getByCode(ctx, projectID, code)
	}
	return nil, fmt.Errorf("GetByCode not implemented")
}
func (m *mockIssueRepo) ListLinks(ctx context.Context, issueID string) ([]core.IssueLink, error) {
	if m.listLinks != nil {
		return m.listLinks(ctx, issueID)
	}
	return nil, nil
}
func (m *mockIssueRepo) ListTagNames(ctx context.Context, issueID string) ([]string, error) {
	if m.listTagNames != nil {
		return m.listTagNames(ctx, issueID)
	}
	return nil, nil
}

type mockProfileRepo struct {
	getMany       func(ctx context.Context, ids []string) (map[string]core.Profile, error)
	getByUsername func(ctx context.Context, username string) (*core.Profile, error)
}

func (m *mockProfileRepo) GetByUsername(ctx context.Context, username string) (*core.Profile, error) {
	if m.getByUsername != nil {
		return m.getByUsername(ctx, username)
	}
	return nil, nil
}

func (m *mockProfileRepo) GetMany(ctx context.Context, ids []string) (map[string]core.Profile, error) {
	if m.getMany != nil {
		return m.getMany(ctx, ids)
	}
	return map[string]core.Profile{}, nil
}

type mockActivityRepo struct {
	listForEntity       func(ctx context.Context, projectID, entityType, entityID string, limit int) ([]core.ActivityEntry, error)
	getCommentForEntity func(ctx context.Context, projectID, entityType, entityID, commentID string) (*core.ActivityEntry, error)
	create              func(ctx context.Context, input core.CreateActivityInput) error
}

func (m *mockActivityRepo) GetCommentForEntity(ctx context.Context, projectID, entityType, entityID, commentID string) (*core.ActivityEntry, error) {
	if m.getCommentForEntity != nil {
		return m.getCommentForEntity(ctx, projectID, entityType, entityID, commentID)
	}
	return &core.ActivityEntry{ID: commentID, EventType: "comment"}, nil
}

func (m *mockActivityRepo) ListForEntity(ctx context.Context, projectID, entityType, entityID string, limit int) ([]core.ActivityEntry, error) {
	if m.listForEntity != nil {
		return m.listForEntity(ctx, projectID, entityType, entityID, limit)
	}
	return nil, nil
}

func (m *mockActivityRepo) Create(ctx context.Context, input core.CreateActivityInput) error {
	if m.create != nil {
		return m.create(ctx, input)
	}
	return nil
}

func (m *mockActivityRepo) CreateComment(ctx context.Context, input core.CreateActivityInput) (*core.ActivityEntry, error) {
	if m.create != nil {
		if err := m.create(ctx, input); err != nil {
			return nil, err
		}
	}
	return &core.ActivityEntry{ID: "comment-1", EventType: "comment", ActorID: input.ActorID, Payload: input.Payload, ParentCommentID: input.ParentCommentID}, nil
}

type mockAttachmentRepo struct {
	listForEntity func(ctx context.Context, projectID, entityType, entityID string) ([]core.AttachmentInfo, error)
}

func (m *mockAttachmentRepo) ListForEntity(ctx context.Context, projectID, entityType, entityID string) ([]core.AttachmentInfo, error) {
	if m.listForEntity != nil {
		return m.listForEntity(ctx, projectID, entityType, entityID)
	}
	return nil, nil
}

type mockNotificationRepo struct {
	create func(ctx context.Context, input core.CreateNotificationInput) error
}

func (m *mockNotificationRepo) Create(ctx context.Context, input core.CreateNotificationInput) error {
	if m.create != nil {
		return m.create(ctx, input)
	}
	return nil
}

func newTestIssueContextSources() IssueContextSources {
	return IssueContextSources{
		Profiles:      &mockProfileRepo{},
		Activity:      &mockActivityRepo{},
		Attachments:   &mockAttachmentRepo{},
		Notifications: &mockNotificationRepo{},
	}
}

type mockModuleRepo struct {
	listByProject func(ctx context.Context, projectID string) ([]core.Module, error)
	get           func(ctx context.Context, id string) (*core.Module, error)
	create        func(ctx context.Context, projectID, name string, code *string) (*core.Module, error)
	update        func(ctx context.Context, id, name, code string) (*core.Module, error)
	delete        func(ctx context.Context, id string) error
}

func (m *mockModuleRepo) ListByProject(ctx context.Context, projectID string) ([]core.Module, error) {
	return m.listByProject(ctx, projectID)
}
func (m *mockModuleRepo) Get(ctx context.Context, id string) (*core.Module, error) {
	return m.get(ctx, id)
}
func (m *mockModuleRepo) Create(ctx context.Context, projectID, name string, code *string) (*core.Module, error) {
	return m.create(ctx, projectID, name, code)
}
func (m *mockModuleRepo) Update(ctx context.Context, id, name, code string) (*core.Module, error) {
	return m.update(ctx, id, name, code)
}
func (m *mockModuleRepo) Delete(ctx context.Context, id string) error { return m.delete(ctx, id) }

type mockTagRepo struct {
	listByProject func(ctx context.Context, projectID string) ([]core.Tag, error)
	get           func(ctx context.Context, id string) (*core.Tag, error)
	findOrCreate  func(ctx context.Context, projectID, name string) (*core.Tag, error)
	update        func(ctx context.Context, id, name string) (*core.Tag, error)
	delete        func(ctx context.Context, id string) error
}

func (m *mockTagRepo) ListByProject(ctx context.Context, projectID string) ([]core.Tag, error) {
	return m.listByProject(ctx, projectID)
}
func (m *mockTagRepo) Get(ctx context.Context, id string) (*core.Tag, error) {
	return m.get(ctx, id)
}
func (m *mockTagRepo) FindOrCreate(ctx context.Context, projectID, name string) (*core.Tag, error) {
	return m.findOrCreate(ctx, projectID, name)
}
func (m *mockTagRepo) Update(ctx context.Context, id, name string) (*core.Tag, error) {
	return m.update(ctx, id, name)
}
func (m *mockTagRepo) Delete(ctx context.Context, id string) error { return m.delete(ctx, id) }

type mockTestRoleRepo struct {
	listByProject func(ctx context.Context, projectID string) ([]core.TestRole, error)
	get           func(ctx context.Context, id string) (*core.TestRole, error)
	create        func(ctx context.Context, projectID, name string) (*core.TestRole, error)
	update        func(ctx context.Context, id, name string) (*core.TestRole, error)
	delete        func(ctx context.Context, id string) error
}

func (m *mockTestRoleRepo) ListByProject(ctx context.Context, projectID string) ([]core.TestRole, error) {
	return m.listByProject(ctx, projectID)
}
func (m *mockTestRoleRepo) Get(ctx context.Context, id string) (*core.TestRole, error) {
	return m.get(ctx, id)
}
func (m *mockTestRoleRepo) Create(ctx context.Context, projectID, name string) (*core.TestRole, error) {
	return m.create(ctx, projectID, name)
}
func (m *mockTestRoleRepo) Update(ctx context.Context, id, name string) (*core.TestRole, error) {
	return m.update(ctx, id, name)
}
func (m *mockTestRoleRepo) Delete(ctx context.Context, id string) error { return m.delete(ctx, id) }

type mockTestResultRepo struct {
	list       func(ctx context.Context, filter core.TestResultFilter) (*core.PageResult[core.TestResult], error)
	get        func(ctx context.Context, id string) (*core.TestResult, error)
	listSteps  func(ctx context.Context, projectID, runID string) ([]core.TestResultStep, error)
	recordStep func(ctx context.Context, projectID, stepResultID string, input core.RecordStepResultInput) (*core.TestResultStep, error)
}

func (m *mockTestResultRepo) List(ctx context.Context, filter core.TestResultFilter) (*core.PageResult[core.TestResult], error) {
	return m.list(ctx, filter)
}
func (m *mockTestResultRepo) Get(ctx context.Context, id string) (*core.TestResult, error) {
	return m.get(ctx, id)
}

func (m *mockTestResultRepo) ListStepsForRun(ctx context.Context, projectID, runID string) ([]core.TestResultStep, error) {
	if m.listSteps == nil {
		return nil, nil
	}
	return m.listSteps(ctx, projectID, runID)
}

func (m *mockTestResultRepo) RecordStep(ctx context.Context, projectID, stepResultID string, input core.RecordStepResultInput) (*core.TestResultStep, error) {
	if m.recordStep == nil {
		return nil, errors.New("not used")
	}
	return m.recordStep(ctx, projectID, stepResultID, input)
}

// ---------------------------------------------------------------------------
// ProjectService
// ---------------------------------------------------------------------------

func TestProjectServiceList(t *testing.T) {
	want := []core.Project{{ID: "p1", Name: "Amanah POS"}}
	m := &mockProjectRepo{list: func(ctx context.Context, filter core.ProjectFilter) ([]core.Project, error) {
		return want, nil
	}}
	s := NewProjectService(m)
	got, err := s.List(context.Background(), core.ProjectFilter{})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 1 || got[0].ID != "p1" {
		t.Errorf("List = %+v, want %+v", got, want)
	}
}

func TestProjectServiceListPropagatesError(t *testing.T) {
	sentinel := errors.New("boom")
	m := &mockProjectRepo{list: func(ctx context.Context, filter core.ProjectFilter) ([]core.Project, error) {
		return nil, sentinel
	}}
	s := NewProjectService(m)
	if _, err := s.List(context.Background(), core.ProjectFilter{}); !errors.Is(err, sentinel) {
		t.Errorf("List error = %v, want sentinel", err)
	}
}

func TestProjectServiceGet(t *testing.T) {
	want := &core.Project{ID: "p1", Name: "Amanah POS"}
	m := &mockProjectRepo{get: func(ctx context.Context, id string) (*core.Project, error) {
		return want, nil
	}}
	s := NewProjectService(m)
	got, err := s.Get(context.Background(), "p1")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got != want {
		t.Errorf("Get = %+v, want %+v", got, want)
	}
}

// ---------------------------------------------------------------------------
// TestCaseService
// ---------------------------------------------------------------------------

func TestTestCaseServicePassthrough(t *testing.T) {
	want := &core.PageResult[core.TestCase]{Items: []core.TestCase{{ID: "tc1"}}, Total: 1}
	called := false
	m := &mockTestCaseRepo{list: func(ctx context.Context, filter core.TestCaseFilter) (*core.PageResult[core.TestCase], error) {
		called = true
		if filter.ProjectID != "p1" {
			t.Errorf("filter.ProjectID = %q, want p1", filter.ProjectID)
		}
		return want, nil
	}}
	s := NewTestCaseService(m, &mockActivityRepo{})
	got, err := s.List(context.Background(), core.TestCaseFilter{ProjectID: "p1"})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if !called {
		t.Fatal("List did not call repo")
	}
	if got.Total != 1 {
		t.Errorf("List.Total = %d, want 1", got.Total)
	}
}

func TestTestCaseServiceGetAndCreate(t *testing.T) {
	tc := &core.TestCase{ID: "tc1", Title: "Login"}
	m := &mockTestCaseRepo{
		get: func(ctx context.Context, id string) (*core.TestCase, error) {
			return tc, nil
		},
		create: func(ctx context.Context, input core.CreateTestCaseInput) (*core.TestCase, error) {
			return tc, nil
		},
	}
	s := NewTestCaseService(m, &mockActivityRepo{})

	got, err := s.Get(context.Background(), "tc1")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got != tc {
		t.Errorf("Get = %+v, want %+v", got, tc)
	}

	created, err := s.Create(context.Background(), core.CreateTestCaseInput{ProjectID: "p1", Title: "Login"})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if created != tc {
		t.Errorf("Create = %+v, want %+v", created, tc)
	}
}

func TestTestCaseServiceUpdateDuplicateArchive(t *testing.T) {
	var updatedID, dupID, archivedID string
	m := &mockTestCaseRepo{
		get: func(ctx context.Context, id string) (*core.TestCase, error) {
			return &core.TestCase{ID: id, Status: core.TestCaseStatusActive}, nil
		},
		update: func(ctx context.Context, id string, input core.UpdateTestCaseInput) (*core.TestCase, error) {
			updatedID = id
			return &core.TestCase{ID: id}, nil
		},
		duplicate: func(ctx context.Context, id, newTitle string) (*core.TestCase, error) {
			dupID = id
			return &core.TestCase{ID: id}, nil
		},
		archive: func(ctx context.Context, id string) error {
			archivedID = id
			return nil
		},
	}
	s := NewTestCaseService(m, &mockActivityRepo{})

	if _, err := s.Update(context.Background(), "tc-1", core.UpdateTestCaseInput{}); err != nil {
		t.Fatalf("Update: %v", err)
	}
	if _, err := s.Duplicate(context.Background(), "tc-2", "Copy"); err != nil {
		t.Fatalf("Duplicate: %v", err)
	}
	if err := s.Archive(context.Background(), "tc-3", "actor1", "p1"); err != nil {
		t.Fatalf("Archive: %v", err)
	}
	if updatedID != "tc-1" || dupID != "tc-2" || archivedID != "tc-3" {
		t.Errorf("ids = %q/%q/%q, want tc-1/tc-2/tc-3", updatedID, dupID, archivedID)
	}
}

func TestTestCaseServiceArchivePropagatesError(t *testing.T) {
	sentinel := errors.New("boom")
	m := &mockTestCaseRepo{
		get: func(ctx context.Context, id string) (*core.TestCase, error) {
			return &core.TestCase{ID: id, Status: core.TestCaseStatusActive}, nil
		},
		archive: func(ctx context.Context, id string) error { return sentinel },
	}
	s := NewTestCaseService(m, &mockActivityRepo{})
	if err := s.Archive(context.Background(), "tc-1", "actor1", "p1"); !errors.Is(err, sentinel) {
		t.Errorf("Archive error = %v, want sentinel", err)
	}
}

func TestTestCaseServiceArchive_NoopWhenAlreadyArchived(t *testing.T) {
	archiveCalled := false
	m := &mockTestCaseRepo{
		get: func(ctx context.Context, id string) (*core.TestCase, error) {
			return &core.TestCase{ID: id, Status: core.TestCaseStatusArchived}, nil
		},
		archive: func(ctx context.Context, id string) error {
			archiveCalled = true
			return nil
		},
	}
	s := NewTestCaseService(m, &mockActivityRepo{})
	if err := s.Archive(context.Background(), "tc-1", "actor1", "p1"); err != nil {
		t.Fatalf("Archive: %v", err)
	}
	if archiveCalled {
		t.Error("Archive repo call should not happen when already archived")
	}
}

// ---------------------------------------------------------------------------
// TestPlanService
// ---------------------------------------------------------------------------

func TestTestPlanServiceListGet(t *testing.T) {
	plan := &core.TestPlan{ID: "plan1", Name: "Sprint 1"}
	m := &mockTestPlanRepo{
		list: func(ctx context.Context, filter core.TestPlanFilter) (*core.PageResult[core.TestPlan], error) {
			return &core.PageResult[core.TestPlan]{Items: []core.TestPlan{*plan}, Total: 1}, nil
		},
		get: func(ctx context.Context, id string) (*core.TestPlan, error) {
			return plan, nil
		},
	}
	s := NewTestPlanService(m, nil, &mockActivityRepo{})

	res, err := s.List(context.Background(), core.TestPlanFilter{ProjectID: "p1"})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if res.Total != 1 || res.Items[0].Name != "Sprint 1" {
		t.Errorf("List = %+v", res)
	}

	got, err := s.Get(context.Background(), "plan1")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got != plan {
		t.Errorf("Get = %+v, want %+v", got, plan)
	}
}

func TestTestPlanServiceExecutionContextPreservesCaseOrderAndDetails(t *testing.T) {
	planRepo := &mockTestPlanRepo{get: func(context.Context, string) (*core.TestPlan, error) {
		return &core.TestPlan{ID: "plan1", ProjectID: "p1", CaseIDs: []string{"case2", "case1"}}, nil
	}}
	caseRepo := &mockTestCaseRepo{get: func(_ context.Context, id string) (*core.TestCase, error) {
		return &core.TestCase{
			ID: id, ProjectID: "p1", Title: id,
			DetailedSteps: []core.TestCaseStep{{ID: id + "-step", StepNumber: 1, Action: "act"}},
		}, nil
	}}
	s := NewTestPlanService(planRepo, caseRepo, &mockActivityRepo{})

	got, err := s.ExecutionContext(context.Background(), "plan1")
	if err != nil {
		t.Fatalf("ExecutionContext: %v", err)
	}
	if len(got.Cases) != 2 || got.Cases[0].ID != "case2" || got.Cases[1].ID != "case1" {
		t.Fatalf("Cases = %+v, want plan order case2,case1", got.Cases)
	}
	if len(got.Cases[0].DetailedSteps) != 1 {
		t.Fatalf("DetailedSteps = %+v, want one full step", got.Cases[0].DetailedSteps)
	}
}

func TestTestPlanServiceCreateAddRemoveApprove(t *testing.T) {
	var addPlanID, removePlanID, approvePlanID, approveUser string
	m := &mockTestPlanRepo{
		create: func(ctx context.Context, input core.CreateTestPlanInput) (*core.TestPlan, error) {
			return &core.TestPlan{ID: "plan1", Name: input.Name}, nil
		},
		addCases: func(ctx context.Context, planID string, caseIDs []string) error {
			addPlanID = planID
			return nil
		},
		removeCases: func(ctx context.Context, planID string, caseIDs []string) error {
			removePlanID = planID
			return nil
		},
		approve: func(ctx context.Context, id, approverID string) error {
			approvePlanID = id
			approveUser = approverID
			return nil
		},
	}
	s := NewTestPlanService(m, nil, &mockActivityRepo{})

	created, err := s.Create(context.Background(), core.CreateTestPlanInput{ProjectID: "p1", Name: "Sprint 1"})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if created.Name != "Sprint 1" {
		t.Errorf("Create.Name = %q", created.Name)
	}

	if err := s.AddCases(context.Background(), "plan1", []string{"tc1", "tc2"}); err != nil {
		t.Fatalf("AddCases: %v", err)
	}
	if err := s.RemoveCases(context.Background(), "plan1", []string{"tc1"}); err != nil {
		t.Fatalf("RemoveCases: %v", err)
	}
	if err := s.Approve(context.Background(), "plan1", "user1"); err != nil {
		t.Fatalf("Approve: %v", err)
	}
	if addPlanID != "plan1" || removePlanID != "plan1" || approvePlanID != "plan1" || approveUser != "user1" {
		t.Errorf("ids = %q/%q/%q/%q", addPlanID, removePlanID, approvePlanID, approveUser)
	}
}

func TestTestPlanService_ChangeStatus_LogsActivityOnlyWhenChanged(t *testing.T) {
	activityCalled := false
	changeStatusCalled := false
	m := &mockTestPlanRepo{
		get: func(ctx context.Context, id string) (*core.TestPlan, error) {
			return &core.TestPlan{ID: id, Status: core.PlanDraft}, nil
		},
		changeStatus: func(ctx context.Context, id string, status core.TestPlanStatus) error {
			changeStatusCalled = true
			return nil
		},
	}
	activity := &mockActivityRepo{create: func(ctx context.Context, input core.CreateActivityInput) error {
		activityCalled = true
		if input.Payload["from"] != string(core.PlanDraft) || input.Payload["to"] != string(core.PlanActive) {
			t.Errorf("activity payload = %+v", input.Payload)
		}
		return nil
	}}
	s := NewTestPlanService(m, nil, activity)

	if err := s.ChangeStatus(context.Background(), "plan1", core.PlanActive, "actor1", "p1"); err != nil {
		t.Fatalf("ChangeStatus: %v", err)
	}
	if !changeStatusCalled || !activityCalled {
		t.Error("expected both repo ChangeStatus and activity log to be called")
	}

	// No-op when the status is already the target status.
	changeStatusCalled, activityCalled = false, false
	m.get = func(ctx context.Context, id string) (*core.TestPlan, error) {
		return &core.TestPlan{ID: id, Status: core.PlanActive}, nil
	}
	if err := s.ChangeStatus(context.Background(), "plan1", core.PlanActive, "actor1", "p1"); err != nil {
		t.Fatalf("ChangeStatus (noop): %v", err)
	}
	if changeStatusCalled || activityCalled {
		t.Error("ChangeStatus should be a no-op when status is unchanged")
	}
}

// ---------------------------------------------------------------------------
// TestRunService
// ---------------------------------------------------------------------------

func TestTestRunServiceListGetSummary(t *testing.T) {
	summary := &core.RunSummary{Pass: 3, Fail: 1, Total: 4}
	m := &mockTestRunRepo{
		list: func(ctx context.Context, filter core.TestRunFilter) (*core.PageResult[core.TestRun], error) {
			return &core.PageResult[core.TestRun]{Items: []core.TestRun{{ID: "run1"}}, Total: 1}, nil
		},
		get: func(ctx context.Context, id string) (*core.TestRun, error) {
			return &core.TestRun{ID: id}, nil
		},
		summary: func(ctx context.Context, id string) (*core.RunSummary, error) {
			return summary, nil
		},
	}
	s := NewTestRunService(m, &mockTestResultRepo{}, &mockActivityRepo{})

	if _, err := s.List(context.Background(), core.TestRunFilter{ProjectID: "p1"}); err != nil {
		t.Fatalf("List: %v", err)
	}
	run, err := s.Get(context.Background(), "run1")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if run.ID != "run1" {
		t.Errorf("Get.ID = %q", run.ID)
	}
	gotSummary, err := s.Summary(context.Background(), "run1")
	if err != nil {
		t.Fatalf("Summary: %v", err)
	}
	if gotSummary.Pass != 3 || gotSummary.Fail != 1 {
		t.Errorf("Summary = %+v", gotSummary)
	}
}

func TestTestRunServiceCreateRecordComplete(t *testing.T) {
	notes := "ok"
	var recordedResult string
	var recordedInput core.RecordResultInput
	var completedID string
	m := &mockTestRunRepo{
		get: func(ctx context.Context, id string) (*core.TestRun, error) {
			return &core.TestRun{ID: id, Status: core.RunInProgress}, nil
		},
		create: func(ctx context.Context, input core.CreateTestRunInput) (*core.TestRun, error) {
			return &core.TestRun{ID: "run1", Name: input.Name}, nil
		},
		recordResult: func(ctx context.Context, resultID string, input core.RecordResultInput) error {
			recordedResult = resultID
			recordedInput = input
			return nil
		},
		complete: func(ctx context.Context, id string) error {
			completedID = id
			return nil
		},
	}
	s := NewTestRunService(m, &mockTestResultRepo{}, &mockActivityRepo{})

	run, err := s.Create(context.Background(), core.CreateTestRunInput{ProjectID: "p1", Name: "Run 1"})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if run.Name != "Run 1" {
		t.Errorf("Create.Name = %q", run.Name)
	}

	if err := s.RecordResult(context.Background(), "res1", core.RecordResultInput{Status: core.ResultPass, TesterID: "user1", Notes: &notes}); err != nil {
		t.Fatalf("RecordResult: %v", err)
	}
	if recordedResult != "res1" || recordedInput.Status != core.ResultPass || recordedInput.TesterID != "user1" {
		t.Errorf("RecordResult forwarded %q/%+v", recordedResult, recordedInput)
	}

	if err := s.Complete(context.Background(), "run1", "actor1", "p1"); err != nil {
		t.Fatalf("Complete: %v", err)
	}
	if completedID != "run1" {
		t.Errorf("Complete id = %q", completedID)
	}
}

func TestTestRunService_Reopen_LogsActivityOnlyWhenChanged(t *testing.T) {
	reopenCalled := false
	activityCalled := false
	m := &mockTestRunRepo{
		get: func(ctx context.Context, id string) (*core.TestRun, error) {
			return &core.TestRun{ID: id, Status: core.RunCompleted}, nil
		},
		reopen: func(ctx context.Context, id string) error {
			reopenCalled = true
			return nil
		},
	}
	activity := &mockActivityRepo{create: func(ctx context.Context, input core.CreateActivityInput) error {
		activityCalled = true
		if input.Payload["from"] != string(core.RunCompleted) || input.Payload["to"] != string(core.RunInProgress) {
			t.Errorf("activity payload = %+v", input.Payload)
		}
		return nil
	}}
	s := NewTestRunService(m, &mockTestResultRepo{}, activity)

	if err := s.Reopen(context.Background(), "run1", "actor1", "p1"); err != nil {
		t.Fatalf("Reopen: %v", err)
	}
	if !reopenCalled || !activityCalled {
		t.Error("expected both repo Reopen and activity log to be called")
	}

	// No-op when already in_progress.
	reopenCalled, activityCalled = false, false
	m.get = func(ctx context.Context, id string) (*core.TestRun, error) {
		return &core.TestRun{ID: id, Status: core.RunInProgress}, nil
	}
	if err := s.Reopen(context.Background(), "run1", "actor1", "p1"); err != nil {
		t.Fatalf("Reopen (noop): %v", err)
	}
	if reopenCalled || activityCalled {
		t.Error("Reopen should be a no-op when already in_progress")
	}
}

// ---------------------------------------------------------------------------
// IssueService
// ---------------------------------------------------------------------------

func TestIssueServicePassthrough(t *testing.T) {
	var createdInput core.CreateIssueInput
	var updatedStatus core.IssueStatus
	m := &mockIssueRepo{
		list: func(ctx context.Context, filter core.IssueFilter) (*core.PageResult[core.Issue], error) {
			return &core.PageResult[core.Issue]{Items: []core.Issue{{ID: "iss1"}}, Total: 1}, nil
		},
		get: func(ctx context.Context, id string) (*core.Issue, error) {
			return &core.Issue{ID: id}, nil
		},
		create: func(ctx context.Context, input core.CreateIssueInput) (*core.Issue, error) {
			createdInput = input
			return &core.Issue{ID: "iss-new"}, nil
		},
		updateStatus: func(ctx context.Context, id string, status core.IssueStatus) error {
			updatedStatus = status
			return nil
		},
	}
	s := NewIssueService(m, newTestIssueContextSources())

	if _, err := s.List(context.Background(), core.IssueFilter{ProjectID: "p1"}); err != nil {
		t.Fatalf("List: %v", err)
	}
	if _, err := s.Get(context.Background(), "iss1"); err != nil {
		t.Fatalf("Get: %v", err)
	}
	if _, err := s.Create(context.Background(), core.CreateIssueInput{ProjectID: "p1", Title: "Bug"}); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if createdInput.Title != "Bug" {
		t.Errorf("Create input Title = %q", createdInput.Title)
	}
	if _, err := s.UpdateStatus(context.Background(), "iss1", core.IssueInProgress, "actor1", "p1"); err != nil {
		t.Fatalf("UpdateStatus: %v", err)
	}
	if updatedStatus != core.IssueInProgress {
		t.Errorf("UpdateStatus = %q, want in_progress", updatedStatus)
	}
}

func TestIssueService_UpdateStatus_NoopWhenUnchanged(t *testing.T) {
	assignee := "assignee1"
	activityCalled := false
	notifyCalled := false
	m := &mockIssueRepo{
		get: func(ctx context.Context, id string) (*core.Issue, error) {
			return &core.Issue{ID: id, Status: core.IssueOpen, AssignedTo: &assignee, Title: "Bug"}, nil
		},
		updateStatus: func(ctx context.Context, id string, status core.IssueStatus) error {
			t.Fatalf("UpdateStatus repo call should not happen when status is unchanged")
			return nil
		},
	}
	aux := IssueContextSources{
		Profiles: &mockProfileRepo{},
		Activity: &mockActivityRepo{create: func(ctx context.Context, input core.CreateActivityInput) error {
			activityCalled = true
			return nil
		}},
		Attachments: &mockAttachmentRepo{},
		Notifications: &mockNotificationRepo{create: func(ctx context.Context, input core.CreateNotificationInput) error {
			notifyCalled = true
			return nil
		}},
	}
	s := NewIssueService(m, aux)

	if _, err := s.UpdateStatus(context.Background(), "iss1", core.IssueOpen, "actor1", "p1"); err != nil {
		t.Fatalf("UpdateStatus: %v", err)
	}
	if activityCalled {
		t.Error("activity should not be logged when status does not change")
	}
	if notifyCalled {
		t.Error("notification should not be sent when status does not change")
	}
}

func TestIssueService_UpdateStatus_NotifiesPreviousAssignee(t *testing.T) {
	assignee := "assignee1"
	var notified core.CreateNotificationInput
	notifyCount := 0
	m := &mockIssueRepo{
		get: func(ctx context.Context, id string) (*core.Issue, error) {
			return &core.Issue{ID: id, Status: core.IssueOpen, AssignedTo: &assignee, Title: "Bug"}, nil
		},
		updateStatus: func(ctx context.Context, id string, status core.IssueStatus) error { return nil },
	}
	aux := IssueContextSources{
		Profiles:    &mockProfileRepo{},
		Activity:    &mockActivityRepo{},
		Attachments: &mockAttachmentRepo{},
		Notifications: &mockNotificationRepo{create: func(ctx context.Context, input core.CreateNotificationInput) error {
			notifyCount++
			notified = input
			return nil
		}},
	}
	s := NewIssueService(m, aux)

	if _, err := s.UpdateStatus(context.Background(), "iss1", core.IssueResolved, "actor1", "p1"); err != nil {
		t.Fatalf("UpdateStatus: %v", err)
	}
	if notifyCount != 1 {
		t.Fatalf("notify count = %d, want 1", notifyCount)
	}
	if notified.UserID != assignee {
		t.Errorf("notified UserID = %q, want %q", notified.UserID, assignee)
	}
	if notified.Type != "status_change" {
		t.Errorf("notified Type = %q", notified.Type)
	}

	// No self-notification when the actor is also the assignee.
	notifyCount = 0
	if _, err := s.UpdateStatus(context.Background(), "iss1", core.IssueVerified, assignee, "p1"); err != nil {
		t.Fatalf("UpdateStatus: %v", err)
	}
	if notifyCount != 0 {
		t.Errorf("notify count = %d, want 0 (actor is the assignee)", notifyCount)
	}
}

func TestIssueService_Assign_LogsActivityAndNotifiesNewAssignee(t *testing.T) {
	var assignedTo *string
	var loggedPayload map[string]any
	var notified core.CreateNotificationInput
	notifyCount := 0
	m := &mockIssueRepo{
		get: func(ctx context.Context, id string) (*core.Issue, error) {
			return &core.Issue{ID: id, Title: "Bug"}, nil
		},
		assign: func(ctx context.Context, id string, newAssignee *string) error {
			assignedTo = newAssignee
			return nil
		},
	}
	aux := IssueContextSources{
		Profiles: &mockProfileRepo{},
		Activity: &mockActivityRepo{create: func(ctx context.Context, input core.CreateActivityInput) error {
			loggedPayload = input.Payload
			return nil
		}},
		Attachments: &mockAttachmentRepo{},
		Notifications: &mockNotificationRepo{create: func(ctx context.Context, input core.CreateNotificationInput) error {
			notifyCount++
			notified = input
			return nil
		}},
	}
	s := NewIssueService(m, aux)

	newAssignee := "assignee2"
	if _, err := s.Assign(context.Background(), "iss1", &newAssignee, "actor1", "p1"); err != nil {
		t.Fatalf("Assign: %v", err)
	}
	if assignedTo == nil || *assignedTo != newAssignee {
		t.Errorf("repo Assign got %v, want %q", assignedTo, newAssignee)
	}
	if loggedPayload == nil {
		t.Fatal("expected assignment activity to be logged")
	}
	if notifyCount != 1 || notified.UserID != newAssignee || notified.Type != "assignment" {
		t.Errorf("notification = %+v (count %d), want one 'assignment' notification to %q", notified, notifyCount, newAssignee)
	}

	// Unassigning (nil) must not notify anyone.
	notifyCount = 0
	if _, err := s.Assign(context.Background(), "iss1", nil, "actor1", "p1"); err != nil {
		t.Fatalf("Assign(nil): %v", err)
	}
	if notifyCount != 0 {
		t.Errorf("notify count = %d, want 0 when unassigning", notifyCount)
	}
}

// ---------------------------------------------------------------------------
// Module / Tag / TestRole
// ---------------------------------------------------------------------------

func TestModuleServicePassthrough(t *testing.T) {
	m := &mockModuleRepo{
		listByProject: func(ctx context.Context, projectID string) ([]core.Module, error) {
			return []core.Module{{ID: "m1", ProjectID: projectID}}, nil
		},
		get: func(ctx context.Context, id string) (*core.Module, error) {
			return &core.Module{ID: id}, nil
		},
	}
	s := NewModuleService(m)

	mods, err := s.ListByProject(context.Background(), "p1")
	if err != nil {
		t.Fatalf("ListByProject: %v", err)
	}
	if len(mods) != 1 || mods[0].ProjectID != "p1" {
		t.Errorf("ListByProject = %+v", mods)
	}
	if _, err := s.Get(context.Background(), "m1"); err != nil {
		t.Fatalf("Get: %v", err)
	}
}

func TestTagServicePassthrough(t *testing.T) {
	m := &mockTagRepo{
		listByProject: func(ctx context.Context, projectID string) ([]core.Tag, error) {
			return []core.Tag{{ID: "t1", Name: "smoke"}}, nil
		},
		get: func(ctx context.Context, id string) (*core.Tag, error) {
			return &core.Tag{ID: id}, nil
		},
	}
	s := NewTagService(m)

	tags, err := s.ListByProject(context.Background(), "p1")
	if err != nil {
		t.Fatalf("ListByProject: %v", err)
	}
	if len(tags) != 1 || tags[0].Name != "smoke" {
		t.Errorf("ListByProject = %+v", tags)
	}
	if _, err := s.Get(context.Background(), "t1"); err != nil {
		t.Fatalf("Get: %v", err)
	}
}

func TestTestRoleServicePassthrough(t *testing.T) {
	m := &mockTestRoleRepo{
		listByProject: func(ctx context.Context, projectID string) ([]core.TestRole, error) {
			return []core.TestRole{{ID: "r1", Name: "QA"}}, nil
		},
		get: func(ctx context.Context, id string) (*core.TestRole, error) {
			return &core.TestRole{ID: id}, nil
		},
	}
	s := NewTestRoleService(m)

	roles, err := s.ListByProject(context.Background(), "p1")
	if err != nil {
		t.Fatalf("ListByProject: %v", err)
	}
	if len(roles) != 1 || roles[0].Name != "QA" {
		t.Errorf("ListByProject = %+v", roles)
	}
	if _, err := s.Get(context.Background(), "r1"); err != nil {
		t.Fatalf("Get: %v", err)
	}
}

func TestMasterDataServicesTrimAndValidateNames(t *testing.T) {
	moduleRepo := &mockModuleRepo{create: func(_ context.Context, projectID, name string, code *string) (*core.Module, error) {
		if projectID != "p1" || name != "Checkout" || code != nil {
			t.Fatalf("module create = %q/%q/%v", projectID, name, code)
		}
		return &core.Module{Name: name}, nil
	}}
	if _, err := NewModuleService(moduleRepo).Create(context.Background(), "p1", "  Checkout  ", nil); err != nil {
		t.Fatalf("Module.Create: %v", err)
	}
	if _, err := NewModuleService(moduleRepo).Create(context.Background(), "p1", "   ", nil); err == nil {
		t.Fatal("Module.Create accepted blank name")
	}

	tagRepo := &mockTagRepo{findOrCreate: func(_ context.Context, projectID, name string) (*core.Tag, error) {
		if projectID != "p1" || name != "smoke" {
			t.Fatalf("tag create = %q/%q", projectID, name)
		}
		return &core.Tag{Name: name}, nil
	}}
	if _, err := NewTagService(tagRepo).Create(context.Background(), "p1", " smoke "); err != nil {
		t.Fatalf("Tag.Create: %v", err)
	}

	roleRepo := &mockTestRoleRepo{create: func(_ context.Context, projectID, name string) (*core.TestRole, error) {
		if projectID != "p1" || name != "Manager" {
			t.Fatalf("role create = %q/%q", projectID, name)
		}
		return &core.TestRole{Name: name}, nil
	}}
	if _, err := NewTestRoleService(roleRepo).Create(context.Background(), "p1", " Manager "); err != nil {
		t.Fatalf("TestRole.Create: %v", err)
	}
}

// ---------------------------------------------------------------------------
// TestResultService
// ---------------------------------------------------------------------------

func TestTestResultServicePassthrough(t *testing.T) {
	m := &mockTestResultRepo{
		list: func(ctx context.Context, filter core.TestResultFilter) (*core.PageResult[core.TestResult], error) {
			if filter.ProjectID != "p1" {
				t.Errorf("filter.ProjectID = %q, want p1", filter.ProjectID)
			}
			return &core.PageResult[core.TestResult]{Items: []core.TestResult{{ID: "res1"}}, Total: 1}, nil
		},
		get: func(ctx context.Context, id string) (*core.TestResult, error) {
			return &core.TestResult{ID: id}, nil
		},
	}
	s := NewTestResultService(m)

	res, err := s.List(context.Background(), core.TestResultFilter{ProjectID: "p1"})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if res.Total != 1 || res.Items[0].ID != "res1" {
		t.Errorf("List = %+v", res)
	}
	if _, err := s.Get(context.Background(), "res1"); err != nil {
		t.Fatalf("Get: %v", err)
	}
}

func TestTestResultServiceListPropagatesError(t *testing.T) {
	sentinel := errors.New("boom")
	m := &mockTestResultRepo{list: func(ctx context.Context, filter core.TestResultFilter) (*core.PageResult[core.TestResult], error) {
		return nil, sentinel
	}}
	s := NewTestResultService(m)
	if _, err := s.List(context.Background(), core.TestResultFilter{}); !errors.Is(err, sentinel) {
		t.Errorf("List error = %v, want sentinel", err)
	}
}

func TestTestResultServiceStepOperationsPreserveProjectScope(t *testing.T) {
	actual := "observed"
	m := &mockTestResultRepo{
		listSteps: func(_ context.Context, projectID, runID string) ([]core.TestResultStep, error) {
			if projectID != "p1" || runID != "run1" {
				t.Fatalf("ListStepsForRun scope = %s/%s", projectID, runID)
			}
			return []core.TestResultStep{{ID: "step1"}}, nil
		},
		recordStep: func(_ context.Context, projectID, stepID string, input core.RecordStepResultInput) (*core.TestResultStep, error) {
			if projectID != "p1" || stepID != "step1" || input.Status != core.ResultStepFail {
				t.Fatalf("RecordStep args = %s/%s/%+v", projectID, stepID, input)
			}
			return &core.TestResultStep{ID: stepID, Status: input.Status, ActualResult: input.ActualResult}, nil
		},
	}
	s := NewTestResultService(m)
	steps, err := s.ListStepsForRun(context.Background(), "p1", "run1")
	if err != nil || len(steps) != 1 {
		t.Fatalf("ListStepsForRun = %+v, %v", steps, err)
	}
	got, err := s.RecordStep(context.Background(), "p1", "step1", core.RecordStepResultInput{Status: core.ResultStepFail, ActualResult: &actual})
	if err != nil || got.Status != core.ResultStepFail || got.ActualResult == nil || *got.ActualResult != actual {
		t.Fatalf("RecordStep = %+v, %v", got, err)
	}
}
