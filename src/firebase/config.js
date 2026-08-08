import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get the canonical Auth instance
const auth = getAuth(app);

// Explicitly enforce localStorage-backed persistence so sessions survive
// browser restarts, tab closures, and direct URL navigation.
// This is synchronous and runs before any auth operations.
setPersistence(auth, browserLocalPersistence).catch((err) => {
  // Non-fatal: Firebase will fall back gracefully.
  console.error("[firebase/config] Failed to set auth persistence:", err);
});

const googleProvider = new GoogleAuthProvider();

// Require account selection on every Google sign-in popup
googleProvider.setCustomParameters({
  prompt: "select_account"
});

export { app, auth, googleProvider as GoogleProvider };
