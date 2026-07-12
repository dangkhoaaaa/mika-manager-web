package service

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/mika/mika-manager-api/internal/database"
	"github.com/mika/mika-manager-api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PredictionService struct {
	DB *database.DB
}

type GoalPrediction struct {
	GoalID              string    `json:"goalId"`
	DaysRemaining       int       `json:"daysRemaining"`
	EstimatedCompletion time.Time `json:"estimatedCompletion"`
	HoursRemaining      float64   `json:"hoursRemaining"`
	AvgHoursPerDay      float64   `json:"avgHoursPerDay"`
	RequiredHoursPerDay float64   `json:"requiredHoursPerDay"`
	ProgressPercent     float64   `json:"progressPercent"`
	OnTrack             bool      `json:"onTrack"`
	HoursBehind         float64   `json:"hoursBehind"`
	Message             string    `json:"message"`
}

func (s *PredictionService) Predict(ctx context.Context, goal models.Goal) GoalPrediction {
	now := time.Now()
	pred := GoalPrediction{GoalID: goal.ID.Hex()}

	if goal.TargetHours > 0 {
		pred.ProgressPercent = (goal.TotalHours / goal.TargetHours) * 100
		if pred.ProgressPercent > 100 {
			pred.ProgressPercent = 100
		}
	}
	pred.HoursRemaining = math.Max(0, goal.TargetHours-goal.TotalHours)

	if goal.Deadline != nil {
		diff := goal.Deadline.Sub(now)
		pred.DaysRemaining = int(math.Max(0, math.Ceil(diff.Hours()/24)))
	}

	fourteenDaysAgo := truncateDay(now.AddDate(0, 0, -14))
	pipeline := []bson.M{
		{"$match": bson.M{"goalId": goal.ID, "date": bson.M{"$gte": fourteenDaysAgo}}},
		{"$group": bson.M{"_id": nil, "total": bson.M{"$sum": "$hoursStudied"}, "days": bson.M{"$sum": 1}}},
	}
	cursor, _ := s.DB.Collection("daily_logs").Aggregate(ctx, pipeline)
	avgHours := 0.0
	if cursor != nil && cursor.Next(ctx) {
		var r struct {
			Total float64 `bson:"total"`
			Days  int     `bson:"days"`
		}
		cursor.Decode(&r)
		if r.Days > 0 {
			avgHours = r.Total / float64(r.Days)
		}
		cursor.Close(ctx)
	}
	if avgHours == 0 && goal.CompletedDays > 0 {
		avgHours = goal.TotalHours / float64(goal.CompletedDays)
	}
	if avgHours == 0 {
		avgHours = 1.0
	}
	pred.AvgHoursPerDay = math.Round(avgHours*10) / 10

	if pred.DaysRemaining > 0 {
		pred.RequiredHoursPerDay = math.Round((pred.HoursRemaining/float64(pred.DaysRemaining))*10) / 10
	}

	if avgHours > 0 && pred.HoursRemaining > 0 {
		daysNeeded := int(math.Ceil(pred.HoursRemaining / avgHours))
		pred.EstimatedCompletion = now.AddDate(0, 0, daysNeeded)
	}

	if goal.Deadline != nil && pred.DaysRemaining > 0 {
		totalDays := goal.Deadline.Sub(goal.StartDate).Hours() / 24
		if totalDays > 0 {
			elapsed := now.Sub(goal.StartDate).Hours() / 24
			expectedProgress := (elapsed / totalDays) * goal.TargetHours
			pred.HoursBehind = math.Round((expectedProgress-goal.TotalHours)*10) / 10
			pred.OnTrack = pred.HoursBehind <= 0
		}
	} else {
		pred.OnTrack = pred.ProgressPercent >= 50 || avgHours >= 1
	}

	pred.Message = buildPredictionMessage(pred)
	return pred
}

func buildPredictionMessage(p GoalPrediction) string {
	if p.ProgressPercent >= 100 {
		return "🎉 Goal completed! Amazing work!"
	}
	if p.HoursBehind > 0 {
		return fmt.Sprintf("📈 You are %.1fh behind schedule. Study %.1fh/day to finish on time.", p.HoursBehind, p.RequiredHoursPerDay)
	}
	if !p.EstimatedCompletion.IsZero() {
		return fmt.Sprintf("✅ On track! Keep up %.1fh/day to finish by %s.", p.AvgHoursPerDay, p.EstimatedCompletion.Format("Jan 2, 2006"))
	}
	return fmt.Sprintf("💪 Study %.1fh/day to reach your deadline.", p.RequiredHoursPerDay)
}

type CompareService struct {
	DB *database.DB
}

type CompareStats struct {
	UserID         string                   `json:"userId"`
	UserName       string                   `json:"userName"`
	Username       string                   `json:"username"`
	GoalID         string                   `json:"goalId,omitempty"`
	GoalTitle      string                   `json:"goalTitle,omitempty"`
	GoalIcon       string                   `json:"goalIcon,omitempty"`
	GoalColor      string                   `json:"goalColor,omitempty"`
	TotalHours     float64                  `json:"totalHours"`
	DailyHours     []map[string]interface{} `json:"dailyHours"`
	AvgHoursPerDay float64                  `json:"avgHoursPerDay"`
	CurrentStreak  int                      `json:"currentStreak"`
	LongestStreak  int                      `json:"longestStreak"`
	TotalTasks     int                      `json:"totalTasks"`
	GoalProgress   float64                  `json:"goalProgress"`
	ActiveDays     int                      `json:"activeDays"`
	Heatmap        map[string]interface{}   `json:"heatmap"`
}

