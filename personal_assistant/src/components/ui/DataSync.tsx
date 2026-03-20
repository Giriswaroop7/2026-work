import React, { useRef, useState } from 'react'
import { Download, Upload, Loader } from 'lucide-react'
import { exportData, importData } from '../../db/exportImport'

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void
  onImportDone: () => void   // tells App to re-fetch data in all tabs
}

export default function DataSync({ showToast, onImportDone }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      await exportData()
      showToast('Backup downloaded successfully!', 'success')
    } catch (e) {
      showToast('Export failed: ' + (e instanceof Error ? e.message : String(e)), 'error')
    } finally {
      setExporting(false)
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // reset so the same file can be re-imported if needed
    e.target.value = ''

    setImporting(true)
    try {
      const result = await importData(file)
      if (result.error) {
        showToast(result.error, 'error')
      } else {
        showToast(`Import successful — ${result.imported} records loaded.`, 'success')
        onImportDone()
      }
    } catch (err) {
      showToast('Import failed: ' + (err instanceof Error ? err.message : String(err)), 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="data-sync">
      <button
        className="sync-btn"
        onClick={handleExport}
        disabled={exporting}
        title="Export all data to a backup JSON file"
      >
        {exporting ? <Loader size={13} className="spin" /> : <Download size={13} />}
        <span>Export</span>
      </button>

      <button
        className="sync-btn sync-btn-import"
        onClick={handleImportClick}
        disabled={importing}
        title="Import data from a backup JSON file"
      >
        {importing ? <Loader size={13} className="spin" /> : <Upload size={13} />}
        <span>Import</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}
