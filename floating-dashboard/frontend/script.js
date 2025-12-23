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
    
    // Load thought of the day
    loadThoughtOfDay();
    
    // Load word of the day
    loadWordOfDay();
    
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
            { id: 'w1', type: 'audio', title: '🎙️ Audio Capture', icon: '🎙️', enabled: true },
            { id: 'w2', type: 'news', title: '🤖 AI News', icon: '🤖', enabled: true },
            { id: 'w3', type: 'todo', title: '✓ TODO', icon: '✓', enabled: true },
            { id: 'w4', type: 'jira', title: '🎯 Jira', icon: '🎯', enabled: true },
            { id: 'w5', type: 'gmail', title: '📧 Gmail', icon: '📧', enabled: true }
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
    
    if (widget.type === 'audio') {
        return `
            <div class="widget-card ${gradientClass}" data-widget-id="${widget.id}" data-type="audio">
                <div class="card-header">
                    <h3>${widget.title}</h3>
                    <div class="card-controls">
                        <button class="delete-btn" onclick="deleteWidget('${widget.id}')">✕</button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="audio-controls">
                        <button class="audio-record-widget-btn" onclick="toggleAudioRecording()">
                            🎙️ Record
                        </button>
                    </div>
                    <div id="${contentId}" class="audio-content">
                        <div data-audio-text class="audio-text"></div>
                        <button class="audio-save-btn" onclick="saveAudioCapture()" style="margin-top: 10px;">
                            💾 Save Recording
                        </button>
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
    if (type === 'audio') renderAudioWidget();
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

// Audio Widget Functions
function renderAudioWidget() {
    // This widget doesn't need data loading, just initialization
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

// Load Thought of the Day
async function loadThoughtOfDay() {
    try {
        const today = new Date().toDateString();
        const stored = localStorage.getItem('thoughtOfDay');
        
        if (stored) {
            const { date, quote, author } = JSON.parse(stored);
            // Check if it's the same day
            if (date === today) {
                displayThought(quote, author);
                return;
            }
        }
        
        // Fetch new quote for the day
        const response = await fetch(`${API_BASE}/quote`);
        if (response.ok) {
            const { quote, author } = await response.json();
            
            // Store in localStorage
            localStorage.setItem('thoughtOfDay', JSON.stringify({
                date: today,
                quote: quote,
                author: author
            }));
            
            displayThought(quote, author);
        } else {
            displayThought('The only way to do great work is to love what you do.', 'Steve Jobs');
        }
    } catch (error) {
        console.error('Error loading thought of day:', error);
        displayThought('The only way to do great work is to love what you do.', 'Steve Jobs');
    }
}

function displayThought(quote, author) {
    const container = document.getElementById('thoughtOfDay');
    container.innerHTML = `
        <div class="thought-quote">
            "${escapeHtml(quote)}"
            <div class="thought-author">— ${escapeHtml(author)}</div>
        </div>
    `;
}

// Load Word of the Day
async function loadWordOfDay() {
    try {
        const today = new Date().toDateString();
        const stored = localStorage.getItem('wordOfDay');
        
        if (stored) {
            const { date, word, meaning } = JSON.parse(stored);
            // Check if it's the same day
            if (date === today) {
                displayWord(word, meaning);
                return;
            }
        }
        
        // Fetch new word for the day
        const response = await fetch(`${API_BASE}/word`);
        if (response.ok) {
            const { word, meaning } = await response.json();
            
            // Store in localStorage
            localStorage.setItem('wordOfDay', JSON.stringify({
                date: today,
                word: word,
                meaning: meaning
            }));
            
            displayWord(word, meaning);
        } else {
            displayWord('Serendipity', 'The occurrence of events by chance in a happy or beneficial way.');
        }
    } catch (error) {
        console.error('Error loading word of day:', error);
        displayWord('Serendipity', 'The occurrence of events by chance in a happy or beneficial way.');
    }
}

function displayWord(word, meaning) {
    const container = document.getElementById('wordOfDay');
    container.innerHTML = `
        <div class="word-header">
            <div class="word-word">${escapeHtml(word)}</div>
            <button class="pronounce-btn" onclick="pronounceWord('${word.replace(/'/g, "\\'")}')">
                🔊
            </button>
        </div>
        <div class="word-meaning">${escapeHtml(meaning)}</div>
    `;
}

// Pronounce word function
function pronounceWord(word) {
    // Cancel any ongoing speech
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.9; // Slightly slow rate for clarity
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Speak the word
    window.speechSynthesis.speak(utterance);
}

// Audio Recording Variables
let recognition = null;
let isRecording = false;
let recognizedText = '';

// Initialize Speech Recognition
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        alert('Speech Recognition is not supported in your browser. Please use Chrome, Edge, or Firefox.');
        return false;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
        isRecording = true;
        recognizedText = '';
        document.getElementById('recordBtn').classList.add('recording');
        document.getElementById('recordBtn').textContent = '⏹️ Stop';
    };
    
    recognition.onresult = (event) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                recognizedText += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Update the audio capture widget if it exists
        const audioWidget = document.querySelector('[data-type="audio"]');
        if (audioWidget) {
            const textContent = audioWidget.querySelector('[data-audio-text]');
            if (textContent) {
                textContent.textContent = (recognizedText + interimTranscript).trim();
            }
        }
    };
    
    recognition.onend = () => {
        isRecording = false;
        document.getElementById('recordBtn').classList.remove('recording');
        document.getElementById('recordBtn').textContent = '🎙️ Record';
        
        // Update final text in widget
        const audioWidget = document.querySelector('[data-type="audio"]');
        if (audioWidget) {
            const textContent = audioWidget.querySelector('[data-audio-text]');
            if (textContent) {
                textContent.textContent = recognizedText.trim();
            }
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'network') {
            alert('Network error. Please check your internet connection.');
        }
    };
    
    return true;
}

// Toggle Audio Recording
function toggleAudioRecording() {
    if (!recognition) {
        if (!initSpeechRecognition()) return;
    }
    
    if (isRecording) {
        recognition.stop();
    } else {
        recognizedText = '';
        recognition.start();
    }
}

// Save Audio Text to File
async function saveAudioCapture() {
    if (!recognizedText.trim()) {
        alert('No audio captured. Please record something first.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/save-audio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: recognizedText.trim()
            })
        });
        
        if (response.ok) {
            alert('Audio capture saved successfully!');
            recognizedText = '';
            const audioWidget = document.querySelector('[data-type="audio"]');
            if (audioWidget) {
                const textContent = audioWidget.querySelector('[data-audio-text]');
                if (textContent) {
                    textContent.textContent = '';
                }
            }
        } else {
            alert('Failed to save audio capture.');
        }
    } catch (error) {
        console.error('Error saving audio capture:', error);
        alert('Error saving audio capture.');
    }
}
