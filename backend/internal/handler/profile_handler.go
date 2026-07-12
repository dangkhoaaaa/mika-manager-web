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
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ProfileHandler struct {
	DB *database.DB
}

func (h *ProfileHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	ctx := r.Context()
	var user models.User
	h.DB.Collection("users").FindOne(ctx, bson.M{"_id": userID}).Decode(&user)

	var profile models.UserProfile
	err = h.DB.Collection("user_profiles").FindOne(ctx, bson.M{"userId": userID}).Decode(&profile)
	if err == mongo.ErrNoDocuments {
		profile = models.UserProfile{
			UserID:    userID,
			CreatedAt: time.Now(),
		}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"user":    sanitizeUser(user),
		"profile": profile,
	})
}

func (h *ProfileHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	var req struct {
		Name     string `json:"name"`
		Username string `json:"username"`
		Bio      string `json:"bio"`
		Avatar   string `json:"avatar"`
		Banner   string `json:"banner"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	ctx := r.Context()
	if req.Name != "" {
		h.DB.Collection("users").UpdateOne(ctx, bson.M{"_id": userID},
			bson.M{"$set": bson.M{"name": strings.TrimSpace(req.Name)}})
	}

	update := bson.M{"updatedAt": time.Now()}
	if req.Username != "" {
		update["username"] = strings.ToLower(strings.TrimSpace(req.Username))
	}
	if req.Bio != "" {
		update["bio"] = req.Bio
	}
	if req.Avatar != "" {
		update["avatar"] = req.Avatar
	}
	if req.Banner != "" {
		update["banner"] = req.Banner
	}

	_, err = h.DB.Collection("user_profiles").UpdateOne(ctx,
		bson.M{"userId": userID},
		bson.M{"$set": update},
		options.Update().SetUpsert(true),
	)
	if err != nil && mongo.IsDuplicateKeyError(err) {
		httputil.Error(w, http.StatusConflict, "username already taken")
		return
	}

	h.GetMe(w, r)
}

func (h *ProfileHandler) GetPublic(w http.ResponseWriter, r *http.Request) {
	username := strings.ToLower(chi.URLParam(r, "username"))
	ctx := r.Context()

	var profile models.UserProfile
	err := h.DB.Collection("user_profiles").FindOne(ctx, bson.M{"username": username}).Decode(&profile)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "user not found")
		return
	}

	var user models.User
	h.DB.Collection("users").FindOne(ctx, bson.M{"_id": profile.UserID}).Decode(&user)

	// Public goals
	cursor, _ := h.DB.Collection("goals").Find(ctx, bson.M{
		"userId": profile.UserID, "visibility": models.VisibilityPublic,
	}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
	var goals []models.Goal
	if cursor != nil {
		cursor.All(ctx, &goals)
		cursor.Close(ctx)
	}
	if goals == nil {
		goals = []models.Goal{}
	}

	// Achievements
	achCursor, _ := h.DB.Collection("achievements").Find(ctx, bson.M{"userId": profile.UserID},
		options.Find().SetSort(bson.D{{Key: "unlockedAt", Value: -1}}))
	var achievements []models.Achievement
	if achCursor != nil {
		achCursor.All(ctx, &achievements)
		achCursor.Close(ctx)
	}
	if achievements == nil {
		achievements = []models.Achievement{}
	}

	// Heatmap
	yearAgo := time.Now().AddDate(-1, 0, 0)
	dash := &DashboardHandler{DB: h.DB}
	heatmap := dash.getHeatmap(ctx, profile.UserID, yearAgo, time.Now().Add(24*time.Hour))

	// Is following (if authenticated)
	isFollowing := false
	if viewerID := middleware.GetUserID(r.Context()); viewerID != "" {
		vid, _ := primitive.ObjectIDFromHex(viewerID)
		count, _ := h.DB.Collection("follows").CountDocuments(ctx, bson.M{
			"followerId": vid, "followingId": profile.UserID,
		})
		isFollowing = count > 0
	}

	// Recent cheers
	cheerCursor, _ := h.DB.Collection("cheers").Find(ctx, bson.M{"targetId": profile.UserID},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(5))
	type CheerBrief struct {
		Message    string    `json:"message"`
		AuthorName string    `json:"authorName"`
		CreatedAt  time.Time `json:"createdAt"`
	}
	var recentCheers []CheerBrief
	if cheerCursor != nil {
		for cheerCursor.Next(ctx) {
			var cheer models.Cheer
			cheerCursor.Decode(&cheer)
			brief := CheerBrief{Message: cheer.Message, CreatedAt: cheer.CreatedAt, AuthorName: "User"}
			var u models.User
			if h.DB.Collection("users").FindOne(ctx, bson.M{"_id": cheer.UserID}).Decode(&u) == nil {
				brief.AuthorName = u.Name
			}
			recentCheers = append(recentCheers, brief)
		}
		cheerCursor.Close(ctx)
	}
	if recentCheers == nil {
		recentCheers = []CheerBrief{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"user": map[string]interface{}{
			"id":   user.ID.Hex(),
			"name": user.Name,
		},
		"profile":      profile,
		"publicGoals":  goals,
		"achievements": achievements,
		"heatmap":      heatmap,
		"isFollowing":  isFollowing,
		"recentCheers": recentCheers,
	})
}

type SocialHandler struct {
	DB *database.DB
}

func (h *SocialHandler) Follow(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}
	targetID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "userID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	if userID == targetID {
		httputil.Error(w, http.StatusBadRequest, "cannot follow yourself")
		return
	}

	ctx := r.Context()
	follow := models.Follow{
		ID:          primitive.NewObjectID(),
		FollowerID:  userID,
		FollowingID: targetID,
		CreatedAt:   time.Now(),
	}
	_, err = h.DB.Collection("follows").InsertOne(ctx, follow)
	if err != nil && mongo.IsDuplicateKeyError(err) {
		httputil.JSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}

	h.DB.Collection("user_profiles").UpdateOne(ctx, bson.M{"userId": targetID},
		bson.M{"$inc": bson.M{"followersCount": 1}}, options.Update().SetUpsert(true))
	h.DB.Collection("user_profiles").UpdateOne(ctx, bson.M{"userId": userID},
		bson.M{"$inc": bson.M{"followingCount": 1}}, options.Update().SetUpsert(true))

	// Notification
	h.createNotification(ctx, targetID, userID, "follow", "New Follower", "Someone started following you", "")

	httputil.JSON(w, http.StatusCreated, map[string]bool{"ok": true})
}

func (h *SocialHandler) Unfollow(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}
	targetID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "userID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}

	ctx := r.Context()
	res, _ := h.DB.Collection("follows").DeleteOne(ctx, bson.M{
		"followerId": userID, "followingId": targetID,
	})
	if res.DeletedCount > 0 {
		h.DB.Collection("user_profiles").UpdateOne(ctx, bson.M{"userId": targetID},
			bson.M{"$inc": bson.M{"followersCount": -1}})
		h.DB.Collection("user_profiles").UpdateOne(ctx, bson.M{"userId": userID},
			bson.M{"$inc": bson.M{"followingCount": -1}})
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *SocialHandler) Like(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	var req struct {
		TargetID   string `json:"targetId"`
		TargetType string `json:"targetType"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	targetID, err := primitive.ObjectIDFromHex(req.TargetID)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid target id")
		return
	}

	like := models.Like{
		ID:         primitive.NewObjectID(),
		UserID:     userID,
		TargetID:   targetID,
		TargetType: req.TargetType,
		CreatedAt:  time.Now(),
	}
	_, err = h.DB.Collection("likes").InsertOne(r.Context(), like)
	if err != nil && mongo.IsDuplicateKeyError(err) {
		httputil.JSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	httputil.JSON(w, http.StatusCreated, map[string]bool{"ok": true})
}

func (h *SocialHandler) Unlike(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	var req struct {
		TargetID   string `json:"targetId"`
		TargetType string `json:"targetType"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	targetID, _ := primitive.ObjectIDFromHex(req.TargetID)

	h.DB.Collection("likes").DeleteOne(r.Context(), bson.M{
		"userId": userID, "targetId": targetID, "targetType": req.TargetType,
	})
	w.WriteHeader(http.StatusNoContent)
}

func (h *SocialHandler) Comment(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	var req struct {
		TargetID   string `json:"targetId"`
		TargetType string `json:"targetType"`
		Content    string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Content) == "" {
		httputil.Error(w, http.StatusBadRequest, "content required")
		return
	}
	targetID, _ := primitive.ObjectIDFromHex(req.TargetID)

	comment := models.Comment{
		ID:         primitive.NewObjectID(),
		UserID:     userID,
		TargetID:   targetID,
		TargetType: req.TargetType,
		Content:    strings.TrimSpace(req.Content),
		CreatedAt:  time.Now(),
	}
	h.DB.Collection("comments").InsertOne(r.Context(), comment)
	httputil.JSON(w, http.StatusCreated, comment)
}

func (h *SocialHandler) ListComments(w http.ResponseWriter, r *http.Request) {
	targetID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "targetID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid target id")
		return
	}
	targetType := r.URL.Query().Get("type")

	cursor, err := h.DB.Collection("comments").Find(r.Context(), bson.M{
		"targetId": targetID, "targetType": targetType,
	}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(50))
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not list comments")
		return
	}
	defer cursor.Close(r.Context())

	var comments []models.Comment
	cursor.All(r.Context(), &comments)
	if comments == nil {
		comments = []models.Comment{}
	}
	httputil.JSON(w, http.StatusOK, h.enrichComments(r.Context(), comments))
}

func (h *SocialHandler) Cheer(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	var req struct {
		TargetID string `json:"targetId"`
		Message  string `json:"message"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	targetID, _ := primitive.ObjectIDFromHex(req.TargetID)

	cheer := models.Cheer{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		TargetID:  targetID,
		Message:   req.Message,
		CreatedAt: time.Now(),
	}
	h.DB.Collection("cheers").InsertOne(r.Context(), cheer)
	h.createNotification(r.Context(), targetID, userID, "cheer", "You got cheered!", req.Message, "")
	httputil.JSON(w, http.StatusCreated, cheer)
}

func (h *SocialHandler) createNotification(ctx context.Context, userID, fromUserID primitive.ObjectID, nType, title, message, link string) {
	n := models.PCNotification{
		ID:         primitive.NewObjectID(),
		UserID:     userID,
		Type:       nType,
		Title:      title,
		Message:    message,
		Link:       link,
		IsRead:     false,
		FromUserID: &fromUserID,
		CreatedAt:  time.Now(),
	}
	h.DB.Collection("pc_notifications").InsertOne(ctx, n)
}

type PCNotificationHandler struct {
	DB *database.DB
}

func (h *PCNotificationHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	cursor, err := h.DB.Collection("pc_notifications").Find(r.Context(), bson.M{"userId": userID},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(50))
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not list notifications")
		return
	}
	defer cursor.Close(r.Context())

	var notifications []models.PCNotification
	cursor.All(r.Context(), &notifications)
	if notifications == nil {
		notifications = []models.PCNotification{}
	}
	httputil.JSON(w, http.StatusOK, notifications)
}

func (h *PCNotificationHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}
	notifID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "notifID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid notification id")
		return
	}

	h.DB.Collection("pc_notifications").UpdateOne(r.Context(),
		bson.M{"_id": notifID, "userId": userID},
		bson.M{"$set": bson.M{"isRead": true}},
	)
	w.WriteHeader(http.StatusNoContent)
}

