package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type BoardColumn struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ProjectID primitive.ObjectID `bson:"projectId" json:"projectId"`
	Key       string             `bson:"key" json:"key"`
	Label     string             `bson:"label" json:"label"`
	Order     int                `bson:"order" json:"order"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

func DefaultBoardColumns(projectID primitive.ObjectID, now time.Time) []BoardColumn {
	defaults := []struct {
		key   string
		label string
		order int
	}{
		{"backlog", "Backlog", 0},
		{"in_progress", "In Progress", 1},
		{"todo", "To Do", 2},
		{"in_review", "In Review", 3},
		{"done", "Done", 4},
	}
	cols := make([]BoardColumn, len(defaults))
	for i, d := range defaults {
		cols[i] = BoardColumn{
			ID:        primitive.NewObjectID(),
			ProjectID: projectID,
			Key:       d.key,
			Label:     d.label,
			Order:     d.order,
			CreatedAt: now,
		}
	}
	return cols
}
