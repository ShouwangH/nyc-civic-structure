#!/usr/bin/env node

// ABOUTME: Production server - serves static files from dist/ and handles API routes
// ABOUTME: Used for deployment on Render or other Node.js hosting platforms

import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { createApiMiddleware } from './server/index.ts';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 3000;
const DIST_DIR = join(__dirname, 'dist');

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

// Create API middleware
const apiMiddleware = createApiMiddleware();

// Create HTTP server
const server = createServer(async (req, res) => {
  const url = req.url || '/';

  // Handle API routes with middleware
  if (url.startsWith('/api')) {
    return new Promise((resolve) => {
      apiMiddleware(req, res, () => {
        // If API middleware doesn't handle it, return 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
        resolve();
      });
    });
  }

  // Serve static files
  try {
    // Default to index.html for SPA routing
    let filePath = join(DIST_DIR, url === '/' ? 'index.html' : url);

    // Try to read the file
    try {
      const content = await readFile(filePath);
      const ext = extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (err) {
      // If file not found, try serving index.html (for SPA client-side routing)
      if (err.code === 'ENOENT' && !url.startsWith('/assets/')) {
        const indexPath = join(DIST_DIR, 'index.html');
        const indexContent = await readFile(indexPath);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexContent);
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${DIST_DIR}`);
  console.log(`🔌 API routes available at: /api/*`);
});
