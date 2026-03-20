import React, { useEffect, useState } from 'react'
import { CheckCircle, Clock, Bell, FileText, ChevronRight } from 'lucide-react'
import { useElectronAPI } from '../hooks/useElectronAPI'
import Badge from './ui/Badge'
import TaskDetailModal from './ui/TaskDetailModal'
import type { DashboardData, Task, ToastItem } from '../types'

interface Props {
  showToast: (msg: string, type: ToastItem['type']) => void
}

export default function Dashboard({ showToast }: Props) {
  const { call, api } = useElectronAPI(showToast)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const now = new Date()

  async function load() {
    setLoading(true)
    const result = await call(
      () => api.getDashboard(today, now.getMonth() + 1, now.getFullYear()),
      'Failed to load dashboard'
    )
    if (result) setData(result)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="loading-state">Loading dashboard…</div>
  if (!data) return null

  return (
    <div className="dashboard-layout animate-fade-in-up">
      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card stat-purple">
          <CheckCircle size={28} className="stat-icon" />
          <div>
            <div className="stat-value">{data.pendingCount}</div>
            <div className="stat-label">Pending Tasks</div>
          </div>
        </div>
        <div className="stat-card stat-cyan">
          <Clock size={28} className="stat-icon" />
          <div>
            <div className="stat-value">{data.hoursToday.toFixed(1)}h</div>
            <div className="stat-label">Hours Today</div>
          </div>
        </div>
        <div className="stat-card stat-pink">
          <Bell size={28} className="stat-icon" />
          <div>
            <div className="stat-value">{data.activeReminders}</div>
            <div className="stat-label">Active Reminders</div>
          </div>
        </div>
      </div>

      {/* Today's log */}
      <div className="card">
        <div className="card-header">
          <FileText size={16} />
          Today's Log
          <span className="card-header-date">{today}</span>
        </div>
        <div className="log-preview">
          {data.todayLog?.summary ? (
            <p>{data.todayLog.summary}</p>
          ) : (
            <p className="empty-hint">No log entry yet for today. Go to Daily Log to add one.</p>
          )}
        </div>
      </div>

      {/* This month's tasks — clickable */}
      <div className="card">
        <div className="card-header">
          <CheckCircle size={16} />
          {now.toLocaleString('en-US', { month: 'long' })} {now.getFullYear()} — Tasks
          <span className="card-header-date">click a task to see time log</span>
        </div>
        {data.thisMonthTasks.length === 0 ? (
          <p className="empty-hint">No tasks for this month yet.</p>
        ) : (
          <div className="task-mini-list">
            {data.thisMonthTasks.map((t) => (
              <div
                key={t.id}
                className={`task-mini-row status-${t.status} task-mini-row-clickable`}
                onClick={() => setSelectedTask(t)}
                title="Click to view time log"
              >
                <span className="task-mini-title">{t.title}</span>
                <div className="task-mini-badges">
                  <Badge priority={t.priority} />
                  <span className={`status-pill status-${t.status}`}>
                    {t.status.replace('_', ' ')}
                  </span>
                  <ChevronRight size={14} className="task-mini-chevron" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task detail modal */}
      <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  )
}
