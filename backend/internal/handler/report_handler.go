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
)

type ReportHandler struct {
	DB      *database.DB
	Project *ProjectHandler
}

func (h *ReportHandler) ListBugs(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}
	cur, _ := h.DB.Collection("bug_reports").Find(r.Context(),
		bson.M{"projectId": p.ID},
	)
	defer cur.Close(r.Context())
	var items []models.BugReport
	_ = cur.All(r.Context(), &items)
	if items == nil {
		items = []models.BugReport{}
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *ReportHandler) UpdateBug(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}
	bid, err := primitive.ObjectIDFromHex(chi.URLParam(r, "bugID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	res, _ := h.DB.Collection("bug_reports").UpdateOne(r.Context(),
		bson.M{"_id": bid, "projectId": p.ID},
		bson.M{"$set": bson.M{"status": body.Status, "updatedAt": time.Now()}},
	)
	if res.MatchedCount == 0 {
		httputil.Error(w, http.StatusNotFound, "not found")
		return
	}
	var bug models.BugReport
	_ = h.DB.Collection("bug_reports").FindOne(r.Context(), bson.M{"_id": bid}).Decode(&bug)
	httputil.JSON(w, http.StatusOK, bug)
}

func (h *ReportHandler) ListFeatures(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}
	cur, _ := h.DB.Collection("feature_requests").Find(r.Context(),
		bson.M{"projectId": p.ID},
	)
	defer cur.Close(r.Context())
	var items []models.FeatureRequest
	_ = cur.All(r.Context(), &items)
	if items == nil {
		items = []models.FeatureRequest{}
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *ReportHandler) UpdateFeature(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}
	fid, err := primitive.ObjectIDFromHex(chi.URLParam(r, "featureID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	res, _ := h.DB.Collection("feature_requests").UpdateOne(r.Context(),
		bson.M{"_id": fid, "projectId": p.ID},
		bson.M{"$set": bson.M{"status": body.Status, "updatedAt": time.Now()}},
	)
	if res.MatchedCount == 0 {
		httputil.Error(w, http.StatusNotFound, "not found")
		return
	}
	var feat models.FeatureRequest
	_ = h.DB.Collection("feature_requests").FindOne(r.Context(), bson.M{"_id": fid}).Decode(&feat)
	httputil.JSON(w, http.StatusOK, feat)
}
