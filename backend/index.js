const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ DATA TOOLS ============
let toolsData = {
    tools: [
        {
            id: 1,
            name: "Upscale Image",
            category: "Image Tools",
            type: "POST",
            endpoint: "/imagecreator/upscale",
            json: '{"url":"image_url"}',
            query: "",
            queryExample: ""
        },
        {
            id: 2,
            name: "Fake Dana",
            category: "Fake Tools",
            type: "GET",
            endpoint: "/api/fakedanav2?amount={query}",
            json: '{"status":false,"creator":"Dappa Official","error":"API key tidak valid"}',
            query: "{query}",
            queryExample: "9000"
        },
        {
            id: 3,
            name: "To Anime",
            category: "Image Tools",
            type: "POST",
            endpoint: "/imagecreator/anime",
            json: '{"url":"image_url"}',
            query: "",
            queryExample: ""
        }
    ]
};

function loadTools() {
    return toolsData;
}

function saveTools(data) {
    toolsData = data;
}

// ============ AUTH ============
const VALID_USERNAME = process.env.ADMIN_USERNAME || 'admin';

app.post('/api/login', (req, res) => {
    const { username } = req.body;
    if (username === VALID_USERNAME) {
        res.json({ status: true, message: 'Login success' });
    } else {
        res.json({ status: false, message: 'Invalid username' });
    }
});

// ============ GET TOOLS ============
app.get('/api/tools', (req, res) => {
    const data = loadTools();
    res.json({ status: true, tools: data.tools });
});

// ============ ADD TOOL ============
app.post('/api/tools', (req, res) => {
    const { name, category, type, endpoint, json, query, queryExample } = req.body;
    
    if (!name || !category || !type || !endpoint || !json) {
        return res.json({ status: false, message: 'All fields required' });
    }

    const data = loadTools();
    const newTool = {
        id: Date.now(),
        name,
        category,
        type: type.toUpperCase(),
        endpoint,
        json: json,
        query: query || '',
        queryExample: queryExample || ''
    };

    data.tools.push(newTool);
    saveTools(data);

    res.json({ status: true, message: 'Tool added successfully', tool: newTool });
});

// ============ DELETE TOOL ============
app.delete('/api/tools/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = loadTools();
    data.tools = data.tools.filter(t => t.id !== id);
    saveTools(data);
    res.json({ status: true, message: 'Tool deleted' });
});

// ============ EXECUTE TOOL ============
app.post('/api/execute', async (req, res) => {
    const { toolId, queryValue } = req.body;
    
    const data = loadTools();
    const tool = data.tools.find(t => t.id === toolId);
    
    if (!tool) {
        return res.json({ status: false, message: 'Tool not found' });
    }

    try {
        const API_KEY = process.env.API_KEY;
        const BASE_URL = process.env.BASE_URL;
        const fullUrl = `${BASE_URL}${tool.endpoint}`;
        let response;

        let finalUrl = fullUrl;
        if (tool.query && queryValue) {
            finalUrl = fullUrl.replace(tool.query, queryValue);
        }

        if (tool.type === 'GET') {
            response = await axios.get(finalUrl, {
                params: { apikey: API_KEY },
                timeout: 60000
            });
        } else if (tool.type === 'POST') {
            const bodyData = JSON.parse(tool.json);
            response = await axios.post(finalUrl, {
                ...bodyData,
                apikey: API_KEY
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 60000
            });
        }

        const result = response.data;
        if (result.status === false) {
            return res.json({
                status: false,
                message: result.error || result.message || 'API Error',
                error: result
            });
        }

        res.json({
            status: true,
            data: result,
            tool: tool.name
        });

    } catch (error) {
        console.error('Execute error:', error);
        res.json({
            status: false,
            message: error.response?.data?.error || error.message || 'Execution failed'
        });
    }
});

// ============ CATEGORIES ============
app.get('/api/categories', (req, res) => {
    const data = loadTools();
    const categories = [...new Set(data.tools.map(t => t.category))];
    res.json({ status: true, categories });
});

