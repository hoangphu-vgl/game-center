"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const BET_OPTIONS = [20, 50, 100, 200, 500, 1000, 2000, 5000];
const AUTO_OPTIONS = [
  { label: "Thủ Công", value: 0 },
  { label: "10 Lượt", value: 10 },
  { label: "20 Lượt", value: 20 },
  { label: "50 Lượt", value: 50 },
  { label: "Vô Cực", value: 99999 },
];

// Trọn bộ Ngũ Linh, Thần Long & Đầy đủ 7 Viên Ngọc Rồng (1 đến 7 sao)
const DRAGON_SYMBOLS = [
  { id: "long", icon: "🐉", name: "Thanh Long", type: "strong", multiplier: 8 },
  { id: "lan", icon: "🦄", name: "Kỳ Lân", type: "strong", multiplier: 8 },
  { id: "phung", icon: "🦅", name: "Phượng Hoàng", type: "strong", multiplier: 8 },
  { id: "quy", icon: "🐢", name: "Thần Quy", type: "strong", multiplier: 8 },
  { id: "linh", icon: "🦖", name: "Linh thú", type: "strong", multiplier: 10 },
  { id: "shenron", icon: "🐲", name: "Rồng Thần", type: "mid", multiplier: 25 },
  { id: "goku", icon: "⭐", name: "Goku SSJ", type: "mid", multiplier: 6 },
  // Đầy đủ 7 viên ngọc rồng từ 1 đến 7 sao
  { id: "ball7", icon: "🔮", name: "Ngọc 7 Sao", type: "mid", multiplier: 5 },
  { id: "ball6", icon: "🔮", name: "Ngọc 6 Sao", type: "mid", multiplier: 3.5 },
  { id: "ball5", icon: "🔮", name: "Ngọc 5 Sao", type: "weak", multiplier: 3 },
  { id: "ball4", icon: "🔮", name: "Ngọc 4 Sao", type: "weak", multiplier: 2.5 },
  { id: "ball3", icon: "🔮", name: "Ngọc 3 Sao", type: "weak", multiplier: 2 },
  { id: "ball2", icon: "🔮", name: "Ngọc 2 Sao", type: "weak", multiplier: 1.5 },
  { id: "ball1", icon: "🔮", name: "Ngọc 1 Sao", type: "weak", multiplier: 1 },
  { id: "senzu", icon: "🫘", name: "Đậu Senzu", type: "weak", multiplier: 0.5 },
  { id: "capsule", icon: "💊", name: "Capsule", type: "weak", multiplier: 0.5 },
];

const AURA_QUICK_REWARDS = [
  { id: "ki_white", name: "⚪ Ki Trắng", mult: 1.5, icon: "✨" },
  { id: "kaioken", name: "🔴 Kaioken", mult: 2, icon: "🔥" },
  { id: "ssj1", name: "🟡 SSJ", mult: 2.5, icon: "⚡" },
  { id: "ssj2", name: "⚡ SSJ 2", mult: 3, icon: "🌩️" },
  { id: "ssj_god", name: "🔴 SSJ God", mult: 5, icon: "☀️" },
];

const STREAK_STEPS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

const LOSE_TAUNTS = [
  "Vegeta cười khẩy: 'Cược lớn mà đánh kiểu này à? Về nhà bú sữa đi!'",
  "Yamcha nằm đất vẫy tay chào tạm biệt số điểm Ki vừa bay màu!",
  "Beerus đại nhân đang ngủ gật bỗng tỉnh giấc vì cú quay quá tệ!",
  "Frieza nhếch mép: 'Ngươi chỉ có chừng đó công lực thôi sao?'",
];

const STREAK_BROKEN_TAUNTS = [
  "💔 ĐỨT CHUỖI CỰC MẠNH! Cơn thịnh nộ tan thành mây khói, rớt về vạch xuất phát!",
  "⚡ BÙM! Mạch liên hoàn đứt đoạn, mồ hôi dầm dề nhưng Ki đã cạn!",
  "💥 ĐỨT XÍCH! Sai một ly đi một dặm, chuỗi nhân dồn sụp đổ hoàn toàn!",
];

const WIN_PRAISES = [
  "Bùng nổ sức mạnh tiềm ẩn! Cú đánh chấn động cả thiên hà!",
  "Kamehamehaaaaa! Nền trời rung chuyển vì phần thưởng quá khủng!",
  "Rồng thần ban phúc! Tài sản tăng vọt vượt mọi giới hạn vũ trụ!",
];

