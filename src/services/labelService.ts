import { Label, CreateLabelInput, ValidationError, AppError } from '../types';
import Database from 'better-sqlite3';

function throwIfInvalid(errors: ValidationError[]): void {
  if (errors.length === 0) return;
  const err = new Error(errors[0].message) as AppError;
  err.statusCode = 400;
  err.errors = errors;
  throw err;
}

export function validateLabelInput(input: Partial<CreateLabelInput>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.name || input.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Label name is required' });
  } else if (input.name.trim().length > 50) {
    errors.push({ field: 'name', message: 'Label name must be at most 50 characters' });
  }

  return errors;
}

export function createLabel(db: Database.Database, input: CreateLabelInput): Label {
  throwIfInvalid(validateLabelInput(input));

  const result = db.prepare(
    'INSERT INTO labels (name, color) VALUES (?, ?)'
  ).run(input.name.trim(), input.color ?? '#6366f1');

  return db.prepare('SELECT * FROM labels WHERE id = ?').get(result.lastInsertRowid) as Label;
}

export function getAllLabels(db: Database.Database): Label[] {
  return db.prepare('SELECT * FROM labels ORDER BY name ASC').all() as Label[];
}

export function deleteLabel(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM labels WHERE id = ?').run(id);
  return result.changes > 0;
}

export function addLabelToTask(db: Database.Database, taskId: number, labelId: number): boolean {
  try {
    db.prepare('INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)').run(taskId, labelId);
    return true;
  } catch {
    return false;
  }
}

export function removeLabelFromTask(db: Database.Database, taskId: number, labelId: number): boolean {
  const result = db.prepare('DELETE FROM task_labels WHERE task_id = ? AND label_id = ?').run(taskId, labelId);
  return result.changes > 0;
}

export function getLabelsForTask(db: Database.Database, taskId: number): Label[] {
  return db.prepare(
    `SELECT l.* FROM labels l 
     JOIN task_labels tl ON l.id = tl.label_id 
     WHERE tl.task_id = ? 
     ORDER BY l.name ASC`
  ).all(taskId) as Label[];
}
