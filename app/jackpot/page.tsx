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

const DRAGON_SYMBOLS = [
  { id: "scatter", icon: "/assets/jackpot/shenron.png", name: "Rồng Thần", type: "scatter", basePoints: 120, multiplier: 12 },
  { id: "cell", icon: "/assets/jackpot/cell.png", name: "Cell", type: "strong", basePoints: 80, multiplier: 8 },
  { id: "kidbuu", icon: "/assets/jackpot/kidbuu.png", name: "Kid Bưu", type: "strong", basePoints: 80, multiplier: 8 },
  { id: "buubeo", icon: "/assets/jackpot/buubeo.png", name: "Bưu Béo", type: "strong", basePoints: 80, multiplier: 8 },
  { id: "frieza", icon: "/assets/jackpot/frieza.png", name: "Frieza đại đế", type: "strong", basePoints: 80, multiplier: 8 },
  { id: "gohan", icon: "/assets/jackpot/gohan.png", name: "Gohan", type: "strong", basePoints: 70, multiplier: 5 },
  { id: "jiren", icon: "/assets/jackpot/jiren.png", name: "Jiren", type: "strong", basePoints: 100, multiplier: 10 },
  { id: "krillin", icon: "/assets/jackpot/krillin.png", name: "Krillin", type: "mid", basePoints: 50, multiplier: 4.5 },
  { id: "ball7", icon: "/assets/jackpot/dragon-ball-7.png", name: "7 sao", type: "mid", basePoints: 45, multiplier: 4 },
  { id: "ball6", icon: "/assets/jackpot/dragon-ball-6.png", name: "6 sao", type: "mid", basePoints: 40, multiplier: 3.5 },
  { id: "ball5", icon: "/assets/jackpot/dragon-ball-5.png", name: "5 sao", type: "mid", basePoints: 30, multiplier: 3 },
  { id: "ball4", icon: "/assets/jackpot/dragon-ball-4.png", name: "4 sao", type: "mid", basePoints: 25, multiplier: 2.5 },
  { id: "ball3", icon: "/assets/jackpot/dragon-ball-3.png", name: "3 sao", type: "weak", basePoints: 20, multiplier: 2 },
  { id: "ball2", icon: "/assets/jackpot/dragon-ball-2.png", name: "2 sao", type: "weak", basePoints: 15, multiplier: 1.5 },
  { id: "ball1", icon: "/assets/jackpot/dragon-ball-1.png", name: "1 sao", type: "weak", basePoints: 10, multiplier: 1 },
  { id: "senzu", icon: "/assets/jackpot/dausenzu.png", name: "Đậu Senzu", type: "weak", basePoints: 5, multiplier: 0.5 },
  { id: "yamcha", icon: "/assets/jackpot/yamcha.png", name: "yamcha", type: "weak", basePoints: 1, multiplier: 0.5 },
];

const AURA_QUICK_REWARDS = [
  { id: "ki_white", name: "Ki Trắng", mult: 2.0, weight: 800, icon: "/assets/jackpot/kiwhite.png", quote: "Goku nhếch mép: 'Bắt đầu khởi động cơ thể thôi!'" },
  { id: "kaioken", name: "Kaioken", mult: 3.0, weight: 600, icon: "/assets/jackpot/kaioken.png", quote: "Goku gầm lên: 'Gấp đôi sức mạnh, Kaioken hoàn thành!'" },
  { id: "ssj1", name: "SSJ", mult: 4.0, weight: 500, icon: "/assets/jackpot/ssj1.png", quote: "Goku Super Saiyan: 'Ta đã nổi giận thực sự rồi đấy Frieza!'" },
  { id: "ssj2", name: "SSJ 2", mult: 4.0, weight: 400, icon: "/assets/jackpot/ssj2.png", quote: "Gohan SSJ2: 'Ta sẽ không tha cho ngươi đâu...'" },
  { id: "ssj3", name: "SSJ 3", mult: 8.0, weight: 300, icon: "/assets/jackpot/ssj3.png", quote: "Goku SSJ3: 'Hãy xem đây, sức mạnh vượt qua cả Super Saiyan 2!'" },
  { id: "ssj_blue", name: "SSJ Blue", mult: 10.0, weight: 200, icon: "/assets/jackpot/ssj_blue.png", quote: "Goku Blue: 'Sức mạnh của cảnh giới thần linh!'" },
  { id: "ssj_god", name: "SSJ God", mult: 15.0, weight: 100, icon: "/assets/jackpot/ssj_god.png", quote: "Goku God: 'Ánh sáng đỏ rực của thần thánh vũ trụ!'" },
  { id: "android", name: "Android", mult: 20.0, weight: 50, icon: "/assets/jackpot/android.png", quote: "Đám Android: 'Năng lượng vô tận, các ngươi tuổi gì đấu lại!'" },
  { id: "ultra", name: "Ultra", mult: 25.0, weight: 30, icon: "/assets/jackpot/ultra.png", quote: "Bản Năng Vô Cực: 'Thân thể tự động né tránh mọi đòn tấn công!'" },
  { id: "hakai", name: "Hakai", mult: 30.0, weight: 15, icon: "/assets/jackpot/hakai.png", quote: "Hakai Hủy Diệt: 'Tan biến vào hư vô theo lệnh của thần hủy diệt!'" },
];

