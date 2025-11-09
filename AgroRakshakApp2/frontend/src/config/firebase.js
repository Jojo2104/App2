import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// YOUR Firebase configuration from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBw-hgPKkxVRJ0BhEva7YFw6UxaZoTkBko",
  authDomain: "agrorakshakapp.firebaseapp.com",
  databaseURL: "https://agrorakshakapp-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "agrorakshakapp",
  storageBucket: "agrorakshakapp.firebasestorage.app",
  messagingSenderId: "112259185009",
  appId: "1:112259185009:web:21bc4d5f279db15a471ed0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

export default app;
