"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [lastCheckIn, setLastCheckIn] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const getTodayString = () => new Date().toISOString().split("T")[0];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await loadOrInitUser(currentUser);
        } catch (e) {
          console.error(e);
        }
      } else {
        setPoints(0);
        setLastCheckIn("");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loadOrInitUser = async (currentUser: User) => {
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
      };
      await setDoc(userRef, newUser);
    }
  };

  const handleCheckIn = async () => {
    if (!user) return;
    const today = getTodayString();
    if (lastCheckIn === today) {
      alert("Hôm nay đã điểm danh rồi!");
      return;
    }
    const userRef = doc(db, "users", user.uid);
    const newPoints = points + 500;
    await setDoc(userRef, { points: newPoints, lastCheckIn: today }, { merge: true });
    setPoints(newPoints);
    setLastCheckIn(today);
    alert("🎉 Điểm danh thành công +500 PTS!");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-amber-400 font-bold">
        ĐANG TẢI DRAGON ARCADE...
      </div>
    );
  }

  const isCheckedInToday = lastCheckIn === getTodayString();

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-amber-500/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐉</span>
            <span className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              DRAGON ARCADE
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2 bg-slate-800 border border-amber-500/40 px-3 py-1.5 rounded-xl">
                  <span>🪙</span>
                  <span className="font-extrabold text-amber-400">{points.toLocaleString()}</span>
                  <span className="text-xs text-amber-300/70">PTS</span>
                </div>

                <button
                  onClick={handleCheckIn}
                  disabled={isCheckedInToday}
                  className={`text-xs sm:text-sm font-bold py-1.5 px-3 sm:px-4 rounded-xl transition ${
                    isCheckedInToday
                      ? "bg-slate-800 text-slate-500"
                      : "bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer"
                  }`}
                >
                  {isCheckedInToday ? "✅ Đã nhận 500p" : "📅 Điểm Danh (+500)"}
                </button>

                <button onClick={() => signOut(auth)} className="text-xs text-slate-400 hover:text-red-400">
                  Thoát
                </button>
              </>
            ) : (
              <button
                onClick={() => signInWithPopup(auth, googleProvider)}
                className="bg-amber-400 text-slate-950 font-bold text-sm py-2 px-4 rounded-xl"
              >
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Banner */}
      <section className="relative flex items-center justify-center min-h-[300px] bg-cover bg-center text-center p-6"
        style={{ backgroundImage: "url('https://images.alphacoders.com/605/605592.png')" }}>
        <div className="absolute inset-0 bg-slate-950/80"></div>
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500 mb-2">
            DRAGON GAMING
          </h1>
          <p className="text-slate-300">Tham gia đấm game đối kháng & thử vận may ngay!</p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Vòng Quay & Lọ Vương */}
        <section className="space-y-4">
          <h2 className="text-xl font-black text-amber-400">🔥 ĐẶC QUYỀN MỖI NGÀY</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold">🎡 Vòng Quay May Mắn</h3>
              <p className="text-slate-400 text-sm mt-1">Quay thưởng nhận điểm miễn phí.</p>
            </div>
            <div className="bg-slate-900 border border-orange-500/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold">🏺 Lọ Vương (Hũ Cầu Nguyện)</h3>
              <p className="text-slate-400 text-sm mt-1">Nổ hũ rinh trọn quà to.</p>
            </div>
          </div>
        </section>

        {/* Game Đối Kháng */}
        <section className="space-y-4">
          <h2 className="text-xl font-black text-rose-500">⚔️ GAME ĐỐI KHÁNG</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/dau-truong" className="bg-slate-900 border border-rose-500/40 rounded-2xl p-6 hover:border-amber-400 transition block group">
              <div className="text-4xl mb-2">🥊</div>
              <h3 className="font-bold text-xl text-white group-hover:text-amber-400">Đấu Trường PvP (Cyber Saiyan)</h3>
              <p className="text-slate-400 text-sm mt-1">Chiến đấu 1v1 tung chưởng Kamehameha cực đã!</p>
              <div className="mt-4 bg-amber-400 text-slate-950 font-bold py-2 px-4 rounded-xl text-center text-sm">
                Vào Chiến Ngay 🚀
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}