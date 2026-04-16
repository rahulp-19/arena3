// e:\2048 Arena\firebase.js

/* ==============================================================================
   🔥 FIREBASE SETUP GUIDE 🔥
   ==============================================================================
   
   To make this game fully online, you need to connect your own Firebase project.
   Please follow these exact steps:

   1. Go to the Firebase Console: https://console.firebase.google.com/
   2. Click "Add project" and create a new project named "2048 Arena".
   3. Once created, click the "Web" icon (</>) on the project overview page to add an app.
   4. Register the app (you don't need Firebase Hosting checked).
   5. Copy the configuration object they give you and paste it into the `firebaseConfig` variable below.

   6. ENABLE AUTHENTICATION:
      - Go to "Build" -> "Authentication" in the left sidebar.
      - Click "Get Started".
      - Go to the "Sign-in method" tab.
      - Click "Email/Password", enable it, and save.

   7. ENABLE FIRESTORE DATABASE:
      - Go to "Build" -> "Firestore Database".
      - Click "Create database".
      - Start in "Test Mode" for now (or set up basic rules later).
      - Choose a location and create.

   8. FIRESTORE SECURITY RULES (Important for production):
      Go to rules tab in Firestore and paste:
      
      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          match /users/{userId} {
             allow read: if request.auth != null;
             allow write: if request.auth != null && request.auth.uid == request.resource.data.userId;
          }
        }
      }
============================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// ⚠️ REPLACE THIS OBJECT WITH YOUR FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app, auth, db;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization failed! Please check your config in firebase.js", error);
}

export { auth, db };
