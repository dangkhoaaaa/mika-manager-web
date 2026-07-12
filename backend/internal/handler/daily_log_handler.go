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
	"github.com/mika/mika-manager-api/internal/service"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type DailyLogHandler struct {
	DB      *database.DB
	Stats   *service.StatsService
	Achieve *service.AchievementService
	Goal    *GoalHandler
}

func truncateDate(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func (h *DailyLogHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	filter := bson.M{"userId": userID}
	if goalID := chi.URLParam(r, "goalID"); goalID != "" {
		gid, err := primitive.ObjectIDFromHex(goalID)
		if err != nil {
			httputil.Error(w, http.StatusBadRequest, "invalid goal id")
			return
		}
		filter["goalId"] = gid
	}

	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}}).SetLimit(100)
	cursor, err := h.DB.Collection("daily_logs").Find(r.Context(), filter, opts)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not list logs")
		return
	}
	defer cursor.Close(r.Context())

	var logs []models.DailyLog
	cursor.All(r.Context(), &logs)
	if logs == nil {
		logs = []models.DailyLog{}
	}
	httputil.JSON(w, http.StatusOK, logs)
}

func (h *DailyLogHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}
	goalID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "goalID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid goal id")
		return
	}

	if err := h.Goal.ensureGoalOwnership(r.Context(), userID, goalID); err != nil {
		httputil.Error(w, http.StatusNotFound, "goal not found")
		return
	}

	var req struct {
		Date           string               `json:"date"`
		HoursStudied   float64              `json:"hoursStudied"`
		TasksCompleted int                  `json:"tasksCompleted"`
		Notes          string               `json:"notes"`
		Mood           string               `json:"mood"`
		Difficulty     int                  `json:"difficulty"`
		EvidenceImages []models.EvidenceFile `json:"evidenceImages"`
		EvidenceFiles  []models.EvidenceFile `json:"evidenceFiles"`
		EvidenceVideos []models.EvidenceFile `json:"evidenceVideos"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	logDate := truncateDate(time.Now())
	if req.Date != "" {
		if t, err := time.Parse("2006-01-02", req.Date); err == nil {
			logDate = truncateDate(t)
		}
	}

	ctx := r.Context()
	existing := h.DB.Collection("daily_logs").FindOne(ctx, bson.M{
		"userId": userID, "goalId": goalID, "date": logDate,
	})

	var log models.DailyLog
	now := time.Now()

	if existing.Err() == nil {
		existing.Decode(&log)
		log.HoursStudied = req.HoursStudied
		log.TasksCompleted = req.TasksCompleted
		log.Notes = req.Notes
		log.Mood = req.Mood
		log.Difficulty = req.Difficulty
		if len(req.EvidenceImages) > 0 {
			log.EvidenceImages = append(log.EvidenceImages, req.EvidenceImages...)
		}
		if len(req.EvidenceFiles) > 0 {
			log.EvidenceFiles = append(log.EvidenceFiles, req.EvidenceFiles...)
		}
		if len(req.EvidenceVideos) > 0 {
			log.EvidenceVideos = append(log.EvidenceVideos, req.EvidenceVideos...)
		}
		log.UpdatedAt = now
		h.DB.Collection("daily_logs").ReplaceOne(ctx, bson.M{"_id": log.ID}, log)
	} else {
		log = models.DailyLog{
			ID:             primitive.NewObjectID(),
			UserID:         userID,
			GoalID:         goalID,
			Date:           logDate,
			HoursStudied:   req.HoursStudied,
			TasksCompleted: req.TasksCompleted,
			Notes:          req.Notes,
			Mood:           req.Mood,
			Difficulty:     req.Difficulty,
			EvidenceImages: req.EvidenceImages,
			EvidenceFiles:  req.EvidenceFiles,
			EvidenceVideos: req.EvidenceVideos,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		if _, err := h.DB.Collection("daily_logs").InsertOne(ctx, log); err != nil {
			if mongo.IsDuplicateKeyError(err) {
				httputil.Error(w, http.StatusConflict, "log already exists for this date")
				return
			}
			httputil.Error(w, http.StatusInternalServerError, "could not create log")
			return
		}
	}

	// Update goal totals
	h.recalcGoalTotals(ctx, goalID)
	h.Stats.UpdateStreak(ctx, userID)
	h.Stats.RecalcTotalHours(ctx, userID)
	h.Achieve.CheckAndUnlock(ctx, userID)

	httputil.JSON(w, http.StatusCreated, log)
}

func (h *DailyLogHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}
	logID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "logID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid log id")
		return
	}

	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	allowed := map[string]bool{
		"hoursStudied": true, "tasksCompleted": true, "notes": true,
		"mood": true, "difficulty": true,
		"evidenceImages": true, "evidenceFiles": true, "evidenceVideos": true,
	}
	update := bson.M{}
	for k, v := range req {
		if allowed[k] {
			update[k] = v
		}
	}
	update["updatedAt"] = time.Now()

	ctx := r.Context()
	res, err := h.DB.Collection("daily_logs").UpdateOne(ctx,
		bson.M{"_id": logID, "userId": userID},
		bson.M{"$set": update},
	)
	if err != nil || res.MatchedCount == 0 {
		httputil.Error(w, http.StatusNotFound, "log not found")
		return
	}

	var log models.DailyLog
	h.DB.Collection("daily_logs").FindOne(ctx, bson.M{"_id": logID}).Decode(&log)
	h.recalcGoalTotals(ctx, log.GoalID)
	h.Stats.UpdateStreak(ctx, userID)
	h.Stats.RecalcTotalHours(ctx, userID)

	httputil.JSON(w, http.StatusOK, log)
}

func (h *DailyLogHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}
	logID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "logID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid log id")
		return
	}

	ctx := r.Context()
	var log models.DailyLog
	err = h.DB.Collection("daily_logs").FindOne(ctx, bson.M{"_id": logID, "userId": userID}).Decode(&log)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "log not found")
		return
	}

	h.DB.Collection("daily_logs").DeleteOne(ctx, bson.M{"_id": logID})
	h.recalcGoalTotals(ctx, log.GoalID)
	h.Stats.UpdateStreak(ctx, userID)
	h.Stats.RecalcTotalHours(ctx, userID)
	w.WriteHeader(http.StatusNoContent)
}

func (h *DailyLogHandler) recalcGoalTotals(ctx context.Context, goalID primitive.ObjectID) {
	pipeline := []bson.M{
		{"$match": bson.M{"goalId": goalID}},
		{"$group": bson.M{
			"_id":    nil,
			"hours":  bson.M{"$sum": "$hoursStudied"},
			"days":   bson.M{"$sum": 1},
		}},
	}
	cursor, _ := h.DB.Collection("daily_logs").Aggregate(ctx, pipeline)
	totalHours := 0.0
	completedDays := 0
	if cursor != nil && cursor.Next(ctx) {
		var result struct {
			Hours float64 `bson:"hours"`
			Days  int     `bson:"days"`
		}
		cursor.Decode(&result)
		totalHours = result.Hours
		completedDays = result.Days
		cursor.Close(ctx)
	}

	h.DB.Collection("goals").UpdateOne(ctx,
		bson.M{"_id": goalID},
		bson.M{"$set": bson.M{
			"totalHours":    totalHours,
			"completedDays": completedDays,
			"updatedAt":     time.Now(),
		}},
	)
}

func (h *DailyLogHandler) Today(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	today := truncateDate(time.Now())
	tomorrow := today.Add(24 * time.Hour)

	cursor, err := h.DB.Collection("daily_logs").Find(r.Context(), bson.M{
		"userId": userID,
		"date":   bson.M{"$gte": today, "$lt": tomorrow},
	})
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not fetch today logs")
		return
	}
	defer cursor.Close(r.Context())

	var logs []models.DailyLog
	cursor.All(r.Context(), &logs)
	if logs == nil {
		logs = []models.DailyLog{}
	}

	totalHours := 0.0
	totalTasks := 0
	for _, l := range logs {
		totalHours += l.HoursStudied
		totalTasks += l.TasksCompleted
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"logs":       logs,
		"totalHours": totalHours,
		"totalTasks": totalTasks,
	})
}
