import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  validateCreateTaskInput,
  validateUpdateTaskInput,
  createTask,
  getTaskById,
  getSubtasks,
  updateTask,
  deleteTask,
} from '../../src/services/taskService';

// Setup in-memory DB for service tests
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
    CREATE TABLE projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE project_members (
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
      project_id INTEGER,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE TABLE labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#6366f1'
    );
    CREATE TABLE task_labels (
      task_id INTEGER NOT NULL,
      label_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, label_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
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
    CREATE TABLE task_assignees ( task_id INTEGER NOT NULL, user_id INTEGER NOT NULL, assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (task_id, user_id), FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE );
    CREATE TABLE activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  // Insert a test user
  db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run('testuser', 'test@test.com', 'hash', 'user');
  return db;
}

describe('Task Validation', () => {
  it('1. validateCreateTaskInput: empty title → error', () => {
    const errors = validateCreateTaskInput({ title: '' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('title');
  });

  it('2. validateCreateTaskInput: missing title → error', () => {
    const errors = validateCreateTaskInput({});
    expect(errors.some(e => e.field === 'title')).toBe(true);
  });

  it('3. validateCreateTaskInput: title too long → error', () => {
    const errors = validateCreateTaskInput({ title: 'a'.repeat(201) });
    expect(errors.some(e => e.field === 'title')).toBe(true);
  });

  it('4. validateCreateTaskInput: valid input → no errors', () => {
    const errors = validateCreateTaskInput({ title: 'Valid Task' });
    expect(errors.length).toBe(0);
  });

  it('5. validateCreateTaskInput: invalid status → error', () => {
    const errors = validateCreateTaskInput({ title: 'Task', status: 'invalid-status' as any });
    expect(errors.some(e => e.field === 'status')).toBe(true);
  });

  it('6. validateUpdateTaskInput: empty title → error', () => {
    const errors = validateUpdateTaskInput({ title: '' });
    expect(errors.some(e => e.field === 'title')).toBe(true);
  });

  it('7. validateUpdateTaskInput: valid status → no errors', () => {
    const errors = validateUpdateTaskInput({ status: 'done' });
    expect(errors.length).toBe(0);
  });

  it('8. validateCreateTaskInput: invalid priority → error', () => {
    const errors = validateCreateTaskInput({ title: 'Task', priority: 'invalid-priority' as any });
    expect(errors.some(e => e.field === 'priority')).toBe(true);
  });

  it('9. validateCreateTaskInput: valid priority → no errors', () => {
    const errors = validateCreateTaskInput({ title: 'Task', priority: 'high' });
    expect(errors.length).toBe(0);
  });

  it('10. validateCreateTaskInput: invalid due_date format → error', () => {
    const errors = validateCreateTaskInput({ title: 'Task', due_date: 'not-a-date' });
    expect(errors.some(e => e.field === 'due_date')).toBe(true);
  });

  it('11. validateUpdateTaskInput: invalid priority → error', () => {
    const errors = validateUpdateTaskInput({ priority: 'super' as any });
    expect(errors.some(e => e.field === 'priority')).toBe(true);
  });

  it('12. validateUpdateTaskInput: valid priority → no errors', () => {
    const errors = validateUpdateTaskInput({ priority: 'urgent' });
    expect(errors.length).toBe(0);
  });
});

describe('Task Service CRUD', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('13. createTask: creates task with correct fields', () => {
    const task = createTask(db, { title: 'Test Task', description: 'Desc' }, 1);
    expect(task.id).toBeDefined();
    expect(task.title).toBe('Test Task');
    expect(task.description).toBe('Desc');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.user_id).toBe(1);
  });

  it('14. createTask: creates task with priority and due_date', () => {
    const task = createTask(db, { title: 'Urgent Task', priority: 'urgent', due_date: '2026-04-01' }, 1);
    expect(task.priority).toBe('urgent');
    expect(task.due_date).toBe('2026-04-01');
  });

  it('15. getTaskById: returns null for non-existent id', () => {
    const task = getTaskById(db, 9999);
    expect(task).toBeNull();
  });

  it('16. getTaskById: returns task for valid id', () => {
    const created = createTask(db, { title: 'Find Me' }, 1);
    const found = getTaskById(db, created.id);
    expect(found).not.toBeNull();
    expect(found!.title).toBe('Find Me');
  });

  it('17. updateTask: returns null for non-existent task', () => {
    const result = updateTask(db, 9999, { title: 'New Title' });
    expect(result).toBeNull();
  });

  it('18. updateTask: updates title correctly', () => {
    const task = createTask(db, { title: 'Original' }, 1);
    const updated = updateTask(db, task.id, { title: 'Updated' });
    expect(updated!.title).toBe('Updated');
  });

  it('19. updateTask: updates priority correctly', () => {
    const task = createTask(db, { title: 'Task' }, 1);
    const updated = updateTask(db, task.id, { priority: 'high' });
    expect(updated!.priority).toBe('high');
  });

  it('20. deleteTask: returns false for non-existent task', () => {
    const result = deleteTask(db, 9999);
    expect(result).toBe(false);
  });

  it('21. deleteTask: deletes task and returns true', () => {
    const task = createTask(db, { title: 'To Delete' }, 1);
    const result = deleteTask(db, task.id);
    expect(result).toBe(true);
    expect(getTaskById(db, task.id)).toBeNull();
  });

  it('22. createTask: creates subtask with parent_id', () => {
    const parent = createTask(db, { title: 'Parent Task' }, 1);
    const child = createTask(db, { title: 'Child Task', parent_id: parent.id }, 1);
    expect(child.parent_id).toBe(parent.id);
  });

  it('23. getSubtasks: returns subtasks for parent', () => {
    const parent = createTask(db, { title: 'Parent' }, 1);
    createTask(db, { title: 'Sub 1', parent_id: parent.id }, 1);
    createTask(db, { title: 'Sub 2', parent_id: parent.id }, 1);
    const subs = getSubtasks(db, parent.id, 1);
    expect(subs.length).toBe(2);
  });

  it('24. createTask: creates with project_id', () => {
    db.prepare('INSERT INTO projects (name, user_id) VALUES (?, ?)').run('Test Proj', 1);
    const t = createTask(db, { title: 'Task in proj', project_id: 1 }, 1);
    expect(t.project_id).toBe(1);
  });
});
