import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'development' || process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const createRequestQueue = (concurrency = 3) => {
    let queue = [];
    let running = 0;

    function enqueue(req, res, next) {
        return new Promise((resolve, reject) => {
            const task = { req, res, next, resolve, reject };
            queue.push(task);
            processNext();
        });
    }

    function processNext() {
        if (running >= concurrency || queue.length === 0) {
            return;
        }

        const { req, res, next } = queue.shift();
        running++;

        next();
        running--;
        processNext();
    }

    return { enqueue };
};

const requestQueue = {
    createRequestQueue
};

export { createRequestQueue };
export default requestQueue;