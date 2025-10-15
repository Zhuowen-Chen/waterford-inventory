import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB4C799PBPH2yQrUBj8Sax6DxO-ZycUvaU",
  authDomain: "waterford-crystal-inventory.firebaseapp.com",
  projectId: "waterford-crystal-inventory",
  storageBucket: "waterford-crystal-inventory.firebasestorage.app",
  messagingSenderId: "930195465251",
  appId: "1:930195465251:web:3fd8bc33d54f6d373cbd96",
  measurementId: "G-22GEWBCHLC"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
