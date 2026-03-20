import React from 'react'

interface Props {
  priority: 'low' | 'medium' | 'high'
}

const LABELS: Record<string, string> = { high: '⬆ High', medium: '● Medium', low: '⬇ Low' }

export default function Badge({ priority }: Props) {
  return <span className={`priority-badge badge-${priority}`}>{LABELS[priority]}</span>
}
