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

type ColumnHandler struct {
	DB      *database.DB
	Project *ProjectHandler
}

func (h *ColumnHandler) List(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}
	cols, err := h.ensureColumns(r, p.ID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.JSON(w, http.StatusOK, cols)
}

func (h *ColumnHandler) ensureColumns(r *http.Request, projectID primitive.ObjectID) ([]models.BoardColumn, error) {
	coll := h.DB.Collection("board_columns")
	opts := options.Find().SetSort(bson.D{{Key: "order", Value: 1}})
	cur, err := coll.Find(r.Context(), bson.M{"projectId": projectID}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(r.Context())

	var cols []models.BoardColumn
	if err := cur.All(r.Context(), &cols); err != nil {
		return nil, err
	}
	if len(cols) > 0 {
		return cols, nil
	}

	now := time.Now()
	cols = models.DefaultBoardColumns(projectID, now)
	docs := make([]interface{}, len(cols))
	for i := range cols {
		docs[i] = cols[i]
	}
	if _, err := coll.InsertMany(r.Context(), docs); err != nil {
		return nil, err
	}
	return cols, nil
}

func (h *ColumnHandler) Create(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}

	var body struct {
		Label string `json:"label"`
		Key   string `json:"key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Label) == "" {
		httputil.Error(w, http.StatusBadRequest, "label required")
		return
	}

	key := body.Key
	if key == "" {
		key = httputil.Slugify(body.Label)
	}

	cols, _ := h.ensureColumns(r, p.ID)
	maxOrder := -1
	for _, c := range cols {
		if c.Order > maxOrder {
			maxOrder = c.Order
		}
	}

	col := models.BoardColumn{
		ID:        primitive.NewObjectID(),
		ProjectID: p.ID,
		Key:       key,
		Label:     body.Label,
		Order:     maxOrder + 1,
		CreatedAt: time.Now(),
	}
	if _, err := h.DB.Collection("board_columns").InsertOne(r.Context(), col); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not create column")
		return
	}
	httputil.JSON(w, http.StatusCreated, col)
}

func (h *ColumnHandler) Update(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}
	cid, err := primitive.ObjectIDFromHex(chi.URLParam(r, "columnID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid column id")
		return
	}

	var body struct {
		Label string `json:"label"`
		Key   string `json:"key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	set := bson.M{}
	if body.Label != "" {
		set["label"] = body.Label
	}
	if body.Key != "" {
		set["key"] = body.Key
	}
	if len(set) == 0 {
		httputil.Error(w, http.StatusBadRequest, "nothing to update")
		return
	}

	var old models.BoardColumn
	_ = h.DB.Collection("board_columns").FindOne(r.Context(), bson.M{"_id": cid, "projectId": p.ID}).Decode(&old)

	res, err := h.DB.Collection("board_columns").UpdateOne(r.Context(),
		bson.M{"_id": cid, "projectId": p.ID},
		bson.M{"$set": set},
	)
	if err != nil || res.MatchedCount == 0 {
		httputil.Error(w, http.StatusNotFound, "column not found")
		return
	}

	if newKey, ok := set["key"].(string); ok && newKey != old.Key {
		_, _ = h.DB.Collection("tasks").UpdateMany(r.Context(),
			bson.M{"projectId": p.ID, "status": old.Key},
			bson.M{"$set": bson.M{"status": newKey}},
		)
	}

	var col models.BoardColumn
	_ = h.DB.Collection("board_columns").FindOne(r.Context(), bson.M{"_id": cid}).Decode(&col)
	httputil.JSON(w, http.StatusOK, col)
}

func (h *ColumnHandler) Delete(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}
	cid, err := primitive.ObjectIDFromHex(chi.URLParam(r, "columnID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid column id")
		return
	}

	var col models.BoardColumn
	if err := h.DB.Collection("board_columns").FindOne(r.Context(), bson.M{"_id": cid, "projectId": p.ID}).Decode(&col); err != nil {
		httputil.Error(w, http.StatusNotFound, "column not found")
		return
	}

	cols, _ := h.ensureColumns(r, p.ID)
	if len(cols) <= 1 {
		httputil.Error(w, http.StatusBadRequest, "cannot delete the last column")
		return
	}

	var fallbackKey string
	for _, c := range cols {
		if c.ID != col.ID {
			fallbackKey = c.Key
			break
		}
	}
	_, _ = h.DB.Collection("tasks").UpdateMany(r.Context(),
		bson.M{"projectId": p.ID, "status": col.Key},
		bson.M{"$set": bson.M{"status": fallbackKey}},
	)

	res, _ := h.DB.Collection("board_columns").DeleteOne(r.Context(), bson.M{"_id": cid, "projectId": p.ID})
	if res.DeletedCount == 0 {
		httputil.Error(w, http.StatusNotFound, "column not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type columnReorderItem struct {
	ID    string `json:"id"`
	Order int    `json:"order"`
}

func (h *ColumnHandler) Reorder(w http.ResponseWriter, r *http.Request) {
	p, ok := h.Project.loadProject(w, r)
	if !ok {
		return
	}

	var items []columnReorderItem
	if err := json.NewDecoder(r.Body).Decode(&items); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	for _, item := range items {
		cid, err := primitive.ObjectIDFromHex(item.ID)
		if err != nil {
			continue
		}
		_, _ = h.DB.Collection("board_columns").UpdateOne(r.Context(),
			bson.M{"_id": cid, "projectId": p.ID},
			bson.M{"$set": bson.M{"order": item.Order}},
		)
	}

	cols, _ := h.ensureColumns(r, p.ID)
	httputil.JSON(w, http.StatusOK, cols)
}
