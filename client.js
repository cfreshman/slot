const status = document.getElementById('status');
const emptyState = document.getElementById('emptyState');
const fileState = document.getElementById('fileState');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const fileDate = document.getElementById('fileDate');
const downloadBtn = document.getElementById('downloadBtn');
const replaceBtn = document.getElementById('replaceBtn');

let ws = null;
let authToken = localStorage.getItem('slot_auth') || null;
let isConnected = false;
let currentMeta = null;

function updateStatus(text, className) {
  status.innerHTML = text;
  status.className = 'status ' + className;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function getHeaders() {
  const headers = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

async function checkAuth() {
  try {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const res = await fetch('/api/auth', { headers });
    const data = await res.json();
    
    if (data.needsSetup) {
      const password = prompt('create password (min 4 characters):');
      if (!password || password.length < 4) {
        alert('password must be at least 4 characters');
        await checkAuth();
        return;
      }
      
      const setupRes = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (setupRes.ok) {
        authToken = password;
        localStorage.setItem('slot_auth', password);
      } else {
        alert('setup failed');
        await checkAuth();
      }
      return;
    }
    
    if (data.requiresAuth && !data.authenticated) {
      localStorage.removeItem('slot_auth');
      authToken = null;
      
      const password = prompt('enter password:');
      if (password) {
        authToken = password;
        localStorage.setItem('slot_auth', password);
        await checkAuth();
      } else {
        document.body.innerHTML = `
          <div style="font-family: 'Google Sans Code', monospace; padding: 2rem; text-align: center; max-width: 400px; margin: 0 auto;">
            <div style="font-size: 0.875rem; margin-bottom: 1rem;">incorrect or missing password</div>
            <div style="font-size: 0.75rem; color: #999;">
              <a href="https://github.com/cfreshman/slot" style="color: #000; text-decoration: underline;">github.com/cfreshman/slot</a>
            </div>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('Auth check failed:', err);
  }
}

function updateUI(meta) {
  currentMeta = meta;
  
  if (!meta.name) {
    emptyState.style.display = 'block';
    fileState.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    fileState.style.display = 'block';
    fileName.textContent = meta.name;
    fileSize.textContent = formatBytes(meta.size);
    fileDate.textContent = formatDate(meta.uploadedAt);
  }
}

async function uploadFile(file) {
  try {
    updateStatus('uploading...', '');
    
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'X-Filename': file.name,
        'Content-Type': 'application/octet-stream'
      },
      body: file
    });
    
    if (res.status === 401) {
      localStorage.removeItem('slot_auth');
      location.reload();
      return;
    }
    
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Upload failed');
      updateStatus('connected', 'connected');
      return;
    }
    
    const data = await res.json();
    updateUI(data.meta);
    updateStatus('connected', 'connected');
  } catch (err) {
    console.error('Upload error:', err);
    alert('Upload failed');
    updateStatus('connected', 'connected');
  }
}

function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);
  
  ws.onopen = () => {
    console.log('Connected');
    isConnected = true;
    updateStatus('●', 'connected');
    
    if (authToken) {
      ws.send(JSON.stringify({ type: 'auth', token: authToken }));
    }
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'meta') {
        updateUI(data.meta);
      }
      
      if (data.type === 'auth' && !data.authenticated) {
        localStorage.removeItem('slot_auth');
        location.reload();
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  };
  
  ws.onclose = () => {
    console.log('Disconnected');
    isConnected = false;
    updateStatus('○', 'disconnected');
    setTimeout(connect, 2000);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

// Upload area events
uploadArea.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    uploadFile(file);
  }
  fileInput.value = '';
});

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  
  const file = e.dataTransfer.files[0];
  if (file) {
    uploadFile(file);
  }
});

// Download button
downloadBtn.addEventListener('click', () => {
  window.location.href = '/api/download';
});

// Replace button
replaceBtn.addEventListener('click', () => {
  fileInput.click();
});

// Initialize
checkAuth().then(() => connect());

