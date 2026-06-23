import Database from 'better-sqlite3';
import { Project, CreateProjectInput, UpdateProjectInput, ValidationError } from '../types';

type Id = number | string;

interface ProjectMemberRow {
  id: number;
  username: string;
  email: string;
}

interface SqliteError {
  code?: string;
  message?: string;
}

export function validateCreateProjectInput(input: Partial<CreateProjectInput>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!input.name || typeof input.name !== 'string' || input.name.trim() === '') {
    errors.push({ field: 'name', message: 'Project name is required' });
  } else if (input.name.length > 100) {
    errors.push({ field: 'name', message: 'Project name cannot exceed 100 characters' });
  }
  return errors;
}

export function validateUpdateProjectInput(input: Partial<UpdateProjectInput>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (input.name !== undefined) {
    if (typeof input.name !== 'string' || input.name.trim() === '') {
      errors.push({ field: 'name', message: 'Project name cannot be empty' });
    } else if (input.name.length > 100) {
      errors.push({ field: 'name', message: 'Project name cannot exceed 100 characters' });
    }
  }
  return errors;
}

export function createProject(db: Database.Database, input: CreateProjectInput, userId: Id): Project {
  const userIdNum = Number(userId);
  const stmt = db.prepare(`
    INSERT INTO projects (name, description, user_id)
    VALUES (@name, @description, @userId)
  `);

  const result = stmt.run({
    name: input.name.trim(),
    description: input.description?.trim() ?? null,
    userId: userIdNum
  });

  return getProjectById(db, Number(result.lastInsertRowid)) as Project;
}

export function getProjects(db: Database.Database, userId: Id, isAdmin: boolean = false): Project[] {
  const userIdNum = Number(userId);
  if (isAdmin) {
    return db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as Project[];
  }
  return db.prepare(`
    SELECT * FROM projects
    WHERE user_id = ? OR id IN (
      SELECT project_id FROM project_members WHERE user_id = ?
    )
    ORDER BY created_at DESC
  `).all(userIdNum, userIdNum) as Project[];
}

export function getProjectById(db: Database.Database, id: Id): Project | null {
  const idNum = Number(id);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(idNum) as Project | undefined;
  return project ?? null;
}

export function updateProject(db: Database.Database, id: Id, input: UpdateProjectInput, userId: Id): Project | null {
  const idNum = Number(id);
  const userIdNum = Number(userId);
  const project = getProjectById(db, idNum);
  if (!project || Number(project.user_id) !== userIdNum) return null;

  const updates: string[] = [];
  const values: Record<string, string | number | null> = { id: idNum };

  if (input.name !== undefined) {
    updates.push('name = @name');
    values.name = input.name.trim();
  }
  if (input.description !== undefined) {
    updates.push('description = @description');
    values.description = input.description?.trim() ?? null;
  }

  if (updates.length > 0) {
    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = @id`).run(values);
  }

  return getProjectById(db, idNum);
}

export function deleteProject(db: Database.Database, id: Id, userId: Id): boolean {
  const idNum = Number(id);
  const userIdNum = Number(userId);
  const project = getProjectById(db, idNum);
  if (!project || Number(project.user_id) !== userIdNum) return false;

  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(idNum);
  return result.changes > 0;
}

export function getProjectMembers(db: Database.Database, projectId: Id): ProjectMemberRow[] {
  const projectIdNum = Number(projectId);
  return db.prepare(`
    SELECT u.id, u.username, u.email
    FROM users u
    JOIN project_members pm ON u.id = pm.user_id
    WHERE pm.project_id = ?
  `).all(projectIdNum) as ProjectMemberRow[];
}

export function addMemberToProject(db: Database.Database, projectId: Id, newUserId: Id, requestingUserId: Id, isAdmin: boolean = false): boolean {
  const projectIdNum = Number(projectId);
  const newUserIdNum = Number(newUserId);
  const requestingUserIdNum = Number(requestingUserId);

  const project = getProjectById(db, projectIdNum);
  if (!project) return false;
  if (Number(project.user_id) !== requestingUserIdNum && !isAdmin) return false;

  // verify user exists
  const userExists = db.prepare('SELECT 1 FROM users WHERE id = ?').get(newUserIdNum);
  if (!userExists) return false;

  try {
    db.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)').run(projectIdNum, newUserIdNum);
    return true;
  } catch (e) {
    const sqliteErr = e as SqliteError;
    if (sqliteErr.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') return true;
    throw e;
  }
}

export function removeMemberFromProject(db: Database.Database, projectId: Id, targetUserId: Id, requestingUserId: Id, isAdmin: boolean = false): boolean {
  const projectIdNum = Number(projectId);
  const targetUserIdNum = Number(targetUserId);
  const requestingUserIdNum = Number(requestingUserId);

  const project = getProjectById(db, projectIdNum);
  if (!project) return false;
  if (Number(project.user_id) !== requestingUserIdNum && !isAdmin) return false;

  const result = db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(projectIdNum, targetUserIdNum);
  return result.changes > 0;
}
