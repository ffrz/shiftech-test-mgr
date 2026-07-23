package postgres

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

// isDuplicateKeyErr detects a Postgres unique_violation (SQLSTATE 23505).
func isDuplicateKeyErr(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
