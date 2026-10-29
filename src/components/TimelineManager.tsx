import React, { useState, useRef, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Edit2,
  ShieldAlert,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';
import { TimelineTask } from '../types';
import {
  formatDisplayDate,
  getTaskTimeStatus,
  getTodayDateString,
  evaluateTimelineCompression,
  compareDateOnly,
} from '../utils/dates';
import { validateTaskRow } from '../utils/validation';

interface TimelineManagerProps {
  tasks: TimelineTask[];
  eventDate: string;
  eventType: string;
  onUpdateTasks: (tasks: TimelineTask[]) => void;
}

export const TimelineManager: React.FC<TimelineManagerProps> = ({
  tasks,
  eventDate,
  eventType,
  onUpdateTasks,
}) => {
  const today = getTodayDateString();

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'incomplete' | 'completed' | 'overdue'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal / Drawer state for adding or editing tasks
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TimelineTask | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formDueDate, setFormDueDate] = useState(today);
  const [formOwner, setFormOwner] = useState('');
  const [formIsCritical, setFormIsCritical] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Derived categories
  const categories = Array.from(new Set(tasks.map(t => t.category).filter(Boolean)));

  // Timeline Compression check
  const compression = evaluateTimelineCompression(eventDate, eventType, today);

  const handleOpenAdd = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormCategory('General');
    setFormDueDate(today);
    setFormOwner('');
    setFormIsCritical(false);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (task: TimelineTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormCategory(task.category);
    setFormDueDate(task.dueDate);
    setFormOwner(task.owner || '');
    setFormIsCritical(Boolean(task.isCritical));
    setFormError(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTask(null);
    setFormError(null);
  };

  useEffect(() => {
    if (modalOpen) {
      setTimeout(() => titleInputRef.current?.focus(), 50);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleCloseModal();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [modalOpen]);

  const handleToggleTask = (id: string) => {
    const updated = tasks.map(t => (t.id === id ? { ...t, completed: !t.completed } : t));
    onUpdateTasks(updated);
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    onUpdateTasks(updated);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateTaskRow(formTitle, formDueDate, eventDate, today);
    if (!val.isValid) {
      setFormError(val.error || 'Please fill in a valid title and due date within planning range.');
      return;
    }

    if (editingTask) {
      const updated = tasks.map(t =>
        t.id === editingTask.id
          ? {
              ...t,
              title: formTitle.trim(),
              category: formCategory.trim() || 'General',
              dueDate: formDueDate,
              owner: formOwner.trim() || undefined,
              isCritical: formIsCritical,
            }
          : t
      );
      onUpdateTasks(updated);
    } else {
      const newTask: TimelineTask = {
        id: `task-${Date.now()}`,
        title: formTitle.trim(),
        category: formCategory.trim() || 'General',
        dueDate: formDueDate,
        owner: formOwner.trim() || undefined,
        completed: false,
        isCritical: formIsCritical,
      };
      onUpdateTasks([...tasks, newTask]);
    }

    handleCloseModal();
  };

  // Split tasks into Incomplete and Completed
  const incompleteTasks = tasks
    .filter(t => !t.completed)
    .filter(task => {
      const timeStatus = getTaskTimeStatus(task.dueDate, false, today);
      if (statusFilter === 'completed') return false;
      if (statusFilter === 'overdue' && timeStatus !== 'overdue') return false;
      if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
      return true;
    })
    .sort((a, b) => {
      // Overdue tasks prioritized first, then chronological
      const aOverdue = getTaskTimeStatus(a.dueDate, false, today) === 'overdue';
      const bOverdue = getTaskTimeStatus(b.dueDate, false, today) === 'overdue';
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return compareDateOnly(a.dueDate, b.dueDate);
    });

  const completedTasks = tasks
    .filter(t => t.completed)
    .filter(task => {
      if (statusFilter === 'incomplete' || statusFilter === 'overdue') return false;
      if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
      return true;
    })
    .sort((a, b) => compareDateOnly(a.dueDate, b.dueDate));

  const totalCompleted = tasks.filter(t => t.completed).length;
  const overdueCount = tasks.filter(
    t => !t.completed && getTaskTimeStatus(t.dueDate, false, today) === 'overdue'
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header and Add Task Action */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-sage)',
              border: '1px solid var(--forest-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <CheckSquare size={19} color="var(--forest-primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              Timeline & Preparation Checklists
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Milestones leading up to {formatDisplayDate(eventDate)}. {totalCompleted} of {tasks.length} tasks completed.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleOpenAdd}
          style={{ fontSize: '0.875rem' }}
        >
          <Plus size={16} aria-hidden="true" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Compressed Timeline Alert (Meaningful warning) */}
      {compression.isCompressed && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--amber-subtle)',
            border: '1px solid var(--amber-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
          }}
        >
          <ShieldAlert size={20} color="var(--amber-warning)" aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: 'var(--amber-text)', fontSize: '0.9375rem' }}>
              Compressed Timeline Notice ({compression.daysRemaining} days remaining)
            </strong>
            <p style={{ color: 'var(--amber-text)', fontSize: '0.875rem', marginTop: '0.15rem', lineHeight: 1.4 }}>
              {compression.recommendation} Prioritize critical items marked with the high-priority indicator.
            </p>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setStatusFilter('all')}
            style={{
              fontSize: '0.8125rem',
              padding: '0.3rem 0.65rem',
              minHeight: '32px',
              backgroundColor: statusFilter === 'all' ? 'var(--forest-subtle)' : undefined,
              borderColor: statusFilter === 'all' ? 'var(--forest-border)' : undefined,
              color: statusFilter === 'all' ? 'var(--forest-text)' : undefined,
              fontWeight: statusFilter === 'all' ? 600 : 500,
            }}
          >
            All ({tasks.length})
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setStatusFilter('incomplete')}
            style={{
              fontSize: '0.8125rem',
              padding: '0.3rem 0.65rem',
              minHeight: '32px',
              backgroundColor: statusFilter === 'incomplete' ? 'var(--forest-subtle)' : undefined,
              borderColor: statusFilter === 'incomplete' ? 'var(--forest-border)' : undefined,
              color: statusFilter === 'incomplete' ? 'var(--forest-text)' : undefined,
              fontWeight: statusFilter === 'incomplete' ? 600 : 500,
            }}
          >
            Pending ({tasks.length - totalCompleted})
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setStatusFilter('completed')}
            style={{
              fontSize: '0.8125rem',
              padding: '0.3rem 0.65rem',
              minHeight: '32px',
              backgroundColor: statusFilter === 'completed' ? 'var(--forest-subtle)' : undefined,
              borderColor: statusFilter === 'completed' ? 'var(--forest-border)' : undefined,
              color: statusFilter === 'completed' ? 'var(--forest-text)' : undefined,
              fontWeight: statusFilter === 'completed' ? 600 : 500,
            }}
          >
            Completed ({totalCompleted})
          </button>
          {overdueCount > 0 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStatusFilter('overdue')}
              style={{
                fontSize: '0.8125rem',
                padding: '0.3rem 0.65rem',
                minHeight: '32px',
                color: 'var(--red-danger)',
                backgroundColor: statusFilter === 'overdue' ? 'var(--red-subtle)' : undefined,
                borderColor: statusFilter === 'overdue' ? 'var(--red-border)' : undefined,
                fontWeight: statusFilter === 'overdue' ? 600 : 500,
              }}
            >
              Overdue ({overdueCount})
            </button>
          )}
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="task-cat-filter" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Category:
            </label>
            <select
              id="task-cat-filter"
              className="select-field"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem', minHeight: '32px', width: 'auto' }}
            >
              <option value="all">All categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Task List: Clean, subtle row separators, no bulky cards */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {incompleteTasks.length === 0 && completedTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
            <CheckSquare size={36} color="var(--forest-primary)" aria-hidden="true" style={{ margin: '0 auto 0.5rem', opacity: 0.8 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No tasks match your filter</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.2rem' }}>
              Clear the filter or click "Add Task" above to schedule a new milestone.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Prioritized Incomplete / Overdue Tasks */}
            {incompleteTasks.map(task => {
              const timeStatus = getTaskTimeStatus(task.dueDate, false, today);
              const isOverdue = timeStatus === 'overdue';

              return (
                <div
                  key={task.id}
                  style={{
                    padding: '0.85rem 1.25rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    backgroundColor: isOverdue ? 'rgba(185, 28, 28, 0.02)' : 'transparent',
                    transition: 'background-color 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task.id)}
                      aria-label={`Mark task "${task.title}" as completed`}
                      style={{
                        padding: 0,
                        minHeight: '24px',
                        minWidth: '24px',
                        color: 'var(--text-muted)',
                        background: 'none',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Square size={20} aria-hidden="true" />
                    </button>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                          {task.title}
                        </span>
                        {task.isCritical && (
                          <span className="badge badge-warning" style={{ fontSize: '0.6875rem', padding: '0.05rem 0.35rem' }}>
                            Critical
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        <span>{task.category}</span>
                        {task.owner && <span>&bull; {task.owner}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                    <span
                      className={`badge ${isOverdue ? 'badge-danger' : 'badge-neutral'}`}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {isOverdue ? `Overdue (${formatDisplayDate(task.dueDate)})` : formatDisplayDate(task.dueDate)}
                    </span>

                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => handleOpenEdit(task)}
                      aria-label={`Edit task "${task.title}"`}
                      title="Edit task"
                    >
                      <Edit2 size={15} aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => handleDeleteTask(task.id)}
                      aria-label={`Delete task "${task.title}"`}
                      title="Delete task"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Collapsible Completed Section with Count */}
            {completedTasks.length > 0 && (
              <details
                open={statusFilter === 'completed' || incompleteTasks.length === 0}
                style={{
                  borderTop: incompleteTasks.length > 0 ? '1px solid var(--border-subtle)' : 'none',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <summary
                  style={{
                    padding: '0.75rem 1.25rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    outline: 'none',
                    listStyle: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={16} color="var(--forest-primary)" aria-hidden="true" />
                    <span>Completed ({completedTasks.length})</span>
                  </div>
                  <ChevronDown size={15} aria-hidden="true" style={{ opacity: 0.7 }} />
                </summary>

                <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-surface)' }}>
                  {completedTasks.map(task => (
                    <div
                      key={task.id}
                      style={{
                        padding: '0.75rem 1.25rem',
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-3)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task.id)}
                          aria-label={`Mark task "${task.title}" as incomplete`}
                          style={{
                            padding: 0,
                            minHeight: '24px',
                            minWidth: '24px',
                            color: 'var(--forest-primary)',
                            background: 'none',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CheckSquare size={20} aria-hidden="true" />
                        </button>

                        <div style={{ minWidth: 0 }}>
                          {/* Readable completed text - not faded out */}
                          <span
                            style={{
                              fontWeight: 500,
                              color: 'var(--text-secondary)',
                              textDecoration: 'line-through',
                              fontSize: '0.9375rem',
                            }}
                          >
                            {task.title}
                          </span>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            {task.category} {task.owner ? `• ${task.owner}` : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                          Completed
                        </span>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleDeleteTask(task.id)}
                          aria-label={`Delete task "${task.title}"`}
                          title="Delete task"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Task Drawer / Dialog for Add & Edit */}
      {modalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-dialog-title"
          onClick={e => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="drawer-dialog" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 id="task-dialog-title" style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </h2>
              <button
                type="button"
                className="btn-icon"
                onClick={handleCloseModal}
                aria-label="Close dialog"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {formError && (
                  <div role="alert" className="field-error" style={{ fontSize: '0.875rem' }}>
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="task-title-input">Task Title *</label>
                  <input
                    ref={titleInputRef}
                    id="task-title-input"
                    type="text"
                    className="input-field"
                    placeholder="e.g. Confirm catering guest headcount"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label htmlFor="task-cat-input">Category</label>
                    <input
                      id="task-cat-input"
                      type="text"
                      className="input-field"
                      placeholder="e.g. Catering, Venue"
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-due-input">Due Date *</label>
                    <input
                      id="task-due-input"
                      type="date"
                      className="input-field"
                      value={formDueDate}
                      onChange={e => setFormDueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="task-owner-input">Assignee / Owner</label>
                  <input
                    id="task-owner-input"
                    type="text"
                    className="input-field"
                    placeholder="e.g. Aarav's Dad, Family Coordinator"
                    value={formOwner}
                    onChange={e => setFormOwner(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input
                    id="task-critical-input"
                    type="checkbox"
                    checked={formIsCritical}
                    onChange={e => setFormIsCritical(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--forest-primary)' }}
                  />
                  <label htmlFor="task-critical-input" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Mark as critical milestone task
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  <Check size={16} aria-hidden="true" />
                  <span>{editingTask ? 'Save Changes' : 'Add Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
