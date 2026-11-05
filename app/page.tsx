"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Theo dõi trạng thái đăng nhập thời gian thực
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Hàm xử lý Đăng nhập Google
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      alert("Đăng nhập thất bại, vui lòng thử lại!");
    }
  };

  // Hàm Đăng xuất
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-6 text-white">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 text-center">
        <h1 className="text-3xl font-extrabold text-amber-400 mb-6">🎮 GAME CENTER 🎮</h1>

        {!user ? (
          <div>
            <p className="text-slate-300 mb-6">Đăng nhập để lưu điểm số và chơi trực tuyến với bạn bè!</p>
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
                alt={user.displayName || "Avatar"}
                className="w-20 h-20 rounded-full border-4 border-amber-400 mb-4 shadow-lg"
              />
            )}
            <h2 className="text-xl font-bold text-white mb-1">
              Xin chào, {user.displayName || "Game thủ"}!
            </h2>
            <p className="text-xs text-slate-400 mb-6">{user.email}</p>

            <div className="w-full bg-slate-700 p-4 rounded-xl mb-6 text-left border border-slate-600">
              <p className="text-sm font-semibold text-amber-300 mb-1">Status: Ready</p>
              <p className="text-xs text-slate-300">UID: {user.uid}</p>
            </div>

            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all active:scale-95"
            >
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </main>
  );
}