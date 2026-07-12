package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/mika/mika-manager-api/internal/database"
	"github.com/mika/mika-manager-api/internal/httputil"
	"github.com/mika/mika-manager-api/internal/middleware"
	"github.com/mika/mika-manager-api/internal/models"
	"github.com/mika/mika-manager-api/internal/service"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type DashboardHandler struct {
	DB *database.DB
}

var motivationalQuotes = []string{
	"The secret of getting ahead is getting started.",
	"Small daily improvements are the key to staggering long-term results.",
	"Success is the sum of small efforts repeated day in and day out.",
	"Don't watch the clock; do what it does. Keep going.",
	"The expert in anything was once a beginner.",
	"Your only limit is you.",
	"Progress, not perfection.",
	"Every day is a new opportunity to grow.",
}

func (h *DashboardHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	ctx := r.Context()
	now := time.Now()
	today := truncateDate(now)
	weekStart := service.StartOfWeek(now)
	monthStart := service.StartOfMonth(now)

	// Profile stats
	var profile models.UserProfile
	h.DB.Collection("user_profiles").FindOne(ctx, bson.M{"userId": userID}).Decode(&profile)

	// Goal counts
	activeGoals, _ := h.DB.Collection("goals").CountDocuments(ctx, bson.M{"userId": userID, "status": models.GoalActive})
	completedGoals, _ := h.DB.Collection("goals").CountDocuments(ctx, bson.M{"userId": userID, "status": models.GoalCompleted})

	// Hours aggregation
	weeklyHours := h.sumHours(ctx, userID, weekStart)
	monthlyHours := h.sumHours(ctx, userID, monthStart)
	totalHours := profile.TotalHours

	// Today's progress
	todayHours := h.sumHours(ctx, userID, today)

	// Recent activities
	cursor, _ := h.DB.Collection("daily_logs").Find(ctx, bson.M{"userId": userID},
		options.Find().SetSort(bson.D{{Key: "date", Value: -1}}).SetLimit(10))
	var recentLogs []models.DailyLog
	if cursor != nil {
		cursor.All(ctx, &recentLogs)
		cursor.Close(ctx)
	}
	if recentLogs == nil {
		recentLogs = []models.DailyLog{}
	}

	// Heatmap data (last 365 days)
	yearAgo := today.AddDate(-1, 0, 0)
	heatmap := h.getHeatmap(ctx, userID, yearAgo, today.Add(24*time.Hour))

	// Achievements progress
	achCursor, _ := h.DB.Collection("achievements").Find(ctx, bson.M{"userId": userID},
		options.Find().SetSort(bson.D{{Key: "unlockedAt", Value: -1}}).SetLimit(5))
	var achievements []models.Achievement
	if achCursor != nil {
		achCursor.All(ctx, &achievements)
		achCursor.Close(ctx)
	}
	if achievements == nil {
		achievements = []models.Achievement{}
	}

	totalAchievements := len(models.AchievementDefs)
	unlockedCount, _ := h.DB.Collection("achievements").CountDocuments(ctx, bson.M{"userId": userID})

	quoteIdx := int(now.Unix()/86400) % len(motivationalQuotes)

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"todayHours":        todayHours,
		"currentStreak":     profile.CurrentStreak,
		"longestStreak":     profile.LongestStreak,
		"totalHours":        totalHours,
		"weeklyHours":       weeklyHours,
		"monthlyHours":      monthlyHours,
		"activeGoals":       activeGoals,
		"completedGoals":    completedGoals,
		"heatmap":           heatmap,
		"recentActivities":  recentLogs,
		"achievements":      achievements,
		"achievementProgress": map[string]interface{}{
			"unlocked": unlockedCount,
			"total":    totalAchievements,
		},
		"quote": motivationalQuotes[quoteIdx],
	})
}

func (h *DashboardHandler) sumHours(ctx context.Context, userID primitive.ObjectID, since time.Time) float64 {
	pipeline := []bson.M{
		{"$match": bson.M{
			"userId": userID,
			"date":   bson.M{"$gte": since},
		}},
		{"$group": bson.M{"_id": nil, "total": bson.M{"$sum": "$hoursStudied"}}},
	}
	cursor, err := h.DB.Collection("daily_logs").Aggregate(ctx, pipeline)
	if err != nil {
		return 0
	}
	defer cursor.Close(ctx)
	if cursor.Next(ctx) {
		var result struct {
			Total float64 `bson:"total"`
		}
		cursor.Decode(&result)
		return result.Total
	}
	return 0
}

