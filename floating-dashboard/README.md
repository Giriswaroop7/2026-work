# Floating Dashboard

A modern, interactive web dashboard with floating widgets for Gmail, AI News, TODO list, and Jira sprint tasks. Features draggable cards with glassmorphism design.

![Features](features.png)

## Features

✨ **Floating Widgets**
- Draggable, resizable floating cards
- Glassmorphism design with smooth animations
- Minimize/expand functionality
- Modern gradient backgrounds

📧 **Gmail Integration**
- Fetch latest unread emails
- Display sender, subject, and preview
- Auto-refresh capability

🤖 **AI News Widget**
- Top 10 latest AI/ML news articles
- Uses NewsAPI for real-time data
- Direct links to full articles

✓ **TODO List**
- Local storage persistence
- Add, complete, and delete tasks
- Syncs with server (optional)

🎯 **Jira Sprint Board**
- Shows active sprint tasks
- Task status and assignee information
- Real-time updates

## Project Structure

```
floating-dashboard/
├── frontend/
│   ├── index.html          # Main HTML with floating widgets
│   ├── styles.css          # Modern CSS with animations
│   └── script.js           # Frontend logic and drag functionality
└── backend/
    ├── server.js           # Express.js API server
    ├── package.json        # Node dependencies
    └── .env.example        # Environment variables template
```

## Prerequisites

- Node.js (v14+)
- npm or yarn
- Git
- Modern web browser

## Setup Instructions

### 1. Backend Setup

Navigate to the backend directory:
```bash
cd floating-dashboard/backend
```

Install dependencies:
```bash
npm install
```

Copy and configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` file with your credentials (see detailed instructions below).

Start the server:
```bash
npm start
# For development with auto-reload:
npm run dev
```

The server will run on `http://localhost:3000`

### 2. Frontend Setup

Open `frontend/index.html` in your web browser or serve it using a simple HTTP server:

```bash
cd floating-dashboard/frontend
# Using Python 3
python -m http.server 8080

# Or using Node.js http-server
npx http-server
```

Open browser to `http://localhost:8080` (or the port shown)

## API Configuration Guide

### Gmail Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Gmail API:
   - Search for "Gmail API" and click Enable
4. Create a Service Account:
   - Go to "Service Accounts" under "Credentials"
   - Click "Create Service Account"
   - Fill in service account name
5. Create Key:
   - Go to the created service account
   - Click "Keys" tab
   - Click "Add Key" → "Create new key" → Choose "JSON"
   - Save the downloaded JSON file as `credentials.json` in the backend folder
6. Grant Gmail access to service account email (share your Gmail with the service account email)

Set in `.env`:
```
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
```

### NewsAPI Setup

1. Visit [NewsAPI.org](https://newsapi.org/)
2. Sign up for a free account
3. Copy your API key from the dashboard
4. Add to `.env`:
```
NEWS_API_KEY=your_api_key_here
```

### Jira Setup

1. Go to [Atlassian Account](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create an API token (login required)
3. Copy the token
4. Get your Jira instance URL (e.g., `https://your-company.atlassian.net`)
5. Add to `.env`:
```
JIRA_HOST=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_token_here
```

## API Endpoints

### Gmail
- `GET /api/gmail` - Fetch latest 5 unread emails

### News
- `GET /api/news` - Fetch top 10 AI/ML news articles

### TODO
- `GET /api/todos` - Get all TODOs
- `POST /api/todos` - Create new TODO

### Jira
- `GET /api/jira` - Fetch active sprint tasks

## Features in Detail

### Draggable Widgets
- Click and drag the widget header to move cards around the screen
- Cards maintain their position during the session
- Z-index management for proper layering

### Minimize/Expand
- Click the "−" button to collapse/expand any widget
- Useful for managing screen space

### Auto-refresh
- All widgets auto-refresh every 5 minutes
- Manual refresh available via the 🔄 button

### TODO List
- Add tasks by typing and pressing Enter or clicking "Add"
- Check off completed tasks
- Delete tasks with the "Delete" button
- Data persists in browser's local storage

## Keyboard Shortcuts

- `Enter` in TODO input: Add new task
- Click and drag card headers: Move widgets

## Browser Compatibility

- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Environment Variables

Create a `.env` file in the `backend` folder:

```env
# Gmail API
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json

# NewsAPI
NEWS_API_KEY=your_newsapi_key

# Jira
JIRA_HOST=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_token

# Server
PORT=3000
```

## Troubleshooting

### Gmail not showing emails
- Check that service account has access to your Gmail
- Verify `credentials.json` exists and is valid
- Check browser console for CORS errors

### News not loading
- Verify NewsAPI key is correct and valid
- Check API quota hasn't been exceeded
- Ensure NEWS_API_KEY environment variable is set

### Jira tasks not showing
- Verify Jira credentials in `.env`
- Ensure you have an active sprint
- Check that the API token is valid
- Verify JIRA_HOST URL is correct

### CORS Errors
- Make sure backend server is running on `http://localhost:3000`
- Check that frontend and backend are both running
- Verify CORS is enabled in server.js

## Performance Tips

- Widgets cache data locally for 5 minutes
- Use browser DevTools for debugging
- Consider reducing refresh interval for frequently updated data
- Use pagination for large datasets (Jira tasks)

## Future Enhancements

- [ ] Persistent storage for widget positions
- [ ] Dark mode toggle
- [ ] Custom refresh intervals
- [ ] Email search/filter
- [ ] Jira issue detail view
- [ ] Task assignments
- [ ] Real-time notifications
- [ ] Multiple dashboard layouts
- [ ] Data export functionality

## License

MIT License - feel free to use and modify

## Support

For issues and questions:
1. Check the troubleshooting section
2. Verify all credentials and API keys
3. Check browser console for error messages
4. Ensure all services are running properly

## Notes

- This application uses local storage for TODOs. To sync across devices, implement a database backend.
- Gmail integration requires a service account. For personal use, consider OAuth2 flow instead.
- Some APIs (NewsAPI) have rate limits on free plans.
- Jira requires active sprint to show tasks.

---

**Created**: December 2025
**Version**: 1.0.0
