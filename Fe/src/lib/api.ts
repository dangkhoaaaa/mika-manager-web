const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pc_token");
}

export function setToken(token: string) {
  localStorage.setItem("pc_token", token);
}

export function clearToken() {
  localStorage.removeItem("pc_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data.error || "Request failed");
  }

  return data as T;
}

// Auth
export const authApi = {
  register: (body: { email: string; password: string; name: string }) =>
    request<{ token: string; user: import("./types").User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: import("./types").User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => request<import("./types").User>("/auth/me"),
  forgotPassword: (email: string) =>
    request<{ message: string; token?: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),
};

// Dashboard
export const dashboardApi = {
  get: () => request<import("./types").DashboardData>("/pc/dashboard"),
  statistics: (period = "weekly") =>
    request<{
      period: string;
      chartData: import("./types").ChartPoint[];
      categories: import("./types").CategoryStat[];
      avgSession: number;
      totalHours: number;
      currentStreak: number;
    }>(`/pc/statistics?period=${period}`),
};

// Goals
export const goalsApi = {
  list: (params?: { status?: string; q?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<import("./types").Goal[]>(`/pc/goals${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => request<import("./types").Goal>(`/pc/goals/${id}`),
  create: (body: Partial<import("./types").Goal>) =>
    request<import("./types").Goal>("/pc/goals", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<import("./types").Goal>) =>
    request<import("./types").Goal>(`/pc/goals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<void>(`/pc/goals/${id}`, { method: "DELETE" }),
  reorder: (order: string[]) =>
    request<{ ok: boolean }>("/pc/goals/reorder", {
      method: "PATCH",
      body: JSON.stringify({ order }),
    }),
  stats: (id: string, period = "weekly") =>
    request<{
      goal: import("./types").Goal;
      chartData: import("./types").ChartPoint[];
      remainingDays: number;
      progress: number;
    }>(`/pc/goals/${id}/stats?period=${period}`),
  heatmap: (id: string, year?: number) =>
    request<Record<string, { hours: number; count: number }>>(
      `/pc/goals/${id}/heatmap${year ? `?year=${year}` : ""}`
    ),
  gallery: (id?: string) =>
    request<import("./types").GalleryItem[]>(
      id ? `/pc/goals/${id}/gallery` : "/pc/gallery"
    ),
};

// Daily Logs
export const logsApi = {
  list: (goalId: string) =>
    request<import("./types").DailyLog[]>(`/pc/goals/${goalId}/logs`),
  create: (goalId: string, body: Partial<import("./types").DailyLog>) =>
    request<import("./types").DailyLog>(`/pc/goals/${goalId}/logs`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (logId: string, body: Partial<import("./types").DailyLog>) =>
    request<import("./types").DailyLog>(`/pc/logs/${logId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (logId: string) =>
    request<void>(`/pc/logs/${logId}`, { method: "DELETE" }),
  today: () =>
    request<{
      logs: import("./types").DailyLog[];
      totalHours: number;
      totalTasks: number;
    }>("/pc/logs/today"),
};

// Profile
export const profileApi = {
  getMe: () =>
    request<{ user: import("./types").User; profile: import("./types").UserProfile }>(
      "/pc/profile"
    ),
  update: (body: Partial<import("./types").UserProfile & { name: string }>) =>
    request<{ user: import("./types").User; profile: import("./types").UserProfile }>(
      "/pc/profile",
      { method: "PATCH", body: JSON.stringify(body) }
    ),
  getPublic: (username: string) =>
    request<{
      user: { id: string; name: string };
      profile: import("./types").UserProfile;
      publicGoals: import("./types").Goal[];
      achievements: import("./types").Achievement[];
      heatmap: Record<string, unknown>;
      isFollowing: boolean;
      recentCheers: { message: string; authorName: string; createdAt: string }[];
    }>(`/pc/profile/${username}`),
  getPublicTimeline: (username: string) =>
    request<import("./types").TimelineItem[]>(`/pc/public/${username}/timeline`),
  getPublicGoal: (username: string, goalId: string) =>
    request<{
      goal: import("./types").Goal;
      user: { id: string; name: string; username: string };
      profile: import("./types").UserProfile;
      logs: import("./types").DailyLog[];
      chartData: import("./types").ChartPoint[];
      progress: number;
      remainingDays: number;
      heatmap: Record<string, unknown>;
      isFollowing: boolean;
    }>(`/pc/public/${username}/goals/${goalId}`),
};

// Upload
export const uploadApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<import("./types").EvidenceFile>("/pc/upload", {
      method: "POST",
      body: form,
    });
  },
};

// Achievements
export const achievementsApi = {
  list: () =>
    request<{ unlocked: import("./types").Achievement[]; all: import("./types").Achievement[] }>(
      "/pc/achievements"
    ),
};

// Notifications
export const notificationsApi = {
  list: () => request<import("./types").PCNotification[]>("/pc/notifications"),
  markRead: (id: string) =>
    request<void>(`/pc/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () =>
    request<{ ok: boolean }>("/pc/notifications/read-all", { method: "POST" }),
};

// Social
export const socialApi = {
  follow: (userId: string) =>
    request<{ ok: boolean }>(`/pc/social/follow/${userId}`, { method: "POST" }),
  unfollow: (userId: string) =>
    request<void>(`/pc/social/follow/${userId}`, { method: "DELETE" }),
  like: (targetId: string, targetType: string) =>
    request<{ ok: boolean }>("/pc/social/like", {
      method: "POST",
      body: JSON.stringify({ targetId, targetType }),
    }),
  unlike: (targetId: string, targetType: string) =>
    request<void>("/pc/social/unlike", {
      method: "DELETE",
      body: JSON.stringify({ targetId, targetType }),
    }),
  comment: (targetId: string, targetType: string, content: string) =>
    request<import("./types").Comment>(
      "/pc/social/comment",
      {
        method: "POST",
        body: JSON.stringify({ targetId, targetType, content }),
      }
    ),
  listComments: (targetId: string, type = "log") =>
    request<import("./types").Comment[]>(
      `/pc/social/comments/${targetId}?type=${type}`
    ),
  getStats: (targetId: string, type = "log") =>
    request<{ likeCount: number; commentCount: number; isLiked: boolean }>(
      `/pc/social/stats/${targetId}?type=${type}`
    ),
  cheer: (targetId: string, message: string) =>
    request<{ id: string }>("/pc/social/cheer", {
      method: "POST",
      body: JSON.stringify({ targetId, message }),
    }),
  listCheers: (userId: string) =>
    request<import("./types").CheerItem[]>(`/pc/social/cheers/${userId}`),
};

// Search
export const searchApi = {
  search: (q: string) =>
    request<{
      goals: import("./types").Goal[];
      users: import("./types").UserProfile[];
    }>(`/pc/search?q=${encodeURIComponent(q)}`),
  suggested: () =>
    request<
      (import("./types").UserProfile & { name?: string })[]
    >("/pc/users/suggested"),
};

export { ApiError };
