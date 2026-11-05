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
  { id: "shenron", icon: "🐲", name: "Rồng Thần", type: "strong", multiplier: 30 },
  { id: "goku", icon: "🐉", name: "Goku SSJ", type: "strong", multiplier: 18 },
  { id: "vegeta", icon: "💥", name: "Vegeta SSJ", type: "strong", multiplier: 15 },
  { id: "gohan", icon: "⚡", name: "Gohan Beast", type: "strong", multiplier: 12 },
  { id: "ball4", icon: "🔮", name: "Ngọc 4 Sao", type: "strong", multiplier: 10 },
  { id: "ball7", icon: "🔮", name: "Ngọc 7 Sao", type: "mid", multiplier: 7 },
  { id: "ball3", icon: "🔮", name: "Ngọc 3 Sao", type: "mid", multiplier: 6 },
  { id: "ball1", icon: "🔮", name: "Ngọc 1 Sao", type: "weak", multiplier: 3 },
  { id: "senzu", icon: "🫘", name: "Đậu Senzu", type: "weak", multiplier: 2 },
  { id: "capsule", icon: "💊", name: "Capsule", type: "weak", multiplier: 1 },
];

const STREAK_STEPS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

const LOSE_TAUNTS = [
  "Vegeta cười khẩy: 'Ngươi chỉ có thế thôi sao cùi bắp?'",
  "Yamcha nằm đất lắc đầu ngán ngẩm trước cú quay này!",
  "Hết Ki rồi chiến binh ơi, hít thở lấy lại sức đi!",
  "Rồng thần lắc đầu ngao ngán vì các cột không liên kết được với nhau!",
];

const STREAK_BROKEN_TAUNTS = [
  "💔 ĐỨT CHUỖI! Ki bộc phát ngược khiến chuỗi liên hoàn vỡ vụn! Rớt lại từ đầu.",
  "⚡ BÙM! Chuỗi chiến thắng đã đứt đoạn giữa vũ trụ võ đạo!",
  "💥 ĐỨT XÍCH! Các cột đứt quãng khiến chuỗi tích lũy tan thành mây khói!",
];