interface HistoryItem {
  id: string;
  text: string;
  time: string;
  isWin: boolean;
}

export default function JackpotPage() {
  const [user, setUser] = useState<any>(null);
  const [points, setPoints] = useState<number>(0);
  const [currentBet, setCurrentBet] = useState<number>(100);
  const [spinning, setSpinning] = useState<boolean>(false);
  const [explosiveEffect, setExplosiveEffect] = useState<boolean>(false);
  const [jackpotSideGlow, setJackpotSideGlow] = useState<boolean>(false);

  const [winningCoords, setWinningCoords] = useState<number[]>([]);
  const [autoCount, setAutoCount] = useState<number>(0);
  const [autoSpeed, setAutoSpeed] = useState<number>(1);
  
  const pointsRef = useRef<number>(0);
  const autoSpinRef = useRef<number>(0);
  const currentBetRef = useRef<number>(100);

  const streakRef = useRef<number>(-1);
  const [streakIndex, setStreakIndex] = useState<number>(-1);

  const [grid, setGrid] = useState<typeof DRAGON_SYMBOLS>(
    Array(30).fill(DRAGON_SYMBOLS[0])
  );

  const [jackpots, setJackpots] = useState({
    minor: 15000,
    major: 45000,
    grand: 120000,
  });

  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [messageBox, setMessageBox] = useState<{ text: string; type: "win" | "lose" | "break" | "normal" }>({
    text: "Võ đạo Dragon Ball: Sưu tập đủ 7 Viên Ngọc Rồng & Ngũ Linh săn hũ cực đỉnh!",
    type: "normal",
  });

  useEffect(() => {
    autoSpinRef.current = autoCount;
  }, [autoCount]);

  useEffect(() => {
    currentBetRef.current = currentBet;
  }, [currentBet]);

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setPoints(profile.balance);
          pointsRef.current = profile.balance;
        }
      }
    }
    fetchUserData();
  }, []);

  useEffect(() => {
    generateValidGrid();
  }, []);

  const generateValidGrid = () => {
    const newGrid: typeof DRAGON_SYMBOLS = [];
    for (let r = 0; r < 5; r++) {
      let prevId = "";
      for (let c = 0; c < 6; c++) {
        const rand = Math.random();
        let pool = DRAGON_SYMBOLS.filter((s) => s.type === "weak");
        if (rand > 0.5) pool = DRAGON_SYMBOLS.filter((s) => s.type === "mid");
        if (rand > 0.82) pool = DRAGON_SYMBOLS.filter((s) => s.type === "strong");

        let selected = pool[Math.floor(Math.random() * pool.length)];
        if (selected.id === prevId && Math.random() < 0.65) {
          const altPool = pool.filter((s) => s.id !== prevId);
          if (altPool.length > 0) selected = altPool[Math.floor(Math.random() * altPool.length)];
        }
        prevId = selected.id;
        newGrid.push(selected);
      }
    }
    setGrid(newGrid);
    return newGrid;
  };

  const updatePointsInDB = async (newPts: number) => {
    setPoints(newPts);
    pointsRef.current = newPts;
    if (!user) return;
    try {
      await supabase
        .from("profiles")
        .update({ balance: newPts })
        .eq("id", user.id);
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
    if (spinning && autoSpinRef.current > 0) return;
    setAutoCount(targetAuto);
    autoSpinRef.current = targetAuto;
    if (!spinning) {
      executeSpin(targetAuto);
    }
  };

  const stopAuto = () => {
    setAutoCount(0);
    autoSpinRef.current = 0;
    setMessageBox({ text: "⏹ Đã dừng Auto theo yêu cầu của chiến binh.", type: "normal" });
  };

  const executeSpin = async (remainingAuto: number) => {
    const bet = currentBetRef.current;
    const currentPts = pointsRef.current;

    if (currentPts < bet) {
      alert("Ní không đủ điểm Ki để quay tiếp!");
      stopAuto();
      setSpinning(false);
      return;
    }

    setSpinning(true);
    setWinningCoords([]);
    
    setJackpots(prev => ({
      minor: prev.minor + Math.floor(bet * 0.15),
      major: prev.major + Math.floor(bet * 0.10),
      grand: prev.grand + Math.floor(bet * 0.05),
    }));

    const newPointsAfterBet = currentPts - bet;
    await updatePointsInDB(newPointsAfterBet);

    let counter = 0;
    const speedDelay = autoSpeed === 2 ? 30 : 90; 
    const maxSteps = autoSpeed === 2 ? 6 : 12;

    const interval = setInterval(() => {
      generateValidGrid();
      counter++;
      if (counter > maxSteps) {
        clearInterval(interval);
        const finalGrid = generateValidGrid();
        evaluateGameLogic(finalGrid, newPointsAfterBet, remainingAuto);
        setSpinning(false);
      }
    }, speedDelay);
  };

  const evaluateGameLogic = async (finalGrid: typeof DRAGON_SYMBOLS, currentPts: number, remainingAuto: number) => {
    const bet = currentBetRef.current;
    
    let winChance = 0.30;
    if (bet <= 50) winChance = 0.38;
    else if (bet <= 500) winChance = 0.30;
    else if (bet <= 2000) winChance = 0.22;
    else winChance = 0.15;

    const isTriggerWin = Math.random() < winChance;
    const grandHit = Math.random() < 0.0008;
    const majorHit = !grandHit && Math.random() < 0.003;
    const minorHit = !grandHit && !majorHit && Math.random() < 0.01;

    let baseWinAmount = 0;
    let matchedIndices: number[] = [];
    let resultText = "";
    let isStreakWin = false;
    let hitJackpotType = "";

    if (grandHit) {
      hitJackpotType = "grand";
      baseWinAmount = jackpots.grand;
      matchedIndices = [0, 1, 2, 3, 4, 5];
      resultText = `👑 NỔ HŨ GRAND JACKPOT! Húp trọn +${baseWinAmount.toLocaleString()} PTS`;
      isStreakWin = true;
      triggerJackpotSideGlow();
      setJackpots(prev => ({ ...prev, grand: 120000 }));
    } else if (majorHit) {
      hitJackpotType = "major";
      baseWinAmount = jackpots.major;
      matchedIndices = [0, 1, 2, 3, 4];
      resultText = `💎 NỔ HŨ MAJOR JACKPOT! Nhận ngay +${baseWinAmount.toLocaleString()} PTS`;
      isStreakWin = true;
      triggerJackpotSideGlow();
      setJackpots(prev => ({ ...prev, major: 45000 }));
    } else if (minorHit) {
      hitJackpotType = "minor";
      baseWinAmount = jackpots.minor;
      matchedIndices = [0, 1, 2, 3];
      resultText = `🔥 NỔ HŨ MINOR JACKPOT! Nhận ngay +${baseWinAmount.toLocaleString()} PTS`;
      isStreakWin = true;
      triggerJackpotSideGlow();
      setJackpots(prev => ({ ...prev, minor: 15000 }));
    } else if (isTriggerWin) {
      const columns: { symbol: typeof DRAGON_SYMBOLS[0]; index: number }[][] = [];
      for (let c = 0; c < 6; c++) {
        const colItems = [];
        for (let r = 0; r < 5; r++) {
          const idx = r * 6 + c;
          colItems.push({ symbol: finalGrid[idx], index: idx });
        }
        columns.push(colItems);
      }

      let totalStreakWin = 0;
      let streakWinningSet = new Set<number>();
      const firstColSymbols = columns[0].map(item => item.symbol.id);
      const uniqueSymbolsToCheck = Array.from(new Set(firstColSymbols));

      uniqueSymbolsToCheck.forEach((symId) => {
        let consecutiveColsCount = 0;
        let tempMatchedIndices: number[] = [];

        for (let c = 0; c < 6; c++) {
          const foundInCol = columns[c].filter(item => item.symbol.id === symId);
          if (foundInCol.length > 0) {
            consecutiveColsCount++;
            foundInCol.forEach(item => tempMatchedIndices.push(item.index));
          } else {
            break;
          }
        }

        const mustExistInCol1 = columns[0].some(item => item.symbol.id === symId);
        if (mustExistInCol1 && consecutiveColsCount >= 3) {
          const symObj = DRAGON_SYMBOLS.find((s) => s.id === symId);
          if (symObj) {
            let symbolWin = symObj.type === "weak" ? (bet * 0.4) * symObj.multiplier * consecutiveColsCount : (bet * 0.8) * symObj.multiplier * consecutiveColsCount;
            const columnBonus = consecutiveColsCount >= 5 ? 2.5 : consecutiveColsCount === 4 ? 1.8 : 1;
            totalStreakWin += Math.floor(symbolWin * columnBonus);
            tempMatchedIndices.forEach(idx => streakWinningSet.add(idx));
          }
        }
      });

      if (streakWinningSet.size > 0 && totalStreakWin > 0) {
        baseWinAmount = totalStreakWin;
        matchedIndices = Array.from(streakWinningSet);
        isStreakWin = true;
        const randomPraise = WIN_PRAISES[Math.floor(Math.random() * WIN_PRAISES.length)];
        resultText = `✨ ${randomPraise} +${baseWinAmount.toLocaleString()} PTS`;
        triggerExplosion();
      } else {
        if (streakRef.current >= 0) {
          baseWinAmount = 0;
        } else {
          const chosenAura = AURA_QUICK_REWARDS[Math.floor(Math.random() * AURA_QUICK_REWARDS.length)];
          baseWinAmount = Math.floor(bet * chosenAura.mult);
          matchedIndices = [Math.floor(Math.random() * 6), Math.floor(Math.random() * 6) + 6];
          resultText = `${chosenAura.icon} BỘC PHÁT ${chosenAura.name.toUpperCase()}! Thưởng nhanh x${chosenAura.mult} = +${baseWinAmount.toLocaleString()} PTS`;
          isStreakWin = false;
          triggerExplosion();
        }
      }
    }

    let finalTotalWin = 0;

    if (baseWinAmount > 0) {
      if (isStreakWin) {
        const currentIdx = streakRef.current;
        const nextIdx = currentIdx < 0 ? 0 : Math.min(currentIdx + 1, STREAK_STEPS.length - 1);
        streakRef.current = nextIdx;
        setStreakIndex(nextIdx);

        const activeMultiplier = hitJackpotType ? 1 : STREAK_STEPS[nextIdx];
        finalTotalWin = hitJackpotType ? baseWinAmount : baseWinAmount * activeMultiplier;
        resultText = hitJackpotType 
          ? resultText
          : `🔥 CHUỖI NHÂN x${activeMultiplier}! (${baseWinAmount.toLocaleString()} x ${activeMultiplier}) = +${finalTotalWin.toLocaleString()} PTS`;
      } else {
        finalTotalWin = baseWinAmount;
      }

      const finalPts = currentPts + finalTotalWin;
      await updatePointsInDB(finalPts);
      setWinningCoords(matchedIndices);
      setMessageBox({ text: resultText, type: "win" });
      addHistory(resultText, true);
    } else {
      setWinningCoords([]);
      if (streakRef.current >= 0) {
        streakRef.current = -1;
        setStreakIndex(-1);
        const breakTaunt = STREAK_BROKEN_TAUNTS[Math.floor(Math.random() * STREAK_BROKEN_TAUNTS.length)];
        resultText = `${breakTaunt} (-${bet} PTS)`;
        setMessageBox({ text: resultText, type: "break" });
      } else {
        const randomTaunt = LOSE_TAUNTS[Math.floor(Math.random() * LOSE_TAUNTS.length)];
        resultText = `💥 Thua (-${bet} PTS) | ${randomTaunt}`;
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

  const triggerJackpotSideGlow = () => {
    setJackpotSideGlow(true);
    setExplosiveEffect(true);
    setTimeout(() => {
      setJackpotSideGlow(false);
      setExplosiveEffect(false);
    }, 1500);
  };

  const continueAutoIfNeeded = (remainingAuto: number) => {
    const currentAutoSetting = autoSpinRef.current;
    if (currentAutoSetting === 0) return;

    const delayTime = autoSpeed === 2 ? 150 : 350;

    if (remainingAuto === 99999) {
      setTimeout(() => executeSpin(99999), delayTime);
    } else if (remainingAuto > 1) {
      setAutoCount(remainingAuto - 1);
      setTimeout(() => executeSpin(remainingAuto - 1), delayTime);
    } else {
      setAutoCount(0);
      autoSpinRef.current = 0;
      setMessageBox({ text: "✨ Đã hoàn thành toàn bộ lượt Auto!", type: "normal" });
    }
  };

  const addHistory = (text: string, isWin: boolean) => {
    const newEntry: HistoryItem = {
      id: Date.now().toString(),
      text,
      time: new Date().toLocaleTimeString(),
      isWin,
    };
    setHistory((prev) => [newEntry, ...prev.slice(0, 8)]);
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-white font-sans select-none flex flex-col items-center justify-start p-1.5 sm:p-3 overflow-x-hidden transition-all duration-300 ${explosiveEffect ? "ring-4 ring-amber-400 bg-amber-950/30" : ""}`}>
      
      {/* Top Bar */}
      <div className="w-full max-w-md sm:max-w-4xl flex justify-between items-center mb-1.5 px-1">
        <Link href="/" className="text-xs sm:text-sm font-black text-amber-400 hover:underline">
          ← Về Cổng Game
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullScreen}
            className="bg-slate-900/90 border border-amber-500/50 px-2 py-0.5 rounded-lg text-xs font-bold text-amber-400 hover:bg-slate-800 transition cursor-pointer shadow"
          >
            ⛶ Full
          </button>

          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-amber-500/50 px-2.5 py-0.5 rounded-lg shadow">
            <span>🪙</span>
            <span className="font-extrabold text-amber-400 tracking-wide text-xs sm:text-sm">{points.toLocaleString()}</span>
            <span className="text-[10px] text-amber-300/70">PTS</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className={`w-full max-w-md sm:max-w-4xl bg-slate-900/98 border-2 border-amber-500/50 rounded-2xl p-2 sm:p-4 shadow-2xl flex flex-col gap-2 transition-all duration-500 ${jackpotSideGlow ? "ring-8 ring-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.8)]" : ""}`}>
        
        {/* 3 HŨ JACKPOT */}
        <div className="grid grid-cols-3 gap-1.5 relative">
          {jackpotSideGlow && (
            <div className="absolute -inset-2 bg-gradient-to-r from-yellow-500 via-red-500 to-amber-500 rounded-xl blur-md opacity-75 animate-pulse -z-10"></div>
          )}

          <div className="bg-gradient-to-b from-amber-600 to-amber-900 border border-amber-300 rounded-xl p-1.5 text-center shadow">
            <div className="text-[8px] sm:text-[11px] font-black text-amber-200 uppercase tracking-wider">🔥 MINOR HŨ</div>
            <div className="text-[10px] sm:text-base font-black text-white font-mono">{jackpots.minor.toLocaleString()}</div>
          </div>

          <div className="bg-gradient-to-b from-purple-700 via-indigo-700 to-slate-900 border border-purple-300 rounded-xl p-1.5 text-center shadow">
            <div className="text-[8px] sm:text-[11px] font-black text-purple-200 uppercase tracking-wider">💎 MAJOR HŨ</div>
            <div className="text-[10px] sm:text-base font-black text-purple-300 font-mono">{jackpots.major.toLocaleString()}</div>
          </div>

          <div className="bg-gradient-to-b from-red-600 via-orange-600 to-amber-600 border border-yellow-200 rounded-xl p-1.5 text-center shadow animate-pulse">
            <div className="text-[8px] sm:text-[11px] font-black text-yellow-200 uppercase tracking-wider">👑 GRAND HŨ</div>
            <div className="text-[10px] sm:text-lg font-black text-yellow-300 font-mono">{jackpots.grand.toLocaleString()}</div>
          </div>
        </div>

        {/* DANH SÁCH AURA THƯỞNG NHANH */}
        <div className="bg-slate-950/80 border border-amber-500/30 p-1 rounded-xl flex items-center justify-between gap-1 overflow-x-auto text-[9px] sm:text-xs">
          {AURA_QUICK_REWARDS.map((aura) => (
            <div key={aura.id} className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-lg shrink-0 flex items-center gap-1 font-bold">
              <span>{aura.icon}</span>
              <span className="text-amber-300">{aura.name.split(" ")[1]}</span>
              <span className="text-orange-400 font-mono">x{aura.mult}</span>
            </div>
          ))}
        </div>

        {/* THANH CHUỖI LIÊN HOÀN AURA */}
        <div className="bg-slate-950 border-2 border-amber-500/40 rounded-xl p-2 space-y-1 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <span>⚡</span> THANH CHUỖI LIÊN HOÀN AURA:
            </span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 pt-1">
            {STREAK_STEPS.map((step, idx) => {
              const isActive = streakIndex >= idx;
              return (
                <div
                  key={step}
                  className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-lg border text-[9px] sm:text-[10px] font-black transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.8)] scale-105 animate-pulse"
                      : "bg-slate-900/80 border-slate-800 text-slate-500 opacity-60"
                  }`}
                >
                  <span>x{step}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* KHUNG THÔNG BÁO */}
        <div className="flex justify-between items-center bg-slate-950 border border-amber-500/30 px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold gap-2">
          <div className={`truncate ${messageBox.type === "break" ? "text-rose-500 font-black animate-bounce" : messageBox.type === "lose" ? "text-rose-400" : "text-amber-300"}`}>
            💬 {messageBox.text}
          </div>
          {autoCount > 0 && (
            <button
              onClick={stopAuto}
              className="bg-rose-600 hover:bg-rose-500 text-white font-black px-2 py-0.5 rounded-lg text-[10px] animate-pulse cursor-pointer shrink-0"
            >
              ⏹ Dừng ({autoCount === 99999 ? "Vô Cực" : autoCount})
            </button>
          )}
        </div>

        {/* LƯỚI 5 HÀNG X 6 CỘT */}
        <div className="bg-slate-950 p-1.5 sm:p-2 rounded-xl border border-amber-500/30 shadow-inner">
          <div className="grid grid-cols-6 grid-rows-5 gap-1">
            {grid.map((sym, idx) => {
              const isWinning = winningCoords.includes(idx);
              const hasResult = winningCoords.length > 0;

              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center justify-center rounded-lg aspect-square p-0.5 transition-all duration-300 ${
                    spinning
                      ? "animate-pulse scale-95 bg-slate-800"
                      : isWinning
                      ? "bg-gradient-to-b from-amber-500 to-orange-600 border-2 border-yellow-300 scale-105 shadow-[0_0_20px_rgba(245,158,11,0.9)] z-10 animate-bounce"
                      : hasResult
                      ? "bg-slate-950/90 border border-slate-900 opacity-30 scale-95 grayscale"
                      : "bg-gradient-to-b from-slate-800 to-slate-900 border border-amber-500/20 hover:border-amber-400"
                  }`}
                >
                  <span className="text-xl sm:text-2xl">{sym.icon}</span>
                  <span className={`text-[6px] sm:text-[8px] font-bold truncate w-full text-center mt-0.5 ${isWinning ? "text-slate-950 font-black" : "text-amber-300/80"}`}>
                    {sym.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* THANH ĐIỀU KHIỂN CƯỢC & AUTO & TỐC ĐỘ & QUAY */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-start">
            <span className="text-[11px] font-bold text-amber-300 mr-1">CƯỢC:</span>
            {BET_OPTIONS.map((amt) => (
              <button
                key={amt}
                onClick={() => setCurrentBet(amt)}
                disabled={spinning}
                className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-black border transition cursor-pointer ${
                  currentBet === amt
                    ? "bg-amber-400 text-slate-950 border-amber-300 shadow"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                {amt}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-orange-400 mr-1">AUTO:</span>
              {AUTO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSpinClick(opt.value)}
                  disabled={spinning && autoCount === 0}
                  className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-black border transition cursor-pointer ${
                    autoCount === opt.value
                      ? "bg-orange-500 text-slate-950 border-orange-300 shadow"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-amber-400">TỐC ĐỘ:</span>
              <button
                onClick={() => setAutoSpeed(autoSpeed === 1 ? 2 : 1)}
                className="bg-slate-800 border border-amber-500/50 text-amber-300 px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer hover:bg-slate-700 shadow"
              >
                ⚡ {autoSpeed === 1 ? "x1 (Chuẩn Chậm)" : "🚀 x2 (Siêu Tốc)"}
              </button>
            </div>
          </div>

          <button
            onClick={() => handleSpinClick(0)}
            disabled={spinning}
            className={`w-full py-2.5 rounded-xl font-black text-sm sm:text-base tracking-wider transition shadow-lg active:scale-95 cursor-pointer ${
              spinning
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 hover:brightness-110 text-slate-950 shadow-amber-500/20"
            }`}
          >
            {spinning ? (autoCount > 0 ? `ĐANG AUTO (${autoCount})...` : "ĐANG QUAY...") : "🔥 QUAY NGAY"}
          </button>
        </div>

        {/* LỊCH SỬ GẦN NHẤT */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2 max-h-20 overflow-y-auto text-[10px] sm:text-[11px]">
          <div className="font-bold text-slate-400 mb-0.5">📜 Lịch sử chiến đấu gần đây:</div>
          {history.length === 0 ? (
            <div className="text-slate-600 italic">Chưa có lượt quay nào trong phiên này.</div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="flex justify-between py-0.5 border-b border-slate-900/60">
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