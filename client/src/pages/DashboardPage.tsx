import { useState, useEffect } from 'react';
import { api } from '../api';
import { Task } from '../types';
import { 
  Home, CheckCircle2, Clock, AlertTriangle, 
  BarChart3, Calendar, Activity, Zap,
  TrendingUp, ListTodo
} from 'lucide-react';

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === 'done') return false;
  return new Date(dueDate) < new Date(new Date().toISOString().split('T')[0]);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('tr-TR');
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

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.tasks.list()
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="dash-skeleton-container" style={{marginTop: '2rem'}}>
      <div className="skeleton-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-box skeleton-card" style={{height:'100px', borderRadius: '12px'}} />)}
      </div>
      <div className="skeleton-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="skeleton-box skeleton-card" style={{height:'300px', borderRadius: '12px'}} />
        <div className="skeleton-box skeleton-card" style={{height:'300px', borderRadius: '12px'}} />
      </div>
    </div>
  );

  const mainTasks = tasks.filter(t => !t.parent_id);
  const todoTasks = mainTasks.filter(t => t.status === 'todo');
  const inProgressTasks = mainTasks.filter(t => t.status === 'in-progress');
  const doneTasks = mainTasks.filter(t => t.status === 'done');
  const overdueTasks = mainTasks.filter(t => isOverdue(t.due_date, t.status));
  const completionRate = mainTasks.length > 0 ? Math.round((doneTasks.length / mainTasks.length) * 100) : 0;

  // Tasks due today or tomorrow
  const today = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().split('T')[0];
  const upcomingTasks = mainTasks.filter(t => t.due_date && t.status !== 'done' && t.due_date >= today && t.due_date <= tomorrow);

  // Priority distribution
  const priorityGroups = ['urgent', 'high', 'medium', 'low'].map(p => ({
    priority: p,
    count: mainTasks.filter(t => t.priority === p && t.status !== 'done').length,
  }));

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Home size={28} className="text-secondary" />
          Dashboard
        </h2>
        <div className="header-actions">
          <span className="text-muted text-sm">Hoş geldin, bugünün özeti aşağıda.</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="dash-summary-modern">
        <div className="dash-card-modern bg-blue-gradient">
          <div className="dash-card-icon-modern">
            <ListTodo size={24} />
          </div>
          <div className="dash-card-content">
            <div className="dash-card-number-modern">{mainTasks.length}</div>
            <div className="dash-card-label-modern">Toplam Görev</div>
          </div>
          <Zap className="dash-card-bg-icon" size={80} />
        </div>
        <div className="dash-card-modern bg-orange-gradient">
          <div className="dash-card-icon-modern">
            <Activity size={24} />
          </div>
          <div className="dash-card-content">
            <div className="dash-card-number-modern">{todoTasks.length + inProgressTasks.length}</div>
            <div className="dash-card-label-modern">Aktif Görev</div>
          </div>
          <Activity className="dash-card-bg-icon" size={80} />
        </div>
        <div className="dash-card-modern bg-green-gradient">
          <div className="dash-card-icon-modern">
            <TrendingUp size={24} />
          </div>
          <div className="dash-card-content">
            <div className="dash-card-number-modern">%{completionRate}</div>
            <div className="dash-card-label-modern">Tamamlanma</div>
          </div>
          <CheckCircle2 className="dash-card-bg-icon" size={80} />
        </div>
        <div className="dash-card-modern bg-red-gradient">
          <div className="dash-card-icon-modern">
            <AlertTriangle size={24} />
          </div>
          <div className="dash-card-content">
            <div className="dash-card-number-modern text-white">{overdueTasks.length}</div>
            <div className="dash-card-label-modern">Geciken</div>
          </div>
          <Clock className="dash-card-bg-icon" size={80} />
        </div>
      </div>

      <div className="dash-grid-modern">
        {/* Overdue alerts */}
        <div className="dash-section-modern">
          <h3 className="dash-section-title-modern">
            <AlertTriangle size={18} className="text-red" />
            Geciken Görevler
          </h3>
          {overdueTasks.length === 0 ? (
            <div className="empty-state-modern-small">
              <CheckCircle2 size={40} className="text-success opacity-30" />
              <h4>Geciken görev yok</h4>
              <p>Harika gidiyorsun, her şey yolunda!</p>
            </div>
          ) : (
            <div className="dash-list-modern">
              {overdueTasks.map(t => (
                <div key={t.id} className="dash-list-item-modern overdue">
                  <div className="dash-list-item-content">
                    <span className="task-title-bold">{t.title}</span>
                    <span className={`badge-pill prio-${t.priority}`}>{priorityLabel(t.priority)}</span>
                  </div>
                  <div className="dash-list-item-meta text-red">
                    <Calendar size={14} />
                    <span>{formatDate(t.due_date!)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="dash-section-modern">
          <h3 className="dash-section-title-modern">
            <Calendar size={18} className="text-blue" />
            Yaklaşan Görevler (Bugün/Yarın)
          </h3>
          {upcomingTasks.length === 0 ? (
            <div className="empty-state-modern-small">
              <Clock size={40} className="text-muted opacity-30" />
              <h4>Yaklaşan görev yok</h4>
              <p>Bugün ve yarın için planlanmış bir şey yok.</p>
            </div>
          ) : (
            <div className="dash-list-modern">
              {upcomingTasks.map(t => (
                <div key={t.id} className="dash-list-item-modern">
                  <div className="dash-list-item-content">
                    <span className="task-title-bold">{t.title}</span>
                    <span className={`badge-pill prio-${t.priority}`}>{priorityLabel(t.priority)}</span>
                  </div>
                  <div className="dash-list-item-meta">
                    <Clock size={14} />
                    <span>{formatDate(t.due_date!)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Priority distribution */}
      <div className="dash-section-modern full-width" style={{ marginTop: '1.5rem' }}>
        <h3 className="dash-section-title-modern">
          <BarChart3 size={18} className="text-purple" />
          Öncelik Dağılımı (Aktif)
        </h3>
        <div className="priority-distribution-modern">
          {priorityGroups.map(pg => (
            <div key={pg.priority} className="priority-distribution-row">
              <span className={`priority-label-compact prio-${pg.priority}`}>{priorityLabel(pg.priority)}</span>
              <div className="priority-track-modern">
                <div
                  className={`priority-fill-modern prio-${pg.priority}`}
                  style={{ width: `${mainTasks.length > 0 ? (pg.count / mainTasks.length) * 100 : 0}%` }}
                />
              </div>
              <span className="priority-count-bold">{pg.count} Görev</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
