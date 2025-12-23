const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const https = require('https');
const fs = require('fs');
const { google } = require('googleapis');
const axios = require('axios');

// Load environment variables from .env file
const envPath = path.join(__dirname, '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Log that we're reading the variables
console.log('NEWS_API_KEY loaded:', process.env.NEWS_API_KEY ? 'YES' : 'NO');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Global variables for API credentials
let gmailAuth = null;
let newsApiKey = process.env.NEWS_API_KEY || 'YOUR_NEWS_API_KEY';
let jiraConfig = {
    host: process.env.JIRA_HOST || 'https://your-domain.atlassian.net',
    email: process.env.JIRA_EMAIL || 'your-email@example.com',
    apiToken: process.env.JIRA_API_TOKEN || 'YOUR_JIRA_API_TOKEN'
};

// Initialize Gmail Auth
async function initializeGmailAuth() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json',
            scopes: ['https://www.googleapis.com/auth/gmail.readonly']
        });
        gmailAuth = auth;
        console.log('Gmail authentication initialized');
    } catch (error) {
        console.error('Gmail auth error:', error.message);
    }
}

// Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Server is running' });
});

// Gmail API - Get latest emails
app.get('/api/gmail', async (req, res) => {
    try {
        if (!gmailAuth) {
            return res.status(503).json({
                error: 'Gmail authentication not configured. Please set up GOOGLE_APPLICATION_CREDENTIALS'
            });
        }

        const gmail = google.gmail({ version: 'v1', auth: gmailAuth });
        
        const result = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 5,
            q: 'is:unread'
        });

        const messages = result.data.messages || [];
        
        const emailDetails = await Promise.all(
            messages.map(async (msg) => {
                const message = await gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id,
                    format: 'full'
                });

                const headers = message.data.payload.headers;
                const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
                const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
                const date = headers.find(h => h.name === 'Date')?.value || new Date();
                
                let preview = '';
                if (message.data.payload.parts) {
                    const textPart = message.data.payload.parts.find(p => p.mimeType === 'text/plain');
                    if (textPart && textPart.body.data) {
                        preview = Buffer.from(textPart.body.data, 'base64').toString().substring(0, 100);
                    }
                } else if (message.data.payload.body.data) {
                    preview = Buffer.from(message.data.payload.body.data, 'base64').toString().substring(0, 100);
                }

                return {
                    id: msg.id,
                    from: from.substring(0, 50),
                    subject: subject,
                    preview: preview || '(No content)',
                    date: date
                };
            })
        );

        res.json(emailDetails);
    } catch (error) {
        console.error('Gmail error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// News API - Get top 10 AI news
app.get('/api/news', async (req, res) => {
    try {
        if (newsApiKey === 'YOUR_NEWS_API_KEY') {
            console.warn('NewsAPI key not configured');
            return res.status(503).json({
                error: 'NewsAPI key not configured. Please set NEWS_API_KEY environment variable'
            });
        }

        console.log('Fetching news with API key:', newsApiKey.substring(0, 10) + '...');

        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: 'artificial intelligence OR AI OR machine learning OR GPT OR LLM',
                sortBy: 'publishedAt',
                language: 'en',
                pageSize: 10,
                apiKey: newsApiKey
            },
            timeout: 10000,
            httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
        });

        if (!response.data.articles || response.data.articles.length === 0) {
            console.log('No articles found in response');
            return res.json([]);
        }

        const articles = response.data.articles.map(article => ({
            title: article.title || 'No title',
            description: article.description || '',
            url: article.url,
            source: article.source?.name || 'Unknown',
            publishedAt: article.publishedAt,
            image: article.urlToImage
        }));

        console.log('Successfully fetched', articles.length, 'articles');
        res.json(articles);
    } catch (error) {
        console.error('News API error:', error.response?.status, error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || error.message;
        res.status(500).json({ error: 'Failed to fetch news: ' + errorMessage });
    }
});

// TODO API - Get TODOs (can be extended to persist to database)
const todosStorage = [];

app.get('/api/todos', (req, res) => {
    res.json(todosStorage);
});

