import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  getUserTaskStats,
  getProjectProgress,
  getOverdueTasks,
  getTeamSummary,
} from '../../src/services/reportService';

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
  // Insert test users
  db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run('user1', 'user1@test.com', 'hash', 'user');
  db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run('user2', 'user2@test.com', 'hash', 'user');
  return db;
}

describe('Report Service', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('1. getUserTaskStats: returns stats per user', () => {
    // user1 has 2 tasks (1 done, 1 todo), user2 has 1 task (in-progress)
    db.prepare('INSERT INTO tasks (title, status, user_id) VALUES (?, ?, ?)').run('Task A', 'done', 1);
    db.prepare('INSERT INTO tasks (title, status, user_id) VALUES (?, ?, ?)').run('Task B', 'todo', 1);
    db.prepare('INSERT INTO tasks (title, status, user_id, assigned_to) VALUES (?, ?, ?, ?)').run('Task C', 'in-progress', 1, 2);
    db.prepare('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)').run(3, 2);

    const stats = getUserTaskStats(db);
    expect(stats.length).toBe(2);

    const u1 = stats.find(s => s.username === 'user1');
    expect(u1).toBeDefined();
    expect(u1!.total).toBe(2); // Task A + Task B (user1 owns and no one else is assigned)
    expect(u1!.done).toBe(1);

    const u2 = stats.find(s => s.username === 'user2');
    expect(u2).toBeDefined();
    expect(u2!.in_progress).toBe(1); // Task C assigned to user2
  });

  it('2. getUserTaskStats: returns empty stats with no tasks', () => {
    const stats = getUserTaskStats(db);
    expect(stats.length).toBe(2); // 2 users exist, but with 0 tasks each
    expect(stats[0].total).toBe(0);
    expect(stats[1].total).toBe(0);
  });

  it('3. getProjectProgress: returns progress per project', () => {
    db.prepare('INSERT INTO projects (name, user_id) VALUES (?, ?)').run('Project Alpha', 1);
    db.prepare('INSERT INTO tasks (title, status, user_id, project_id) VALUES (?, ?, ?, ?)').run('T1', 'done', 1, 1);
    db.prepare('INSERT INTO tasks (title, status, user_id, project_id) VALUES (?, ?, ?, ?)').run('T2', 'todo', 1, 1);

    const progress = getProjectProgress(db);
    expect(progress.length).toBe(1);
    expect(progress[0].project_name).toBe('Project Alpha');
    expect(progress[0].total).toBe(2);
    expect(progress[0].done).toBe(1);
  });

  it('4. getProjectProgress: calculates completion rate correctly', () => {
    db.prepare('INSERT INTO projects (name, user_id) VALUES (?, ?)').run('Full Project', 1);
    db.prepare('INSERT INTO tasks (title, status, user_id, project_id) VALUES (?, ?, ?, ?)').run('T1', 'done', 1, 1);
    db.prepare('INSERT INTO tasks (title, status, user_id, project_id) VALUES (?, ?, ?, ?)').run('T2', 'done', 1, 1);
    db.prepare('INSERT INTO tasks (title, status, user_id, project_id) VALUES (?, ?, ?, ?)').run('T3', 'todo', 1, 1);
    db.prepare('INSERT INTO tasks (title, status, user_id, project_id) VALUES (?, ?, ?, ?)').run('T4', 'in-progress', 1, 1);

    const progress = getProjectProgress(db);
    expect(progress[0].completion_rate).toBe(50); // 2 done out of 4 = 50%
  });

  it('5. getOverdueTasks: returns overdue tasks only', () => {
    db.prepare('INSERT INTO tasks (title, status, due_date, user_id) VALUES (?, ?, ?, ?)').run('Overdue', 'todo', '2020-01-01', 1);
    db.prepare('INSERT INTO tasks (title, status, due_date, user_id) VALUES (?, ?, ?, ?)').run('Future', 'todo', '2099-12-31', 1);
    db.prepare('INSERT INTO tasks (title, status, user_id) VALUES (?, ?, ?)').run('No date', 'todo', 1);

    const overdue = getOverdueTasks(db);
    expect(overdue.length).toBe(1);
    expect(overdue[0].title).toBe('Overdue');
  });

  it('6. getOverdueTasks: excludes done tasks even if past due', () => {
    db.prepare('INSERT INTO tasks (title, status, due_date, user_id) VALUES (?, ?, ?, ?)').run('Done Old', 'done', '2020-01-01', 1);
    db.prepare('INSERT INTO tasks (title, status, due_date, user_id) VALUES (?, ?, ?, ?)').run('Still Open', 'in-progress', '2020-06-01', 1);

    const overdue = getOverdueTasks(db);
    expect(overdue.length).toBe(1);
    expect(overdue[0].title).toBe('Still Open');
  });

  it('7. getTeamSummary: returns overall stats', () => {
    db.prepare('INSERT INTO projects (name, user_id) VALUES (?, ?)').run('P1', 1);
    db.prepare('INSERT INTO tasks (title, status, user_id) VALUES (?, ?, ?)').run('T1', 'done', 1);
    db.prepare('INSERT INTO tasks (title, status, user_id) VALUES (?, ?, ?)').run('T2', 'todo', 1);
    db.prepare('INSERT INTO tasks (title, status, due_date, user_id) VALUES (?, ?, ?, ?)').run('T3', 'todo', '2020-01-01', 1);

    const summary = getTeamSummary(db);
    expect(summary.totalTasks).toBe(3);
    expect(summary.totalDone).toBe(1);
    expect(summary.totalOverdue).toBe(1);
    expect(summary.completionRate).toBe(33); // 1/3 = 33%
    expect(summary.totalUsers).toBe(2);
    expect(summary.totalProjects).toBe(1);
  });

  it('8. getTeamSummary: returns zero with no data', () => {
    const summary = getTeamSummary(db);
    expect(summary.totalTasks).toBe(0);
    expect(summary.totalDone).toBe(0);
    expect(summary.totalOverdue).toBe(0);
    expect(summary.completionRate).toBe(0);
    expect(summary.totalProjects).toBe(0);
  });
});
