import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Save, BookOpen, CalendarDays, Clock, Pencil, Trash2, Check, X } from 'lucide-react'
import { useElectronAPI } from '../hooks/useElectronAPI'
import { getAllLogs, updateLogDate, deleteLog } from '../db/database'
import type { DailyLog as DailyLogType, ToastItem } from '../types'

interface Props {
  showToast: (msg: string, type: ToastItem['type']) => void
}

function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function previewText(summary: string): string {
  const firstLine = summary.split('\n')[0].trim()
  return firstLine.length > 72 ? firstLine.slice(0, 72) + '…' : firstLine
}

export default function DailyLog({ showToast }: Props) {
  const { call, api } = useElectronAPI(showToast)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState('')
  const [savedLog, setSavedLog] = useState<DailyLogType | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<DailyLogType[]>([])

  // Per-item edit-date state: id → draft date string
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDateDraft, setEditDateDraft] = useState('')
  const dateInputRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().split('T')[0]

  const refreshHistory = useCallback(async () => {
    const all = await getAllLogs()
    setHistory(all)
  }, [])

  async function loadLog(d: string) {
    setLoading(true)
    const result = await call(() => api.getLog(d), 'Failed to load log')
    if (result !== null) {
      setSavedLog(result)
      setSummary(result?.summary ?? '')
    } else {
      setSavedLog(null)
      setSummary('')
    }
    setLoading(false)
  }

  useEffect(() => { loadLog(date) }, [date])
  useEffect(() => { refreshHistory() }, [])

  // Focus the date input when edit mode opens
  useEffect(() => {
    if (editingId !== null) dateInputRef.current?.focus()
  }, [editingId])

  async function handleSave() {
    if (!summary.trim()) { showToast('Log cannot be empty', 'error'); return }
    setSaving(true)
    const result = await call(() => api.upsertLog(date, summary.trim()), 'Failed to save log')
    if (result) {
      setSavedLog(result as DailyLogType)
      showToast('Log saved!', 'success')
      refreshHistory()
    }
    setSaving(false)
  }

  function startEditDate(log: DailyLogType, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(log.id)
    setEditDateDraft(log.date)
  }

  function cancelEditDate(e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(null)
    setEditDateDraft('')
  }

  async function confirmEditDate(log: DailyLogType, e: React.MouseEvent) {
    e.stopPropagation()
    if (!editDateDraft || editDateDraft === log.date) { setEditingId(null); return }
    try {
      await updateLogDate(log.id, editDateDraft)
      showToast(`Log moved to ${editDateDraft}`, 'success')
      // If we were viewing that log, follow it to the new date
      if (date === log.date) setDate(editDateDraft)
      setEditingId(null)
      refreshHistory()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update date', 'error')
    }
  }

  async function handleDeleteLog(log: DailyLogType, e: React.MouseEvent) {
    e.stopPropagation()
    await deleteLog(log.id)
    showToast('Log deleted', 'info')
    // If the deleted log was the one being viewed, clear the editor
    if (date === log.date) {
      setSavedLog(null)
      setSummary('')
    }
    refreshHistory()
  }

  const wordCount = summary.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="log-layout animate-fade-in-up">
      {/* ── Editor ── */}
      <div className="card log-card">
        <div className="card-header">
          <BookOpen size={18} />
          Daily Work Log
          {date !== today && (
            <button
              className="btn-ghost"
              style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '12px' }}
              onClick={() => setDate(today)}
            >
              Jump to Today
            </button>
          )}
        </div>

        <div className="log-date-row">
          <label className="form-label">Date</label>
          <input
            type="date"
            className="input-field date-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {savedLog && (
            <span className="saved-indicator">
              Last saved: {new Date(savedLog.updated_at).toLocaleTimeString()}
            </span>
          )}
        </div>

        {loading ? (
          <div className="loading-state">Loading…</div>
        ) : (
          <>
            <textarea
              className="log-textarea"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What did you work on today? Any accomplishments, blockers, or notes…"
              rows={14}
            />
            <div className="log-footer">
              <span className="word-count">{wordCount} words</span>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={16} />
                {saving ? 'Saving…' : 'Save Log'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── History sidebar ── */}
      <div className="card log-history-card">
        <div className="card-header">
          <CalendarDays size={16} />
          Log History
          <span className="history-count">{history.length}</span>
        </div>

        {history.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 12px' }}>
            <CalendarDays size={28} style={{ opacity: 0.3 }} />
            <span style={{ fontSize: '12px' }}>No logs yet</span>
          </div>
        ) : (
          <ul className="history-list">
            {history.map((log) => (
              <li
                key={log.id}
                className={`history-item${log.date === date ? ' history-item-active' : ''}`}
                onClick={() => editingId !== log.id && setDate(log.date)}
                title={editingId === log.id ? undefined : `Click to view/edit log for ${log.date}`}
              >
                {/* ── Date row: label OR inline edit input ── */}
                {editingId === log.id ? (
                  <div className="history-edit-row" onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={dateInputRef}
                      type="date"
                      className="history-date-input"
                      value={editDateDraft}
                      onChange={(e) => setEditDateDraft(e.target.value)}
                    />
                    <button
                      className="history-action-btn history-confirm-btn"
                      title="Confirm new date"
                      onClick={(e) => confirmEditDate(log, e)}
                    >
                      <Check size={13} />
                    </button>
                    <button
                      className="history-action-btn history-cancel-btn"
                      title="Cancel"
                      onClick={cancelEditDate}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="history-item-date">
                    <span className="history-date-label">{formatDateLabel(log.date)}</span>
                    <span className="history-raw-date">{log.date}</span>
                    <div className="history-item-actions">
                      <button
                        className="history-action-btn"
                        title="Change date"
                        onClick={(e) => startEditDate(log, e)}
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        className="history-action-btn history-delete-btn"
                        title="Delete log"
                        onClick={(e) => handleDeleteLog(log, e)}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                )}

                <p className="history-preview">{previewText(log.summary)}</p>
                <div className="history-meta">
                  <Clock size={11} />
                  {new Date(log.updated_at).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
