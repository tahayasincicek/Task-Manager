import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import db from '../db';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  validateCreateProjectInput,
  validateUpdateProjectInput,
  getProjectMembers,
  addMemberToProject,
  removeMemberFromProject
} from '../services/projectService';

const router = Router();
router.use(requireAuth);

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

// Get all projects
router.get('/', (req, res) => {
  const isAdmin = req.session.role === 'admin';
  const projects = getProjects(db, req.session.userId!, isAdmin);
  res.json(projects);
});

// Get project by ID
router.get('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid id' });
  const project = getProjectById(db, id);

  if (!project) return res.status(404).json({ error: 'Project not found' });

  const isAdmin = req.session.role === 'admin';
  let isAuthorized = isAdmin || project.user_id === req.session.userId;
  if (!isAuthorized) {
    const member = db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(id, req.session.userId);
    if (member) isAuthorized = true;
  }

  if (!isAuthorized) return res.status(403).json({ error: 'Not authorized' });

  res.json(project);
});

// Create project
router.post('/', (req, res) => {
  const errors = validateCreateProjectInput(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', errors });

  const project = createProject(db, req.body, req.session.userId!);
  res.status(201).json(project);
});

// Update project
router.patch('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid id' });
  const errors = validateUpdateProjectInput(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', errors });

  const project = updateProject(db, id, req.body, req.session.userId!);
  if (!project) return res.status(404).json({ error: 'Project not found or not authorized' });

  res.json(project);
});

// Delete project
router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid id' });
  const success = deleteProject(db, id, req.session.userId!);
  if (!success) return res.status(404).json({ error: 'Project not found or not authorized' });

  res.status(204).send();
});

// Get project members
router.get('/:id/members', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid id' });
  const project = getProjectById(db, id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const isAdmin = req.session.role === 'admin';
  let isAuthorized = isAdmin || project.user_id === req.session.userId;
  if (!isAuthorized) {
    const member = db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(id, req.session.userId);
    if (member) isAuthorized = true;
  }
  if (!isAuthorized) return res.status(403).json({ error: 'Not authorized' });

  const members = getProjectMembers(db, id);
  res.json(members);
});

// Add member to project
router.post('/:id/members', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid id' });
  const { user_id } = req.body;
  if (typeof user_id !== 'number') return res.status(400).json({ error: 'user_id is required and must be a number' });

  const isAdmin = req.session.role === 'admin';
  const success = addMemberToProject(db, id, user_id, req.session.userId!, isAdmin);
  if (!success) return res.status(403).json({ error: 'Not authorized or user/project not found' });

  res.status(201).json({ message: 'Member added successfully' });
});

// Remove member from project
router.delete('/:id/members/:userId', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid id' });
  const targetUserId = parseId(req.params.userId);
  if (targetUserId === null) return res.status(400).json({ error: 'Invalid user id' });

  const isAdmin = req.session.role === 'admin';
  const success = removeMemberFromProject(db, id, targetUserId, req.session.userId!, isAdmin);
  if (!success) return res.status(403).json({ error: 'Not authorized or member not found' });

  res.status(204).send();
});

export default router;