func (h *PCNotificationHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	h.DB.Collection("pc_notifications").UpdateMany(r.Context(),
		bson.M{"userId": userID, "isRead": false},
		bson.M{"$set": bson.M{"isRead": true}},
	)
	httputil.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

type AchievementHandler struct {
	DB *database.DB
}

func (h *AchievementHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	cursor, err := h.DB.Collection("achievements").Find(r.Context(), bson.M{"userId": userID},
		options.Find().SetSort(bson.D{{Key: "unlockedAt", Value: -1}}))
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not list achievements")
		return
	}
	defer cursor.Close(r.Context())

	var achievements []models.Achievement
	cursor.All(r.Context(), &achievements)
	if achievements == nil {
		achievements = []models.Achievement{}
	}

	// Include locked achievements
	unlockedKeys := map[string]bool{}
	for _, a := range achievements {
		unlockedKeys[a.Key] = true
	}
	var all []map[string]interface{}
	for key, def := range models.AchievementDefs {
		item := map[string]interface{}{
			"key": key, "title": def.Title, "description": def.Description,
			"icon": def.Icon, "unlocked": unlockedKeys[key],
		}
		all = append(all, item)
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"unlocked": achievements,
		"all":      all,
	})
}

type SearchHandler struct {
	DB *database.DB
}

