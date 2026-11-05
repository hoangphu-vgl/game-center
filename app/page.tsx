"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, onSnapshot } from "firebase/firestore";

// Mức cược mỗi lượt quay
const BET_OPTIONS = [100, 500, 1000, 5000, 10000];

// 15 Biểu tượng chuẩn Dragon Ball
const DRAGON_SYMBOLS = [
  { id: "goku", icon: "🐉", name: "Goku SSJ", multiplier: 100 },
  { id: "vegeta", icon: "💥", name: "Vegeta SSJ", multiplier: 80 },
  { id: "gohan", icon: "⚡", name: "Gohan Beast", multiplier: 50 },
  { id: "piccolo", icon: "🧘‍♂️", name: "Orange Piccolo", multiplier: 40 },
  { id: "shenron", icon: "🐲", name: "Rồng Thần", multiplier: 200 },
  { id: "ball1", icon: "🔮1️⃣", name: "Ngọc 1 Sao", multiplier: 10 },
  { id: "ball2", icon: "🔮2️⃣", name: "Ngọc 2 Sao", multiplier: 12 },
  { id: "ball3", icon: "🔮3️⃣", name: "Ngọc 3 Sao", multiplier: 15 },
  { id: "ball4", icon: "🔮4️⃣", name: "Ngọc 4 Sao", multiplier: 25 },
  { id: "ball5", icon: "🔮5️⃣", name: "Ngọc 5 Sao", multiplier: 18 },
  { id: "ball6", icon: "🔮6️⃣", name: "Ngọc 6 Sao", multiplier: 20 },
  { id: "ball7", icon: "🔮7️⃣", name: "Ngọc 7 Sao", multiplier: 30 },
  { id: "senzu", icon: "🫘", name: "Đậu Senzu", multiplier: 5 },
  { id: "scouter", icon: "🥽", name: "Kính Dò Ki", multiplier: 8 },
  { id: "capsule", icon: "💊", name: "Capsule", multiplier: 6 },
];

