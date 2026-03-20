import { db } from './database'
import type { Task, DailyLog, TimeEntry, Reminder } from '../types'

interface BackupFile {
  version: number
  exportedAt: string
  tasks: Task[]
  dailyLogs: DailyLog[]
  timeEntries: TimeEntry[]
  reminders: Reminder[]
}

// ─── Export ──────────────────────────────────────────────────────────────────

export async function exportData(): Promise<void> {
  const [tasks, dailyLogs, timeEntries, reminders] = await Promise.all([
    db.tasks.toArray(),
    db.dailyLogs.toArray(),
    db.timeEntries.toArray(),
    db.reminders.toArray()
  ])

  const backup: BackupFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks,
    dailyLogs,
    timeEntries,
    reminders
  }

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const date = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `personal-assistant-backup-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Import ──────────────────────────────────────────────────────────────────

export async function importData(file: File): Promise<{ imported: number; error?: string }> {
  let raw: string
  try {
    raw = await file.text()
  } catch {
    return { imported: 0, error: 'Could not read file.' }
  }

  let backup: BackupFile
  try {
    backup = JSON.parse(raw) as BackupFile
  } catch {
    return { imported: 0, error: 'File is not valid JSON.' }
  }

  if (backup.version !== 1 || !Array.isArray(backup.tasks)) {
    return { imported: 0, error: 'File does not look like a Personal Assistant backup.' }
  }

  // Clear all tables then bulk-insert — wrap in transaction for atomicity
  await db.transaction('rw', db.tasks, db.dailyLogs, db.timeEntries, db.reminders, async () => {
    await db.tasks.clear()
    await db.dailyLogs.clear()
    await db.timeEntries.clear()
    await db.reminders.clear()

    if (backup.tasks.length)      await db.tasks.bulkAdd(backup.tasks)
    if (backup.dailyLogs.length)  await db.dailyLogs.bulkAdd(backup.dailyLogs)
    if (backup.timeEntries.length) await db.timeEntries.bulkAdd(backup.timeEntries)
    if (backup.reminders.length)  await db.reminders.bulkAdd(backup.reminders)
  })

  const total =
    backup.tasks.length +
    backup.dailyLogs.length +
    backup.timeEntries.length +
    backup.reminders.length

  return { imported: total }
}
