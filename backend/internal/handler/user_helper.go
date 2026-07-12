package handler

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/mika/mika-manager-api/internal/database"
	"github.com/mika/mika-manager-api/internal/httputil"
	"github.com/mika/mika-manager-api/internal/middleware"
	"github.com/mika/mika-manager-api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func generateUsername(ctx context.Context, db *database.DB, email, name string) string {
	base := httputil.Slugify(name)
	if base == "project" || len(base) < 2 {
		parts := strings.Split(email, "@")
		base = httputil.Slugify(parts[0])
	}
	if base == "project" {
		base = "user"
	}

	candidate := base
	for i := 0; i < 20; i++ {
		count, _ := db.Collection("user_profiles").CountDocuments(ctx, bson.M{"username": candidate})
		if count == 0 {
			return candidate
		}
		if i == 0 {
			candidate = fmt.Sprintf("%s%d", base, rand.Intn(900)+100)
		} else {
			candidate = fmt.Sprintf("%s%d", base, rand.Intn(9000)+1000)
		}
	}
	return fmt.Sprintf("%s%d", base, time.Now().Unix()%100000)
}

func ensureUserProfile(ctx context.Context, db *database.DB, user models.User) models.UserProfile {
	var profile models.UserProfile
	err := db.Collection("user_profiles").FindOne(ctx, bson.M{"userId": user.ID}).Decode(&profile)
	if err == nil && profile.Username != "" {
		return profile
	}

	username := profile.Username
	if username == "" {
		username = generateUsername(ctx, db, user.Email, user.Name)
	}

	now := time.Now()
	update := bson.M{
		"username":  username,
		"updatedAt": now,
	}
	if err == mongo.ErrNoDocuments {
		profile = models.UserProfile{
			ID:        primitive.NewObjectID(),
			UserID:    user.ID,
			Username:  username,
			CreatedAt: now,
			UpdatedAt: now,
		}
		db.Collection("user_profiles").InsertOne(ctx, profile)
		return profile
	}

	db.Collection("user_profiles").UpdateOne(ctx,
		bson.M{"userId": user.ID},
		bson.M{"$set": update},
		options.Update().SetUpsert(true),
	)
	profile.Username = username
	profile.UserID = user.ID
	return profile
}

func (h *SearchHandler) Suggested(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	excludeID, _ := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))

	filter := bson.M{"username": bson.M{"$exists": true, "$ne": ""}}
	if excludeID != primitive.NilObjectID {
		filter["userId"] = bson.M{"$ne": excludeID}
	}

	pipeline := []bson.M{
		{"$match": filter},
		{"$sample": bson.M{"size": 10}},
	}

	cursor, err := h.DB.Collection("user_profiles").Aggregate(ctx, pipeline)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not fetch suggestions")
		return
	}
	defer cursor.Close(ctx)

	type SuggestedUser struct {
		models.UserProfile
		Name string `json:"name"`
	}

	var profiles []models.UserProfile
	cursor.All(ctx, &profiles)

	var result []SuggestedUser
	for _, p := range profiles {
		if p.Username == "" {
			continue
		}
		item := SuggestedUser{UserProfile: p, Name: p.Username}
		var user models.User
		if h.DB.Collection("users").FindOne(ctx, bson.M{"_id": p.UserID}).Decode(&user) == nil {
			item.Name = user.Name
		}
		result = append(result, item)
	}
	if result == nil {
		result = []SuggestedUser{}
	}

	httputil.JSON(w, http.StatusOK, result)
}
