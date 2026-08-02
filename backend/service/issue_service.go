package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/shiftech/testify-platform/core"
)

var issueUUIDPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// IssueService wraps core.IssueRepository plus the auxiliary repositories
// needed to assemble workflow-level context (issue.inspect / issue.can_close).
// Business rules for Issue (e.g. an Issue may only be created from a TestResult
// with status FAIL; an Issue is only closable in certain states) belong here.
type IssueService struct {
	repo     core.IssueRepository
	profiles core.ProfileRepository
	activity core.ActivityRepository
	attach   core.AttachmentRepository
}

// IssueContextSources bundles the auxiliary repositories IssueService needs to
// resolve actors and load activity/attachments for inspect-style reads.
type IssueContextSources struct {
	Profiles    core.ProfileRepository
	Activity    core.ActivityRepository
	Attachments core.AttachmentRepository
}

func NewIssueService(repo core.IssueRepository, aux IssueContextSources) *IssueService {
	return &IssueService{
		repo:     repo,
		profiles: aux.Profiles,
		activity: aux.Activity,
		attach:   aux.Attachments,
	}
}

func (s *IssueService) List(ctx context.Context, filter core.IssueFilter) (*core.PageResult[core.Issue], error) {
	return s.repo.List(ctx, filter)
}

func (s *IssueService) Get(ctx context.Context, id string) (*core.Issue, error) {
	return s.repo.Get(ctx, id)
}

// GetByCode resolves an issue by its human code. Both "ISS-0072" and the bare
// "0072" forms are accepted; the code is normalized to the canonical form.
func (s *IssueService) GetByCode(ctx context.Context, projectID, code string) (*core.Issue, error) {
	return s.repo.GetByCode(ctx, projectID, normalizeIssueCode(code))
}

func (s *IssueService) Create(ctx context.Context, input core.CreateIssueInput) (*core.Issue, error) {
	return s.repo.Create(ctx, input)
}

func (s *IssueService) UpdateStatus(ctx context.Context, id string, status core.IssueStatus, actorID, projectID string) (*core.Issue, error) {
	current, err := s.repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	previousStatus := current.Status
	if previousStatus == status {
		return current, nil
	}
	if err := s.repo.UpdateStatus(ctx, id, status); err != nil {
		return nil, err
	}
	current.Status = status

	// Log activity when the status actually changed.
	if err := s.activity.Create(ctx, core.CreateActivityInput{
		ProjectID:  projectID,
		EntityType: "issue",
		EntityID:   id,
		ActorID:    actorID,
		EventType:  "status_change",
		Payload:    map[string]any{"from": string(previousStatus), "to": string(status)},
	}); err != nil {
		return nil, fmt.Errorf("log activity: %w", err)
	}

	return current, nil
}

// Resolve returns the issue for a project-scoped reference that is either a
// UUID or a human code ("ISS-0072"/"0072"), enforcing the session's project
// scope. This is the single lookup entry point so callers never have to decide
// which identifier form they were given.
func (s *IssueService) Resolve(ctx context.Context, projectID, ref string) (*core.Issue, error) {
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return nil, errors.New("issue reference required (UUID or code)")
	}

	var iss *core.Issue
	var err error
	if issueUUIDPattern.MatchString(ref) {
		iss, err = s.repo.Get(ctx, ref)
	} else {
		iss, err = s.repo.GetByCode(ctx, projectID, normalizeIssueCode(ref))
	}
	if err != nil {
		return nil, err
	}
	if iss.ProjectID != projectID {
		return nil, fmt.Errorf("issue not found in the scoped project")
	}
	return iss, nil
}

