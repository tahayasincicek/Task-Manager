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

// CORS – allow Vercel frontend
const ALLOWED_ORIGIN = process.env.FRONTEND_URL ?? 'http://localhost:5173';
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET ?? 'task-manager-secret-key-change-in-production';
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1); // Trust Render's proxy

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Enforce Lax to ensure it works across all Safari/Incognito modes behind Vercel proxy
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

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;

