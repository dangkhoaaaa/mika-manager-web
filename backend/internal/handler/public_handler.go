package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/mika/mika-manager-api/internal/database"
	"github.com/mika/mika-manager-api/internal/httputil"
	"github.com/mika/mika-manager-api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type PublicHandler struct {
	DB *database.DB
}

func (h *PublicHandler) projectBySlugAndKey(w http.ResponseWriter, r *http.Request) (*models.Project, bool) {
	slug := chi.URLParam(r, "slug")
	apiKey := r.Header.Get("X-API-Key")
	if apiKey == "" {
		apiKey = r.URL.Query().Get("api_key")
	}
	if slug == "" || apiKey == "" {
		httputil.Error(w, http.StatusUnauthorized, "slug and X-API-Key required")
		return nil, false
	}
	var p models.Project
	err := h.DB.Collection("projects").FindOne(r.Context(), bson.M{"slug": slug, "apiKey": apiKey}).Decode(&p)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid project or api key")
		return nil, false
	}
	return &p, true
}

func (h *PublicHandler) projectBySlug(w http.ResponseWriter, r *http.Request) (*models.Project, bool) {
	slug := chi.URLParam(r, "slug")
	var p models.Project
	err := h.DB.Collection("projects").FindOne(r.Context(), bson.M{"slug": slug}).Decode(&p)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "project not found")
		return nil, false
	}
	return &p, true
}

func (h *PublicHandler) ReportBug(w http.ResponseWriter, r *http.Request) {
	p, ok := h.projectBySlugAndKey(w, r)
	if !ok {
		return
	}

	var body struct {
		Title         string            `json:"title"`
		Description   string            `json:"description"`
		ReporterName  string            `json:"reporterName"`
		ReporterEmail string            `json:"reporterEmail"`
		PageURL       string            `json:"pageUrl"`
		Severity      string            `json:"severity"`
		Metadata      map[string]string `json:"metadata"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if strings.TrimSpace(body.Title) == "" {
		httputil.Error(w, http.StatusBadRequest, "title required")
		return
	}
	severity := body.Severity
	if severity == "" {
		severity = "medium"
	}

	now := time.Now()
	bug := models.BugReport{
		ID:            primitive.NewObjectID(),
		ProjectID:     p.ID,
		Title:         body.Title,
		Description:   body.Description,
		ReporterName:  body.ReporterName,
		ReporterEmail: body.ReporterEmail,
		PageURL:       body.PageURL,
		Severity:      severity,
		Status:        models.BugOpen,
		IsRead:        false,
		Metadata:      body.Metadata,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if _, err := h.DB.Collection("bug_reports").InsertOne(r.Context(), bug); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not save report")
		return
	}
	httputil.JSON(w, http.StatusCreated, map[string]interface{}{
		"id":      bug.ID.Hex(),
		"message": "Bug report submitted. Thank you!",
	})
}

func (h *PublicHandler) RequestFeature(w http.ResponseWriter, r *http.Request) {
	p, ok := h.projectBySlugAndKey(w, r)
	if !ok {
		return
	}

	var body struct {
		Title         string `json:"title"`
		Description   string `json:"description"`
		ReporterName  string `json:"reporterName"`
		ReporterEmail string `json:"reporterEmail"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if strings.TrimSpace(body.Title) == "" || strings.TrimSpace(body.Description) == "" {
		httputil.Error(w, http.StatusBadRequest, "title and description required")
		return
	}

	now := time.Now()
	feat := models.FeatureRequest{
		ID:            primitive.NewObjectID(),
		ProjectID:     p.ID,
		Title:         body.Title,
		Description:   body.Description,
		ReporterName:  body.ReporterName,
		ReporterEmail: body.ReporterEmail,
		Status:        models.FeatureSubmitted,
		IsRead:        false,
		Votes:         0,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if _, err := h.DB.Collection("feature_requests").InsertOne(r.Context(), feat); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not save request")
		return
	}
	httputil.JSON(w, http.StatusCreated, map[string]interface{}{
		"id":      feat.ID.Hex(),
		"message": "Feature request submitted. Thank you!",
	})
}

func (h *PublicHandler) Changelog(w http.ResponseWriter, r *http.Request) {
	p, ok := h.projectBySlug(w, r)
	if !ok {
		return
	}

	filter := bson.M{"projectId": p.ID, "isPublished": true}
	if v := chi.URLParam(r, "version"); v != "" {
		filter["version"] = v
	}

	opts := options.Find().SetSort(bson.D{{Key: "publishedAt", Value: -1}, {Key: "createdAt", Value: -1}})
	if r.URL.Query().Get("latest") == "true" && chi.URLParam(r, "version") == "" {
		opts.SetLimit(1)
	}

	cur, err := h.DB.Collection("version_releases").Find(r.Context(), filter, opts)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer cur.Close(r.Context())

	var releases []models.VersionRelease
	if err := cur.All(r.Context(), &releases); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "decode failed")
		return
	}
	if releases == nil {
		releases = []models.VersionRelease{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"project":  map[string]string{"name": p.Name, "slug": p.Slug},
		"releases": releases,
	})
}