const STREAK_STEPS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

const LOSE_TAUNTS = [
  "Vegeta cười khẩy: 'Cược lớn mà đánh kiểu này à? Về nhà bú sữa đi!'",
  "Yamcha nằm đất vẫy tay chào tạm biệt số điểm Ki vừa bay màu!",
  "Beerus đại nhân đang ngủ gật bỗng tỉnh giấc vì cú lọ quá tệ!",
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

export default function JackpotTestPage() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [points, setPoints] = useState<number>(0);
  const [currentBet, setCurrentBet] = useState<number>(100);
  const [spinning, setSpinning] = useState<boolean>(false);
  const [explosiveEffect, setExplosiveEffect] = useState<boolean>(false);
  const [jackpotSideGlow, setJackpotSideGlow] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  const [winningCoords, setWinningCoords] = useState<number[]>([]);
  const [autoCount, setAutoCount] = useState<number>(0);
  const [autoSpeed, setAutoSpeed] = useState<number>(1);
  
  const [freeSpinsLeft, setFreeSpinsLeft] = useState<number>(0);
  const freeSpinsRef = useRef<number>(0);

  const pointsRef = useRef<number>(0);
  const autoSpinRef = useRef<number>(0);
  const currentBetRef = useRef<number>(100);

  const streakRef = useRef<number>(-1);
  const [streakIndex, setStreakIndex] = useState<number>(-1);

  const [lastWonAura, setLastWonAura] = useState<any>(null);

  const [broadcastMsg, setBroadcastMsg] = useState<string | null>(null);
  const broadcastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [grid, setGrid] = useState<typeof DRAGON_SYMBOLS>(
    Array(30).fill(DRAGON_SYMBOLS[0])
  );

  const [jackpots, setJackpots] = useState({
    minor: 15000,
    major: 45000,
    grand: 100000,
  });
  const jackpotsRef = useRef(jackpots);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    jackpotsRef.current = jackpots;
  }, [jackpots]);

  useEffect(() => {
    freeSpinsRef.current = freeSpinsLeft;
  }, [freeSpinsLeft]);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [messageBox, setMessageBox] = useState<{ text: string; type: "win" | "lose" | "break" | "normal" }>({
    text: "Rồng Thần: Sưu tập đủ 6 Rồng Thần trên 6 cột để kích hoạt 10 Free Lọ!",
    type: "normal",
  });

  useEffect(() => {
    autoSpinRef.current = autoCount;
  }, [autoCount]);

  useEffect(() => {
    currentBetRef.current = currentBet;
  }, [currentBet]);

  useEffect(() => {
    async function fetchGlobalJackpot() {
      const { data } = await supabase
        .from("system_jackpot")
        .select("minor, major, grand")
        .eq("id", "global")
        .single();
      if (data) {
        setJackpots({ minor: data.minor, major: data.major, grand: data.grand });
      }
    }
    fetchGlobalJackpot();

    const channel = supabase
      .channel("system_jackpot_test_realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "system_jackpot", filter: "id=eq.global" },
        (payload) => {
          if (payload.new) {
            setJackpots({
              minor: payload.new.minor,
              major: payload.new.major,
              grand: payload.new.grand,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const triggerBroadcast = (text: string) => {
    if (broadcastTimerRef.current) {
      clearTimeout(broadcastTimerRef.current);
    }
    setBroadcastMsg(text);
    broadcastTimerRef.current = setTimeout(() => {
      setBroadcastMsg(null);
    }, 10000);
  };

  const getRandomAura = () => {
    const totalWeight = AURA_QUICK_REWARDS.reduce((sum, aura) => sum + aura.weight, 0);
    let randomNum = Math.random() * totalWeight;
    
    for (const aura of AURA_QUICK_REWARDS) {
      if (randomNum < aura.weight) {
        return aura;
      }
      randomNum -= aura.weight;
    }
    return AURA_QUICK_REWARDS[0];
  };

  const generateValidGrid = () => {
    const newGrid: typeof DRAGON_SYMBOLS = [];
    for (let r = 0; r < 5; r++) {
      let prevId = "";
      for (let c = 0; c < 6; c++) {
        const rand = Math.random();
        let pool = DRAGON_SYMBOLS.filter((s) => s.type === "weak");
        if (rand > 0.5) pool = DRAGON_SYMBOLS.filter((s) => s.type === "mid");
        if (rand > 0.70) pool = DRAGON_SYMBOLS.filter((s) => s.type === "strong");
        if (rand > 0.88) pool = DRAGON_SYMBOLS.filter((s) => s.id === "scatter");

        let selected = pool[Math.floor(Math.random() * pool.length)];
        if (selected.id === prevId && selected.type !== "scatter" && Math.random() < 0.75) {
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

  const updateGlobalJackpotInDB = async (newPool: { minor: number; major: number; grand: number }) => {
    setJackpots(newPool);
    try {
      await supabase
        .from("system_jackpot")
        .update(newPool)
        .eq("id", "global");
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
    const isFreeSpinActive = freeSpinsRef.current > 0;

    if (!isFreeSpinActive) {
      if (currentPts < bet) {
        alert("Ní không đủ điểm Ki điểm để lọ tiếp!");
        stopAuto();
        setSpinning(false);
        return;
      }

      let addMinor = 0;
      let addMajor = 0;
      let addGrand = Math.floor(bet * 0.30);

      if (bet <= 200) {
        addMinor = Math.floor(bet * 0.70);
      } else {
        addMajor = Math.floor(bet * 0.70);
      }

      const updatedJackpots = {
        minor: jackpotsRef.current.minor + addMinor,
        major: jackpotsRef.current.major + addMajor,
        grand: jackpotsRef.current.grand + addGrand,
      };
      await updateGlobalJackpotInDB(updatedJackpots);

      const newPointsAfterBet = currentPts - bet;
      await updatePointsInDB(newPointsAfterBet);
    } else {
      setFreeSpinsLeft(prev => prev - 1);
    }

    setSpinning(true);
    setWinningCoords([]);
    setLastWonAura(null);

    let counter = 0;
    const speedDelay = autoSpeed === 2 ? 30 : 90; 
    const maxSteps = autoSpeed === 2 ? 6 : 12;

    const interval = setInterval(() => {
      generateValidGrid();
      counter++;
      if (counter > maxSteps) {
        clearInterval(interval);
        const finalGrid = generateValidGrid();
        evaluateGameLogic(finalGrid, pointsRef.current, remainingAuto);
        setSpinning(false);
      }
    }, speedDelay);
  };

  const evaluateGameLogic = async (finalGrid: typeof DRAGON_SYMBOLS, currentPts: number, remainingAuto: number) => {
    const bet = currentBetRef.current;
    const playerName = user?.email ? user.email.split("@")[0] : "Chiến binh ẩn danh";
    const isFreeSpinActive = freeSpinsRef.current > 0;

    let scatterIndices: number[] = [];
    let hasScatterInAllCols = true;

    for (let c = 0; c < 6; c++) {
      let foundScatterInCol = false;
      for (let r = 0; r < 5; r++) {
        const idx = r * 6 + c;
        if (finalGrid[idx].id === "scatter") {
          foundScatterInCol = true;
          scatterIndices.push(idx);
        }
      }
      if (!foundScatterInCol) {
        hasScatterInAllCols = false;
        break;
      }
    }

    if (hasScatterInAllCols) {
      setFreeSpinsLeft(prev => prev + 10);
      setWinningCoords(scatterIndices);
      setLastWonAura(null);
      triggerJackpotSideGlow();
      const freeSpinMsg = isFreeSpinActive 
        ? `🌟 CỘNG DỒN THÀNH CÔNG! Thêm +10 VÒNG LỌ MIỄN PHÍ sảnh ${bet} PTS! 🚀`
        : `🌟 KÍCH HOẠT THÀNH CÔNG RỒNG THẦN! Nhận ngay 10 VÒNG LỌ MIỄN PHÍ sảnh ${bet} PTS! 🚀`;
      
      setMessageBox({ text: freeSpinMsg, type: "win" });
      triggerBroadcast(`📢 HUYỀN THOẠI RỒNG THẦN: Chiến binh [${playerName}] vừa sưu tập đủ 6 cột RỒNG THẦN, nhận thêm 20 Free Lọ cực khủng! 🌟🔥`);
      addHistory(freeSpinMsg, true);

      const cinematicPause = autoSpeed === 2 ? 1000 : 1600;
      setTimeout(() => {
        continueAutoIfNeeded(remainingAuto);
      }, cinematicPause);
      return;
    }

    let winChance = isFreeSpinActive ? 0.65 : 0.60;
    if (!isFreeSpinActive) {
      if (bet <= 50) winChance = 0.50;
      else if (bet <= 500) winChance = 0.40;
      else if (bet <= 2000) winChance = 0.30;
      else winChance = 0.20;
    }

    const isTriggerWin = Math.random() < winChance;
    
    const grandHit = Math.random() < 0.00002;
    const majorHit = !grandHit && bet >= 500 && Math.random() < 0.0001;
    const minorHit = !grandHit && !majorHit && bet <= 200 && Math.random() < 0.0004;

    let baseWinAmount = 0;
    let matchedIndices: number[] = [];
    let resultText = "";
    let isStreakWin = false;
    let hitJackpotType = "";

    if (grandHit) {
      hitJackpotType = "grand";
      baseWinAmount = jackpotsRef.current.grand;
      matchedIndices = [0, 1, 2, 3, 4, 5];
      resultText = `👑 NỔ HŨ NGỌC RỒNG SIÊU CẤP! Húp trọn +${baseWinAmount.toLocaleString()} PTS`;
      isStreakWin = true;
      setLastWonAura(null);
      triggerJackpotSideGlow();
      triggerBroadcast(`📢 KHO TÀNG CHẤN ĐỘNG: Chiến binh [${playerName}] vừa HÚP TRỌN NGỌC RỒNG SIÊU CẤP khủng khiếp +${baseWinAmount.toLocaleString()} PTS! 👑🔥`);
      await updateGlobalJackpotInDB({ ...jackpotsRef.current, grand: 100000 });
    } else if (majorHit) {
      hitJackpotType = "major";
      baseWinAmount = jackpotsRef.current.major;
      matchedIndices = [0, 1, 2, 3, 4];
      resultText = `💎 NỔ HŨ NGỌC RỒNG NAMEK! Nhận ngay +${baseWinAmount.toLocaleString()} PTS`;
      isStreakWin = true;
      setLastWonAura(null);
      triggerJackpotSideGlow();
      triggerBroadcast(`📢 TIN VUI SẢNH CAO: Chiến binh [${playerName}] vừa nổ tung NGỌC RỒNG NAMEK nhận +${baseWinAmount.toLocaleString()} PTS! 💎⚡`);
      await updateGlobalJackpotInDB({ ...jackpotsRef.current, major: 45000 });
    } else if (minorHit) {
      hitJackpotType = "minor";
      baseWinAmount = jackpotsRef.current.minor;
      matchedIndices = [0, 1, 2, 3];
      resultText = `🔥 NỔ HŨ NGỌC RỒNG TRÁI ĐẤT! Nhận ngay +${baseWinAmount.toLocaleString()} PTS`;
      isStreakWin = true;
      setLastWonAura(null);
      triggerJackpotSideGlow();
      triggerBroadcast(`📢 CHÚ MỪNG: Chiến binh [${playerName}] vừa giật hũ NGỌC RỒNG TRÁI ĐẤT +${baseWinAmount.toLocaleString()} PTS! 🔥`);
      await updateGlobalJackpotInDB({ ...jackpotsRef.current, minor: 15000 });
    } else if (isTriggerWin) {
      const gridColumns: { symbol: typeof DRAGON_SYMBOLS[0]; index: number }[][] = [];
      for (let c = 0; c < 6; c++) {
        const colItems = [];
        for (let r = 0; r < 5; r++) {
          const idx = r * 6 + c;
          colItems.push({ symbol: finalGrid[idx], index: idx });
        }
        gridColumns.push(colItems);
      }

      let totalStreakWin = 0;
      let streakWinningSet = new Set<number>();
      const firstColSymbols = gridColumns[0].map(item => item.symbol.id);
      const uniqueSymbolsToCheck = Array.from(new Set(firstColSymbols));

      uniqueSymbolsToCheck.forEach((symId) => {
        if (symId === "scatter") return;
        let consecutiveColsCount = 0;
        let tempMatchedIndices: number[] = [];

        for (let c = 0; c < 6; c++) {
          const foundInCol = gridColumns[c].filter(item => item.symbol.id === symId);
          if (foundInCol.length > 0) {
            consecutiveColsCount++;
            foundInCol.forEach(item => tempMatchedIndices.push(item.index));
          } else {
            break;
          }
        }

        const mustExistInCol1 = gridColumns[0].some(item => item.symbol.id === symId);
        if (mustExistInCol1 && consecutiveColsCount >= 3) {
          const symObj = DRAGON_SYMBOLS.find((s) => s.id === symId);
          if (symObj) {
            const baseScore = symObj.basePoints + (bet * 0.05);
            let symbolWin = baseScore * symObj.multiplier * consecutiveColsCount;
            const columnBonus = 
              consecutiveColsCount >= 6 ? 2.5 : 
              consecutiveColsCount === 5 ? 1.8 : 
              consecutiveColsCount === 4 ? 1.2 : 1.0;
            
            totalStreakWin += Math.floor(symbolWin * columnBonus);
            tempMatchedIndices.forEach(idx => streakWinningSet.add(idx));
          }
        }
      });

      if (streakWinningSet.size > 0 && totalStreakWin > 0) {
        baseWinAmount = totalStreakWin;
        matchedIndices = Array.from(streakWinningSet);
        isStreakWin = true;
        setLastWonAura(null);
        const randomPraise = WIN_PRAISES[Math.floor(Math.random() * WIN_PRAISES.length)];
        resultText = `✨ ${randomPraise} +${baseWinAmount.toLocaleString()} PTS`;
        triggerExplosion();
      } else {
        if (streakRef.current >= 0) {
          baseWinAmount = 0;
        } else {
          const chosenAura = getRandomAura();
          setLastWonAura(chosenAura);
          setWinningCoords([]);

          baseWinAmount = Math.floor(bet * chosenAura.mult * (isFreeSpinActive ? 1.5 : 1));
          
          resultText = `${chosenAura.quote} (${chosenAura.name} x${chosenAura.mult}) = +${baseWinAmount.toLocaleString()} PTS`;
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
      
      if (isStreakWin || hitJackpotType) {
        setWinningCoords(matchedIndices);
      } else {
        setWinningCoords([]);
      }

      setMessageBox({ text: isFreeSpinActive ? `[FREE SPIN] ${resultText}` : resultText, type: "win" });
      addHistory(resultText, true);
    } else {
      setWinningCoords([]);
      setLastWonAura(null);
      if (streakRef.current >= 0) {
        streakRef.current = -1;
        setStreakIndex(-1);
        const breakTaunt = STREAK_BROKEN_TAUNTS[Math.floor(Math.random() * STREAK_BROKEN_TAUNTS.length)];
        resultText = `${breakTaunt} (-${isFreeSpinActive ? 0 : bet} PTS)`;
        setMessageBox({ text: resultText, type: "break" });
      } else {
        const randomTaunt = LOSE_TAUNTS[Math.floor(Math.random() * LOSE_TAUNTS.length)];
        resultText = `💥 Thua (-${isFreeSpinActive ? 0 : bet} PTS) | ${randomTaunt}`;
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
    if (currentAutoSetting === 0 && freeSpinsRef.current === 0) return;

    const delayTime = autoSpeed === 2 ? 150 : 350;

    if (freeSpinsRef.current > 0) {
      setTimeout(() => executeSpin(remainingAuto), delayTime);
      return;
    }

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
    setHistory((prev) => [newEntry, ...prev.slice(0, 15)]);
  };

  return (
    <div 
      className={`fixed inset-0 overflow-hidden bg-slate-950 text-white font-sans select-none flex flex-col justify-between ${
        explosiveEffect ? "ring-4 ring-amber-400 bg-amber-950/30" : ""
      }`} 
      style={{ touchAction: 'manipulation' }}
    >
      
      {/* 🚀 HEADER TOP BAR KÈM NÚT "📜 LUẬT" GÓC TRÊN BÊN PHẢI */}
      <header className="bg-slate-900/95 border-b border-amber-500/40 px-3 py-1.5 flex justify-between items-center z-30 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <Link href="/" className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/40 px-2.5 py-1 rounded-lg text-[10px] font-black shadow transition active:scale-95">
            🏠 Cổng Game
          </Link>
          {freeSpinsLeft > 0 && (
            <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 px-2 py-0.5 rounded-lg text-[10px] font-black animate-pulse shadow">
              🌟 FREE: {freeSpinsLeft}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowRulesModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-yellow-500/40 px-2 py-1 rounded-lg text-[10px] font-black shadow transition active:scale-95 cursor-pointer flex items-center gap-1"
          >
            📜 Luật
          </button>

          <button
            onClick={toggleFullScreen}
            className="bg-slate-800 text-amber-400 border border-amber-500/40 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
          >
            ⛶
          </button>

          <div className="flex items-center gap-1 bg-black/50 border border-amber-500/50 px-2.5 py-1 rounded-lg shadow">
            <span className="text-[11px]">🪙</span>
            <span className="font-extrabold text-amber-400 font-mono text-xs">{points.toLocaleString()}</span>
            <span className="text-[9px] text-amber-300/70 font-semibold">PTS</span>
          </div>
        </div>
      </header>

      {/* 🐉 THÂN GAME CO GIÃN TOÀN DIỆN MÀN HÌNH DỌC */}
      <main className="flex-1 flex flex-col justify-between p-1.5 space-y-1 overflow-hidden">
        
        {/* BROADCAST BANNER */}
        {broadcastMsg && (
          <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-red-600 border border-yellow-200 text-slate-950 font-black px-2 py-0.5 rounded-lg text-center text-[9px] shadow animate-bounce flex items-center justify-center gap-1 shrink-0">
            <span>⚡</span>
            <span className="truncate">{broadcastMsg}</span>
            <span>⚡</span>
          </div>
        )}

        {/* 3 HŨ JACKPOT COMPACT */}
        <div className="grid grid-cols-3 gap-1 relative shrink-0">
          {jackpotSideGlow && (
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 via-red-500 to-amber-500 rounded-xl blur opacity-75 animate-pulse -z-10"></div>
          )}

          <div className="bg-gradient-to-b from-amber-600 to-amber-950 border border-amber-300/80 rounded-xl p-0.5 text-center shadow">
            <div className="text-[7px] font-black text-amber-200 uppercase truncate">🔥 TRÁI ĐẤT</div>
            <div className="text-[9px] font-black text-white font-mono leading-tight">
              {mounted ? (jackpots?.minor || 0).toLocaleString() : "15,000"}
            </div>
          </div>

          <div className="bg-gradient-to-b from-red-600 via-orange-600 to-amber-600 border border-yellow-300 rounded-xl p-0.5 text-center shadow-lg animate-pulse scale-105 z-10">
            <div className="text-[7px] font-black text-yellow-200 uppercase truncate">👑 SIÊU CẤP</div>
            <div className="text-[10px] font-black text-yellow-300 font-mono leading-tight">
              {mounted ? (jackpots?.grand || 0).toLocaleString() : "100,000"}
            </div>
          </div>

          <div className="bg-gradient-to-b from-purple-700 via-indigo-700 to-slate-900 border border-purple-300/80 rounded-xl p-0.5 text-center shadow">
            <div className="text-[7px] font-black text-purple-200 uppercase truncate">💎 NAMEK</div>
            <div className="text-[9px] font-black text-purple-300 font-mono leading-tight">
              {mounted ? (jackpots?.major || 0).toLocaleString() : "45,000"}
            </div>
          </div>
        </div>

        {/* THANH THƯỞNG AURA THU NHỎ */}
        <div className="bg-slate-950/90 border border-amber-500/40 p-0.5 rounded-xl grid grid-cols-5 gap-0.5 shadow-inner shrink-0">
          {AURA_QUICK_REWARDS.map((aura) => {
            const isSelected = lastWonAura?.id === aura.id;
            return (
              <div 
                key={aura.id} 
                className={`flex flex-col items-center justify-center py-0.5 px-0.5 rounded border transition-all ${
                  isSelected 
                    ? "bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 border-yellow-200 scale-105 shadow z-10 animate-bounce" 
                    : "bg-slate-900/90 border-slate-800 text-slate-300"
                }`}
              >
                <img src={aura.icon} alt={aura.name} className="w-3.5 h-3.5 object-contain drop-shadow" />
                <span className={`text-[6.5px] font-black truncate w-full text-center ${isSelected ? "text-slate-950" : "text-amber-300"}`}>
                  x{aura.mult}
                </span>
              </div>
            );
          })}
        </div>

        {/* THANH CHUỖI LIÊN HOÀN AURA */}
        <div className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-0.5 space-y-0.5 shadow-inner shrink-0">
          <div className="flex items-center justify-between px-1">
            <span className="text-[8px] font-black text-amber-400 uppercase tracking-wider">
              ⚡ CHUỖI LIÊN HOÀN:
            </span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-0.5 pt-0.5">
            {STREAK_STEPS.map((step, idx) => {
              const isActive = streakIndex >= idx;
              return (
                <div
                  key={step}
                  className={`flex items-center justify-center py-0.5 rounded border text-[7.5px] font-black transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-yellow-200 shadow scale-105"
                      : "bg-slate-900/80 border-slate-800 text-slate-500 opacity-60"
                  }`}
                >
                  x{step}
                </div>
              );
            })}
          </div>
        </div>

        {/* KHUNG THÔNG BÁO CÁ NHÂN */}
        <div className="flex justify-between items-center bg-slate-950/90 border border-amber-500/30 px-2 py-0.5 rounded-lg text-[9.5px] font-bold gap-2 shrink-0">
          <div className="flex items-center gap-1 truncate">
            {lastWonAura && (
              <img src={lastWonAura.icon} alt={lastWonAura.name} className="w-3.5 h-3.5 object-contain animate-bounce shrink-0" />
            )}
            <span className={`truncate ${messageBox.type === "break" ? "text-rose-400 font-black" : messageBox.type === "lose" ? "text-rose-400" : "text-amber-300"}`}>
              💬 {messageBox.text}
            </span>
          </div>
          {autoCount > 0 && (
            <button
              onClick={stopAuto}
              className="bg-rose-600 text-white font-black px-1.5 py-0.5 rounded text-[8px] cursor-pointer shrink-0"
            >
              ⏹ Dừng
            </button>
          )}
        </div>

        {/* 🌟 LƯỚI QUAY CHIẾN ĐẤU CHÍNH 5 HÀNG X 6 CỘT - THU NHỎ Ô NỀN VỪA KHÍT */}
        <div className="flex-1 bg-slate-950 p-1 rounded-xl border border-amber-500/30 shadow-inner flex flex-col justify-center overflow-hidden">
          <div className="grid grid-cols-6 grid-rows-5 gap-0.5 h-full w-full">
            {grid.map((sym, idx) => {
              const isWinning = winningCoords.includes(idx);
              const hasResult = winningCoords.length > 0;
              const isScatter = sym.id === "scatter";

              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center justify-center rounded-lg p-0.5 transition-all duration-300 ${
                    spinning
                      ? "animate-pulse scale-95 bg-slate-800"
                      : isWinning
                      ? "bg-gradient-to-b from-amber-500 to-orange-600 border border-yellow-300 scale-105 shadow z-10 animate-bounce"
                      : isScatter
                      ? "bg-gradient-to-b from-yellow-600 to-amber-800 border border-yellow-300 animate-pulse shadow"
                      : hasResult
                      ? "bg-slate-950/90 border border-slate-900 opacity-30 scale-95 grayscale"
                      : "bg-gradient-to-b from-slate-800 to-slate-900 border border-amber-500/20"
                  }`}
                >
                  <div className="w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center">
                    <img 
                      src={sym.icon} 
                      alt={sym.name} 
                      className="w-full h-full object-contain drop-shadow"
                    />
                  </div>
                  <span className={`text-[5.5px] sm:text-[6.5px] font-bold truncate w-full text-center mt-0.5 ${isWinning || isScatter ? "text-slate-950 font-black" : "text-amber-300/80"}`}>
                    {sym.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 📜 KHUNG LỊCH SỬ QUAY - HIỂN THỊ CỐ ĐỊNH 3 DÒNG, CÓ THỂ VUỐT CUỘN */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1 max-h-[52px] overflow-y-auto text-[9px] shrink-0 scrollbar-thin">
          <div className="font-bold text-slate-400 text-[8px] mb-0.5 flex justify-between items-center border-b border-slate-800/80 pb-0.5">
            <span>📜 Lịch sử chiến đấu:</span>
            <span className="text-[7.5px] text-slate-500">(Vuốt để xem thêm)</span>
          </div>
          {history.length === 0 ? (
            <div className="text-slate-600 italic text-[8.5px]">Chưa có lượt quay nào trong phiên này.</div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="flex justify-between py-0.5 border-b border-slate-900/60 leading-tight">
                <span className={`truncate max-w-[80%] ${item.isWin ? "text-amber-400 font-bold" : "text-rose-400"}`}>
                  {item.text}
                </span>
                <span className="text-slate-500 font-mono text-[8px] shrink-0">{item.time}</span>
              </div>
            ))
          )}
        </div>

      </main>

      {/* 🚀 FOOTER BẢNG ĐIỀU KHIỂN ĐÁY MÀN HÌNH MOBILE - KHÍT ĐẸP CHUẨN POKER */}
      <footer className="bg-slate-900/95 border-t border-amber-500/40 p-2 px-3 z-30 backdrop-blur-md shrink-0">
        <div className="max-w-xl mx-auto flex flex-col gap-1.5">
          
          {/* CƯỢC & AUTO & SPEED */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto text-[10px]">
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-bold text-amber-300">CƯỢC:</span>
              <div className="flex gap-1 overflow-x-auto max-w-[170px] sm:max-w-none">
                {BET_OPTIONS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCurrentBet(amt)}
                    disabled={spinning || freeSpinsLeft > 0}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-black border transition cursor-pointer shrink-0 ${
                      currentBet === amt
                        ? "bg-amber-400 text-slate-950 border-amber-300 shadow"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setAutoSpeed(autoSpeed === 1 ? 2 : 1)}
                className="bg-slate-800 border border-amber-500/50 text-amber-300 px-2 py-0.5 rounded text-[9px] font-black cursor-pointer shadow"
              >
                ⚡ {autoSpeed === 1 ? "x1" : "🚀 x2"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-1 text-[10px]">
            <span className="font-bold text-orange-400 shrink-0">AUTO:</span>
            <div className="flex items-center gap-1 w-full overflow-x-auto">
              {AUTO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSpinClick(opt.value)}
                  disabled={spinning && autoCount === 0}
                  className={`flex-1 py-1 rounded text-[9px] font-black border transition cursor-pointer text-center whitespace-nowrap ${
                    autoCount === opt.value
                      ? "bg-orange-500 text-slate-950 border-orange-300 shadow"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* NÚT QUAY TO RÕ NỔI BẬT ĐÁY MÀN HÌNH */}
          <button
            onClick={() => handleSpinClick(0)}
            disabled={spinning}
            className={`w-full py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wider transition shadow-lg active:scale-95 cursor-pointer uppercase ${
              spinning
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : freeSpinsLeft > 0
                ? "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-slate-950 animate-pulse"
                : "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 hover:brightness-110 text-slate-950 shadow-amber-500/20"
            }`}
          >
            {spinning ? (autoCount > 0 ? `ĐANG AUTO LỌ (${autoCount})...` : "ĐANG LỌ...") : freeSpinsLeft > 0 ? `🌟 LỌ MIỄN PHÍ CÒN (${freeSpinsLeft})` : "🔥 LỌ NGAY"}
          </button>
        </div>
      </footer>

      {/* 📜 POPUP MODAL THÔNG BÁO LUẬT CHƠI & ĐIỂM BASE BIỂU TƯỢNG */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-500/70 rounded-2xl max-w-lg w-full p-4 max-h-[85vh] overflow-y-auto text-left shadow-2xl relative space-y-3">
            
            <div className="flex justify-between items-center border-b border-amber-500/40 pb-2">
              <h3 className="text-xs sm:text-sm font-black text-yellow-300 uppercase tracking-wide flex items-center gap-1.5">
                📜 MẬT SÁCH LUẬT CHƠI JACKPOT RỒNG THẦN
              </h3>
              <button 
                onClick={() => setShowRulesModal(false)}
                className="bg-rose-600 hover:bg-rose-500 text-white w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center cursor-pointer shadow"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-[11px] text-slate-300 leading-relaxed font-sans">
              
              {/* 1. THOẠI DRAGON BALL & LUẬT CƠ BẢN */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <h4 className="text-amber-400 font-bold flex items-center gap-1">
                  🐉 "Beerus đại nhân: 'Vận Ki lọ hũ, liên hoàn 3 cột trở lên sẽ kích hoạt nổ thưởng!'"
                </h4>
                <p className="text-slate-400 leading-normal text-[10.5px]">
                  • Các biểu tượng nối nhau liên tiếp từ **cột 1 sang phải (ít nhất 3 cột)** sẽ tự động bùng nổ điểm Ki.<br/>
                  • Thu thập đủ **6 biểu tượng Rồng Thần** xuất hiện trên 6 cột sẽ được ban cho **10 Lượt Lọ Miễn Phí**!
                </p>
              </div>

              {/* 2. NỔI BẬT QUY TẮC NỔ HŨ */}
              <div className="bg-gradient-to-r from-red-950/80 via-amber-950/90 to-red-950/80 p-3 rounded-xl border-2 border-amber-400/80 space-y-1.5 shadow-lg">
                <h4 className="text-yellow-300 font-black text-xs uppercase tracking-wider flex items-center gap-1">
                  👑 QUY TẮC GIẬT HŨ BÁ CHỦ VŨ TRỤ (NỔ HŨ)
                </h4>
                <div className="space-y-1 text-[10.5px] text-amber-100">
                  <div className="flex justify-between border-b border-amber-500/30 pb-0.5">
                    <span className="font-bold text-amber-300">🔥 NGỌC RỒNG TRÁI ĐẤT:</span>
                    <span className="text-white font-semibold">Cược từ 20 đến 200 PTS</span>
                  </div>
                  <div className="flex justify-between border-b border-amber-500/30 pb-0.5">
                    <span className="font-bold text-purple-300">💎 NGỌC RỒNG NAMEK:</span>
                    <span className="text-white font-semibold">Cược từ 500 đến 5.000 PTS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-yellow-300 animate-pulse">👑 NGỌC RỒNG SIÊU CẤP:</span>
                    <span className="text-yellow-400 font-bold">Mọi mức cược đều có cơ hội Nổ Hũ!</span>
                  </div>
                </div>
              </div>

              {/* 3. CÔNG BỐ ĐIỂM BASE TỪNG BIỂU TƯỢNG (KHÔNG CÔNG BỐ TỶ LỆ MULTIPLIER) */}
              <div className="space-y-1">
                <h4 className="text-amber-400 font-bold text-xs">
                  📊 ĐIỂM NĂNG LƯỢNG GỐC (BASE POINTS) CỦA BIỂU TƯỢNG:
                </h4>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-950/90 p-2 rounded-xl border border-slate-800 max-h-48 overflow-y-auto">
                  {DRAGON_SYMBOLS.map((sym) => (
                    <div key={sym.id} className="flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded border border-slate-800 text-[10px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <img src={sym.icon} alt={sym.name} className="w-4 h-4 object-contain shrink-0" />
                        <span className="font-medium text-slate-200 truncate">{sym.name}</span>
                      </div>
                      <span className="font-mono font-black text-amber-400 shrink-0">+{sym.basePoints} PTS</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="pt-1 text-center">
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 font-black text-xs py-2 rounded-xl cursor-pointer hover:brightness-110 active:scale-95 shadow-lg shadow-amber-500/30 transition"
              >
                ĐÃ RÕ MẬT SÁCH, VẬN KI LỌ NGAY! 🚀
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}