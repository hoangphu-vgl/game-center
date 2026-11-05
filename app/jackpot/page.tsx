"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, onSnapshot } from "firebase/firestore";

const BET_OPTIONS = [20, 50, 100, 200, 500, 1000, 2000, 5000];
const AUTO_OPTIONS = [
  { label: "Thủ Công", value: 0 },
  { label: "10 Lượt", value: 10 },
  { label: "20 Lượt", value: 20 },
  { label: "50 Lượt", value: 50 },
  { label: "Vô Cực", value: 99999 },
];

const DRAGON_SYMBOLS = [
  { id: "shenron", icon: "🐲", name: "Rồng Thần", tier: "epic", multiplier: 30 },
  { id: "goku", icon: "🐉", name: "Goku SSJ", tier: "rare", multiplier: 15 },
  { id: "vegeta", icon: "💥", name: "Vegeta SSJ", tier: "rare", multiplier: 12 },
  { id: "gohan", icon: "⚡", name: "Gohan Beast", tier: "rare", multiplier: 10 },
  { id: "ball4", icon: "🔮", name: "Ngọc 4 Sao", tier: "mid", multiplier: 8 },
  { id: "ball7", icon: "🔮", name: "Ngọc 7 Sao", tier: "mid", multiplier: 6 },
  { id: "ball3", icon: "🔮", name: "Ngọc 3 Sao", tier: "mid", multiplier: 5 },
  { id: "ball5", icon: "🔮", name: "Ngọc 5 Sao", tier: "mid", multiplier: 5 },
  { id: "ball1", icon: "🔮", name: "Ngọc 1 Sao", tier: "bad", multiplier: 2 },
  { id: "ball2", icon: "🔮", name: "Ngọc 2 Sao", tier: "bad", multiplier: 2 },
  { id: "ball6", icon: "🔮", name: "Ngọc 6 Sao", tier: "bad", multiplier: 2 },
  { id: "senzu", icon: "🫘", name: "Đậu Senzu", tier: "bad", multiplier: 1 },
  { id: "scouter", icon: "🥽", name: "Kính Dò Ki", tier: "bad", multiplier: 1 },
  { id: "capsule", icon: "💊", name: "Capsule", tier: "bad", multiplier: 1 },
];

const STREAK_MULTIPLIERS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

const LOSE_TAUNTS = [
  "Vegeta cười khẩy: 'Ngươi chỉ có thế thôi sao cùi bắp?'",
  "Yamcha nằm đất lắc đầu ngán ngẩm trước cú quay này!",
  "Hết Ki rồi chiến binh ơi, hít thở lấy lại sức đi!",
  "Rồng thần khóc thét vì cú quay vừa rồi!",
];

const WIN_PRAISES = [
  "Bùng nổ sức mạnh tiềm ẩn! Khai mở giới hạn cực đỉnh!",
  "Kamehamehaaaaa! Chiến thắng chấn động vũ trụ!",
  "Rồng thần ban phúc! Tài sản tăng vọt không đối thủ!",
];

interface HistoryItem {
  id: string;
  text: string;
  time: string;
  isWin: boolean;
}

