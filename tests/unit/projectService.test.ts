import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  validateCreateProjectInput,
  addMemberToProject,
  removeMemberFromProject,
  getProjectMembers
} from '../../src/services/projectService';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user'
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
    `);
  db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run('test', 'test@test.com', 'hash');
  return db;
}

describe('Project Service Validation', () => {
  it('1. validateCreate: empty name -> error', () => {
    const errs = validateCreateProjectInput({ name: '' });
    expect(errs.length).toBeGreaterThan(0);
  });
  it('2. validateCreate: valid -> no error', () => {
    const errs = validateCreateProjectInput({ name: 'My Project' });
    expect(errs.length).toBe(0);
  });
});

describe('Project Service CRUD', () => {
  let db: Database.Database;
  beforeEach(() => { db = createTestDb(); });

  it('3. createProject: creates and returns', () => {
    const p = createProject(db, { name: 'Proj 1', description: 'Desc' }, 1);
    expect(p.id).toBeDefined();
    expect(p.name).toBe('Proj 1');
  });

  it('4. getProjects: retrieves for user', () => {
    createProject(db, { name: 'P1' }, 1);
    createProject(db, { name: 'P2' }, 1);
    const list = getProjects(db, 1);
    expect(list.length).toBe(2);
  });

  it('5. updateProject: updates name and description', () => {
    const p1 = createProject(db, { name: 'P1' }, 1);
    const updated = updateProject(db, p1.id, { name: 'Updated', description: 'New' }, 1);
    expect(updated?.name).toBe('Updated');
    expect(updated?.description).toBe('New');
  });

  it('6. deleteProject: removes project', () => {
    const p = createProject(db, { name: 'P' }, 1);
    const res = deleteProject(db, p.id, 1);
    expect(res).toBe(true);
    expect(getProjectById(db, p.id)).toBeNull();
  });

  it('7. add/remove/get members', () => {
    db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run('user2', 'u2', 'h');
    const p = createProject(db, { name: 'Proj' }, 1);
    
    // Add member
    const added = addMemberToProject(db, p.id, 2, 1);
    expect(added).toBe(true);

    // Get members
    const members = getProjectMembers(db, p.id);
    expect(members.length).toBe(1);
    expect(members[0].id).toBe(2);

    // Remove member
    const removed = removeMemberFromProject(db, p.id, 2, 1);
    expect(removed).toBe(true);
    expect(getProjectMembers(db, p.id).length).toBe(0);
  });
});
