package database

import (
	"context"
	"time"

	"github.com/mika/mika-manager-api/internal/config"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type DB struct {
	Client   *mongo.Client
	Database *mongo.Database
}

func Connect(ctx context.Context, cfg config.Config) (*DB, error) {
	opts := options.Client().ApplyURI(cfg.MongoURI)
	client, err := mongo.Connect(ctx, opts)
	if err != nil {
		return nil, err
	}
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}
	db := &DB{
		Client:   client,
		Database: client.Database(cfg.MongoDatabase),
	}
	if err := db.ensureIndexes(ctx); err != nil {
		return nil, err
	}
	return db, nil
}

func (db *DB) Collection(name string) *mongo.Collection {
	return db.Database.Collection(name)
}

func (db *DB) ensureIndexes(ctx context.Context) error {
	users := db.Collection("users")
	_, err := users.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	projects := db.Collection("projects")
	_, err = projects.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "userId", Value: 1}}},
		{Keys: bson.D{{Key: "slug", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "apiKey", Value: 1}}, Options: options.Index().SetUnique(true)},
	})
	if err != nil {
		return err
	}

	tasks := db.Collection("tasks")
	_, err = tasks.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "projectId", Value: 1}, {Key: "status", Value: 1}, {Key: "order", Value: 1}},
	})
	if err != nil {
		return err
	}

	_, err = db.Collection("board_columns").Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "projectId", Value: 1}, {Key: "order", Value: 1}}},
		{Keys: bson.D{{Key: "projectId", Value: 1}, {Key: "key", Value: 1}}, Options: options.Index().SetUnique(true)},
	})
	if err != nil {
		return err
	}

	for _, coll := range []string{"bug_reports", "feature_requests", "version_releases"} {
		_, err = db.Collection(coll).Indexes().CreateOne(ctx, mongo.IndexModel{
			Keys: bson.D{{Key: "projectId", Value: 1}, {Key: "createdAt", Value: -1}},
		})
		if err != nil {
			return err
		}
	}

	_, err = db.Collection("version_releases").Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "projectId", Value: 1}, {Key: "version", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	// Progress Challenge indexes
	pcIndexes := []struct {
		coll    string
		indexes []mongo.IndexModel
	}{
		{"goals", []mongo.IndexModel{
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "order", Value: 1}}},
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "status", Value: 1}}},
			{Keys: bson.D{{Key: "visibility", Value: 1}, {Key: "createdAt", Value: -1}}},
		}},
		{"daily_logs", []mongo.IndexModel{
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "date", Value: -1}}},
			{Keys: bson.D{{Key: "goalId", Value: 1}, {Key: "date", Value: -1}}},
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "goalId", Value: 1}, {Key: "date", Value: 1}}, Options: options.Index().SetUnique(true)},
		}},
		{"user_profiles", []mongo.IndexModel{
			{Keys: bson.D{{Key: "userId", Value: 1}}, Options: options.Index().SetUnique(true)},
			{Keys: bson.D{{Key: "username", Value: 1}}, Options: options.Index().SetUnique(true).SetSparse(true)},
		}},
		{"follows", []mongo.IndexModel{
			{Keys: bson.D{{Key: "followerId", Value: 1}, {Key: "followingId", Value: 1}}, Options: options.Index().SetUnique(true)},
			{Keys: bson.D{{Key: "followingId", Value: 1}}},
		}},
		{"likes", []mongo.IndexModel{
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "targetId", Value: 1}, {Key: "targetType", Value: 1}}, Options: options.Index().SetUnique(true)},
		}},
		{"comments", []mongo.IndexModel{
			{Keys: bson.D{{Key: "targetId", Value: 1}, {Key: "createdAt", Value: -1}}},
		}},
		{"cheers", []mongo.IndexModel{
			{Keys: bson.D{{Key: "targetId", Value: 1}, {Key: "createdAt", Value: -1}}},
		}},
		{"achievements", []mongo.IndexModel{
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "key", Value: 1}}, Options: options.Index().SetUnique(true)},
		}},
		{"pc_notifications", []mongo.IndexModel{
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "createdAt", Value: -1}}},
		}},
		{"password_resets", []mongo.IndexModel{
			{Keys: bson.D{{Key: "token", Value: 1}}, Options: options.Index().SetUnique(true)},
			{Keys: bson.D{{Key: "email", Value: 1}}},
		}},
		{"goal_tasks", []mongo.IndexModel{
			{Keys: bson.D{{Key: "goalId", Value: 1}, {Key: "order", Value: 1}}},
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "goalId", Value: 1}}},
		}},
		{"compare_shares", []mongo.IndexModel{
			{Keys: bson.D{{Key: "shareId", Value: 1}}, Options: options.Index().SetUnique(true)},
		}},
		{"user_preferences", []mongo.IndexModel{
			{Keys: bson.D{{Key: "userId", Value: 1}}, Options: options.Index().SetUnique(true)},
		}},
	}

	for _, pc := range pcIndexes {
		_, err = db.Collection(pc.coll).Indexes().CreateMany(ctx, pc.indexes)
		if err != nil {
			return err
		}
	}

	return nil
}

func (db *DB) Disconnect(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return db.Client.Disconnect(ctx)
}
