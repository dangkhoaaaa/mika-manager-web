package config

import (
	"os"
)

type Config struct {
	Port          string
	MongoURI      string
	MongoDatabase string
	JWTSecret string
	// PublicAPIURL — URL công khai của API trên Render (vd. https://xxx.onrender.com).
	// Dùng cho keep-alive tự ping /wake mỗi ~14 phút.
	PublicAPIURL string
}

func Load() Config {
	return Config{
		Port:          getEnv("PORT", "8080"),
		MongoURI:      getEnv("MONGODB_URI", "mongodb://localhost:27017"),
		MongoDatabase: getEnv("MONGODB_DATABASE", "mika_manager"),
		JWTSecret:     getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		PublicAPIURL:  os.Getenv("PUBLIC_API_URL"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
