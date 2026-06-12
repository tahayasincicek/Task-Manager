import { Router, Request, Response } from 'express';
import db from '../db';
import { requireAdmin } from '../middleware/auth';

interface CountRow { count: number; }
interface StatusCountRow { status: string; count: number; }
interface PriorityCountRow { priority: string; count: number; }

const router = Router();

router.use(requireAdmin);

router.get('/users', (_req: Request, res: Response): void => {
  res.status(200).json(db.prepare('SELECT id, username, email, role, created_at FROM users').all());
});

router.get('/stats', (_req: Request, res: Response): void => {
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as CountRow).count;
  const statusCounts = db.prepare('SELECT status, COUNT(*) as count FROM tasks GROUP BY status').all() as StatusCountRow[];
  const priorityCounts = db.prepare('SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority').all() as PriorityCountRow[];
  const taskCount = statusCounts.reduce((sum, row) => sum + row.count, 0);
  const labelCount = (db.prepare('SELECT COUNT(*) as count FROM labels').get() as CountRow).count;
  const commentCount = (db.prepare('SELECT COUNT(*) as count FROM comments').get() as CountRow).count;
  const overdueCount = (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE due_date < date('now') AND status != 'done'").get() as CountRow).count;
  res.status(200).json({ userCount, taskCount, statusCounts, priorityCounts, labelCount, commentCount, overdueCount });
});

export default router;
