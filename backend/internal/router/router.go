package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/mika/mika-manager-api/internal/cloudinary"
	"github.com/mika/mika-manager-api/internal/config"
	"github.com/mika/mika-manager-api/internal/database"
	"github.com/mika/mika-manager-api/internal/handler"
	authmw "github.com/mika/mika-manager-api/internal/middleware"
	"github.com/mika/mika-manager-api/internal/service"
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

	// Progress Challenge services & handlers
	statsSvc := &service.StatsService{DB: db}
	achieveSvc := &service.AchievementService{DB: db}
	cloudClient := cloudinary.New(cfg.CloudinaryCloudName, cfg.CloudinaryAPIKey, cfg.CloudinaryAPISecret)

	goalH := &handler.GoalHandler{DB: db, Stats: statsSvc, Achieve: achieveSvc}
	logH := &handler.DailyLogHandler{DB: db, Stats: statsSvc, Achieve: achieveSvc, Goal: goalH}
	dashboardH := &handler.DashboardHandler{DB: db}
	profileH := &handler.ProfileHandler{DB: db}
	socialH := &handler.SocialHandler{DB: db}
	pcNotifH := &handler.PCNotificationHandler{DB: db}
	achieveH := &handler.AchievementHandler{DB: db}
	searchH := &handler.SearchHandler{DB: db}
	uploadH := &handler.UploadHandler{DB: db, Cloudinary: cloudClient}

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"status":"ok"}`))
	})

	r.Get("/wake", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"ok":true,"message":"wake"}`))
	})

	r.Route("/api", func(api chi.Router) {
		// Auth
		api.Post("/auth/register", authH.Register)
		api.Post("/auth/login", authH.Login)
		api.Post("/auth/forgot-password", authH.ForgotPassword)
		api.Post("/auth/reset-password", authH.ResetPassword)

		// Public profile (optional auth for isFollowing)
		api.With(authmw.OptionalJWT(cfg.JWTSecret)).Get("/pc/profile/{username}", profileH.GetPublic)
		api.With(authmw.OptionalJWT(cfg.JWTSecret)).Get("/pc/public/{username}/timeline", profileH.GetPublicTimeline)
		api.With(authmw.OptionalJWT(cfg.JWTSecret)).Get("/pc/public/{username}/goals/{goalID}", profileH.GetPublicGoal)
		api.With(authmw.OptionalJWT(cfg.JWTSecret)).Get("/pc/social/stats/{targetID}", socialH.GetStats)
		api.With(authmw.OptionalJWT(cfg.JWTSecret)).Get("/pc/social/comments/{targetID}", socialH.ListComments)
		api.Get("/pc/social/cheers/{userID}", socialH.ListCheers)

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

			// Progress Challenge routes
			protected.Route("/pc", func(pc chi.Router) {
				pc.Get("/dashboard", dashboardH.Get)
				pc.Get("/statistics", dashboardH.Statistics)
				pc.Get("/logs/today", logH.Today)

				pc.Get("/goals", goalH.List)
				pc.Post("/goals", goalH.Create)
				pc.Patch("/goals/reorder", goalH.Reorder)
				pc.Route("/goals/{goalID}", func(g chi.Router) {
					g.Get("/", goalH.Get)
					g.Patch("/", goalH.Update)
					g.Delete("/", goalH.Delete)
					g.Get("/stats", goalH.GoalStats)
					g.Get("/heatmap", goalH.Heatmap)
					g.Get("/gallery", goalH.Gallery)
					g.Get("/logs", logH.List)
					g.Post("/logs", logH.Create)
				})
				pc.Patch("/logs/{logID}", logH.Update)
				pc.Delete("/logs/{logID}", logH.Delete)
				pc.Get("/gallery", goalH.Gallery)

				pc.Get("/profile", profileH.GetMe)
				pc.Patch("/profile", profileH.Update)

				pc.Post("/upload", uploadH.Upload)

				pc.Get("/achievements", achieveH.List)

				pc.Get("/notifications", pcNotifH.List)
				pc.Post("/notifications/read-all", pcNotifH.MarkAllRead)
				pc.Post("/notifications/{notifID}/read", pcNotifH.MarkRead)

				pc.Get("/search", searchH.Search)
				pc.Get("/users/suggested", searchH.Suggested)

				pc.Post("/social/follow/{userID}", socialH.Follow)
				pc.Delete("/social/follow/{userID}", socialH.Unfollow)
				pc.Post("/social/like", socialH.Like)
				pc.Delete("/social/unlike", socialH.Unlike)
				pc.Post("/social/comment", socialH.Comment)
				pc.Post("/social/cheer", socialH.Cheer)
			})

			// Mika Manager routes
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
