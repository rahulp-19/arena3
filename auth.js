// auth.js
import { auth, db } from './firebase.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    setDoc, 
    serverTimestamp,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// UI Elements
const authScreen = document.getElementById('auth-screen');
const menuScreen = document.getElementById('menu-screen');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const signupFields = document.getElementById('signup-fields');
const authForm = document.getElementById('auth-form');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authError = document.getElementById('auth-error');
const usernameInput = document.getElementById('auth-username');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const menuUsername = document.getElementById('menu-username');
const btnLogout = document.getElementById('btn-logout');

let isLoginMode = true;
export let currentUserDoc = null; // Store user details for other modules

// Switch Tabs
tabLogin.addEventListener('click', () => {
    isLoginMode = true;
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    signupFields.style.display = 'none';
    authSubmitBtn.textContent = 'LOG IN';
    authError.textContent = '';
});

tabSignup.addEventListener('click', () => {
    isLoginMode = false;
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    signupFields.style.display = 'block';
    authSubmitBtn.textContent = 'SIGN UP';
    authError.textContent = '';
});

// Authentication Form Submit
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.textContent = '';
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const username = usernameInput.value.trim().toLowerCase();

    if (!isLoginMode) {
        // Signup Validation
        const usernameRegex = /^[a-zA-Z0-9]{3,15}$/;
        if (!usernameRegex.test(username)) {
            authError.textContent = "Invalid username! 3-15 chars, no spaces.";
            return;
        }

        try {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = "CHECKING...";

            // Check if username already exists in Firestore by attempting to read the Document ID
            const userRef = doc(db, "users", username);
            const docSnap = await getDoc(userRef);

            if (docSnap.exists()) {
                authError.textContent = "Username already taken!";
                authSubmitBtn.disabled = false;
                authSubmitBtn.textContent = "SIGN UP";
                return;
            }

            authSubmitBtn.textContent = "CREATING ACCOUNT...";
            // Proceed to create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create Firestore Document using the unique username as the doc ID
            await setDoc(userRef, {
                userId: user.uid,
                username: username,
                email: email,
                totalGames: 0,
                highestScore: 0,
                currentWeekScore: 0,
                weekId: "",
                achievements: [],
                createdAt: serverTimestamp()
            });

            // Handled by onAuthStateChanged
        } catch (error) {
            console.error("Auth error", error);
            authError.textContent = getErrorMessage(error);
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = "SIGN UP";
        }
    } else {
        // Login Logic
        try {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = "LOGGING IN...";
            await signInWithEmailAndPassword(auth, email, password);
            // Handled by onAuthStateChanged
        } catch (error) {
            console.error("Auth error", error);
            authError.textContent = getErrorMessage(error);
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = "LOG IN";
        }
    }
});

// Logout
btnLogout.addEventListener('click', async () => {
    try {
        await signOut(auth);
        switchScreen('auth-screen');
    } catch (error) {
        console.error("Error signing out", error);
    }
});

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Find the user document by userId
        try {
            const q = query(collection(db, "users"), where("userId", "==", user.uid));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const docData = querySnapshot.docs[0];
                currentUserDoc = { id: docData.id, ...docData.data() };
                menuUsername.textContent = currentUserDoc.username;
                
                // Dispatch custom event that session is ready
                window.dispatchEvent(new CustomEvent('sessionReady', { detail: currentUserDoc }));
                
                switchScreen('menu-screen');
            } else {
                // If the user document isn't found (can happen due to race condition right after signup or if Firestore write failed)
                console.warn("User document not found! Might be still creating...");
                // Keep trying for a few seconds if it's a race condition
                setTimeout(async () => {
                    const retrySnap = await getDocs(q);
                    if (!retrySnap.empty) {
                        const docData = retrySnap.docs[0];
                        currentUserDoc = { id: docData.id, ...docData.data() };
                        menuUsername.textContent = currentUserDoc.username;
                        window.dispatchEvent(new CustomEvent('sessionReady', { detail: currentUserDoc }));
                        switchScreen('menu-screen');
                    } else {
                        if (authError) authError.textContent = "Error: Database profile not found. Try logging in again.";
                        await signOut(auth);
                    }
                }, 2000);
            }
        } catch (error) {
            console.error("Error fetching user data", error);
            if (authError) {
                authError.textContent = "Database Error: " + error.message;
            }
        }
    } else {
        currentUserDoc = null;
        switchScreen('auth-screen');
    }
});

// Utility: Switch Screens dynamically
export function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Attach switch screen logic to Back buttons globally
document.querySelectorAll('.back-btn, #btn-back-menu, #btn-menu').forEach(btn => {
    btn.addEventListener('click', () => {
        // If in game, maybe save progress? Dispatched on another script.
        switchScreen('menu-screen');
    });
});

document.getElementById('btn-play').addEventListener('click', () => switchScreen('game-screen'));
document.getElementById('btn-leaderboard').addEventListener('click', () => switchScreen('leaderboard-screen'));
document.getElementById('btn-profile').addEventListener('click', () => switchScreen('profile-screen'));
document.getElementById('btn-achievements').addEventListener('click', () => switchScreen('achievements-screen'));

// Error Messages Helper
function getErrorMessage(error) {
    if (typeof error === 'string') return error;
    return `Error (${error.code || 'unknown'}): ${error.message}`;
}
