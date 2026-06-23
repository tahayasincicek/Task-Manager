import { Comment, CreateCommentInput, ValidationError, AppError } from '../types';
import Database from 'better-sqlite3';

function throwIfInvalid(errors: ValidationError[]): void {
  if (errors.length === 0) return;
  const err = new Error(errors[0].message) as AppError;
  err.statusCode = 400;
  err.errors = errors;
  throw err;
}

export function validateCommentInput(input: Partial<CreateCommentInput>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.content || input.content.trim().length === 0) {
    errors.push({ field: 'content', message: 'Comment content is required' });
  } else if (input.content.trim().length > 1000) {
    errors.push({ field: 'content', message: 'Comment must be at most 1000 characters' });
  }

  return errors;
}

export function createComment(db: Database.Database, taskId: number, userId: number, input: CreateCommentInput): Comment {
  throwIfInvalid(validateCommentInput(input));

  const result = db.prepare(
    'INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)'
  ).run(taskId, userId, input.content.trim());

  return db.prepare(
    `SELECT c.*, u.username FROM comments c 
     JOIN users u ON c.user_id = u.id 
     WHERE c.id = ?`
  ).get(result.lastInsertRowid) as Comment;
}

export function getCommentsByTask(db: Database.Database, taskId: number): Comment[] {
  return db.prepare(
    `SELECT c.*, u.username FROM comments c 
     JOIN users u ON c.user_id = u.id 
     WHERE c.task_id = ? 
     ORDER BY c.created_at ASC`
  ).all(taskId) as Comment[];
}

export function deleteComment(db: Database.Database, commentId: number): boolean {
  const result = db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
  return result.changes > 0;
}
