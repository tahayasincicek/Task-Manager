import { Task, TaskStatus, TaskPriority, CreateTaskInput, UpdateTaskInput, ValidationError, AppError } from '../types';
import Database from 'better-sqlite3';

const VALID_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done'];
const VALID_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

function throwIfInvalid(errors: ValidationError[]): void {
  if (errors.length === 0) return;
  const err = new Error(errors[0].message) as AppError;
  err.statusCode = 400;
  err.errors = errors;
  throw err;
}

export function validateCreateTaskInput(input: Partial<CreateTaskInput>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.title || input.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (input.title.trim().length > 200) {
    errors.push({ field: 'title', message: 'Title must be at most 200 characters' });
  }

  if (input.status && !VALID_STATUSES.includes(input.status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  if (input.priority && !VALID_PRIORITIES.includes(input.priority)) {
    errors.push({ field: 'priority', message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  if (input.due_date && isNaN(Date.parse(input.due_date))) {
    errors.push({ field: 'due_date', message: 'Invalid date format for due_date' });
  }

  if (input.assignee_ids && !Array.isArray(input.assignee_ids)) {
    errors.push({ field: 'assignee_ids', message: 'Assignees must be an array of IDs' });
  }

  return errors;
}

export function validateUpdateTaskInput(input: Partial<UpdateTaskInput>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.title !== undefined) {
    if (input.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title cannot be empty' });
    } else if (input.title.trim().length > 200) {
      errors.push({ field: 'title', message: 'Title must be at most 200 characters' });
    }
  }

  if (input.status !== undefined && !VALID_STATUSES.includes(input.status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  if (input.priority !== undefined && !VALID_PRIORITIES.includes(input.priority)) {
    errors.push({ field: 'priority', message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  if (input.due_date !== undefined && input.due_date !== null && isNaN(Date.parse(input.due_date))) {
    errors.push({ field: 'due_date', message: 'Invalid date format for due_date' });
  }

  if (input.assignee_ids !== undefined && input.assignee_ids !== null && !Array.isArray(input.assignee_ids)) {
    errors.push({ field: 'assignee_ids', message: 'Assignees must be an array of IDs' });
  }

  return errors;
}

type TaskRow = Omit<Task, 'assigned_users'> & { assigned_users_json?: string };

function parseTaskRow(row: TaskRow | undefined): Task {
  if (!row) return row as unknown as Task;
  const { assigned_users_json, ...rest } = row;
  const assigned_users = assigned_users_json ? JSON.parse(assigned_users_json) as { id: number; username: string }[] : [];
  return { ...rest, assigned_users } as Task;
}

const selectTasksClause = `
  SELECT t.*, 
    COALESCE(
      (SELECT json_group_array(json_object('id', u.id, 'username', u.username))
       FROM task_assignees ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id = t.id), '[]'
    ) as assigned_users_json
`;

export function createTask(db: Database.Database, input: CreateTaskInput, userId: number): Task {
  throwIfInvalid(validateCreateTaskInput(input));

  let newId: number | bigint = 0;

  db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO tasks (title, description, status, priority, due_date, parent_id, project_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      input.title.trim(),
      input.description?.trim() ?? null,
      input.status ?? 'todo',
      input.priority ?? 'medium',
      input.due_date ?? null,
      input.parent_id ?? null,
      input.project_id ?? null,
      userId
    );

    newId = result.lastInsertRowid;

    if (input.assignee_ids && input.assignee_ids.length > 0) {
      const stmt = db.prepare('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)');
      for (const assigneeId of input.assignee_ids) {
        stmt.run(newId, assigneeId);
      }
    }
  })();

  return getTaskById(db, Number(newId))!;
}

export function getTaskById(db: Database.Database, id: number): Task | null {
  const row = db.prepare(`${selectTasksClause} FROM tasks t WHERE t.id = ?`).get(id) as TaskRow | undefined;
  return row ? parseTaskRow(row) : null;
}

export function getAllTasks(db: Database.Database, userId: number, isAdmin: boolean = false): Task[] {
  let rows: TaskRow[];
  if (isAdmin) {
    rows = db.prepare(`${selectTasksClause} FROM tasks t ORDER BY t.created_at DESC`).all() as TaskRow[];
  } else {
    rows = db.prepare(`
      ${selectTasksClause} FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN task_assignees ta ON ta.task_id = t.id
      WHERE t.user_id = ? 
         OR p.user_id = ? 
         OR pm.user_id = ?
         OR ta.user_id = ?
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `).all(userId, userId, userId, userId) as TaskRow[];
  }
  return rows.map(parseTaskRow);
}

export function getSubtasks(db: Database.Database, parentId: number, userId: number, isAdmin: boolean = false): Task[] {
  let rows: TaskRow[];
  if (isAdmin) {
    rows = db.prepare(`${selectTasksClause} FROM tasks t WHERE t.parent_id = ? ORDER BY t.created_at ASC`).all(parentId) as TaskRow[];
  } else {
    rows = db.prepare(`
      ${selectTasksClause} FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN task_assignees ta ON ta.task_id = t.id
      WHERE t.parent_id = ? AND (
        t.user_id = ? OR p.user_id = ? OR pm.user_id = ? OR ta.user_id = ?
      )
      GROUP BY t.id
      ORDER BY t.created_at ASC
    `).all(parentId, userId, userId, userId, userId) as TaskRow[];
  }
  return rows.map(parseTaskRow);
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  search?: string;
  due_before?: string;
  label?: string;
  project_id?: number | null;
  assigned_to?: number; // Filtering by a specific assignee ID
}

export function getFilteredTasks(db: Database.Database, filters: TaskFilters, userId: number, isAdmin: boolean = false): Task[] {
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (filters.status) { conditions.push('t.status = ?'); values.push(filters.status); }
  if (filters.priority) { conditions.push('t.priority = ?'); values.push(filters.priority); }
  
  if (filters.assigned_to) { 
    conditions.push('EXISTS (SELECT 1 FROM task_assignees ta_flt WHERE ta_flt.task_id = t.id AND ta_flt.user_id = ?)'); 
    values.push(filters.assigned_to); 
  }
  
  if (filters.project_id !== undefined) {
    if (filters.project_id === null) {
      conditions.push('t.project_id IS NULL');
    } else {
      conditions.push('t.project_id = ?');
      values.push(filters.project_id);
    }
  }
  if (filters.due_before) { conditions.push('t.due_date <= ?'); values.push(filters.due_before); }
  if (filters.search) {
    conditions.push('(t.title LIKE ? OR t.description LIKE ?)');
    values.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.label) {
    conditions.push('EXISTS (SELECT 1 FROM task_labels tl JOIN labels l ON tl.label_id = l.id WHERE tl.task_id = t.id AND l.name = ?)');
    values.push(filters.label);
  }

  if (!isAdmin) {
    conditions.push(`(t.user_id = ? OR p.user_id = ? OR pm.user_id = ? OR ta_auth.user_id = ?)`);
    values.push(userId, userId, userId, userId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const fromClause = !isAdmin 
    ? `tasks t 
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN task_assignees ta_auth ON ta_auth.task_id = t.id`
    : `tasks t`;

  const rows = db.prepare(`
    ${selectTasksClause} FROM ${fromClause}
    ${where}
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).all(...values) as TaskRow[];

  return rows.map(parseTaskRow);
}

export function updateTask(db: Database.Database, id: number, input: UpdateTaskInput): Task | null {
  throwIfInvalid(validateUpdateTaskInput(input));

  db.transaction(() => {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (input.title !== undefined) { updates.push('title = ?'); values.push(input.title.trim()); }
    if (input.description !== undefined) { updates.push('description = ?'); values.push(input.description.trim()); }
    if (input.status !== undefined) { updates.push('status = ?'); values.push(input.status); }
    if (input.priority !== undefined) { updates.push('priority = ?'); values.push(input.priority); }
    if (input.due_date !== undefined) { updates.push('due_date = ?'); values.push(input.due_date); }
    if (input.project_id !== undefined) { updates.push('project_id = ?'); values.push(input.project_id); }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    if (input.assignee_ids !== undefined) {
      db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(id);
      if (input.assignee_ids !== null && input.assignee_ids.length > 0) {
        const stmt = db.prepare('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)');
        for (const assigneeId of input.assignee_ids) {
          stmt.run(id, assigneeId);
        }
      }
    }
  })();

  return getTaskById(db, id);
}

export function deleteTask(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}
