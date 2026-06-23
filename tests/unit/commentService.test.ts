import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  validateCommentInput,
  createComment,
  getCommentsByTask,
  deleteComment,
} from '../../src/services/commentService';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      parent_id INTEGER,
      assigned_to INTEGER,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run('testuser', 'test@test.com', 'hash', 'user');
  db.prepare('INSERT INTO tasks (title, user_id) VALUES (?, ?)').run('Test Task', 1);
  return db;
}

describe('Comment Validation', () => {
  it('1. validateCommentInput: empty content → error', () => {
    const errors = validateCommentInput({ content: '' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('content');
  });

  it('2. validateCommentInput: missing content → error', () => {
    const errors = validateCommentInput({});
    expect(errors.some(e => e.field === 'content')).toBe(true);
  });

  it('3. validateCommentInput: valid content → no errors', () => {
    const errors = validateCommentInput({ content: 'This is a valid comment' });
    expect(errors.length).toBe(0);
  });
});

describe('Comment Service CRUD', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('4. createComment: creates comment with correct fields', () => {
    const comment = createComment(db, 1, 1, { content: 'My comment' });
    expect(comment.id).toBeDefined();
    expect(comment.content).toBe('My comment');
    expect(comment.task_id).toBe(1);
    expect(comment.user_id).toBe(1);
    expect(comment.username).toBe('testuser');
  });

  it('5. getCommentsByTask: returns comments for task', () => {
    createComment(db, 1, 1, { content: 'Comment 1' });
    createComment(db, 1, 1, { content: 'Comment 2' });
    const comments = getCommentsByTask(db, 1);
    expect(comments.length).toBe(2);
  });

  it('6. getCommentsByTask: returns empty for no comments', () => {
    const comments = getCommentsByTask(db, 1);
    expect(comments.length).toBe(0);
  });

  it('7. deleteComment: deletes and returns true', () => {
    const comment = createComment(db, 1, 1, { content: 'To delete' });
    const result = deleteComment(db, comment.id);
    expect(result).toBe(true);
  });

  it('8. deleteComment: returns false for non-existent', () => {
    const result = deleteComment(db, 9999);
    expect(result).toBe(false);
  });
});
