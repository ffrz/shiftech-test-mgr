package handler

import (
	"github.com/labstack/echo/v4"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/testplan"
	testplansvc "github.com/shiftech/testmgr-backend/internal/service/testplan"
	"github.com/shiftech/testmgr-backend/internal/transport/http/dto"
	"github.com/shiftech/testmgr-backend/internal/transport/http/response"
	"github.com/shiftech/testmgr-backend/platform/eventbus"
)

type TestPlanHandler struct {
	svc    *testplansvc.Service
	events eventbus.Broadcaster
}

func NewTestPlanHandler(svc *testplansvc.Service, events eventbus.Broadcaster) *TestPlanHandler {
	return &TestPlanHandler{svc: svc, events: events}
}

func (h *TestPlanHandler) List(c echo.Context) error {
	plans, err := h.svc.List(c.Request().Context(), c.Param("projectId"))
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromTestPlans(plans))
}

func (h *TestPlanHandler) GetByID(c echo.Context) error {
	p, err := h.svc.GetByID(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromTestPlan(*p))
}

func (h *TestPlanHandler) Create(c echo.Context) error {
	var req dto.CreateTestPlanRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	p, err := h.svc.Create(c.Request().Context(), testplansvc.CreateInput{
		ProjectID:   c.Param("projectId"),
		Name:        req.Name,
		Description: req.Description,
		Code:        req.Code,
	})
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_plans", Action: "insert", Data: dto.FromTestPlan(*p)})
	return response.Created(c, dto.FromTestPlan(*p))
}

func (h *TestPlanHandler) Update(c echo.Context) error {
	var req dto.UpdateTestPlanRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	p, err := h.svc.Update(c.Request().Context(), c.Param("id"), testplansvc.UpdateInput{
		Name:        req.Name,
		Description: req.Description,
		Code:        req.Code,
	})
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_plans", Action: "update", Data: dto.FromTestPlan(*p)})
	return response.OK(c, dto.FromTestPlan(*p))
}

func (h *TestPlanHandler) ChangeStatus(c echo.Context) error {
	var req dto.ChangeTestPlanStatusRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	p, err := h.svc.ChangeStatus(c.Request().Context(), c.Param("id"), testplan.Status(req.Status))
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_plans", Action: "update", Data: dto.FromTestPlan(*p)})
	return response.OK(c, dto.FromTestPlan(*p))
}

func (h *TestPlanHandler) Duplicate(c echo.Context) error {
	var req dto.DuplicateTestPlanRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	p, err := h.svc.Duplicate(c.Request().Context(), c.Param("id"), req.Name)
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_plans", Action: "insert", Data: dto.FromTestPlan(*p)})
	return response.Created(c, dto.FromTestPlan(*p))
}

func (h *TestPlanHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return apperror.Validation("test plan id is required", nil)
	}
	if err := h.svc.Remove(c.Request().Context(), id); err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_plans", Action: "delete", Data: map[string]string{"id": id}})
	return response.NoContent(c)
}

func (h *TestPlanHandler) ListCases(c echo.Context) error {
	cases, err := h.svc.ListCases(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromTestPlanCases(cases))
}

func (h *TestPlanHandler) AddCase(c echo.Context) error {
	var req dto.AddTestPlanCaseRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	tc, err := h.svc.AddCase(c.Request().Context(), c.Param("id"), req.TestCaseID, req.Order)
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_plan_cases", Action: "insert", Data: dto.FromTestPlanCase(*tc)})
	return response.Created(c, dto.FromTestPlanCase(*tc))
}

func (h *TestPlanHandler) RemoveCase(c echo.Context) error {
	caseID := c.Param("caseId")
	if caseID == "" {
		return apperror.Validation("test plan case id is required", nil)
	}
	if err := h.svc.RemoveCase(c.Request().Context(), caseID); err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_plan_cases", Action: "delete", Data: map[string]string{"id": caseID}})
	return response.NoContent(c)
}

func (h *TestPlanHandler) ReorderCases(c echo.Context) error {
	var req dto.ReorderTestPlanCasesRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	if err := h.svc.ReorderCases(c.Request().Context(), req.OrderedTestPlanCaseIDs); err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_plan_cases", Action: "update", Data: map[string]any{"test_plan_id": c.Param("id")}})
	return response.NoContent(c)
}
