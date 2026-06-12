import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

// vi.mock is hoisted, so we cannot reference testDb directly in the factory.
// Instead, we use a module-level variable and populate it inside the factory via
// a lazy getter so the reference is resolved at call time (not at hoist time).

let _testDb: Database.Database | null = null;

vi.mock('../../src/db', () => {
  // Lazily return the db so it is not accessed before initialization
  return {
    get default() {
      return _testDb;
    }
  };
});

// Now that the mock is declared we can safely initialize the DB
_testDb = new Database(':memory:');
_testDb.pragma('foreign_keys = ON');
_testDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS project_members (
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS tasks (
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
  CREATE TABLE IF NOT EXISTS labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1'
  );
  CREATE TABLE IF NOT EXISTS task_labels (
    task_id INTEGER NOT NULL,
    label_id INTEGER NOT NULL,
    PRIMARY KEY (task_id, label_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS task_assignees (
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS activity_log (
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

// Import app after mock is set up
import app from '../../src/app';

describe('Smoke Tests', () => {
  let agent: ReturnType<typeof request.agent>;
  let adminAgent: ReturnType<typeof request.agent>;
  let createdTaskId: number;

  beforeAll(async () => {
    agent = request.agent(app);
    adminAgent = request.agent(app);

    // Create admin user in test db
    const adminHash = await bcrypt.hash('Admin123!', 10);
    _testDb!.prepare('INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run('testadmin', 'admin@test.com', adminHash, 'admin');

    // Login admin
    await adminAgent.post('/api/auth/login').send({ username: 'testadmin', password: 'Admin123!' });
  });

  afterAll(() => {
    _testDb!.close();
  });

  // Test 1: Register
  it('1. Register → 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'smokeuser', email: 'smoke@test.com', password: 'Test123!' });
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe('smokeuser');
  });

  // Test 2: Login
  it('2. Login → 200 with session cookie', async () => {
    const res = await agent
      .post('/api/auth/login')
      .send({ username: 'smokeuser', password: 'Test123!' });
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    // Session cookie should be set
    expect(res.headers['set-cookie']).toBeDefined();
  });

  // Test 3: Auth required endpoint without login
  it('3. Auth required endpoint without login → 401', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });

  // Test 4: Create task
  it('4. Create task → 201', async () => {
    const res = await agent
      .post('/api/tasks')
      .send({ title: 'Smoke Test Task', description: 'Created in smoke test' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Smoke Test Task');
    createdTaskId = res.body.id;
  });

  // Test 5: List tasks
  it('5. List tasks → 200 with created task', async () => {
    const res = await agent.get('/api/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((t: any) => t.id === createdTaskId);
    expect(found).toBeDefined();
  });

  // Test 6: Get single task
  it('6. Get single task → 200', async () => {
    const res = await agent.get(`/api/tasks/${createdTaskId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdTaskId);
    expect(res.body.title).toBe('Smoke Test Task');
  });

  // Test 7: Update task
  it('7. Update task → 200 with changed field', async () => {
    const res = await agent
      .patch(`/api/tasks/${createdTaskId}`)
      .send({ title: 'Updated Task Title', status: 'in-progress' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Task Title');
    expect(res.body.status).toBe('in-progress');
  });

  // Test 8: Delete task
  it('8. Delete task → 204, then 404', async () => {
    const deleteRes = await agent.delete(`/api/tasks/${createdTaskId}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await agent.get(`/api/tasks/${createdTaskId}`);
    expect(getRes.status).toBe(404);
  });

  // Test 9: Validation - invalid data → 400
  it('9. Validation: empty title create → 400', async () => {
    const res = await agent.post('/api/tasks').send({ title: '' });
    expect(res.status).toBe(400);
  });

  // Test 10: Admin-only endpoint
  it('10a. Admin-only endpoint: user → 403', async () => {
    const res = await agent.get('/api/admin/users');
    expect(res.status).toBe(403);
  });

  it('10b. Admin-only endpoint: admin → 200', async () => {
    const res = await adminAgent.get('/api/admin/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // ===== NEW FEATURE TESTS =====

  // Test 11: Create task with priority and due_date
  it('11. Create task with priority and due_date → 201', async () => {
    const res = await agent
      .post('/api/tasks')
      .send({ title: 'Priority Task', priority: 'high', due_date: '2026-12-31' });
    expect(res.status).toBe(201);
    expect(res.body.priority).toBe('high');
    expect(res.body.due_date).toBe('2026-12-31');
    createdTaskId = res.body.id;
  });

  // Test 12: Create comment on task
  it('12. Create comment on task → 201', async () => {
    const res = await agent
      .post(`/api/tasks/${createdTaskId}/comments`)
      .send({ content: 'This is a test comment' });
    expect(res.status).toBe(201);
    expect(res.body.content).toBe('This is a test comment');
    expect(res.body.task_id).toBe(createdTaskId);
  });

  // Test 13: List comments for task
  it('13. List comments for task → 200', async () => {
    const res = await agent.get(`/api/tasks/${createdTaskId}/comments`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].content).toBe('This is a test comment');
  });

  // Test 14: Delete comment
  it('14. Delete comment → 204', async () => {
    // Create then delete
    const createRes = await agent
      .post(`/api/tasks/${createdTaskId}/comments`)
      .send({ content: 'To be deleted' });
    expect(createRes.status).toBe(201);
    const commentId = createRes.body.id;

    const deleteRes = await agent.delete(`/api/tasks/${createdTaskId}/comments/${commentId}`);
    expect(deleteRes.status).toBe(204);
  });

  // Test 15: Create label
  let createdLabelId: number;
  it('15. Create label → 201', async () => {
    const res = await agent
      .post('/api/labels')
      .send({ name: 'smoke-test-label', color: '#ef4444' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('smoke-test-label');
    expect(res.body.color).toBe('#ef4444');
    createdLabelId = res.body.id;
  });

  // Test 16: Add label to task
  it('16. Add label to task → 200', async () => {
    const res = await agent
      .post(`/api/tasks/${createdTaskId}/labels`)
      .send({ label_id: createdLabelId });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((l: any) => l.id === createdLabelId)).toBe(true);
  });

  // Test 17: List labels for task
  it('17. List labels for task → includes the label', async () => {
    const res = await agent.get(`/api/tasks/${createdTaskId}/labels`);
    expect(res.status).toBe(200);
    expect(res.body.some((l: any) => l.name === 'smoke-test-label')).toBe(true);
  });

  // Test 18: Remove label from task
  it('18. Remove label from task → 200', async () => {
    const res = await agent.delete(`/api/tasks/${createdTaskId}/labels/${createdLabelId}`);
    expect(res.status).toBe(200);
    expect(res.body.some((l: any) => l.id === createdLabelId)).toBe(false);
  });

  // Test 19: Create subtask
  it('19. Create subtask → 201 with parent_id', async () => {
    const res = await agent
      .post('/api/tasks')
      .send({ title: 'Subtask of Priority Task', parent_id: createdTaskId });
    expect(res.status).toBe(201);
    expect(res.body.parent_id).toBe(createdTaskId);
  });

  // Test 20: Filter tasks by priority
  it('20. Filter tasks by priority → 200', async () => {
    const res = await agent.get('/api/tasks?priority=high');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((t: any) => {
      expect(t.priority).toBe('high');
    });
  });

  // Test 21: Invalid priority → 400
  it('21. Invalid priority on create → 400', async () => {
    const res = await agent
      .post('/api/tasks')
      .send({ title: 'Bad Priority', priority: 'super-high' });
    expect(res.status).toBe(400);
  });

  // Test 22: Create project
  let testProjectId: number;
  it('22. Create project → 201', async () => {
    const res = await agent.post('/api/projects').send({ name: 'Smoke test project' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Smoke test project');
    testProjectId = res.body.id;
  });

  // Test 23: Create task with project_id
  it('23. Create task with project_id → 201', async () => {
    const res = await agent.post('/api/tasks').send({ title: 'Task in Project', project_id: testProjectId });
    expect(res.status).toBe(201);
    expect(res.body.project_id).toBe(testProjectId);
  });

  // Test 24: Get projects list
  it('24. Get projects list → 200', async () => {
    const res = await agent.get('/api/projects');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.filter((p: any) => p.id === testProjectId).length).toBe(1);
  });

  // Test 25: Add member to project
  it('25. Add member to project → 201', async () => {
    // Register a second user to add as member
    const userRes = await request(app).post('/api/auth/register').send({ username: 'memberuser', email: 'member@test.com', password: 'Test123!' });
    const memberId = userRes.body.user.id;

    const res = await agent.post(`/api/projects/${testProjectId}/members`).send({ user_id: memberId });
    expect(res.status).toBe(201);
  });

  // Test 26: Get project members
  it('26. Get project members → 200', async () => {
    const res = await agent.get(`/api/projects/${testProjectId}/members`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].username).toBe('memberuser');
  });

  // Test 27: Remove member from project
  it('27. Remove member from project → 204', async () => {
    // We get members first to extract ID
    const membersRes = await agent.get(`/api/projects/${testProjectId}/members`);
    const memberId = membersRes.body[0].id;

    const res = await agent.delete(`/api/projects/${testProjectId}/members/${memberId}`);
    expect(res.status).toBe(204);
    
    const afterRes = await agent.get(`/api/projects/${testProjectId}/members`);
    expect(afterRes.body.length).toBe(0);
  });

  // ===== REPORT ENDPOINT TESTS =====

  // Test 28: Reports summary without auth → 401
  it('28. Reports summary without auth → 401', async () => {
    const res = await request(app).get('/api/reports/summary');
    expect(res.status).toBe(401);
  });

  // Test 29: Reports summary with auth → 200 with expected fields
  it('29. Reports summary with auth → 200 with expected fields', async () => {
    const res = await agent.get('/api/reports/summary');
    expect(res.status).toBe(200);
    expect(res.body.userStats).toBeDefined();
    expect(res.body.projectProgress).toBeDefined();
    expect(res.body.overdueTasks).toBeDefined();
    expect(res.body.teamSummary).toBeDefined();
  });

  // Test 30: Reports summary contains userStats array
  it('30. Reports summary contains userStats array', async () => {
    const res = await agent.get('/api/reports/summary');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.userStats)).toBe(true);
    // At least some users should be present (smokeuser, testadmin, memberuser)
    expect(res.body.userStats.length).toBeGreaterThanOrEqual(1);
    // Each stat should have required fields
    const stat = res.body.userStats[0];
    expect(stat.user_id).toBeDefined();
    expect(stat.username).toBeDefined();
    expect(typeof stat.total).toBe('number');
  });

  // Test 31: Reports summary contains projectProgress array
  it('31. Reports summary contains projectProgress array', async () => {
    const res = await agent.get('/api/reports/summary');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.projectProgress)).toBe(true);
    // We created a project earlier in test 22
    expect(res.body.projectProgress.length).toBeGreaterThanOrEqual(1);
    const proj = res.body.projectProgress[0];
    expect(proj.project_name).toBeDefined();
    expect(typeof proj.completion_rate).toBe('number');
  });
});
