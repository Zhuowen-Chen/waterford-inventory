import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD10pwU8U9qo0ZYr4nDNVsKNt-1FaX7dL4",
  authDomain: "waterford-crystal-invent-92cfa.firebaseapp.com",
  projectId: "waterford-crystal-invent-92cfa",
  storageBucket: "waterford-crystal-invent-92cfa.appspot.com",
  messagingSenderId: "97828431445",
  appId: "1:97828431445:web:2ce0ee38f08d97f5b896dc",
  measurementId: "G-K746T626Z1"
};

// ✅ 确保只初始化一次
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);