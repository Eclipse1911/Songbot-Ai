const API_BASE = 'http://localhost:3000/api';

async function fetchAPI(endpoint, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, options);
        return await res.json();
    } catch (e) {
        console.error("API Fetch Error:", e);
        return null;
    }
}

function renderSongs(songs, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (!songs || songs.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; background: rgba(255,255,255,0.02); border-radius: 1rem; border: 1px solid var(--border);">
                <i class="fas fa-music" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
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
                <div style="font-size: 0.8rem; color: var(--accent); font-weight: 600; margin-bottom: 0.5rem;">#${song.id}</div>
                <div class="song-title">${song.name}</div>
                <div class="song-artist"><i class="fas fa-microphone-alt" style="margin-right: 5px;"></i> ${song.artist}</div>
                <div class="song-tags">
                    <span class="tag">${song.genre}</span>
                    <span class="tag rating"><i class="fas fa-star" style="margin-right: 3px;"></i> ${song.rating.toFixed(1)}</span>
                </div>
            </div>
            <button class="btn-secondary" onclick="findSimilar(${song.id})">
                <i class="fas fa-stream"></i> Find Similar
            </button>
        `;
        container.appendChild(card);
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    if (tabId === 'discover') loadAllSongs();
    if (tabId === 'top') loadTopSongs();
}

async function loadAllSongs() {
    const songs = await fetchAPI('/songs');
    renderSongs(songs, 'discover-grid');
}

async function loadTopSongs() {
    const songs = await fetchAPI('/top');
    renderSongs(songs, 'top-grid');
}

async function performSearch() {
    const query = document.getElementById('search-input').value;
    const type = document.getElementById('search-type').value;
    if (!query) {
        alert("Please enter a query!");
        return;
    }
    
    // UI indicator
    document.getElementById('search-results').innerHTML = '<p style="color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> Traversing AVL Tree / Searching...</p>';
    
    const songs = await fetchAPI(`/search?type=${type}&query=${encodeURIComponent(query)}`);
    renderSongs(songs, 'search-results');
}

async function performRecommendation() {
    const genre = document.getElementById('rec-genre').value;
    
    document.getElementById('rec-results').innerHTML = '<p style="color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> Compiling recommendations...</p>';

    const songs = await fetchAPI(`/recommend?type=genre&query=${encodeURIComponent(genre)}`);
    renderSongs(songs, 'rec-results');
}

async function findSimilar(id) {
    switchTab('recommend');
    document.getElementById('rec-results').innerHTML = '<p style="color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> Calculating similarities using OOP polymorphism...</p>';
    
    // Small delay to simulate AI processing feeling
    setTimeout(async () => {
        const songs = await fetchAPI(`/recommend?type=similar&query=${id}`);
        renderSongs(songs, 'rec-results');
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
            switchTab('discover');
        }, 300);
    } else {
        alert('❌ Error adding song.');
        btn.innerHTML = '<i class="fas fa-save"></i> Save to AVL Tree & Database';
    }
}

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
    switchTab('discover');
    
    // Allow enter key press on search
    document.getElementById('search-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
});
