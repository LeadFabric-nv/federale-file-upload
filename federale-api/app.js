import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequestQueue } from './modules/requestQueue.js';
import uploadRoutes from './routes/upload.js';

const app = express();

// Create request queue with 3 concurrent requests
const queue = createRequestQueue(3);

if (process.env.NODE_ENV !== 'development') {
    // Middleware
    app.use(helmet());
    app.use(cors({
        origin: true,
        credentials: true
    }));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Implement request queue middleware
app.use((req, res, next) => {
    queue.enqueue(req, res, next).catch(next);
});

// Static file serving for development
if (process.env.NODE_ENV === 'development') {
    // Get the current file's directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const staticPath = path.join(__dirname, '../public/');
    app.use(express.static(staticPath));
    
    console.log('Serving static files from:', staticPath);
}

// Routes
app.use('/api', uploadRoutes);

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ status: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Not Found' 
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        error: 'Something went wrong!',
        errorDetails: process.env.NODE_ENV === 'development' ? err : undefined
    });
});

export default app;