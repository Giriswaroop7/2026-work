import Dexie from 'dexie'
import type { Task, DailyLog, TimeEntry, Reminder, DashboardData } from '../types'

// ─── Database definition ────────────────────────────────────────────────────

class AppDB extends Dexie {
  tasks!: Dexie.Table<Task, number>
  dailyLogs!: Dexie.Table<DailyLog, number>
  timeEntries!: Dexie.Table<TimeEntry, number>
  reminders!: Dexie.Table<Reminder, number>

  constructor() {
    super('personal-assistant-db')
    this.version(1).stores({
      tasks: '++id, month, year, status, priority',
      dailyLogs: '++id, &date',
      timeEntries: '++id, date, task_id',
      reminders: '++id, is_active, reminder_time'
    })
  }
}

export const db = new AppDB()

// ─── Helpers ────────────────────────────────────────────────────────────────

function nowStr(): string {
  return new Date().toISOString()
}

const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }

// ─── Tasks ──────────────────────────────────────────────────────────────────

export async function getTasks(month: number, year: number): Promise<Task[]> {
  const tasks = await db.tasks.where('month').equals(month).filter(t => t.year === year).toArray()
  tasks.sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 2
    const pb = priorityOrder[b.priority] ?? 2
    if (pa !== pb) return pa - pb
    return a.created_at.localeCompare(b.created_at)
  })
  return tasks
}

export async function createTask(
  data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'status'>
): Promise<Task> {
  const ts = nowStr()
  const id = await db.tasks.add({
    ...data,
    status: 'pending',
    created_at: ts,
    updated_at: ts
  } as Task)
  return db.tasks.get(id) as Promise<Task>
}

export async function updateTask(id: number, data: Partial<Task>): Promise<Task> {
  await db.tasks.update(id, { ...data, updated_at: nowStr() })
  return db.tasks.get(id) as Promise<Task>
}

export async function deleteTask(id: number): Promise<boolean> {
  await db.tasks.delete(id)
  return true
}

// ─── Daily Logs ─────────────────────────────────────────────────────────────

export async function getLog(date: string): Promise<DailyLog | null> {
  return (await db.dailyLogs.where('date').equals(date).first()) ?? null
}

export async function getAllLogs(): Promise<DailyLog[]> {
  const logs = await db.dailyLogs.toArray()
  return logs.sort((a, b) => b.date.localeCompare(a.date)) // newest first
}

export async function updateLogDate(id: number, newDate: string): Promise<void> {
  const conflict = await db.dailyLogs.where('date').equals(newDate).first()
  if (conflict) throw new Error(`A log already exists for ${newDate}`)
  await db.dailyLogs.update(id, { date: newDate, updated_at: new Date().toISOString() })
}

export async function deleteLog(id: number): Promise<void> {
  await db.dailyLogs.delete(id)
}

export async function upsertLog(date: string, summary: string): Promise<DailyLog> {
  const ts = nowStr()
  const existing = await db.dailyLogs.where('date').equals(date).first()
  if (existing) {
    await db.dailyLogs.update(existing.id, { summary, updated_at: ts })
    return db.dailyLogs.get(existing.id) as Promise<DailyLog>
  }
  const id = await db.dailyLogs.add({ date, summary, created_at: ts, updated_at: ts } as DailyLog)
  return db.dailyLogs.get(id) as Promise<DailyLog>
}

// ─── Time Entries ───────────────────────────────────────────────────────────

export async function getTimeEntries(date: string): Promise<TimeEntry[]> {
  const entries = await db.timeEntries.where('date').equals(date).sortBy('created_at')
  return Promise.all(
    entries.map(async (e) => {
      const task = e.task_id ? await db.tasks.get(e.task_id) : null
      return { ...e, task_title: task?.title ?? 'Unlinked' }
    })
  )
}

export async function createTimeEntry(
  data: Omit<TimeEntry, 'id' | 'created_at' | 'task_title'>
): Promise<TimeEntry> {
  const ts = nowStr()
  const id = await db.timeEntries.add({ ...data, task_title: '', created_at: ts } as TimeEntry)
  const entry = (await db.timeEntries.get(id)) as TimeEntry
  const task = entry.task_id ? await db.tasks.get(entry.task_id) : null
  return { ...entry, task_title: task?.title ?? 'Unlinked' }
}

export async function deleteTimeEntry(id: number): Promise<boolean> {
  await db.timeEntries.delete(id)
  return true
}

export async function getTimeEntriesByTask(taskId: number): Promise<TimeEntry[]> {
  const entries = await db.timeEntries.where('task_id').equals(taskId).sortBy('date')
  const task = await db.tasks.get(taskId)
  return entries
    .reverse() // newest date first
    .map((e) => ({ ...e, task_title: task?.title ?? 'Unlinked' }))
}

export async function getAllTasks(): Promise<Task[]> {
  const tasks = await db.tasks.toArray()
  return tasks.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export async function getDailyTotal(date: string): Promise<number> {
  const entries = await db.timeEntries.where('date').equals(date).toArray()
  return entries.reduce((sum, e) => sum + e.hours, 0)
}

// ─── Reminders ──────────────────────────────────────────────────────────────

export async function getReminders(): Promise<Reminder[]> {
  const reminders = await db.reminders.toArray()
  reminders.sort((a, b) => {
    if (b.is_active !== a.is_active) return b.is_active - a.is_active
    return a.reminder_time.localeCompare(b.reminder_time)
  })
  return reminders
}

export async function createReminder(
  data: Omit<Reminder, 'id' | 'created_at' | 'is_active'>
): Promise<Reminder> {
  const ts = nowStr()
  const id = await db.reminders.add({ ...data, is_active: 1, created_at: ts } as Reminder)
  return db.reminders.get(id) as Promise<Reminder>
}

export async function updateReminder(id: number, data: Partial<Reminder>): Promise<Reminder> {
  await db.reminders.update(id, data)
  return db.reminders.get(id) as Promise<Reminder>
}

export async function deleteReminder(id: number): Promise<boolean> {
  await db.reminders.delete(id)
  return true
}

export async function getDueReminders(upTo: string): Promise<Reminder[]> {
  return db.reminders
    .where('is_active')
    .equals(1)
    .filter((r) => r.reminder_time <= upTo)
    .toArray()
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export async function getDashboardData(
  date: string,
  month: number,
  year: number
): Promise<DashboardData> {
  const [allTasks, hoursToday, allActiveReminders, todayLog] = await Promise.all([
    getTasks(month, year),
    getDailyTotal(date),
    db.reminders.where('is_active').equals(1).count(),
    getLog(date)
  ])
  return {
    pendingCount: allTasks.filter((t) => t.status !== 'done').length,
    hoursToday,
    activeReminders: allActiveReminders,
    todayLog,
    thisMonthTasks: allTasks
  }
}
