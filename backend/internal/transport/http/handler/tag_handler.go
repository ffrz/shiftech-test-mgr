package handler

import (
	"github.com/labstack/echo/v4"

	tagsvc "github.com/shiftech/testmgr-backend/internal/service/tag"
	"github.com/shiftech/testmgr-backend/internal/transport/http/dto"
	"github.com/shiftech/testmgr-backend/internal/transport/http/response"
	"github.com/shiftech/testmgr-backend/platform/eventbus"
)

type TagHandler struct {
	svc    *tagsvc.Service
	events eventbus.Broadcaster
}

func NewTagHandler(svc *tagsvc.Service, events eventbus.Broadcaster) *TagHandler {
	return &TagHandler{svc: svc, events: events}
}

func (h *TagHandler) List(c echo.Context) error {
	tags, err := h.svc.ListByProject(c.Request().Context(), c.Param("projectId"))
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromTags(tags))
}

// Create is find-or-create by name (see tagService.ts — there is no plain
// "insert a blank tag" operation).
func (h *TagHandler) Create(c echo.Context) error {
	var req dto.CreateTagRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	t, err := h.svc.Create(c.Request().Context(), c.Param("projectId"), req.Name)
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "tags", Action: "insert", Data: dto.FromTag(*t)})
	return response.Created(c, dto.FromTag(*t))
}

func (h *TagHandler) Rename(c echo.Context) error {
	var req dto.RenameTagRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	t, err := h.svc.Rename(c.Request().Context(), c.Param("id"), req.Name)
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "tags", Action: "update", Data: dto.FromTag(*t)})
	return response.OK(c, dto.FromTag(*t))
}

func (h *TagHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	if err := h.svc.Delete(c.Request().Context(), id); err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "tags", Action: "delete", Data: map[string]string{"id": id}})
	return response.NoContent(c)
}
