// script.js
import { db } from './firebase.js';
import { currentUserDoc } from './auth.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// DOM Elements
const boardElement = document.getElementById('game-board');
const currentScoreEl = document.getElementById('current-score');
const bestScoreEl = document.getElementById('best-score');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreEl = document.getElementById('final-score');
const btnTryAgain = document.getElementById('btn-try-again');
const btnRestart = document.getElementById('btn-restart');

// Game State
let grid = [];
let score = 0;
let bestScore = 0;
const SIZE = 4;
let isGameOver = false;
let isAnimating = false;

// Initialize Game Session
window.addEventListener('sessionReady', (e) => {
    bestScore = e.detail.highestScore || 0;
    bestScoreEl.textContent = bestScore;
    document.getElementById('profile-username').textContent = e.detail.username;
    document.getElementById('profile-email').textContent = e.detail.email;
    document.getElementById('profile-avatar-initial').textContent = e.detail.username.charAt(0).toUpperCase();
    
    document.getElementById('stat-games').textContent = e.detail.totalGames || 0;
    document.getElementById('stat-high').textContent = e.detail.highestScore || 0;
    document.getElementById('stat-weekly').textContent = e.detail.currentWeekScore || 0;
    document.getElementById('stat-joined').textContent = e.detail.createdAt ? new Date(e.detail.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
});

// Setup Board
function initGame() {
    grid = [...Array(SIZE)].map(() => Array(SIZE).fill(0));
    score = 0;
    isGameOver = false;
    currentScoreEl.textContent = '0';
    gameOverModal.classList.add('hidden');
    boardElement.innerHTML = '';
    
    // Create empty cells
    for(let i=0; i<SIZE*SIZE; i++) {
        let cell = document.createElement('div');
        cell.classList.add('grid-cell');
        boardElement.appendChild(cell);
    }
    
    addRandomTile();
    addRandomTile();
    renderBoard();
}

btnTryAgain.addEventListener('click', initGame);
btnRestart.addEventListener('click', initGame);

document.getElementById('btn-play').addEventListener('click', () => {
    if(grid.length === 0 || isGameOver) initGame();
});

// Render Board
function renderBoard() {
    // Clear existing tiles in DOM
    document.querySelectorAll('.tile').forEach(t => t.remove());

    const cellSize = boardElement.clientWidth / SIZE;

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            let val = grid[r][c];
            if (val !== 0) {
                let tile = document.createElement('div');
                tile.classList.add('tile');
                tile.dataset.value = val;
                tile.textContent = val;
                
                // Style coloring via CSS variables
                let tileColor = `var(--tile-${val})`;
                if(val > 2048) tileColor = 'var(--tile-super)';
                tile.style.background = tileColor;
                
                // Dimension and Position
                const gap = 10;
                const totalGap = gap * (SIZE+1);
                // Dynamically calculate size depending on actual flex/grid container to be pixel perfect
                // For simplicity, we use CSS variables or exact percentages
                tile.style.width = `calc(25% - ${gap * 0.75}px)`;
                tile.style.height = `calc(25% - ${gap * 0.75}px)`;
                
                // Position absolute relative to grid
                tile.style.top = `calc(${r * 25}% + ${gap + r * gap/SIZE}px - ${gap}px)`;
                tile.style.left = `calc(${c * 25}% + ${gap + c * gap/SIZE}px - ${gap}px)`;

                boardElement.appendChild(tile);
            }
        }
    }
}

// Add Tile
function addRandomTile() {
    let emptyCells = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (grid[r][c] === 0) emptyCells.push({r, c});
        }
    }
    if (emptyCells.length > 0) {
        let rand = Math.floor(Math.random() * emptyCells.length);
        let {r, c} = emptyCells[rand];
        grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
}

// Movement Logic
function slideLine(row) {
    let arr = row.filter(val => val !== 0); // remove zeros
    let missing = SIZE - arr.length;
    let zeros = Array(missing).fill(0);
    return arr.concat(zeros); 
}

function combineLine(row) {
    for (let i = 0; i < SIZE - 1; i++) {
        if (row[i] !== 0 && row[i] === row[i+1]) {
            row[i] *= 2;
            row[i+1] = 0;
            updateScore(row[i]);
            // Dispatch Merge Event for Achievements
            window.dispatchEvent(new CustomEvent('tileMerged', { detail: row[i] }));
        }
    }
    return row;
}

function updateScore(points) {
    score += points;
    currentScoreEl.textContent = score;
    if (score > bestScore) {
        bestScore = score;
        bestScoreEl.textContent = bestScore;
    }
}

