package model

import "time"

func (Attachment) TableName() string { return "attachments" }

type Attachment struct {
	ID              string    `gorm:"column:id;type:uuid;primaryKey"`
	IssueID         string    `gorm:"column:issue_id;type:uuid;not null"`
	StorageProvider string    `gorm:"column:storage_provider;type:text;not null"`
	URL             string    `gorm:"column:url;type:text;not null"`
	FileName        string    `gorm:"column:file_name;type:text;not null"`
	FileSize        *int      `gorm:"column:file_size"`
	ContentType     string    `gorm:"column:content_type;type:text"`
	CreatedAt       time.Time `gorm:"column:created_at"`
}
