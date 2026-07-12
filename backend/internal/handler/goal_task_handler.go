package handler

import (
	"context"
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
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type GoalTaskHandler struct {
	DB   *database.DB
	Goal *GoalHandler
}

func (h *GoalTaskHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, goalID, err := h.parseGoal(r)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.Goal.ensureGoalOwnership(r.Context(), userID, goalID); err != nil {
		httputil.Error(w, http.StatusNotFound, "goal not found")
		return
	}

	cursor, err := h.DB.Collection("goal_tasks").Find(r.Context(), bson.M{"goalId": goalID},
		options.Find().SetSort(bson.D{{Key: "order", Value: 1}}))
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not list tasks")
		return
	}
	defer cursor.Close(r.Context())

	var tasks []models.GoalTask
	cursor.All(r.Context(), &tasks)
	if tasks == nil {
		tasks = []models.GoalTask{}
	}
	httputil.JSON(w, http.StatusOK, tasks)
}

func (h *GoalTaskHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, goalID, err := h.parseGoal(r)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.Goal.ensureGoalOwnership(r.Context(), userID, goalID); err != nil {
		httputil.Error(w, http.StatusNotFound, "goal not found")
		return
	}

	var req struct {
		Title          string   `json:"title"`
		Description    string   `json:"description"`
		ParentID       string   `json:"parentId"`
		EstimatedHours float64  `json:"estimatedHours"`
		Priority       string   `json:"priority"`
		DueDate        string   `json:"dueDate"`
		DependsOn      []string `json:"dependsOn"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Title == "" {
		httputil.Error(w, http.StatusBadRequest, "title required")
		return
	}

	count, _ := h.DB.Collection("goal_tasks").CountDocuments(r.Context(), bson.M{"goalId": goalID})
	task := models.GoalTask{
		ID:             primitive.NewObjectID(),
		GoalID:         goalID,
		UserID:         userID,
		Title:          req.Title,
		Description:    req.Description,
		Status:         models.GoalTaskTodo,
		Priority:       req.Priority,
		EstimatedHours: req.EstimatedHours,
		Order:          int(count),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	if req.Priority == "" {
		task.Priority = "medium"
	}
	if req.ParentID != "" {
		pid, _ := primitive.ObjectIDFromHex(req.ParentID)
		task.ParentID = &pid
	}
	if req.DueDate != "" {
		if t, e := time.Parse("2006-01-02", req.DueDate); e == nil {
			task.DueDate = &t
		}
	}
	for _, dep := range req.DependsOn {
		if id, e := primitive.ObjectIDFromHex(dep); e == nil {
			task.DependsOn = append(task.DependsOn, id)
		}
	}

	h.DB.Collection("goal_tasks").InsertOne(r.Context(), task)
	h.recalcGoalProgress(r.Context(), goalID)
	httputil.JSON(w, http.StatusCreated, task)
}

func (h *GoalTaskHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, _, err := h.parseGoal(r)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	taskID, _ := primitive.ObjectIDFromHex(chi.URLParam(r, "taskID"))

	var req map[string]interface{}
	json.NewDecoder(r.Body).Decode(&req)
	allowed := map[string]bool{
		"title": true, "description": true, "status": true, "progress": true,
		"estimatedHours": true, "spentHours": true, "priority": true, "notes": true,
		"dependsOn": true, "attachments": true, "evidence": true,
	}
	update := bson.M{"updatedAt": time.Now()}
	for k, v := range req {
		if allowed[k] {
			update[k] = v
		}
	}

	ctx := r.Context()
	res, _ := h.DB.Collection("goal_tasks").UpdateOne(ctx,
		bson.M{"_id": taskID, "userId": userID}, bson.M{"$set": update})
	if res.MatchedCount == 0 {
		httputil.Error(w, http.StatusNotFound, "task not found")
		return
	}

	var task models.GoalTask
	h.DB.Collection("goal_tasks").FindOne(ctx, bson.M{"_id": taskID}).Decode(&task)
	h.recalcGoalProgress(ctx, task.GoalID)
	httputil.JSON(w, http.StatusOK, task)
}

func (h *GoalTaskHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, _, err := h.parseGoal(r)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	taskID, _ := primitive.ObjectIDFromHex(chi.URLParam(r, "taskID"))
	ctx := r.Context()

	var task models.GoalTask
	if h.DB.Collection("goal_tasks").FindOne(ctx, bson.M{"_id": taskID, "userId": userID}).Decode(&task) != nil {
		httputil.Error(w, http.StatusNotFound, "task not found")
		return
	}
	h.DB.Collection("goal_tasks").DeleteOne(ctx, bson.M{"_id": taskID})
	h.recalcGoalProgress(ctx, task.GoalID)
	w.WriteHeader(http.StatusNoContent)
}

func (h *GoalTaskHandler) Reorder(w http.ResponseWriter, r *http.Request) {
	userID, goalID, err := h.parseGoal(r)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	var req struct {
		Order []string `json:"order"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	ctx := r.Context()
	for i, idStr := range req.Order {
		id, _ := primitive.ObjectIDFromHex(idStr)
		h.DB.Collection("goal_tasks").UpdateOne(ctx,
			bson.M{"_id": id, "userId": userID, "goalId": goalID},
			bson.M{"$set": bson.M{"order": i, "updatedAt": time.Now()}},
		)
	}
	httputil.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *GoalTaskHandler) Dependencies(w http.ResponseWriter, r *http.Request) {
	_, goalID, err := h.parseGoal(r)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	cursor, _ := h.DB.Collection("goal_tasks").Find(r.Context(), bson.M{"goalId": goalID})
	var tasks []models.GoalTask
	if cursor != nil {
		cursor.All(r.Context(), &tasks)
		cursor.Close(r.Context())
	}
	type Node struct {
		ID       string   `json:"id"`
		Title    string   `json:"title"`
		Status   string   `json:"status"`
		Progress float64  `json:"progress"`
		DependsOn []string `json:"dependsOn"`
		Blocked  bool     `json:"blocked"`
	}
	done := map[string]bool{}
	for _, t := range tasks {
		if t.Status == models.GoalTaskDone {
			done[t.ID.Hex()] = true
		}
	}
	var nodes []Node
	for _, t := range tasks {
		blocked := false
		deps := []string{}
		for _, d := range t.DependsOn {
			depHex := d.Hex()
			deps = append(deps, depHex)
			if !done[depHex] {
				blocked = true
			}
		}
		nodes = append(nodes, Node{
			ID: t.ID.Hex(), Title: t.Title, Status: t.Status,
			Progress: t.Progress, DependsOn: deps, Blocked: blocked,
		})
	}
	if nodes == nil {
		nodes = []Node{}
	}
	httputil.JSON(w, http.StatusOK, nodes)
}

func (h *GoalTaskHandler) recalcGoalProgress(ctx context.Context, goalID primitive.ObjectID) {
	cursor, _ := h.DB.Collection("goal_tasks").Find(ctx, bson.M{"goalId": goalID, "parentId": nil})
	var tasks []models.GoalTask
	if cursor != nil {
		cursor.All(ctx, &tasks)
		cursor.Close(ctx)
	}
	if len(tasks) == 0 {
		return
	}
	totalProgress := 0.0
	for _, t := range tasks {
		if t.Status == models.GoalTaskDone {
			totalProgress += 100
		} else {
			totalProgress += t.Progress
		}
	}
	avgProgress := totalProgress / float64(len(tasks))
	h.DB.Collection("goals").UpdateOne(ctx, bson.M{"_id": goalID},
		bson.M{"$set": bson.M{"updatedAt": time.Now()}})
	_ = avgProgress
}

func (h *GoalTaskHandler) parseGoal(r *http.Request) (primitive.ObjectID, primitive.ObjectID, error) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		return primitive.NilObjectID, primitive.NilObjectID, err
	}
	goalID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "goalID"))
	if err != nil {
		return userID, primitive.NilObjectID, mongo.ErrNoDocuments
	}
	return userID, goalID, nil
}
