import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  validateLabelInput,
  createLabel,
  getAllLabels,
  deleteLabel,
  addLabelToTask,
  removeLabelFromTask,
  getLabelsForTask,
} from '../../src/services/labelService';

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
  `);
  db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run('testuser', 'test@test.com', 'hash', 'user');
  db.prepare('INSERT INTO tasks (title, user_id) VALUES (?, ?)').run('Test Task', 1);
  return db;
}

describe('Label Validation', () => {
  it('1. validateLabelInput: empty name → error', () => {
    const errors = validateLabelInput({ name: '' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('name');
  });

  it('2. validateLabelInput: missing name → error', () => {
    const errors = validateLabelInput({});
    expect(errors.some(e => e.field === 'name')).toBe(true);
  });

  it('3. validateLabelInput: valid input → no errors', () => {
    const errors = validateLabelInput({ name: 'bug' });
    expect(errors.length).toBe(0);
  });
});

describe('Label Service CRUD', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('4. createLabel: creates with name and color', () => {
    const label = createLabel(db, { name: 'feature', color: '#10b981' });
    expect(label.id).toBeDefined();
    expect(label.name).toBe('feature');
    expect(label.color).toBe('#10b981');
  });

  it('5. getAllLabels: returns all labels', () => {
    createLabel(db, { name: 'bug' });
    createLabel(db, { name: 'feature' });
    const labels = getAllLabels(db);
    expect(labels.length).toBe(2);
  });

  it('6. deleteLabel: deletes and returns true', () => {
    const label = createLabel(db, { name: 'toDelete' });
    const result = deleteLabel(db, label.id);
    expect(result).toBe(true);
    expect(getAllLabels(db).length).toBe(0);
  });

  it('7. addLabelToTask: links label to task', () => {
    const label = createLabel(db, { name: 'linked' });
    const result = addLabelToTask(db, 1, label.id);
    expect(result).toBe(true);
  });

  it('8. getLabelsForTask: returns labels for task', () => {
    const label1 = createLabel(db, { name: 'bug' });
    const label2 = createLabel(db, { name: 'feature' });
    addLabelToTask(db, 1, label1.id);
    addLabelToTask(db, 1, label2.id);
    const labels = getLabelsForTask(db, 1);
    expect(labels.length).toBe(2);
  });

  it('9. removeLabelFromTask: removes link', () => {
    const label = createLabel(db, { name: 'temp' });
    addLabelToTask(db, 1, label.id);
    const result = removeLabelFromTask(db, 1, label.id);
    expect(result).toBe(true);
    expect(getLabelsForTask(db, 1).length).toBe(0);
  });
});
