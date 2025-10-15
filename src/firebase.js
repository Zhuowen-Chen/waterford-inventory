// firebase.js
// -----------------------------
// 这个文件负责初始化 Firebase 应用，并导出 Firestore 数据库实例。
// 确保在所有需要访问数据库的组件中导入 db 对象。
// -----------------------------

import { initializeApp } from 'firebase/app';       // 导入 Firebase 核心功能
import { getFirestore } from 'firebase/firestore';  // 导入 Firestore 数据库模块

// ✅ Firebase 项目配置（从 Firebase 控制台复制而来）
const firebaseConfig = {
  apiKey: "AIzaSyB4C799PBPH2yQrUBj8Sax6DxO-ZycUvaU",
  authDomain: "waterford-crystal-inventory.firebaseapp.com",
  projectId: "waterford-crystal-inventory",
  storageBucket: "waterford-crystal-inventory.appspot.com",  // ✅ 修正此行
  messagingSenderId: "930195465251",
  appId: "1:930195465251:web:3fd8bc33d54f6d373cbd96",
  measurementId: "G-22GEWBCHLC"
};

// 🔧 初始化 Firebase 应用
const app = initializeApp(firebaseConfig);

// 🔥 获取 Firestore 数据库实例
export const db = getFirestore(app);

// ✅ 现在你可以在 App.jsx 或其他组件中通过 import { db } from './firebase' 来使用 Firestore。
