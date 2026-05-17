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
)

type ProjectHandler struct {
	DB *database.DB
}

func (h *ProjectHandler) ownerID(r *http.Request) (primitive.ObjectID, bool) {
	uid, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	return uid, err == nil
}

func (h *ProjectHandler) List(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.ownerID(r)
	if !ok {
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
	if err := cur.All(r.Context(), &projects); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "decode failed")
		return
	}
	if projects == nil {
		projects = []models.Project{}
	}
	httputil.JSON(w, http.StatusOK, projects)
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.ownerID(r)
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		DeployURL   string `json:"deployUrl"`
		Color       string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		httputil.Error(w, http.StatusBadRequest, "name required")
		return
	}

	slug := httputil.Slugify(body.Name)
	// ensure unique slug per user attempt
	for i := 0; i < 5; i++ {
		trySlug := slug
		if i > 0 {
			trySlug = slug + "-" + primitive.NewObjectID().Hex()[:6]
		}
		var existing models.Project
		err := h.DB.Collection("projects").FindOne(r.Context(), bson.M{"slug": trySlug}).Decode(&existing)
		if err == mongo.ErrNoDocuments {
			slug = trySlug
			break
		}
	}

	now := time.Now()
	color := body.Color
	if color == "" {
		color = "#6366f1"
	}
	project := models.Project{
		ID:          primitive.NewObjectID(),
		UserID:      uid,
		Name:        body.Name,
		Slug:        slug,
		Description: body.Description,
		DeployURL:   body.DeployURL,
		APIKey:      httputil.NewAPIKey(),
		Color:       color,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if _, err := h.DB.Collection("projects").InsertOne(r.Context(), project); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not create project")
		return
	}

	nowCols := models.DefaultBoardColumns(project.ID, now)
	docs := make([]interface{}, len(nowCols))
	for i := range nowCols {
		docs[i] = nowCols[i]
	}
	_, _ = h.DB.Collection("board_columns").InsertMany(r.Context(), docs)

	httputil.JSON(w, http.StatusCreated, project)
}

func (h *ProjectHandler) getOwned(ctx context.Context, id, uid primitive.ObjectID) (*models.Project, error) {
	var p models.Project
	err := h.DB.Collection("projects").FindOne(ctx, bson.M{"_id": id, "userId": uid}).Decode(&p)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (h *ProjectHandler) Get(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.ownerID(r)
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	pid, err := primitive.ObjectIDFromHex(chi.URLParam(r, "projectID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid project id")
		return
	}
	p, err := h.getOwned(r.Context(), pid, uid)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "project not found")
		return
	}
	httputil.JSON(w, http.StatusOK, p)
}

func (h *ProjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.ownerID(r)
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	pid, err := primitive.ObjectIDFromHex(chi.URLParam(r, "projectID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid project id")
		return
	}

	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	allowed := bson.M{}
	for _, k := range []string{"name", "description", "deployUrl", "color"} {
		if v, ok := body[k]; ok {
			allowed[k] = v
		}
	}
	allowed["updatedAt"] = time.Now()

	res, err := h.DB.Collection("projects").UpdateOne(r.Context(), bson.M{"_id": pid, "userId": uid}, bson.M{"$set": allowed})
	if err != nil || res.MatchedCount == 0 {
		httputil.Error(w, http.StatusNotFound, "project not found")
		return
	}
	p, _ := h.getOwned(r.Context(), pid, uid)
	httputil.JSON(w, http.StatusOK, p)
}

func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.ownerID(r)
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	pid, err := primitive.ObjectIDFromHex(chi.URLParam(r, "projectID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid project id")
		return
	}
	res, err := h.DB.Collection("projects").DeleteOne(r.Context(), bson.M{"_id": pid, "userId": uid})
	if err != nil || res.DeletedCount == 0 {
		httputil.Error(w, http.StatusNotFound, "project not found")
		return
	}
	for _, coll := range []string{"tasks", "bug_reports", "feature_requests", "version_releases", "board_columns"} {
		_, _ = h.DB.Collection(coll).DeleteMany(r.Context(), bson.M{"projectId": pid})
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ProjectHandler) RegenerateAPIKey(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.ownerID(r)
	if !ok {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	pid, err := primitive.ObjectIDFromHex(chi.URLParam(r, "projectID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid project id")
		return
	}
	key := httputil.NewAPIKey()
	res, err := h.DB.Collection("projects").UpdateOne(r.Context(),
		bson.M{"_id": pid, "userId": uid},
		bson.M{"$set": bson.M{"apiKey": key, "updatedAt": time.Now()}},
	)
	if err != nil || res.MatchedCount == 0 {
		httputil.Error(w, http.StatusNotFound, "project not found")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]string{"apiKey": key})
}
