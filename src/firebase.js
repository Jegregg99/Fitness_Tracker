import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBkOyLtWnPsTVLtO8lhcSJIgNa1Jx-njcc",
  authDomain: "fitness-tracker-8eb0f.firebaseapp.com",
  projectId: "fitness-tracker-8eb0f",
  storageBucket: "fitness-tracker-8eb0f.firebasestorage.app",
  messagingSenderId: "130280122772",
  appId: "1:130280122772:web:a4da2dffad9de1144f8781"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);