package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email        string             `bson:"email" json:"email"`
	PasswordHash string             `bson:"passwordHash" json:"-"`
	Name         string             `bson:"name" json:"name"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
}

type Project struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID      primitive.ObjectID `bson:"userId" json:"userId"`
	Name        string             `bson:"name" json:"name"`
	Slug        string             `bson:"slug" json:"slug"`
	Description string             `bson:"description" json:"description"`
	DeployURL   string             `bson:"deployUrl" json:"deployUrl"`
	APIKey      string             `bson:"apiKey" json:"apiKey"`
	Color       string             `bson:"color" json:"color"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}

const (
	TaskBacklog    = "backlog"
	TaskTodo       = "todo"
	TaskInProgress = "in_progress"
	TaskInReview   = "in_review"
	TaskDone       = "done"
	TaskCancelled  = "cancelled"
)

var TaskStatuses = []string{
	TaskBacklog, TaskTodo, TaskInProgress, TaskInReview, TaskDone, TaskCancelled,
}

type Task struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ProjectID   primitive.ObjectID `bson:"projectId" json:"projectId"`
	Title       string             `bson:"title" json:"title"`
	Description string             `bson:"description" json:"description"`
	Status      string             `bson:"status" json:"status"`
	Order       int                `bson:"order" json:"order"`
	Priority    string             `bson:"priority" json:"priority"`
	Color       string             `bson:"color" json:"color"`
	DueDate     *time.Time         `bson:"dueDate,omitempty" json:"dueDate,omitempty"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}

const (
	BugOpen          = "open"
	BugAcknowledged  = "acknowledged"
	BugInProgress    = "in_progress"
	BugResolved      = "resolved"
	BugClosed        = "closed"
)

type BugReport struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ProjectID     primitive.ObjectID `bson:"projectId" json:"projectId"`
	Title         string             `bson:"title" json:"title"`
	Description   string             `bson:"description" json:"description"`
	ReporterName  string             `bson:"reporterName" json:"reporterName"`
	ReporterEmail string             `bson:"reporterEmail" json:"reporterEmail"`
	PageURL       string             `bson:"pageUrl" json:"pageUrl"`
	Severity      string             `bson:"severity" json:"severity"`
	Status        string             `bson:"status" json:"status"`
	IsRead        bool               `bson:"isRead" json:"isRead"`
	Metadata      map[string]string  `bson:"metadata,omitempty" json:"metadata,omitempty"`
	CreatedAt     time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt     time.Time          `bson:"updatedAt" json:"updatedAt"`
}

const (
	FeatureSubmitted  = "submitted"
	FeatureUnderReview = "under_review"
	FeaturePlanned    = "planned"
	FeatureInProgress = "in_progress"
	FeatureShipped    = "shipped"
	FeatureDeclined   = "declined"
)

type FeatureRequest struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ProjectID     primitive.ObjectID `bson:"projectId" json:"projectId"`
	Title         string             `bson:"title" json:"title"`
	Description   string             `bson:"description" json:"description"`
	ReporterName  string             `bson:"reporterName" json:"reporterName"`
	ReporterEmail string             `bson:"reporterEmail" json:"reporterEmail"`
	Status        string             `bson:"status" json:"status"`
	IsRead        bool               `bson:"isRead" json:"isRead"`
	Votes         int                `bson:"votes" json:"votes"`
	CreatedAt     time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt     time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type VersionRelease struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ProjectID   primitive.ObjectID `bson:"projectId" json:"projectId"`
	Version     string             `bson:"version" json:"version"`
	Title       string             `bson:"title" json:"title"`
	Summary     string             `bson:"summary" json:"summary"`
	Features    []string           `bson:"features" json:"features"`
	Fixes       []string           `bson:"fixes" json:"fixes"`
	Breaking    []string           `bson:"breaking" json:"breaking"`
	IsPublished bool               `bson:"isPublished" json:"isPublished"`
	PublishedAt *time.Time         `bson:"publishedAt,omitempty" json:"publishedAt,omitempty"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
}
