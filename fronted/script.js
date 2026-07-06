let currentUser = null;
let allTools = [];
let currentCategory = 'all';

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
            loadTools();
        } else {
            document.getElementById('loginError').textContent = data.message;
        }
    } catch (error) {
        document.getElementById('loginError').textContent = 'Connection error';
    }
});

// Enter key for login
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
        </div>
    `).join('');

    document.querySelectorAll('.tool-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            const tool = allTools.find(t => t.id === id);
            if (tool) showToolModal(tool);
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

// ============ TOOL MODAL ============
function showToolModal(tool) {
    const modal = document.getElementById('toolModal');
    document.getElementById('modalTitle').textContent = tool.name;
    
    let html = `
        <p><strong>Category:</strong> ${tool.category}</p>
        <p><strong>Type:</strong> <span class="tool-type ${tool.type.toLowerCase()}">${tool.type}</span></p>
        <p><strong>Endpoint:</strong> <code>${tool.endpoint}</code></p>
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

// Close modal on outside click
window.onclick = (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

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
            alert('✅ Tool added successfully!');
            document.getElementById('addToolModal').style.display = 'none';
            loadTools();
            document.getElementById('addToolForm').reset();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        alert('❌ Connection error');
    }
});