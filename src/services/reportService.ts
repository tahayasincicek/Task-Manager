import Database from 'better-sqlite3';

export interface UserTaskStat {
  user_id: number;
  username: string;
  total: number;
  todo: number;
  in_progress: number;
  done: number;
  overdue: number;
}

export interface ProjectProgress {
  project_id: number;
  project_name: string;
  owner: string;
  total: number;
  done: number;
  completion_rate: number;
}

export interface OverdueTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_to: number | null;
  assigned_username: string | null;
  project_name: string | null;
}

export interface TeamSummary {
  totalTasks: number;
  totalDone: number;
  totalOverdue: number;
  completionRate: number;
  totalUsers: number;
  totalProjects: number;
}

export function getUserTaskStats(db: Database.Database): UserTaskStat[] {
  return db.prepare(`
    SELECT 
      u.id as user_id,
      u.username,
      COUNT(t.id) as total,
      COALESCE(SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END), 0) as todo,
      COALESCE(SUM(CASE WHEN t.status = 'in-progress' THEN 1 ELSE 0 END), 0) as in_progress,
      COALESCE(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END), 0) as done,
      COALESCE(SUM(CASE WHEN t.due_date < date('now') AND t.status != 'done' THEN 1 ELSE 0 END), 0) as overdue
    FROM users u
    LEFT JOIN task_assignees ta ON ta.user_id = u.id
    LEFT JOIN tasks t ON (ta.task_id = t.id OR (t.user_id = u.id AND NOT EXISTS (SELECT 1 FROM task_assignees WHERE task_id = t.id)))
    GROUP BY u.id
    ORDER BY total DESC
  `).all() as UserTaskStat[];
}

export function getProjectProgress(db: Database.Database): ProjectProgress[] {
  const rows = db.prepare(`
    SELECT 
      p.id as project_id,
      p.name as project_name,
      u.username as owner,
      COUNT(t.id) as total,
      COALESCE(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END), 0) as done
    FROM projects p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN tasks t ON t.project_id = p.id
    GROUP BY p.id
    ORDER BY total DESC
  `).all() as { project_id: number; project_name: string; owner: string; total: number; done: number }[];

  return rows.map(r => ({
    ...r,
    completion_rate: r.total > 0 ? Math.round((r.done / r.total) * 100) : 0,
  }));
}

export function getOverdueTasks(db: Database.Database): OverdueTask[] {
  return db.prepare(`
    SELECT 
      t.id,
      t.title,
      t.status,
      t.priority,
      t.due_date,
      t.assigned_to,
      GROUP_CONCAT(au.username, ', ') as assigned_username,
      p.name as project_name
    FROM tasks t
    LEFT JOIN task_assignees ta ON ta.task_id = t.id
    LEFT JOIN users au ON ta.user_id = au.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.due_date < date('now') AND t.status != 'done'
    GROUP BY t.id
    ORDER BY t.due_date ASC
  `).all() as OverdueTask[];
}

export function getTeamSummary(db: Database.Database): TeamSummary {
  const taskStats = db.prepare(`
    SELECT 
      COUNT(*) as totalTasks,
      COALESCE(SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END), 0) as totalDone,
      COALESCE(SUM(CASE WHEN due_date < date('now') AND status != 'done' THEN 1 ELSE 0 END), 0) as totalOverdue
    FROM tasks
  `).get() as { totalTasks: number; totalDone: number; totalOverdue: number };

  const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  const totalProjects = (db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number }).count;

  return {
    totalTasks: taskStats.totalTasks,
    totalDone: taskStats.totalDone,
    totalOverdue: taskStats.totalOverdue,
    completionRate: taskStats.totalTasks > 0 ? Math.round((taskStats.totalDone / taskStats.totalTasks) * 100) : 0,
    totalUsers,
    totalProjects,
  };
}
