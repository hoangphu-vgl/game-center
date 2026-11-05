"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [lastCheckIn, setLastCheckIn] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await loadOrInitUser(currentUser);
        } catch (error) {
          console.error("Lỗi tải dữ liệu Firestore:", error);
        }
      } else {
        setPoints(0);
        setLastCheckIn("");
      }
      setLoading(false);
    });

    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const loadOrInitUser = async (currentUser: User) => {
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setPoints(data.points || 0);
        setLastCheckIn(data.lastCheckIn || "");
      } else {
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
    } catch (err) {
      console.error("Không kết nối được Firestore:", err);
    }
  };

  const handleCheckIn = async () => {
    if (!user) return;
    const today = getTodayString();

    if (lastCheckIn === today) {
      alert("Hôm nay ông đã điểm danh rồi, mai quay lại nhé!");
      return;
    }

    const userRef = doc(db, "users", user.uid);
    try {
      const newPoints = points + 500;
      await setDoc(
        userRef,
        {
          points: newPoints,
          lastCheckIn: today,
          uid: user.uid,
          name: user.displayName || "Game thủ",
          email: user.email,
          photoURL: user.photoURL,
        },
        { merge: true }
      );

      setPoints(newPoints);
      setLastCheckIn(today);
      alert("🎉 Điểm danh thành công! Nhận ngay +500 điểm vào ví.");
    } catch (error) {
      console.error("Lỗi điểm danh:", error);
      alert("Điểm danh thất bại, kiểm tra lại kết nối mạng!");
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xl font-bold tracking-wider text-amber-400 animate-pulse">
            Đang tải Game Center...
          </p>
        </div>
      </div>
    );
  }

  const isCheckedInToday = lastCheckIn === getTodayString();

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=2070&auto=format&fit=crop')",
      }}
    >
      {/* Lớp phủ làm tối hình nền để nổi bật khung chính */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>

      {/* Card chính phong cách Gaming Kính Mờ */}
      <div className="relative z-10 max-w-md w-full bg-slate-900/90 backdrop-blur-md p-8 rounded-3xl border border-slate-700/60 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-center transition-all duration-300">
        
        {/* Header Logo Game Center */}
        <div className="mb-8">
          <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-xs font-semibold tracking-widest uppercase mb-2">
            Arcade Station
          </span>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 drop-shadow">
            GAME CENTER
          </h1>
        </div>

        {!user ? (
          <div className="space-y-6">
            <p className="text-slate-300 text-sm leading-relaxed">
              Chào mừng bạn đến với Cổng Game Arcade! Đăng nhập ngay để tích điểm và mở khóa các trò chơi cực đỉnh.
            </p>
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-bold py-3.5 px-6 rounded-2xl hover:bg-amber-400 transition-all duration-300 shadow-xl hover:shadow-amber-400/20 active:scale-95"
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
            {/* Avatar & User Info */}
            <div className="relative mb-3">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full border-2 border-amber-400 p-1 shadow-lg object-cover ring-4 ring-amber-400/20"
                />
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              {user.displayName || "Game thủ"}
            </h2>
            <p className="text-xs text-slate-400 mb-6">{user.email}</p>

            {/* Ví Điểm thiết kế nổi bật */}
            <div className="w-full bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 p-5 rounded-2xl mb-6 border border-amber-500/30 flex justify-between items-center shadow-inner">
              <div className="text-left">
                <p className="text-xs text-amber-300/80 font-semibold tracking-wider uppercase">Ví Điểm Chung</p>
                <p className="text-3xl font-black text-amber-400 tracking-tight">{points.toLocaleString()} <span className="text-sm font-bold">PTS</span></p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl shadow">
                🪙
              </div>
            </div>

            {/* Nút Điểm Danh */}
            <button
              onClick={handleCheckIn}
              disabled={isCheckedInToday}
              className={`w-full font-extrabold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg mb-4 flex items-center justify-center gap-2 ${
                isCheckedInToday
                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 shadow-emerald-500/20 active:scale-95 cursor-pointer"
              }`}
            >
              {isCheckedInToday ? (
                <>
                  <span>✅</span> Đã điểm danh hôm nay
                </>
              ) : (
                <>
                  <span>📅</span> Điểm danh (+500 Điểm)
                </>
              )}
            </button>

            {/* Nút Đăng xuất */}
            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors py-2 font-medium"
            >
              Đăng xuất tài khoản
            </button>
          </div>
        )}
      </div>
    </main>
  );
}