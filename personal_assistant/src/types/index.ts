export interface Task {
  id: number
  title: string
  description: string
  month: number
  year: number
  status: 'pending' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  created_at: string
  updated_at: string
}

export interface DailyLog {
  id: number
  date: string
  summary: string
  created_at: string
  updated_at: string
}

export interface TimeEntry {
  id: number
  task_id: number | null
  task_title: string
  date: string
  hours: number
  notes: string
  created_at: string
}

export interface Reminder {
  id: number
  title: string
  message: string
  reminder_time: string
  repeat: 'none' | 'daily' | 'weekly'
  is_active: number
  created_at: string
}

export interface DashboardData {
  pendingCount: number
  hoursToday: number
  activeReminders: number
  todayLog: DailyLog | null
  thisMonthTasks: Task[]
}

export interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}
