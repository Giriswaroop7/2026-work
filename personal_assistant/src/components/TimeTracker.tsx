import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Clock } from 'lucide-react'
import { useElectronAPI } from '../hooks/useElectronAPI'
import { getAllTasks } from '../db/database'
import type { Task, TimeEntry, ToastItem } from '../types'

interface Props {
  showToast: (msg: string, type: ToastItem['type']) => void
}

export default function TimeTracker({ showToast }: Props) {
  const { call, api } = useElectronAPI(showToast)
  const now = new Date()
  const [date, setDate] = useState(now.toISOString().split('T')[0])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)

  // Form state
  const [taskId, setTaskId] = useState<string>('none')
  const [hours, setHours] = useState('')
  const [notes, setNotes] = useState('')
  const [adding, setAdding] = useState(false)

  const totalHours = entries.reduce((s, e) => s + e.hours, 0)

  async function loadEntries(d: string) {
    setLoading(true)
    const result = await call(() => api.getTimeEntries(d), 'Failed to load entries')
    if (result) setEntries(result as TimeEntry[])
    setLoading(false)
  }

  async function loadAllTasks() {
    const results = await getAllTasks()
    setTasks(results)
  }

  useEffect(() => {
    loadAllTasks()
  }, [])

  useEffect(() => {
    loadEntries(date)
  }, [date])

  async function handleAdd() {
    const h = parseFloat(hours)
    if (isNaN(h) || h <= 0 || h > 24) {
      showToast('Enter valid hours (0.25 – 24)', 'error')
      return
    }
    setAdding(true)
    const result = await call(
      () =>
        api.createTimeEntry({
          task_id: taskId === 'none' ? null : Number(taskId),
          date,
          hours: h,
          notes: notes.trim()
        }),
      'Failed to log entry'
    )
    if (result) {
      setEntries((prev) => [...prev, result as TimeEntry])
      setHours('')
      setNotes('')
      setTaskId('none')
      showToast('Time logged!', 'success')
    }
    setAdding(false)
  }

  async function handleDelete(id: number) {
    const ok = await call(() => api.deleteTimeEntry(id), 'Failed to delete entry')
    if (ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id))
      showToast('Entry removed', 'info')
    }
  }

  return (
    <div className="tracker-layout animate-fade-in-up">
      {/* Date picker */}
      <div className="card tracker-date-card">
        <div className="controls-row">
          <Clock size={18} className="icon-cyan" />
          <label className="form-label">Date</label>
          <input
            type="date"
            className="input-field date-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button className="btn-ghost" onClick={() => loadEntries(date)}>Refresh</button>
        </div>
      </div>

      {/* Add entry form */}
      <div className="card">
        <div className="card-header"><Plus size={16} /> Log Time Entry</div>
        <div className="tracker-form">
          <div className="form-group">
            <label className="form-label">Task (optional)</label>
            <select
              className="select-field"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
            >
              <option value="none">— No specific task —</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
          <div className="tracker-form-row">
            <div className="form-group">
              <label className="form-label">Hours *</label>
              <input
                type="number"
                className="input-field"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. 1.5"
                min="0.25"
                max="24"
                step="0.25"
              />
            </div>
            <div className="form-group flex-grow">
              <label className="form-label">Notes</label>
              <input
                className="input-field"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you work on?"
              />
            </div>
          </div>
          <button className="btn-primary" onClick={handleAdd} disabled={adding}>
            <Plus size={16} /> {adding ? 'Logging…' : 'Log Hours'}
          </button>
        </div>
      </div>

      {/* Entries list */}
      <div className="card">
        <div className="card-header">
          <Clock size={16} />
          Entries for {date}
        </div>
        {loading ? (
          <div className="loading-state">Loading…</div>
        ) : entries.length === 0 ? (
          <p className="empty-hint">No time entries for this date yet.</p>
        ) : (
          <>
            <div className="entries-list">
              {entries.map((entry) => (
                <div key={entry.id} className="entry-row">
                  <div className="entry-info">
                    <span className="entry-task">{entry.task_title}</span>
                    {entry.notes && <span className="entry-notes">{entry.notes}</span>}
                  </div>
                  <div className="entry-right">
                    <span className="entry-hours">{entry.hours}h</span>
                    <button
                      className="btn-icon btn-danger"
                      onClick={() => handleDelete(entry.id)}
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="total-bar">
              Total: <strong>{totalHours.toFixed(2)} hours</strong>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
