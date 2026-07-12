package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/mika/mika-manager-api/internal/database"
	"github.com/mika/mika-manager-api/internal/httputil"
	"github.com/mika/mika-manager-api/internal/middleware"
	"github.com/mika/mika-manager-api/internal/models"
	"github.com/mika/mika-manager-api/internal/service"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type CompareHandler struct {
	DB         *database.DB
	CompareSvc *service.CompareService
	PredictSvc *service.PredictionService
}

func (h *CompareHandler) Compare(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserBID   string `json:"userBId"`
		GoalAID   string `json:"goalAId"`
		GoalBID   string `json:"goalBId"`
		Range     string `json:"range"`
		StartDate string `json:"startDate"`
		EndDate   string `json:"endDate"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	userAID, _ := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	userBID, err := primitive.ObjectIDFromHex(req.UserBID)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid userBId")
		return
	}

	var goalAID, goalBID *primitive.ObjectID
	if req.GoalAID != "" {
		id, _ := primitive.ObjectIDFromHex(req.GoalAID)
		goalAID = &id
	}
	if req.GoalBID != "" {
		id, _ := primitive.ObjectIDFromHex(req.GoalBID)
		goalBID = &id
	}

	rangeType := req.Range
	if rangeType == "" {
		rangeType = "week"
	}
	start, end := service.ResolveDateRange(rangeType, req.StartDate, req.EndDate)
	ctx := r.Context()

	statsA := h.CompareSvc.GetStats(ctx, userAID, goalAID, start, end)
	statsB := h.CompareSvc.GetStats(ctx, userBID, goalBID, start, end)

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"userA": statsA, "userB": statsB,
		"range": rangeType, "startDate": start, "endDate": end,
	})
}

func (h *CompareHandler) Share(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserBID   string `json:"userBId"`
		GoalAID   string `json:"goalAId"`
		GoalBID   string `json:"goalBId"`
		Range     string `json:"range"`
		StartDate string `json:"startDate"`
		EndDate   string `json:"endDate"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	userAID, _ := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	userBID, _ := primitive.ObjectIDFromHex(req.UserBID)

	share := models.CompareShare{
		ID:        primitive.NewObjectID(),
		ShareID:   uuid.New().String()[:8],
		UserAID:   userAID,
		UserBID:   userBID,
		Range:     req.Range,
		CreatedAt: time.Now(),
	}
	if req.GoalAID != "" {
		id, _ := primitive.ObjectIDFromHex(req.GoalAID)
		share.GoalAID = &id
	}
	if req.GoalBID != "" {
		id, _ := primitive.ObjectIDFromHex(req.GoalBID)
		share.GoalBID = &id
	}
	h.DB.Collection("compare_shares").InsertOne(r.Context(), share)
	httputil.JSON(w, http.StatusCreated, map[string]string{"shareId": share.ShareID})
}

func (h *CompareHandler) GetShare(w http.ResponseWriter, r *http.Request) {
	shareID := chi.URLParam(r, "shareID")
	var share models.CompareShare
	if h.DB.Collection("compare_shares").FindOne(r.Context(), bson.M{"shareId": shareID}).Decode(&share) != nil {
		httputil.Error(w, http.StatusNotFound, "share not found")
		return
	}
	start, end := service.ResolveDateRange(share.Range, "", "")
	if share.StartDate != nil {
		start = *share.StartDate
	}
	if share.EndDate != nil {
		end = *share.EndDate
	}
	ctx := r.Context()
	statsA := h.CompareSvc.GetStats(ctx, share.UserAID, share.GoalAID, start, end)
	statsB := h.CompareSvc.GetStats(ctx, share.UserBID, share.GoalBID, start, end)
	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"userA": statsA, "userB": statsB, "range": share.Range,
	})
}

