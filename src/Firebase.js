// src/Firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBBzrdyrLqdVHeZWSOnRDF7HI81O3d3bW8",
  authDomain: "orionchatbot-57bc3.firebaseapp.com",
  projectId: "orionchatbot-57bc3",
  storageBucket: "orionchatbot-57bc3.firebasestorage.app",
  messagingSenderId: "115360033240",
  appId: "1:115360033240:web:87f3d162c8e3fda3a46aad"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const functions = getFunctions(app);

export { auth, provider, db, functions, httpsCallable };