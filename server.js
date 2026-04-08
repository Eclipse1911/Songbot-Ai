const express = require('express');
const { execSync } = require('child_process');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve the UI folder

const binary = process.env.VERCEL ? './backend' : 'backend.exe';

function runCppBot(args) {
    try {
        const cmd = `${binary} ${args.map(a => `"${a}"`).join(' ')}`;
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

app.get('/api/top_local', (req, res) => {
    res.json(runCppBot(['top_rated']));
});

// iTunes Search API — Free, official, no auth needed
const ITUNES_API = 'https://itunes.apple.com/search';
const ITUNES_RSS = 'https://itunes.apple.com/us/rss/topsongs/limit=50/json';

// Helper to normalize iTunes search results
function normalizeItunes(results) {
    return (results || []).map(track => ({
        id: String(track.trackId),
        name: track.trackName,
        primaryArtists: track.artistName,
        album: track.collectionName,
        image: [
            { link: track.artworkUrl100 },
            { link: track.artworkUrl100?.replace('100x100', '500x500') }
        ],
        previewUrl: track.previewUrl,
        genre: track.primaryGenreName,
        duration: track.trackTimeMillis
    }));
}

// 1. Search Online
app.get('/api/music/search', async (req, res) => {
    const { q } = req.query;
    console.log(`[iTunes API] Searching for: ${q}`);
    try {
        const url = `${ITUNES_API}?term=${encodeURIComponent(q)}&media=music&limit=20`;
        const response = await fetch(url);
        const data = await response.json();
        res.json({ status: 'SUCCESS', data: normalizeItunes(data.results) });
    } catch (e) {
        console.error(`[iTunes API Error]`, e);
        res.status(500).json({ error: 'Failed to fetch from iTunes API' });
    }
});

// 2. Discover / Top Rated (RSS Feed)
app.get('/api/music/top', async (req, res) => {
    try {
        const response = await fetch(ITUNES_RSS);
        const data = await response.json();
        
        // RSS feed has a different format than Search API
        const entries = data.feed?.entry || [];
        const songs = entries.map((entry, index) => ({
            id: entry.id?.attributes?.['im:id'] || String(index),
            name: entry['im:name']?.label,
            primaryArtists: entry['im:artist']?.label,
            album: entry['im:collection']?.['im:name']?.label,
            image: [
                { link: entry['im:image']?.[2]?.label } // highest res in rss
            ],
            // Previews in RSS are slightly trickier to extract, usually in link array
            previewUrl: entry.link?.find(l => l.attributes?.type?.includes('audio'))?.attributes?.href || '',
            genre: entry.category?.attributes?.label
        }));
        
        res.json({ status: 'SUCCESS', data: songs });
    } catch (e) {
        console.error(`[iTunes RSS Error]`, e);
        res.status(500).json({ error: 'Failed to fetch from iTunes RSS' });
    }
});

// 3. Simple Proxy for playing the direct URL
app.get('/api/music/fetch', async (req, res) => {
    const { url } = req.query;
    if (url) {
        res.json({ url: decodeURIComponent(url) });
    } else {
        res.status(400).json({ error: 'No URL provided' });
    }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`Frontend accessible via: http://localhost:${PORT}/`);
    });
}

module.exports = app;
