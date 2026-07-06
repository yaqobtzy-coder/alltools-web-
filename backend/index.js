const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ DATA TOOLS (LANGSUNG DI SINI) ============
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

// ============ BUAT LOCAL ============
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

// ============ BUAT VERCEL ============
module.exports = app;