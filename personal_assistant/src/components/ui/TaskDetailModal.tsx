import React, { useEffect, useState } from 'react'
import { Clock, Calendar, FileText } from 'lucide-react'
import Modal from './Modal'
import Badge from './Badge'
import { getTimeEntriesByTask } from '../../db/database'
import type { Task, TimeEntry } from '../../types'

interface Props {
  task: Task | null
  onClose: () => void
}

export default function TaskDetailModal({ task, onClose }: Props) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!task) return
    setLoading(true)
    getTimeEntriesByTask(task.id).then((data) => {
      setEntries(data)
      setLoading(false)
    })
  }, [task?.id])

  const totalHours = entries.reduce((s, e) => s + e.hours, 0)

  return (
    <Modal isOpen={!!task} onClose={onClose} title="Task Details">
      {task && (
        <>
          {/* Task header info */}
          <div className="task-detail-meta">
            <div className="task-detail-title">{task.title}</div>
            <div className="task-detail-badges">
              <Badge priority={task.priority} />
              <span className={`status-pill status-${task.status}`}>
                {task.status.replace('_', ' ')}
              </span>
              <span className="task-detail-period">
                <Calendar size={12} />
                {new Date(task.year, task.month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            {task.description && (
              <p className="task-detail-desc">{task.description}</p>
            )}
          </div>

          {/* Time summary bar */}
          <div className="task-time-summary">
            <Clock size={16} className="icon-cyan" />
            <span>Total time logged:</span>
            <strong className="task-total-hours">{totalHours.toFixed(2)} h</strong>
            <span className="task-entry-count">across {entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
          </div>

          {/* Time entries */}
          <div className="task-entries-section">
            <div className="task-entries-label">
              <FileText size={13} />
              Time Log
            </div>

            {loading ? (
              <div className="loading-state">Loading…</div>
            ) : entries.length === 0 ? (
              <p className="empty-hint" style={{ padding: '12px 0' }}>
                No time logged for this task yet. Use the Time Tracker tab to add entries.
              </p>
            ) : (
              <div className="task-entries-list">
                {entries.map((entry) => (
                  <div key={entry.id} className="task-entry-row">
                    <div className="task-entry-date">
                      <Calendar size={12} />
                      {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', {
                        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </div>
                    <div className="task-entry-notes">{entry.notes || <em>No notes</em>}</div>
                    <div className="task-entry-hours">{entry.hours}h</div>
                  </div>
                ))}
                <div className="task-entries-total">
                  Total <strong>{totalHours.toFixed(2)} h</strong>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
