const API_BASE = 'http://localhost:3000/api';

// Update date and time display
function updateDateTime() {
    const now = new Date();
    
    // Format time
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const period = now.getHours() >= 12 ? 'PM' : 'AM';
    const timeStr = `${hours}:${minutes}:${seconds} ${period}`;
    
    // Format date
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', options);
    
    // Update DOM
    const timeEl = document.getElementById('currentTime');
    const dateEl = document.getElementById('currentDate');
    
    if (timeEl) timeEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;
}

// Widget storage
let widgets = [];
let todos = [];

// Gradient classes for variety
const gradientClasses = ['gradient-1', 'gradient-2', 'gradient-3', 'gradient-4'];
let gradientIndex = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadWidgets();
    loadLocalTodos();
    
    // Update date/time immediately and then every second
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Auto-refresh every 5 minutes
    setInterval(() => {
        widgets.forEach(w => {
            if (w.enabled && (w.type === 'gmail' || w.type === 'news' || w.type === 'jira')) {
                refreshWidget(w.type);
            }
        });
    }, 5 * 60 * 1000);
});

// Load widgets from localStorage or create defaults
function loadWidgets() {
    const stored = localStorage.getItem('dashboardWidgets');
    
    if (stored) {
        widgets = JSON.parse(stored);
    } else {
        // Create default widgets
        widgets = [
            { id: 'w1', type: 'gmail', title: '📧 Gmail', icon: '📧', enabled: true },
            { id: 'w2', type: 'news', title: '🤖 AI News', icon: '🤖', enabled: true },
            { id: 'w3', type: 'todo', title: '✓ TODO', icon: '✓', enabled: true },
            { id: 'w4', type: 'jira', title: '🎯 Jira', icon: '🎯', enabled: true }
        ];
        saveWidgets();
    }
    
    renderWidgets();
}

// Render all widgets
function renderWidgets() {
    const container = document.getElementById('dashboard-grid');
    container.innerHTML = '';
    
    widgets.forEach((widget, index) => {
        if (!widget.enabled) return;
        
        const gradientClass = gradientClasses[index % 4];
        const widgetHtml = createWidgetHtml(widget, gradientClass);
        container.innerHTML += widgetHtml;
        
        // Load data for the widget
        loadWidgetData(widget.type);
    });
}

