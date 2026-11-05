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
          name: currentUser.displayName || "Chiến Binh",
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
      console.error("Lỗi kết nối Firestore:", err);
    }
  };

  const handleCheckIn = async () => {
    if (!user) return;
    const today = getTodayString();

    if (lastCheckIn === today) {
      alert("Hôm nay chiến binh đã nhận điểm rồi, mai quay lại nhé!");
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
          name: user.displayName || "Chiến Binh",
          email: user.email,
          photoURL: user.photoURL,
        },
        { merge: true }
      );

      setPoints(newPoints);
      setLastCheckIn(today);
      alert("💥 BÙM! Nhận ngay +500 Năng Lượng Ki (Điểm) vào Ví!");
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-amber-400 font-bold">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xl tracking-widest animate-pulse">ĐANG TẢI NĂNG LƯỢNG SAIYAN...</p>
        </div>
      </div>
    );
  }

  const isCheckedInToday = lastCheckIn === getTodayString();

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-500 selection:text-black">
      
      {/* 🟢 HEADER / NAVIGATION BAR (Chứa Điểm Danh ở Góc Phải Trên) */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-amber-500/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* Logo Dragon Ball Style */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐉</span>
            <span className="font-black text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">
              DRAGON ARCADE
            </span>
          </div>

          {/* Góc Phải: Điểm Danh & Tài Khoản */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Ví điểm */}
                <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 border border-amber-500/40 px-3 py-1.5 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <span className="text-lg">🪙</span>
                  <span className="font-extrabold text-amber-400">{points.toLocaleString()}</span>
                  <span className="text-xs text-amber-300/70 font-semibold">PTS</span>
                </div>

                {/* Nút Điểm Danh Nhanh Góc Phải */}
                <button
                  onClick={handleCheckIn}
                  disabled={isCheckedInToday}
                  className={`text-xs sm:text-sm font-bold py-1.5 px-3 sm:px-4 rounded-xl transition-all shadow-md flex items-center gap-1.5 ${
                    isCheckedInToday
                      ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                      : "bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-orange-500/20 active:scale-95 cursor-pointer"
                  }`}
                >
                  {isCheckedInToday ? "✅ Đã nhận 500p" : "📅 Điểm Danh (+500)"}
                </button>

                {/* Avatar & Logout */}
                <div className="flex items-center gap-2 ml-1">
                  <img
                    src={user.photoURL || "https://via.placeholder.com/40"}
                    alt="User"
                    className="w-9 h-9 rounded-full border-2 border-amber-400"
                  />
                  <button
                    onClick={handleLogout}
                    className="text-xs text-slate-400 hover:text-red-400 transition"
                  >
                    Thoát
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm py-2 px-4 rounded-xl transition shadow-lg active:scale-95 flex items-center gap-2"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="w-4 h-4"
                />
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 🔴 HERO BANNER: Dragon Ball Background + Tiêu Đề Cực Ngầu */}
      <section
        className="relative flex items-center justify-center min-h-[380px] bg-cover bg-center text-center p-6 border-b border-amber-500/20"
        style={{
          backgroundImage:
            "url('https://images.alphacoders.com/605/605592.png')", // Background Dragon Ball Goku Super Saiyan
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/80 to-slate-950"></div>

        <div className="relative z-10 max-w-3xl">
          <span className="inline-block px-4 py-1.5 bg-orange-500/20 border border-orange-500/40 rounded-full text-xs font-bold tracking-widest text-orange-400 uppercase mb-4 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
            ✨ Đấu Trường Huyền Thoại ✨
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] mb-4">
            BỨC PHÁ GIỚI HẠN - BÁ CHỦ GAMING
          </h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-medium drop-shadow">
            Nạp đầy năng lượng Ki, tham gia các minigame đỉnh cao, tích lũy điểm thưởng và khẳng định vị thế Chiến Binh Mạnh Nhất Vũ Trụ!
          </p>
        </div>
      </section>

      {/* 🟡 MAIN CONTENT: Các Mục Trò Chơi */}
      <main className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {/* 🎡 MỤC 1: VÒNG QUAY MAY MẮN & LỌ VƯƠNG */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black tracking-wide text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-2">
            🔥 ĐẶC QUYỀN MỖI NGÀY
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Vòng Quay */}
            <div className="group relative bg-slate-900/80 border border-amber-500/30 rounded-2xl p-6 hover:border-amber-400 transition-all duration-300 shadow-lg hover:shadow-[0_0_25px_rgba(245,158,11,0.2)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">🎡</span>
                <span className="text-xs bg-amber-400/10 text-amber-300 border border-amber-400/30 px-2.5 py-1 rounded-full font-bold">Thử Vận May</span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition">Vòng Quay May Mắn</h3>
              <p className="text-slate-400 text-sm mt-1">Quay thưởng nhận hàng ngàn điểm thưởng mỗi ngày.</p>
              <button className="mt-4 w-full bg-slate-800 group-hover:bg-amber-400 group-hover:text-slate-950 text-amber-400 font-bold py-2.5 rounded-xl transition">
                Vào Quay Ngay 🚀
              </button>
            </div>

            {/* Lọ Vương */}
            <div className="group relative bg-slate-900/80 border border-orange-500/30 rounded-2xl p-6 hover:border-orange-400 transition-all duration-300 shadow-lg hover:shadow-[0_0_25px_rgba(249,115,22,0.2)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">🏺</span>
                <span className="text-xs bg-orange-400/10 text-orange-300 border border-orange-400/30 px-2.5 py-1 rounded-full font-bold">Jackpot</span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition">Lọ Vương (Hũ Cầu Nguyện)</h3>
              <p className="text-slate-400 text-sm mt-1">Tích lũy hũ điểm khổng lồ, nổ hũ rinh trọn quà to!</p>
              <button className="mt-4 w-full bg-slate-800 group-hover:bg-orange-500 group-hover:text-slate-950 text-orange-400 font-bold py-2.5 rounded-xl transition">
                Tham Gia Nổ Hũ 💥
              </button>
            </div>

          </div>
        </section>

        {/* 🎮 MỤC 2: GAME GIẢI TRÍ */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black tracking-wide text-cyan-400 flex items-center gap-2 border-b border-slate-800 pb-2">
            🕹️ GAME GIẢI TRÍ
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Ban Ca */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-cyan-400/60 transition group">
              <div className="text-3xl mb-2">🐟</div>
              <h3 className="font-bold text-lg text-white group-hover:text-cyan-400">Bắn Cá Arcade</h3>
              <p className="text-slate-400 text-xs mt-1">Săn cá rồng, tích điểm đổi quà cùng bạn bè.</p>
            </div>

            {/* Flappy Bird */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-cyan-400/60 transition group">
              <div className="text-3xl mb-2">🐤</div>
              <h3 className="font-bold text-lg text-white group-hover:text-cyan-400">Flappy Dragon</h3>
              <p className="text-slate-400 text-xs mt-1">Vượt qua các chướng ngại vật cực kỳ hóc húa.</p>
            </div>

          </div>
        </section>

        {/* 🧠 MỤC 3: GAME TRÍ TUỆ */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black tracking-wide text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-2">
            🧠 GAME TRÍ TUỆ
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Co Tuong */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-emerald-400/60 transition group">
              <div className="text-3xl mb-2">🪨</div>
              <h3 className="font-bold text-lg text-white group-hover:text-emerald-400">Cờ Tướng</h3>
              <p className="text-slate-400 text-xs mt-1">Đấu trí chiến thuật cùng các cờ thủ đỉnh cao.</p>
            </div>

            {/* Co Vua */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-emerald-400/60 transition group">
              <div className="text-3xl mb-2">♟️</div>
              <h3 className="font-bold text-lg text-white group-hover:text-emerald-400">Cờ Vua</h3>
              <p className="text-slate-400 text-xs mt-1">So tài đấu trí phương Tây điều binh khiển tướng.</p>
            </div>

            {/* Ai La Trieu Phu */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-emerald-400/60 transition group">
              <div className="text-3xl mb-2">💡</div>
              <h3 className="font-bold text-lg text-white group-hover:text-emerald-400">Ai Là Triệu Phú</h3>
              <p className="text-slate-400 text-xs mt-1">Chinh phục 15 câu hỏi kiến thức siêu học thuật.</p>
            </div>

          </div>
        </section>

        {/* ⚔️ MỤC 4: GAME ĐỐI KHÁNG */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black tracking-wide text-rose-500 flex items-center gap-2 border-b border-slate-800 pb-2">
            ⚔️ GAME ĐỐI KHÁNG
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* PvP Arena */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-rose-500/60 transition group">
              <div className="text-3xl mb-2">🥊</div>
              <h3 className="font-bold text-lg text-white group-hover:text-rose-400">Đấu Trường PvP</h3>
              <p className="text-slate-400 text-xs mt-1">Thách đấu 1v1 trực tuyến tranh ngôi bá chủ.</p>
            </div>

          </div>
        </section>

      </main>

    </div>
  );
}