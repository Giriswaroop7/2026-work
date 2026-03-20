import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Bell, BellOff } from 'lucide-react'
import { useElectronAPI } from '../hooks/useElectronAPI'
import Modal from './ui/Modal'
import type { Reminder, ToastItem } from '../types'

interface Props {
  showToast: (msg: string, type: ToastItem['type']) => void
}

function emptyForm() {
  const d = new Date()
  d.setMinutes(d.getMinutes() + 5)
  return {
    title: '',
    message: '',
    reminder_time: d.toISOString().slice(0, 16),
    repeat: 'none' as Reminder['repeat']
  }
}

export default function Reminders({ showToast }: Props) {
  const { call, api } = useElectronAPI(showToast)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const result = await call(() => api.getReminders(), 'Failed to load reminders')
    if (result) setReminders(result as Reminder[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate() {
    if (!form.title.trim()) {
      showToast('Title is required', 'error')
      return
    }
    setSaving(true)
    const result = await call(() => api.createReminder(form), 'Failed to create reminder')
    if (result) {
      setReminders((prev) => [result as Reminder, ...prev])
      showToast('Reminder set!', 'success')
      setModalOpen(false)
      setForm(emptyForm())
    }
    setSaving(false)
  }

  async function handleToggle(r: Reminder) {
    const updated = await call(
      () => api.updateReminder(r.id, { is_active: r.is_active ? 0 : 1 }),
      'Failed to update reminder'
    )
    if (updated) {
      setReminders((prev) => prev.map((x) => (x.id === r.id ? (updated as Reminder) : x)))
      showToast(r.is_active ? 'Reminder paused' : 'Reminder activated', 'info')
    }
  }

  async function handleDelete(id: number) {
    const ok = await call(() => api.deleteReminder(id), 'Failed to delete reminder')
    if (ok) {
      setReminders((prev) => prev.filter((r) => r.id !== id))
      showToast('Reminder deleted', 'info')
    }
  }

  function formatTime(t: string) {
    try {
      return new Date(t).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    } catch {
      return t
    }
  }

  const repeatLabels: Record<string, string> = { none: 'Once', daily: 'Daily', weekly: 'Weekly' }

  return (
    <div className="reminders-layout animate-fade-in-up">
      <div className="card">
        <div className="section-header">
          <div className="card-header"><Bell size={18} /> Reminders</div>
          <button className="btn-primary" onClick={() => { setForm(emptyForm()); setModalOpen(true) }}>
            <Plus size={16} /> New Reminder
          </button>
        </div>

        {loading ? (
          <div className="loading-state">Loading…</div>
        ) : reminders.length === 0 ? (
          <div className="empty-state">
            <p>No reminders set. Add one to get desktop notifications!</p>
          </div>
        ) : (
          <div className="reminders-list">
            {reminders.map((r) => (
              <div
                key={r.id}
                className={`reminder-row ${r.is_active ? 'reminder-active' : 'reminder-inactive'}`}
              >
                <div className="reminder-icon">
                  {r.is_active ? <Bell size={20} className="icon-pink" /> : <BellOff size={20} className="icon-muted" />}
                </div>
                <div className="reminder-info">
                  <span className="reminder-title">{r.title}</span>
                  {r.message && <span className="reminder-message">{r.message}</span>}
                  <div className="reminder-meta">
                    <span className="reminder-time">{formatTime(r.reminder_time)}</span>
                    <span className="reminder-repeat">{repeatLabels[r.repeat] ?? r.repeat}</span>
                  </div>
                </div>
                <div className="reminder-actions">
                  <button
                    className={`btn-toggle ${r.is_active ? 'toggle-on' : 'toggle-off'}`}
                    onClick={() => handleToggle(r)}
                    title={r.is_active ? 'Pause' : 'Activate'}
                  >
                    {r.is_active ? 'Active' : 'Paused'}
                  </button>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => handleDelete(r.id)}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Reminder">
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input
            className="input-field"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Reminder title…"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">Message (optional)</label>
          <input
            className="input-field"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Optional details…"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Date & Time *</label>
          <input
            type="datetime-local"
            className="input-field"
            value={form.reminder_time}
            onChange={(e) => setForm({ ...form, reminder_time: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Repeat</label>
          <select
            className="select-field"
            value={form.repeat}
            onChange={(e) => setForm({ ...form, repeat: e.target.value as Reminder['repeat'] })}
          >
            <option value="none">Once (no repeat)</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? 'Setting…' : 'Set Reminder'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
