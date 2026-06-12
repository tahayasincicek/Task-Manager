import { Router, Request, Response } from 'express';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../types';
import { createLabel, getAllLabels, deleteLabel } from '../services/labelService';

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

// GET /api/labels
router.get('/', (_req: Request, res: Response): void => {
  res.status(200).json(getAllLabels(db));
});

// POST /api/labels
router.post('/', (req: Request, res: Response): void => {
  try {
    const label = createLabel(db, req.body);
    res.status(201).json(label);
  } catch (err) {
    sendAppError(res, err);
  }
});

// DELETE /api/labels/:id
router.delete('/:id', (req: Request, res: Response): void => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid id' }); return; }
  if (!deleteLabel(db, id)) { res.status(404).json({ error: 'Label not found' }); return; }
  res.status(204).send();
});

export default router;
