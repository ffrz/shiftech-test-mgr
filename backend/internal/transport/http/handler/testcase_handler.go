package handler

import (
	"bytes"
	"encoding/json"
	"io"

	"github.com/labstack/echo/v4"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/testcase"
	testcasesvc "github.com/shiftech/testmgr-backend/internal/service/testcase"
	"github.com/shiftech/testmgr-backend/internal/transport/http/dto"
	"github.com/shiftech/testmgr-backend/internal/transport/http/response"
	"github.com/shiftech/testmgr-backend/platform/eventbus"
)

type TestCaseHandler struct {
	svc    *testcasesvc.Service
	events eventbus.Broadcaster
}

func NewTestCaseHandler(svc *testcasesvc.Service, events eventbus.Broadcaster) *TestCaseHandler {
	return &TestCaseHandler{svc: svc, events: events}
}

// List supports the same search/status/priority/module/tag filters as
// testCaseRepository.ts's implicit query surface — all narrowed in the
// database, not here.
func (h *TestCaseHandler) List(c echo.Context) error {
	projectID := c.Param("projectId")
	query := testcase.Query{
		Search:   c.QueryParam("search"),
		Status:   testcase.Status(c.QueryParam("status")),
		Priority: testcase.Priority(c.QueryParam("priority")),
		ModuleID: c.QueryParam("module_id"),
	}
	if tagIDs := c.QueryParams()["tag_id"]; len(tagIDs) > 0 {
		query.TagIDs = tagIDs
	}

	cases, err := h.svc.List(c.Request().Context(), projectID, query)
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromTestCases(cases))
}

func (h *TestCaseHandler) GetByID(c echo.Context) error {
	tc, err := h.svc.GetByID(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromTestCaseWithDetails(*tc))
}

func (h *TestCaseHandler) Create(c echo.Context) error {
	var req dto.CreateTestCaseRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	steps := make([]testcasesvc.DetailedStepInput, len(req.DetailedSteps))
	for i, s := range req.DetailedSteps {
		steps[i] = testcasesvc.DetailedStepInput{Action: s.Action, ExpectedResult: s.ExpectedResult}
	}

	tc, err := h.svc.Create(c.Request().Context(), testcasesvc.CreateInput{
		ProjectID:      c.Param("projectId"),
		ModuleID:       req.ModuleID,
		Code:           req.Code,
		Title:          req.Title,
		Objective:      req.Objective,
		Preconditions:  req.Preconditions,
		Steps:          req.Steps,
		ExpectedResult: req.ExpectedResult,
		Priority:       testcase.Priority(req.Priority),
		Notes:          req.Notes,
		StepType:       testcase.StepType(req.StepType),
		TargetRoleID:   req.TargetRoleID,
		TagIDs:         req.TagIDs,
		DetailedSteps:  steps,
	})
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_cases", Action: "insert", Data: dto.FromTestCase(*tc)})
	return response.Created(c, dto.FromTestCase(*tc))
}

// presentFields reads the raw request body into a key set so Update can
// tell "field omitted" apart from "field explicitly set to its zero value"
// — c.Bind alone collapses both cases, which would silently clear columns
// on every partial-update PUT (e.g. target_role_id: null vs. omitted must
// be distinguishable). Returns the body bytes too, so the caller can restore
// them for the subsequent c.Bind call.
func presentFields(c echo.Context) (map[string]json.RawMessage, []byte, error) {
	if c.Request().Body == nil {
		return map[string]json.RawMessage{}, nil, nil
	}
	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return map[string]json.RawMessage{}, nil, err
	}
	var raw map[string]json.RawMessage
	_ = json.Unmarshal(body, &raw) // BindAndValidate below reports malformed JSON
	return raw, body, nil
}

func (h *TestCaseHandler) Update(c echo.Context) error {
	fields, body, err := presentFields(c)
	if err == nil {
		c.Request().Body = io.NopCloser(bytes.NewReader(body))
	}

	var req dto.UpdateTestCaseRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}
	if _, ok := fields["module_id"]; ok {
		req.ModuleIDSet = true
	}
	if _, ok := fields["target_role_id"]; ok {
		req.TargetRoleSet = true
	}

	input := testcasesvc.UpdateInput{
		ModuleID:       req.ModuleID,
		ModuleIDSet:    req.ModuleIDSet,
		Code:           req.Code,
		Title:          req.Title,
		Objective:      req.Objective,
		Preconditions:  req.Preconditions,
		Steps:          req.Steps,
		ExpectedResult: req.ExpectedResult,
		Notes:          req.Notes,
		TargetRoleID:   req.TargetRoleID,
		TargetRoleSet:  req.TargetRoleSet,
	}
	if req.Priority != nil {
		p := testcase.Priority(*req.Priority)
		input.Priority = &p
	}
	if req.Status != nil {
		s := testcase.Status(*req.Status)
		input.Status = &s
	}
	if req.StepType != nil {
		st := testcase.StepType(*req.StepType)
		input.StepType = &st
	}
	if req.TagIDs != nil {
		input.TagIDs = *req.TagIDs
		input.TagIDsSet = true
	}
	if req.DetailedSteps != nil {
		steps := make([]testcasesvc.DetailedStepInput, len(*req.DetailedSteps))
		for i, s := range *req.DetailedSteps {
			steps[i] = testcasesvc.DetailedStepInput{Action: s.Action, ExpectedResult: s.ExpectedResult}
		}
		input.DetailedSteps = steps
		input.DetailedSet = true
	}

	tc, err := h.svc.Update(c.Request().Context(), c.Param("id"), input)
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_cases", Action: "update", Data: dto.FromTestCase(*tc)})
	return response.OK(c, dto.FromTestCase(*tc))
}

func (h *TestCaseHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return apperror.Validation("test case id is required", nil)
	}
	if err := h.svc.Delete(c.Request().Context(), id); err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_cases", Action: "delete", Data: map[string]string{"id": id}})
	return response.NoContent(c)
}
