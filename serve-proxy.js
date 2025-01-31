import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// SSL Certificate Options (generate self-signed certs if needed)
const sslOptions = {
    key: fs.readFileSync(path.resolve('./ssl/key.pem')),
    cert: fs.readFileSync(path.resolve('./ssl/cert.pem'))
};

// Static file serving
const staticDir = path.resolve('./public');
app.use(express.static(staticDir));

// Backend Proxy Configuration
const backendProxyOptions = {
    target: 'http://localhost:3000', // Backend server URL
    changeOrigin: true,
    pathRewrite: {
        '^/api': '/api' // Adjust as needed
    },
    onProxyRes: (proxyRes, req, res) => {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    }
};

// Apply proxy middleware for API routes
app.use('/api', createProxyMiddleware(backendProxyOptions));

// Catch-all route to serve index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
});

// Create HTTPS server
const httpsServer = https.createServer(sslOptions, app);
const httpServer = http.createServer(app);

// Ports
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;
const HTTP_PORT = process.env.HTTP_PORT || 8080;

// Start servers
httpsServer.listen(HTTPS_PORT, () => {
    console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
});

httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP Server running on port ${HTTP_PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down servers...');
    httpsServer.close();
    httpServer.close();
    process.exit(0);
});