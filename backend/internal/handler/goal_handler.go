package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/mika/mika-manager-api/internal/database"
	"github.com/mika/mika-manager-api/internal/httputil"
	"github.com/mika/mika-manager-api/internal/middleware"
	"github.com/mika/mika-manager-api/internal/models"
	"github.com/mika/mika-manager-api/internal/service"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type GoalHandler struct {
	DB      *database.DB
	Stats   *service.StatsService
	Achieve *service.AchievementService
}

func (h *GoalHandler) ownerID(r *http.Request) (primitive.ObjectID, error) {
	return primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
}

func (h *GoalHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, err := h.ownerID(r)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	status := r.URL.Query().Get("status")
	search := strings.TrimSpace(r.URL.Query().Get("q"))

	filter := bson.M{"userId": userID}
	if status != "" {
		filter["status"] = status
	}
	if search != "" {
		filter["$or"] = []bson.M{
			{"title": bson.M{"$regex": search, "$options": "i"}},
			{"description": bson.M{"$regex": search, "$options": "i"}},
			{"tags": bson.M{"$regex": search, "$options": "i"}},
		}
	}

	opts := options.Find().SetSort(bson.D{{Key: "order", Value: 1}, {Key: "createdAt", Value: -1}})
	cursor, err := h.DB.Collection("goals").Find(r.Context(), filter, opts)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not list goals")
		return
	}
	defer cursor.Close(r.Context())

	var goals []models.Goal
	if err := cursor.All(r.Context(), &goals); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not decode goals")
		return
	}
	if goals == nil {
		goals = []models.Goal{}
	}
	httputil.JSON(w, http.StatusOK, goals)
}

func (h *GoalHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, err := h.ownerID(r)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	var req struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Icon        string   `json:"icon"`
		CoverImage  string   `json:"coverImage"`
		Color       string   `json:"color"`
		StartDate   string   `json:"startDate"`
		Deadline    string   `json:"deadline"`
		TargetHours float64  `json:"targetHours"`
		TargetDays  int      `json:"targetDays"`
		Visibility  string   `json:"visibility"`
		Tags        []string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if strings.TrimSpace(req.Title) == "" {
		httputil.Error(w, http.StatusBadRequest, "title required")
		return
	}

	count, _ := h.DB.Collection("goals").CountDocuments(r.Context(), bson.M{"userId": userID})
	startDate := time.Now()
	if req.StartDate != "" {
		if t, err := time.Parse("2006-01-02", req.StartDate); err == nil {
			startDate = t
		}
	}
	var deadline *time.Time
	if req.Deadline != "" {
		if t, err := time.Parse("2006-01-02", req.Deadline); err == nil {
			deadline = &t
		}
	}
	visibility := req.Visibility
	if visibility == "" {
		visibility = models.VisibilityPrivate
	}
	color := req.Color
	if color == "" {
		color = "#6366f1"
	}
	icon := req.Icon
	if icon == "" {
		icon = "🎯"
	}

	goal := models.Goal{
		ID:          primitive.NewObjectID(),
		UserID:      userID,
		Title:       strings.TrimSpace(req.Title),
		Description: req.Description,
		Icon:        icon,
		CoverImage:  req.CoverImage,
		Color:       color,
		StartDate:   startDate,
		Deadline:    deadline,
		TargetHours: req.TargetHours,
		TargetDays:  req.TargetDays,
		Status:      models.GoalActive,
		Visibility:  visibility,
		Tags:        req.Tags,
		Order:       int(count),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	ctx := r.Context()
	if _, err := h.DB.Collection("goals").InsertOne(ctx, goal); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not create goal")
		return
	}

	h.Achieve.CheckAndUnlock(ctx, userID)
	httputil.JSON(w, http.StatusCreated, goal)
}

func (h *GoalHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, err := h.ownerID(r)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}
	goalID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "goalID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid goal id")
		return
	}

	var goal models.Goal
	err = h.DB.Collection("goals").FindOne(r.Context(), bson.M{"_id": goalID, "userId": userID}).Decode(&goal)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			httputil.Error(w, http.StatusNotFound, "goal not found")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "could not get goal")
		return
	}
	httputil.JSON(w, http.StatusOK, goal)
}

