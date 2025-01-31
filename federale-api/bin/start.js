import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

import http from 'http';
import app from '../app.js';
import { parseLogger, onError, onListening } from '../utils/serverUtils.js';



// Constants for environment variables
const NODE_ENV = process.env.NODE_ENV;
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'development' ? 'info' : 'fatal');

// Logger configuration
const logger = parseLogger(NODE_ENV, LOG_LEVEL);

// Create HTTP server
const server = http.createServer(app);

// Start the server
server.listen(process.env.PORT);

// Error handling and server listening events
server.on('error', (error) => onError(error, process.env.PORT, logger));
server.on('listening', () => onListening(server, logger));