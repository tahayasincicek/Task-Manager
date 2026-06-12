import { useState, useEffect, useCallback, useRef, FormEvent, DragEvent, CSSProperties } from 'react';
import { api } from '../api';
import { Task, Label, Comment, ActivityLog, Project, TaskPriority } from '../types';
import {
  Globe, Folder, Plus, Trash2, Search, X, Download,
  LayoutGrid, List, Calendar, AlertTriangle,
  MoreVertical, CheckCircle2, Circle, Clock, Activity,
  Check, BarChart3
} from 'lucide-react';

/* ---- Helpers ---- */
function priorityLabel(p: string) {
  switch (p) {
    case 'urgent': return 'Urgent';
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return p;
  }
}

function statusLabel(s: string) {
  switch (s) {
    case 'todo': return 'To Do';
    case 'in-progress': return 'In Progress';
    case 'done': return 'Completed';
    default: return s;
  }
}

function statusBadgeClass(status: string): string {
  if (status === 'todo') return 'badge-todo';
  if (status === 'in-progress') return 'badge-in-progress';
  return 'badge-done';
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === 'done') return false;
  return new Date(dueDate) < new Date(new Date().toISOString().split('T')[0]);
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US');
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US');
}

interface TaskFormData {
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date?: string;
  assignee_ids: number[];
  labelIds: number[];
}

/* ---- StatusBadge ---- */
function StatusBadge({ status }: { readonly status: string }) {
  return <span className={`badge ${statusBadgeClass(status)}`}>{statusLabel(status)}</span>;
}

function PriorityBadge({ priority }: { readonly priority: string }) {
  return <span className={`badge badge-priority-${priority}`}>{priorityLabel(priority)}</span>;
}

/* ---- Task Form ---- */
interface TaskFormProps {
  readonly initial?: Partial<Task>;
  readonly allLabels: Label[];
  readonly taskLabels?: Label[];
  readonly users: { id: number; username: string }[];
  readonly onSave: (data: TaskFormData) => Promise<void>;
  readonly onCancel: () => void;
}

type TaskStatus = NonNullable<Task['status']>;