func (h *GoalHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, err := h.ownerID(r)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}
	goalID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "goalID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid goal id")
		return
	}

	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	allowed := map[string]bool{
		"title": true, "description": true, "icon": true, "coverImage": true,
		"color": true, "targetHours": true, "targetDays": true, "status": true,
		"visibility": true, "tags": true,
	}
	update := bson.M{}
	for k, v := range req {
		if allowed[k] {
			update[k] = v
		}
	}
	if len(update) == 0 {
		httputil.Error(w, http.StatusBadRequest, "no valid fields")
		return
	}
	update["updatedAt"] = time.Now()

	ctx := r.Context()
	res, err := h.DB.Collection("goals").UpdateOne(ctx,
		bson.M{"_id": goalID, "userId": userID},
		bson.M{"$set": update},
	)
	if err != nil || res.MatchedCount == 0 {
		httputil.Error(w, http.StatusNotFound, "goal not found")
		return
	}

	if status, ok := update["status"].(string); ok && status == models.GoalCompleted {
		h.Achieve.CheckAndUnlock(ctx, userID)
	}

	var goal models.Goal
	h.DB.Collection("goals").FindOne(ctx, bson.M{"_id": goalID}).Decode(&goal)
	httputil.JSON(w, http.StatusOK, goal)
}

func (h *GoalHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, err := h.ownerID(r)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}
	goalID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "goalID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid goal id")
		return
	}

	ctx := r.Context()
	res, err := h.DB.Collection("goals").DeleteOne(ctx, bson.M{"_id": goalID, "userId": userID})
	if err != nil || res.DeletedCount == 0 {
		httputil.Error(w, http.StatusNotFound, "goal not found")
		return
	}
	h.DB.Collection("daily_logs").DeleteMany(ctx, bson.M{"goalId": goalID})
	w.WriteHeader(http.StatusNoContent)
}

