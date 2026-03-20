import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useElectronAPI } from '../hooks/useElectronAPI'
import Modal from './ui/Modal'
import Badge from './ui/Badge'
import type { Task, ToastItem } from '../types'

interface Props {
  showToast: (msg: string, type: ToastItem['type']) => void
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

const YEAR_RANGE = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

function emptyForm() {
  return { title: '', description: '', priority: 'medium' as Task['priority'] }
}

export default function MonthlyPlanner({ showToast }: Props) {
  const { call, api } = useElectronAPI(showToast)
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [form, setForm] = useState(emptyForm())

  async function load() {
    setLoading(true)
    const result = await call(() => api.getTasks(month, year), 'Failed to load tasks')
    if (result) setTasks(result as Task[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [month, year])

  function openNew() {
    setEditingTask(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(task: Task) {
    setEditingTask(task)
    setForm({ title: task.title, description: task.description, priority: task.priority })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) {
      showToast('Title is required', 'error')
      return
    }
    if (editingTask) {
      const updated = await call(
        () => api.updateTask(editingTask.id, { title: form.title, description: form.description, priority: form.priority }),
        'Failed to update task'
      )
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? (updated as Task) : t)))
        showToast('Task updated!', 'success')
      }
    } else {
      const created = await call(
        () => api.createTask({ title: form.title, description: form.description, month, year, priority: form.priority }),
        'Failed to create task'
      )
      if (created) {
        setTasks((prev) => [...prev, created as Task])
        showToast('Task created!', 'success')
      }
    }
    setModalOpen(false)
  }

  async function handleDelete(id: number) {
    const ok = await call(() => api.deleteTask(id), 'Failed to delete task')
    if (ok) {
      setTasks((prev) => prev.filter((t) => t.id !== id))
      showToast('Task deleted', 'info')
    }
  }

  async function handleStatusChange(task: Task, status: Task['status']) {
    const updated = await call(
      () => api.updateTask(task.id, { status }),
      'Failed to update status'
    )
    if (updated) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? (updated as Task) : t)))
    }
  }

  return (
    <div className="planner-layout animate-fade-in-up">
      {/* Controls */}
      <div className="planner-controls card">
        <div className="controls-row">
          <select className="select-field" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select className="select-field" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {YEAR_RANGE.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-primary" onClick={load}>Load</button>
        </div>
        <button className="btn-add" onClick={openNew}>
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Tasks grid */}
      {loading ? (
        <div className="loading-state">Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <p>No tasks for {MONTHS[month - 1]} {year}.</p>
          <button className="btn-primary" onClick={openNew}><Plus size={16} /> Add your first task</button>
        </div>
      ) : (
        <div className="tasks-grid">
          {tasks.map((task) => (
            <div key={task.id} className={`task-card priority-${task.priority} status-${task.status}`}>
              <div className="task-card-header">
                <span className="task-title">{task.title}</span>
                <div className="task-actions">
                  <button className="btn-icon" title="Edit" onClick={() => openEdit(task)}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn-icon btn-danger" title="Delete" onClick={() => handleDelete(task.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {task.description && (
                <p className="task-description">{task.description}</p>
              )}
              <div className="task-card-footer">
                <Badge priority={task.priority} />
                <select
                  className="status-select"
                  value={task.status}
                  onChange={(e) => handleStatusChange(task, e.target.value as Task['status'])}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done ✓</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTask ? 'Edit Task' : 'New Task'}
      >
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input
            className="input-field"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Task title…"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="textarea-field"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional details…"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select
            className="select-field"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as Task['priority'] })}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>
            {editingTask ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
