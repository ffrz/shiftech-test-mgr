package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

type TestCaseRepo struct {
	db *gorm.DB
}

func NewTestCaseRepo(db *gorm.DB) *TestCaseRepo {
	return &TestCaseRepo{db: db}
}

func (r *TestCaseRepo) List(ctx context.Context, filter core.TestCaseFilter) (*core.PageResult[core.TestCase], error) {
	var rows []testCaseRow
	q := r.db.WithContext(ctx).Where("project_id = ?", filter.ProjectID)

	if filter.ModuleID != nil {
		q = q.Where("module_id = ?", *filter.ModuleID)
	}
	if filter.Module != nil {
		name := strings.TrimSpace(*filter.Module)
		if name != "" {
			q = q.Where(
				"exists (select 1 from modules m where m.id = test_cases.module_id and m.project_id = test_cases.project_id and (lower(m.name) = ? or lower(m.code) = ?))",
				strings.ToLower(name), strings.ToLower(name),
			)
		}
	}
	if filter.Tag != nil {
		name := strings.TrimSpace(*filter.Tag)
		if name != "" {
			q = q.Where(
				"exists (select 1 from test_case_tags tct join tags t on t.id = tct.tag_id where tct.test_case_id = test_cases.id and t.project_id = test_cases.project_id and lower(t.name) = ?)",
				strings.ToLower(name),
			)
		}
	}
	if filter.Priority != nil {
		q = q.Where("priority = ?", *filter.Priority)
	}
	if filter.Status != nil {
		q = q.Where("status = ?", *filter.Status)
	}
	if filter.Search != nil {
		search := "%" + strings.ToLower(strings.TrimSpace(*filter.Search)) + "%"
		q = q.Where("lower(concat_ws(' ', code, title, objective, preconditions, steps, expected_result)) like ?", search)
	}

	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	if filter.Cursor != nil {
		if decoded, err := decodeCodeCursor(*filter.Cursor); err == nil {
			q = q.Where("(code, id) > (?, ?)", decoded.Code, decoded.ID)
		}
	}

	q = q.Order("code, id").Limit(limit + 1)

	if err := q.Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("testcase list: %w", err)
	}

	hasMore := len(rows) > limit
	if hasMore {
		rows = rows[:limit]
	}

	items := make([]core.TestCase, len(rows))
	for i, row := range rows {
		items[i] = row.toDomain()
	}

	if err := r.enrichWithTags(ctx, items); err != nil {
		return nil, err
	}

	var nextCursor string
	if hasMore && len(rows) > 0 {
		last := rows[len(rows)-1]
		nextCursor = encodeCodeCursor(last.Code, last.ID)
	}

	var total int64
	r.db.WithContext(ctx).Model(&testCaseRow{}).Where("project_id = ?", filter.ProjectID).Count(&total)

	return &core.PageResult[core.TestCase]{
		Items:      items,
		NextCursor: nextCursor,
		HasMore:    hasMore,
		Total:      int(total),
	}, nil
}

func (r *TestCaseRepo) Get(ctx context.Context, id string) (*core.TestCase, error) {
	var row testCaseRow
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&row).Error; err != nil {
		return nil, fmt.Errorf("testcase get: %w", err)
	}
	tc := row.toDomain()

	var tagRows []testCaseTagRow
	if err := r.db.WithContext(ctx).Where("test_case_id = ?", id).Find(&tagRows).Error; err != nil {
		return nil, fmt.Errorf("testcase tags: %w", err)
	}
	tags := r.resolveTagNames(ctx, tagRows)
	tc.Tags = tags

	steps, err := r.loadSteps(ctx, id)
	if err != nil {
		return nil, err
	}
	tc.Steps = steps

	return &tc, nil
}

func (r *TestCaseRepo) Create(ctx context.Context, input core.CreateTestCaseInput) (*core.TestCase, error) {
	now := time.Now()
	row := testCaseRow{
		ID:            newUUID(),
		ProjectID:     input.ProjectID,
		Title:         input.Title,
		Objective:     input.Objective,
		Preconditions: input.Precondition,
		Priority:      string(input.Priority),
		Status:        string(core.TestCaseStatusActive),
		ModuleID:      &input.ModuleID,
		StepType:      string(core.StepSimple),
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return nil, fmt.Errorf("testcase create: %w", err)
	}

	if len(input.Tags) > 0 {
		if err := r.linkTags(ctx, row.ID, input.ProjectID, input.Tags); err != nil {
			return nil, err
		}
	}

	tc := row.toDomain()
	tc.Tags = input.Tags
	return &tc, nil
}