func (h *CompareHandler) Predict(w http.ResponseWriter, r *http.Request) {
	userID, _ := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	goalID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "goalID"))
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid goal id")
		return
	}
	var goal models.Goal
	if h.DB.Collection("goals").FindOne(r.Context(), bson.M{"_id": goalID, "userId": userID}).Decode(&goal) != nil {
		httputil.Error(w, http.StatusNotFound, "goal not found")
		return
	}
	pred := h.PredictSvc.Predict(r.Context(), goal)
	httputil.JSON(w, http.StatusOK, pred)
}

func (h *CompareHandler) Replay(w http.ResponseWriter, r *http.Request) {
	userID, _ := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	goalIDStr := r.URL.Query().Get("goalId")

	filter := bson.M{"userId": userID}
	if goalIDStr != "" {
		gid, _ := primitive.ObjectIDFromHex(goalIDStr)
		filter["goalId"] = gid
	}

	cursor, _ := h.DB.Collection("daily_logs").Find(r.Context(), filter,
		options.Find().SetSort(bson.D{{Key: "date", Value: 1}}))
	var logs []models.DailyLog
	if cursor != nil {
		cursor.All(r.Context(), &logs)
		cursor.Close(r.Context())
	}

	type ReplayFrame struct {
		Date         time.Time `json:"date"`
		HoursStudied float64   `json:"hoursStudied"`
		TasksDone    int       `json:"tasksCompleted"`
		GoalID       string    `json:"goalId"`
		Notes        string    `json:"notes"`
		HasEvidence  bool      `json:"hasEvidence"`
		Streak       int       `json:"streak"`
		TotalHours   float64   `json:"totalHours"`
	}

	var frames []ReplayFrame
	totalHours := 0.0
	streak := 0
	lastDate := time.Time{}

	for _, log := range logs {
		totalHours += log.HoursStudied
		logDay := log.Date.Truncate(24 * time.Hour)
		if !lastDate.IsZero() {
			diff := logDay.Sub(lastDate).Hours() / 24
			if diff == 1 {
				streak++
			} else if diff > 1 {
				streak = 1
			}
		} else {
			streak = 1
		}
		lastDate = logDay

		frames = append(frames, ReplayFrame{
			Date: log.Date, HoursStudied: log.HoursStudied,
			TasksDone: log.TasksCompleted, GoalID: log.GoalID.Hex(),
			Notes: log.Notes, HasEvidence: len(log.EvidenceImages) > 0,
			Streak: streak, TotalHours: totalHours,
		})
	}
	if frames == nil {
		frames = []ReplayFrame{}
	}
	httputil.JSON(w, http.StatusOK, frames)
}

func (h *CompareHandler) PreferencesGet(w http.ResponseWriter, r *http.Request) {
	userID, _ := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	var prefs models.UserPreferences
	err := h.DB.Collection("user_preferences").FindOne(r.Context(), bson.M{"userId": userID}).Decode(&prefs)
	if err != nil {
		prefs = models.UserPreferences{UserID: userID, ThemePreset: "midnight", ColorMode: "dark"}
	}
	httputil.JSON(w, http.StatusOK, prefs)
}

func (h *CompareHandler) PreferencesUpdate(w http.ResponseWriter, r *http.Request) {
	userID, _ := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	var req models.UserPreferences
	json.NewDecoder(r.Body).Decode(&req)
	req.UserID = userID
	req.UpdatedAt = time.Now()

	h.DB.Collection("user_preferences").UpdateOne(r.Context(),
		bson.M{"userId": userID},
		bson.M{"$set": req},
		options.Update().SetUpsert(true),
	)
	httputil.JSON(w, http.StatusOK, req)
}