app.post('/api/todos', (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    const todo = {
        id: Date.now(),
        text: text,
        completed: false,
        createdAt: new Date()
    };

    todosStorage.push(todo);
    res.json(todo);
});

// Jira API - Get sprint tasks
app.get('/api/jira', async (req, res) => {
    try {
        if (jiraConfig.apiToken === 'YOUR_JIRA_API_TOKEN') {
            return res.status(503).json({
                error: 'Jira not configured. Please set JIRA_HOST, JIRA_EMAIL, and JIRA_API_TOKEN'
            });
        }

        const auth = Buffer.from(
            `${jiraConfig.email}:${jiraConfig.apiToken}`
        ).toString('base64');

        // Get active sprint
        const boardResponse = await axios.get(
            `${jiraConfig.host}/rest/agile/1.0/board?type=scrum`,
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (boardResponse.data.values.length === 0) {
            return res.json([]);
        }

        const boardId = boardResponse.data.values[0].id;

        // Get sprint
        const sprintResponse = await axios.get(
            `${jiraConfig.host}/rest/agile/1.0/board/${boardId}/sprint?state=active`,
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (sprintResponse.data.values.length === 0) {
            return res.json([]);
        }

        const sprintId = sprintResponse.data.values[0].id;

        // Get issues in sprint
        const issuesResponse = await axios.get(
            `${jiraConfig.host}/rest/agile/1.0/sprint/${sprintId}/issue`,
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const tasks = issuesResponse.data.issues.map(issue => ({
            key: issue.key,
            title: issue.fields.summary,
            assignee: issue.fields.assignee?.displayName || 'Unassigned',
            status: issue.fields.status.name,
            priority: issue.fields.priority?.name || 'None'
        }));

        res.json(tasks);
    } catch (error) {
        console.error('Jira error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Save TODOs to file
app.post('/api/save-todos', (req, res) => {
    try {
        const { todos } = req.body;
        
        if (!todos || !Array.isArray(todos) || todos.length === 0) {
            return res.status(400).json({ error: 'No todos to save' });
        }
        
        // Create filename with date and time
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const filename = `todos_${dateStr}_${timeStr}.json`;
        const filepath = path.join(__dirname, '..', 'saved-todos', filename);
        
        // Create saved-todos directory if it doesn't exist
        const saveDir = path.join(__dirname, '..', 'saved-todos');
        if (!fs.existsSync(saveDir)) {
            fs.mkdirSync(saveDir, { recursive: true });
        }
        
        // Save todos to file
        const fileContent = {
            savedAt: new Date().toISOString(),
            totalTasks: todos.length,
            completedTasks: todos.filter(t => t.completed).length,
            todos: todos
        };
        
        fs.writeFileSync(filepath, JSON.stringify(fileContent, null, 2));
        
        console.log(`TODOs saved to: ${filename}`);
        
        res.json({ 
            success: true, 
            message: `Saved ${todos.length} tasks to ${filename}`,
            filename: filename
        });
    } catch (error) {
        console.error('Error saving todos:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get Quote of the Day
app.get('/api/quote', async (req, res) => {
    try {
        // Load local quotes
        const quotesFile = path.join(__dirname, 'quotes.json');
        const allQuotes = JSON.parse(fs.readFileSync(quotesFile, 'utf8'));
        
        // Get list of used quotes for today
        const usedQuotesFile = path.join(__dirname, '..', 'saved-quotes', 'used-quotes.json');
        const quotesDir = path.join(__dirname, '..', 'saved-quotes');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(quotesDir)) {
            fs.mkdirSync(quotesDir, { recursive: true });
        }
        
        let usedQuoteTexts = [];
        const today = new Date().toDateString();
        
        if (fs.existsSync(usedQuotesFile)) {
            const data = JSON.parse(fs.readFileSync(usedQuotesFile, 'utf8'));
            // Reset if it's a new day
            if (data.date !== today) {
                usedQuoteTexts = [];
            } else {
                usedQuoteTexts = data.usedQuotes || [];
            }
        }
        
        // Find a quote that hasn't been used today
        let quote = allQuotes.find(q => !usedQuoteTexts.includes(q.text));
        
        // If all quotes have been used today, pick a random one
        if (!quote) {
            quote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
            usedQuoteTexts = []; // Reset
        }
        
        // Add to used quotes
        usedQuoteTexts.push(quote.text);
        
        // Save used quotes
        fs.writeFileSync(usedQuotesFile, JSON.stringify({
            date: today,
            usedQuotes: usedQuoteTexts
        }, null, 2));
        
        // Save quote to daily file
        const dateStr = today.replace(/\s+/g, '_');
        const dailyQuoteFile = path.join(quotesDir, `quotes_${dateStr}.json`);
        fs.writeFileSync(dailyQuoteFile, JSON.stringify({
            date: today,
            quote: quote.text,
            author: quote.author,
            fetchedAt: new Date().toISOString()
        }, null, 2));
        
        console.log(`Quote: "${quote.text}" - ${quote.author}`);
        
        res.json({
            quote: quote.text,
            author: quote.author,
            source: 'local'
        });
    } catch (error) {
        console.error('Error getting quote:', error.message);
        // Return a fallback quote
        res.json({
            quote: 'The only way to do great work is to love what you do.',
            author: 'Steve Jobs',
            source: 'fallback'
        });
    }
});

// Get word of the day
app.get('/api/word', async (req, res) => {
    try {
        // Load local words
        const wordsFile = path.join(__dirname, 'words.json');
        const allWords = JSON.parse(fs.readFileSync(wordsFile, 'utf8'));
        
        // Get list of used words for today
        const usedWordsFile = path.join(__dirname, '..', 'saved-quotes', 'used-words.json');
        const quotesDir = path.join(__dirname, '..', 'saved-quotes');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(quotesDir)) {
            fs.mkdirSync(quotesDir, { recursive: true });
        }
        
        let usedWordTexts = [];
        const today = new Date().toDateString();
        
        if (fs.existsSync(usedWordsFile)) {
            const data = JSON.parse(fs.readFileSync(usedWordsFile, 'utf8'));
            // Reset if it's a new day
            if (data.date !== today) {
                usedWordTexts = [];
            } else {
                usedWordTexts = data.usedWords || [];
            }
        }
        
        // Find a word that hasn't been used today
        let wordObj = allWords.find(w => !usedWordTexts.includes(w.word));
        
        // If all words have been used today, pick a random one
        if (!wordObj) {
            wordObj = allWords[Math.floor(Math.random() * allWords.length)];
            usedWordTexts = []; // Reset
        }
        
        // Add to used words
        usedWordTexts.push(wordObj.word);
        
        // Save used words
        fs.writeFileSync(usedWordsFile, JSON.stringify({
            date: today,
            usedWords: usedWordTexts
        }, null, 2));
        
        // Save word to daily file
        const dateStr = today.replace(/\s+/g, '_');
        const dailyWordFile = path.join(quotesDir, `words_${dateStr}.json`);
        fs.writeFileSync(dailyWordFile, JSON.stringify({
            date: today,
            word: wordObj.word,
            meaning: wordObj.meaning,
            fetchedAt: new Date().toISOString()
        }, null, 2));
        
        console.log(`Word: "${wordObj.word}" - ${wordObj.meaning}`);
        
        res.json({
            word: wordObj.word,
            meaning: wordObj.meaning,
            source: 'local'
        });
    } catch (error) {
        console.error('Error getting word:', error.message);
        // Return a fallback word
        res.json({
            word: 'Serendipity',
            meaning: 'The occurrence of events by chance in a happy or beneficial way; finding good things by luck.',
            source: 'fallback'
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
initializeGmailAuth();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('  GET /api/gmail - Fetch latest unread emails');
    console.log('  GET /api/news - Fetch latest AI news');
    console.log('  GET /api/todos - Fetch TODOs');
    console.log('  POST /api/todos - Create new TODO');
    console.log('  GET /api/jira - Fetch sprint tasks');
    console.log('  POST /api/save-todos - Save todos to file');
    console.log('  GET /api/quote - Get thought of the day');
    console.log('  GET /api/word - Get word of the day');
});

module.exports = app;
