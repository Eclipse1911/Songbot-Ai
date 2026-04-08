const API_BASE = '/api';

async function fetchAPI(endpoint, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, options);
        return await res.json();
    } catch (e) {
        console.error("API Fetch Error:", e);
        return null;
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    // Fallback if tabId doesn't match a nav link directly 
    const navLink = document.querySelector(`[data-tab="${tabId}"]`);
    if(navLink) navLink.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    const tabContent = document.getElementById(tabId);
    if(tabContent) tabContent.classList.remove('hidden');
    
    if (tabId === 'discover') loadTopTrending('discover-grid');
    if (tabId === 'top') loadTopTrending('top-grid');
    if (tabId === 'local') loadAllLocalSongs();
    if (tabId === 'local_top') loadTopLocalSongs();
}

// === LOCAL LIBRARY (C++ BACKEND) FUNCTIONS ===

function renderSongs(songs, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (!songs || songs.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; background: rgba(255,255,255,0.02); border-radius: 1rem; border: 1px solid var(--border);">
                <i class="fas fa-list" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <h3 style="color: var(--text-main);">No tracks found</h3>
                <p style="color: var(--text-muted); margin-top: 0.5rem;">Try adjusting your search or adding new songs to the AVL tree.</p>
            </div>
        `;
        return;
    }
    
    songs.forEach(song => {
        const card = document.createElement('div');
        card.className = 'song-card';
        card.innerHTML = `
            <div>
                <div style="font-size: 0.8rem; color: var(--accent); font-weight: 600; margin-bottom: 0.5rem;">AVL ID: #${song.id}</div>
                <div class="song-title">${song.name}</div>
                <div class="song-artist"><i class="fas fa-microphone-alt" style="margin-right: 5px;"></i> ${song.artist}</div>
                <div class="song-tags">
                    <span class="tag">${song.genre}</span>
                    <span class="tag rating"><i class="fas fa-star" style="margin-right: 3px;"></i> ${song.rating.toFixed(1)}</span>
                </div>
            </div>
            <button class="btn-secondary" onclick="findSimilarLocal(${song.id})">
                <i class="fas fa-stream"></i> Find Similar (C++)
            </button>
        `;
        container.appendChild(card);
    });
}

async function loadAllLocalSongs() {
    const songs = await fetchAPI('/songs');
    renderSongs(songs, 'local-grid');
}

async function loadTopLocalSongs() {
    const songs = await fetchAPI('/top_local');
    renderSongs(songs, 'local-top-grid');
}

async function performLocalSearch() {
    const query = document.getElementById('local-search-input').value;
    const type = document.getElementById('local-search-type').value;
    if (!query) {
        alert("Please enter a query!");
        return;
    }
    
    document.getElementById('local-grid').innerHTML = '<p style="color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> Traversing AVL Tree...</p>';
    const songs = await fetchAPI(`/search?type=${type}&query=${encodeURIComponent(query)}`);
    renderSongs(songs, 'local-grid');
}

async function performLocalRecommendation() {
    const genre = document.getElementById('local-rec-genre').value;
    document.getElementById('local-rec-results').innerHTML = '<p style="color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> Compiling recommendations...</p>';

    const songs = await fetchAPI(`/recommend?type=genre&query=${encodeURIComponent(genre)}`);
    renderSongs(songs, 'local-rec-results');
}

async function findSimilarLocal(id) {
    switchTab('local_rec');
    document.getElementById('local-rec-results').innerHTML = '<p style="color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> Calculating similarities using OOP polymorphism...</p>';
    
    setTimeout(async () => {
        const songs = await fetchAPI(`/recommend?type=similar&query=${id}`);
        renderSongs(songs, 'local-rec-results');
    }, 500);
}

async function addSong(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    const data = {
        name: document.getElementById('add-name').value,
        artist: document.getElementById('add-artist').value,
        genre: document.getElementById('add-genre').value,
        rating: parseFloat(document.getElementById('add-rating').value)
    };
    
    const res = await fetchAPI('/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if (res && res.status === 'success') {
        setTimeout(() => {
            alert('✅ Song Added Successfully to AVL Tree & File Database!');
            document.getElementById('add-form').reset();
            btn.innerHTML = '<i class="fas fa-save"></i> Save to AVL Tree & Database';
            switchTab('local');
        }, 300);
    } else {
        alert('❌ Error adding song.');
        btn.innerHTML = '<i class="fas fa-save"></i> Save to AVL Tree & Database';
    }
}

async function saveGlobalToLocal(name, artist, genre) {
    // Map iTunes genres to our C++ supported genres
    const genreMap = {
        'hip-hop': 'Hip-Hop', 'hip hop': 'Hip-Hop', 'rap': 'Hip-Hop',
        'rock': 'Rock', 'alternative': 'Rock', 'hard rock': 'Rock', 'indie rock': 'Rock',
        'electronic': 'Electronic', 'dance': 'Electronic', 'edm': 'Electronic', 'house': 'Electronic',
        'jazz': 'Jazz', 'blues': 'Jazz', 'soul': 'Jazz',
    };
    const normalizedGenre = genreMap[genre?.toLowerCase()] || 'Pop';
    
    const data = {
        name: name,
        artist: artist,
        genre: normalizedGenre,
        rating: 5.0
    };
    
    const res = await fetchAPI('/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if (res && res.status === 'success') {
        alert(`✅ Imported "${name}" into your local C++ Library as ${normalizedGenre}!`);
    } else {
        alert('❌ Failed to add song to library.');
    }
}
// === END LOCAL LIBRARY ===



async function loadTopTrending(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '<p style="color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> Fetching trending tracks from iTunes...</p>';
    
    const res = await fetchAPI('/music/top');
    renderGlobalSongs(res?.data || [], containerId);
}

async function performRecommendation() {
    const genre = document.getElementById('rec-genre').value;
    const container = document.getElementById('rec-results');
    
    container.innerHTML = '<p style="color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> Curating recommendations for ' + genre + '...</p>';

    // Search iTunes by the genre keyword to simulate recommendation
    const res = await fetchAPI(`/music/search?q=${encodeURIComponent(genre + " hit")}`);
    renderGlobalSongs(res?.data || [], 'rec-results');
}

async function findSimilar(artist) {
    switchTab('recommend');
    const container = document.getElementById('rec-results');
    container.innerHTML = '<p style="color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> Finding tracks from ' + artist + '...</p>';
    
    const res = await fetchAPI(`/music/search?q=${encodeURIComponent(artist)}`);
    renderGlobalSongs(res?.data || [], 'rec-results');
}

async function performGlobalSearch() {
    const query = document.getElementById('global-search-input').value;
    if (!query) return;

    const container = document.getElementById('global-results');
    container.innerHTML = '<p style="color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> Searching iTunes library...</p>';

    const res = await fetchAPI(`/music/search?q=${encodeURIComponent(query)}`);
    
    if (res && res.error) {
        container.innerHTML = `
            <div style="padding: 2rem; color: #ef4444; background: rgba(239, 68, 68, 0.05); border-radius: 0.5rem; border: 1px solid rgba(239, 68, 68, 0.2);">
                <i class="fas fa-exclamation-triangle"></i> <strong>Search Error:</strong> ${res.details || res.error}
            </div>
        `;
        return;
    }

    renderGlobalSongs(res?.data || [], 'global-results');
}

function renderGlobalSongs(songs, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (!songs || songs.length === 0) {
        container.innerHTML = '<p style="padding: 2rem; color: var(--text-muted)">No results found.</p>';
        return;
    }

    songs.forEach(song => {
        const card = document.createElement('div');
        card.className = 'song-card global-card';
        
        const title = song.name || 'Unknown Track';
        const artist = song.primaryArtists || 'Unknown Artist';
        const img = song.image?.[1]?.link || song.image?.[0]?.link || 'https://via.placeholder.com/150';
        const preview = song.previewUrl || '';
        const genre = song.genre || '';
        
        card.innerHTML = `
            <div style="display:flex; gap:1rem; margin-bottom:1rem;">
                <img src="${img}" style="width:60px; height:60px; border-radius:0.5rem; object-fit:cover;">
                <div style="flex:1; overflow:hidden;">
                    <div class="song-title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${title}">${title}</div>
                    <div class="song-artist" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${artist}">${artist}</div>
                    ${genre ? `<span class="tag" style="font-size:0.7rem; margin-top:4px;">${genre}</span>` : ''}
                </div>
            </div>
            <div class="btn-group" style="display:flex; gap:0.5rem;">
                ${preview
                    ? `<button class="btn-play" style="flex:1" onclick="playDirect('${preview}', '${title.replace(/'/g, "\\'")}', '${artist.replace(/'/g, "\\'")}', '${img}')">
                        <i class="fas fa-play"></i> Preview
                    </button>`
                    : `<button class="btn-play" style="flex:1" disabled style="opacity:0.4; cursor:not-allowed;">
                        <i class="fas fa-ban"></i> No Preview
                    </button>`
                }
                <button class="btn-secondary" style="flex:1" onclick="findSimilar('${artist.replace(/'/g, "\\'")}')">
                    <i class="fas fa-stream"></i> Similar
                </button>
                <button class="btn-save" style="flex:1" onclick="saveGlobalToLocal('${title.replace(/'/g, "\\'")}', '${artist.replace(/'/g, "\\'")}', '${genre.replace(/'/g, "\\'")}')">
                    <i class="fas fa-plus"></i> Save to AVL
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Play audio directly from a pre-known URL (iTunes preview)
function playDirect(previewUrl, title, artist, img) {
    const player = document.getElementById('player-container');
    const audio = document.getElementById('audio-player');

    document.getElementById('player-title').innerText = title;
    document.getElementById('player-artist').innerText = artist + ' (30s Preview)';
    document.getElementById('player-img').src = img;
    player.classList.remove('hidden');

    audio.src = previewUrl;
    audio.play();
}

function closePlayer() {
    const player = document.getElementById('player-container');
    const audio = document.getElementById('audio-player');
    audio.pause();
    player.classList.add('hidden');
}

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
    switchTab('discover');
    
    const globalSearchInput = document.getElementById('global-search-input');
    if (globalSearchInput) {
        globalSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performGlobalSearch();
        });
    }

    const localSearchInput = document.getElementById('local-search-input');
    if (localSearchInput) {
        localSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performLocalSearch();
        });
    }
});