func (h *AnalyticsHandler) Calendar(w http.ResponseWriter, r *http.Request) {
	userID, _ := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	year := time.Now().Year()
	month := int(time.Now().Month())
	if y := r.URL.Query().Get("year"); y != "" {
		if parsed, e := time.Parse("2006", y); e == nil {
			year = parsed.Year()
		}
	}
	if m := r.URL.Query().Get("month"); m != "" {
		if parsed, e := time.Parse("2006-01", yearStr(year)+"-"+m); e == nil {
			month = int(parsed.Month())
		}
	}

	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)
	ctx := r.Context()

	cursor, _ := h.DB.Collection("daily_logs").Find(ctx, bson.M{
		"userId": userID,
		"date":   bson.M{"$gte": start, "$lt": end},
	})
	var logs []models.DailyLog
	if cursor != nil {
		cursor.All(ctx, &logs)
		cursor.Close(ctx)
	}

	type DayData struct {
		Date           string  `json:"date"`
		HoursStudied   float64 `json:"hoursStudied"`
		TasksCompleted int     `json:"tasksCompleted"`
		Mood           string  `json:"mood"`
		HasEvidence    bool    `json:"hasEvidence"`
		HasNotes       bool    `json:"hasNotes"`
		GoalIDs        []string `json:"goalIds"`
		LogIDs         []string `json:"logIds"`
	}

	dayMap := map[string]*DayData{}
	for _, log := range logs {
		key := log.Date.Format("2006-01-02")
		if dayMap[key] == nil {
			dayMap[key] = &DayData{Date: key, Mood: log.Mood}
		}
		d := dayMap[key]
		d.HoursStudied += log.HoursStudied
		d.TasksCompleted += log.TasksCompleted
		if len(log.EvidenceImages) > 0 {
			d.HasEvidence = true
		}
		if log.Notes != "" {
			d.HasNotes = true
		}
		d.GoalIDs = append(d.GoalIDs, log.GoalID.Hex())
		d.LogIDs = append(d.LogIDs, log.ID.Hex())
	}

	var days []DayData
	for d := start; d.Before(end); d = d.AddDate(0, 0, 1) {
		key := d.Format("2006-01-02")
		if dayMap[key] != nil {
			days = append(days, *dayMap[key])
		} else {
			days = append(days, DayData{Date: key})
		}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"year": year, "month": month, "days": days,
	})
}

func (h *AnalyticsHandler) Advanced(w http.ResponseWriter, r *http.Request) {
	userID, _ := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	period := r.URL.Query().Get("period")
	if period == "" {
		period = "monthly"
	}
	ctx := r.Context()
	now := time.Now()
	start := service.StartOfMonth(now)
	switch period {
	case "daily":
		start = truncateDay(now.AddDate(0, 0, -30))
	case "weekly":
		start = service.StartOfWeek(now.AddDate(0, 0, -84))
	case "yearly":
		start = service.StartOfYear(now)
	}

	// Time series
	pipeline := []bson.M{
		{"$match": bson.M{"userId": userID, "date": bson.M{"$gte": start}}},
		{"$group": bson.M{
			"_id":   bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$date"}},
			"hours": bson.M{"$sum": "$hoursStudied"},
			"tasks": bson.M{"$sum": "$tasksCompleted"},
		}},
		{"$sort": bson.M{"_id": 1}},
	}
	cursor, _ := h.DB.Collection("daily_logs").Aggregate(ctx, pipeline)
	var chartData []map[string]interface{}
	maxSession := 0.0
	totalHours := 0.0
	if cursor != nil {
		defer cursor.Close(ctx)
		for cursor.Next(ctx) {
			var row struct {
				ID    string  `bson:"_id"`
				Hours float64 `bson:"hours"`
				Tasks int     `bson:"tasks"`
			}
			cursor.Decode(&row)
			chartData = append(chartData, map[string]interface{}{"date": row.ID, "hours": row.Hours, "tasks": row.Tasks})
			totalHours += row.Hours
			if row.Hours > maxSession {
				maxSession = row.Hours
			}
		}
	}

	// Per goal
	goalPipeline := []bson.M{
		{"$match": bson.M{"userId": userID}},
		{"$lookup": bson.M{"from": "goals", "localField": "goalId", "foreignField": "_id", "as": "goal"}},
		{"$unwind": "$goal"},
		{"$group": bson.M{"_id": "$goal.title", "hours": bson.M{"$sum": "$hoursStudied"}, "color": bson.M{"$first": "$goal.color"}}},
		{"$sort": bson.M{"hours": -1}},
	}
	gCursor, _ := h.DB.Collection("daily_logs").Aggregate(ctx, goalPipeline)
	var perGoal []map[string]interface{}
	if gCursor != nil {
		defer gCursor.Close(ctx)
		for gCursor.Next(ctx) {
			var row struct {
				ID    string  `bson:"_id"`
				Hours float64 `bson:"hours"`
				Color string  `bson:"color"`
			}
			gCursor.Decode(&row)
			perGoal = append(perGoal, map[string]interface{}{"name": row.ID, "hours": row.Hours, "color": row.Color})
		}
	}

	activeDays, _ := h.DB.Collection("daily_logs").CountDocuments(ctx, bson.M{"userId": userID})
	avgSession := 0.0
	if activeDays > 0 {
		avgSession = totalHours / float64(activeDays)
	}

	var profile models.UserProfile
	h.DB.Collection("user_profiles").FindOne(ctx, bson.M{"userId": userID}).Decode(&profile)

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"period": period, "chartData": chartData, "perGoal": perGoal,
		"totalHours": totalHours, "avgSession": avgSession,
		"longestSession": maxSession, "activeDays": activeDays,
		"currentStreak": profile.CurrentStreak, "consistency": calcConsistency(ctx, h.DB, userID),
	})
}