// Inspect assembles the full workflow context for one issue in a single
// call: the issue, resolved assignee/reporter, module, tags, linked test
// results (with run/case context), activity timeline, attachments, and the
// computed can-close decision. The QA agent needs no further calls to judge
// the issue.
func (s *IssueService) Inspect(ctx context.Context, projectID, ref string) (*core.IssueInspect, error) {
	iss, err := s.Resolve(ctx, projectID, ref)
	if err != nil {
		return nil, err
	}

	links, err := s.repo.ListLinks(ctx, iss.ID)
	if err != nil {
		return nil, err
	}
	tags, err := s.repo.ListTagNames(ctx, iss.ID)
	if err != nil {
		return nil, err
	}
	activity, err := s.activity.ListForEntity(ctx, projectID, "issue", iss.ID, 50)
	if err != nil {
		return nil, err
	}
	attachments, err := s.attach.ListForEntity(ctx, projectID, "issue", iss.ID)
	if err != nil {
		return nil, err
	}

	// Resolve every actor UUID in one batch — assignee, reporter, linked
	// result testers, and activity actors.
	profileIDs := make([]string, 0, 2+len(links)+len(activity))
	addProfile := func(id *string) {
		if id != nil && *id != "" {
			profileIDs = append(profileIDs, *id)
		}
	}
	addProfile(iss.AssignedTo)
	addProfile(iss.CreatedBy)
	for _, l := range links {
		addProfile(l.TesterID)
	}
	for _, a := range activity {
		if a.ActorID != "" {
			profileIDs = append(profileIDs, a.ActorID)
		}
	}
	profiles, err := s.profiles.GetMany(ctx, profileIDs)
	if err != nil {
		return nil, err
	}

	// Attach resolved actors.
	for i := range links {
		if links[i].TesterID != nil {
			if p, ok := profiles[*links[i].TesterID]; ok {
				links[i].Tester = &p
			}
		}
	}
	for i := range activity {
		if p, ok := profiles[activity[i].ActorID]; ok {
			activity[i].Actor = &p
		}
	}

	return &core.IssueInspect{
		Issue:       *iss,
		Assignee:    derefProfile(profiles, iss.AssignedTo),
		Reporter:    derefProfile(profiles, iss.CreatedBy),
		Tags:        tags,
		Links:       links,
		Activity:    activity,
		Attachments: attachments,
		CanClose:    s.evaluateCanClose(iss, links),
	}, nil
}

// CanClose answers "may this issue be closed now?" for a project-scoped
// reference. It returns the domain decision (status rules + linked-result
// health) so the AI can act on it without re-deriving business rules.
func (s *IssueService) CanClose(ctx context.Context, projectID, ref string) (*core.CanCloseResult, error) {
	iss, err := s.Resolve(ctx, projectID, ref)
	if err != nil {
		return nil, err
	}
	links, err := s.repo.ListLinks(ctx, iss.ID)
	if err != nil {
		return nil, err
	}
	res := s.evaluateCanClose(iss, links)
	return &res, nil
}

// evaluateCanClose encodes the close-state rules for one issue:
//   - closed / rejected / duplicate are terminal — closing is a no-op (true).
//   - resolved / verified are closable, unless a linked test result is still
//     failing or blocked.
//   - backlog / open / in_progress are not closable until resolved/verified.
func (s *IssueService) evaluateCanClose(iss *core.Issue, links []core.IssueLink) core.CanCloseResult {
	res := core.CanCloseResult{CurrentStatus: iss.Status}

	switch iss.Status {
	case core.IssueClosed:
		res.CanClose = true
		res.Reasons = []string{"issue is already closed"}
		return res
	case core.IssueRejected, core.IssueDuplicate:
		res.CanClose = true
		res.Reasons = []string{fmt.Sprintf("issue is in a terminal state (%s); closing is a no-op", iss.Status)}
		return res
	case core.IssueResolved, core.IssueVerified:
		res.CanClose = true
		res.Reasons = append(res.Reasons, fmt.Sprintf("issue is %s", iss.Status))
	default:
		res.Blockers = append(res.Blockers,
			fmt.Sprintf("issue is still %s; it must be resolved or verified before closing", iss.Status))
	}

	var failing int
	for _, l := range links {
		if l.Status == core.ResultFail || l.Status == core.ResultBlocked {
			failing++
		}
	}
	if failing > 0 {
		res.CanClose = false
		res.Blockers = append(res.Blockers, fmt.Sprintf("%d linked test result(s) are still failing/blocked", failing))
	}

	if res.CanClose && len(res.Reasons) == 0 {
		res.Reasons = []string{"no blockers found"}
	}
	return res
}

// normalizeIssueCode uppercases and prefixes a bare numeric code so both
// "0072" and "ISS-0072" resolve to the canonical "ISS-0072".
func normalizeIssueCode(raw string) string {
	s := strings.ToUpper(strings.TrimSpace(raw))
	if strings.HasPrefix(s, "ISS-") {
		return s
	}
	return "ISS-" + s
}

func derefProfile(profiles map[string]core.Profile, id *string) *core.Profile {
	if id == nil || *id == "" {
		return nil
	}
	if p, ok := profiles[*id]; ok {
		return &p
	}
	return nil
}
