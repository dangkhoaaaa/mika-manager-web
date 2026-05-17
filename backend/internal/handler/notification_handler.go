package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/mika/mika-manager-api/internal/database"
	"github.com/mika/mika-manager-api/internal/httputil"
	"github.com/mika/mika-manager-api/internal/middleware"
	"github.com/mika/mika-manager-api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type NotificationHandler struct {
	DB *database.DB
}

type notificationItem struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"`
	ProjectID   string    `json:"projectId"`
	ProjectName string    `json:"projectName"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"createdAt"`
}

func (h *NotificationHandler) List(w http.ResponseWriter, r *http.Request) {
	uid, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	cur, err := h.DB.Collection("projects").Find(r.Context(), bson.M{"userId": uid})
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer cur.Close(r.Context())

	var projects []models.Project
	if err := cur.All(r.Context(), &projects); err != nil || len(projects) == 0 {
		httputil.JSON(w, http.StatusOK, []notificationItem{})
		return
	}

	projectNames := make(map[primitive.ObjectID]string)
	var ids []primitive.ObjectID
	for _, p := range projects {
		projectNames[p.ID] = p.Name
		ids = append(ids, p.ID)
	}

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(50)
	filter := bson.M{
		"projectId": bson.M{"$in": ids},
		"$or": []bson.M{
			{"isRead": false},
			{"isRead": bson.M{"$exists": false}},
		},
	}

	var items []notificationItem

	bugCur, _ := h.DB.Collection("bug_reports").Find(r.Context(), filter, opts)
	defer bugCur.Close(r.Context())
	var bugs []models.BugReport
	_ = bugCur.All(r.Context(), &bugs)
	for _, b := range bugs {
		items = append(items, notificationItem{
			ID:          b.ID.Hex(),
			Type:        "bug",
			ProjectID:   b.ProjectID.Hex(),
			ProjectName: projectNames[b.ProjectID],
			Title:       b.Title,
			Description: b.Description,
			CreatedAt:   b.CreatedAt,
		})
	}

	featCur, _ := h.DB.Collection("feature_requests").Find(r.Context(), filter, opts)
	defer featCur.Close(r.Context())
	var feats []models.FeatureRequest
	_ = featCur.All(r.Context(), &feats)
	for _, f := range feats {
		items = append(items, notificationItem{
			ID:          f.ID.Hex(),
			Type:        "feature",
			ProjectID:   f.ProjectID.Hex(),
			ProjectName: projectNames[f.ProjectID],
			Title:       f.Title,
			Description: f.Description,
			CreatedAt:   f.CreatedAt,
		})
	}

	if items == nil {
		items = []notificationItem{}
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *NotificationHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	uid, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	typ := chi.URLParam(r, "type")
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	coll := "bug_reports"
	if typ == "feature" {
		coll = "feature_requests"
	} else if typ != "bug" {
		httputil.Error(w, http.StatusBadRequest, "invalid type")
		return
	}

	// verify ownership via project
	var doc struct {
		ProjectID primitive.ObjectID `bson:"projectId"`
	}
	if err := h.DB.Collection(coll).FindOne(r.Context(), bson.M{"_id": id}).Decode(&doc); err != nil {
		httputil.Error(w, http.StatusNotFound, "not found")
		return
	}
	var p models.Project
	if err := h.DB.Collection("projects").FindOne(r.Context(), bson.M{"_id": doc.ProjectID, "userId": uid}).Decode(&p); err != nil {
		httputil.Error(w, http.StatusNotFound, "not found")
		return
	}

	_, _ = h.DB.Collection(coll).UpdateOne(r.Context(), bson.M{"_id": id}, bson.M{"$set": bson.M{"isRead": true}})
	w.WriteHeader(http.StatusNoContent)
}

func (h *NotificationHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	uid, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	cur, _ := h.DB.Collection("projects").Find(r.Context(), bson.M{"userId": uid})
	var projects []models.Project
	_ = cur.All(r.Context(), &projects)
	cur.Close(r.Context())

	var ids []primitive.ObjectID
	for _, p := range projects {
		ids = append(ids, p.ID)
	}
	if len(ids) == 0 {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	filter := bson.M{
		"projectId": bson.M{"$in": ids},
		"$or": []bson.M{
			{"isRead": false},
			{"isRead": bson.M{"$exists": false}},
		},
	}
	set := bson.M{"$set": bson.M{"isRead": true}}
	_, _ = h.DB.Collection("bug_reports").UpdateMany(r.Context(), filter, set)
	_, _ = h.DB.Collection("feature_requests").UpdateMany(r.Context(), filter, set)
	w.WriteHeader(http.StatusNoContent)
}
