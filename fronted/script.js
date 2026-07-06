let currentUser = null;
let allTools = [];
let currentCategory = 'all';
let favorites = [];
let history = [];

// ============ THEME ============
function loadTheme() {
    const savedTheme = localStorage.getItem('alltools_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        document.body.classList.remove('light');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.add('light');
        document.body.classList.remove('dark');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-moon"></i>';
    }
}

document.getElementById('themeToggle').addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark');
    if (isDark) {
        document.body.classList.remove('dark');
        document.body.classList.add('light');
        localStorage.setItem('alltools_theme', 'light');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.body.classList.remove('light');
        document.body.classList.add('dark');
        localStorage.setItem('alltools_theme', 'dark');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
    }
});

// ============ LOGIN ============
document.getElementById('loginBtn').addEventListener('click', async () => {
    const username = document.getElementById('usernameInput').value.trim();
    if (!username) {
        document.getElementById('loginError').textContent = 'Please enter username';
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await response.json();

        if (data.status) {
            currentUser = username;
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            document.getElementById('currentUserDisplay').textContent = username;
            loadTheme();
            loadTools();
            loadFavorites();
            loadHistory();
        } else {
            document.getElementById('loginError').textContent = data.message;
        }
    } catch (error) {
        document.getElementById('loginError').textContent = 'Connection error';
    }
});

document.getElementById('usernameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
});

// ============ LOGOUT ============
document.getElementById('logoutBtn').addEventListener('click', () => {
    currentUser = null;
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('usernameInput').value = '';
});

// ============ LOAD TOOLS ============
async function loadTools() {
    try {
        const response = await fetch('/api/tools');
        const data = await response.json();
        if (data.status) {
            allTools = data.tools;
            document.getElementById('totalTools').textContent = allTools.length;
            document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
            loadCategories();
            renderTools(allTools);
        }
    } catch (error) {
        console.error('Load tools error:', error);
    }
}

// ============ LOAD CATEGORIES ============
function loadCategories() {
    const categories = ['all', ...new Set(allTools.map(t => t.category))];
    const container = document.getElementById('categoriesContainer');
    container.innerHTML = categories.map(cat => 
        `<button class="category-btn ${cat === 'all' ? 'active' : ''}" data-category="${cat}">
            ${cat === 'all' ? 'All' : cat}
        </button>`
    ).join('');

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            filterTools();
        });
    });
}

// ============ SEARCH ============
document.getElementById('searchInput').addEventListener('input', filterTools);

function filterTools() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    let filtered = allTools;

    if (currentCategory !== 'all') {
        filtered = filtered.filter(t => t.category === currentCategory);
    }

    if (query) {
        filtered = filtered.filter(t => 
            t.name.toLowerCase().includes(query) ||
            t.category.toLowerCase().includes(query)
        );
    }

    renderTools(filtered);
}

