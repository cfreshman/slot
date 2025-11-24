#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8767;
const DATA_DIR = process.env.DATA_DIR || './data';
const SLOT_FILE = path.join(DATA_DIR, 'slot');
const META_FILE = path.join(DATA_DIR, 'meta.json');
const PASSWORD_FILE = path.join(DATA_DIR, 'password.txt');
const MAX_SIZE = process.env.MAX_SIZE || 1024 * 1024 * 1024; // 1GB default

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize file metadata
let fileMeta = { name: null, size: 0, uploadedAt: null };
if (fs.existsSync(META_FILE)) {
  try {
    fileMeta = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
  } catch (e) {
    console.error('Error loading metadata:', e.message);
  }
}

let passwordHash = null;
if (fs.existsSync(PASSWORD_FILE)) {
  try {
    passwordHash = fs.readFileSync(PASSWORD_FILE, 'utf8').trim();
  } catch (e) {
    console.error('Error loading password file:', e.message);
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password) {
  if (!passwordHash) return false;
  return hashPassword(password) === passwordHash;
}

function saveMeta() {
  fs.writeFileSync(META_FILE, JSON.stringify(fileMeta, null, 2));
}

function serveFile(filePath, contentType, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
}

function checkAuth(req) {
  if (!passwordHash) return true;
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  return verifyPassword(token);
}

function requireAuth(req, res) {
  if (!checkAuth(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return false;
  }
  return true;
}

// HTTP server
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Serve static files
  if (url.pathname === '/' && req.method === 'GET') {
    serveFile('index.html', 'text/html', res);
    return;
  }
  
  if (url.pathname === '/styles.css' && req.method === 'GET') {
    serveFile('styles.css', 'text/css', res);
    return;
  }
  
  if (url.pathname === '/client.js' && req.method === 'GET') {
    serveFile('client.js', 'application/javascript', res);
    return;
  }
  
  // API: Check auth status
  if (url.pathname === '/api/auth' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      needsSetup: !passwordHash,
      requiresAuth: !!passwordHash,
      authenticated: checkAuth(req)
    }));
    return;
  }
  
  // API: Setup password
  if (url.pathname === '/api/setup' && req.method === 'POST') {
    if (passwordHash) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Password already set' }));
      return;
    }
    
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { password } = JSON.parse(body);
        
        if (!password || password.length < 4) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Password must be at least 4 characters' }));
          return;
        }
        
        passwordHash = hashPassword(password);
        fs.writeFileSync(PASSWORD_FILE, passwordHash);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }
  
  // API: Get file metadata
  if (url.pathname === '/api/meta' && req.method === 'GET') {
    if (!requireAuth(req, res)) return;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(fileMeta));
    return;
  }
  
  // API: Upload file
  if (url.pathname === '/api/upload' && req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    
    const filename = req.headers['x-filename'] || 'file';
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > MAX_SIZE) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File too large' }));
      return;
    }
    
    const writeStream = fs.createWriteStream(SLOT_FILE);
    let uploadedSize = 0;
    
    req.on('data', chunk => {
      uploadedSize += chunk.length;
      writeStream.write(chunk);
    });
    
    req.on('end', () => {
      writeStream.end();
      
      fileMeta = {
        name: filename,
        size: uploadedSize,
        uploadedAt: new Date().toISOString()
      };
      saveMeta();
      
      // Broadcast update to all connected clients
      broadcastMeta();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, meta: fileMeta }));
    });
    
    req.on('error', (err) => {
      console.error('Upload error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Upload failed' }));
    });
    
    return;
  }
  
  // API: Download file
  if (url.pathname === '/api/download' && req.method === 'GET') {
    if (!requireAuth(req, res)) return;
    
    if (!fs.existsSync(SLOT_FILE) || !fileMeta.name) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No file uploaded' }));
      return;
    }
    
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileMeta.name}"`,
      'Content-Length': fileMeta.size
    });
    
    const readStream = fs.createReadStream(SLOT_FILE);
    readStream.pipe(res);
    return;
  }
  
  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

// WebSocket server
const wss = new WebSocket.Server({ server });

function broadcastMeta() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'meta', meta: fileMeta }));
    }
  });
}

wss.on('connection', (ws, req) => {
  console.log('Client connected');
  
  // Send current metadata immediately
  ws.send(JSON.stringify({ type: 'meta', meta: fileMeta }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'auth') {
        ws.authenticated = !passwordHash || verifyPassword(data.token);
        ws.send(JSON.stringify({ type: 'auth', authenticated: ws.authenticated }));
      }
    } catch (e) {
      console.error('WebSocket error:', e);
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`📁 slot running on http://localhost:${PORT}`);
  console.log(`📁 Data stored in ${path.resolve(DATA_DIR)}`);
  console.log(`📏 Max file size: ${(MAX_SIZE / 1024 / 1024).toFixed(0)}MB`);
  if (passwordHash) {
    console.log(`🔒 Password required`);
  } else {
    console.log(`⚠️  No password set - first visitor will set password`);
  }
});

