import { ActivityLog } from '../types';
import Database from 'better-sqlite3';

export function logActivity(
  db: Database.Database,
  taskId: number,
  userId: number,
  action: string,
  detail: string | null = null
): ActivityLog {
  const result = db.prepare(
    'INSERT INTO activity_log (task_id, user_id, action, detail) VALUES (?, ?, ?, ?)'
  ).run(taskId, userId, action, detail);

  return db.prepare(
    `SELECT a.*, u.username FROM activity_log a 
     JOIN users u ON a.user_id = u.id 
     WHERE a.id = ?`
  ).get(result.lastInsertRowid) as ActivityLog;
}

export function getActivitiesByTask(db: Database.Database, taskId: number): ActivityLog[] {
  return db.prepare(
    `SELECT a.*, u.username FROM activity_log a 
     JOIN users u ON a.user_id = u.id 
     WHERE a.task_id = ? 
     ORDER BY a.created_at DESC`
  ).all(taskId) as ActivityLog[];
}
