"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [lastCheckIn, setLastCheckIn] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Lấy ngày hiện tại dạng chuẩn YYYY-MM-DD để so sánh điểm danh
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Lắng nghe trạng thái đăng nhập và tải dữ liệu ví điểm
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadOrInitUser(currentUser);
      } else {
        setPoints(0);
        setLastCheckIn("");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Hàm khởi tạo hoặc lấy thông tin user từ Firestore
  const loadOrInitUser = async (currentUser: User) => {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      setPoints(data.points || 0);
      setLastCheckIn(data.lastCheckIn || "");
    } else {
      // Tạo mới user với ví điểm khởi tạo = 0
      const newUser = {
        uid: currentUser.uid,
        name: currentUser.displayName || "Game thủ",
        email: currentUser.email,
        photoURL: currentUser.photoURL,
        points: 0,
        lastCheckIn: "",
        createdAt: new Date().toISOString(),
      };
      await setDoc(userRef, newUser);
      setPoints(0);
      setLastCheckIn("");
    }
  };

  // Hàm xử lý Điểm danh nhận 500 điểm
  const handleCheckIn = async () => {
    if (!user) return;
    const today = getTodayString();

    if (lastCheckIn === today) {
      alert("Hôm nay ông đã điểm danh rồi, mai quay lại nhé!");
      return;
    }

    const userRef = doc(db, "users", user.uid);
    try {
      await updateDoc(userRef, {
        points: increment(500),
        lastCheckIn: today,
      });

      setPoints((prev) => prev + 500);
      setLastCheckIn(today);
      alert("🎉 Điểm danh thành công! Nhận ngay +500 điểm vào ví.");
    } catch (error) {
      console.error("Lỗi điểm danh:", error);
      alert("Điểm danh thất bại, thử lại sau nhé!");
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      alert("Đăng nhập thất bại!");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <p className="text-xl font-bold animate-pulse">Đang tải Game Center...</p>
      </div>
    );
  }

  const isCheckedInToday = lastCheckIn === getTodayString();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-6 text-white">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 text-center">
        <h1 className="text-3xl font-extrabold text-amber-400 mb-6">🎮 GAME CENTER 🎮</h1>

        {!user ? (
          <div>
            <p className="text-slate-300 mb-6">Đăng nhập để quản lý ví điểm và điểm danh mỗi ngày!</p>
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-semibold py-3 px-6 rounded-xl hover:bg-slate-100 transition-all shadow-md active:scale-95"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google Logo"
                className="w-5 h-5"
              />
              Đăng nhập bằng Google
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt="Avatar"
                className="w-20 h-20 rounded-full border-4 border-amber-400 mb-4 shadow-lg"
              />
            )}
            <h2 className="text-xl font-bold text-white mb-1">
              {user.displayName || "Game thủ"}
            </h2>
            <p className="text-xs text-slate-400 mb-4">{user.email}</p>

            {/* Ví điểm hiển thị */}
            <div className="w-full bg-slate-700/60 p-4 rounded-xl mb-5 border border-slate-600 flex justify-between items-center">
              <div className="text-left">
                <p className="text-xs text-slate-300 font-medium">Ví Điểm Của Bạn</p>
                <p className="text-3xl font-black text-amber-400">{points} pts</p>
              </div>
              <span className="text-2xl">💰</span>
            </div>

            {/* Nút Điểm danh 30 ngày / Hằng ngày */}
            <button
              onClick={handleCheckIn}
              disabled={isCheckedInToday}
              className={`w-full font-bold py-3 px-4 rounded-xl transition-all shadow-lg mb-3 ${
                isCheckedInToday
                  ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-500 hover:bg-emerald-600 text-slate-950 active:scale-95"
              }`}
            >
              {isCheckedInToday ? "✅ Đã điểm danh hôm nay" : "📅 Điểm danh nhận +500 Điểm"}
            </button>

            <button
              onClick={handleLogout}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-2 px-4 rounded-xl transition-all"
            >
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </main>
  );
}