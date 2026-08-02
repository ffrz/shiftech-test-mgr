package governance

import (
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// ToolAdder is the minimal server surface the governance wrapper needs. It is
// satisfied by *server.MCPServer, so Registrars keep accepting the concrete
// type; the wrapper is only invoked from main wiring.
type ToolAdder interface {
	AddTool(tool mcp.Tool, handler server.ToolHandlerFunc)
}

// Server wraps an MCPServer so every AddTool call routes its handler through
// the governance Service — the Go equivalent of Node's installToolGovernance,
// which overrides registerTool so no individual tool knows about governance.
type Server struct {
	*server.MCPServer
	svc *Service
}

// NewServer wraps base with governance. Registrars call Register on the
// returned server; all their tools are automatically governed.
func NewServer(base *server.MCPServer, svc *Service) *Server {
	return &Server{MCPServer: base, svc: svc}
}

// AddTool routes the handler through governance before handing it to the
// underlying MCPServer.
func (s *Server) AddTool(tool mcp.Tool, handler server.ToolHandlerFunc) {
	s.MCPServer.AddTool(tool, s.svc.Wrap(tool.Name, handler))
}
