package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Goal statuses
const (
	GoalActive    = "active"
	GoalCompleted = "completed"
	GoalPaused    = "paused"
	GoalArchived  = "archived"
)

// Goal visibility
const (
	VisibilityPrivate = "private"
	VisibilityPublic  = "public"
)

type Goal struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID       primitive.ObjectID `bson:"userId" json:"userId"`
	Title        string             `bson:"title" json:"title"`
	Description  string             `bson:"description" json:"description"`
	Icon         string             `bson:"icon" json:"icon"`
	CoverImage   string             `bson:"coverImage" json:"coverImage"`
	Color        string             `bson:"color" json:"color"`
	StartDate    time.Time          `bson:"startDate" json:"startDate"`
	Deadline     *time.Time         `bson:"deadline,omitempty" json:"deadline,omitempty"`
	TargetHours  float64            `bson:"targetHours" json:"targetHours"`
	TargetDays   int                `bson:"targetDays" json:"targetDays"`
	Status       string             `bson:"status" json:"status"`
	Visibility   string             `bson:"visibility" json:"visibility"`
	Tags         []string           `bson:"tags" json:"tags"`
	Order        int                `bson:"order" json:"order"`
	TotalHours   float64            `bson:"totalHours" json:"totalHours"`
	CompletedDays int               `bson:"completedDays" json:"completedDays"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type DailyLog struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID          primitive.ObjectID `bson:"userId" json:"userId"`
	GoalID          primitive.ObjectID `bson:"goalId" json:"goalId"`
	Date            time.Time          `bson:"date" json:"date"`
	HoursStudied    float64            `bson:"hoursStudied" json:"hoursStudied"`
	TasksCompleted  int                `bson:"tasksCompleted" json:"tasksCompleted"`
	Notes           string             `bson:"notes" json:"notes"`
	Mood            string             `bson:"mood" json:"mood"`
	Difficulty      int                `bson:"difficulty" json:"difficulty"`
	EvidenceImages  []EvidenceFile     `bson:"evidenceImages" json:"evidenceImages"`
	EvidenceFiles   []EvidenceFile     `bson:"evidenceFiles" json:"evidenceFiles"`
	EvidenceVideos  []EvidenceFile     `bson:"evidenceVideos" json:"evidenceVideos"`
	CreatedAt       time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type EvidenceFile struct {
	URL      string `bson:"url" json:"url"`
	PublicID string `bson:"publicId" json:"publicId"`
	Name     string `bson:"name" json:"name"`
	Type     string `bson:"type" json:"type"`
	Size     int64  `bson:"size" json:"size"`
}

type UserProfile struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID      primitive.ObjectID `bson:"userId" json:"userId"`
	Username    string             `bson:"username" json:"username"`
	Bio         string             `bson:"bio" json:"bio"`
	Avatar      string             `bson:"avatar" json:"avatar"`
	Banner      string             `bson:"banner" json:"banner"`
	TotalHours  float64            `bson:"totalHours" json:"totalHours"`
	CurrentStreak int              `bson:"currentStreak" json:"currentStreak"`
	LongestStreak int              `bson:"longestStreak" json:"longestStreak"`
	FollowersCount int             `bson:"followersCount" json:"followersCount"`
	FollowingCount int             `bson:"followingCount" json:"followingCount"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type Follow struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	FollowerID  primitive.ObjectID `bson:"followerId" json:"followerId"`
	FollowingID primitive.ObjectID `bson:"followingId" json:"followingId"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
}

type Like struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"userId" json:"userId"`
	TargetID  primitive.ObjectID `bson:"targetId" json:"targetId"`
	TargetType string            `bson:"targetType" json:"targetType"` // log, goal
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

type Comment struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID     primitive.ObjectID `bson:"userId" json:"userId"`
	TargetID   primitive.ObjectID `bson:"targetId" json:"targetId"`
	TargetType string             `bson:"targetType" json:"targetType"`
	Content    string             `bson:"content" json:"content"`
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
}

type Cheer struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"userId" json:"userId"`
	TargetID  primitive.ObjectID `bson:"targetId" json:"targetId"`
	Message   string             `bson:"message" json:"message"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

type Achievement struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID      primitive.ObjectID `bson:"userId" json:"userId"`
	Key         string             `bson:"key" json:"key"`
	Title       string             `bson:"title" json:"title"`
	Description string             `bson:"description" json:"description"`
	Icon        string             `bson:"icon" json:"icon"`
	UnlockedAt  time.Time          `bson:"unlockedAt" json:"unlockedAt"`
}

type PCNotification struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"userId" json:"userId"`
	Type      string             `bson:"type" json:"type"`
	Title     string             `bson:"title" json:"title"`
	Message   string             `bson:"message" json:"message"`
	Link      string             `bson:"link" json:"link"`
	IsRead    bool               `bson:"isRead" json:"isRead"`
	FromUserID *primitive.ObjectID `bson:"fromUserId,omitempty" json:"fromUserId,omitempty"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

