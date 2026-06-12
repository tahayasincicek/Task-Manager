import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { api } from './api';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TasksPage from './pages/TasksPage';
import AdminPage from './pages/AdminPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';

import { LayoutDashboard, CheckSquare, BarChart3, ShieldCheck, LogOut, User, Sun, Moon } from 'lucide-react';

type AuthUser = { userId: number; role: 'admin' | 'user'; username: string } | null;

function App() {
  const [auth, setAuth] = useState<AuthUser>(null);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    api.auth.me().then(setAuth).catch(() => setAuth(null));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const handleLogout = async () => {
    await api.auth.logout();
    setAuth(null);
  };

  return (
    <div className="app">
      {auth && (
        <nav>
          <span className="brand">Task Manager</span>
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <LayoutDashboard size={16} /> Dashboard
          </Link>
          <Link to="/tasks" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckSquare size={16} /> Görevler
          </Link>
          <Link to="/reports" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <BarChart3 size={16} /> Raporlar
          </Link>
          {auth.role === 'admin' && (
            <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} /> Admin Paneli
            </Link>
          )}
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
            <User size={14} /> {auth.username}
          </span>
          <button className="theme-toggle" onClick={() => setDark(!dark)} title={dark ? 'Açık Tema' : 'Koyu Tema'} style={{ marginLeft: '0.5rem' }}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }} className="btn-logout-nav">
            <LogOut size={16} />
            Çıkış
          </button>
        </nav>
      )}
      <div className="container">
        <Routes>
          <Route path="/login" element={auth ? <Navigate to="/dashboard" /> : <LoginPage onLogin={setAuth} />} />
          <Route path="/register" element={auth ? <Navigate to="/dashboard" /> : <RegisterPage onLogin={setAuth} />} />
          <Route path="/dashboard" element={auth ? <DashboardPage /> : <Navigate to="/login" />} />
          <Route path="/tasks" element={auth ? <TasksPage /> : <Navigate to="/login" />} />
          <Route path="/reports" element={auth ? <ReportsPage /> : <Navigate to="/login" />} />
          <Route path="/admin" element={auth?.role === 'admin' ? <AdminPage /> : <Navigate to="/tasks" />} />
          <Route path="*" element={<Navigate to={auth ? '/dashboard' : '/login'} />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
