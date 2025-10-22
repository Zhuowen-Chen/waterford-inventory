import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD10pwU8U9qo0ZYr4nDNVsKNt-1FaX7dL4",
  authDomain: "waterford-crystal-invent-92cfa.firebaseapp.com",
  projectId: "waterford-crystal-invent-92cfa",
  storageBucket: "waterford-crystal-invent-92cfa.firebasestorage.app",
  messagingSenderId: "97828431445",
  appId: "1:97828431445:web:2ce0ee38f08d97f5b896dc",
  measurementId: "G-K746T626Z1"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 初始化 Firestore
export const db = getFirestore(app);