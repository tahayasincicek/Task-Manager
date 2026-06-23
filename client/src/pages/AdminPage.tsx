import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { User } from '../types';

interface Stats {
  userCount: number;
  taskCount: number;
  statusCounts: { status: string; count: number }[];
  priorityCounts: { priority: string; count: number }[];
  labelCount: number;
  commentCount: number;
  overdueCount: number;
}

type SortKey = 'id' | 'username' | 'email' | 'role' | 'created_at';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 5;

function priorityLabel(p: string) {
  switch (p) {
    case 'urgent': return 'Urgent';
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return p;
  }
}

function exportCSV(users: User[]) {
  const header = 'ID,Username,Email,Role,Registration Date\n';
  const rows = users.map(u => {
    const date = new Date(u.created_at).toLocaleDateString('en-US');
    return `${u.id},"${u.username}","${u.email}",${u.role},"${date}"`;
  }).join('\n');
  const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

import { 
  ShieldCheck, Users, FileText, CheckCircle2, AlertCircle, 
  Tag, MessageSquare, BarChart3, ArrowUp, 
  ArrowDown, Minus, Search, X, Download, ChevronLeft, 
  ChevronRight, Filter
} from 'lucide-react';

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([api.admin.users(), api.admin.stats()])
      .then(([u, s]) => { setUsers(u); setStats(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getCount = (status: string) =>
    stats?.statusCounts.find(s => s.status === status)?.count ?? 0;
  const getPriorityCount = (priority: string) =>
    stats?.priorityCounts?.find(p => p.priority === priority)?.count ?? 0;

  const todoCount = getCount('todo');
  const inProgressCount = getCount('in-progress');
  const doneCount = getCount('done');
  const totalTasks = stats?.taskCount ?? 0;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return <Minus size={14} className="text-muted opacity-30" />;
    return sortDir === 'asc' 
      ? <ArrowUp size={14} className="text-primary" /> 
      : <ArrowDown size={14} className="text-primary" />;
  };

  const processedUsers = useMemo(() => {
    let result = [...users];

    if (roleFilter !== 'all') {
      result = result.filter(u => u.role === roleFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (sortKey === 'id') { aVal = a.id; bVal = b.id; }
      else if (sortKey === 'username') { aVal = a.username.toLowerCase(); bVal = b.username.toLowerCase(); }
      else if (sortKey === 'email') { aVal = a.email.toLowerCase(); bVal = b.email.toLowerCase(); }
      else if (sortKey === 'role') { aVal = a.role; bVal = b.role; }
      else if (sortKey === 'created_at') { aVal = a.created_at; bVal = b.created_at; }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, search, roleFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processedUsers.length / PAGE_SIZE));
  const pagedUsers = processedUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, roleFilter]);

  if (loading) return (
    <div className="admin-skeleton-container" style={{marginTop: '2rem'}}>
      <div className="skeleton-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-box skeleton-card" style={{height:'100px', borderRadius: '12px'}} />)}
      </div>
      <div className="skeleton-box skeleton-card" style={{height:'400px', borderRadius: '12px'}} />
    </div>
  );

  return (
    <div className="admin-container">
      <div className="page-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldCheck size={28} className="text-primary" />
          System Management
        </h2>
        <div className="header-actions">
          <button className="btn-outline-pill" onClick={() => exportCSV(processedUsers)}>
            <Download size={16} />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card-modern">
          <div className="admin-stat-icon-box bg-purple-soft">
            <Users size={24} className="text-purple" />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{stats?.userCount ?? 0}</span>
            <span className="admin-stat-label">Total Users</span>
          </div>
        </div>
        <div className="admin-stat-card-modern">
          <div className="admin-stat-icon-box bg-blue-soft">
            <FileText size={24} className="text-blue" />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{stats?.taskCount ?? 0}</span>
            <span className="admin-stat-label">Total Tasks</span>
          </div>
        </div>
        <div className="admin-stat-card-modern">
          <div className="admin-stat-icon-box bg-green-soft">
            <CheckCircle2 size={24} className="text-green" />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{doneCount}</span>
            <span className="admin-stat-label">Completed</span>
          </div>
        </div>
        <div className="admin-stat-card-modern">
          <div className="admin-stat-icon-box bg-red-soft">
            <AlertCircle size={24} className="text-red" />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-number text-red">{stats?.overdueCount ?? 0}</span>
            <span className="admin-stat-label">Overdue</span>
          </div>
        </div>
      </div>

      {/* Detail Stats Row */}
      <div className="admin-meta-info-bar">
        <div className="meta-item">
          <Tag size={14} />
          <span>Labels: <strong>{stats?.labelCount ?? 0}</strong></span>
        </div>
        <div className="meta-item">
          <MessageSquare size={14} />
          <span>Comments: <strong>{stats?.commentCount ?? 0}</strong></span>
        </div>
        <div className="divider-v"></div>
        <div className="meta-priority-group">
          {['urgent', 'high', 'medium', 'low'].map(p => (
            <div key={p} className="meta-priority-item">
              <span className={`dot-prio prio-${p}`}></span>
              <span>{priorityLabel(p)}: <strong>{getPriorityCount(p)}</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Charts & Table Area */}
      <div className="admin-content-layout">
        {/* Status Distribution */}
        {totalTasks > 0 && (
          <div className="admin-chart-section">
            <h3 className="section-title-sm">
              <BarChart3 size={16} />
              Task Status Analysis
            </h3>
            <div className="modern-status-bar">
              {todoCount > 0 && (
                <div className="status-segment todo" style={{ width: `${(todoCount / totalTasks) * 100}%` }}>
                  <span className="segment-label">{Math.round((todoCount / totalTasks) * 100)}%</span>
                </div>
              )}
              {inProgressCount > 0 && (
                <div className="status-segment progress" style={{ width: `${(inProgressCount / totalTasks) * 100}%` }}>
                  <span className="segment-label">{Math.round((inProgressCount / totalTasks) * 100)}%</span>
                </div>
              )}
              {doneCount > 0 && (
                <div className="status-segment done" style={{ width: `${(doneCount / totalTasks) * 100}%` }}>
                  <span className="segment-label">{Math.round((doneCount / totalTasks) * 100)}%</span>
                </div>
              )}
            </div>
            <div className="status-legend-modern">
              <div className="legend-pill">
                <span className="pill-dot bg-orange"></span>
                <span>To Do ({todoCount})</span>
              </div>
              <div className="legend-pill">
                <span className="pill-dot bg-blue"></span>
                <span>In Progress ({inProgressCount})</span>
              </div>
              <div className="legend-pill">
                <span className="pill-dot bg-green"></span>
                <span>Completed ({doneCount})</span>
              </div>
            </div>
          </div>
        )}

        {/* User Management Section */}
        <div className="admin-table-section">
          <div className="table-header-modern">
            <div className="header-left">
              <h3 className="section-title-sm">User Management</h3>
              <span className="result-count">{processedUsers.length} users found</span>
            </div>
            <div className="header-right">
              <div className="search-box-modern">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && <button className="clear-search" onClick={() => setSearch('')}><X size={14} /></button>}
              </div>
              <div className="filter-box-modern">
                <Filter size={18} className="filter-icon" />
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value as 'all' | 'admin' | 'user')}
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
              </div>
            </div>
          </div>

          <div className="table-container-modern">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')}>ID {sortArrow('id')}</th>
                  <th onClick={() => handleSort('username')}>Username {sortArrow('username')}</th>
                  <th onClick={() => handleSort('email')}>Email {sortArrow('email')}</th>
                  <th onClick={() => handleSort('role')}>Role {sortArrow('role')}</th>
                  <th onClick={() => handleSort('created_at')}>Date {sortArrow('created_at')}</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state-table">
                        <Search size={48} className="text-muted opacity-20" />
                        <h4>No results matching your search criteria</h4>
                        <p>Please try a different keyword or reset the filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedUsers.map(u => (
                    <tr key={u.id}>
                      <td className="text-muted font-mono">{u.id}</td>
                      <td>
                        <div className="user-info-cell">
                          <div className="user-avatar-mini">
                            {u.username.substring(0, 1).toUpperCase()}
                          </div>
                          <span className="username-bold">{u.username}</span>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-badge ${u.role}`}>
                          {u.role === 'admin' ? <ShieldCheck size={12} /> : <Users size={12} />}
                          {u.role}
                        </span>
                      </td>
                      <td className="text-muted text-sm">
                        {new Date(u.created_at).toLocaleDateString('en-US')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* New Pagination */}
          {totalPages > 1 && (
            <div className="pagination-modern">
              <button className="page-nav-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={18} />
                <span>Previous</span>
              </button>
              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button 
                    key={p} 
                    className={`page-num-btn ${p === page ? 'active' : ''}`} 
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button className="page-nav-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <span>Next</span>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