func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	q = strings.TrimPrefix(q, "@")
	if q == "" {
		httputil.JSON(w, http.StatusOK, map[string]interface{}{
			"goals": []interface{}{}, "users": []interface{}{},
		})
		return
	}

	ctx := r.Context()
	userID, _ := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))

	// Search own goals
	goalFilter := bson.M{
		"userId": userID,
		"$or": []bson.M{
			{"title": bson.M{"$regex": q, "$options": "i"}},
			{"tags": bson.M{"$regex": q, "$options": "i"}},
		},
	}
	goalCursor, _ := h.DB.Collection("goals").Find(ctx, goalFilter,
		options.Find().SetLimit(10))
	var goals []models.Goal
	if goalCursor != nil {
		goalCursor.All(ctx, &goals)
		goalCursor.Close(ctx)
	}

	// Search users by username
	userCursor, _ := h.DB.Collection("user_profiles").Find(ctx, bson.M{
		"username": bson.M{"$regex": q, "$options": "i", "$ne": ""},
	}, options.Find().SetLimit(10))
	var profiles []models.UserProfile
	if userCursor != nil {
		userCursor.All(ctx, &profiles)
		userCursor.Close(ctx)
	}

	// Also search by name in users collection
	if len(profiles) < 10 {
		existing := map[string]bool{}
		for _, p := range profiles {
			existing[p.UserID.Hex()] = true
		}
		nameCursor, _ := h.DB.Collection("users").Find(ctx, bson.M{
			"name": bson.M{"$regex": q, "$options": "i"},
		}, options.Find().SetLimit(10))
		if nameCursor != nil {
			for nameCursor.Next(ctx) {
				var u models.User
				nameCursor.Decode(&u)
				if existing[u.ID.Hex()] {
					continue
				}
				p := ensureUserProfile(ctx, h.DB, u)
				if p.Username != "" {
					profiles = append(profiles, p)
					existing[u.ID.Hex()] = true
				}
				if len(profiles) >= 10 {
					break
				}
			}
			nameCursor.Close(ctx)
		}
	}

	if goals == nil {
		goals = []models.Goal{}
	}
	if profiles == nil {
		profiles = []models.UserProfile{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"goals": goals,
		"users": profiles,
	})
}