func (s *CompareService) GetStats(ctx context.Context, userID primitive.ObjectID, goalID *primitive.ObjectID, start, end time.Time) CompareStats {
	stats := CompareStats{UserID: userID.Hex()}

	var user models.User
	if s.DB.Collection("users").FindOne(ctx, bson.M{"_id": userID}).Decode(&user) == nil {
		stats.UserName = user.Name
	}
	var profile models.UserProfile
	if s.DB.Collection("user_profiles").FindOne(ctx, bson.M{"userId": userID}).Decode(&profile) == nil {
		stats.Username = profile.Username
		stats.CurrentStreak = profile.CurrentStreak
		stats.LongestStreak = profile.LongestStreak
	}

	filter := bson.M{"userId": userID, "date": bson.M{"$gte": start, "$lt": end}}
	if goalID != nil {
		filter["goalId"] = *goalID
	}

	pipeline := []bson.M{
		{"$match": filter},
		{"$group": bson.M{
			"_id":   bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$date"}},
			"hours": bson.M{"$sum": "$hoursStudied"},
			"tasks": bson.M{"$sum": "$tasksCompleted"},
		}},
		{"$sort": bson.M{"_id": 1}},
	}
	cursor, _ := s.DB.Collection("daily_logs").Aggregate(ctx, pipeline)
	totalHours := 0.0
	totalTasks := 0
	activeDays := 0
	if cursor != nil {
		defer cursor.Close(ctx)
		for cursor.Next(ctx) {
			var row struct {
				ID    string  `bson:"_id"`
				Hours float64 `bson:"hours"`
				Tasks int     `bson:"tasks"`
			}
			cursor.Decode(&row)
			stats.DailyHours = append(stats.DailyHours, map[string]interface{}{"date": row.ID, "hours": row.Hours, "tasks": row.Tasks})
			totalHours += row.Hours
			totalTasks += row.Tasks
			if row.Hours > 0 {
				activeDays++
			}
		}
	}
	if stats.DailyHours == nil {
		stats.DailyHours = []map[string]interface{}{}
	}
	stats.TotalHours = totalHours
	stats.TotalTasks = totalTasks
	stats.ActiveDays = activeDays
	if activeDays > 0 {
		stats.AvgHoursPerDay = math.Round((totalHours/float64(activeDays))*10) / 10
	}

	if goalID != nil {
		var goal models.Goal
		if s.DB.Collection("goals").FindOne(ctx, bson.M{"_id": *goalID}).Decode(&goal) == nil {
			stats.GoalID = goal.ID.Hex()
			stats.GoalTitle = goal.Title
			stats.GoalIcon = goal.Icon
			stats.GoalColor = goal.Color
			if goal.TargetHours > 0 {
				stats.GoalProgress = math.Min(100, (goal.TotalHours/goal.TargetHours)*100)
			}
		}
	}

	statsSvc := &StatsService{DB: s.DB}
	stats.Heatmap = statsSvc.HeatmapForUser(ctx, userID, start, end, goalID)
	return stats
}

func (s *StatsService) HeatmapForUser(ctx context.Context, userID primitive.ObjectID, start, end time.Time, goalID *primitive.ObjectID) map[string]interface{} {
	filter := bson.M{"userId": userID, "date": bson.M{"$gte": start, "$lt": end}}
	if goalID != nil {
		filter["goalId"] = *goalID
	}
	pipeline := []bson.M{
		{"$match": filter},
		{"$group": bson.M{
			"_id":   bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$date"}},
			"hours": bson.M{"$sum": "$hoursStudied"},
		}},
	}
	cursor, _ := s.DB.Collection("daily_logs").Aggregate(ctx, pipeline)
	data := map[string]interface{}{}
	if cursor != nil {
		defer cursor.Close(ctx)
		for cursor.Next(ctx) {
			var row struct {
				ID    string  `bson:"_id"`
				Hours float64 `bson:"hours"`
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
			data[row.ID] = map[string]interface{}{"hours": row.Hours, "level": level}
		}
	}
	return data
}

func ResolveDateRange(rangeType, startStr, endStr string) (time.Time, time.Time) {
	now := time.Now()
	today := truncateDay(now)
	switch rangeType {
	case "today":
		return today, today.Add(24 * time.Hour)
	case "week":
		return StartOfWeek(now), today.Add(24 * time.Hour)
	case "month":
		return StartOfMonth(now), today.Add(24 * time.Hour)
	case "year":
		return StartOfYear(now), today.Add(24 * time.Hour)
	case "custom":
		start, _ := time.Parse("2006-01-02", startStr)
		end, _ := time.Parse("2006-01-02", endStr)
		if end.IsZero() {
			end = today
		}
		return truncateDay(start), end.Add(24 * time.Hour)
	default:
		return StartOfWeek(now), today.Add(24 * time.Hour)
	}
}
