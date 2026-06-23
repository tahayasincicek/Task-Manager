export type UserRole = 'admin' | 'user';
export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  created_at: string;
}

export interface ProjectMember {
  project_id: number;
  user_id: number;
  added_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  parent_id: number | null;
  assigned_users?: { id: number; username: string }[];
  project_id: number | null;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: number;
  name: string;
  color: string;
}

export interface Comment {
  id: number;
  task_id: number;
  user_id: number;
  username?: string;
  content: string;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  task_id: number;
  user_id: number;
  username?: string;
  action: string;
  detail: string | null;
  created_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  parent_id?: number;
  project_id?: number;
  assignee_ids?: number[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  assignee_ids?: number[];
  project_id?: number | null;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export interface CreateCommentInput {
  content: string;
}

export interface CreateLabelInput {
  name: string;
  color?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface AppError extends Error {
  statusCode: number;
  errors: ValidationError[];
}

declare module 'express-session' {
  interface SessionData {
    userId: number;
    role: UserRole;
    username: string;
  }
}
