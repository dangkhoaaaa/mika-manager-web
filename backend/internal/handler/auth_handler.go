package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/mika/mika-manager-api/internal/auth"
	"github.com/mika/mika-manager-api/internal/database"
	"github.com/mika/mika-manager-api/internal/httputil"
	"github.com/mika/mika-manager-api/internal/middleware"
	"github.com/mika/mika-manager-api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	DB        *database.DB
	JWTSecret string
}

type registerReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Name = strings.TrimSpace(req.Name)
	if req.Email == "" || len(req.Password) < 6 || req.Name == "" {
		httputil.Error(w, http.StatusBadRequest, "email, name and password (min 6) required")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not hash password")
		return
	}

	user := models.User{
		ID:           primitive.NewObjectID(),
		Email:        req.Email,
		PasswordHash: string(hash),
		Name:         req.Name,
		CreatedAt:    time.Now(),
	}

	ctx := r.Context()
	_, err = h.DB.Collection("users").InsertOne(ctx, user)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			httputil.Error(w, http.StatusConflict, "email already registered")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "could not create user")
		return
	}

	token, err := auth.IssueToken(user.ID, user.Email, h.JWTSecret)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not issue token")
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]interface{}{
		"token": token,
		"user":  sanitizeUser(user),
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	var user models.User
	err := h.DB.Collection("users").FindOne(r.Context(), bson.M{"email": req.Email}).Decode(&user)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := auth.IssueToken(user.ID, user.Email, h.JWTSecret)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "could not issue token")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"user":  sanitizeUser(user),
	})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid user")
		return
	}

	var user models.User
	err = h.DB.Collection("users").FindOne(context.Background(), bson.M{"_id": oid}).Decode(&user)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "user not found")
		return
	}
	httputil.JSON(w, http.StatusOK, sanitizeUser(user))
}

func sanitizeUser(u models.User) map[string]interface{} {
	return map[string]interface{}{
		"id":        u.ID.Hex(),
		"email":     u.Email,
		"name":      u.Name,
		"createdAt": u.CreatedAt,
	}
}
