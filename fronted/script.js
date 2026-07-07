let allTools = [];
let currentCategory = 'all';

function getUserId() {
    let userId = localStorage.getItem('alltools_user_id');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('alltools_user_id', userId);
    }
    return userId;
}

const USER_ID = getUserId();

async function checkLimit() {
    try {
        const response = await fetch('/api/limit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: USER_ID })
        });
        return await response.json();
    } catch (error) {
        console.error('Check limit error:', error);
        return { remaining: 10, maxLimit: 10 };
    }
}

async function updateLimit() {
    try {
        const response = await fetch('/api/limit/use', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: USER_ID })
        });
        return await response.json();
    } catch (error) {
        console.error('Update limit error:', error);
        return null;
    }
}

function updateLimitBadge(remaining, maxLimit) {
    const badge = document.getElementById('limitBadge');
    if (badge) {
        badge.textContent = `🔋 ${remaining}/${maxLimit}`;
        if (remaining <= 0) {
            badge.style.color = '#dc3545';
            badge.style.background = 'rgba(220,53,69,0.2)';
        } else {
            badge.style.color = '';
            badge.style.background = '';
        }
    }
}

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

async function loadTools() {
    try {
        const response = await fetch('/api/tools');
        const data = await response.json();
        if (data.status) {
            allTools = data.tools;
            document.getElementById('totalTools').textContent = allTools.length;
            
            const limitData = await checkLimit();
            updateLimitBadge(limitData.remaining || 10, limitData.maxLimit || 10);
            
            loadCategories();
            renderTools(allTools);
        }
    } catch (error) {
        console.error('Load tools error:', error);
        showToast('Failed to load tools', 'error');
    }
}

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