export default function JackpotPage() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [currentBet, setCurrentBet] = useState<number>(100);
  const [spinning, setSpinning] = useState<boolean>(false);

  // Khởi tạo lưới 4 hàng x 6 cột
  const [grid, setGrid] = useState<typeof DRAGON_SYMBOLS>(
    Array(24).fill(DRAGON_SYMBOLS[0])
  );

  // Mốc Hũ Realtime (GRAND, MAJOR, MINOR)
  const [jackpots, setJackpots] = useState({
    grand: 22517344333,
    major: 70533000,
    minor: 2170533000,
  });

  const [winModal, setWinModal] = useState<{ open: boolean; amount: number; title: string }>({
    open: false,
    amount: 0,
    title: "",
  });

  // Đồng bộ User Points từ Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setPoints(userSnap.data().points || 0);
          }
        } catch (e) {
          console.error("Lỗi lấy điểm user:", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Lắng nghe Hũ Jackpot Realtime từ Firestore
  useEffect(() => {
    const jackpotRef = doc(db, "system", "jackpot");
    const unsubscribe = onSnapshot(jackpotRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setJackpots({
          grand: data.grand || 22517344333,
          major: data.major || 70533000,
          minor: data.minor || 2170533000,
        });
      } else {
        setDoc(jackpotRef, {
          grand: 22517344333,
          major: 70533000,
          minor: 2170533000,
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Khởi tạo bàn quay ban đầu
  useEffect(() => {
    generateRandomGrid();
  }, []);

  const generateRandomGrid = () => {
    const newGrid = Array.from({ length: 24 }, () => {
      return DRAGON_SYMBOLS[Math.floor(Math.random() * DRAGON_SYMBOLS.length)];
    });
    setGrid(newGrid);
    return newGrid;
  };

  const updatePointsInDB = async (newPts: number) => {
    if (!user) return;
    setPoints(newPts);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { points: newPts });
    } catch (e) {
      console.error(e);
    }
  };

  // Hàm Quay Hũ
  const handleSpin = async () => {
    if (spinning) return;
    if (points < currentBet) {
      alert("Ní không đủ điểm Ki để quay!");
      return;
    }

    setSpinning(true);
    const newPointsAfterBet = points - currentBet;
    await updatePointsInDB(newPointsAfterBet);

    // Tích điểm vào hũ Jackpot Realtime
    try {
      const jackpotRef = doc(db, "system", "jackpot");
      await updateDoc(jackpotRef, {
        grand: jackpots.grand + Math.floor(currentBet * 0.1),
        major: jackpots.major + Math.floor(currentBet * 0.05),
        minor: jackpots.minor + Math.floor(currentBet * 0.02),
      });
    } catch (e) {
      console.error(e);
    }

    // Hiệu ứng cuộn ảo
    let counter = 0;
    const interval = setInterval(() => {
      generateRandomGrid();
      counter++;
      if (counter > 15) {
        clearInterval(interval);
        const finalGrid = generateRandomGrid();
        calculateReward(finalGrid, newPointsAfterBet);
        setSpinning(false);
      }
    }, 100);
  };

  // Tính Thưởng Thắng & Nổ Hũ
  const calculateReward = async (finalGrid: typeof DRAGON_SYMBOLS, currentPts: number) => {
    const shenronCount = finalGrid.filter((s) => s.id === "shenron").length;
    const ball4Count = finalGrid.filter((s) => s.id === "ball4").length;

    let totalWin = 0;
    let winTitle = "";

    if (shenronCount >= 6) {
      totalWin = jackpots.grand;
      winTitle = "🎉 TẬP HỢP RỒNG THẦN! NỔ HŨ GRAND TỶ KI!";
    } else if (ball4Count >= 6) {
      totalWin = jackpots.major;
      winTitle = "🔥 NỔ HŨ MAJOR NGỌC RỒNG 4 SAO!";
    } else {
      const counts: Record<string, number> = {};
      finalGrid.forEach((item) => {
        counts[item.id] = (counts[item.id] || 0) + 1;
      });

      Object.keys(counts).forEach((symbolId) => {
        if (counts[symbolId] >= 4) {
          const sym = DRAGON_SYMBOLS.find((s) => s.id === symbolId);
          if (sym) {
            totalWin += currentBet * sym.multiplier * (counts[symbolId] - 3);
          }
        }
      });

      if (totalWin > 0) {
        winTitle = "✨ CHIẾN THẮNG THỦY TỰU AURA!";
      }
    }

    if (totalWin > 0) {
      const finalPts = currentPts + totalWin;
      await updatePointsInDB(finalPts);
      setWinModal({ open: true, amount: totalWin, title: winTitle });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans select-none flex flex-col items-center p-3 sm:p-6 relative overflow-hidden">
      {/* Background Hũ Vàng Aura */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600/20 via-slate-950 to-slate-950 pointer-events-none"></div>

      {/* Header Navigation */}
      <header className="w-full max-w-5xl flex justify-between items-center mb-4 z-10">
        <Link href="/" className="text-xs sm:text-sm font-black text-amber-400 hover:underline">
          ← Về Cổng Game Dragon Arcade
        </Link>
        <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-500/50 px-4 py-2 rounded-xl shadow-lg">
          <span>🪙</span>
          <span className="font-extrabold text-amber-400 tracking-wide">{points.toLocaleString()}</span>
          <span className="text-xs text-amber-300/70">KI PTS</span>
        </div>
      </header>

      {/* 3 KHUNG HŨ JACKPOT REALTIME (GRAND - MAJOR - MINOR) */}
      <div className="w-full max-w-4xl grid grid-cols-3 gap-2 sm:gap-4 mb-6 z-10">
        <div className="bg-gradient-to-b from-amber-600 to-amber-900 border-2 border-amber-300 rounded-2xl p-2 sm:p-3 text-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
          <div className="text-[10px] sm:text-xs font-black text-amber-200 uppercase tracking-widest">
            MAJOR
          </div>
          <div className="text-xs sm:text-lg font-black text-white tracking-wider font-mono">
            {jackpots.major.toLocaleString()}
          </div>
        </div>

        <div className="bg-gradient-to-b from-red-600 via-orange-600 to-amber-600 border-2 border-yellow-200 rounded-2xl p-2 sm:p-4 text-center shadow-[0_0_25px_rgba(239,68,68,0.6)] animate-pulse">
          <div className="text-xs sm:text-sm font-black text-yellow-200 uppercase tracking-widest drop-shadow">
            👑 GRAND JACKPOT
          </div>
          <div className="text-sm sm:text-2xl font-black text-yellow-300 tracking-wider font-mono drop-shadow">
            {jackpots.grand.toLocaleString()}
          </div>
        </div>

        <div className="bg-gradient-to-b from-amber-600 to-amber-900 border-2 border-amber-300 rounded-2xl p-2 sm:p-3 text-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
          <div className="text-[10px] sm:text-xs font-black text-amber-200 uppercase tracking-widest">
            MINOR
          </div>
          <div className="text-xs sm:text-lg font-black text-white tracking-wider font-mono">
            {jackpots.minor.toLocaleString()}
          </div>
        </div>
      </div>

      {/* BÀN QUAY JACKPOT 4 HÀNG X 6 CỘT */}
      <div className="w-full max-w-4xl bg-slate-900/90 border-4 border-amber-500/60 rounded-3xl p-3 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] z-10 relative">
        <div className="grid grid-cols-6 grid-rows-4 gap-1.5 sm:gap-3 bg-slate-950 p-3 rounded-2xl border-2 border-amber-500/30 shadow-inner">
          {grid.map((sym, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900 border border-amber-500/30 rounded-xl aspect-square p-1 transition-transform ${
                spinning ? "animate-bounce" : "hover:scale-105"
              }`}
            >
              <span className="text-2xl sm:text-4xl">{sym.icon}</span>
              <span className="text-[9px] sm:text-[11px] font-bold text-amber-300/90 truncate w-full text-center mt-0.5">
                {sym.name}
              </span>
            </div>
          ))}
        </div>

        {/* THANH ĐIỀU KHIỂN & BẤM QUAY */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-300">CƯỢC:</span>
            <div className="flex gap-1.5">
              {BET_OPTIONS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setCurrentBet(amt)}
                  disabled={spinning}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer ${
                    currentBet === amt
                      ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  {amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSpin}
            disabled={spinning}
            className={`w-full sm:w-auto px-10 py-3.5 rounded-2xl font-black text-lg tracking-wider transition shadow-2xl active:scale-95 cursor-pointer ${
              spinning
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 hover:brightness-110 text-slate-950 shadow-amber-500/30"
            }`}
          >
            {spinning ? "ĐANG TU KI QUAY..." : "🔥 QUAY NGAY"}
          </button>
        </div>
      </div>

      {/* POPUP BÁO THẮNG */}
      {winModal.open && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-2 border-amber-400 p-6 sm:p-8 rounded-3xl text-center max-w-sm w-full shadow-[0_0_50px_rgba(245,158,11,0.5)] space-y-4">
            <div className="text-5xl animate-bounce">🐲🎉</div>
            <h2 className="text-xl font-black text-amber-400 tracking-wide uppercase">
              {winModal.title}
            </h2>
            <div className="text-3xl font-black text-amber-300 font-mono">
              +{winModal.amount.toLocaleString()} KI PTS
            </div>
            <button
              onClick={() => setWinModal({ open: false, amount: 0, title: "" })}
              className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 font-black text-slate-950 rounded-2xl hover:brightness-110 transition cursor-pointer"
            >
              NHẬN THƯỞNG RỒNG THẦN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}