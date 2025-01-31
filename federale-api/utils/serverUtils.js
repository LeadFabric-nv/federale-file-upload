/**
 * Create and configure logger based on environment
 */
export function parseLogger(nodeEnv, logLevel) {
    // Basic logger for now - can be enhanced with proper logging library
    return {
        info: (message) => console.log(`[INFO] ${message}`),
        error: (message) => console.error(`[ERROR] ${message}`),
        fatal: (message) => console.error(`[FATAL] ${message}`),
        debug: (message) => nodeEnv === 'development' && console.log(`[DEBUG] ${message}`)
    };
}

/**
 * Event listener for HTTP server "error" event
 */
export function onError(error, port, logger) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    // Handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            logger.fatal(`Port ${port} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            logger.fatal(`Port ${port} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event
 */
export function onListening(server, logger) {
    const addr = server.address();
    const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
    logger.info(`Server listening on ${bind}`);
}