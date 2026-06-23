export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  created_at: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'todo' | 'in-progress' | 'done';
  priority: TaskPriority;
  due_date: string | null;
  parent_id: number | null;
  project_id: number | null;
  assigned_users?: { id: number; username: string }[];
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
  username: string;
  content: string;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  task_id: number;
  user_id: number;
  username: string;
  action: string;
  detail: string | null;
  created_at: string;
}

export interface AuthState {
  user: { userId: number; role: 'admin' | 'user'; username: string } | null;
  loading: boolean;
}