func (h *AnalyticsHandler) GitTimeline(w http.ResponseWriter, r *http.Request) {
	userID, _ := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	ctx := r.Context()

	cursor, _ := h.DB.Collection("daily_logs").Find(ctx, bson.M{"userId": userID},
		options.Find().SetSort(bson.D{{Key: "date", Value: -1}}).SetLimit(100))
	var logs []models.DailyLog
	if cursor != nil {
		cursor.All(ctx, &logs)
		cursor.Close(ctx)
	}

	goalCache := map[string]models.Goal{}
	type TimelineNode struct {
		ID          string    `json:"id"`
		Date        time.Time `json:"date"`
		Hours       float64   `json:"hours"`
		Tasks       int       `json:"tasks"`
		GoalID      string    `json:"goalId"`
		GoalTitle   string    `json:"goalTitle"`
		GoalIcon    string    `json:"goalIcon"`
		GoalColor   string    `json:"goalColor"`
		Notes       string    `json:"notes"`
		Mood        string    `json:"mood"`
		HasEvidence bool      `json:"hasEvidence"`
		Branch      string    `json:"branch"`
	}

	var nodes []TimelineNode
	for _, log := range logs {
		gid := log.GoalID.Hex()
		goal, ok := goalCache[gid]
		if !ok {
			h.DB.Collection("goals").FindOne(ctx, bson.M{"_id": log.GoalID}).Decode(&goal)
			goalCache[gid] = goal
		}
		nodes = append(nodes, TimelineNode{
			ID: log.ID.Hex(), Date: log.Date, Hours: log.HoursStudied,
			Tasks: log.TasksCompleted, GoalID: gid,
			GoalTitle: goal.Title, GoalIcon: goal.Icon, GoalColor: goal.Color,
			Notes: log.Notes, Mood: log.Mood,
			HasEvidence: len(log.EvidenceImages) > 0,
			Branch:      goal.Title,
		})
	}
	if nodes == nil {
		nodes = []TimelineNode{}
	}
	httputil.JSON(w, http.StatusOK, nodes)
}

type AnalyticsHandler struct {
	DB *database.DB
}

func calcConsistency(ctx context.Context, db *database.DB, userID primitive.ObjectID) float64 {
	thirtyDaysAgo := truncateDay(time.Now().AddDate(0, 0, -30))
	count, _ := db.Collection("daily_logs").CountDocuments(ctx, bson.M{
		"userId": userID, "date": bson.M{"$gte": thirtyDaysAgo},
	})
	return float64(count) / 30.0 * 100
}

func yearStr(y int) string {
	return time.Date(y, 1, 1, 0, 0, 0, 0, time.UTC).Format("2006")
}

func truncateDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}
