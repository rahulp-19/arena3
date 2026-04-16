// leaderboard.js
import { db } from './firebase.js';
import { currentUserDoc } from './auth.js';
import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const leaderboardList = document.getElementById('leaderboard-list');
const resetTimerEl = document.getElementById('reset-timer');

// Calculate Weekly ID (e.g., 2026-W16)
export function getWeekId() {
    const d = new Date();
    // Monday is the start of the week
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
}

// Countdown to next Monday 00:00:00 UTC
function updateResetTimer() {
    const now = new Date();
    const nextReset = new Date();
    
    // Calculate days until next Monday
    let daysUntilMonday = (1 - now.getUTCDay() + 7) % 7;
    if (daysUntilMonday === 0) daysUntilMonday = 7; // If today is Monday, next reset is in 7 days
    
    nextReset.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextReset.setUTCHours(0, 0, 0, 0);
    
    const diff = nextReset - now;
    
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);
    
    resetTimerEl.textContent = `${d}d ${h}h ${m}m ${s}s`;
}

setInterval(updateResetTimer, 1000);
updateResetTimer(); // Initial call

// Fetch and Populate Leaderboard
async function loadLeaderboard() {
    if (!document.getElementById('leaderboard-screen').classList.contains('active')) return;
    
    leaderboardList.innerHTML = '<li style="text-align:center; padding: 20px;">Loading global ranking...</li>';
    
    try {
        const currentWeek = getWeekId();
        
        // Query users collection
        // Note: Firestore requires a composite index if filtering by weekId AND sorting by currentWeekScore.
        // To avoid making the user manually build an index, we will fetch users sorted by currentWeekScore, 
        // and filter out those who don't match the current weekId in client, or just assume the server handles week resets.
        // Since we instructed the app to update weekId upon game over, we can just fetch top scores.
        // *Workaround*: We pull more docs, filter valid weeks, then slice top 10.
        
        const q = query(
            collection(db, "users"),
            orderBy("currentWeekScore", "desc"),
            limit(50) 
        );
        
        const querySnapshot = await getDocs(q);
        
        let validScores = [];
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.weekId === currentWeek && data.currentWeekScore > 0) {
                validScores.push({ id: docSnap.id, ...data });
            }
        });
        
        // Sort and limit
        validScores.sort((a,b) => b.currentWeekScore - a.currentWeekScore);
        const top10 = validScores.slice(0, 10);
        
        leaderboardList.innerHTML = '';
        
        if(top10.length === 0) {
            leaderboardList.innerHTML = '<li style="text-align:center; padding: 20px;">No scores recorded yet this week!</li>';
            return;
        }

        top10.forEach((player, index) => {
            const isCurrentUser = currentUserDoc && player.id === currentUserDoc.id;
            
            const li = document.createElement('li');
            li.className = `lb-item ${isCurrentUser ? 'current-user' : ''}`;
            
            let rankSymbol = `#${index+1}`;
            if(index===0) rankSymbol = '🥇';
            if(index===1) rankSymbol = '🥈';
            if(index===2) rankSymbol = '🥉';
            
            li.innerHTML = `
                <div class="lb-rank">${rankSymbol}</div>
                <div class="lb-user">${player.username}</div>
                <div class="lb-score">${player.currentWeekScore}</div>
            `;
            leaderboardList.appendChild(li);
        });

    } catch(err) {
        console.error("Leaderboard error", err);
        leaderboardList.innerHTML = '<li style="text-align:center; padding: 20px; color: #ff4d4d;">Failed to load leaderboard.</li>';
    }
}

// Reload leaderboard when opening the screen
document.getElementById('btn-leaderboard').addEventListener('click', loadLeaderboard);
window.addEventListener('scoreSaved', loadLeaderboard);