func (r *TestCaseRepo) Update(ctx context.Context, id string, input core.UpdateTestCaseInput) (*core.TestCase, error) {
	updates := map[string]interface{}{}
	if input.Title != nil {
		updates["title"] = *input.Title
	}
	if input.Objective != nil {
		updates["objective"] = *input.Objective
	}
	if input.Precondition != nil {
		updates["preconditions"] = *input.Precondition
	}
	if input.Priority != nil {
		updates["priority"] = *input.Priority
	}
	if input.ModuleID != nil {
		updates["module_id"] = *input.ModuleID
	}
	if len(updates) == 0 && input.Tags == nil {
		return r.Get(ctx, id)
	}

	if len(updates) > 0 {
		updates["updated_at"] = time.Now()
		if err := r.db.WithContext(ctx).Model(&testCaseRow{}).Where("id = ?", id).Updates(updates).Error; err != nil {
			return nil, fmt.Errorf("testcase update: %w", err)
		}
	}

	if input.Tags != nil {
		r.db.WithContext(ctx).Where("test_case_id = ?", id).Delete(&testCaseTagRow{})
		if len(*input.Tags) > 0 {
			var row testCaseRow
			if err := r.db.WithContext(ctx).Select("project_id").Where("id = ?", id).First(&row).Error; err != nil {
				return nil, fmt.Errorf("testcase update tags: %w", err)
			}
			if err := r.linkTags(ctx, id, row.ProjectID, *input.Tags); err != nil {
				return nil, err
			}
		}
	}

	return r.Get(ctx, id)
}

func (r *TestCaseRepo) Duplicate(ctx context.Context, id string, newTitle string) (*core.TestCase, error) {
	original, err := r.Get(ctx, id)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	row := testCaseRow{
		ID:             newUUID(),
		ProjectID:      original.ProjectID,
		Title:          newTitle,
		Objective:      original.Objective,
		Preconditions:  original.Precondition,
		ExpectedResult: original.ExpectedResult,
		Priority:       string(original.Priority),
		Status:         string(core.TestCaseStatusActive),
		ModuleID:       &original.ModuleID,
		StepType:       string(original.StepType),
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if original.ModuleID == "" {
		row.ModuleID = nil
	}

	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return nil, fmt.Errorf("testcase duplicate: %w", err)
	}

	if len(original.Tags) > 0 {
		r.linkTags(ctx, row.ID, original.ProjectID, original.Tags)
	}

	if original.StepType == core.StepDetailed && len(original.Steps) > 0 {
		for _, step := range original.Steps {
			stepRow := testCaseStepRow{
				ID:             newUUID(),
				TestCaseID:     row.ID,
				StepNumber:     step.Order,
				Action:         step.Action,
				ExpectedResult: &step.Expectation,
				CreatedAt:      now,
				UpdatedAt:      now,
			}
			r.db.WithContext(ctx).Create(&stepRow)
		}
	}

	return r.Get(ctx, row.ID)
}

func (r *TestCaseRepo) Archive(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Model(&testCaseRow{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":     string(core.TestCaseStatusArchived),
		"updated_at": time.Now(),
	}).Error
}

func (r *TestCaseRepo) loadSteps(ctx context.Context, testCaseID string) ([]core.TestCaseStep, error) {
	var rows []testCaseStepRow
	if err := r.db.WithContext(ctx).Where("test_case_id = ?", testCaseID).Order("step_number").Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("testcase steps: %w", err)
	}
	steps := make([]core.TestCaseStep, len(rows))
	for i, row := range rows {
		steps[i] = row.toDomain()
	}
	return steps, nil
}

func (r *TestCaseRepo) enrichWithTags(ctx context.Context, cases []core.TestCase) error {
	if len(cases) == 0 {
		return nil
	}
	ids := make([]string, len(cases))
	for i, tc := range cases {
		ids[i] = tc.ID
	}

	var links []testCaseTagRow
	if err := r.db.WithContext(ctx).Where("test_case_id IN ?", ids).Find(&links).Error; err != nil {
		return err
	}

	tagIDs := make([]string, 0, len(links))
	for _, l := range links {
		tagIDs = append(tagIDs, l.TagID)
	}

	var tagRows []tagRow
	tagMap := make(map[string]string)
	if len(tagIDs) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ?", tagIDs).Find(&tagRows).Error; err != nil {
			return err
		}
		for _, t := range tagRows {
			tagMap[t.ID] = t.Name
		}
	}

	caseTags := make(map[string][]string)
	for _, l := range links {
		if name, ok := tagMap[l.TagID]; ok {
			caseTags[l.TestCaseID] = append(caseTags[l.TestCaseID], name)
		}
	}

	for i := range cases {
		cases[i].Tags = caseTags[cases[i].ID]
	}
	return nil
}

