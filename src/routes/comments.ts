import { Router, Request, Response } from 'express';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../types';
import { createComment, getCommentsByTask, deleteComment } from '../services/commentService';
import { logActivity } from '../services/activityService';

const router = Router();

router.use(requireAuth);

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

function sendAppError(res: Response, err: unknown): void {
  const appErr = err as AppError;
  res.status(appErr.statusCode || 500).json({ errors: appErr.errors || [{ message: appErr.message }] });
}

// GET /api/tasks/:taskId/comments
router.get('/:taskId/comments', (req: Request, res: Response): void => {
  const taskId = parseId(req.params.taskId);
  if (taskId === null) { res.status(400).json({ error: 'Invalid task id' }); return; }
  res.status(200).json(getCommentsByTask(db, taskId));
});

// POST /api/tasks/:taskId/comments
router.post('/:taskId/comments', (req: Request, res: Response): void => {
  const taskId = parseId(req.params.taskId);
  if (taskId === null) { res.status(400).json({ error: 'Invalid task id' }); return; }
  try {
    const comment = createComment(db, taskId, req.session.userId!, req.body);
    logActivity(db, taskId, req.session.userId!, 'commented', req.body.content?.substring(0, 100));
    res.status(201).json(comment);
  } catch (err) {
    sendAppError(res, err);
  }
});

// DELETE /api/tasks/:taskId/comments/:id
router.delete('/:taskId/comments/:id', (req: Request, res: Response): void => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid comment id' }); return; }
  if (!deleteComment(db, id)) { res.status(404).json({ error: 'Comment not found' }); return; }
  res.status(204).send();
});

export default router;
