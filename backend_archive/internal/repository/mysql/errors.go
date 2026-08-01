package mysql

import (
	"errors"

	"github.com/go-sql-driver/mysql"
)

// isDuplicateKeyErr detects a MySQL unique-constraint violation (error 1062)
// so repositories can translate it into apperror.Conflict instead of a
// generic 500 — same intent as checking a Postgres unique_violation code.
func isDuplicateKeyErr(err error) bool {
	var mysqlErr *mysql.MySQLError
	return errors.As(err, &mysqlErr) && mysqlErr.Number == 1062
}
