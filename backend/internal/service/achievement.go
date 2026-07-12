package service

import (
	"context"
	"time"

	"github.com/mika/mika-manager-api/internal/database"
	"github.com/mika/mika-manager-api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type AchievementService struct {
	DB *database.DB
}

func (s *AchievementService) CheckAndUnlock(ctx context.Context, userID primitive.ObjectID) ([]models.Achievement, error) {
	var unlocked []models.Achievement

	profile, _ := s.getProfile(ctx, userID)
	streak := 0
	totalHours := 0.0
	if profile != nil {
		streak = profile.CurrentStreak
		totalHours = profile.TotalHours
	}

	checks := map[string]bool{
		"streak_7":       streak >= 7,
		"streak_30":      streak >= 30,
		"hours_100":      totalHours >= 100,
		"hours_500":      totalHours >= 500,
		"first_goal":     s.hasGoals(ctx, userID),
		"goal_complete":  s.hasCompletedGoal(ctx, userID),
		"never_skip_mon": s.hasMondayStreak(ctx, userID, 4),
		"early_bird":     s.hasEarlyBird(ctx, userID),
	}

	for key, earned := range checks {
		if !earned {
			continue
		}
		ach, err := s.unlock(ctx, userID, key)
		if err == nil && ach != nil {
			unlocked = append(unlocked, *ach)
		}
	}
	return unlocked, nil
}

func (s *AchievementService) unlock(ctx context.Context, userID primitive.ObjectID, key string) (*models.Achievement, error) {
	def, ok := models.AchievementDefs[key]
	if !ok {
		return nil, nil
	}

	count, _ := s.DB.Collection("achievements").CountDocuments(ctx, bson.M{
		"userId": userID,
		"key":    key,
	})
	if count > 0 {
		return nil, nil
	}

	ach := models.Achievement{
		ID:          primitive.NewObjectID(),
		UserID:      userID,
		Key:         key,
		Title:       def.Title,
		Description: def.Description,
		Icon:        def.Icon,
		UnlockedAt:  time.Now(),
	}
	_, err := s.DB.Collection("achievements").InsertOne(ctx, ach)
	if err != nil {
		return nil, err
	}
	return &ach, nil
}

func (s *AchievementService) getProfile(ctx context.Context, userID primitive.ObjectID) (*models.UserProfile, error) {
	var p models.UserProfile
	err := s.DB.Collection("user_profiles").FindOne(ctx, bson.M{"userId": userID}).Decode(&p)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *AchievementService) hasGoals(ctx context.Context, userID primitive.ObjectID) bool {
	count, _ := s.DB.Collection("goals").CountDocuments(ctx, bson.M{"userId": userID})
	return count > 0
}

func (s *AchievementService) hasCompletedGoal(ctx context.Context, userID primitive.ObjectID) bool {
	count, _ := s.DB.Collection("goals").CountDocuments(ctx, bson.M{"userId": userID, "status": models.GoalCompleted})
	return count > 0
}

func (s *AchievementService) hasMondayStreak(ctx context.Context, userID primitive.ObjectID, weeks int) bool {
	now := time.Now()
	mondays := 0
	for i := 0; i < weeks*7; i++ {
		d := now.AddDate(0, 0, -i)
		if d.Weekday() != time.Monday {
			continue
		}
		start := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, d.Location())
		end := start.Add(24 * time.Hour)
		count, _ := s.DB.Collection("daily_logs").CountDocuments(ctx, bson.M{
			"userId": userID,
			"date":   bson.M{"$gte": start, "$lt": end},
		})
		if count > 0 {
			mondays++
		} else {
			break
		}
	}
	return mondays >= weeks
}

func (s *AchievementService) hasEarlyBird(ctx context.Context, userID primitive.ObjectID) bool {
	count, _ := s.DB.Collection("daily_logs").CountDocuments(ctx, bson.M{
		"userId": userID,
	})
	if count == 0 {
		return false
	}
	// Check if any log was created before 7 AM
	cursor, err := s.DB.Collection("daily_logs").Find(ctx, bson.M{"userId": userID},
		options.Find().SetLimit(100))
	if err != nil {
		return false
	}
	defer cursor.Close(ctx)
	for cursor.Next(ctx) {
		var log models.DailyLog
		if cursor.Decode(&log) == nil && log.CreatedAt.Hour() < 7 {
			return true
		}
	}
	return false
}

type StatsService struct {
	DB *database.DB
}

func (s *StatsService) UpdateStreak(ctx context.Context, userID primitive.ObjectID) error {
	today := truncateDay(time.Now())
	yesterday := today.AddDate(0, 0, -1)

	var profile models.UserProfile
	err := s.DB.Collection("user_profiles").FindOne(ctx, bson.M{"userId": userID}).Decode(&profile)
	if err != nil {
		profile = models.UserProfile{
			ID:        primitive.NewObjectID(),
			UserID:    userID,
			CreatedAt: time.Now(),
		}
	}

	hasToday, _ := s.DB.Collection("daily_logs").CountDocuments(ctx, bson.M{
		"userId": userID,
		"date":   bson.M{"$gte": today, "$lt": today.Add(24 * time.Hour)},
	})
	hasYesterday, _ := s.DB.Collection("daily_logs").CountDocuments(ctx, bson.M{
		"userId": userID,
		"date":   bson.M{"$gte": yesterday, "$lt": today},
	})

	streak := profile.CurrentStreak
	if hasToday > 0 {
		if hasYesterday > 0 || streak == 0 {
			if hasYesterday > 0 {
				streak++
			} else {
				streak = 1
			}
		}
	} else if hasYesterday == 0 {
		streak = 0
	}

	longest := profile.LongestStreak
	if streak > longest {
		longest = streak
	}

	_, err = s.DB.Collection("user_profiles").UpdateOne(ctx,
		bson.M{"userId": userID},
		bson.M{"$set": bson.M{
			"currentStreak": streak,
			"longestStreak": longest,
			"updatedAt":     time.Now(),
		}},
		options.Update().SetUpsert(true),
	)
	return err
}

func (s *StatsService) RecalcTotalHours(ctx context.Context, userID primitive.ObjectID) error {
	pipeline := []bson.M{
		{"$match": bson.M{"userId": userID}},
		{"$group": bson.M{"_id": nil, "total": bson.M{"$sum": "$hoursStudied"}}},
	}
	cursor, err := s.DB.Collection("daily_logs").Aggregate(ctx, pipeline)
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	total := 0.0
	if cursor.Next(ctx) {
		var result struct {
			Total float64 `bson:"total"`
		}
		cursor.Decode(&result)
		total = result.Total
	}

	_, err = s.DB.Collection("user_profiles").UpdateOne(ctx,
		bson.M{"userId": userID},
		bson.M{"$set": bson.M{"totalHours": total, "updatedAt": time.Now()}},
		options.Update().SetUpsert(true),
	)
	return err
}

func truncateDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func StartOfWeek(t time.Time) time.Time {
	weekday := int(t.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	return truncateDay(t.AddDate(0, 0, -(weekday - 1)))
}

func StartOfMonth(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
}

func StartOfYear(t time.Time) time.Time {
	return time.Date(t.Year(), 1, 1, 0, 0, 0, 0, t.Location())
}
