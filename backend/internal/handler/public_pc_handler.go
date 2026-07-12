package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/mika/mika-manager-api/internal/httputil"
	"github.com/mika/mika-manager-api/internal/middleware"
	"github.com/mika/mika-manager-api/internal/models"
	"github.com/mika/mika-manager-api/internal/service"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (h *ProfileHandler) resolvePublicUser(ctx context.Context, username string) (*models.UserProfile, *models.User, error) {
	var profile models.UserProfile
	err := h.DB.Collection("user_profiles").FindOne(ctx, bson.M{"username": username}).Decode(&profile)
	if err != nil {
		return nil, nil, err
	}
	var user models.User
	err = h.DB.Collection("users").FindOne(ctx, bson.M{"_id": profile.UserID}).Decode(&user)
	if err != nil {
		return nil, nil, err
	}
	return &profile, &user, nil
}

func (h *ProfileHandler) GetPublicTimeline(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	ctx := r.Context()

	profile, user, err := h.resolvePublicUser(ctx, username)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "user not found")
		return
	}

	// Get public goal IDs
	goalCursor, _ := h.DB.Collection("goals").Find(ctx, bson.M{
		"userId": profile.UserID, "visibility": models.VisibilityPublic,
	})
	var publicGoals []models.Goal
	if goalCursor != nil {
		goalCursor.All(ctx, &publicGoals)
		goalCursor.Close(ctx)
	}
	if len(publicGoals) == 0 {
		httputil.JSON(w, http.StatusOK, []interface{}{})
		return
	}

	goalIDs := make([]primitive.ObjectID, len(publicGoals))
	goalMap := map[string]models.Goal{}
	for i, g := range publicGoals {
		goalIDs[i] = g.ID
		goalMap[g.ID.Hex()] = g
	}

	logCursor, err := h.DB.Collection("daily_logs").Find(ctx, bson.M{
		"userId": profile.UserID,
		"goalId": bson.M{"$in": goalIDs},
	}, options.Find().SetSort(bson.D{{Key: "date", Value: -1}}).SetLimit(30))
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not fetch timeline")
		return
	}
	defer logCursor.Close(ctx)

	var logs []models.DailyLog
	logCursor.All(ctx, &logs)

	viewerID := middleware.GetUserID(r.Context())
	social := &SocialHandler{DB: h.DB}

	var items []map[string]interface{}
	for _, log := range logs {
		goal := goalMap[log.GoalID.Hex()]
		stats := social.getTargetStats(ctx, log.ID, "log", viewerID)
		items = append(items, map[string]interface{}{
			"log":       log,
			"goal":      map[string]interface{}{"id": goal.ID.Hex(), "title": goal.Title, "icon": goal.Icon, "color": goal.Color},
			"user":      map[string]interface{}{"id": user.ID.Hex(), "name": user.Name, "username": profile.Username},
			"likeCount": stats["likeCount"],
			"commentCount": stats["commentCount"],
			"isLiked":   stats["isLiked"],
		})
	}
	if items == nil {
		items = []map[string]interface{}{}
	}

	httputil.JSON(w, http.StatusOK, items)
}

func (h *ProfileHandler) GetPublicGoal(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	goalID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "goalID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid goal id")
		return
	}

	ctx := r.Context()
	profile, user, err := h.resolvePublicUser(ctx, username)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "user not found")
		return
	}

	var goal models.Goal
	err = h.DB.Collection("goals").FindOne(ctx, bson.M{
		"_id": goalID, "userId": profile.UserID, "visibility": models.VisibilityPublic,
	}).Decode(&goal)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "goal not found or private")
		return
	}

	logCursor, _ := h.DB.Collection("daily_logs").Find(ctx, bson.M{"goalId": goalID},
		options.Find().SetSort(bson.D{{Key: "date", Value: -1}}).SetLimit(50))
	var logs []models.DailyLog
	if logCursor != nil {
		logCursor.All(ctx, &logs)
		logCursor.Close(ctx)
	}
	if logs == nil {
		logs = []models.DailyLog{}
	}

	now := time.Now()
	weekStart := service.StartOfWeek(now)
	pipeline := []bson.M{
		{"$match": bson.M{"goalId": goalID, "date": bson.M{"$gte": weekStart}}},
		{"$group": bson.M{
			"_id":   bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$date"}},
			"hours": bson.M{"$sum": "$hoursStudied"},
		}},
		{"$sort": bson.M{"_id": 1}},
	}
	chartCursor, _ := h.DB.Collection("daily_logs").Aggregate(ctx, pipeline)
	var chartData []map[string]interface{}
	if chartCursor != nil {
		defer chartCursor.Close(ctx)
		for chartCursor.Next(ctx) {
			var row struct {
				ID    string  `bson:"_id"`
				Hours float64 `bson:"hours"`
			}
			chartCursor.Decode(&row)
			chartData = append(chartData, map[string]interface{}{"date": row.ID, "hours": row.Hours})
		}
	}
	if chartData == nil {
		chartData = []map[string]interface{}{}
	}

	progress := 0.0
	if goal.TargetHours > 0 {
		progress = (goal.TotalHours / goal.TargetHours) * 100
		if progress > 100 {
			progress = 100
		}
	}

	remainingDays := 0
	if goal.Deadline != nil {
		diff := goal.Deadline.Sub(now)
		remainingDays = int(diff.Hours() / 24)
		if remainingDays < 0 {
			remainingDays = 0
		}
	}

	yearAgo := now.AddDate(-1, 0, 0)
	dash := &DashboardHandler{DB: h.DB}
	heatmap := dash.getHeatmap(ctx, profile.UserID, yearAgo, now.Add(24*time.Hour))

	isFollowing := false
	if viewerID := middleware.GetUserID(r.Context()); viewerID != "" {
		vid, _ := primitive.ObjectIDFromHex(viewerID)
		count, _ := h.DB.Collection("follows").CountDocuments(ctx, bson.M{
			"followerId": vid, "followingId": profile.UserID,
		})
		isFollowing = count > 0
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"goal":          goal,
		"user":          map[string]interface{}{"id": user.ID.Hex(), "name": user.Name, "username": profile.Username},
		"profile":       profile,
		"logs":          logs,
		"chartData":     chartData,
		"progress":      progress,
		"remainingDays": remainingDays,
		"heatmap":       heatmap,
		"isFollowing":   isFollowing,
	})
}

