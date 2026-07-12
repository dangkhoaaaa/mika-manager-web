export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface UserProfile {
  id?: string;
  userId: string;
  username?: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  totalHours: number;
  currentStreak: number;
  longestStreak: number;
  followersCount: number;
  followingCount: number;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  icon: string;
  coverImage: string;
  color: string;
  startDate: string;
  deadline?: string;
  targetHours: number;
  targetDays: number;
  status: "active" | "completed" | "paused" | "archived";
  visibility: "private" | "public";
  tags: string[];
  order: number;
  totalHours: number;
  completedDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceFile {
  url: string;
  publicId: string;
  name: string;
  type: string;
  size: number;
}

export interface DailyLog {
  id: string;
  userId: string;
  goalId: string;
  date: string;
  hoursStudied: number;
  tasksCompleted: number;
  notes: string;
  mood: string;
  difficulty: number;
  evidenceImages: EvidenceFile[];
  evidenceFiles: EvidenceFile[];
  evidenceVideos: EvidenceFile[];
  createdAt: string;
  updatedAt: string;
}

export interface Achievement {
  id?: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  unlocked?: boolean;
}

export interface DashboardData {
  todayHours: number;
  currentStreak: number;
  longestStreak: number;
  totalHours: number;
  weeklyHours: number;
  monthlyHours: number;
  activeGoals: number;
  completedGoals: number;
  heatmap: Record<string, { hours: number; count: number; level: number }>;
  recentActivities: DailyLog[];
  achievements: Achievement[];
  achievementProgress: { unlocked: number; total: number };
  quote: string;
}

export interface PCNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export interface GalleryItem {
  logId: string;
  date: string;
  goalId: string;
  images: EvidenceFile[];
  videos: EvidenceFile[];
}

export interface ChartPoint {
  date: string;
  hours: number;
  tasks: number;
}

export interface CategoryStat {
  name: string;
  hours: number;
  color: string;
}

export const MOODS = [
  { value: "great", label: "Tuyệt vời", emoji: "😄" },
  { value: "good", label: "Tốt", emoji: "🙂" },
  { value: "okay", label: "Ổn", emoji: "😐" },
  { value: "tired", label: "Mệt", emoji: "😴" },
  { value: "stressed", label: "Căng thẳng", emoji: "😰" },
];

export const GOAL_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

export const GOAL_ICONS = ["🎯", "📚", "💻", "🎨", "🏃", "🧠", "🎵", "🔬", "📐", "🌍"];

export interface Comment {
  id: string;
  userId: string;
  targetId: string;
  targetType: string;
  content: string;
  createdAt: string;
  authorName: string;
  authorUsername?: string;
}

export interface CheerItem {
  id: string;
  userId: string;
  targetId: string;
  message: string;
  createdAt: string;
  authorName: string;
  authorUsername?: string;
}

export interface TimelineItem {
  log: DailyLog;
  goal: { id: string; title: string; icon: string; color: string };
  user: { id: string; name: string; username?: string };
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}

export interface GoalTask {
  id: string;
  goalId: string;
  userId: string;
  parentId?: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "task_done" | "blocked";
  progress: number;
  estimatedHours: number;
  spentHours: number;
  dueDate?: string;
  priority: "low" | "medium" | "high";
  notes: string;
  attachments: EvidenceFile[];
  evidence: EvidenceFile[];
  dependsOn: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDependencyNode {
  id: string;
  title: string;
  status: string;
  progress: number;
  dependsOn: string[];
  blocked: boolean;
}

export interface GoalPrediction {
  goalId: string;
  daysRemaining: number;
  estimatedCompletion: string;
  hoursRemaining: number;
  avgHoursPerDay: number;
  requiredHoursPerDay: number;
  progressPercent: number;
  onTrack: boolean;
  hoursBehind: number;
  message: string;
}

export interface CompareStats {
  userId: string;
  userName: string;
  username: string;
  goalId?: string;
  goalTitle?: string;
  goalIcon?: string;
  goalColor?: string;
  totalHours: number;
  dailyHours: { date: string; hours: number; tasks: number }[];
  avgHoursPerDay: number;
  currentStreak: number;
  longestStreak: number;
  totalTasks: number;
  goalProgress: number;
  activeDays: number;
  heatmap: Record<string, { hours: number; level: number }>;
}

export interface ReplayFrame {
  date: string;
  hoursStudied: number;
  tasksCompleted: number;
  goalId: string;
  notes: string;
  hasEvidence: boolean;
  streak: number;
  totalHours: number;
}

export interface CalendarDay {
  date: string;
  hoursStudied: number;
  tasksCompleted: number;
  mood: string;
  hasEvidence: boolean;
  hasNotes: boolean;
  goalIds: string[];
  logIds: string[];
}

export interface GitTimelineNode {
  id: string;
  date: string;
  hours: number;
  tasks: number;
  goalId: string;
  goalTitle: string;
  goalIcon: string;
  goalColor: string;
  notes: string;
  mood: string;
  hasEvidence: boolean;
  branch: string;
}

export interface AdvancedAnalytics {
  period: string;
  chartData: ChartPoint[];
  perGoal: CategoryStat[];
  totalHours: number;
  avgSession: number;
  longestSession: number;
  activeDays: number;
  currentStreak: number;
  consistency: number;
}

export interface UserPreferences {
  themePreset: string;
  accentColor: string;
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
  glassIntensity: number;
  borderRadius: string;
  fontFamily: string;
  colorMode: "dark" | "light";
  cardDensity: "compact" | "comfortable" | "spacious";
  dashboardLayout: string;
  sidebarStyle: string;
  animationSpeed: "slow" | "normal" | "fast";
  reduceMotion: boolean;
}

export const THEME_PRESETS = [
  { id: "midnight", name: "Midnight", colors: ["#6366f1", "#1e1b4b", "#312e81"] },
  { id: "ocean", name: "Ocean", colors: ["#06b6d4", "#0c4a6e", "#164e63"] },
  { id: "forest", name: "Forest", colors: ["#22c55e", "#14532d", "#166534"] },
  { id: "sakura", name: "Sakura", colors: ["#f472b6", "#831843", "#9d174d"] },
  { id: "sunset", name: "Sunset", colors: ["#f97316", "#7c2d12", "#c2410c"] },
  { id: "cyberpunk", name: "Cyberpunk", colors: ["#e879f9", "#581c87", "#06b6d4"] },
  { id: "minimal", name: "Minimal White", colors: ["#f8fafc", "#e2e8f0", "#94a3b8"] },
] as const;

export const TASK_STATUSES = [
  { value: "todo", label: "Chưa làm", color: "bg-slate-500/20 text-slate-300" },
  { value: "in_progress", label: "Đang làm", color: "bg-blue-500/20 text-blue-300" },
  { value: "task_done", label: "Hoàn thành", color: "bg-emerald-500/20 text-emerald-300" },
  { value: "blocked", label: "Bị chặn", color: "bg-red-500/20 text-red-300" },
] as const;
