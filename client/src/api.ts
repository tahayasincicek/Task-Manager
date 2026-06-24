const isProd = import.meta.env.PROD;
const envUrl = import.meta.env.VITE_API_URL || '';
// In production, force relative path to use vercel.json proxy and avoid Safari third-party cookie blocking (ITP)
const BASE = isProd ? '/api' : (envUrl.endsWith('/api') ? envUrl : (envUrl ? `${envUrl}/api` : '/api'));

export class ApiError extends Error {
  status: number;
  body: { error?: string; errors?: { message: string }[] } & Record<string, unknown>;

  constructor(status: number, body: ApiError['body']) {
    super(body?.error ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as ApiError['body']));
    throw new ApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  projects: {
    list: () => req<import('./types').Project[]>('/projects'),
    create: (name: string, description?: string) =>
      req<import('./types').Project>('/projects', { method: 'POST', body: JSON.stringify({ name, description }) }),
    update: (id: number, name?: string, description?: string) =>
      req<import('./types').Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ name, description }) }),
    delete: (id: number) => req<void>(`/projects/${id}`, { method: 'DELETE' }),
    members: (id: number) => req<{ id: number; username: string; email: string }[]>(`/projects/${id}/members`),
    addMember: (id: number, userId: number) => req<void>(`/projects/${id}/members`, { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
    removeMember: (id: number, userId: number) => req<void>(`/projects/${id}/members/${userId}`, { method: 'DELETE' }),
  },
  auth: {
    me: () => req<{ userId: number; role: 'admin' | 'user'; username: string }>('/auth/me'),
    login: (username: string, password: string) =>
      req<{ user: { id: number; username: string; role: string } }>('/auth/login', {
        method: 'POST', body: JSON.stringify({ username, password }),
      }),
    register: (username: string, email: string, password: string) =>
      req<{ user: { id: number; username: string } }>('/auth/register', {
        method: 'POST', body: JSON.stringify({ username, email, password }),
      }),
    logout: () => req<void>('/auth/logout', { method: 'POST' }),
    users: () => req<{ id: number; username: string }[]>('/auth/users'),
  },
  tasks: {
    list: (filters?: Record<string, string>) => {
      const params = filters ? '?' + new URLSearchParams(filters).toString() : '';
      return req<import('./types').Task[]>(`/tasks${params}`);
    },
    create: (data: { title: string; description?: string; status?: string; priority?: string; due_date?: string; parent_id?: number; project_id?: number; assignee_ids?: number[] }) =>
      req<import('./types').Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { title?: string; description?: string; status?: string; priority?: string; due_date?: string | null; project_id?: number | null; assignee_ids?: number[] | null }) =>
      req<import('./types').Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) => req<void>(`/tasks/${id}`, { method: 'DELETE' }),
    subtasks: (id: number) => req<import('./types').Task[]>(`/tasks/${id}/subtasks`),
    labels: (id: number) => req<import('./types').Label[]>(`/tasks/${id}/labels`),
    activities: (id: number) => req<import('./types').ActivityLog[]>(`/tasks/${id}/activities`),
  },
  comments: {
    list: (taskId: number) => req<import('./types').Comment[]>(`/tasks/${taskId}/comments`),
    create: (taskId: number, content: string) =>
      req<import('./types').Comment>(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
    delete: (taskId: number, commentId: number) => req<void>(`/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' }),
  },
  labels: {
    list: () => req<import('./types').Label[]>('/labels'),
    create: (name: string, color: string) =>
      req<import('./types').Label>('/labels', { method: 'POST', body: JSON.stringify({ name, color }) }),
    delete: (id: number) => req<void>(`/labels/${id}`, { method: 'DELETE' }),
    addToTask: (taskId: number, labelId: number) =>
      req<import('./types').Label[]>(`/tasks/${taskId}/labels`, { method: 'POST', body: JSON.stringify({ label_id: labelId }) }),
    removeFromTask: (taskId: number, labelId: number) =>
      req<import('./types').Label[]>(`/tasks/${taskId}/labels/${labelId}`, { method: 'DELETE' }),
  },
  admin: {
    users: () => req<import('./types').User[]>('/admin/users'),
    stats: () => req<{ userCount: number; taskCount: number; statusCounts: { status: string; count: number }[]; priorityCounts: { priority: string; count: number }[]; labelCount: number; commentCount: number; overdueCount: number }>('/admin/stats'),
  },
  reports: {
    summary: () => req<{
      userStats: { user_id: number; username: string; total: number; todo: number; in_progress: number; done: number; overdue: number }[];
      projectProgress: { project_id: number; project_name: string; owner: string; total: number; done: number; completion_rate: number }[];
      overdueTasks: { id: number; title: string; status: string; priority: string; due_date: string; assigned_username: string | null; project_name: string | null }[];
      teamSummary: { totalTasks: number; totalDone: number; totalOverdue: number; completionRate: number; totalUsers: number; totalProjects: number };
    }>('/reports/summary'),
  },
};
