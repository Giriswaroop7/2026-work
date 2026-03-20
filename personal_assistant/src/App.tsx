import React, { useState, useEffect, useCallback } from 'react'
import { LayoutDashboard, CalendarCheck, BookOpen, Clock, Bell } from 'lucide-react'
import Dashboard from './components/Dashboard'
import MonthlyPlanner from './components/MonthlyPlanner'
import DailyLog from './components/DailyLog'
import TimeTracker from './components/TimeTracker'
import Reminders from './components/Reminders'
import ToastContainer from './components/ui/Toast'
import SakuraCanvas from './components/ui/SakuraCanvas'
import MatrixCanvas from './components/ui/MatrixCanvas'
import ThemeSwitcher, { type ThemeId } from './components/ui/ThemeSwitcher'
import DataSync from './components/ui/DataSync'
import type { ToastItem } from './types'
import { getDueReminders, updateReminder } from './db/database'

type Tab = 'dashboard' | 'planner' | 'log' | 'tracker' | 'reminders'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'planner', label: 'Monthly Planner', icon: <CalendarCheck size={18} /> },
  { id: 'log', label: 'Daily Log', icon: <BookOpen size={18} /> },
  { id: 'tracker', label: 'Time Tracker', icon: <Clock size={18} /> },
  { id: 'reminders', label: 'Reminders', icon: <Bell size={18} /> }
]

let toastIdCounter = 0

function loadTheme(): ThemeId {
  return (localStorage.getItem('pa-theme') as ThemeId) || 'anime'
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [clock, setClock] = useState('')
  const [theme, setTheme] = useState<ThemeId>(loadTheme)
  const [dataVersion, setDataVersion] = useState(0)

  const changeTheme = useCallback((t: ThemeId) => {
    setTheme(t)
    localStorage.setItem('pa-theme', t)
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastItem['type'] = 'info') => {
      const id = ++toastIdCounter
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
    },
    []
  )

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Live clock
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setClock(
        d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) +
          '  ' +
          d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Reminder scheduler — checks every minute for due reminders
  useEffect(() => {
    async function checkReminders() {
      const now = new Date().toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM
      const dueList = await getDueReminders(now)
      for (const reminder of dueList) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`⏰ ${reminder.title}`, {
            body: reminder.message || 'Reminder!'
          })
        }
        showToast(`⏰ ${reminder.title}${reminder.message ? ': ' + reminder.message : ''}`, 'warning')

        if (reminder.repeat === 'none') {
          await updateReminder(reminder.id, { is_active: 0 })
        } else if (reminder.repeat === 'daily') {
          const next = new Date(reminder.reminder_time)
          next.setDate(next.getDate() + 1)
          await updateReminder(reminder.id, { reminder_time: next.toISOString().slice(0, 16) })
        } else if (reminder.repeat === 'weekly') {
          const next = new Date(reminder.reminder_time)
          next.setDate(next.getDate() + 7)
          await updateReminder(reminder.id, { reminder_time: next.toISOString().slice(0, 16) })
        }
      }
    }

    checkReminders()
    const id = setInterval(checkReminders, 60_000)
    return () => clearInterval(id)
  }, [showToast])

  const tabProps = { showToast }

  return (
    <div className="app-shell" data-theme={theme}>
      {theme === 'anime' && <SakuraCanvas />}
      {theme === 'matrix' && <MatrixCanvas />}

      {/* Header */}
      <header className="app-header">
        <div className="app-title">
          <span className="title-sakura">✿</span>
          Personal Assistant
          <span className="title-sakura">✿</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <DataSync showToast={showToast} onImportDone={() => setDataVersion((v) => v + 1)} />
          <div className="clock-display">{clock}</div>
          <ThemeSwitcher current={theme} onChange={changeTheme} />
        </div>
      </header>

      {/* Tab nav */}
      <nav className="tab-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Content — key resets all tabs after import to force fresh data fetch */}
      <main className="tab-content" key={dataVersion}>
        {activeTab === 'dashboard' && <Dashboard {...tabProps} />}
        {activeTab === 'planner' && <MonthlyPlanner {...tabProps} />}
        {activeTab === 'log' && <DailyLog {...tabProps} />}
        {activeTab === 'tracker' && <TimeTracker {...tabProps} />}
        {activeTab === 'reminders' && <Reminders {...tabProps} />}
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