// ============ RENDER TOOLS ============
function renderTools(tools) {
    const grid = document.getElementById('toolsGrid');
    if (tools.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">No tools found</p>';
        return;
    }

    grid.innerHTML = tools.map(tool => `
        <div class="tool-card" data-id="${tool.id}">
            <div class="icon"><i class="fas fa-${getIcon(tool.category)}"></i></div>
            <div class="tool-name">${tool.name}</div>
            <div class="tool-category">${tool.category}</div>
            <span class="tool-type ${tool.type.toLowerCase()}">${tool.type}</span>
            <div class="favorite-star ${favorites.includes(tool.id) ? 'active' : ''}" onclick="event.stopPropagation();toggleFavorite(${tool.id})">
                <i class="fas fa-star"></i>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.tool-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            const tool = allTools.find(t => t.id === id);
            if (tool) {
                showToolModal(tool);
                addToHistory(tool);
            }
        });
    });
}

// ============ GET ICON ============
function getIcon(category) {
    const icons = {
        'Image Tools': 'image',
        'Fake Tools': 'magic',
        'Text Tools': 'font',
        'Video Tools': 'video',
        'Audio Tools': 'music',
        'Other': 'cog'
    };
    return icons[category] || 'cog';
}

// ============ FAVORITES ============
function loadFavorites() {
    favorites = JSON.parse(localStorage.getItem('alltools_favorites') || '[]');
}

function saveFavorites() {
    localStorage.setItem('alltools_favorites', JSON.stringify(favorites));
}

function toggleFavorite(toolId) {
    if (favorites.includes(toolId)) {
        favorites = favorites.filter(id => id !== toolId);
    } else {
        favorites.push(toolId);
        showToast('Added to favorites! ⭐');
    }
    saveFavorites();
    filterTools(); // Refresh display
}

function showFavorites() {
    const favTools = allTools.filter(t => favorites.includes(t.id));
    const list = document.getElementById('favoritesList');
    
    if (favTools.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;">No favorites yet</p>';
    } else {
        list.innerHTML = favTools.map(t => `
            <div class="favorite-item">
                <div>
                    <div class="tool-name">${t.name}</div>
                    <div class="timestamp">${t.category}</div>
                </div>
                <button class="remove-btn" onclick="removeFavorite(${t.id})">Remove</button>
            </div>
        `).join('');
    }
    
    document.getElementById('favoritesModal').style.display = 'flex';
}

function removeFavorite(toolId) {
    favorites = favorites.filter(id => id !== toolId);
    saveFavorites();
    showFavorites();
    filterTools();
}

// ============ HISTORY ============
function loadHistory() {
    history = JSON.parse(localStorage.getItem('alltools_history') || '[]');
}

function saveHistory() {
    localStorage.setItem('alltools_history', JSON.stringify(history));
}

function addToHistory(tool) {
    const existing = history.findIndex(h => h.id === tool.id);
    if (existing !== -1) {
        history.splice(existing, 1);
    }
    history.unshift({
        id: tool.id,
        name: tool.name,
        category: tool.category,
        timestamp: new Date().toISOString()
    });
    
    if (history.length > 50) history.pop(); // Limit to 50
    saveHistory();
}

function showHistory() {
    const list = document.getElementById('historyList');
    
    if (history.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;">No history yet</p>';
    } else {
        list.innerHTML = history.map(h => `
            <div class="history-item">
                <div>
                    <div class="tool-name">${h.name}</div>
                    <div class="timestamp">${new Date(h.timestamp).toLocaleString()} • ${h.category}</div>
                </div>
                <button class="remove-btn" onclick="removeHistory(${h.id})">Remove</button>
            </div>
        `).join('');
    }
    
    document.getElementById('historyModal').style.display = 'flex';
}

function removeHistory(toolId) {
    history = history.filter(h => h.id !== toolId);
    saveHistory();
    showHistory();
}

function clearHistory() {
    if (confirm('Clear all history?')) {
        history = [];
        saveHistory();
        showToast('History cleared!');
        if (document.getElementById('historyModal').style.display === 'flex') {
            showHistory();
        }
    }
}

// ============ TOOL MODAL ============
function showToolModal(tool) {
    const modal = document.getElementById('toolModal');
    document.getElementById('modalTitle').textContent = tool.name;
    
    let html = `
        <p><strong>Category:</strong> ${tool.category}</p>
        <p><strong>Type:</strong> <span class="tool-type ${tool.type.toLowerCase()}">${tool.type}</span></p>
        <p><strong>Endpoint:</strong> <code>${tool.endpoint}</code></p>
        <div style="margin:16px 0;">
            <button onclick="toggleFavoriteFromModal(${tool.id})" class="btn-add-tool" style="background: ${favorites.includes(tool.id) ? '#ffd700' : '#667eea'};">
                <i class="fas fa-star"></i> ${favorites.includes(tool.id) ? ' Remove from Favorites' : ' Add to Favorites'}
            </button>
        </div>
    `;

    if (tool.query && tool.queryExample) {
        html += `
            <div class="form-group">
                <label>${tool.query.replace('{query}', 'Value')}</label>
                <input type="text" id="queryInput" placeholder="Example: ${tool.queryExample}" value="${tool.queryExample}">
            </div>
            <button id="executeBtn" class="btn-add-tool">Execute</button>
        `;
    } else {
        html += `<button id="executeBtn" class="btn-add-tool">Execute</button>`;
    }

    html += `<div id="resultArea" style="margin-top:20px;"></div>`;

    document.getElementById('modalBody').innerHTML = html;
    modal.style.display = 'flex';

    document.querySelector('.modal-close').onclick = () => modal.style.display = 'none';

    document.getElementById('executeBtn').addEventListener('click', async () => {
        const resultArea = document.getElementById('resultArea');
        resultArea.innerHTML = '<p>⏳ Processing...</p>';

        try {
            const queryValue = document.getElementById('queryInput')?.value || '';
            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toolId: tool.id, queryValue })
            });
            const data = await response.json();

            if (data.status) {
                resultArea.innerHTML = `
                    <div style="background:#d4edda;padding:15px;border-radius:8px;border-left:4px solid #28a745;">
                        <strong>✅ Success!</strong>
                        <pre style="background:#f8f9fa;padding:10px;border-radius:5px;overflow:auto;margin-top:10px;">${JSON.stringify(data.data, null, 2)}</pre>
                    </div>
                `;
            } else {
                resultArea.innerHTML = `
                    <div style="background:#f8d7da;padding:15px;border-radius:8px;border-left:4px solid #dc3545;">
                        <strong>❌ Error:</strong> ${data.message}
                        ${data.error ? `<pre style="background:#f8f9fa;padding:10px;border-radius:5px;overflow:auto;margin-top:10px;">${JSON.stringify(data.error, null, 2)}</pre>` : ''}
                    </div>
                `;
            }
        } catch (error) {
            resultArea.innerHTML = `
                <div style="background:#f8d7da;padding:15px;border-radius:8px;border-left:4px solid #dc3545;">
                    <strong>❌ Error:</strong> ${error.message}
                </div>
            `;
        }
    });
}

function toggleFavoriteFromModal(toolId) {
    toggleFavorite(toolId);
    const tool = allTools.find(t => t.id === toolId);
    if (tool) showToolModal(tool);
}

// ============ ADD TOOL ============
document.getElementById('addToolBtn').addEventListener('click', () => {
    document.getElementById('addToolModal').style.display = 'flex';
});

document.getElementById('closeAddModal').addEventListener('click', () => {
    document.getElementById('addToolModal').style.display = 'none';
});

document.getElementById('addToolForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const toolData = {
        name: document.getElementById('toolName').value,
        category: document.getElementById('toolCategory').value,
        type: document.getElementById('toolType').value,
        endpoint: document.getElementById('toolEndpoint').value,
        json: document.getElementById('toolJson').value,
        query: document.getElementById('toolQuery').value,
        queryExample: document.getElementById('toolQueryExample').value
    };

    try {
        const response = await fetch('/api/tools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toolData)
        });
        const data = await response.json();

        if (data.status) {
            showToast('✅ Tool added successfully!');
            document.getElementById('addToolModal').style.display = 'none';
            loadTools();
            document.getElementById('addToolForm').reset();
        } else {
            showToast('❌ ' + data.message);
        }
    } catch (error) {
        showToast('❌ Connection error');
    }
});

// ============ CLOSE MODALS ============
window.onclick = (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

document.getElementById('closeHistoryModal').addEventListener('click', () => {
    document.getElementById('historyModal').style.display = 'none';
});

document.getElementById('closeFavoritesModal').addEventListener('click', () => {
    document.getElementById('favoritesModal').style.display = 'none';
});

// ============ TOAST ============
function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============ TOAST STYLES ============
const style = document.createElement('style');
style.textContent = `
    .toast {
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 12px 24px;
        border-radius: 30px;
        z-index: 9999;
        font-size: 0.9em;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
        max-width: 90%;
        text-align: center;
    }
`;
document.head.appendChild(style);

console.log('✅ All Tools AI loaded!');