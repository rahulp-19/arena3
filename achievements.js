// achievements.js
import { db } from './firebase.js';
import { currentUserDoc } from './auth.js';
import { doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const achievementsList = document.getElementById('achievements-list');
const toastContainer = document.getElementById('toast-container');

// Achievement Definitions
const ACHIEVEMENTS = [
    { id: 'first_merge', icon: '✨', title: 'First Merge', desc: 'Merge two tiles for the first time.', condition: 'merge:4' },
    { id: 'reach_128', icon: '🚀', title: 'Getting Fast', desc: 'Create a 128 tile.', condition: 'merge:128' },
    { id: 'reach_512', icon: '🔥', title: 'On Fire', desc: 'Create a 512 tile.', condition: 'merge:512' },
    { id: 'reach_2048', icon: '👑', title: 'Arena Master', desc: 'Create the 2048 tile! You won!', condition: 'merge:2048' },
    { id: 'score_5000', icon: '💯', title: 'High Scorer', desc: 'Reach a score of 5,000.', condition: 'score:5000' },
    { id: 'play_10_games', icon: '🕹️', title: 'Arcade Addict', desc: 'Play 10 games.', condition: 'games:10' }
];

// Memory cache to avoid spamming DB
let unlockedIds = new Set();

// Render UI grid
function renderAchievements() {
    achievementsList.innerHTML = '';
    
    ACHIEVEMENTS.forEach(ach => {
        const isUnlocked = unlockedIds.has(ach.id);
        const card = document.createElement('div');
        card.className = `achievement-card ${isUnlocked ? 'unlocked' : ''}`;
        
        card.innerHTML = `
            <div class="ach-icon">${ach.icon}</div>
            <div class="ach-info">
                <h4>${ach.title}</h4>
                <p>${ach.desc}</p>
            </div>
        `;
        achievementsList.appendChild(card);
    });
}

// Check unlocking logic
async function checkUnlock(ach) {
    if(!currentUserDoc) return;
    if(unlockedIds.has(ach.id)) return; // Already unlocked

    // Process Unlock
    unlockedIds.add(ach.id);
    if(currentUserDoc.achievements) {
        currentUserDoc.achievements.push(ach.id);
    } else {
        currentUserDoc.achievements = [ach.id];
    }
    
    showToast(ach.title, ach.icon);
    renderAchievements(); // Update screen silently if open
    
    // Save to Firebase
    try {
        const userRef = doc(db, 'users', currentUserDoc.id);
        await updateDoc(userRef, {
            achievements: arrayUnion(ach.id)
        });
    } catch (err) {
        console.error("Failed to save achievement", err);
    }
}

// Listeners
window.addEventListener('sessionReady', (e) => {
    unlockedIds = new Set(e.detail.achievements || []);
    renderAchievements();
});

window.addEventListener('tileMerged', (e) => {
    const tileVal = e.detail;
    ACHIEVEMENTS.forEach(ach => {
        if(ach.condition === `merge:${tileVal}`) {
            checkUnlock(ach);
        }
    });
});

window.addEventListener('scoreSaved', () => {
    if(!currentUserDoc) return;
    
    ACHIEVEMENTS.forEach(ach => {
        if(ach.condition === 'score:5000' && currentUserDoc.highestScore >= 5000) {
            checkUnlock(ach);
        }
        if(ach.condition === 'games:10' && currentUserDoc.totalGames >= 10) {
            checkUnlock(ach);
        }
    });
});

// Toast UI
function showToast(title, icon) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <div>
            <div style="font-size: 0.8rem; color: var(--accent-dark);">Achievement Unlocked</div>
            <strong style="color: var(--accent-neon);">${title}</strong>
        </div>
    `;
    toastContainer.appendChild(toast);
    
    // Cleanup DOM after animation
    setTimeout(() => {
        toast.remove();
    }, 4000);
}