func (h *SocialHandler) getTargetStats(ctx context.Context, targetID primitive.ObjectID, targetType, viewerID string) map[string]interface{} {
	likeCount, _ := h.DB.Collection("likes").CountDocuments(ctx, bson.M{
		"targetId": targetID, "targetType": targetType,
	})
	commentCount, _ := h.DB.Collection("comments").CountDocuments(ctx, bson.M{
		"targetId": targetID, "targetType": targetType,
	})

	isLiked := false
	if viewerID != "" {
		vid, err := primitive.ObjectIDFromHex(viewerID)
		if err == nil {
			count, _ := h.DB.Collection("likes").CountDocuments(ctx, bson.M{
				"userId": vid, "targetId": targetID, "targetType": targetType,
			})
			isLiked = count > 0
		}
	}

	return map[string]interface{}{
		"likeCount":    likeCount,
		"commentCount": commentCount,
		"isLiked":      isLiked,
	}
}

func (h *SocialHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	targetID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "targetID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid target id")
		return
	}
	targetType := r.URL.Query().Get("type")
	if targetType == "" {
		targetType = "log"
	}

	stats := h.getTargetStats(r.Context(), targetID, targetType, middleware.GetUserID(r.Context()))
	httputil.JSON(w, http.StatusOK, stats)
}

func (h *SocialHandler) ListCheers(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "userID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}

	cursor, err := h.DB.Collection("cheers").Find(r.Context(), bson.M{"targetId": userID},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(20))
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not list cheers")
		return
	}
	defer cursor.Close(r.Context())

	type CheerWithAuthor struct {
		models.Cheer
		AuthorName string `json:"authorName"`
		AuthorUsername string `json:"authorUsername,omitempty"`
	}

	var result []CheerWithAuthor
	for cursor.Next(r.Context()) {
		var cheer models.Cheer
		cursor.Decode(&cheer)

		item := CheerWithAuthor{Cheer: cheer}
		var user models.User
		if h.DB.Collection("users").FindOne(r.Context(), bson.M{"_id": cheer.UserID}).Decode(&user) == nil {
			item.AuthorName = user.Name
		}
		var profile models.UserProfile
		if h.DB.Collection("user_profiles").FindOne(r.Context(), bson.M{"userId": cheer.UserID}).Decode(&profile) == nil {
			item.AuthorUsername = profile.Username
		}
		result = append(result, item)
	}
	if result == nil {
		result = []CheerWithAuthor{}
	}
	httputil.JSON(w, http.StatusOK, result)
}

func (h *SocialHandler) enrichComments(ctx context.Context, comments []models.Comment) []map[string]interface{} {
	var result []map[string]interface{}
	for _, c := range comments {
		item := map[string]interface{}{
			"id": c.ID.Hex(), "userId": c.UserID.Hex(), "targetId": c.TargetID.Hex(),
			"targetType": c.TargetType, "content": c.Content, "createdAt": c.CreatedAt,
			"authorName": "User",
		}
		var user models.User
		if h.DB.Collection("users").FindOne(ctx, bson.M{"_id": c.UserID}).Decode(&user) == nil {
			item["authorName"] = user.Name
		}
		var profile models.UserProfile
		if h.DB.Collection("user_profiles").FindOne(ctx, bson.M{"userId": c.UserID}).Decode(&profile) == nil {
			item["authorUsername"] = profile.Username
		}
		result = append(result, item)
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	return result
}
