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
	return err
}

func (db *DB) Disconnect(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return db.Client.Disconnect(ctx)
}