const WIN_PRAISES = [
  "Bùng nổ sức mạnh tiềm ẩn! Khai mở giới hạn cực đỉnh!",
  "Kamehamehaaaaa! Liên kết từ trái qua cực kỳ hoàn hảo!",
  "Rồng thần ban phúc! Trúng liên tiếp nhiều cột nổ cực lớn!",
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

  const [winningCoords, setWinningCoords] = useState<number[]>([]);
  const [autoCount, setAutoCount] = useState<number>(0);
  const autoSpinRef = useRef<number>(0);

  const [grid, setGrid] = useState<typeof DRAGON_SYMBOLS>(
    Array(24).fill(DRAGON_SYMBOLS[0])
  );

  const [jackpots, setJackpots] = useState({
    grand: 150000,
    major: 80000,
    minor: 40000,
  });

  const [currentStreakMultiplier, setCurrentStreakMultiplier] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [messageBox, setMessageBox] = useState<{ text: string; type: "win" | "lose" | "break" | "normal" }>({
    text: "Luật: Tính liên tiếp từ cột 1 sang phải (từ 3 cột trở lên, bất kể lệch hàng). Quay ngay!",
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

  useEffect(() => {
    const jackpotRef = doc(db, "system", "jackpot");
    const unsubscribe = onSnapshot(jackpotRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setJackpots({
          grand: data.grand || 150000,
          major: data.major || 80000,
          minor: data.minor || 40000,
        });
      } else {
        setDoc(jackpotRef, {
          grand: 150000,
          major: 80000,
          minor: 40000,
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    generateValidGrid();
  }, []);

  // Thuật toán chống trùng bừa bãi, phân bổ ngẫu nhiên hợp lý cho lưới 4 hàng x 6 cột
  const generateValidGrid = () => {
    const newGrid: typeof DRAGON_SYMBOLS = [];
    for (let c = 0; c < 6; c++) {
      for (let r = 0; r < 4; r++) {
        const rand = Math.random();
        let pool = DRAGON_SYMBOLS.filter((s) => s.type === "weak");
        if (rand > 0.58) pool = DRAGON_SYMBOLS.filter((s) => s.type === "mid");
        if (rand > 0.86) pool = DRAGON_SYMBOLS.filter((s) => s.type === "strong");
        const selected = pool[Math.floor(Math.random() * pool.length)];
        newGrid.push(selected);
      }
    }
    setGrid(newGrid);
    return newGrid;
  };

  const updatePointsInDB = async (newPts: number) => {
    if (!user) return;
    setPoints(newPts);
    try {
      const userRef = doc(db, "users", user.uid);
      updateDoc(userRef, { points: newPts }).catch((err) => console.log(err));
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
    setWinningCoords([]);
    setAutoCount(targetAuto);
    executeSpin(targetAuto);
  };

  const stopAuto = () => {
    setAutoCount(0);
    setMessageBox({ text: "⏹ Đã dừng Auto theo yêu cầu của chiến binh.", type: "normal" });
  };

  const executeSpin = async (remainingAuto: number) => {
    if (points < currentBet) {
      alert("Ní không đủ điểm Ki để quay!");
      setAutoCount(0);
      return;
    }

    setSpinning(true);
    setWinningCoords([]);
    const newPointsAfterBet = points - currentBet;
    await updatePointsInDB(newPointsAfterBet);

    try {
      const jackpotRef = doc(db, "system", "jackpot");
      updateDoc(jackpotRef, {
        grand: jackpots.grand + Math.floor(currentBet * 0.2),
        major: jackpots.major + Math.floor(currentBet * 0.1),
        minor: jackpots.minor + Math.floor(currentBet * 0.05),
      }).catch((e) => console.log(e));
    } catch (e) {
      console.error(e);
    }

    let counter = 0;
    const interval = setInterval(() => {
      generateValidGrid();
      counter++;
      if (counter > 12) {
        clearInterval(interval);
        const finalGrid = generateValidGrid();
        evaluateConsecutiveColumns(finalGrid, newPointsAfterBet, remainingAuto);
        setSpinning(false);
      }
    }, 75);
  };

  // THUẬT TOÁN QUÉT LIÊN TIẾP TỪ TRÁI QUA (BẤT KỂ LỆCH HÀNG, TỪ 3 CỘT TRỞ LÊN)
  const evaluateConsecutiveColumns = async (finalGrid: typeof DRAGON_SYMBOLS, currentPts: number, remainingAuto: number) => {
    let winChance = 0.30; // RTP cân bằng
    if (currentBet <= 100) winChance = 0.38;
    else if (currentBet <= 1000) winChance = 0.28;
    else winChance = 0.20;

    const isTriggerWin = Math.random() < winChance;
    const shenronTotal = finalGrid.filter((s) => s.id === "shenron").length;

    let baseWinAmount = 0;
    let matchedIndices: number[] = [];
    let resultText = "";

    // 1. Nổ hũ Rồng Thần đặc biệt
    if (shenronTotal >= 4 || (isTriggerWin && Math.random() < 0.02)) {
      baseWinAmount = jackpots.minor + currentBet * 15;
      matchedIndices = finalGrid.map((s, idx) => (s.id === "shenron" ? idx : -1)).filter((i) => i !== -1);
      resultText = `👑 NỔ HŨ RỒNG THẦN ĐẠI CỰC! +${baseWinAmount.toLocaleString()} PTS`;
      triggerExplosion();
    } 
    else if (isTriggerWin) {
      // Tổ chức lưới thành dạng cột: 6 cột, mỗi cột 4 hàng (index từ 0 đến 3 trong mỗi cột)
      // Cấu trúc grid phẳng: 24 ô, cột c (0->5) gồm các hàng r (0->3) có index = r * 6 + c
      const columns: { symbol: typeof DRAGON_SYMBOLS[0]; index: number }[][] = [];
      for (let c = 0; c < 6; c++) {
        const colItems = [];
        for (let r = 0; r < 4; r++) {
          const idx = r * 6 + c;
          colItems.push({ symbol: finalGrid[idx], index: idx });
        }
        columns.push(colItems);
      }

      let totalCalculatedWin = 0;
      let winningSet = new Set<number>();

      // Lấy tất cả các loại biểu tượng xuất hiện ở cột 1 (cột đầu tiên bên trái) để làm mốc quét
      const firstColSymbols = columns[0].map(item => item.symbol.id);
      const uniqueSymbolsToCheck = Array.from(new Set(firstColSymbols));

      uniqueSymbolsToCheck.forEach((symId) => {
        // Kiểm tra xem biểu tượng này có liên tiếp từ cột 1 sang phải bao nhiêu cột
        let consecutiveColsCount = 0;
        let tempMatchedIndices: number[] = [];

        for (let c = 0; c < 6; c++) {
          // Tìm xem trong cột c này có ô nào chứa symId không
          const foundInCol = columns[c].filter(item => item.symbol.id === symId);
          if (foundInCol.length > 0) {
            consecutiveColsCount++;
            foundInCol.forEach(item => tempMatchedIndices.push(item.index));
          } else {
            break; // Đứt quãng liên tiếp các cột
          }
        }

        // Nếu liên tiếp từ 3 cột trở lên từ trái qua
        if (consecutiveColsCount >= 3) {
          const symObj = DRAGON_SYMBOLS.find((s) => s.id === symId);
          if (symObj) {
            let symbolWin = 0;
            // Phân hóa hình yếu / mạnh & Càng nhiều cột liên tiếp thưởng càng to
            if (symObj.type === "weak") {
              const adjustedBet = currentBet * 0.5; // Hình yếu: cược giảm 50%
              symbolWin = adjustedBet * symObj.multiplier * consecutiveColsCount;
            } else {
              const adjustedBet = currentBet * 1.2; // Hình mạnh: cược + 20%
              symbolWin = adjustedBet * symObj.multiplier * consecutiveColsCount;
            }

            // Nhân thêm hệ số cấp số nhân số cột (Càng nhiều cột liên tiếp nổ càng to)
            const columnBonusMultiplier = consecutiveColsCount >= 5 ? 3 : consecutiveColsCount === 4 ? 2 : 1;
            totalCalculatedWin += Math.floor(symbolWin * columnBonusMultiplier);
            tempMatchedIndices.forEach(idx => winningSet.add(idx));
          }
        }
      });

      if (winningSet.size > 0 && totalCalculatedWin > 0) {
        baseWinAmount = totalCalculatedWin;
        matchedIndices = Array.from(winningSet);
        const randomPraise = WIN_PRAISES[Math.floor(Math.random() * WIN_PRAISES.length)];
        resultText = `✨ ${randomPraise} +${baseWinAmount.toLocaleString()} PTS`;
        triggerExplosion();
      }
    }

    // 2. Xử lý Thắng / Thua / Đứt chuỗi / Nhân dồn điểm
    let finalTotalWin = 0;

    if (baseWinAmount > 0) {
      let activeMultiplier = 1;
      if (currentStreakMultiplier === 0) {
        const startingMult = STREAK_STEPS[0]; // x2
        setCurrentStreakMultiplier(startingMult);
        activeMultiplier = startingMult;
      } else {
        const currentIndex = STREAK_STEPS.indexOf(currentStreakMultiplier);
        const nextIndex = Math.min(currentIndex + (Math.random() > 0.4 ? 1 : 0), STREAK_STEPS.length - 1);
        activeMultiplier = STREAK_STEPS[nextIndex];
        setCurrentStreakMultiplier(activeMultiplier);
      }

      finalTotalWin = baseWinAmount * activeMultiplier;
      resultText = `🔥 KÍCH HOẠT CHUỖI x${activeMultiplier}! (${baseWinAmount.toLocaleString()} x ${activeMultiplier}) = +${finalTotalWin.toLocaleString()} PTS`;

      const finalPts = currentPts + finalTotalWin;
      await updatePointsInDB(finalPts);
      setWinningCoords(matchedIndices);
      setMessageBox({ text: resultText, type: "win" });
      addHistory(resultText, true);
    } else {
      setWinningCoords([]);
      if (currentStreakMultiplier > 0) {
        setCurrentStreakMultiplier(0); // Đứt chuỗi
        const breakTaunt = STREAK_BROKEN_TAUNTS[Math.floor(Math.random() * STREAK_BROKEN_TAUNTS.length)];
        resultText = `${breakTaunt} (-${currentBet} PTS)`;
        setMessageBox({ text: resultText, type: "break" });
      } else {
        const randomTaunt = LOSE_TAUNTS[Math.floor(Math.random() * LOSE_TAUNTS.length)];
        resultText = `💥 Thua (-${currentBet} PTS) | ${randomTaunt}`;
        setMessageBox({ text: resultText, type: "lose" });
      }

      addHistory(resultText, false);
      continueAutoIfNeeded(remainingAuto);
      return;
    }

    continueAutoIfNeeded(remainingAuto);
  };

  const triggerExplosion = () => {
    setExplosiveEffect(true);
    setTimeout(() => setExplosiveEffect(false), 700);
  };

  const continueAutoIfNeeded = (remainingAuto: number) => {
    if (autoSpinRef.current === 0) return; // Nếu đã bấm dừng Auto thì ngắt luôn

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
        
        {/* 3 HŨ JACKPOT */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gradient-to-b from-amber-600 to-amber-900 border border-amber-300 rounded-xl p-2 text-center shadow-md">
            <div className="text-[9px] sm:text-xs font-black text-amber-200 uppercase tracking-wider">MAJOR</div>
            <div className="text-xs sm:text-base font-black text-white font-mono">{jackpots.major.toLocaleString()}</div>
          </div>

          <div className="bg-gradient-to-b from-red-600 via-orange-600 to-amber-600 border border-yellow-200 rounded-xl p-2 text-center shadow-lg animate-pulse">
            <div className="text-[10px] sm:text-xs font-black text-yellow-200 uppercase tracking-wider">👑 GRAND JACKPOT</div>
            <div className="text-sm sm:text-xl font-black text-yellow-300 font-mono">{jackpots.grand.toLocaleString()}</div>
          </div>

          <div className="bg-gradient-to-b from-amber-600 to-amber-900 border border-amber-300 rounded-xl p-2 text-center shadow-md">
            <div className="text-[9px] sm:text-xs font-black text-amber-200 uppercase tracking-wider">MINOR</div>
            <div className="text-xs sm:text-base font-black text-white font-mono">{jackpots.minor.toLocaleString()}</div>
          </div>
        </div>

        {/* DÒNG THÔNG BÁO REALTIME & NÚT DỪNG AUTO */}
        <div className="flex justify-between items-center bg-slate-950 border border-amber-500/30 px-3 py-2 rounded-xl text-xs font-bold gap-2">
          <div className={`truncate ${messageBox.type === "break" ? "text-rose-500 font-black animate-bounce" : messageBox.type === "lose" ? "text-rose-400" : "text-amber-300"}`}>
            💬 {messageBox.text}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {autoCount > 0 && (
              <button
                onClick={stopAuto}
                className="bg-rose-600 hover:bg-rose-500 text-white font-black px-2 py-0.5 rounded text-[10px] animate-pulse cursor-pointer shadow"
              >
                ⏹ Dừng Auto
              </button>
            )}
            <div className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/40 font-mono">
              🔥 Chuỗi: {currentStreakMultiplier === 0 ? "Chưa có" : `x${currentStreakMultiplier}`}
            </div>
          </div>
        </div>

        {/* LƯỚI 4 HÀNG X 6 CỘT */}
        <div className="bg-slate-950 p-2 sm:p-3 rounded-xl border border-amber-500/30 shadow-inner">
          <div className="grid grid-cols-6 grid-rows-4 gap-1.5 sm:gap-2">
            {grid.map((sym, idx) => {
              const isWinning = winningCoords.includes(idx);
              const hasResult = winningCoords.length > 0;

              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center justify-center rounded-lg aspect-square p-1 transition-all duration-300 ${
                    spinning
                      ? "animate-pulse scale-95 bg-slate-800"
                      : isWinning
                      ? "bg-gradient-to-b from-amber-500 to-orange-600 border-2 border-yellow-300 scale-110 shadow-[0_0_25px_rgba(245,158,11,0.9)] z-10 animate-bounce"
                      : hasResult
                      ? "bg-slate-950/90 border border-slate-900 opacity-30 scale-95 grayscale"
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