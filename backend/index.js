const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const FormData = require('form-data');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============ SUPABASE ============
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ============ MIDDLEWARE ============
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ============ LIMIT SYSTEM ============
const MAX_LIMIT = 10;

async function getUserLimit(userId) {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        let { data, error } = await supabase
            .from('user_limits')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
        
        if (error || !data) {
            const { data: newData, error: insertError } = await supabase
                .from('user_limits')
                .insert([{ user_id: userId, used: 0, reset_date: today }])
                .select()
                .single();
            
            if (insertError) {
                console.error('Insert error:', insertError);
                return { remaining: MAX_LIMIT, used: 0 };
            }
            return { remaining: MAX_LIMIT, used: 0 };
        }
        
        if (data.reset_date !== today) {
            await supabase
                .from('user_limits')
                .update({ used: 0, reset_date: today })
                .eq('user_id', userId);
            return { remaining: MAX_LIMIT, used: 0 };
        }
        
        const used = data.used || 0;
        return { remaining: Math.max(0, MAX_LIMIT - used), used: used };
    } catch (error) {
        console.error('Error getting limit:', error);
        return { remaining: MAX_LIMIT, used: 0 };
    }
}

async function useUserLimit(userId) {
    try {
        const limitData = await getUserLimit(userId);
        if (limitData.remaining <= 0) {
            return { success: false, message: 'Limit habis!' };
        }
        
        const { error } = await supabase
            .from('user_limits')
            .update({ used: supabase.sql`used + 1` })
            .eq('user_id', userId);
        
        if (error) {
            console.error('Error using limit:', error);
            return { success: false, message: 'Error updating limit' };
        }
        return { success: true, remaining: limitData.remaining - 1 };
    } catch (error) {
        console.error('Error using limit:', error);
        return { success: false, message: 'Error' };
    }
}

// ============ API ROUTES ============

app.post('/api/limit', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.json({ status: false, message: 'User ID required' });
    const data = await getUserLimit(userId);
    res.json({ status: true, ...data, maxLimit: MAX_LIMIT });
});

app.post('/api/limit/use', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.json({ status: false, message: 'User ID required' });
    const result = await useUserLimit(userId);
    res.json({ status: result.success, ...result });
});

// ============ TOOLS DATA ============
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

function loadTools() { return toolsData; }
function saveTools(data) { toolsData = data; }

app.get('/api/tools', (req, res) => {
    res.json({ status: true, tools: loadTools().tools });
});

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

app.delete('/api/tools/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = loadTools();
    data.tools = data.tools.filter(t => t.id !== id);
    saveTools(data);
    res.json({ status: true, message: 'Tool deleted' });
});

// ============ UPLOAD & PROCESS IMAGE ============
const API_KEY = process.env.API_KEY || 'f75uul5u';
const BASE_URL = process.env.BASE_URL || 'https://dappaofficial-restapi.my.id';

async function uploadToCDN(buffer, mimeType) {
    try {
        const formData = new FormData();
        formData.append('image', buffer, {
            filename: `image_${Date.now()}.jpg`,
            contentType: mimeType
        });
        const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
            params: { key: process.env.IMGBB_API_KEY || 'a60507c67d4d1a5d3f6b0cecbb168314' },
            headers: formData.getHeaders(),
            timeout: 30000
        });
        return response.data?.data?.url || null;
    } catch (error) {
        console.error('CDN Upload error:', error);
        return null;
    }
}

app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        const { userId, toolId } = req.body;
        if (!userId) return res.status(400).json({ status: false, message: 'User ID required' });
        
        const limitData = await getUserLimit(userId);
        if (limitData.remaining <= 0) {
            return res.status(429).json({ status: false, message: 'Limit habis! Tunggu reset jam 00.00' });
        }
        
        if (!req.file) return res.status(400).json({ status: false, message: 'No image uploaded' });

        const imageUrl = await uploadToCDN(req.file.buffer, req.file.mimetype);
        if (!imageUrl) return res.status(500).json({ status: false, message: 'Failed to upload image' });

        const apiUrl = `${BASE_URL}/imagecreator/upscale`;
        const response = await axios.post(apiUrl, {
            apikey: API_KEY,
            url: imageUrl
        }, {
            timeout: 180000,
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.data?.status || !response.data?.result) {
            return res.status(500).json({ status: false, message: 'API processing failed', error: response.data });
        }

        const imageResponse = await axios.get(response.data.result, { responseType: 'arraybuffer' });
        await useUserLimit(userId);

        res.set('Content-Type', 'image/jpeg');
        res.send(Buffer.from(imageResponse.data));

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ status: false, message: error.response?.data?.error || error.message || 'Internal server error' });
    }
});

// ============ EXECUTE TOOL ============
app.post('/api/execute', async (req, res) => {
    const { toolId, queryValue, userId } = req.body;
    if (!userId) return res.json({ status: false, message: 'User ID required' });
    
    const limitData = await getUserLimit(userId);
    if (limitData.remaining <= 0) {
        return res.json({ status: false, message: 'Limit habis! Tunggu reset jam 00.00' });
    }
    
    const data = loadTools();
    const tool = data.tools.find(t => t.id === toolId);
    if (!tool) return res.json({ status: false, message: 'Tool not found' });

    try {
        const fullUrl = `${BASE_URL}${tool.endpoint}`;
        let finalUrl = fullUrl;
        if (tool.query && queryValue) finalUrl = fullUrl.replace(tool.query, queryValue);

        let response;
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
            return res.json({ status: false, message: result.error || result.message || 'API Error', error: result });
        }

        await useUserLimit(userId);
        res.json({ status: true, data: result, tool: tool.name });

    } catch (error) {
        console.error('Execute error:', error);
        res.json({ status: false, message: error.response?.data?.error || error.message || 'Execution failed' });
    }
});

// ============ SERVE FRONTEND ============
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============ START ============
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🔑 API Key: ${API_KEY}`);
        console.log(`🔗 Base URL: ${BASE_URL}`);
        console.log(`📊 Supabase connected`);
    });
}

module.exports = app;