func (h *GoalHandler) Reorder(w http.ResponseWriter, r *http.Request) {
	userID, err := h.ownerID(r)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	var req struct {
		Order []string `json:"order"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	ctx := r.Context()
	for i, idStr := range req.Order {
		id, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			continue
		}
		h.DB.Collection("goals").UpdateOne(ctx,
			bson.M{"_id": id, "userId": userID},
			bson.M{"$set": bson.M{"order": i, "updatedAt": time.Now()}},
		)
	}
	httputil.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *GoalHandler) GoalStats(w http.ResponseWriter, r *http.Request) {
	userID, err := h.ownerID(r)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}
	goalID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "goalID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid goal id")
		return
	}

	ctx := r.Context()
	var goal models.Goal
	if err := h.DB.Collection("goals").FindOne(ctx, bson.M{"_id": goalID, "userId": userID}).Decode(&goal); err != nil {
		httputil.Error(w, http.StatusNotFound, "goal not found")
		return
	}

	period := r.URL.Query().Get("period")
	if period == "" {
		period = "weekly"
	}

	var start time.Time
	now := time.Now()
	switch period {
	case "monthly":
		start = service.StartOfMonth(now)
	case "yearly":
		start = service.StartOfYear(now)
	default:
		start = service.StartOfWeek(now)
	}

	pipeline := []bson.M{
		{"$match": bson.M{
			"goalId": goalID,
			"date":   bson.M{"$gte": start},
		}},
		{"$group": bson.M{
			"_id":   bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$date"}},
			"hours": bson.M{"$sum": "$hoursStudied"},
			"tasks": bson.M{"$sum": "$tasksCompleted"},
		}},
		{"$sort": bson.M{"_id": 1}},
	}

	cursor, _ := h.DB.Collection("daily_logs").Aggregate(ctx, pipeline)
	var chartData []map[string]interface{}
	if cursor != nil {
		defer cursor.Close(ctx)
		for cursor.Next(ctx) {
			var row struct {
				ID    string  `bson:"_id"`
				Hours float64 `bson:"hours"`
				Tasks int     `bson:"tasks"`
			}
			cursor.Decode(&row)
			chartData = append(chartData, map[string]interface{}{
				"date": row.ID, "hours": row.Hours, "tasks": row.Tasks,
			})
		}
	}
	if chartData == nil {
		chartData = []map[string]interface{}{}
	}

	remainingDays := 0
	if goal.Deadline != nil {
		diff := goal.Deadline.Sub(now)
		remainingDays = int(diff.Hours() / 24)
		if remainingDays < 0 {
			remainingDays = 0
		}
	}

	progress := 0.0
	if goal.TargetHours > 0 {
		progress = (goal.TotalHours / goal.TargetHours) * 100
		if progress > 100 {
			progress = 100
		}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"goal":          goal,
		"chartData":     chartData,
		"remainingDays": remainingDays,
		"progress":      progress,
		"period":        period,
	})
}

func (h *GoalHandler) Heatmap(w http.ResponseWriter, r *http.Request) {
	userID, err := h.ownerID(r)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}
	goalID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "goalID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid goal id")
		return
	}

	year := time.Now().Year()
	if y := r.URL.Query().Get("year"); y != "" {
		if parsed, err := time.Parse("2006", y); err == nil {
			year = parsed.Year()
		}
	}

	start := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(year+1, 1, 1, 0, 0, 0, 0, time.UTC)

	pipeline := []bson.M{
		{"$match": bson.M{
			"userId": userID,
			"goalId": goalID,
			"date":   bson.M{"$gte": start, "$lt": end},
		}},
		{"$group": bson.M{
			"_id":   bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$date"}},
			"hours": bson.M{"$sum": "$hoursStudied"},
			"count": bson.M{"$sum": 1},
		}},
	}

	ctx := r.Context()
	cursor, _ := h.DB.Collection("daily_logs").Aggregate(ctx, pipeline)
	data := map[string]interface{}{}
	if cursor != nil {
		defer cursor.Close(ctx)
		for cursor.Next(ctx) {
			var row struct {
				ID    string  `bson:"_id"`
				Hours float64 `bson:"hours"`
				Count int     `bson:"count"`
			}
			cursor.Decode(&row)
			data[row.ID] = map[string]interface{}{"hours": row.Hours, "count": row.Count}
		}
	}
	httputil.JSON(w, http.StatusOK, data)
}

func (h *GoalHandler) Gallery(w http.ResponseWriter, r *http.Request) {
	userID, err := h.ownerID(r)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}
	goalID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "goalID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid goal id")
		return
	}

	filter := bson.M{"userId": userID}
	if goalID != primitive.NilObjectID {
		filter["goalId"] = goalID
	}

	cursor, err := h.DB.Collection("daily_logs").Find(r.Context(), filter,
		options.Find().SetSort(bson.D{{Key: "date", Value: -1}}).SetLimit(200))
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not fetch gallery")
		return
	}
	defer cursor.Close(r.Context())

	type GalleryItem struct {
		LogID  string             `json:"logId"`
		Date   time.Time          `json:"date"`
		GoalID string             `json:"goalId"`
		Images []models.EvidenceFile `json:"images"`
		Videos []models.EvidenceFile `json:"videos"`
	}
	var items []GalleryItem
	for cursor.Next(r.Context()) {
		var log models.DailyLog
		cursor.Decode(&log)
		if len(log.EvidenceImages) == 0 && len(log.EvidenceVideos) == 0 {
			continue
		}
		items = append(items, GalleryItem{
			LogID:  log.ID.Hex(),
			Date:   log.Date,
			GoalID: log.GoalID.Hex(),
			Images: log.EvidenceImages,
			Videos: log.EvidenceVideos,
		})
	}
	if items == nil {
		items = []GalleryItem{}
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *GoalHandler) ensureGoalOwnership(ctx context.Context, userID, goalID primitive.ObjectID) error {
	count, err := h.DB.Collection("goals").CountDocuments(ctx, bson.M{"_id": goalID, "userId": userID})
	if err != nil || count == 0 {
		return mongo.ErrNoDocuments
	}
	return nil
}
