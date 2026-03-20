import { useCallback, useMemo } from 'react'
import type { ToastItem } from '../types'
import * as db from '../db/database'

/**
 * Provides a uniform API surface (same shape as the old Electron IPC API)
 * now backed by Dexie/IndexedDB. Components don't need to change.
 */
export function useElectronAPI(showToast: (msg: string, type: ToastItem['type']) => void) {
  const call = useCallback(
    async <T>(fn: () => Promise<T>, errorMsg?: string): Promise<T | null> => {
      try {
        return await fn()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        showToast(errorMsg ?? `Error: ${msg}`, 'error')
        return null
      }
    },
    [showToast]
  )

  const api = useMemo(
    () => ({
      getTasks: db.getTasks,
      createTask: db.createTask,
      updateTask: db.updateTask,
      deleteTask: db.deleteTask,
      getLog: db.getLog,
      upsertLog: db.upsertLog,
      getTimeEntries: db.getTimeEntries,
      createTimeEntry: db.createTimeEntry,
      deleteTimeEntry: db.deleteTimeEntry,
      getReminders: db.getReminders,
      createReminder: db.createReminder,
      updateReminder: db.updateReminder,
      deleteReminder: db.deleteReminder,
      getDashboard: db.getDashboardData
    }),
    []
  )

  return { call, api }
}
