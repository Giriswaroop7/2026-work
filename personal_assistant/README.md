# Personal Assistant

A personal productivity web app built with **Vite + React + TypeScript**.
All data is stored locally in the browser's **IndexedDB** (via Dexie.js) — no server, no account required.

---

## Features

| Tab | What it does |
|-----|-------------|
| **Dashboard** | Overview of pending tasks, hours logged today, active reminders, and today's log. Click any task to see its full time log. |
| **Monthly Planner** | Create and manage tasks by month. Set priority (low / medium / high) and track status (pending → in progress → done). |
| **Daily Log** | Write a free-text work journal entry per day. History sidebar lets you browse, view, edit the date of, or delete any past entry. |
| **Time Tracker** | Log hours against any task. Select a date, pick a task, enter hours + notes. View totals per day. |
| **Reminders** | Set one-off or repeating (daily / weekly) reminders. Fires a browser desktop notification + in-app toast. |

### Other features
- **5 themes** — Anime (sakura), B&W, Nerdy (GitHub dark), Naruto, Matrix (digital rain). Persisted in `localStorage`.
- **Export / Import** — Back up all data to a JSON file; import on another machine to restore everything.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Build tool | Vite 5 |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS 3 + custom CSS variables |
| Storage | Dexie.js (IndexedDB wrapper) — all data stays in the browser |
| Icons | lucide-react |
| Notifications | Browser Notification API |

---

## Getting Started

### Prerequisites

- **Node.js** v18 or later — [download](https://nodejs.org)
- **npm** v9 or later (comes with Node.js)

Check your versions:
```bash
node -v
npm -v
```

### Install & Run

```bash
# 1. Clone the repo
git clone <repo-url>
cd personal_assistant

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Then open **http://localhost:5173** in your browser.

### Build for Production

```bash
npm run build       # outputs to dist/
npm run preview     # serve the built output locally
```

---

## Data Storage

Data is stored in **IndexedDB** inside whichever browser you use.

- **Persists across**: dev server restarts, reboots, theme changes
- **Does NOT persist across**: clearing browser site data, switching browsers, different ports
- **Location** (for inspection in DevTools): Application → IndexedDB → `personal-assistant-db`

### Moving Data to Another Machine

1. In the app header, click **Export** → downloads `personal-assistant-backup-YYYY-MM-DD.json`
2. On the new machine, open the app → click **Import** → select the JSON file
3. All tasks, logs, time entries, and reminders are restored instantly

---

## Project Structure

```
personal_assistant/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── src/
    ├── main.tsx                  # React entry point
    ├── App.tsx                   # Tab shell, theme state, reminder polling
    ├── types/
    │   └── index.ts              # TypeScript interfaces (Task, DailyLog, TimeEntry, Reminder)
    ├── db/
    │   ├── database.ts           # Dexie schema + all CRUD functions
    │   └── exportImport.ts       # Export to JSON / Import from JSON
    ├── hooks/
    │   └── useElectronAPI.ts     # Typed wrappers around db functions + error handling
    ├── styles/
    │   └── globals.css           # Tailwind + all CSS variables + 5 themes + animations
    └── components/
        ├── Dashboard.tsx
        ├── MonthlyPlanner.tsx
        ├── DailyLog.tsx
        ├── TimeTracker.tsx
        ├── Reminders.tsx
        └── ui/
            ├── Modal.tsx
            ├── Toast.tsx
            ├── Badge.tsx
            ├── SakuraCanvas.tsx  # Falling petals (anime theme)
            ├── MatrixCanvas.tsx  # Digital rain (matrix theme)
            ├── ThemeSwitcher.tsx # Theme selector in header
            ├── DataSync.tsx      # Export / Import buttons
            └── TaskDetailModal.tsx # Task time log popup (from Dashboard)
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at http://localhost:5173 |
| `npm run build` | Type-check + build to `dist/` |
| `npm run preview` | Serve the production build locally |

---

## Themes

Switch theme using the **🎨 palette dropdown** in the top-right of the header. Choice is saved automatically.

| Theme | Style |
|-------|-------|
| 🌸 Anime | Purple / pink / cyan glassmorphism + falling sakura petals |
| ⬛ B&W | Monochrome noir, white glows |
| 💻 Nerdy | GitHub dark palette, monospace font |
| 🍥 Naruto | Orange / gold / fire on dark earth tones |
| 🖥 Matrix | Neon green on black, monospace font + digital rain |
