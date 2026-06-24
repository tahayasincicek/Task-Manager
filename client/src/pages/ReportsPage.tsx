import { useState, useEffect } from 'react';
import { api } from '../api';

interface UserStat {
  user_id: number;
  username: string;
  total: number;
  todo: number;
  in_progress: number;
  done: number;
  overdue: number;
}

interface ProjectProg {
  project_id: number;
  project_name: string;
  owner: string;
  total: number;
  done: number;
  completion_rate: number;
}

interface OverdueTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_username: string | null;
  project_name: string | null;
}

interface TeamSummary {
  totalTasks: number;
  totalDone: number;
  totalOverdue: number;
  completionRate: number;
  totalUsers: number;
  totalProjects: number;
}

function priorityLabel(p: string) {
  switch (p) {
    case 'urgent': return 'Urgent';
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return p;
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US');
}

import { 
  FileText, CheckCircle2, AlertCircle, TrendingUp, Users, 
  Folder, BarChart3, Calendar, AlertTriangle, Layout
} from 'lucide-react';

export default function ReportsPage() {
  const [userStats, setUserStats] = useState<UserStat[]>([]);
  const [projectProgress, setProjectProgress] = useState<ProjectProg[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [teamSummary, setTeamSummary] = useState<TeamSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.reports.summary()
      .then(data => {
        setUserStats(data.userStats);
        setProjectProgress(data.projectProgress);
        setOverdueTasks(data.overdueTasks);
        setTeamSummary(data.teamSummary);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ marginTop: '2rem' }}>
      <div className="skeleton-box skeleton-card" style={{ height: '120px', borderRadius: '12px' }} />
      <div className="skeleton-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="skeleton-box skeleton-card" style={{ height: '300px', borderRadius: '12px' }} />
        <div className="skeleton-box skeleton-card" style={{ height: '300px', borderRadius: '12px' }} />
      </div>
    </div>
  );

  const maxUserTasks = Math.max(...userStats.map(u => u.total), 1);

  return (
    <div className="reports-container">
      <div className="page-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BarChart3 size={28} className="text-primary" />
          Reports & Analytics
        </h2>
      </div>

      {/* Team Summary Cards */}
      {teamSummary && (
        <div className="report-summary-grid">
          <div className="report-summary-card">
            <div className="report-summary-icon bg-blue-soft">
              <FileText size={24} className="text-blue" />
            </div>
            <div className="report-summary-info">
              <div className="report-summary-number">{teamSummary.totalTasks}</div>
              <div className="report-summary-label">Total Tasks</div>
            </div>
          </div>
          <div className="report-summary-card">
            <div className="report-summary-icon bg-green-soft">
              <CheckCircle2 size={24} className="text-green" />
            </div>
            <div className="report-summary-info">
              <div className="report-summary-number">{teamSummary.totalDone}</div>
              <div className="report-summary-label">Completed</div>
            </div>
          </div>
          <div className="report-summary-card report-summary-danger">
            <div className="report-summary-icon bg-red-soft">
              <AlertCircle size={24} className="text-red" />
            </div>
            <div className="report-summary-info">
              <div className="report-summary-number text-red">{teamSummary.totalOverdue}</div>
              <div className="report-summary-label">Overdue</div>
            </div>
          </div>
          <div className="report-summary-card">
            <div className="report-summary-icon bg-purple-soft">
              <TrendingUp size={24} className="text-purple" />
            </div>
            <div className="report-summary-info">
              <div className="report-summary-number">{teamSummary.completionRate}%</div>
              <div className="report-summary-label">Efficiency</div>
            </div>
          </div>
          <div className="report-summary-card">
            <div className="report-summary-icon bg-orange-soft">
              <Users size={24} className="text-orange" />
            </div>
            <div className="report-summary-info">
              <div className="report-summary-number">{teamSummary.totalUsers}</div>
              <div className="report-summary-label">Users</div>
            </div>
          </div>
          <div className="report-summary-card">
            <div className="report-summary-icon bg-cyan-soft">
              <Folder size={24} className="text-cyan" />
            </div>
            <div className="report-summary-info">
              <div className="report-summary-number">{teamSummary.totalProjects}</div>
              <div className="report-summary-label">Projects</div>
            </div>
          </div>
        </div>
      )}

      <div className="report-grid">
        {/* User Task Stats */}
        <div className="report-section-modern">
          <h3 className="report-section-title">
            <Users size={18} className="text-secondary" />
            Per-User Progress
          </h3>
          {userStats.length === 0 ? (
            <div className="empty-tab">No users found</div>
          ) : (
            <div className="report-user-list">
              {userStats.map(u => (
                <div key={u.user_id} className="report-user-row-modern">
                  <div className="report-user-avatar-modern">
                    {u.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="report-user-info">
                    <div className="report-user-header">
                      <span className="report-user-name">{u.username}</span>
                      <span className="report-user-total-badge">{u.total} tasks</span>
                    </div>
                    <div className="report-user-bar-track-modern">
                      <div className="bar bar-done" style={{ width: `${(u.done / maxUserTasks) * 100}%` }} title="Done" />
                      <div className="bar bar-progress" style={{ width: `${(u.in_progress / maxUserTasks) * 100}%` }} title="In Progress" />
                      <div className="bar bar-todo" style={{ width: `${(u.todo / maxUserTasks) * 100}%` }} title="Todo" />
                    </div>
                    <div className="report-user-legend">
                      <span className="dot dot-done"></span> {u.done}
                      <span className="dot dot-progress"></span> {u.in_progress}
                      <span className="dot dot-todo"></span> {u.todo}
                      {u.overdue > 0 && <span className="dot dot-overdue"></span>}
                      {u.overdue > 0 && <span className="text-red font-bold">{u.overdue}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Progress */}
        <div className="report-section-modern">
          <h3 className="report-section-title">
            <Layout size={18} className="text-secondary" />
            Per-Project Progress
          </h3>
          {projectProgress.length === 0 ? (
            <div className="empty-tab">No projects found</div>
          ) : (
            <div className="report-project-list">
              {projectProgress.map(p => (
                <div key={p.project_id} className="report-project-row-modern">
                  <div className="report-project-header">
                    <div className="flex flex-col">
                      <span className="project-name-bold">{p.project_name}</span>
                      <span className="project-owner-text">Owner: {p.owner}</span>
                    </div>
                    <span className="project-rate-badge">{p.completion_rate}%</span>
                  </div>
                  <div className="report-project-bar-container">
                    <div className="report-project-bar-track">
                      <div
                        className="report-project-bar-fill-gradient"
                        style={{ width: `${p.completion_rate}%` }}
                      />
                    </div>
                  </div>
                  <div className="report-project-footer">
                    <CheckCircle2 size={12} className="text-success" />
                    <span>{p.done}/{p.total} tasks completed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue Tasks Table */}
      <div className="report-section-modern full-width">
        <h3 className="report-section-title">
          <AlertTriangle size={18} className="text-red" />
          Overdue Tasks ({overdueTasks.length})
        </h3>
        {overdueTasks.length === 0 ? (
          <div className="empty-state-modern-small">
            <CheckCircle2 size={40} className="text-success opacity-40" />
            <h4>No overdue tasks!</h4>
            <p>Great job, all tasks are progressing on time.</p>
          </div>
        ) : (
          <div className="table-container-modern">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Assigned</th>
                  <th>Priority</th>
                  <th>Days Overdue</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {overdueTasks.map(t => (
                  <tr key={t.id}>
                    <td className="font-semibold text-primary">{t.title}</td>
                    <td>
                      <span className="project-tag">
                        <Folder size={12} />
                        {t.project_name ?? '-'}
                      </span>
                    </td>
                    <td>
                      <div className="avatar-mini">
                        {(t.assigned_username ?? '?').substring(0, 1).toUpperCase()}
                      </div>
                      {t.assigned_username ?? '-'}
                    </td>
                    <td>
                      <span className={`badge-modern prio-${t.priority}`}>
                        {priorityLabel(t.priority)}
                      </span>
                    </td>
                    <td className="text-red font-bold">
                      {Math.floor((new Date().getTime() - new Date(t.due_date).getTime()) / (1000 * 3600 * 24))} Days
                    </td>
                    <td className="text-red-dark">
                      <Calendar size={14} className="inline mr-1" />
                      {formatDate(t.due_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
