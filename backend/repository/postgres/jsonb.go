package postgres

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"

	"github.com/shiftech/testify-platform/core"
)

// externalLinks maps the external_links jsonb column (array of
// {url, label?}) onto the domain type. jsonb columns are returned by the
// Postgres driver as []byte, so this type implements sql.Scanner + driver.Valuer
// to avoid GORM warnings and keep the mapping in one place.
type externalLinks []core.ExternalLink

func (s *externalLinks) Scan(value any) error {
	if value == nil {
		*s = nil
		return nil
	}
	var b []byte
	switch v := value.(type) {
	case []byte:
		b = v
	case string:
		b = []byte(v)
	default:
		return fmt.Errorf("external_links: cannot scan %T", value)
	}
	return json.Unmarshal(b, s)
}

func (s externalLinks) Value() (driver.Value, error) {
	if s == nil {
		return "[]", nil
	}
	return json.Marshal(s)
}

// nonNilLinks guarantees a non-nil slice so GORM emits '[]' (not NULL) for the
// external_links jsonb column during Create. A nil slice is treated as a zero
// value by GORM and is omitted from the insert, which violates the NOT NULL
// constraint even though the column default is '[]'.
func nonNilLinks(l externalLinks) externalLinks {
	if l == nil {
		return externalLinks{}
	}
	return l
}

// jsonbMap maps the entity_activity.payload jsonb column (a free-form object,
// e.g. {body: "..."} for comments) onto a domain map. Same Scanner/Valuer
// treatment as externalLinks above.
type jsonbMap map[string]any

func (m *jsonbMap) Scan(value any) error {
	if value == nil {
		*m = nil
		return nil
	}
	var b []byte
	switch v := value.(type) {
	case []byte:
		b = v
	case string:
		b = []byte(v)
	default:
		return fmt.Errorf("jsonb payload: cannot scan %T", value)
	}
	return json.Unmarshal(b, m)
}

func (m jsonbMap) Value() (driver.Value, error) {
	if m == nil {
		return "{}", nil
	}
	return json.Marshal(m)
}

// strOrEmpty dereferences an optional text pointer, mapping NULL/absent to "".
func strOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// emptyToNil maps an empty string to nil (JSON null), preserving null-ness
// for optional text columns that come back as "" from GORM.
func emptyToNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
