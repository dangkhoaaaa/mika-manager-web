package handler

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/mika/mika-manager-api/internal/cloudinary"
	"github.com/mika/mika-manager-api/internal/database"
	"github.com/mika/mika-manager-api/internal/httputil"
	"github.com/mika/mika-manager-api/internal/middleware"
	"github.com/mika/mika-manager-api/internal/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UploadHandler struct {
	DB         *database.DB
	Cloudinary *cloudinary.Client
}

func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(middleware.GetUserID(r.Context()))
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid multipart form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "file required")
		return
	}
	defer file.Close()

	folder := fmt.Sprintf("progress-challenge/%s", userID.Hex())
	ext := strings.ToLower(filepath.Ext(header.Filename))

	if !h.Cloudinary.Enabled() {
		// Fallback: return placeholder for dev without Cloudinary
		httputil.JSON(w, http.StatusOK, models.EvidenceFile{
			URL:      fmt.Sprintf("https://placehold.co/800x600/6366f1/white?text=%s", header.Filename),
			PublicID: "",
			Name:     header.Filename,
			Type:     contentType(ext),
			Size:     header.Size,
		})
		return
	}

	result, err := h.Cloudinary.Upload(r.Context(), file, header.Filename, folder)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "upload failed")
		return
	}

	httputil.JSON(w, http.StatusOK, models.EvidenceFile{
		URL:      result.URL,
		PublicID: result.PublicID,
		Name:     header.Filename,
		Type:     contentType(ext),
		Size:     result.Bytes,
	})
}

func contentType(ext string) string {
	switch ext {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp":
		return "image"
	case ".mp4", ".webm", ".mov":
		return "video"
	default:
		return "file"
	}
}
