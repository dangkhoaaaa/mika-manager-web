package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/mika/mika-manager-api/internal/database"
	"github.com/mika/mika-manager-api/internal/httputil"
	"github.com/mika/mika-manager-api/internal/middleware"
	"github.com/mika/mika-manager-api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type TaskHandler struct {
	DB      *database.DB
	Project *ProjectHandler
}

func (h *TaskHandler) List(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}
	cur, err := h.DB.Collection("tasks").Find(r.Context(),
		bson.M{"projectId": p.ID},
	)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer cur.Close(r.Context())

	var tasks []models.Task
	if err := cur.All(r.Context(), &tasks); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "decode failed")
		return
	}
	if tasks == nil {
		tasks = []models.Task{}
	}
	httputil.JSON(w, http.StatusOK, tasks)
}

func (h *TaskHandler) Create(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}

	var body struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		Status      string `json:"status"`
		Priority    string `json:"priority"`
		Color       string `json:"color"`
		Order       int    `json:"order"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" {
		httputil.Error(w, http.StatusBadRequest, "title required")
		return
	}
	status := body.Status
	if status == "" {
		status = models.TaskTodo
	}
	priority := body.Priority
	if priority == "" {
		priority = "medium"
	}
	color := body.Color
	if color == "" {
		color = httputil.RandomTaskColor()
	}

	now := time.Now()
	task := models.Task{
		ID:          primitive.NewObjectID(),
		ProjectID:   p.ID,
		Title:       body.Title,
		Description: body.Description,
		Status:      status,
		Order:       body.Order,
		Priority:    priority,
		Color:       color,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if _, err := h.DB.Collection("tasks").InsertOne(r.Context(), task); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not create task")
		return
	}
	httputil.JSON(w, http.StatusCreated, task)
}

func (h *TaskHandler) Update(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}
	tid, err := primitive.ObjectIDFromHex(chi.URLParam(r, "taskID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid task id")
		return
	}

	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	set := bson.M{"updatedAt": time.Now()}
	for _, k := range []string{"title", "description", "status", "order", "priority", "color"} {
		if v, ok := body[k]; ok {
			set[k] = v
		}
	}

	res, err := h.DB.Collection("tasks").UpdateOne(r.Context(),
		bson.M{"_id": tid, "projectId": p.ID},
		bson.M{"$set": set},
	)
	if err != nil || res.MatchedCount == 0 {
		httputil.Error(w, http.StatusNotFound, "task not found")
		return
	}

	var task models.Task
	_ = h.DB.Collection("tasks").FindOne(r.Context(), bson.M{"_id": tid}).Decode(&task)
	httputil.JSON(w, http.StatusOK, task)
}

func (h *TaskHandler) Delete(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}
	tid, err := primitive.ObjectIDFromHex(chi.URLParam(r, "taskID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid task id")
		return
	}
	res, err := h.DB.Collection("tasks").DeleteOne(r.Context(), bson.M{"_id": tid, "projectId": p.ID})
	if err != nil || res.DeletedCount == 0 {
		httputil.Error(w, http.StatusNotFound, "task not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type reorderItem struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	Order  int    `json:"order"`
}

func (h *TaskHandler) Reorder(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}

	var items []reorderItem
	if err := json.NewDecoder(r.Body).Decode(&items); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	now := time.Now()
	for _, item := range items {
		tid, err := primitive.ObjectIDFromHex(item.ID)
		if err != nil {
			continue
		}
		_, _ = h.DB.Collection("tasks").UpdateOne(r.Context(),
			bson.M{"_id": tid, "projectId": p.ID},
			bson.M{"$set": bson.M{"status": item.Status, "order": item.Order, "updatedAt": now}},
		)
	}

	h.List(w, r)
}

func (h *ProjectHandler) loadProject(w http.ResponseWriter, r *http.Request) (*models.Project, bool) {
	uid, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return nil, false
	}
	pid, err := primitive.ObjectIDFromHex(chi.URLParam(r, "projectID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid project id")
		return nil, false
	}
	p, err := h.getOwned(r.Context(), pid, uid)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "project not found")
		return nil, false
	}
	return p, true
}
