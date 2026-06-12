import { Router, Request, Response } from 'express';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import { AppError, Task, UpdateTaskInput } from '../types';
import { createTask, getAllTasks, getTaskById, getSubtasks, getFilteredTasks, updateTask, deleteTask } from '../services/taskService';
import { getLabelsForTask, addLabelToTask, removeLabelFromTask } from '../services/labelService';
import { logActivity, getActivitiesByTask } from '../services/activityService';

const router = Router();

router.use(requireAuth);

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

function sendAppError(res: Response, err: unknown): void {
  const appErr = err as AppError;
  res.status(appErr.statusCode ?? 500).json({ errors: appErr.errors ?? [{ message: appErr.message }] });
}

function parseProjectIdFilter(raw: unknown): number | null | undefined {
  if (raw === 'null') return null;
  if (raw === undefined) return undefined;
  return parseInt(raw as string, 10);
}

router.get('/', (req, res): void => {
  const { status, priority, assigned_to, project_id, search, due_before, label } = req.query;
  const isAdmin = req.session.role === 'admin';

  const hasFilters = status || priority || assigned_to || project_id !== undefined || search || due_before || label;

  if (hasFilters) {
    const tasks = getFilteredTasks(db, {
      status: status as string,
      priority: priority as string,
      assigned_to: assigned_to ? parseInt(assigned_to as string, 10) : undefined,
      project_id: parseProjectIdFilter(project_id),
      search: search as string,
      due_before: due_before as string,
      label: label as string,
    }, req.session.userId!, isAdmin);
    res.status(200).json(tasks);
  } else {
    res.status(200).json(getAllTasks(db, req.session.userId!, isAdmin));
  }
});

router.post('/', (req: Request, res: Response): void => {
  try {
    const task = createTask(db, req.body, req.session.userId!);
    logActivity(db, task.id, req.session.userId!, 'created', `Task created: ${task.title}`);
    res.status(201).json(task);
  } catch (err) {
    sendAppError(res, err);
  }
});

router.get('/:id', (req, res): void => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid id' }); return; }

  const isAdmin = req.session.role === 'admin';
  const task = db.prepare(`
    SELECT t.* FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN project_members pm ON p.id = pm.project_id
    WHERE t.id = ? AND (? OR t.user_id = ? OR p.user_id = ? OR pm.user_id = ?)
    GROUP BY t.id
  `).get(id, isAdmin ? 1 : 0, req.session.userId, req.session.userId, req.session.userId);

  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
  res.status(200).json(task);
});

router.get('/:id/subtasks', (req, res): void => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid id' }); return; }
  const isAdmin = req.session.role === 'admin';
  res.status(200).json(getSubtasks(db, id, req.session.userId!, isAdmin));
});

router.get('/:id/labels', (req: Request, res: Response): void => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid id' }); return; }
  res.status(200).json(getLabelsForTask(db, id));
});

// POST /api/tasks/:id/labels — add label to task
router.post('/:id/labels', (req: Request, res: Response): void => {
  const taskId = parseId(req.params.id);
  if (taskId === null) { res.status(400).json({ error: 'Invalid task id' }); return; }
  const { label_id } = req.body;
  if (!label_id) { res.status(400).json({ error: 'label_id is required' }); return; }
  const success = addLabelToTask(db, taskId, label_id);
  if (!success) { res.status(409).json({ error: 'Label already attached or not found' }); return; }
  res.status(200).json(getLabelsForTask(db, taskId));
});

// DELETE /api/tasks/:id/labels/:labelId — remove label from task
router.delete('/:id/labels/:labelId', (req: Request, res: Response): void => {
  const taskId = parseId(req.params.id);
  const labelId = parseId(req.params.labelId);
  if (taskId === null || labelId === null) { res.status(400).json({ error: 'Invalid id' }); return; }
  removeLabelFromTask(db, taskId, labelId);
  res.status(200).json(getLabelsForTask(db, taskId));
});

router.get('/:id/activities', (req: Request, res: Response): void => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid id' }); return; }
  res.status(200).json(getActivitiesByTask(db, id));
});

function buildAssigneeIdsKey(ids: ReadonlyArray<number> | undefined): string {
  if (!ids) return '';
  return [...ids].sort((a, b) => a - b).join(',');
}

function describePatchChanges(oldTask: Task, patch: UpdateTaskInput): string[] {
  const changes: string[] = [];
  if (patch.title && patch.title !== oldTask.title) {
    changes.push('Title changed');
  }
  if (patch.status && patch.status !== oldTask.status) {
    changes.push(`Status: ${oldTask.status} -> ${patch.status}`);
  }
  if (patch.priority && patch.priority !== oldTask.priority) {
    changes.push(`Priority: ${oldTask.priority} -> ${patch.priority}`);
  }
  if (patch.due_date !== undefined && patch.due_date !== oldTask.due_date) {
    changes.push('Due date updated');
  }
  if (patch.assignee_ids !== undefined) {
    const oldKey = buildAssigneeIdsKey(oldTask.assigned_users?.map(u => u.id));
    const newKey = buildAssigneeIdsKey(patch.assignee_ids);
    if (oldKey !== newKey) changes.push('Assignees changed');
  }
  return changes;
}

router.patch('/:id', (req: Request, res: Response): void => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid id' }); return; }
  try {
    const oldTask = getTaskById(db, id);
    const task = updateTask(db, id, req.body);
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

    if (oldTask) {
      const changes = describePatchChanges(oldTask, req.body as UpdateTaskInput);
      if (changes.length > 0) {
        logActivity(db, id, req.session.userId!, 'updated', changes.join('; '));
      }
    }

    res.status(200).json(task);
  } catch (err) {
    sendAppError(res, err);
  }
});

router.delete('/:id', (req: Request, res: Response): void => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid id' }); return; }
  if (!deleteTask(db, id)) { res.status(404).json({ error: 'Task not found' }); return; }
  res.status(204).send();
});

export default router;