function operate(row) {
    row = slideLine(row);
    row = combineLine(row);
    row = slideLine(row);
    return row;
}

// Move Handlers
async function move(direction) {
    if(isGameOver || isAnimating || document.getElementById('game-screen').classList.contains('active') === false) return;
    
    let oldGrid = JSON.stringify(grid);
    isAnimating = true;

    if (direction === 'LEFT') {
        for (let r = 0; r < SIZE; r++) grid[r] = operate(grid[r]);
    } else if (direction === 'RIGHT') {
        for (let r = 0; r < SIZE; r++) grid[r] = operate(grid[r].slice().reverse()).reverse();
    } else if (direction === 'UP') {
        for (let c = 0; c < SIZE; c++) {
            let col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
            col = operate(col);
            for(let r=0; r<SIZE; r++) grid[r][c] = col[r];
        }
    } else if (direction === 'DOWN') {
        for (let c = 0; c < SIZE; c++) {
            let col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
            col = operate(col.slice().reverse()).reverse();
            for(let r=0; r<SIZE; r++) grid[r][c] = col[r];
        }
    }

    if (oldGrid !== JSON.stringify(grid)) {
        addRandomTile();
        renderBoard();
        checkGameOver();
    }
    
    setTimeout(() => { isAnimating = false; }, 50); // Small cooldown
}

// Controls: Keyboard
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowUp': move('UP'); break;
        case 'ArrowDown': move('DOWN'); break;
        case 'ArrowLeft': move('LEFT'); break;
        case 'ArrowRight': move('RIGHT'); break;
    }
});

// Controls: Touch/Swipe
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

boardElement.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, {passive: true});

boardElement.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
}, {passive: true});

function handleSwipe() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);
    
    if (Math.max(absX, absY) > 30) { // Threshold
        if (absX > absY) {
            if (diffX > 0) move('RIGHT');
            else move('LEFT');
        } else {
            if (diffY > 0) move('DOWN');
            else move('UP');
        }
    }
}

// Game Over Logic
function checkGameOver() {
    let movesAvailable = false;
    for(let r=0; r<SIZE; r++) {
        for(let c=0; c<SIZE; c++) {
            if(grid[r][c] === 0) movesAvailable = true;
            if(c < SIZE-1 && grid[r][c] === grid[r][c+1]) movesAvailable = true;
            if(r < SIZE-1 && grid[r][c] === grid[r+1][c]) movesAvailable = true;
        }
    }
    
    if (!movesAvailable) {
        isGameOver = true;
        finalScoreEl.textContent = score;
        gameOverModal.classList.remove('hidden');
        saveProgressToFirebase();
    }
}

// Save to Firebase
async function saveProgressToFirebase() {
    if (!currentUserDoc) return;
    
    try {
        const userRef = doc(db, 'users', currentUserDoc.id);
        const { getWeekId } = await import('./leaderboard.js');
        const currentWeekId = getWeekId();
        
        let updates = {
            totalGames: (currentUserDoc.totalGames || 0) + 1
        };

        if (score > (currentUserDoc.highestScore || 0)) {
            updates.highestScore = score;
            currentUserDoc.highestScore = score; // Update local
        }

        // Handle Weekly Score Reset / Update
        if (currentUserDoc.weekId !== currentWeekId) {
            // New week, override score
            updates.currentWeekScore = score;
            updates.weekId = currentWeekId;
            currentUserDoc.weekId = currentWeekId;
            currentUserDoc.currentWeekScore = score;
        } else if (score > (currentUserDoc.currentWeekScore || 0)) {
            // Same week, new high weekly score
            updates.currentWeekScore = score;
            currentUserDoc.currentWeekScore = score;
        }

        await updateDoc(userRef, updates);

        // Update UI Stats globally
        document.getElementById('stat-games').textContent = updates.totalGames || currentUserDoc.totalGames;
        document.getElementById('stat-high').textContent = currentUserDoc.highestScore;
        document.getElementById('stat-weekly').textContent = currentUserDoc.currentWeekScore;

        // Dispatch Event for Leaderboard refresh hint
        window.dispatchEvent(new Event('scoreSaved'));

    } catch (error) {
        console.error("Failed saving score", error);
    }
}

// Resize listener to rerender board strictly on layout changes
window.addEventListener('resize', () => {
    if(document.getElementById('game-screen').classList.contains('active')) {
        renderBoard();
    }
});
