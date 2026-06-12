import db from './db';
import bcrypt from 'bcrypt';
import { SALT_ROUNDS } from './services/authService';

async function seed() {
  console.log('Seeding database...');

  db.exec('DELETE FROM activity_log');
  db.exec('DELETE FROM comments');
  db.exec('DELETE FROM task_labels');
  db.exec('DELETE FROM tasks');
  db.exec('DELETE FROM labels');
  db.exec('DELETE FROM users');

  const insertUser = db.prepare(
    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  const insertTask = db.prepare(
    'INSERT INTO tasks (title, description, status, priority, due_date, parent_id, assigned_to, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertLabel = db.prepare(
    'INSERT INTO labels (name, color) VALUES (?, ?)'
  );
  const insertTaskLabel = db.prepare(
    'INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)'
  );
  const insertComment = db.prepare(
    'INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)'
  );
  const insertActivity = db.prepare(
    'INSERT INTO activity_log (task_id, user_id, action, detail) VALUES (?, ?, ?, ?)'
  );

  // Users
  const adminHash = await bcrypt.hash('Admin123!', SALT_ROUNDS);
  const { lastInsertRowid: adminId } = insertUser.run('admin', 'admin@example.com', adminHash, 'admin');

  const userHash = await bcrypt.hash('User123!', SALT_ROUNDS);
  const { lastInsertRowid: userId } = insertUser.run('user1', 'user1@example.com', userHash, 'user');

  // Labels
  const { lastInsertRowid: labelBug } = insertLabel.run('bug', '#ef4444');
  const { lastInsertRowid: labelFeature } = insertLabel.run('feature', '#10b981');
  const { lastInsertRowid: labelFrontend } = insertLabel.run('frontend', '#0ea5e9');
  const { lastInsertRowid: labelBackend } = insertLabel.run('backend', '#8b5cf6');
  const { lastInsertRowid: labelDocs } = insertLabel.run('docs', '#f59e0b');

  // Calculate dates
  const today = new Date();
  const tomorrow = new Date(today.getTime()); tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today.getTime()); nextWeek.setDate(today.getDate() + 7);
  const yesterday = new Date(today.getTime()); yesterday.setDate(today.getDate() - 1);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  // Tasks
  const { lastInsertRowid: task1 } = insertTask.run('Write API endpoint tests', 'Smoke tests must be written for all API endpoints', 'todo', 'high', fmt(tomorrow), null, Number(userId), Number(adminId));
  const { lastInsertRowid: task2 } = insertTask.run('User interface development', 'Create a modern UI using React', 'in-progress', 'medium', fmt(nextWeek), null, Number(adminId), Number(userId));
  const { lastInsertRowid: task3 } = insertTask.run('Database schema design', 'SQLite tables and relations are completed', 'done', 'high', null, null, null, Number(userId));
  const { lastInsertRowid: task4 } = insertTask.run('Login page bug fix', 'Throws an error when the password field is left empty on the login page', 'todo', 'urgent', fmt(yesterday), null, Number(userId), Number(adminId));
  const { lastInsertRowid: task5 } = insertTask.run('README documentation', 'Update project documentation', 'in-progress', 'low', fmt(nextWeek), null, null, Number(adminId));

  // Subtask for task2
  insertTask.run('Header component', 'Navbar design', 'done', 'medium', null, Number(task2), Number(adminId), Number(userId));
  insertTask.run('Task list page', 'Kanban board view', 'in-progress', 'medium', null, Number(task2), Number(userId), Number(userId));

  // Task-label associations
  insertTaskLabel.run(Number(task1), Number(labelBackend));
  insertTaskLabel.run(Number(task2), Number(labelFrontend));
  insertTaskLabel.run(Number(task2), Number(labelFeature));
  insertTaskLabel.run(Number(task3), Number(labelBackend));
  insertTaskLabel.run(Number(task4), Number(labelBug));
  insertTaskLabel.run(Number(task4), Number(labelFrontend));
  insertTaskLabel.run(Number(task5), Number(labelDocs));

  // Comments
  insertComment.run(Number(task1), Number(adminId), 'We can use Vitest and Supertest for this task.');
  insertComment.run(Number(task1), Number(userId), 'Alright, I will write the smoke tests.');
  insertComment.run(Number(task4), Number(adminId), 'This bug has high priority, it should be fixed immediately.');

  // Activity logs
  insertActivity.run(Number(task1), Number(adminId), 'created', 'Task created: Write API endpoint tests');
  insertActivity.run(Number(task2), Number(userId), 'created', 'Task created: User interface development');
  insertActivity.run(Number(task2), Number(userId), 'updated', 'Status: todo -> in-progress');
  insertActivity.run(Number(task3), Number(userId), 'updated', 'Status: in-progress -> done');

  console.log('Seeding complete!');
  console.log('  admin / Admin123! (role: admin)');
  console.log('  user1 / User123! (role: user)');
  console.log(`  ${5} tasks, ${2} subtasks, ${5} labels, ${3} comments created`);

  db.close();
}

seed().catch(console.error);
