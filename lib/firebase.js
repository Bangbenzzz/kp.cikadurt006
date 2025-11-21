import { initializeApp } from "firebase/app";
// PERBAIKAN: Menambahkan 'push' di import
import { getDatabase, ref, get, set, update, remove, onValue, push } from "firebase/database";
import { getAuth } from "firebase/auth"; 

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCcJM-q0ql8YWyyhI3IWn8WTxvpJDD7nl4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "admnrt-cf0ce.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://admnrt-cf0ce-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "admnrt-cf0ce",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "admnrt-cf0ce.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "409774400717",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:409774400717:web:ad7f11c4606f1f3babf584"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// PERBAIKAN: Menambahkan 'push' di export
export { database, ref, get, set, update, remove, onValue, push, auth };