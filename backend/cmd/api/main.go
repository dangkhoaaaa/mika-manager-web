package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/mika/mika-manager-api/internal/config"
	"github.com/mika/mika-manager-api/internal/database"
	"github.com/mika/mika-manager-api/internal/keepalive"
	"github.com/mika/mika-manager-api/internal/router"
)

func main() {
	_ = godotenv.Load()

	cfg := config.Load()
	log.Printf("mongodb database: %s", cfg.MongoDatabase)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	db, err := database.Connect(ctx, cfg)
	if err != nil {
		log.Fatalf("mongodb: %v", err)
	}
	defer func() {
		_ = db.Disconnect(context.Background())
	}()

	keepalive.Start(cfg.PublicAPIURL)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router.New(cfg, db),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		log.Printf("API listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	_ = srv.Shutdown(shutdownCtx)
	log.Println("shutdown complete")
}
