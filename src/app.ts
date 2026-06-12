import express from 'express';
import session from 'express-session';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import adminRoutes from './routes/admin';
import commentRoutes from './routes/comments';
import labelRoutes from './routes/labels';
import projectRoutes from './routes/projects';
import reportRoutes from './routes/reports';

const app = express();

// Don't disclose the framework / version via the X-Powered-By header.
app.disable('x-powered-by');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust the reverse proxy (Render) so secure cookies work
app.set('trust proxy', 1);

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET ?? 'task-manager-secret-key-change-in-production';

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tasks', commentRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

import path from 'path';

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static React files in production
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Catch-all route to serve React app (for client-side routing)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// API 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
