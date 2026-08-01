package handler

import (
	"github.com/labstack/echo/v4"

	testrolesvc "github.com/shiftech/testmgr-backend/internal/service/testrole"
	"github.com/shiftech/testmgr-backend/internal/transport/http/dto"
	"github.com/shiftech/testmgr-backend/internal/transport/http/response"
	"github.com/shiftech/testmgr-backend/platform/eventbus"
)

type TestRoleHandler struct {
	svc    *testrolesvc.Service
	events eventbus.Broadcaster
}

func NewTestRoleHandler(svc *testrolesvc.Service, events eventbus.Broadcaster) *TestRoleHandler {
	return &TestRoleHandler{svc: svc, events: events}
}

func (h *TestRoleHandler) List(c echo.Context) error {
	roles, err := h.svc.ListByProject(c.Request().Context(), c.Param("projectId"))
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromTestRoles(roles))
}

func (h *TestRoleHandler) Create(c echo.Context) error {
	var req dto.CreateTestRoleRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	r, err := h.svc.Create(c.Request().Context(), c.Param("projectId"), req.Name)
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_roles", Action: "insert", Data: dto.FromTestRole(*r)})
	return response.Created(c, dto.FromTestRole(*r))
}

func (h *TestRoleHandler) Update(c echo.Context) error {
	var req dto.UpdateTestRoleRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	r, err := h.svc.Update(c.Request().Context(), c.Param("id"), req.Name)
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_roles", Action: "update", Data: dto.FromTestRole(*r)})
	return response.OK(c, dto.FromTestRole(*r))
}

func (h *TestRoleHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	if err := h.svc.Delete(c.Request().Context(), id); err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "test_roles", Action: "delete", Data: map[string]string{"id": id}})
	return response.NoContent(c)
}
