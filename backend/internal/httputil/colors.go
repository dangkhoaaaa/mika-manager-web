package httputil

import "math/rand"

var taskColors = []string{
	"#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
	"#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
}

func RandomTaskColor() string {
	return taskColors[rand.Intn(len(taskColors))]
}
