const express = require('express');
const { execSync } = require('child_process');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve the UI folder

function runCppBot(args) {
    try {
        const cmd = `backend.exe ${args.map(a => `"${a}"`).join(' ')}`;
        const output = execSync(cmd, { encoding: 'utf-8' });
        return JSON.parse(output.trim());
    } catch (e) {
        console.error("Error executing C++ bot:", e);
        return { error: 'Failed to process request' };
    }
}

app.get('/api/songs', (req, res) => {
    res.json(runCppBot(['get_all']));
});

app.post('/api/songs', (req, res) => {
    const { name, artist, genre, rating } = req.body;
    res.json(runCppBot(['add', name, artist, genre, rating.toString()]));
});

app.get('/api/search', (req, res) => {
    const { query, type } = req.query; 
    if (type === 'id') {
        res.json(runCppBot(['search_id', query]));
    } else {
        res.json(runCppBot(['search_name', query]));
    }
});

app.get('/api/recommend', (req, res) => {
    const { type, query } = req.query; 
    if (type === 'genre') {
        res.json(runCppBot(['recommend_genre', query]));
    } else if (type === 'similar') {
        res.json(runCppBot(['recommend_similar', query]));
    }
});

app.get('/api/top', (req, res) => {
    res.json(runCppBot(['top_rated']));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Frontend accessible via: http://localhost:${PORT}/`);
});
