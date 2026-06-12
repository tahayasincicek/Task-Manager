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
    case 'urgent': return 'Acil';
    case 'high': return 'Yüksek';
    case 'medium': return 'Orta';
    case 'low': return 'Düşük';
    default: return p;
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('tr-TR');
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
          Raporlar ve Analizler
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
              <div className="report-summary-label">Toplam Görev</div>
            </div>
          </div>
          <div className="report-summary-card">
            <div className="report-summary-icon bg-green-soft">
              <CheckCircle2 size={24} className="text-green" />
            </div>
            <div className="report-summary-info">
              <div className="report-summary-number">{teamSummary.totalDone}</div>
              <div className="report-summary-label">Tamamlanan</div>
            </div>
          </div>
          <div className="report-summary-card report-summary-danger">
            <div className="report-summary-icon bg-red-soft">
              <AlertCircle size={24} className="text-red" />
            </div>
            <div className="report-summary-info">
              <div className="report-summary-number text-red">{teamSummary.totalOverdue}</div>
              <div className="report-summary-label">Geciken</div>
            </div>
          </div>
          <div className="report-summary-card">
            <div className="report-summary-icon bg-purple-soft">
              <TrendingUp size={24} className="text-purple" />
            </div>
            <div className="report-summary-info">
              <div className="report-summary-number">%{teamSummary.completionRate}</div>
              <div className="report-summary-label">Verimlilik</div>
            </div>
          </div>
          <div className="report-summary-card">
            <div className="report-summary-icon bg-orange-soft">
              <Users size={24} className="text-orange" />
            </div>
            <div className="report-summary-info">
              <div className="report-summary-number">{teamSummary.totalUsers}</div>
              <div className="report-summary-label">Kullanıcı</div>
            </div>
          </div>
          <div className="report-summary-card">
            <div className="report-summary-icon bg-cyan-soft">
              <Folder size={24} className="text-cyan" />
            </div>
            <div className="report-summary-info">
              <div className="report-summary-number">{teamSummary.totalProjects}</div>
              <div className="report-summary-label">Proje</div>
            </div>
          </div>
        </div>
      )}

      <div className="report-grid">
        {/* User Task Stats */}
        <div className="report-section-modern">
          <h3 className="report-section-title">
            <Users size={18} className="text-secondary" />
            Kişi Bazlı İlerleme
          </h3>
          {userStats.length === 0 ? (
            <div className="empty-tab">Kullanıcı bulunamadı</div>
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
                      <span className="report-user-total-badge">{u.total} görev</span>
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
            Proje Bazlı İlerleme
          </h3>
          {projectProgress.length === 0 ? (
            <div className="empty-tab">Proje bulunamadı</div>
          ) : (
            <div className="report-project-list">
              {projectProgress.map(p => (
                <div key={p.project_id} className="report-project-row-modern">
                  <div className="report-project-header">
                    <div className="flex flex-col">
                      <span className="project-name-bold">{p.project_name}</span>
                      <span className="project-owner-text">Owner: {p.owner}</span>
                    </div>
                    <span className="project-rate-badge">%{p.completion_rate}</span>
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
                    <span>{p.done}/{p.total} görev tamamlandı</span>
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
          Geciken Görevler ({overdueTasks.length})
        </h3>
        {overdueTasks.length === 0 ? (
          <div className="empty-state-modern-small">
            <CheckCircle2 size={40} className="text-success opacity-40" />
            <h4>Geciken görev yok!</h4>
            <p>Harika gidiyorsun, tüm görevler zamanında ilerliyor.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Görev</th>
                  <th>Proje</th>
                  <th>Atanan</th>
                  <th>Öncelik</th>
                  <th>Geciken Gün</th>
                  <th>Bitiş Tarihi</th>
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
                      {Math.floor((new Date().getTime() - new Date(t.due_date).getTime()) / (1000 * 3600 * 24))} Gün
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