function showToolModal(tool) {
    const modal = document.getElementById('toolModal');
    document.getElementById('modalTitle').textContent = tool.name;
    
    let html = `
        <p><strong>Category:</strong> ${tool.category}</p>
        <p><strong>Type:</strong> <span class="tool-type ${tool.type.toLowerCase()}">${tool.type}</span></p>
        <p><strong>Endpoint:</strong> <code>${tool.endpoint}</code></p>
    `;

    if (tool.category === 'Image Tools' || tool.name.toLowerCase().includes('upscale') || tool.name.toLowerCase().includes('hd')) {
        html += `
            <div class="form-group">
                <label>Upload Image</label>
                <div class="upload-area" id="uploadArea">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Click or drag to upload image</p>
                    <input type="file" id="fileInput" accept="image/*" style="display: none;">
                </div>
                <div id="filePreviewContainer" style="display: none; text-align: center;">
                    <img id="filePreview" class="file-preview" src="">
                    <p style="font-size: 0.8em; color: #999; margin-top: 5px;" id="fileName"></p>
                </div>
            </div>
            <button id="executeBtn" class="btn-add-tool">Process Image</button>
        `;
    } else if (tool.query && tool.queryExample) {
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

    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    let selectedFile = null;

    if (uploadArea && fileInput) {
        uploadArea.onclick = () => fileInput.click();
        uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.style.borderColor = '#764ba2'; };
        uploadArea.ondragleave = () => { uploadArea.style.borderColor = '#667eea'; };
        uploadArea.ondrop = (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#667eea';
            if (e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
            }
        };
        fileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        };

        function handleFile(file) {
            if (!file.type.startsWith('image/')) {
                showToast('Please select an image file!', 'error');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                showToast('Image too large! Max 10MB.', 'error');
                return;
            }
            selectedFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('filePreviewContainer').style.display = 'block';
                document.getElementById('filePreview').src = e.target.result;
                document.getElementById('fileName').textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
                uploadArea.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    }

    document.getElementById('executeBtn').addEventListener('click', async () => {
        const resultArea = document.getElementById('resultArea');
        
        const limitData = await checkLimit();
        if (limitData.remaining <= 0) {
            showToast('❌ Limit habis! Tunggu reset jam 00.00', 'error');
            resultArea.innerHTML = `
                <div style="background:#f8d7da;padding:15px;border-radius:8px;border-left:4px solid #dc3545;">
                    <strong>❌ Limit Habis!</strong>
                    <p>Kamu sudah mencapai batas 10x penggunaan hari ini.</p>
                    <p>Reset otomatis jam 00.00 WIB.</p>
                </div>
            `;
            return;
        }

        resultArea.innerHTML = '<p>⏳ Processing...</p>';

        try {
            let response;
            let data;

            if (selectedFile) {
                const formData = new FormData();
                formData.append('image', selectedFile);
                formData.append('userId', USER_ID);
                formData.append('toolId', tool.id);

                response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('image')) {
                    const blob = await response.blob();
                    const imageUrl = URL.createObjectURL(blob);
                    resultArea.innerHTML = `
                        <div style="background:#d4edda;padding:15px;border-radius:8px;border-left:4px solid #28a745;">
                            <strong>✅ Success!</strong>
                            <div style="text-align:center;">
                                <img src="${imageUrl}" class="result-image" onclick="window.open('${imageUrl}', '_blank')">
                                <br>
                                <button onclick="downloadImage('${imageUrl}')" class="btn-add-tool" style="margin-top:10px; width:auto; padding:8px 20px;">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                        </div>
                    `;
                    
                    await updateLimit();
                    const newLimit = await checkLimit();
                    updateLimitBadge(newLimit.remaining, newLimit.maxLimit);
                    document.getElementById('totalUsage').textContent = (10 - newLimit.remaining);
                    return;
                } else {
                    data = await response.json();
                }
            } else {
                const queryValue = document.getElementById('queryInput')?.value || '';
                response = await fetch('/api/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        toolId: tool.id, 
                        queryValue,
                        userId: USER_ID 
                    })
                });
                data = await response.json();
            }

            if (data.status) {
                await updateLimit();
                const newLimit = await checkLimit();
                updateLimitBadge(newLimit.remaining, newLimit.maxLimit);
                document.getElementById('totalUsage').textContent = (10 - newLimit.remaining);

                let resultHtml = `
                    <div style="background:#d4edda;padding:15px;border-radius:8px;border-left:4px solid #28a745;">
                        <strong>✅ Success!</strong>
                        <pre style="background:#f8f9fa;padding:10px;border-radius:5px;overflow:auto;margin-top:10px;">${JSON.stringify(data.data, null, 2)}</pre>
                    </div>
                `;

                if (data.data?.result && data.data.result.startsWith('http')) {
                    resultHtml = `
                        <div style="background:#d4edda;padding:15px;border-radius:8px;border-left:4px solid #28a745;">
                            <strong>✅ Success!</strong>
                            <div style="text-align:center;">
                                <img src="${data.data.result}" class="result-image" onclick="window.open('${data.data.result}', '_blank')">
                                <br>
                                <button onclick="window.open('${data.data.result}', '_blank')" class="btn-add-tool" style="margin-top:10px; width:auto; padding:8px 20px;">
                                    <i class="fas fa-external-link-alt"></i> Open Image
                                </button>
                            </div>
                        </div>
                    `;
                }

                resultArea.innerHTML = resultHtml;

            } else {
                resultArea.innerHTML = `
                    <div style="background:#f8d7da;padding:15px;border-radius:8px;border-left:4px solid #dc3545;">
                        <strong>❌ Error:</strong> ${data.message}
                        ${data.error ? `<pre style="background:#f8f9fa;padding:10px;border-radius:5px;overflow:auto;margin-top:10px;">${JSON.stringify(data.error, null, 2)}</pre>` : ''}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Execute error:', error);
            resultArea.innerHTML = `
                <div style="background:#f8d7da;padding:15px;border-radius:8px;border-left:4px solid #dc3545;">
                    <strong>❌ Error:</strong> ${error.message}
                </div>
            `;
        }
    });
}

function downloadImage(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'processed_image.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.style.display = 'block';
        if (type === 'error') {
            toast.style.borderLeftColor = '#dc3545';
        } else {
            toast.style.borderLeftColor = '';
        }
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
}

window.onclick = (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

loadTheme();
loadTools();

console.log('✅ All Tools AI loaded!');
console.log('👤 User ID:', USER_ID);