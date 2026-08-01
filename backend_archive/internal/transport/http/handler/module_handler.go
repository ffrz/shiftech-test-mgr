package handler

import (
	"github.com/labstack/echo/v4"

	modulesvc "github.com/shiftech/testmgr-backend/internal/service/module"
	"github.com/shiftech/testmgr-backend/internal/transport/http/dto"
	"github.com/shiftech/testmgr-backend/internal/transport/http/response"
	"github.com/shiftech/testmgr-backend/platform/eventbus"
)

type ModuleHandler struct {
	svc    *modulesvc.Service
	events eventbus.Broadcaster
}

func NewModuleHandler(svc *modulesvc.Service, events eventbus.Broadcaster) *ModuleHandler {
	return &ModuleHandler{svc: svc, events: events}
}

func (h *ModuleHandler) List(c echo.Context) error {
	modules, err := h.svc.ListByProject(c.Request().Context(), c.Param("projectId"))
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromModules(modules))
}

func (h *ModuleHandler) Create(c echo.Context) error {
	var req dto.CreateModuleRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	m, err := h.svc.Create(c.Request().Context(), modulesvc.CreateInput{
		ProjectID: c.Param("projectId"),
		Name:      req.Name,
		Code:      req.Code,
	})
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "modules", Action: "insert", Data: dto.FromModule(*m)})
	return response.Created(c, dto.FromModule(*m))
}

func (h *ModuleHandler) Update(c echo.Context) error {
	var req dto.UpdateModuleRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	m, err := h.svc.Update(c.Request().Context(), c.Param("id"), modulesvc.UpdateInput{
		Name: req.Name,
		Code: req.Code,
	})
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "modules", Action: "update", Data: dto.FromModule(*m)})
	return response.OK(c, dto.FromModule(*m))
}

func (h *ModuleHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	if err := h.svc.Delete(c.Request().Context(), id); err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "modules", Action: "delete", Data: map[string]string{"id": id}})
	return response.NoContent(c)
}