export default function JackpotPage() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [currentBet, setCurrentBet] = useState<number>(100);
  const [spinning, setSpinning] = useState<boolean>(false);
  const [explosiveEffect, setExplosiveEffect] = useState<boolean>(false);

  // Lưu danh sách ID các ô trúng thưởng để làm hiệu ứng nổi/chìm
  const [winningIndices, setWinningIndices] = useState<number[]>([]);

  const [autoCount, setAutoCount] = useState<number>(0);
  const autoSpinRef = useRef<number>(0);

  const [grid, setGrid] = useState<typeof DRAGON_SYMBOLS>(
    Array(24).fill(DRAGON_SYMBOLS[0])
  );

  // Hạ hũ chuẩn 10k - 20k giai đoạn đầu
  const [jackpots, setJackpots] = useState({
    grand: 20000,
    major: 15000,
    minor: 10000,
  });

  const [streakIndex, setStreakIndex] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [messageBox, setMessageBox] = useState<{ text: string; type: "win" | "lose" | "normal" }>({
    text: "Chọn mức cược và bấm Quay Ngay để khai phá sức mạnh!",
    type: "normal",
  });

  useEffect(() => {
    autoSpinRef.current = autoCount;
  }, [autoCount]);

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

  // Lắng nghe Hũ Realtime, nếu hũ trên db lớn hơn 50000 thì giữ chuẩn 10k-20k theo ý ní
  useEffect(() => {
    const jackpotRef = doc(db, "system", "jackpot");
    const unsubscribe = onSnapshot(jackpotRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setJackpots({
          grand: data.grand > 50000 ? 20000 : (data.grand || 20000),
          major: data.major > 40000 ? 15000 : (data.major || 15000),
          minor: data.minor > 30000 ? 10000 : (data.minor || 10000),
        });
      } else {
        setDoc(jackpotRef, {
          grand: 20000,
          major: 15000,
          minor: 10000,
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    generateRandomGrid();
  }, []);

  const getRandomSymbol = () => {
    const rand = Math.random() * 100;
    let pool = DRAGON_SYMBOLS;
    if (rand < 55) {
      pool = DRAGON_SYMBOLS.filter((s) => s.tier === "bad");
    } else if (rand < 85) {
      pool = DRAGON_SYMBOLS.filter((s) => s.tier === "mid");
    } else {
      pool = DRAGON_SYMBOLS.filter((s) => s.tier === "rare" || s.tier === "epic");
    }
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const generateRandomGrid = () => {
    const newGrid = Array.from({ length: 24 }, () => getRandomSymbol());
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

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.log(err));
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleSpinClick = (targetAuto: number) => {
    if (spinning) return;
    setWinningIndices([]); // Reset hiệu ứng nổi cũ
    setAutoCount(targetAuto);
    executeSpin(targetAuto);
  };

  const executeSpin = async (remainingAuto: number) => {
    if (points < currentBet) {
      alert("Ní không đủ điểm Ki để quay!");
      setAutoCount(0);
      return;
    }

    setSpinning(true);
    setWinningIndices([]);
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
      if (counter > 12) {
        clearInterval(interval);
        const finalGrid = generateRandomGrid();
        evaluateSpinResult(finalGrid, newPointsAfterBet, remainingAuto);
        setSpinning(false);
      }
    }, 80);
  };

  // Cấu trúc tính điểm chuẩn khớp 100% với lịch sử và số điểm cộng vào DB
  const evaluateSpinResult = async (finalGrid: typeof DRAGON_SYMBOLS, currentPts: number, remainingAuto: number) => {
    let winChanceThreshold = 0.42;
    if (currentBet <= 100) winChanceThreshold = 0.55; // Buff 10-12% cho cược nhỏ
    else if (currentBet <= 1000) winChanceThreshold = 0.38;
    else winChanceThreshold = 0.30;

    const isLuckyHit = Math.random() < winChanceThreshold;
    const shenronCount = finalGrid.filter((s) => s.id === "shenron").length;

    let totalWin = 0;
    let resultText = "";
    let matchedIndices: number[] = [];

    if (shenronCount >= 3 || (isLuckyHit && Math.random() < 0.05)) {
      // Trúng Hũ Minor/Grand
      totalWin = jackpots.minor + Math.floor(currentBet * 10);
      resultText = `🎉 NỔ HŨ RỒNG THẦN! +${totalWin.toLocaleString()} PTS`;
      matchedIndices = finalGrid
        .map((s, idx) => (s.id === "shenron" ? idx : -1))
        .filter((idx) => idx !== -1);
      triggerExplosion();
    } else if (isLuckyHit) {
      // Tìm xem biểu tượng nào xuất hiện nhiều nhất (từ 3 hình trở lên) để tính thưởng chuẩn
      const counts: Record<string, number[]> = {};
      finalGrid.forEach((s, idx) => {
        if (!counts[s.id]) counts[s.id] = [];
        counts[s.id].push(idx);
      });

      let bestSymbolId = "";
      let maxLen = 0;
      Object.keys(counts).forEach((id) => {
        if (counts[id].length > maxLen) {
          maxLen = counts[id].length;
          bestSymbolId = id;
        }
      });

      if (maxLen >= 3) {
        matchedIndices = counts[bestSymbolId];
        const sym = DRAGON_SYMBOLS.find((s) => s.id === bestSymbolId);
        const baseMultiplier = sym ? sym.multiplier : 5;
        const baseReward = currentBet * baseMultiplier;

        // Tính chuỗi cấp số nhân
        let nextStreak = streakIndex;
        let activeMultiplier = 1;

        if (streakIndex === 0) {
          nextStreak = 1;
          activeMultiplier = STREAK_MULTIPLIERS[0];
        } else if (streakIndex < STREAK_MULTIPLIERS.length) {
          activeMultiplier = STREAK_MULTIPLIERS[streakIndex];
          nextStreak = streakIndex + 1;
        } else {
          activeMultiplier = STREAK_MULTIPLIERS[STREAK_MULTIPLIERS.length - 1];
        }

        setStreakIndex(nextStreak);
        totalWin = baseReward * activeMultiplier;
        const randomPraise = WIN_PRAISES[Math.floor(Math.random() * WIN_PRAISES.length)];
        resultText = `⚡ ${randomPraise} [Trúng ${maxLen} ${sym?.name}] (x${activeMultiplier}) +${totalWin.toLocaleString()} PTS`;
        triggerExplosion();
      } else {
        // Trúng ngẫu nhiên cơ bản
        matchedIndices = [0, 1, 2, 3]; // Highlight vài ô ngẫu nhiên
        const baseReward = currentBet * 3;
        let activeMultiplier = streakIndex === 0 ? STREAK_MULTIPLIERS[0] : STREAK_MULTIPLIERS[streakIndex];
        if (streakIndex < STREAK_MULTIPLIERS.length) setStreakIndex(streakIndex + 1);

        totalWin = baseReward * activeMultiplier;
        resultText = `✨ Thắng may mắn! (x${activeMultiplier}) +${totalWin.toLocaleString()} PTS`;
        triggerExplosion();
      }
    } else {
      // Thua cược
      setStreakIndex(0);
      setWinningIndices([]);
      const randomTaunt = LOSE_TAUNTS[Math.floor(Math.random() * LOSE_TAUNTS.length)];
      resultText = `💥 Thua (-${currentBet} PTS) | ${randomTaunt}`;
      setMessageBox({ text: resultText, type: "lose" });
      addHistory(resultText, false);

      continueAutoIfNeeded(remainingAuto);
      return;
    }

    setWinningIndices(matchedIndices);
    const finalPts = currentPts + totalWin;
    await updatePointsInDB(finalPts);
    setMessageBox({ text: resultText, type: "win" });
    addHistory(resultText, true);

    continueAutoIfNeeded(remainingAuto);
  };

  const triggerExplosion = () => {
    setExplosiveEffect(true);
    setTimeout(() => setExplosiveEffect(false), 700);
  };

  const continueAutoIfNeeded = (remainingAuto: number) => {
    if (remainingAuto > 1) {
      setTimeout(() => executeSpin(remainingAuto - 1), 400);
    } else if (remainingAuto === 99999) {
      setTimeout(() => executeSpin(99999), 400);
    } else {
      setAutoCount(0);
    }
  };

  const addHistory = (text: string, isWin: boolean) => {
    const newEntry: HistoryItem = {
      id: Date.now().toString(),
      text,
      time: new Date().toLocaleTimeString(),
      isWin,
    };
    setHistory((prev) => [newEntry, ...prev.slice(0, 9)]);
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-white font-sans select-none flex flex-col items-center justify-start p-2 sm:p-4 overflow-x-hidden transition-all duration-300 ${explosiveEffect ? "ring-4 ring-amber-400 bg-amber-950/30" : ""}`}>
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-3 px-2">
        <Link href="/" className="text-xs sm:text-sm font-black text-amber-400 hover:underline">
          ← Về Cổng Game
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullScreen}
            className="bg-slate-900/90 border border-amber-500/50 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-400 hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 shadow-md"
          >
            <span>⛶</span> Full
          </button>

          <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-500/50 px-3.5 py-1.5 rounded-xl shadow-lg">
            <span>🪙</span>
            <span className="font-extrabold text-amber-400 tracking-wide">{points.toLocaleString()}</span>
            <span className="text-xs text-amber-300/70">PTS</span>
          </div>
        </div>
      </div>

      {/* Main Game Container */}
      <div className="w-full max-w-4xl bg-slate-900/95 border-2 border-amber-500/50 rounded-2xl p-3 sm:p-5 shadow-2xl flex flex-col gap-3">
        
        {/* 3 HŨ JACKPOT GIAI ĐOẠN ĐẦU */}
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

        {/* DÒNG THÔNG BÁO REALTIME */}
        <div className="flex justify-between items-center bg-slate-950 border border-amber-500/30 px-3 py-2 rounded-xl text-xs font-bold">
          <div className={`truncate ${messageBox.type === "lose" ? "text-rose-400" : "text-amber-300"}`}>
            💬 {messageBox.text}
          </div>
          <div className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/40 font-mono shrink-0">
            🔥 Chuỗi: x{streakIndex === 0 ? 1 : STREAK_MULTIPLIERS[Math.min(streakIndex - 1, STREAK_MULTIPLIERS.length - 1)]}
          </div>
        </div>

        {/* LƯỚI 4 HÀNG X 6 CỘT - HIỆU ỨNG TRÙNG HÌNH NỔI LÊN / KHÔNG TRÙNG CHÌM XUỐNG */}
        <div className="bg-slate-950 p-2 sm:p-3 rounded-xl border border-amber-500/30 shadow-inner">
          <div className="grid grid-cols-6 grid-rows-4 gap-1.5 sm:gap-2">
            {grid.map((sym, idx) => {
              const isWinning = winningIndices.includes(idx);
              const hasResult = winningIndices.length > 0;

              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center justify-center rounded-lg aspect-square p-1 transition-all duration-300 ${
                    spinning
                      ? "animate-pulse scale-95 bg-slate-800"
                      : isWinning
                      ? "bg-gradient-to-b from-amber-500 to-orange-600 border-2 border-yellow-300 scale-110 shadow-[0_0_20px_rgba(245,158,11,0.8)] z-10 animate-bounce"
                      : hasResult
                      ? "bg-slate-950/80 border border-slate-900 opacity-40 scale-95 grayscale"
                      : "bg-gradient-to-b from-slate-800 to-slate-900 border border-amber-500/20 hover:border-amber-400"
                  }`}
                >
                  <span className="text-xl sm:text-3xl">{sym.icon}</span>
                  <span className={`text-[8px] sm:text-[10px] font-bold truncate w-full text-center mt-0.5 ${isWinning ? "text-slate-950 font-black" : "text-amber-300/80"}`}>
                    {sym.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* THANH ĐIỀU KHIỂN CƯỢC & AUTO & QUAY */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-start">
            <span className="text-xs font-bold text-amber-300 mr-1">CƯỢC:</span>
            {BET_OPTIONS.map((amt) => (
              <button
                key={amt}
                onClick={() => setCurrentBet(amt)}
                disabled={spinning}
                className={`px-2 py-1 rounded-lg text-[11px] sm:text-xs font-black border transition cursor-pointer ${
                  currentBet === amt
                    ? "bg-amber-400 text-slate-950 border-amber-300 shadow"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                {amt}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <span className="text-xs font-bold text-orange-400 mr-1">AUTO:</span>
              {AUTO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSpinClick(opt.value)}
                  disabled={spinning && autoCount === 0}
                  className={`px-2 py-1 rounded-lg text-[11px] font-black border transition cursor-pointer ${
                    autoCount === opt.value
                      ? "bg-orange-500 text-slate-950 border-orange-300 shadow"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleSpinClick(0)}
              disabled={spinning}
              className={`flex-1 w-full py-2.5 rounded-xl font-black text-sm sm:text-base tracking-wider transition shadow-lg active:scale-95 cursor-pointer ${
                spinning
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 hover:brightness-110 text-slate-950 shadow-amber-500/20"
              }`}
            >
              {spinning ? (autoCount > 0 ? `ĐANG AUTO (${autoCount})...` : "ĐANG QUAY...") : "🔥 QUAY NGAY"}
            </button>
          </div>
        </div>

        {/* LỊCH SỬ QUAY GẦN NHẤT */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 max-h-28 overflow-y-auto text-[11px]">
          <div className="font-bold text-slate-400 mb-1">📜 Lịch sử chiến đấu gần đây:</div>
          {history.length === 0 ? (
            <div className="text-slate-600 italic">Chưa có lượt quay nào trong phiên này.</div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="flex justify-between py-0.5 border-b border-slate-900">
                <span className={item.isWin ? "text-amber-400 font-bold" : "text-rose-400"}>
                  {item.text}
                </span>
                <span className="text-slate-500 font-mono">{item.time}</span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}