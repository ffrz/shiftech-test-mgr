package handler

import (
	"github.com/labstack/echo/v4"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/testrun"
	testrunsvc "github.com/shiftech/testmgr-backend/internal/service/testrun"
	"github.com/shiftech/testmgr-backend/internal/transport/http/dto"
	"github.com/shiftech/testmgr-backend/internal/transport/http/response"
	"github.com/shiftech/testmgr-backend/platform/eventbus"
)

type TestRunHandler struct {
	svc    *testrunsvc.Service
	events eventbus.Broadcaster
}

func NewTestRunHandler(svc *testrunsvc.Service, events eventbus.Broadcaster) *TestRunHandler {
	return &TestRunHandler{svc: svc, events: events}
}

func (h *TestRunHandler) List(c echo.Context) error {
	runs, err := h.svc.ListByProject(c.Request().Context(), c.Param("projectId"))
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromTestRuns(runs))
}

func (h *TestRunHandler) ListByPlan(c echo.Context) error {
	runs, err := h.svc.ListByPlan(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromTestRuns(runs))
}

func (h *TestRunHandler) GetByID(c echo.Context) error {
	run, err := h.svc.GetByID(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromTestRun(*run))
}

// GetWithResults returns the run's results plus a summary computed on the
// fly (never a stored column) -- see service/testrun/service.go.
func (h *TestRunHandler) GetWithResults(c echo.Context) error {
	withResults, err := h.svc.GetWithResults(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromTestRunWithResults(*withResults))
}

func (h *TestRunHandler) Start(c echo.Context) error {
	var req dto.StartTestRunRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	run, err := h.svc.Start(c.Request().Context(), c.Param("projectId"), req.TestPlanID, req.Name, req.Code)
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_runs", Action: "insert", Data: dto.FromTestRun(*run)})
	return response.Created(c, dto.FromTestRun(*run))
}

func (h *TestRunHandler) StartCustom(c echo.Context) error {
	var req dto.StartCustomTestRunRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	run, err := h.svc.StartCustom(c.Request().Context(), c.Param("projectId"), req.Name, req.TestCaseIDs, req.Code)
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_runs", Action: "insert", Data: dto.FromTestRun(*run)})
	return response.Created(c, dto.FromTestRun(*run))
}

func (h *TestRunHandler) Rename(c echo.Context) error {
	var req dto.RenameTestRunRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	run, err := h.svc.Rename(c.Request().Context(), c.Param("id"), req.Name, req.Code)
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_runs", Action: "update", Data: dto.FromTestRun(*run)})
	return response.OK(c, dto.FromTestRun(*run))
}

// Complete is always a manual action, independent of the on-the-fly summary
// calculation exposed by GetWithResults.
func (h *TestRunHandler) Complete(c echo.Context) error {
	var req dto.CompleteTestRunRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	run, err := h.svc.Complete(c.Request().Context(), c.Param("id"), req.Notes)
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_runs", Action: "update", Data: dto.FromTestRun(*run)})
	return response.OK(c, dto.FromTestRun(*run))
}

func (h *TestRunHandler) Reopen(c echo.Context) error {
	run, err := h.svc.Reopen(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_runs", Action: "update", Data: dto.FromTestRun(*run)})
	return response.OK(c, dto.FromTestRun(*run))
}

func (h *TestRunHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return apperror.Validation("test run id is required", nil)
	}
	if err := h.svc.Remove(c.Request().Context(), id); err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_runs", Action: "delete", Data: map[string]string{"id": id}})
	return response.NoContent(c)
}

func (h *TestRunHandler) RecordResult(c echo.Context) error {
	var req dto.RecordTestResultRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	result, err := h.svc.RecordResult(c.Request().Context(), c.Param("resultId"), testrun.ResultStatus(req.Status), req.TesterID, req.Notes)
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_results", Action: "update", Data: dto.FromTestResult(*result)})
	return response.OK(c, dto.FromTestResult(*result))
}

func (h *TestRunHandler) SyncResult(c echo.Context) error {
	result, err := h.svc.SyncResultWithTestCase(c.Request().Context(), c.Param("id"), c.Param("resultId"))
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_results", Action: "update", Data: dto.FromTestResult(*result)})
	return response.OK(c, dto.FromTestResult(*result))
}

func (h *TestRunHandler) RecordStepResult(c echo.Context) error {
	var req dto.RecordTestResultStepRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	step, err := h.svc.RecordStepResult(c.Request().Context(), c.Param("stepId"), testrun.StepStatus(req.Status), req.ActualResult)
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_result_steps", Action: "update", Data: dto.FromTestResultStep(*step)})
	return response.OK(c, dto.FromTestResultStep(*step))
}
