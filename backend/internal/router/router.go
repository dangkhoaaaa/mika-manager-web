package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/mika/mika-manager-api/internal/config"
	"github.com/mika/mika-manager-api/internal/database"
	"github.com/mika/mika-manager-api/internal/handler"
	authmw "github.com/mika/mika-manager-api/internal/middleware"
)

func New(cfg config.Config, db *database.DB) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-API-Key"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	authH := &handler.AuthHandler{DB: db, JWTSecret: cfg.JWTSecret}
	projectH := &handler.ProjectHandler{DB: db}
	taskH := &handler.TaskHandler{DB: db, Project: projectH}
	columnH := &handler.ColumnHandler{DB: db, Project: projectH}
	reportH := &handler.ReportHandler{DB: db, Project: projectH}
	versionH := &handler.VersionHandler{DB: db, Project: projectH}
	publicH := &handler.PublicHandler{DB: db}
	notifH := &handler.NotificationHandler{DB: db}

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Render free tier sleeps after ~15m without traffic; ping this to stay warm.
	r.Get("/wake", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"ok":true,"message":"wake"}`))
	})

	r.Route("/api", func(api chi.Router) {
		api.Post("/auth/register", authH.Register)
		api.Post("/auth/login", authH.Login)

		api.Route("/public/{slug}", func(pub chi.Router) {
			pub.Post("/bugs", publicH.ReportBug)
			pub.Post("/features", publicH.RequestFeature)
			pub.Get("/changelog", publicH.Changelog)
			pub.Get("/changelog/{version}", publicH.Changelog)
		})

		api.Group(func(protected chi.Router) {
			protected.Use(authmw.JWT(cfg.JWTSecret))
			protected.Get("/auth/me", authH.Me)
			protected.Get("/notifications", notifH.List)
			protected.Post("/notifications/read-all", notifH.MarkAllRead)
			protected.Post("/notifications/{type}/{id}/read", notifH.MarkRead)

			protected.Get("/projects", projectH.List)
			protected.Post("/projects", projectH.Create)
			protected.Route("/projects/{projectID}", func(pr chi.Router) {
				pr.Get("/", projectH.Get)
				pr.Patch("/", projectH.Update)
				pr.Delete("/", projectH.Delete)
				pr.Post("/regenerate-key", projectH.RegenerateAPIKey)

				pr.Get("/columns", columnH.List)
				pr.Post("/columns", columnH.Create)
				pr.Patch("/columns/reorder", columnH.Reorder)
				pr.Patch("/columns/{columnID}", columnH.Update)
				pr.Delete("/columns/{columnID}", columnH.Delete)

				pr.Get("/tasks", taskH.List)
				pr.Post("/tasks", taskH.Create)
				pr.Patch("/tasks/reorder", taskH.Reorder)
				pr.Patch("/tasks/{taskID}", taskH.Update)
				pr.Delete("/tasks/{taskID}", taskH.Delete)

				pr.Get("/bugs", reportH.ListBugs)
				pr.Patch("/bugs/{bugID}", reportH.UpdateBug)
				pr.Get("/features", reportH.ListFeatures)
				pr.Patch("/features/{featureID}", reportH.UpdateFeature)

				pr.Get("/releases", versionH.List)
				pr.Post("/releases", versionH.Create)
				pr.Patch("/releases/{versionID}", versionH.Update)
				pr.Delete("/releases/{versionID}", versionH.Delete)
			})
		})
	})

	return r
}
