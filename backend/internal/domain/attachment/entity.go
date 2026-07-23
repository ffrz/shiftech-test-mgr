package attachment

import "time"

// Attachment is a file attached to an Issue via a swappable storage adapter
// (see internal/service/storage) -- this domain type only persists metadata,
// the actual upload/storage integration is out of scope here.
type Attachment struct {
	ID              string
	IssueID         string
	StorageProvider string
	URL             string
	FileName        string
	FileSize        *int
	ContentType     string
	CreatedAt       time.Time
}
