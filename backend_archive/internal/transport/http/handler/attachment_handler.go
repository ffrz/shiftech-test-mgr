package handler

import (
	"github.com/labstack/echo/v4"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	attachmentsvc "github.com/shiftech/testmgr-backend/internal/service/attachment"
	"github.com/shiftech/testmgr-backend/internal/transport/http/dto"
	"github.com/shiftech/testmgr-backend/internal/transport/http/response"
	"github.com/shiftech/testmgr-backend/platform/eventbus"
)

type AttachmentHandler struct {
	svc    *attachmentsvc.Service
	events eventbus.Broadcaster
}

func NewAttachmentHandler(svc *attachmentsvc.Service, events eventbus.Broadcaster) *AttachmentHandler {
	return &AttachmentHandler{svc: svc, events: events}
}

func (h *AttachmentHandler) List(c echo.Context) error {
	attachments, err := h.svc.ListByIssue(c.Request().Context(), c.Param("issueId"))
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromAttachments(attachments))
}

// Create only persists attachment metadata -- the URL is assumed to already
// exist (actual upload/storage integration is out of scope, see task
// constraints).
func (h *AttachmentHandler) Create(c echo.Context) error {
	var req dto.CreateAttachmentRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	a, err := h.svc.Create(c.Request().Context(), attachmentsvc.CreateInput{
		IssueID:         c.Param("issueId"),
		StorageProvider: req.StorageProvider,
		URL:             req.URL,
		FileName:        req.FileName,
		FileSize:        req.FileSize,
		ContentType:     req.ContentType,
	})
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "attachments", Action: "insert", Data: dto.FromAttachment(*a)})
	return response.Created(c, dto.FromAttachment(*a))
}

func (h *AttachmentHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return apperror.Validation("attachment id is required", nil)
	}
	if err := h.svc.Remove(c.Request().Context(), id); err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "attachments", Action: "delete", Data: map[string]string{"id": id}})
	return response.NoContent(c)
}
