const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const TOOLS_DB = path.join(__dirname, 'tools.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ============ TOOLS DATABASE ============
function loadTools() {
    try {
        if (fs.existsSync(TOOLS_DB)) {
            return JSON.parse(fs.readFileSync(TOOLS_DB, 'utf8'));
        }
        return { tools: [] };
    } catch {
        return { tools: [] };
    }
}

function saveTools(data) {
    fs.writeFileSync(TOOLS_DB, JSON.stringify(data, null, 2));
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

// ============ TOOLS MANAGEMENT ============
// Get all tools
app.get('/api/tools', (req, res) => {
    const data = loadTools();
    res.json({ status: true, tools: data.tools });
});

// Add new tool
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
        json: JSON.parse(json),
        query: query || '',
        queryExample: queryExample || '',
        createdAt: new Date().toISOString()
    };

    data.tools.push(newTool);
    saveTools(data);

    res.json({ status: true, message: 'Tool added successfully', tool: newTool });
});

// Delete tool
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

        // Replace query in URL if needed
        let finalUrl = fullUrl;
        if (tool.query && queryValue) {
            finalUrl = fullUrl.replace(tool.query, queryValue);
        }

        // Execute based on method
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

        // Check if response has status
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

// ============ SEARCH TOOLS ============
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

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔑 API Key: ${process.env.API_KEY}`);
    console.log(`🔗 Base URL: ${process.env.BASE_URL}`);
});