// ============ SEARCH ============
app.get('/api/search', (req, res) => {
    const { q } = req.query;
    const data = loadTools();
    
    if (!q) {
        return res.json({ status: true, tools: data.tools });
    }

    const filtered = data.tools.filter(t => 
        t.name.toLowerCase().includes(q.toLowerCase()) ||
        t.category.toLowerCase().includes(q.toLowerCase())
    );
    
    res.json({ status: true, tools: filtered });
});

// ============ SERVE HTML ============
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>All Tools AI</title>
            <style>
                * { margin:0; padding:0; box-sizing:border-box; }
                body { 
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .container {
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                }
                h1 { 
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 10px;
                }
                input {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #e0e0e0;
                    border-radius: 10px;
                    margin: 10px 0;
                }
                button {
                    width: 100%;
                    padding: 12px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    cursor: pointer;
                }
                .error { color: red; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔐 All Tools AI</h1>
                <p>Enter username to continue</p>
                <input type="text" id="username" placeholder="Username">
                <button onclick="login()">Login</button>
                <div id="error" class="error"></div>
            </div>
            <script>
                async function login() {
                    const username = document.getElementById('username').value;
                    if (!username) {
                        document.getElementById('error').textContent = 'Please enter username';
                        return;
                    }
                    try {
                        const res = await fetch('/api/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username })
                        });
                        const data = await res.json();
                        if (data.status) {
                            window.location.href = '/dashboard';
                        } else {
                            document.getElementById('error').textContent = data.message;
                        }
                    } catch(e) {
                        document.getElementById('error').textContent = 'Connection error';
                    }
                }
                document.getElementById('username').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') login();
                });
            </script>
        </body>
        </html>
    `);
});

// ============ DASHBOARD ============
app.get('/dashboard', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Dashboard - All Tools AI</title>
            <style>
                * { margin:0; padding:0; box-sizing:border-box; }
                body { 
                    font-family: Arial, sans-serif;
                    background: #f5f5f5;
                    padding: 20px;
                }
                .header {
                    background: white;
                    padding: 20px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .header h1 { 
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .logout-btn {
                    padding: 8px 16px;
                    background: #e74c3c;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .tools-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 20px;
                }
                .tool-card {
                    background: white;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                .tool-card:hover {
                    transform: translateY(-5px);
                }
                .tool-card .name {
                    font-size: 18px;
                    font-weight: bold;
                }
                .tool-card .category {
                    color: #666;
                    font-size: 14px;
                }
                .tool-type {
                    display: inline-block;
                    padding: 2px 10px;
                    border-radius: 10px;
                    font-size: 12px;
                    margin-top: 10px;
                }
                .tool-type.get { background: #d4edda; color: #155724; }
                .tool-type.post { background: #cce5ff; color: #004085; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>✨ All Tools AI</h1>
                <button class="logout-btn" onclick="logout()">Logout</button>
            </div>
            <div id="tools" class="tools-grid">
                <p>Loading tools...</p>
            </div>
            <script>
                async function loadTools() {
                    try {
                        const res = await fetch('/api/tools');
                        const data = await res.json();
                        if (data.status) {
                            const grid = document.getElementById('tools');
                            grid.innerHTML = data.tools.map(tool => \`
                                <div class="tool-card">
                                    <div class="name">\${tool.name}</div>
                                    <div class="category">\${tool.category}</div>
                                    <span class="tool-type \${tool.type.toLowerCase()}">\${tool.type}</span>
                                </div>
                            \`).join('');
                        }
                    } catch(e) {
                        document.getElementById('tools').innerHTML = '<p>Error loading tools</p>';
                    }
                }
                function logout() {
                    window.location.href = '/';
                }
                loadTools();
            </script>
        </body>
        </html>
    `);
});

// ============ BUAT LOCAL ============
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🔑 API Key: ${process.env.API_KEY}`);
        console.log(`🔗 Base URL: ${process.env.BASE_URL}`);
    });
}

// ============ BUAT VERCEL ============
module.exports = app;