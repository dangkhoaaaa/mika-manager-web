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
