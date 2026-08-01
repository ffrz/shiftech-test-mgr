package model

import "time"

func (Attachment) TableName() string { return "attachments" }

type Attachment struct {
	ID              string    `gorm:"column:id;type:char(36);primaryKey"`
	IssueID         string    `gorm:"column:issue_id;type:char(36);not null"`
	StorageProvider string    `gorm:"column:storage_provider;type:varchar(50);not null"`
	URL             string    `gorm:"column:url;type:text;not null"`
	FileName        string    `gorm:"column:file_name;type:varchar(500);not null"`
	FileSize        *int      `gorm:"column:file_size"`
	ContentType     string    `gorm:"column:content_type;type:varchar(255)"`
	CreatedAt       time.Time `gorm:"column:created_at"`
}