// Create widget HTML
function createWidgetHtml(widget, gradientClass) {
    const contentId = `${widget.id}-content`;
    
    if (widget.type === 'todo') {
        return `
            <div class="widget-card ${gradientClass}" data-widget-id="${widget.id}">
                <div class="card-header">
                    <h3>${widget.title}</h3>
                    <div class="card-controls">
                        <button class="refresh-btn" onclick="refreshWidget('${widget.type}')">🔄</button>
                        <button class="delete-btn" onclick="deleteWidget('${widget.id}')">✕</button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="todo-input-group">
                        <input type="text" id="todo-input" placeholder="Add new task..." />
                        <button onclick="addTodo()">Add</button>
                        <button onclick="saveTodoList()" class="save-todos-btn">💾 Save</button>
                    </div>
                    <div id="${contentId}" class="content">
                        <div class="loading">Loading...</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="widget-card ${gradientClass}" data-widget-id="${widget.id}">
            <div class="card-header">
                <h3>${widget.title}</h3>
                <div class="card-controls">
                    <button class="refresh-btn" onclick="refreshWidget('${widget.type}')">🔄</button>
                    <button class="delete-btn" onclick="deleteWidget('${widget.id}')">✕</button>
                </div>
            </div>
            <div class="card-body">
                <div id="${contentId}" class="content">
                    <div class="loading">Loading...</div>
                </div>
            </div>
        </div>
    `;
}

// Load data for widget
async function loadWidgetData(type) {
    if (type === 'gmail') refreshWidget('gmail');
    if (type === 'news') refreshWidget('news');
    if (type === 'jira') refreshWidget('jira');
    if (type === 'todo') renderTodos();
}

// Refresh widget
async function refreshWidget(type) {
    // Find the first widget of this type
    const widget = widgets.find(w => w.type === type && w.enabled);
    if (!widget) return;
    
    const dynamicContentId = `${widget.id}-content`;
    const content = document.getElementById(dynamicContentId);
    if (!content) return;
    
    content.innerHTML = '<div class="loading">Loading...</div>';
    
    try {
        let data;
        if (type === 'gmail') {
            const response = await fetch(`${API_BASE}/gmail`);
            if (!response.ok) throw new Error('Failed to fetch emails');
            data = await response.json();
            content.innerHTML = renderGmailItems(data);
        } else if (type === 'news') {
            const response = await fetch(`${API_BASE}/news`);
            if (!response.ok) throw new Error('Failed to fetch news');
            data = await response.json();
            content.innerHTML = renderNewsItems(data);
        } else if (type === 'jira') {
            const response = await fetch(`${API_BASE}/jira`);
            if (!response.ok) throw new Error('Failed to fetch tasks');
            data = await response.json();
            content.innerHTML = renderJiraItems(data);
        }
    } catch (error) {
        content.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Render Gmail items
function renderGmailItems(emails) {
    if (!Array.isArray(emails) || emails.length === 0) {
        return '<div class="empty-state">No emails found</div>';
    }
    
    return emails.map(email => `
        <div class="email-item">
            <div class="email-from">${escapeHtml(email.from)}</div>
            <div class="email-subject">${escapeHtml(email.subject)}</div>
            <div class="email-preview">${escapeHtml(email.preview)}</div>
            <div class="email-date">${new Date(email.date).toLocaleDateString()}</div>
        </div>
    `).join('');
}

// Render News items
function renderNewsItems(articles) {
    if (!Array.isArray(articles) || articles.length === 0) {
        return '<div class="empty-state">No news found</div>';
    }
    
    return articles.map((article, index) => `
        <div class="news-item">
            <div style="margin-bottom: 8px;"><strong style="color: var(--primary-light);">#${index + 1}</strong></div>
            <div class="news-title">${escapeHtml(article.title)}</div>
            <a href="${article.url}" target="_blank" style="color: var(--secondary);">Read more →</a>
            <div class="news-source">Source: ${escapeHtml(article.source)}</div>
        </div>
    `).join('');
}

// Render Jira items
function renderJiraItems(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
        return '<div class="empty-state">No sprint tasks found</div>';
    }
    
    return tasks.map(task => {
        const statusClass = task.status.toLowerCase().replace(' ', '');
        return `
            <div class="task-item">
                <div class="task-key">${escapeHtml(task.key)}</div>
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-assignee">👤 ${escapeHtml(task.assignee || 'Unassigned')}</div>
                <span class="task-status ${statusClass}">${escapeHtml(task.status)}</span>
            </div>
        `;
    }).join('');
}

// TODO functions
function loadLocalTodos() {
    const stored = localStorage.getItem('todos');
    todos = stored ? JSON.parse(stored) : [];
    renderTodos();
}

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function renderTodos() {
    const widget = widgets.find(w => w.type === 'todo' && w.enabled);
    if (!widget) return;
    
    const contentId = `${widget.id}-content`;
    const content = document.getElementById(contentId);
    if (!content) return;
    
    if (todos.length === 0) {
        content.innerHTML = '<div class="empty-state">No tasks yet. Add one to get started!</div>';
        return;
    }
    
    content.innerHTML = todos.map((todo, index) => `
        <div class="todo-item ${todo.completed ? 'completed' : ''}">
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                   onchange="toggleTodo(${index})">
            <div class="todo-text-wrapper">
                <div class="todo-text">${escapeHtml(todo.text)}</div>
                <div class="todo-timestamp" style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${escapeHtml(todo.date || '')} ${escapeHtml(todo.timestamp || '')}</div>
            </div>
            <button class="todo-remove" onclick="removeTodo(${index})">Delete</button>
        </div>
    `).join('');
}

function addTodo() {
    const input = document.getElementById('todo-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    const now = new Date();
    todos.push({
        id: Date.now(),
        text: text,
        completed: false,
        createdAt: now.toISOString(),
        timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    });
    
    input.value = '';
    saveTodos();
    renderTodos();
}

function toggleTodo(index) {
    todos[index].completed = !todos[index].completed;
    saveTodos();
    renderTodos();
}

function removeTodo(index) {
    todos.splice(index, 1);
    saveTodos();
    renderTodos();
}

// Modal functions
function openAddWidgetModal() {
    const modal = document.getElementById('addWidgetModal');
    modal.classList.add('active');
}

function closeAddWidgetModal() {
    const modal = document.getElementById('addWidgetModal');
    modal.classList.remove('active');
    document.getElementById('customWidgetForm').style.display = 'none';
}

function showCustomWidgetForm() {
    document.getElementById('customWidgetForm').style.display = 'flex';
}

function addDefaultWidget(type, title, typeStr) {
    const newWidget = {
        id: 'w' + Date.now(),
        type: typeStr,
        title: title,
        icon: title.split(' ')[0],
        enabled: true
    };
    
    widgets.push(newWidget);
    saveWidgets();
    renderWidgets();
    closeAddWidgetModal();
}

function createCustomWidget() {
    const name = document.getElementById('customWidgetName').value.trim();
    const icon = document.getElementById('customWidgetIcon').value.trim();
    const url = document.getElementById('customWidgetUrl').value.trim();
    
    if (!name || !icon) {
        alert('Please fill in name and icon');
        return;
    }
    
    const newWidget = {
        id: 'w' + Date.now(),
        type: 'custom',
        title: `${icon} ${name}`,
        icon: icon,
        url: url || null,
        enabled: true,
        customContent: url ? '' : 'Custom widget content will appear here'
    };
    
    widgets.push(newWidget);
    saveWidgets();
    renderWidgets();
    closeAddWidgetModal();
    
    // Clear form
    document.getElementById('customWidgetName').value = '';
    document.getElementById('customWidgetIcon').value = '';
    document.getElementById('customWidgetUrl').value = '';
}

function deleteWidget(widgetId) {
    if (confirm('Delete this widget?')) {
        widgets = widgets.filter(w => w.id !== widgetId);
        saveWidgets();
        renderWidgets();
    }
}

function saveWidgets() {
    localStorage.setItem('dashboardWidgets', JSON.stringify(widgets));
}

// Helper function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('addWidgetModal');
    if (e.target === modal) {
        closeAddWidgetModal();
    }
});

// Keyboard shortcut to add widget
window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement.id === 'todo-input') {
        addTodo();
    }
});

// Save TODO list to file
async function saveTodoList() {
    if (todos.length === 0) {
        alert('No tasks to save!');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/save-todos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ todos: todos })
        });
        
        if (response.ok) {
            alert(`✅ Saved ${todos.length} tasks to file!`);
            todos = [];
            saveTodos();
            renderTodos();
        } else {
            alert('Failed to save tasks');
        }
    } catch (error) {
        alert(`Error saving tasks: ${error.message}`);
    }
}