function TaskForm({ initial, allLabels, taskLabels, users, onSave, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'todo');
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '');
  const [assigneeIds, setAssigneeIds] = useState<number[]>(
    initial?.assigned_users?.map(u => u.id) ?? []
  );
  const [selectedLabels, setSelectedLabels] = useState<number[]>(taskLabels?.map(l => l.id) ?? []);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSave({
        title, description, status, priority,
        due_date: dueDate || undefined,
        assignee_ids: assigneeIds,
        labelIds: selectedLabels,
      });
    } catch (err: unknown) {
      const e = err as { body?: { errors?: { message: string }[] } };
      const errs = e.body?.errors;
      setError(errs ? errs.map((x) => x.message).join(', ') : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleLabel = (id: number) => {
    setSelectedLabels(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="task-title">Title *</label>
        <input id="task-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" required />
      </div>
      <div className="form-group">
        <label htmlFor="task-description">Description</label>
        <textarea id="task-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="task-status">Status</label>
          <select id="task-status" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Completed</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="task-priority">Priority</label>
          <select id="task-priority" value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="task-due-date">Due Date</label>
          <input id="task-due-date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="task-assignees">Assignees (Optional)</label>
          <div id="task-assignees" style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', background: 'var(--bg-card)' }}>
            {users.map(u => (
              <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0, fontWeight: 'normal', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={assigneeIds.includes(u.id)}
                  onChange={(e) => {
                    if (e.target.checked) setAssigneeIds([...assigneeIds, u.id]);
                    else setAssigneeIds(assigneeIds.filter(id => id !== u.id));
                  }}
                />
                {u.username}
              </label>
            ))}
          </div>
        </div>
      </div>
      {allLabels.length > 0 && (
        <div className="form-group">
          <label htmlFor="task-labels">Labels</label>
          <div id="task-labels" className="label-picker">
            {allLabels.map(l => (
              <button
                key={l.id}
                type="button"
                className={`label-chip ${selectedLabels.includes(l.id) ? 'label-chip-selected' : ''}`}
                style={{ '--label-color': l.color } as CSSProperties}
                onClick={() => toggleLabel(l.id)}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <div className="error">{error}</div>}
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

/* ---- Task Detail Modal ---- */
interface TaskDetailProps {
  readonly task: Task;
  readonly onClose: () => void;
}

function TaskDetail({ task, onClose }: TaskDetailProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [newComment, setNewComment] = useState('');
  const [tab, setTab] = useState<'comments' | 'activity' | 'subtasks'>('comments');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.comments.list(task.id).then(setComments).catch(console.error);
    api.tasks.activities(task.id).then(setActivities).catch(console.error);
    api.tasks.subtasks(task.id).then(setSubtasks).catch(console.error);
    api.tasks.labels(task.id).then(setLabels).catch(console.error);
  }, [task.id]);

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      await api.comments.create(task.id, newComment);
      setNewComment('');
      const updated = await api.comments.list(task.id);
      setComments(updated);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleDeleteComment = async (commentId: number) => {
    await api.comments.delete(task.id, commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  return (
    <div className="modal-overlay">
      <button type="button" className="modal-overlay-backdrop" aria-label="Close" onClick={onClose} />
      <div
        className="modal modal-detail"
        aria-modal="true"
        aria-labelledby="task-detail-title"
      >
        <div className="detail-header">
          <h3 id="task-detail-title">{task.title}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="detail-badges">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {task.due_date && (
            <span className={`badge badge-due ${isOverdue(task.due_date, task.status) ? 'badge-overdue' : ''}`}>
              {isOverdue(task.due_date, task.status) ? 'Overdue: ' : 'Due: '}{formatDate(task.due_date)}
            </span>
          )}
        </div>

        {labels.length > 0 && (
          <div className="detail-labels">
            {labels.map(l => (
              <span key={l.id} className="label-tag" style={{ background: l.color + '22', color: l.color, borderColor: l.color + '55' }}>
                {l.name}
              </span>
            ))}
          </div>
        )}

        {task.description && <p className="detail-desc">{task.description}</p>}

        <div className="detail-meta">
          <span>{timeAgo(task.created_at)}</span>
        </div>

        <div className="detail-tabs">
          <button className={`tab-btn ${tab === 'comments' ? 'tab-active' : ''}`} onClick={() => setTab('comments')}>
            Comments ({comments.length})
          </button>
          <button className={`tab-btn ${tab === 'subtasks' ? 'tab-active' : ''}`} onClick={() => setTab('subtasks')}>
            Subtasks ({subtasks.length})
          </button>
          <button className={`tab-btn ${tab === 'activity' ? 'tab-active' : ''}`} onClick={() => setTab('activity')}>
            History ({activities.length})
          </button>
        </div>

        <div className="detail-tab-content">
          {tab === 'comments' && (
            <div className="comments-section">
              {comments.length === 0 && <div className="empty-tab">No comments yet</div>}
              {comments.map(c => (
                <div key={c.id} className="comment-item">
                  <div className="comment-header">
                    <strong>{c.username}</strong>
                    <span className="comment-time">{timeAgo(c.created_at)}</span>
                    <button className="comment-delete" onClick={() => handleDeleteComment(c.id)}>Delete</button>
                  </div>
                  <p>{c.content}</p>
                </div>
              ))}
              <form className="comment-form" onSubmit={handleAddComment}>
                <label htmlFor="new-comment-input" className="visually-hidden">Comment</label>
                <input
                  id="new-comment-input"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  required
                />
                <button type="submit" className="btn btn-sm btn-primary" style={{ width: 'auto', marginTop: 0, padding: '0.5rem 1rem' }} disabled={loading}>
                  Send
                </button>
              </form>
            </div>
          )}

          {tab === 'subtasks' && (
            <div className="subtasks-section">
              {subtasks.length === 0 && <div className="empty-tab">No subtasks</div>}
              {subtasks.map(st => (
                <div key={st.id} className="subtask-item">
                  <span className={`subtask-check ${st.status === 'done' ? 'subtask-done' : ''}`} style={{ display: 'flex', alignItems: 'center' }}>
                    {st.status === 'done'
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
                    }
                  </span>
                  <span className={st.status === 'done' ? 'subtask-title-done' : ''}>{st.title}</span>
                  <StatusBadge status={st.status} />
                </div>
              ))}
              {subtasks.length > 0 && (
                <div className="subtask-progress">
                  {subtasks.filter(s => s.status === 'done').length}/{subtasks.length} completed
                </div>
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div className="activity-section">
              {activities.length === 0 && <div className="empty-tab">No activity history</div>}
              {activities.map(a => (
                <div key={a.id} className="activity-item">
                  <div className="activity-dot"></div>
                  <div className="activity-content">
                    <strong>{a.username}</strong> <span className="activity-action">{a.action}</span>
                    {a.detail && <span className="activity-detail"> - {a.detail}</span>}
                    <div className="activity-time">{timeAgo(a.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Main TasksPage ---- */
export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectMembers, setNewProjectMembers] = useState<number[]>([]);
  const [activeProjectMembers, setActiveProjectMembers] = useState<{ id: number; username: string }[]>([]);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [users, setUsers] = useState<{ id: number; username: string }[]>([]);
  const [currentUser, setCurrentUser] = useState<{ userId: number; role: string; username: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [editLabels, setEditLabels] = useState<Label[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* Keyboard Shortcuts */
  const handleKeyDown = useCallback((e: globalThis.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

    if (e.key === 'Escape') {
      setShowCreate(false);
      setEditTask(null);
      setDetailTask(null);
      setShowProjectModal(false);
      setShowManageMembersModal(false);
      return;
    }

    if (isInput) return;

    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      setShowCreate(true);
      return;
    }
    if (e.key === '/') {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const loadTasks = useCallback(() => {
    setLoading(true);
    const filters: Record<string, string> = { label: filterLabel };
    if (selectedProjectId !== null) {
      filters.project_id = selectedProjectId.toString();
    }
    api.tasks.list(filters)
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterLabel, selectedProjectId]);

  /* Quick Add */
  const handleQuickAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;
    setQuickAddLoading(true);
    try {
      const taskData: { title: string; project_id?: number } = { title: quickAddTitle.trim() };
      if (selectedProjectId !== null) taskData.project_id = selectedProjectId;
      await api.tasks.create(taskData);
      setQuickAddTitle('');
      loadTasks();
    } catch { /* ignore */ }
    setQuickAddLoading(false);
  };

  /* CSV Export */
  const exportTasksCSV = () => {
    const header = 'ID,Title,Status,Priority,Due Date,Created At\n';
    const rows = filteredTasks.map(t => {
      const due = t.due_date ? formatDate(t.due_date) : '-';
      const created = formatDate(t.created_at);
      return `${t.id},"${t.title}","${statusLabel(t.status)}","${priorityLabel(t.priority)}","${due}","${created}"`;
    }).join('\n');
    const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadProjects = () => {
    api.projects.list().then(setProjects).catch(console.error);
  };

  useEffect(() => {
    Promise.all([
      api.projects.list().then(setProjects),
      api.labels.list().then(setAllLabels),
      api.auth.users().then(setUsers).catch(() => {
        return [] as { id: number; username: string }[];
      }),
      api.auth.me().then(setCurrentUser).catch(() => setCurrentUser(null)),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTasks();
    if (selectedProjectId) {
      api.projects.members(selectedProjectId)
        .then(setActiveProjectMembers)
        .catch(console.error);
    } else {
      setActiveProjectMembers([]);
    }
  }, [loadTasks, selectedProjectId]);

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const p = await api.projects.create(newProjectName);
      let additionFailed = false;
      for (const uid of newProjectMembers) {
        try {
          await api.projects.addMember(p.id, uid);
        } catch (err: unknown) {
          console.error("Failed to add member", uid, err);
          additionFailed = true;
        }
      }
      if (additionFailed) {
        alert("Some members could not be added. Please check your project.");
      }
      loadProjects();
      setNewProjectName('');
      setNewProjectMembers([]);
      setShowProjectModal(false);
      setSelectedProjectId(p.id);

      const mems = await api.projects.members(p.id).catch(() => []);
      setActiveProjectMembers(mems);
    } catch { /* ignore */ }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('Are you sure you want to delete this project and all its tasks?')) return;
    await api.projects.delete(id);
    if (selectedProjectId === id) setSelectedProjectId(null);
    loadProjects();
  };

  const handleCreate = async (data: TaskFormData) => {
    const { labelIds, ...taskData } = data;
    const payload: Omit<TaskFormData, 'labelIds'> & { project_id?: number } = { ...taskData };
    if (selectedProjectId !== null) {
      payload.project_id = selectedProjectId;
    }
    const created = await api.tasks.create(payload);
    if (labelIds?.length) {
      for (const lid of labelIds) {
        await api.labels.addToTask(created.id, lid);
      }
    }
    setShowCreate(false);
    loadTasks();
  };

  const handleUpdate = async (data: TaskFormData) => {
    if (!editTask) return;
    const { labelIds, ...taskData } = data;
    await api.tasks.update(editTask.id, taskData);

    const currentLabels = editLabels.map(l => l.id);
    const toAdd = (labelIds ?? []).filter((id: number) => !currentLabels.includes(id));
    const toRemove = currentLabels.filter(id => !(labelIds ?? []).includes(id));
    for (const lid of toAdd) await api.labels.addToTask(editTask.id, lid);
    for (const lid of toRemove) await api.labels.removeFromTask(editTask.id, lid);

    setEditTask(null);
    loadTasks();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    const el = document.getElementById(`task-${id}`);
    if (el) el.classList.add('task-deleting');
    await new Promise(r => setTimeout(r, 200));
    await api.tasks.delete(id);
    loadTasks();
  };

  const handleEdit = async (task: Task) => {
    const labels = await api.tasks.labels(task.id);
    setEditLabels(labels);
    setEditTask(task);
  };

  /* Drag & Drop */
  const handleDragStart = (e: DragEvent, taskId: number) => {
    setDraggedId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedId === null) return;
    const task = tasks.find(t => t.id === draggedId);
    if (task && task.status !== newStatus) {
      await api.tasks.update(draggedId, { status: newStatus });
      loadTasks();
    }
    setDraggedId(null);
  };

  /* Filtering */
  const filteredTasks = tasks.filter(task => {
    if (task.parent_id) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(q) && !(task.description ?? '').toLowerCase().includes(q)) return false;
    }
    if (filterPriority && task.priority !== filterPriority) return false;
    return true;
  });

  const todoCount = filteredTasks.filter(t => t.status === 'todo').length;
  const inProgressCount = filteredTasks.filter(t => t.status === 'in-progress').length;
  const doneCount = filteredTasks.filter(t => t.status === 'done').length;
  const completionRate = filteredTasks.length > 0 ? Math.round((doneCount / filteredTasks.length) * 100) : 0;
  const overdueCount = tasks.filter(t => isOverdue(t.due_date, t.status)).length;
  const currentProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;
  const currentProjectName = currentProject?.name ?? 'All Tasks';

  return (
    <div className="tasks-page-layout">
      {/* Mobile Hamburger */}
      <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menu">
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`projects-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h3>Projects</h3>
          <button className="btn-icon" onClick={() => setShowProjectModal(true)} title="Create New Project">
            <Plus size={18} />
          </button>
        </div>
        <div className="project-list">
          <button
            type="button"
            className={`project-item ${selectedProjectId === null ? 'active' : ''}`}
            onClick={() => { setSelectedProjectId(null); setSidebarOpen(false); }}
          >
            <Globe size={18} className="project-icon" />
            <span className="project-name">All Tasks</span>
          </button>
          {projects.map(p => (
            <div key={p.id} className={`project-item ${selectedProjectId === p.id ? 'active' : ''}`}>
              <button
                type="button"
                className="project-item-main"
                onClick={() => { setSelectedProjectId(p.id); setSidebarOpen(false); }}
              >
                <Folder size={18} className="project-icon" />
                <span className="project-name">{p.name}</span>
              </button>
              <button
                type="button"
                className="project-delete-btn"
                onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }}
                title="Delete Project"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="tasks-main-content">
        <div className="page-header">
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <LayoutGrid size={24} className="text-secondary" />
              {currentProjectName}
              <span className="task-count-badge">{tasks.filter(t => !t.parent_id).length}</span>
            </h2>
            {selectedProjectId && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Project Members:</span>
                {activeProjectMembers.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Only you</span>
                ) : (
                  <div className="avatar-group">
                    {activeProjectMembers.map(m => (
                      <div
                        key={m.id}
                        title={m.username}
                        className="avatar-small"
                      >
                        {m.username.substring(0, 2).toUpperCase()}
                      </div>
                    ))}
                  </div>
                )}
                {(currentUser?.role === 'admin' || currentProject?.user_id === currentUser?.userId) && (
                  <button className="btn-text-sm" onClick={() => setShowManageMembersModal(true)}>Manage Members</button>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button className="btn-outline-pill" onClick={exportTasksCSV} title="CSV İndir">
              <Download size={16} />
              <span>Export CSV</span>
            </button>
            <button className="btn-primary-gradient" onClick={() => setShowCreate(true)}>
              <Plus size={18} />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="kanban-board">
            {[1, 2, 3].map(col => (
              <div key={col} className="kanban-column">
                <div className="skeleton-box" style={{ height: '32px', width: '140px', marginBottom: '1.5rem', borderRadius: '8px' }} />
                <div className="skeleton-box skeleton-card" />
                <div className="skeleton-box skeleton-card" style={{ animationDelay: '0.1s' }} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="task-stats-grid">
              <div className="task-stat-card">
                <div className="task-stat-icon bg-orange">
                  <Clock size={24} />
                </div>
                <div className="task-stat-info">
                  <span className="task-stat-number">{todoCount}</span>
                  <span className="task-stat-label">To Do</span>
                </div>
              </div>
              <div className="task-stat-card">
                <div className="task-stat-icon bg-blue">
                  <Activity size={24} />
                </div>
                <div className="task-stat-info">
                  <span className="task-stat-number">{inProgressCount}</span>
                  <span className="task-stat-label">In Progress</span>
                </div>
              </div>
              <div className="task-stat-card">
                <div className="task-stat-icon bg-green">
                  <CheckCircle2 size={24} />
                </div>
                <div className="task-stat-info">
                  <span className="task-stat-number">{doneCount}</span>
                  <span className="task-stat-label">Completed</span>
                </div>
              </div>
              <div className="task-stat-card">
                <div className="task-stat-icon bg-purple">
                  <BarChart3 size={24} />
                </div>
                <div className="task-stat-info">
                  <span className="task-stat-number">{completionRate}%</span>
                  <span className="task-stat-label">Completion</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${completionRate}%` }} />
                </div>
              </div>
            </div>

            {overdueCount > 0 && (
              <div className="overdue-alert">
                <AlertTriangle size={18} />
                <span>{overdueCount} tasks overdue!</span>
              </div>
            )}

            {/* Quick Add */}
            <form className="quick-add-form" onSubmit={handleQuickAdd}>
              <div className="quick-add-container">
                <Plus size={18} className="quick-add-icon" />
                <label htmlFor="quick-add-input" className="visually-hidden">Quick add task</label>
                <input
                  id="quick-add-input"
                  className="quick-add-input"
                  type="text"
                  placeholder="Quick add task... (press Enter to create)"
                  value={quickAddTitle}
                  onChange={e => setQuickAddTitle(e.target.value)}
                  disabled={quickAddLoading}
                />
                {quickAddTitle.trim() && (
                  <button type="submit" className="quick-add-btn" disabled={quickAddLoading}>
                    {quickAddLoading ? <div className="spinner-xs" /> : <Check size={18} />}
                  </button>
                )}
              </div>
            </form>

            {/* Filter Bar */}
            <div className="filter-bar">
              <div className="search-container-modern">
                <Search size={18} className="search-icon-lucide" />
                <label htmlFor="task-search-input" className="visually-hidden">Search tasks</label>
                <input
                  id="task-search-input"
                  ref={searchInputRef}
                  type="text"
                  className="search-input-modern"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="filter-actions">
                <label htmlFor="filter-priority" className="visually-hidden">Filter by priority</label>
                <select id="filter-priority" className="filter-select-modern" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                  <option value="">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                {allLabels.length > 0 && (
                  <>
                    <label htmlFor="filter-label" className="visually-hidden">Filter by label</label>
                    <select id="filter-label" className="filter-select-modern" value={filterLabel} onChange={e => setFilterLabel(e.target.value)}>
                      <option value="">All Labels</option>
                      {allLabels.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                    </select>
                  </>
                )}
              </div>
            </div>

            {searchQuery && (
              <div className="search-results-info">
                <Search size={14} />
                <span>&quot;{searchQuery}&quot; returned <strong>{filteredTasks.length}</strong> results</span>
              </div>
            )}

            {tasks.length === 0 && (
              <div className="empty-state-modern">
                <div className="empty-state-icon">
                  <List size={48} />
                </div>
                <h3>No tasks yet!</h3>
                <p>Create your first task to start accomplishing great things.</p>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop: '1rem' }}>
                  Create Task
                </button>
              </div>
            )}

            {/* Kanban Board with Drag & Drop */}
            <div className="kanban-board">
              {[
                { id: 'todo', label: 'To Do', filter: 'todo', icon: <Circle size={18} className="text-orange" /> },
                { id: 'in-progress', label: 'In Progress', filter: 'in-progress', icon: <Activity size={18} className="text-blue" /> },
                { id: 'done', label: 'Completed', filter: 'done', icon: <CheckCircle2 size={18} className="text-green" /> }
              ].map(col => (
                <section
                  className="kanban-column"
                  key={col.id}
                  aria-label={`${col.label} kolonu`}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, col.filter)}
                >
                  <h3 className="column-title">
                    <span className="flex items-center gap-2">
                      {col.icon}
                      {col.label}
                    </span>
                    <span className="column-count">{filteredTasks.filter(t => t.status === col.filter).length}</span>
                  </h3>
                  <div className="kanban-task-list">
                    {filteredTasks.filter(task => task.status === col.filter).map((task, index) => (
                      <article
                        id={`task-${task.id}`}
                        className={`task-card-modern prio-${task.priority} ${isOverdue(task.due_date, task.status) ? 'overdue' : ''} ${draggedId === task.id ? 'dragging' : ''}`}
                        style={{ animationDelay: `${index * 50}ms` }}
                        key={task.id}
                        draggable
                        onDragStart={e => handleDragStart(e, task.id)}
                      >
                        <button
                          type="button"
                          className="task-card-stretch"
                          aria-label={`Open ${task.title} details`}
                          onClick={() => setDetailTask(task)}
                        />
                        <div className="task-card-header">
                          <PriorityBadge priority={task.priority} />
                          {task.due_date && (
                            <span className={`due-date-badge ${isOverdue(task.due_date, task.status) ? 'overdue' : ''}`}>
                              <Calendar size={12} />
                              {formatDate(task.due_date)}
                            </span>
                          )}
                        </div>
                        <h4 className="task-card-title">{task.title}</h4>
                        {task.description && <p className="task-card-desc">{task.description}</p>}
                        <div className="task-card-footer-modern" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span className="task-time">
                              <Clock size={12} />
                              {timeAgo(task.created_at)}
                            </span>
                            {task.assigned_users && task.assigned_users.length > 0 && (
                              <div className="avatar-group" style={{ marginLeft: '0.5rem' }}>
                                {task.assigned_users.slice(0, 3).map(u => (
                                  <div key={u.id} title={u.username} className="avatar-small">
                                    {u.username.substring(0, 2).toUpperCase()}
                                  </div>
                                ))}
                                {task.assigned_users.length > 3 && (
                                  <div className="avatar-small" style={{ background: 'var(--bg-subtle)' }}>
                                    +{task.assigned_users.length - 3}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="task-actions-overlay">
                            <button className="icon-btn-sm" onClick={(e) => { e.stopPropagation(); handleEdit(task); }} title="Edit">
                              <MoreVertical size={16} />
                            </button>
                            <button className="icon-btn-sm text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                    {filteredTasks.filter(task => task.status === col.filter).length === 0 && (
                      <div className="column-empty">
                        <Plus size={16} className="text-muted mb-1" />
                        No tasks
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreate || editTask) && (
        <div className="modal-overlay">
          <button
            type="button"
            className="modal-overlay-backdrop"
            aria-label="Kapat"
            onClick={() => { setShowCreate(false); setEditTask(null); }}
          />
          <div
            className="modal"
            aria-modal="true"
            aria-labelledby="task-modal-title"
          >
            <h3 id="task-modal-title">{editTask ? 'Edit Task' : 'New Task'}</h3>
            <TaskForm
              initial={editTask ?? undefined}
              allLabels={allLabels}
              taskLabels={editTask ? editLabels : []}
              users={users}
              onSave={editTask ? handleUpdate : handleCreate}
              onCancel={() => { setShowCreate(false); setEditTask(null); }}
            />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailTask && (
        <TaskDetail
          task={detailTask}
          onClose={() => setDetailTask(null)}
        />
      )}

      {/* Manage Members Modal */}
      {showManageMembersModal && selectedProjectId && (
        <div className="modal-overlay">
          <button
            type="button"
            className="modal-overlay-backdrop"
            aria-label="Kapat"
            onClick={() => setShowManageMembersModal(false)}
          />
          <div
            className="modal"
            aria-modal="true"
            aria-labelledby="manage-members-title"
            style={{ maxWidth: '400px' }}
          >
            <h3 id="manage-members-title">Manage Project</h3>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label htmlFor="members-list">Edit Members</label>
              <div id="members-list" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--bg-card)' }}>
                {users.map(u => {
                  const isMember = activeProjectMembers.some(m => m.id === u.id);
                  const isProjectOwner = currentProject?.user_id === u.id;
                  return (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0, fontWeight: 'normal', fontSize: '0.9rem', opacity: isProjectOwner ? 0.6 : 1 }}>
                      <input
                        type="checkbox"
                        checked={isMember || isProjectOwner}
                        disabled={isProjectOwner}
                        onChange={async (e) => {
                          try {
                            if (e.target.checked) {
                              await api.projects.addMember(selectedProjectId, u.id);
                            } else {
                              await api.projects.removeMember(selectedProjectId, u.id);
                            }
                            const updatedMems = await api.projects.members(selectedProjectId);
                            setActiveProjectMembers(updatedMems);
                          } catch (err) {
                            console.error(err);
                            alert("Operation failed. You may not have permission.");
                          }
                        }}
                      />
                      {u.username} {isProjectOwner ? '(Owner)' : ''}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-primary" onClick={() => setShowManageMembersModal(false)} style={{ width: '100%' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <div className="modal-overlay">
          <button
            type="button"
            className="modal-overlay-backdrop"
            aria-label="Kapat"
            onClick={() => setShowProjectModal(false)}
          />
          <div
            className="modal"
            aria-modal="true"
            aria-labelledby="project-modal-title"
            style={{ maxWidth: '400px' }}
          >
            <h3 id="project-modal-title">Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label htmlFor="new-project-name">Project Name *</label>
                <input
                  id="new-project-name"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="Project name"
                  autoFocus
                  required
                />
              </div>
              {users.length > 0 && (
                <div className="form-group">
                  <label htmlFor="new-project-members">Add Members (Optional)</label>
                  <div id="new-project-members" style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--bg-card)' }}>
                    {users.map(u => (
                      <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0, fontWeight: 'normal', fontSize: '0.9rem' }}>
                        <input
                          type="checkbox"
                          checked={newProjectMembers.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) setNewProjectMembers([...newProjectMembers, u.id]);
                            else setNewProjectMembers(newProjectMembers.filter(id => id !== u.id));
                          }}
                        />
                        {u.username} {currentUser?.userId === u.id ? '(You - Auto Added)' : ''}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowProjectModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
