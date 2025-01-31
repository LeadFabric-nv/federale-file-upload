import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import uploadRoutes from './routes/upload.js';

const app = express();

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

// // Static file serving for development
// if (process.env.NODE_ENV === 'development') {
//     // Get the current file's directory
//     const __filename = fileURLToPath(import.meta.url);
//     const __dirname = path.dirname(__filename);
    
//     // Serve static files from project root (2 levels up from current directory)
//     const staticPath = path.join(__dirname, '..');
//     app.use(express.static(staticPath));
    
//     console.log('Serving static files from:', staticPath);
// }

// Routes
app.use('/api', uploadRoutes);

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ status: 'Server is running' });
});

// Catch-all route to serve index.html in development
if (process.env.NODE_ENV === 'development') {
    app.get('*', (req, res) => {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const indexPath = path.join(__dirname, '..', 'index.html');
        res.sendFile(indexPath);
    });
}

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