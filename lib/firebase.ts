import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Thông tin cấu hình lấy từ Firebase của ông
const firebaseConfig = {
  apiKey: "AIzaSyBL8C-OufXRyjuEG7Kr1MLNGHLWLsfr1f4",
  authDomain: "shop-diem-game-513611-54540.firebaseapp.com",
  databaseURL: "https://shop-diem-game-513611-54540-default-rtdb.firebaseio.com",
  projectId: "shop-diem-game-513611-54540",
  storageBucket: "shop-diem-game-513611-54540.firebasestorage.app",
  messagingSenderId: "789455666031",
  appId: "1:789455666031:web:06cf32db05b108c61cc69a",
  measurementId: "G-K6KEVGMJ03"
};

// Khởi tạo Firebase app (tránh khởi tạo trùng lặp trên Next.js)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Khởi tạo các dịch vụ cần dùng
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export default app;