func (h *DashboardHandler) getHeatmap(ctx context.Context, userID primitive.ObjectID, start, end time.Time) map[string]interface{} {
	pipeline := []bson.M{
		{"$match": bson.M{
			"userId": userID,
			"date":   bson.M{"$gte": start, "$lt": end},
		}},
		{"$group": bson.M{
			"_id":   bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$date"}},
			"hours": bson.M{"$sum": "$hoursStudied"},
			"count": bson.M{"$sum": 1},
		}},
	}
	cursor, _ := h.DB.Collection("daily_logs").Aggregate(ctx, pipeline)
	data := map[string]interface{}{}
	if cursor != nil {
		defer cursor.Close(ctx)
		for cursor.Next(ctx) {
			var row struct {
				ID    string  `bson:"_id"`
				Hours float64 `bson:"hours"`
				Count int     `bson:"count"`
			}
			cursor.Decode(&row)
			level := 0
			if row.Hours > 0 {
				level = 1
			}
			if row.Hours >= 1 {
				level = 2
			}
			if row.Hours >= 3 {
				level = 3
			}
			if row.Hours >= 5 {
				level = 4
			}
			data[row.ID] = map[string]interface{}{"hours": row.Hours, "count": row.Count, "level": level}
		}
	}
	return data
}

func (h *DashboardHandler) Statistics(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	period := r.URL.Query().Get("period")
	if period == "" {
		period = "weekly"
	}

	ctx := r.Context()
	now := time.Now()
	var start time.Time
	switch period {
	case "monthly":
		start = service.StartOfMonth(now)
	case "yearly":
		start = service.StartOfYear(now)
	default:
		start = service.StartOfWeek(now)
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
	if cursor != nil {
		defer cursor.Close(ctx)
		for cursor.Next(ctx) {
			var row struct {
				ID    string  `bson:"_id"`
				Hours float64 `bson:"hours"`
				Tasks int     `bson:"tasks"`
			}
			cursor.Decode(&row)
			chartData = append(chartData, map[string]interface{}{
				"date": row.ID, "hours": row.Hours, "tasks": row.Tasks,
			})
		}
	}
	if chartData == nil {
		chartData = []map[string]interface{}{}
	}

	// Category distribution by goal
	catPipeline := []bson.M{
		{"$match": bson.M{"userId": userID}},
		{"$lookup": bson.M{
			"from":         "goals",
			"localField":   "goalId",
			"foreignField": "_id",
			"as":           "goal",
		}},
		{"$unwind": "$goal"},
		{"$group": bson.M{
			"_id":   "$goal.title",
			"hours": bson.M{"$sum": "$hoursStudied"},
			"color": bson.M{"$first": "$goal.color"},
		}},
		{"$sort": bson.M{"hours": -1}},
	}
	catCursor, _ := h.DB.Collection("daily_logs").Aggregate(ctx, catPipeline)
	var categories []map[string]interface{}
	if catCursor != nil {
		defer catCursor.Close(ctx)
		for catCursor.Next(ctx) {
			var row struct {
				ID    string  `bson:"_id"`
				Hours float64 `bson:"hours"`
				Color string  `bson:"color"`
			}
			catCursor.Decode(&row)
			categories = append(categories, map[string]interface{}{
				"name": row.ID, "hours": row.Hours, "color": row.Color,
			})
		}
	}
	if categories == nil {
		categories = []map[string]interface{}{}
	}

	// Average session
	totalLogs, _ := h.DB.Collection("daily_logs").CountDocuments(ctx, bson.M{"userId": userID})
	var profile models.UserProfile
	h.DB.Collection("user_profiles").FindOne(ctx, bson.M{"userId": userID}).Decode(&profile)
	avgSession := 0.0
	if totalLogs > 0 {
		avgSession = profile.TotalHours / float64(totalLogs)
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"period":       period,
		"chartData":    chartData,
		"categories":   categories,
		"avgSession":   avgSession,
		"totalHours":   profile.TotalHours,
		"currentStreak": profile.CurrentStreak,
	})
}
