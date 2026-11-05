"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const WHEEL_SLICES = [
  { id: 1, label: "🥤 Nước Suối", type: "water", prob: 0.05, color: "#06b6d4" },
  { id: 2, label: "💵 1.000đ", type: "money", value: 1000, prob: 0.10, color: "#eab308" },
  { id: 3, label: "💀 Yamcha Nằm Đất", type: "empty", prob: 0.17, color: "#ef4444" },
  { id: 4, label: "🎟️ +1 Lượt Quay", type: "spin", value: 1, prob: 0.10, color: "#a855f7" },
  { id: 5, label: "🍩 Majin Buu", type: "empty", prob: 0.18, color: "#f97316" },
  { id: 6, label: "💵 2.000 VNĐ", type: "money", value: 2000, prob: 0.08, color: "#22c55e" },
  { id: 7, label: "🌌 Zeno Xoá Sổ", type: "empty", prob: 0.17, color: "#64748b" },
  { id: 8, label: "🚀 Tàu Pảy Pảy", type: "empty", prob: 0.15, color: "#ec4899" },
];

export default function VongQuayPage() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [luckySpins, setLuckySpins] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [spinResultModal, setSpinResultModal] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setPoints(data.points || 0);
          setLuckySpins(data.luckySpins || 3);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const spinWheel = async () => {
    if (isSpinning) return;
    if (luckySpins <= 0) {
      alert("⚡ Hết lượt quay rồi ní ơi! Hãy ghé Shop Đổi Quà để mua thêm lượt nhé!");
      return;
    }

    setIsSpinning(true);
    setSpinResultModal(null);

    const newSpins = luckySpins - 1;
    setLuckySpins(newSpins);
    if (user) {
      await setDoc(doc(db, "users", user.uid), { luckySpins: newSpins }, { merge: true });
    }

    const rand = Math.random();
    let cumulative = 0;
    let selectedIndex = 0;
    for (let i = 0; i < WHEEL_SLICES.length; i++) {
      cumulative += WHEEL_SLICES[i].prob;
      if (rand <= cumulative) {
        selectedIndex = i;
        break;
      }
    }

    const sliceAngle = 360 / WHEEL_SLICES.length;
    const randomFullRounds = 360 * (6 + Math.floor(Math.random() * 4));
    const targetAngle = wheelAngle + randomFullRounds + (360 - (wheelAngle % 360)) + (360 - (selectedIndex * sliceAngle + sliceAngle / 2));

    setWheelAngle(targetAngle);

    setTimeout(async () => {
      setIsSpinning(false);
      const prize = WHEEL_SLICES[selectedIndex];
      let msg = `🎉 Chúc mừng ní trúng: ${prize.label}`;

      if (prize.type === "spin") {
        const updatedSpins = newSpins + (prize.value || 1);
        setLuckySpins(updatedSpins);
        if (user) {
          await setDoc(doc(db, "users", user.uid), { luckySpins: updatedSpins }, { merge: true });
        }
        msg = `🔥 QUÁ ĐỈNH! Ultra Instinct kích hoạt, trúng ngay +1 Lượt Quay Miễn Phí!`;
      } else if (prize.type === "money") {
        msg = `💰 Rồng Thần ban phước! Ní nhận ngay phần thưởng ${prize.label}! Chụp màn hình báo Admin ngay!`;
      } else if (prize.type === "water") {
        msg = `🥤 Khát nước quá hả ní? Trúng ngay 1 Chai Nước Suối mát lạnh từ Đấu Trường!`;
      } else {
        const trollQuotes = [
          "💀 Yamcha nằm đất! Ki của ní chưa đủ tầm nhận quà rồi, quay lại tu luyện đi!",
          "🍩 Bị Majin Buu biến thành kẹo sô-cô-la nuốt chửng mất tiêu phần thưởng!",
          "🌌 Zeno-sama vừa ngứa tay xoá sổ ô quà của ní khỏi đa vũ trụ!",
          "🚀 Tàu Pảy Pảy phóng qua cướp mất phần thưởng rồi, cay chưa ní!"
        ];
        msg = trollQuotes[Math.floor(Math.random() * trollQuotes.length)];
      }

      setSpinResultModal(msg);
    }, 4000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-purple-400 font-black animate-pulse">
        ĐANG TẢI VÒNG QUAY NGỌC RỒNG...
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-white font-sans select-none p-4 sm:p-8 space-y-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center bg-slate-900/90 border border-purple-500/40 px-6 py-4 rounded-2xl shadow-xl backdrop-blur-md">
          <Link href="/" className="text-xs font-bold text-slate-400 hover:text-amber-400 transition">
            ← Quay lại Trang Chủ
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-amber-500/40">
              <span>⚡</span>
              <span className="font-black text-amber-400">{points.toLocaleString()} PTS</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-purple-500/40">
              <span>🎟️</span>
              <span className="font-black text-purple-300">{luckySpins} Lượt Quay</span>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6">
          <div className="space-y-2">
            <div className="inline-block px-4 py-1 bg-purple-500/20 border border-purple-400/40 rounded-full text-xs font-bold text-purple-300 uppercase tracking-widest">
              ✨ Vòng Quay Sức Mạnh Vũ Trụ
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-400 to-amber-400">
              🎡 VÒNG QUAY NGỌC RỒNG MAY MẮN
            </h1>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Quay ngay để rinh quà xịn, né các ô Yamcha và Majin Buu nhé!
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-10">
            <div className="relative w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] flex items-center justify-center">
              <div className="absolute -top-3 z-30 text-3xl animate-bounce">🔻</div>
              <div
                className="w-full h-full rounded-full border-8 border-amber-400 shadow-[0_0_35px_rgba(168,85,247,0.6)] relative overflow-hidden"
                style={{
                  transform: `rotate(${wheelAngle}deg)`,
                  transition: isSpinning ? "transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)" : "none",
                  background: "conic-gradient(#06b6d4 0deg 45deg, #eab308 45deg 90deg, #ef4444 90deg 135deg, #a855f7 135deg 180deg, #f97316 180deg 225deg, #22c55e 225deg 270deg, #64748b 270deg 315deg, #ec4899 315deg 360deg)"
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-[12px] font-black text-slate-950">
                  <div className="absolute top-5 transform -translate-y-1/2 rotate-0 drop-shadow-md">🥤 Nước Suối</div>
                  <div className="absolute right-10 top-16 transform rotate-45 drop-shadow-md">💵 1.000đ</div>
                  <div className="absolute right-5 bottom-20 transform rotate-90 drop-shadow-md">💀 Yamcha</div>
                  <div className="absolute bottom-6 right-16 transform rotate-[135deg] drop-shadow-md">🎟️ +1 Lượt</div>
                  <div className="absolute bottom-5 left-16 transform rotate-180 drop-shadow-md">🍩 Majin Buu</div>
                  <div className="absolute left-5 bottom-20 transform rotate-[225deg] drop-shadow-md">💵 2.000đ</div>
                  <div className="absolute left-8 top-16 transform rotate-[270deg] drop-shadow-md">🌌 Zeno</div>
                  <div className="absolute top-5 left-16 transform rotate-[315deg] drop-shadow-md">🚀 Tàu Pảy Pảy</div>
                </div>
              </div>
              <div className="absolute z-20 w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-4 border-slate-950 shadow-2xl flex items-center justify-center text-2xl font-black">
                🐉
              </div>
            </div>

            <div className="bg-slate-950/90 border border-purple-500/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 text-center shadow-2xl">
              <div className="flex justify-between items-center bg-purple-950/60 border border-purple-500/30 px-4 py-3 rounded-2xl">
                <span className="text-xs font-bold text-purple-300">Lượt Quay Có Sẵn:</span>
                <span className="text-xl font-black text-amber-400">{luckySpins} 🎟️</span>
              </div>

              <button
                onClick={spinWheel}
                disabled={isSpinning}
                className={`w-full py-4 rounded-2xl font-black text-base uppercase tracking-wider transition shadow-lg cursor-pointer ${
                  isSpinning
                    ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 hover:brightness-110 text-slate-950 shadow-amber-500/30 active:scale-95 animate-pulse"
                }`}
              >
                {isSpinning ? "🌀 ĐANG KÊU GỌI RỒNG THẦN..." : "🎰 QUAY NGAY (1 LƯỢT)"}
              </button>

              <Link
                href="/shop"
                className="block w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition shadow"
              >
                🛍️ Ghé Shop Mua Thêm Lượt Quay
              </Link>
            </div>
          </div>

          {spinResultModal && (
            <div className="bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-pink-500/20 border-2 border-amber-400/80 rounded-2xl p-4 text-center animate-bounce shadow-2xl max-w-md mx-auto">
              <div className="text-base font-black text-amber-300">✨ KẾT QUẢ VÒNG QUAY VŨ TRỤ ✨</div>
              <div className="text-sm font-bold text-white mt-1">{spinResultModal}</div>
              <button
                onClick={() => setSpinResultModal(null)}
                className="mt-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-1.5 rounded-xl transition cursor-pointer"
              >
                Đã rõ, chiến tiếp!
              </button>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}