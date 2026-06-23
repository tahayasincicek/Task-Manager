import { Router, Request, Response } from 'express';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import { getUserTaskStats, getProjectProgress, getOverdueTasks, getTeamSummary } from '../services/reportService';

const router = Router();

router.use(requireAuth);

// GET /api/reports/summary
router.get('/summary', (_req: Request, res: Response): void => {
  try {
    const userStats = getUserTaskStats(db);
    const projectProgress = getProjectProgress(db);
    const overdueTasks = getOverdueTasks(db);
    const teamSummary = getTeamSummary(db);

    res.status(200).json({
      userStats,
      projectProgress,
      overdueTasks,
      teamSummary,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
