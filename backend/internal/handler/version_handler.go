package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/mika/mika-manager-api/internal/database"
	"github.com/mika/mika-manager-api/internal/httputil"
	"github.com/mika/mika-manager-api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type VersionHandler struct {
	DB      *database.DB
	Project *ProjectHandler
}

func (h *VersionHandler) List(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}
	cur, _ := h.DB.Collection("version_releases").Find(r.Context(), bson.M{"projectId": p.ID})
	defer cur.Close(r.Context())
	var items []models.VersionRelease
	_ = cur.All(r.Context(), &items)
	if items == nil {
		items = []models.VersionRelease{}
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *VersionHandler) Create(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}

	var body struct {
		Version     string   `json:"version"`
		Title       string   `json:"title"`
		Summary     string   `json:"summary"`
		Features    []string `json:"features"`
		Fixes       []string `json:"fixes"`
		Breaking    []string `json:"breaking"`
		IsPublished bool     `json:"isPublished"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Version == "" {
		httputil.Error(w, http.StatusBadRequest, "version required")
		return
	}

	now := time.Now()
	release := models.VersionRelease{
		ID:          primitive.NewObjectID(),
		ProjectID:   p.ID,
		Version:     body.Version,
		Title:       body.Title,
		Summary:     body.Summary,
		Features:    body.Features,
		Fixes:       body.Fixes,
		Breaking:    body.Breaking,
		IsPublished: body.IsPublished,
		CreatedAt:   now,
	}
	if body.IsPublished {
		release.PublishedAt = &now
	}
	if release.Features == nil {
		release.Features = []string{}
	}
	if release.Fixes == nil {
		release.Fixes = []string{}
	}
	if release.Breaking == nil {
		release.Breaking = []string{}
	}

	if _, err := h.DB.Collection("version_releases").InsertOne(r.Context(), release); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			httputil.Error(w, http.StatusConflict, "version already exists")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "could not create release")
		return
	}
	httputil.JSON(w, http.StatusCreated, release)
}

func (h *VersionHandler) Update(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}
	vid, err := primitive.ObjectIDFromHex(chi.URLParam(r, "versionID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	set := bson.M{}
	for _, k := range []string{"version", "title", "summary", "features", "fixes", "breaking", "isPublished"} {
		if v, ok := body[k]; ok {
			set[k] = v
		}
	}
	if pub, ok := body["isPublished"].(bool); ok && pub {
		now := time.Now()
		set["publishedAt"] = now
	}

	res, err := h.DB.Collection("version_releases").UpdateOne(r.Context(),
		bson.M{"_id": vid, "projectId": p.ID},
		bson.M{"$set": set},
	)
	if err != nil || res.MatchedCount == 0 {
		httputil.Error(w, http.StatusNotFound, "not found")
		return
	}
	var release models.VersionRelease
	_ = h.DB.Collection("version_releases").FindOne(r.Context(), bson.M{"_id": vid}).Decode(&release)
	httputil.JSON(w, http.StatusOK, release)
}

func (h *VersionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}
	vid, err := primitive.ObjectIDFromHex(chi.URLParam(r, "versionID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	res, _ := h.DB.Collection("version_releases").DeleteOne(r.Context(), bson.M{"_id": vid, "projectId": p.ID})
	if res.DeletedCount == 0 {
		httputil.Error(w, http.StatusNotFound, "not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
