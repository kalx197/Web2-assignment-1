const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DB_PATH = path.join(__dirname, 'movies.json');

/**
 * Utility: Read and Parse JSON
 */
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

/**
 * Utility: Write to JSON
 */
const writeDB = (data) => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

/**
 * Utility: Collect Request Body
 * Node.js receives data as a stream, so we wrap the 'data'/'end' 
 * events in a Promise for cleaner async/await usage.
 */
const getRequestBody = (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => resolve(JSON.parse(body || '{}')));
        req.on('error', (err) => reject(err));
    });
};

const server = http.createServer(async (req, res) => {
    const { method, url } = req;
    const urlParts = url.split('/');
    const id = urlParts[2];

    // Standard JSON Response Header
    res.setHeader('Content-Type', 'application/json');

    try {
        // --- ROUTE: GET /movies (Read All) ---
        if (method === 'GET' && url === '/movies') {
            res.writeHead(200);
            return res.end(JSON.stringify(readDB()));
        }

        // --- ROUTE: GET /movies/:id (Read One) ---
        if (method === 'GET' && url.startsWith('/movies/')) {
            const movies = readDB();
            const movie = movies.find(m => m.id === id);
            if (!movie) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: "Movie not found" }));
            }
            res.writeHead(200);
            return res.end(JSON.stringify(movie));
        }

        // --- ROUTE: POST /movies (Create) ---
        if (method === 'POST' && url === '/movies') {
            const body = await getRequestBody(req);
            const movies = readDB();
            
            const newMovie = {
                id: Date.now().toString(), // Simple unique ID
                title: body.title,
                director: body.director,
                year: body.year
            };

            movies.push(newMovie);
            writeDB(movies);
            res.writeHead(201);
            return res.end(JSON.stringify(newMovie));
        }

        // --- ROUTE: PUT /movies/:id (Update) ---
        if (method === 'PUT' && url.startsWith('/movies/')) {
            const body = await getRequestBody(req);
            const movies = readDB();
            const index = movies.findIndex(m => m.id === id);

            if (index === -1) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: "Movie not found" }));
            }

            movies[index] = { ...movies[index], ...body, id }; // Ensure ID stays the same
            writeDB(movies);
            res.writeHead(200);
            return res.end(JSON.stringify(movies[index]));
        }

        // --- ROUTE: DELETE /movies/:id (Delete) ---
        if (method === 'DELETE' && url.startsWith('/movies/')) {
            const movies = readDB();
            const newMovies = movies.filter(m => m.id !== id);

            if (movies.length === newMovies.length) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: "Movie not found" }));
            }

            writeDB(newMovies);
            res.writeHead(200);
            return res.end(JSON.stringify({ message: "Success" }));
        }

        // Default 404 for unknown paths
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Route not found" }));

    } catch (err) {
        // Basic Global Error Handler
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Internal Server Error", details: err.message }));
    }
});

server.listen(PORT, () => {
    console.log([OK] Server listening on port ${PORT});
});
