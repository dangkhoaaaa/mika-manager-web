export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string;
  deployUrl: string;
  apiKey: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardColumn {
  id: string;
  projectId: string;
  key: string;
  label: string;
  order: number;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: string;
  order: number;
  priority: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BugReport {
  id: string;
  projectId: string;
  title: string;
  description: string;
  reporterName: string;
  reporterEmail: string;
  pageUrl: string;
  severity: string;
  status: string;
  createdAt: string;
}

export interface FeatureRequest {
  id: string;
  projectId: string;
  title: string;
  description: string;
  reporterName: string;
  reporterEmail: string;
  status: string;
  votes: number;
  createdAt: string;
}

export interface VersionRelease {
  id: string;
  projectId: string;
  version: string;
  title: string;
  summary: string;
  features: string[];
  fixes: string[];
  breaking: string[];
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
}

