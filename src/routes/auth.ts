import { Router, Request, Response } from 'express';
import db from '../db';
import {
  validateRegisterInput,
  validateLoginInput,
  hashPassword,
  comparePassword,
} from '../services/authService';
import { User } from '../types';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;

  const errors = validateRegisterInput({ username, email, password });
  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  // Check username/email uniqueness
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?').get(cleanUsername, cleanEmail);
  if (existing) {
    res.status(409).json({ error: 'Username or email already exists' });
    return;
  }

  const password_hash = await hashPassword(password);
  const stmt = db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)');
  const result = stmt.run(cleanUsername, cleanEmail, password_hash, 'user');

  const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as Omit<User, 'password_hash'>;

  res.status(201).json({ message: 'User registered successfully', user });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  const errors = validateLoginInput({ username, password });
  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  const cleanUsername = username.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(cleanUsername) as User | undefined;
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.username = user.username;

  res.status(200).json({
    message: 'Login successful',
    user: { id: user.id, username: user.username, email: user.email, role: user.role }
  });
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Logout failed' });
      return;
    }
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

// GET /api/auth/me
router.get('/me', (req: Request, res: Response): void => {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.status(200).json({
    userId: req.session.userId,
    role: req.session.role,
    username: req.session.username
  });
});

// GET /api/auth/users (public list of all users for assignment)
router.get('/users', (req: Request, res: Response): void => {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const users = db.prepare('SELECT id, username FROM users ORDER BY username ASC').all();
  res.status(200).json(users);
});

export default router;
