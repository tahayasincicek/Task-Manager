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
  const { lastInsertRowid: task1 } = insertTask.run('API endpoint testleri yazilmali', 'Tum API endpointleri icin smoke testler yazilmali', 'todo', 'high', fmt(tomorrow), null, Number(userId), Number(adminId));
  const { lastInsertRowid: task2 } = insertTask.run('Kullanici arayuzu gelistirme', 'React ile modern bir UI olustur', 'in-progress', 'medium', fmt(nextWeek), null, Number(adminId), Number(userId));
  const { lastInsertRowid: task3 } = insertTask.run('Veritabani sema tasarimi', 'SQLite tablolari ve iliskiler tamamlandi', 'done', 'high', null, null, null, Number(userId));
  const { lastInsertRowid: task4 } = insertTask.run('Login sayfasi hata duzeltme', 'Login sayfasinda sifre alani bos birakildiginda hata veriyor', 'todo', 'urgent', fmt(yesterday), null, Number(userId), Number(adminId));
  const { lastInsertRowid: task5 } = insertTask.run('README dokumantasyonu', 'Proje dokumantasyonunu guncelle', 'in-progress', 'low', fmt(nextWeek), null, null, Number(adminId));

  // Subtask for task2
  insertTask.run('Header komponenti', 'Navbar tasarimi', 'done', 'medium', null, Number(task2), Number(adminId), Number(userId));
  insertTask.run('Gorev listesi sayfasi', 'Kanban board gorunumu', 'in-progress', 'medium', null, Number(task2), Number(userId), Number(userId));

  // Task-label associations
  insertTaskLabel.run(Number(task1), Number(labelBackend));
  insertTaskLabel.run(Number(task2), Number(labelFrontend));
  insertTaskLabel.run(Number(task2), Number(labelFeature));
  insertTaskLabel.run(Number(task3), Number(labelBackend));
  insertTaskLabel.run(Number(task4), Number(labelBug));
  insertTaskLabel.run(Number(task4), Number(labelFrontend));
  insertTaskLabel.run(Number(task5), Number(labelDocs));

  // Comments
  insertComment.run(Number(task1), Number(adminId), 'Bu gorev icin Vitest ve Supertest kullanabiliriz.');
  insertComment.run(Number(task1), Number(userId), 'Tamam, ben smoke testleri yazayim.');
  insertComment.run(Number(task4), Number(adminId), 'Bu bug yuksek oncelikli, hemen duzeltilmeli.');

  // Activity logs
  insertActivity.run(Number(task1), Number(adminId), 'created', 'Task created: API endpoint testleri yazilmali');
  insertActivity.run(Number(task2), Number(userId), 'created', 'Task created: Kullanici arayuzu gelistirme');
  insertActivity.run(Number(task2), Number(userId), 'updated', 'Status: todo -> in-progress');
  insertActivity.run(Number(task3), Number(userId), 'updated', 'Status: in-progress -> done');

  console.log('Seeding complete!');
  console.log('  admin / Admin123! (role: admin)');
  console.log('  user1 / User123! (role: user)');
  console.log(`  ${5} tasks, ${2} subtasks, ${5} labels, ${3} comments created`);

  db.close();
}

seed().catch(console.error);