func (r *TestCaseRepo) resolveTagNames(ctx context.Context, links []testCaseTagRow) []string {
	if len(links) == 0 {
		return nil
	}
	ids := make([]string, len(links))
	for i, l := range links {
		ids[i] = l.TagID
	}
	var rows []tagRow
	if err := r.db.WithContext(ctx).Where("id IN ?", ids).Find(&rows).Error; err != nil {
		return nil
	}
	names := make([]string, 0, len(rows))
	for _, row := range rows {
		names = append(names, row.Name)
	}
	return names
}

func (r *TestCaseRepo) linkTags(ctx context.Context, testCaseID, projectID string, tagNames []string) error {
	for _, name := range tagNames {
		var tag tagRow
		err := r.db.WithContext(ctx).Where("project_id = ? AND name = ?", projectID, name).First(&tag).Error
		if err != nil {
			tag = tagRow{ID: newUUID(), ProjectID: projectID, Name: name, CreatedAt: time.Now()}
			if err := r.db.WithContext(ctx).Create(&tag).Error; err != nil {
				return fmt.Errorf("testcase link tag: %w", err)
			}
		}
		link := testCaseTagRow{TestCaseID: testCaseID, TagID: tag.ID}
		r.db.WithContext(ctx).Clauses().Create(&link)
	}
	return nil
}

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

type testCaseRow struct {
	ID             string    `gorm:"column:id"`
	ProjectID      string    `gorm:"column:project_id"`
	Code           string    `gorm:"column:code"`
	Title          string    `gorm:"column:title"`
	Objective      string    `gorm:"column:objective"`
	Preconditions  string    `gorm:"column:preconditions"`
	Steps          string    `gorm:"column:steps"`
	ExpectedResult string    `gorm:"column:expected_result"`
	Priority       string    `gorm:"column:priority"`
	Status         string    `gorm:"column:status"`
	ModuleID       *string   `gorm:"column:module_id"`
	StepType       string    `gorm:"column:step_type"`
	CreatedAt      time.Time `gorm:"column:created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at"`
}

func (testCaseRow) TableName() string { return "test_cases" }

func (r testCaseRow) toDomain() core.TestCase {
	tc := core.TestCase{
		ID:             r.ID,
		Code:           r.Code,
		Title:          r.Title,
		Objective:      r.Objective,
		Precondition:   r.Preconditions,
		ExpectedResult: r.ExpectedResult,
		Priority:       core.TestCasePriority(r.Priority),
		Status:         core.TestCaseStatus(r.Status),
		StepType:       core.StepType(r.StepType),
		ProjectID:      r.ProjectID,
		CreatedAt:      r.CreatedAt,
		UpdatedAt:      r.UpdatedAt,
	}
	if r.ModuleID != nil {
		tc.ModuleID = *r.ModuleID
	}
	return tc
}

type testCaseStepRow struct {
	ID             string    `gorm:"column:id"`
	TestCaseID     string    `gorm:"column:test_case_id"`
	StepNumber     int       `gorm:"column:step_number"`
	Action         string    `gorm:"column:action"`
	ExpectedResult *string   `gorm:"column:expected_result"`
	CreatedAt      time.Time `gorm:"column:created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at"`
}

func (testCaseStepRow) TableName() string { return "test_case_steps" }

func (r testCaseStepRow) toDomain() core.TestCaseStep {
	step := core.TestCaseStep{
		ID:          r.ID,
		TestCasedID: r.TestCaseID,
		Order:       r.StepNumber,
		Action:      r.Action,
	}
	if r.ExpectedResult != nil {
		step.Expectation = *r.ExpectedResult
	}
	return step
}

type testCaseTagRow struct {
	TestCaseID string `gorm:"column:test_case_id"`
	TagID      string `gorm:"column:tag_id"`
}

func (testCaseTagRow) TableName() string { return "test_case_tags" }

type tagRow struct {
	ID        string    `gorm:"column:id"`
	ProjectID string    `gorm:"column:project_id"`
	Name      string    `gorm:"column:name"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (tagRow) TableName() string { return "tags" }

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------