type PasswordReset struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email     string             `bson:"email" json:"email"`
	Token     string             `bson:"token" json:"token"`
	ExpiresAt time.Time          `bson:"expiresAt" json:"expiresAt"`
	Used      bool               `bson:"used" json:"used"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

// Achievement definitions
var AchievementDefs = map[string]struct {
	Title       string
	Description string
	Icon        string
}{
	"streak_7":       {"7 Day Streak", "Study for 7 consecutive days", "🔥"},
	"streak_30":      {"30 Day Streak", "Study for 30 consecutive days", "⚡"},
	"hours_100":      {"100 Hours", "Log 100 total study hours", "📚"},
	"hours_500":      {"500 Hours", "Log 500 total study hours", "🏆"},
	"never_skip_mon": {"Never Skip Monday", "Study every Monday for 4 weeks", "📅"},
	"early_bird":     {"Early Bird", "Log progress before 7 AM", "🌅"},
	"first_goal":     {"First Goal", "Create your first learning goal", "🎯"},
	"goal_complete":  {"Goal Crusher", "Complete your first goal", "✨"},
}

// Goal task statuses
const (
	GoalTaskTodo       = "todo"
	GoalTaskInProgress = "in_progress"
	GoalTaskDone       = "task_done"
	GoalTaskBlocked    = "blocked"
)

type GoalTask struct {
	ID             primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	GoalID         primitive.ObjectID   `bson:"goalId" json:"goalId"`
	UserID         primitive.ObjectID   `bson:"userId" json:"userId"`
	ParentID       *primitive.ObjectID  `bson:"parentId,omitempty" json:"parentId,omitempty"`
	Title          string               `bson:"title" json:"title"`
	Description    string               `bson:"description" json:"description"`
	Status         string               `bson:"status" json:"status"`
	Progress       float64              `bson:"progress" json:"progress"`
	EstimatedHours float64              `bson:"estimatedHours" json:"estimatedHours"`
	SpentHours     float64              `bson:"spentHours" json:"spentHours"`
	DueDate        *time.Time           `bson:"dueDate,omitempty" json:"dueDate,omitempty"`
	Priority       string               `bson:"priority" json:"priority"`
	Notes          string               `bson:"notes" json:"notes"`
	Attachments    []EvidenceFile       `bson:"attachments" json:"attachments"`
	Evidence       []EvidenceFile       `bson:"evidence" json:"evidence"`
	DependsOn      []primitive.ObjectID `bson:"dependsOn" json:"dependsOn"`
	Order          int                  `bson:"order" json:"order"`
	CreatedAt      time.Time            `bson:"createdAt" json:"createdAt"`
	UpdatedAt      time.Time            `bson:"updatedAt" json:"updatedAt"`
}

type UserPreferences struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID          primitive.ObjectID `bson:"userId" json:"userId"`
	ThemePreset     string             `bson:"themePreset" json:"themePreset"`
	AccentColor     string             `bson:"accentColor" json:"accentColor"`
	BackgroundColor string             `bson:"backgroundColor" json:"backgroundColor"`
	GradientFrom    string             `bson:"gradientFrom" json:"gradientFrom"`
	GradientTo      string             `bson:"gradientTo" json:"gradientTo"`
	GlassIntensity  float64            `bson:"glassIntensity" json:"glassIntensity"`
	BorderRadius    string             `bson:"borderRadius" json:"borderRadius"`
	FontFamily      string             `bson:"fontFamily" json:"fontFamily"`
	ColorMode       string             `bson:"colorMode" json:"colorMode"`
	CardDensity     string             `bson:"cardDensity" json:"cardDensity"`
	DashboardLayout string             `bson:"dashboardLayout" json:"dashboardLayout"`
	SidebarStyle    string             `bson:"sidebarStyle" json:"sidebarStyle"`
	AnimationSpeed  string             `bson:"animationSpeed" json:"animationSpeed"`
	ReduceMotion    bool               `bson:"reduceMotion" json:"reduceMotion"`
	UpdatedAt       time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type CompareShare struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ShareID   string             `bson:"shareId" json:"shareId"`
	UserAID   primitive.ObjectID `bson:"userAId" json:"userAId"`
	UserBID   primitive.ObjectID `bson:"userBId" json:"userBId"`
	GoalAID   *primitive.ObjectID `bson:"goalAId,omitempty" json:"goalAId,omitempty"`
	GoalBID   *primitive.ObjectID `bson:"goalBId,omitempty" json:"goalBId,omitempty"`
	Range     string             `bson:"range" json:"range"`
	StartDate *time.Time         `bson:"startDate,omitempty" json:"startDate,omitempty"`
	EndDate   *time.Time         `bson:"endDate,omitempty" json:"endDate,omitempty"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

