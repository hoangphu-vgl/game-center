"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, onSnapshot } from "firebase/firestore";

const BET_OPTIONS = [100, 500, 1000, 5000, 10000];

const DRAGON_SYMBOLS = [
  { id: "goku", icon: "🐉", name: "Goku SSJ", multiplier: 100 },
  { id: "vegeta", icon: "💥", name: "Vegeta SSJ", multiplier: 80 },
  { id: "gohan", icon: "⚡", name: "Gohan Beast", multiplier: 50 },
  { id: "piccolo", icon: "🧘‍♂️", name: "Orange Piccolo", multiplier: 40 },
  { id: "shenron", icon: "🐲", name: "Rồng Thần", multiplier: 200 },
  { id: "ball1", icon: "🔮", name: "Ngọc 1 Sao", multiplier: 10 },
  { id: "ball2", icon: "🔮", name: "Ngọc 2 Sao", multiplier: 12 },
  { id: "ball3", icon: "🔮", name: "Ngọc 3 Sao", multiplier: 15 },
  { id: "ball4", icon: "🔮", name: "Ngọc 4 Sao", multiplier: 25 },
  { id: "ball5", icon: "🔮", name: "Ngọc 5 Sao", multiplier: 18 },
  { id: "ball6", icon: "🔮", name: "Ngọc 6 Sao", multiplier: 20 },
  { id: "ball7", icon: "🔮", name: "Ngọc 7 Sao", multiplier: 30 },
  { id: "senzu", icon: "🫘", name: "Đậu Senzu", multiplier: 5 },
  { id: "scouter", icon: "🥽", name: "Kính Dò Ki", multiplier: 8 },
  { id: "capsule", icon: "💊", name: "Capsule", multiplier: 6 },
];

export default function JackpotPage() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [currentBet, setCurrentBet] = useState<number>(100);
  const [spinning, setSpinning] = useState<boolean>(false);

  // 4 hàng x 6 cột = 24 ô
  const [grid, setGrid] = useState<typeof DRAGON_SYMBOLS>(
    Array(24).fill(DRAGON_SYMBOLS[0])
  );

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
          console.error(e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

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

  const handleSpin = async () => {
    if (spinning) return;
    if (points < currentBet) {
      alert("Ní không đủ điểm Ki để quay!");
      return;
    }

    setSpinning(true);
    const newPointsAfterBet = points - currentBet;
    await updatePointsInDB(newPointsAfterBet);

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
    <div className="min-h-screen bg-slate-950 text-white font-sans select-none flex flex-col items-center justify-start p-2 sm:p-4 overflow-x-hidden">
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-3 px-2">
        <Link href="/" className="text-xs sm:text-sm font-black text-amber-400 hover:underline">
          ← Về Cổng Game
        </Link>
        <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-500/50 px-3 py-1.5 rounded-xl shadow-lg">
          <span>🪙</span>
          <span className="font-extrabold text-amber-400 tracking-wide">{points.toLocaleString()}</span>
          <span className="text-xs text-amber-300/70">KI PTS</span>
        </div>
      </div>

      {/* Main Game Container thu gọn cân đối */}
      <div className="w-full max-w-4xl bg-slate-900/95 border-2 border-amber-500/50 rounded-2xl p-3 sm:p-5 shadow-2xl flex flex-col gap-4">
        
        {/* 3 HŨ JACKPOT */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gradient-to-b from-amber-600 to-amber-900 border border-amber-300 rounded-xl p-2 text-center shadow-md">
            <div className="text-[9px] sm:text-xs font-black text-amber-200 uppercase tracking-wider">MAJOR</div>
            <div className="text-xs sm:text-base font-black text-white font-mono">{jackpots.major.toLocaleString()}</div>
          </div>

          <div className="bg-gradient-to-b from-red-600 via-orange-600 to-amber-600 border border-yellow-200 rounded-xl p-2 text-center shadow-lg animate-pulse">
            <div className="text-[10px] sm:text-xs font-black text-yellow-200 uppercase tracking-wider">👑 GRAND JACKPOT</div>
            <div className="text-xs sm:text-lg font-black text-yellow-300 font-mono">{jackpots.grand.toLocaleString()}</div>
          </div>

          <div className="bg-gradient-to-b from-amber-600 to-amber-900 border border-amber-300 rounded-xl p-2 text-center shadow-md">
            <div className="text-[9px] sm:text-xs font-black text-amber-200 uppercase tracking-wider">MINOR</div>
            <div className="text-xs sm:text-base font-black text-white font-mono">{jackpots.minor.toLocaleString()}</div>
          </div>
        </div>

        {/* LƯỚI 4 HÀNG X 6 CỘT CHUẨN KHÍT (24 Ô) */}
        <div className="bg-slate-950 p-2 sm:p-3 rounded-xl border border-amber-500/30 shadow-inner">
          <div className="grid grid-cols-6 grid-rows-4 gap-1.5 sm:gap-2">
            {grid.map((sym, idx) => (
              <div
                key={idx}
                className={`flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900 border border-amber-500/20 rounded-lg aspect-square p-1 transition-transform ${
                  spinning ? "animate-pulse scale-95" : "hover:border-amber-400"
                }`}
              >
                <span className="text-xl sm:text-3xl">{sym.icon}</span>
                <span className="text-[8px] sm:text-[10px] font-bold text-amber-300/80 truncate w-full text-center mt-0.5">
                  {sym.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* THANH ĐIỀU KHIỂN CƯỢC & QUAY */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
            <span className="text-xs font-bold text-amber-300 mr-1">CƯỢC:</span>
            {BET_OPTIONS.map((amt) => (
              <button
                key={amt}
                onClick={() => setCurrentBet(amt)}
                disabled={spinning}
                className={`px-2.5 py-1 rounded-lg text-xs font-black border transition cursor-pointer ${
                  currentBet === amt
                    ? "bg-amber-400 text-slate-950 border-amber-300 shadow"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                {amt.toLocaleString()}
              </button>
            ))}
          </div>

          <button
            onClick={handleSpin}
            disabled={spinning}
            className={`w-full sm:w-auto px-8 py-2.5 rounded-xl font-black text-sm sm:text-base tracking-wider transition shadow-lg active:scale-95 cursor-pointer ${
              spinning
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 hover:brightness-110 text-slate-950 shadow-amber-500/20"
            }`}
          >
            {spinning ? "ĐANG QUAY..." : "🔥 QUAY NGAY"}
          </button>
        </div>

      </div>

      {/* POPUP THẮNG */}
      {winModal.open && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border-2 border-amber-400 p-6 rounded-2xl text-center max-w-xs w-full shadow-2xl space-y-3">
            <div className="text-4xl animate-bounce">🐲🎉</div>
            <h2 className="text-base font-black text-amber-400 uppercase">{winModal.title}</h2>
            <div className="text-2xl font-black text-amber-300 font-mono">
              +{winModal.amount.toLocaleString()} PTS
            </div>
            <button
              onClick={() => setWinModal({ open: false, amount: 0, title: "" })}
              className="w-full py-2.5 bg-amber-400 font-black text-slate-950 rounded-xl hover:bg-amber-300 transition cursor-pointer"
            >
              NHẬN THƯỞNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}