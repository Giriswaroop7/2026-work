import React from 'react'
import { Palette } from 'lucide-react'

export type ThemeId = 'anime' | 'bw' | 'nerdy' | 'naruto' | 'matrix'

const THEMES: { id: ThemeId; label: string; dot: string }[] = [
  { id: 'anime',  label: '🌸 Anime',  dot: '#e91e8c' },
  { id: 'bw',     label: '⬛ B&W',    dot: '#c0c0c0' },
  { id: 'nerdy',  label: '💻 Nerdy',  dot: '#58a6ff' },
  { id: 'naruto', label: '🍥 Naruto', dot: '#ff6b00' },
  { id: 'matrix', label: '🖥 Matrix', dot: '#00ff41' },
]

interface Props {
  current: ThemeId
  onChange: (t: ThemeId) => void
}

export default function ThemeSwitcher({ current, onChange }: Props) {
  const active = THEMES.find((t) => t.id === current)!

  return (
    <div className="theme-switcher">
      <Palette size={14} style={{ flexShrink: 0 }} />
      <select
        className="theme-select"
        value={current}
        onChange={(e) => onChange(e.target.value as ThemeId)}
        title="Switch theme"
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <span
        className="theme-dot"
        style={{ background: active.dot }}
        aria-hidden="true"
      />
    </div>
  )
}
