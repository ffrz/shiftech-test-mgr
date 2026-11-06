package governance

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"io"
	"strings"
	"sync/atomic"
	"testing"

	pgdriver "gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// A minimal fake database/sql driver: every query/exec succeeds and every query
// returns exactly one row. That is enough to push PostgresRepository through the
// real GORM code path (the one that used to panic) without needing a database.

var fakeExecs, fakeQueries atomic.Int32

func init() { sql.Register("governance-fake", fakeDriver{}) }

type fakeDriver struct{}

func (fakeDriver) Open(string) (driver.Conn, error) { return fakeConn{}, nil }

type fakeConn struct{}

func (fakeConn) Prepare(q string) (driver.Stmt, error) { return fakeStmt{query: q}, nil }
func (fakeConn) Close() error                           { return nil }
func (fakeConn) Begin() (driver.Tx, error)              { return nil, driver.ErrSkip }

type fakeStmt struct{ query string }

func (fakeStmt) Close() error  { return nil }
func (fakeStmt) NumInput() int { return -1 }
func (fakeStmt) Exec([]driver.Value) (driver.Result, error) {
	fakeExecs.Add(1)
	return driver.RowsAffected(1), nil
}
func (s fakeStmt) Query([]driver.Value) (driver.Rows, error) {
	fakeQueries.Add(1)
	if strings.Contains(s.query, "mcp_begin_tool_call") {
		return &fakeRows{cols: []string{"audit_id", "allowed"}, row: []driver.Value{"audit-1", true}}, nil
	}
	return &fakeRows{cols: []string{"mcp_complete_tool_call"}, row: []driver.Value{int64(1)}}, nil
}

type fakeRows struct {
	cols []string
	row  []driver.Value
	done bool
}

func (r *fakeRows) Columns() []string { return r.cols }
func (r *fakeRows) Close() error      { return nil }
func (r *fakeRows) Next(dest []driver.Value) error {
	if r.done {
		return io.EOF
	}
	r.done = true
	copy(dest, r.row)
	return nil
}

func newFakeSQLRepo(t *testing.T) *PostgresRepository {
	t.Helper()
	sqlDB, err := sql.Open("governance-fake", "")
	if err != nil {
		t.Fatalf("sql.Open: %v", err)
	}
	db, err := gorm.Open(pgdriver.New(pgdriver.Config{Conn: sqlDB}), &gorm.Config{Logger: logger.Discard})
	if err != nil {
		t.Fatalf("gorm.Open: %v", err)
	}
	return NewPostgresRepository(db)
}

func TestPostgresRepository_BeginToolCall(t *testing.T) {
	repo := newFakeSQLRepo(t)
	res, err := repo.BeginToolCall(context.Background(), "tm_x", "proj", "testify.project.list", 120, 60)
	if err != nil {
		t.Fatalf("BeginToolCall: %v", err)
	}
	if res.AuditID != "audit-1" || !res.Allowed {
		t.Errorf("result = %+v", res)
	}
}

// Regression: CompleteToolCall used `.Scan(nil)`, which makes GORM panic
// ("reflect: call of reflect.Value.Type on zero Value") as soon as the RPC
// returns a row — i.e. on every real tool call when governance was enabled.
func TestPostgresRepository_CompleteToolCall_DoesNotPanic(t *testing.T) {
	repo := newFakeSQLRepo(t)
	before := fakeExecs.Load() + fakeQueries.Load()
	if err := repo.CompleteToolCall(context.Background(), "tm_x", "proj", "audit-1", "completed", 12); err != nil {
		t.Fatalf("CompleteToolCall: %v", err)
	}
	if fakeExecs.Load()+fakeQueries.Load() == before {
		t.Error("CompleteToolCall never reached the database driver")
	}
}
