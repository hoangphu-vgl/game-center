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
  { id: "Yamcha", icon: "/assets/jackpot/yamcha.png", name: "Yamcha", type: "weak", basePoints: 1, multiplier: 0.5 },
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

const JACKPOT_SKILL_ITEMS = [
  { id: "jp_1", name: "Triệu Hồi Thần Long", icon: "🐉", desc: "Cộng ngay +10 Lượt Lọ Miễn Phí (Tự động auto quay đến hết lượt, cộng dồn nếu dính thêm Scatter).", isDynamic: true, addCount: 1, getPrice: (bet: number) => bet * 100 },
  { id: "jp_2", name: "Hào Quang Saiyan Blue", icon: "🌀", desc: "Kích hoạt hiệu ứng buff Aura x10 liên hoàn cho các lượt quay tiếp theo.", isDynamic: true, addCount: 1, getPrice: (bet: number) => bet * 50 },
  { id: "jp_3", name: "Phẫn Nộ SSJ3", icon: "⚡", desc: "Nhân đôi điểm thưởng khi nổ chuỗi liên hoàn.", price: 500000, addCount: 1 },
  { id: "jp_4", name: "Kamehameha Hủy Diệt", icon: "💥", desc: "Bùng nổ quét sạch rủi ro, bảo lưu chuỗi liên hoàn khi thua.", price: 100000, addCount: 5 },
  { id: "jp_5", name: "Khiên Giáp Thần Thánh", icon: "🛡️", desc: "Bảo vệ tự động hoàn trả 50% tiền cược khi thua lượt quay (+5 lượt).", price: 20000, isShield: true, addCount: 5 },
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
  
  const [showSkillModal, setShowSkillModal] = useState<boolean>(false);
  const [inventory, setInventory] = useState<{ [key: string]: number }>({});

  const [winningCoords, setWinningCoords] = useState<number[]>([]);
  const [autoCount, setAutoCount] = useState<number>(0);
  const [autoSpeed, setAutoSpeed] = useState<number>(1);
  
  const [freeSpinsLeft, setFreeSpinsLeft] = useState<number>(0);
  const freeSpinsRef = useRef<number>(0);

  const [blueAuraSpinsLeft, setBlueAuraSpinsLeft] = useState<number>(0);
  const blueAuraRef = useRef<number>(0);

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
    const savedBet = localStorage.getItem("jackpot_current_bet");
    if (savedBet) {
      setCurrentBet(Number(savedBet));
      currentBetRef.current = Number(savedBet);
    }
  }, []);

  const handleSelectBet = (amt: number) => {
    if (freeSpinsLeft > 0 || blueAuraSpinsLeft > 0) return;
    setCurrentBet(amt);
    currentBetRef.current = amt;
    localStorage.setItem("jackpot_current_bet", amt.toString());
  };

  useEffect(() => {
    jackpotsRef.current = jackpots;
  }, [jackpots]);

  useEffect(() => {
    freeSpinsRef.current = freeSpinsLeft;
  }, [freeSpinsLeft]);

  useEffect(() => {
    blueAuraRef.current = blueAuraSpinsLeft;
  }, [blueAuraSpinsLeft]);

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
          .select("balance, inventory")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setPoints(profile.balance ?? 0);
          pointsRef.current = profile.balance ?? 0;

          if (profile.inventory) {
            setInventory(profile.inventory);
          }
        }
      }
    }
    fetchUserData();
  }, []);

  const useSkillFromSupabase = async (skillId: string) => {
    if (!user) return false;
    const currentCount = inventory[skillId] || 0;
    if (currentCount > 0) {
      const updatedInv = { ...inventory, [skillId]: currentCount - 1 };
      setInventory(updatedInv);

      await supabase
        .from("profiles")
        .update({ inventory: updatedInv })
        .eq("id", user.id);

      return true;
    }
    return false;
  };

  const handleBuySkillDirectly = async (skill: any) => {
    if (!user) { alert("Vui lòng đăng nhập để mua kỹ năng!"); return; }
    const price = skill.isDynamic && skill.getPrice ? skill.getPrice(currentBet) : (skill.price || 0);

    if (pointsRef.current < price) {
      alert("⚡ Điểm Ki (PTS) không đủ để mua kỹ năng này!");
      return;
    }

    if (confirm(`Xác nhận dùng ${price.toLocaleString()} Ki để mua thêm +${skill.addCount} lượt [${skill.name}]?`)) {
      const newBal = pointsRef.current - price;
      await updatePointsInDB(newBal);

      const currentCount = inventory[skill.id] || 0;
      const updatedInv = { ...inventory, [skill.id]: currentCount + skill.addCount };
      setInventory(updatedInv);

      await supabase
        .from("profiles")
        .update({ balance: newBal, inventory: updatedInv })
        .eq("id", user.id);

      alert(`🎉 Mua thành công +${skill.addCount} lượt [${skill.name}]!`);
    }
  };

  const handleActivateSkill = async (skillId: string, skillName: string) => {
    const success = await useSkillFromSupabase(skillId);
    if (success) {
      setShowSkillModal(false);

      let notificationText = `✨ Đã thi triển kỹ năng [${skillName}] thành công!`;

      if (skillId === "jp_1") {
        setFreeSpinsLeft(prev => prev + 10);
        notificationText = `🌟 [${skillName}] kích hoạt! +10 Lượt Lọ Miễn Phí (Free Spin) sẵn sàng!`;
        if (!spinning) {
          executeSpin(0);
        }
      } else if (skillId === "jp_2") {
        setBlueAuraSpinsLeft(prev => prev + 10);
        notificationText = `🌀 [${skillName}] kích hoạt! Buff x10 Aura liên hoàn cho 10 lượt tới!`;
        if (!spinning) {
          executeSpin(0);
        }
      } else if (skillId === "jp_3") {
        notificationText = `⚡ [${skillName}] kích hoạt! Bùng nổ nhân đôi điểm thưởng chuỗi liên hoàn!`;
      } else if (skillId === "jp_4") {
        notificationText = `💥 [${skillName}] kích hoạt! Sẵn sàng bảo lưu chuỗi liên hoàn khi thua!`;
      } else if (skillId === "jp_5") {
        notificationText = `🛡️ [${skillName}] kích hoạt! Khiên bảo vệ hoàn trả 50% tiền cược đã sẵn sàng!`;
      }

      setMessageBox({ text: notificationText, type: "win" });
      addHistory(notificationText, true);
    } else {
      alert(`⚠️ Bạn đã hết lượt kỹ năng [${skillName}]! Hãy bấm nút "Mua" bên dưới.`);
    }
  };

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

    if (isFreeSpinActive) {
      setFreeSpinsLeft(prev => prev - 1);
    } else {
      if (currentPts < bet) {
        alert("Ní không đủ điểm Ki để tiếp tục lọ!");
        stopAuto();
        setSpinning(false);
        return;
      }

      let addMinor = 0;
      let addMajor = 0;
      let addGrand = Math.floor(bet * 0.20);

      if (bet <= 200) {
        addMinor = Math.floor(bet * 0.70);
      } else {
        addMajor = Math.floor(bet * 0.40);
      }

      const updatedJackpots = {
        minor: jackpotsRef.current.minor + addMinor,
        major: jackpotsRef.current.major + addMajor,
        grand: jackpotsRef.current.grand + addGrand,
      };
      await updateGlobalJackpotInDB(updatedJackpots);

      const newPointsAfterBet = currentPts - bet;
      await updatePointsInDB(newPointsAfterBet);
    }

    if (blueAuraRef.current > 0) {
      setBlueAuraSpinsLeft(prev => prev - 1);
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
    const isBlueAuraActive = blueAuraRef.current > 0;

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
      const freeSpinMsg = `🌟 CỘNG DỒN THÀNH CÔNG! Thêm +10 VÒNG LỌ MIỄN PHÍ sảnh ${bet} PTS! 🚀`;
      
      setMessageBox({ text: freeSpinMsg, type: "win" });
      triggerBroadcast(`📢 HUYỀN THOẠI RỒNG THẦN: Chiến binh [${playerName}] vừa sưu tập đủ 6 cột RỒNG THẦN, nhận thêm 10 Free Lọ cực khủng! 🌟🔥`);
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
      await updateGlobalJackpotInDB({ 
        minor: jackpotsRef.current.minor, 
        major: jackpotsRef.current.major, 
        grand: 100000 
      });
    } else if (majorHit) {
      hitJackpotType = "major";
      baseWinAmount = jackpotsRef.current.major;
      matchedIndices = [0, 1, 2, 3, 4];
      resultText = `💎 NỔ HŨ NGỌC RỒNG NAMEK! Nhận ngay +${baseWinAmount.toLocaleString()} PTS`;
      isStreakWin = true;
      setLastWonAura(null);
      triggerJackpotSideGlow();
      triggerBroadcast(`📢 TIN VUI SẢNH CAO: Chiến binh [${playerName}] vừa nổ tung NGỌC RỒNG NAMEK nhận +${baseWinAmount.toLocaleString()} PTS! 💎⚡`);
      // ĐÃ SỬA: Ép cứng reset về 45000 chuẩn xác ngay lần đầu tiên
      await updateGlobalJackpotInDB({ 
        minor: jackpotsRef.current.minor, 
        major: 45000, 
        grand: jackpotsRef.current.grand 
      });
    } else if (minorHit) {
      hitJackpotType = "minor";
      baseWinAmount = jackpotsRef.current.minor;
      matchedIndices = [0, 1, 2, 3];
      resultText = `🔥 NỔ HŨ NGỌC RỒNG TRÁI ĐẤT! Nhận ngay +${baseWinAmount.toLocaleString()} PTS`;
      isStreakWin = true;
      setLastWonAura(null);
      triggerJackpotSideGlow();
      triggerBroadcast(`📢 CHÚ MỪNG: Chiến binh [${playerName}] vừa giật hũ NGỌC RỒNG TRÁI ĐẤT +${baseWinAmount.toLocaleString()} PTS! 🔥`);
      await updateGlobalJackpotInDB({ 
        minor: 15000, 
        major: jackpotsRef.current.major, 
        grand: jackpotsRef.current.grand 
      });
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
          let chosenAura = getRandomAura();
          if (isBlueAuraActive) {
            const bluePool = AURA_QUICK_REWARDS.filter(a => a.mult >= 10);
            chosenAura = bluePool[Math.floor(Math.random() * bluePool.length)] || chosenAura;
          }

          setLastWonAura(chosenAura);
          setWinningCoords([]);

          baseWinAmount = Math.floor(bet * chosenAura.mult * (isFreeSpinActive ? 1.5 : 1));
          
          resultText = `${isBlueAuraActive ? "🌀 [SAIYAN BLUE BUFF] " : ""}${chosenAura.quote} (${chosenAura.name} x${chosenAura.mult}) = +${baseWinAmount.toLocaleString()} PTS`;
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

      const hasShield = await useSkillFromSupabase("jp_5");

      if (hasShield) {
        resultText = `🛡️ KHIÊN THẦN THÁNH KÍCH HOẠT! Hoàn trả 50% tiền cược do thua lượt này!`;
        const refundAmt = Math.floor(bet * 0.50);
        const refundedPts = currentPts + refundAmt;
        await updatePointsInDB(refundedPts);
        setMessageBox({ text: resultText, type: "win" });
      } else {
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
    if (currentAutoSetting === 0 && freeSpinsRef.current === 0 && blueAuraRef.current === 0) return;

    const delayTime = autoSpeed === 2 ? 150 : 350;

    if (freeSpinsRef.current > 0 || blueAuraRef.current > 0) {
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
      className={`min-h-screen bg-slate-950 text-white font-sans select-none flex flex-col justify-between ${
        explosiveEffect ? "ring-4 ring-amber-400 bg-amber-950/30" : ""
      }`} 
      style={{ touchAction: 'manipulation' }}
    >
      
      {/* HEADER */}
      <header className="bg-slate-900/95 border-b border-amber-500/40 px-4 py-2.5 flex justify-between items-center z-30 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-black shadow transition active:scale-95">
            🏠 Cổng Game
          </Link>
          {freeSpinsLeft > 0 && (
            <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 px-2.5 py-1 rounded-xl text-xs font-black animate-pulse shadow">
              🌟 THẦN LONG: {freeSpinsLeft}
            </div>
          )}
          {blueAuraSpinsLeft > 0 && (
            <div className="bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 px-2.5 py-1 rounded-xl text-xs font-black animate-pulse shadow">
              🌀 SAIYAN BLUE: {blueAuraSpinsLeft}
            </div>
          )}
          <button
            onClick={() => setShowSkillModal(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white border border-emerald-400/60 px-3 py-1.5 rounded-xl text-xs font-black shadow transition active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span>⚔️ Kho Skill</span>
            <span className="bg-black/50 px-2 py-0.5 rounded text-[10px] text-amber-300">
              {Object.values(inventory).reduce((a, b) => a + b, 0)}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRulesModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-yellow-500/40 px-3 py-1.5 rounded-xl text-xs font-black shadow transition active:scale-95 cursor-pointer flex items-center gap-1"
          >
            📜 Luật
          </button>

          <button
            onClick={toggleFullScreen}
            className="bg-slate-800 text-amber-400 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
          >
            ⛶
          </button>

          <div className="flex items-center gap-1.5 bg-black/50 border border-amber-500/50 px-3 py-1.5 rounded-xl shadow">
            <span className="text-sm">🪙</span>
            <span className="font-extrabold text-amber-400 font-mono text-sm">{points.toLocaleString()}</span>
            <span className="text-xs text-amber-300/70 font-semibold">PTS</span>
          </div>
        </div>
      </header>

      {/* THÂN GAME */}
      <main className="flex-1 flex flex-col justify-between p-3 space-y-2 max-w-6xl mx-auto w-full">
        
        {broadcastMsg && (
          <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-red-600 border border-yellow-200 text-slate-950 font-black px-3 py-1 rounded-xl text-center text-xs shadow animate-bounce flex items-center justify-center gap-2 shrink-0">
            <span>⚡</span>
            <span className="truncate">{broadcastMsg}</span>
            <span>⚡</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 relative shrink-0">
          {jackpotSideGlow && (
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 via-red-500 to-amber-500 rounded-xl blur opacity-75 animate-pulse -z-10"></div>
          )}

          <div className="bg-gradient-to-b from-amber-600 to-amber-950 border border-amber-300/80 rounded-2xl p-2 text-center shadow">
            <div className="text-[10px] font-black text-amber-200 uppercase truncate">🔥 TRÁI ĐẤT</div>
            <div className="text-sm font-black text-white font-mono leading-tight">
              {mounted ? (jackpots?.minor || 0).toLocaleString() : "15,000"}
            </div>
          </div>

          <div className="bg-gradient-to-b from-red-600 via-orange-600 to-amber-600 border border-yellow-300 rounded-2xl p-2 text-center shadow-lg animate-pulse scale-105 z-10">
            <div className="text-[10px] font-black text-yellow-200 uppercase truncate">👑 SIÊU CẤP</div>
            <div className="text-base font-black text-yellow-300 font-mono leading-tight">
              {mounted ? (jackpots?.grand || 0).toLocaleString() : "100,000"}
            </div>
          </div>

          <div className="bg-gradient-to-b from-purple-700 via-indigo-700 to-slate-900 border border-purple-300/80 rounded-2xl p-2 text-center shadow">
            <div className="text-[10px] font-black text-purple-200 uppercase truncate">💎 NAMEK</div>
            <div className="text-sm font-black text-purple-300 font-mono leading-tight">
              {mounted ? (jackpots?.major || 0).toLocaleString() : "45,000"}
            </div>
          </div>
        </div>

        <div className="bg-slate-950/90 border border-amber-500/40 p-2 rounded-2xl grid grid-cols-5 gap-1.5 shadow-inner shrink-0">
          {AURA_QUICK_REWARDS.map((aura) => {
            const isSelected = lastWonAura?.id === aura.id;
            return (
              <div 
                key={aura.id} 
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border transition-all ${
                  isSelected 
                    ? "bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 border-yellow-200 scale-105 shadow z-10 animate-bounce" 
                    : "bg-slate-900/90 border-slate-800 text-slate-300"
                }`}
              >
                <img src={aura.icon} alt={aura.name} className="w-6 h-6 object-contain drop-shadow" />
                <span className={`text-[10px] font-black truncate w-full text-center mt-0.5 ${isSelected ? "text-slate-950" : "text-amber-300"}`}>
                  x{aura.mult}
                </span>
              </div>
            );
          })}
        </div>

        <div className="bg-slate-950/90 border border-amber-500/40 rounded-2xl p-2 space-y-1 shadow-inner shrink-0">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">
              ⚡ CHUỖI LIÊN HOÀN:
            </span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 pt-0.5">
            {STREAK_STEPS.map((step, idx) => {
              const isActive = streakIndex >= idx;
              return (
                <div
                  key={step}
                  className={`flex items-center justify-center py-1 rounded-lg border text-[10px] font-black transition-all ${
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

        <div className="flex justify-between items-center bg-slate-950/90 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold gap-2 shrink-0">
          <div className="flex items-center gap-2 truncate">
            {lastWonAura && (
              <img src={lastWonAura.icon} alt={lastWonAura.name} className="w-5 h-5 object-contain animate-bounce shrink-0" />
            )}
            <span className={`truncate ${messageBox.type === "break" ? "text-rose-400 font-black" : messageBox.type === "lose" ? "text-rose-400" : "text-amber-300"}`}>
              💬 {messageBox.text}
            </span>
          </div>
          {autoCount > 0 && (
            <button
              onClick={stopAuto}
              className="bg-rose-600 text-white font-black px-2.5 py-1 rounded-lg text-xs cursor-pointer shrink-0"
            >
              ⏹ Dừng
            </button>
          )}
        </div>

        <div className="bg-slate-950 p-2 rounded-2xl border border-amber-500/30 shadow-inner flex flex-col justify-center overflow-hidden min-h-[280px]">
          <div className="grid grid-cols-6 grid-rows-5 gap-1.5 h-full w-full">
            {grid.map((sym, idx) => {
              const isWinning = winningCoords.includes(idx);
              const hasResult = winningCoords.length > 0;
              const isScatter = sym.id === "scatter";

              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center justify-center rounded-xl p-1 transition-all duration-300 ${
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
                  <div className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center">
                    <img 
                      src={sym.icon} 
                      alt={sym.name} 
                      className="w-full h-full object-contain drop-shadow"
                    />
                  </div>
                  <span className={`text-[9px] sm:text-[11px] font-bold truncate w-full text-center mt-1 ${isWinning || isScatter ? "text-slate-950 font-black" : "text-amber-300/80"}`}>
                    {sym.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 max-h-[80px] overflow-y-auto text-xs shrink-0 scrollbar-thin">
          <div className="font-bold text-slate-400 text-[11px] mb-1 flex justify-between items-center border-b border-slate-800 pb-1">
            <span>📜 Lịch sử chiến đấu:</span>
            <span className="text-[10px] text-slate-500">(Cuộn để xem thêm)</span>
          </div>
          {history.length === 0 ? (
            <div className="text-slate-600 italic text-xs">Chưa có lượt quay nào trong phiên này.</div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="flex justify-between py-1 border-b border-slate-900/60 leading-tight">
                <span className={`truncate max-w-[85%] ${item.isWin ? "text-amber-400 font-bold" : "text-rose-400"}`}>
                  {item.text}
                </span>
                <span className="text-slate-500 font-mono text-[10px] shrink-0">{item.time}</span>
              </div>
            ))
          )}
        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900/95 border-t border-amber-500/40 p-3 px-4 z-30 backdrop-blur-md shrink-0">
        <div className="max-w-xl mx-auto flex flex-col gap-2">
          
          <div className="flex items-center justify-between gap-2 overflow-x-auto text-xs">
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-amber-300">CƯỢC:</span>
              <div className={`flex gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-none transition-opacity ${ (freeSpinsLeft > 0 || blueAuraSpinsLeft > 0) ? "opacity-40 pointer-events-none" : "" }`}>
                {BET_OPTIONS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleSelectBet(amt)}
                    disabled={spinning || freeSpinsLeft > 0 || blueAuraSpinsLeft > 0}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black border transition cursor-pointer shrink-0 ${
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

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setAutoSpeed(autoSpeed === 1 ? 2 : 1)}
                className="bg-slate-800 border border-amber-500/50 text-amber-300 px-3 py-1 rounded-lg text-xs font-black cursor-pointer shadow"
              >
                ⚡ {autoSpeed === 1 ? "x1" : "🚀 x2"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-orange-400 shrink-0">AUTO:</span>
            <div className="flex items-center gap-1.5 w-full overflow-x-auto">
              {AUTO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSpinClick(opt.value)}
                  disabled={spinning && autoCount === 0}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-black border transition cursor-pointer text-center whitespace-nowrap ${
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

          <button
            onClick={() => handleSpinClick(0)}
            disabled={spinning}
            className={`w-full py-3 rounded-2xl font-black text-sm sm:text-base tracking-wider transition shadow-lg active:scale-95 cursor-pointer uppercase ${
              spinning
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : freeSpinsLeft > 0 || blueAuraSpinsLeft > 0
                ? "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-slate-950 animate-pulse"
                : "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 hover:brightness-110 text-slate-950 shadow-amber-500/20"
            }`}
          >
            {spinning ? (autoCount > 0 ? `ĐANG AUTO LỌ (${autoCount})...` : "ĐANG LỌ...") : freeSpinsLeft > 0 ? `🌟 THẦN LONG CÒN (${freeSpinsLeft})` : blueAuraSpinsLeft > 0 ? `🌀 SAIYAN BLUE CÒN (${blueAuraSpinsLeft})` : "🔥 LỌ NGAY"}
          </button>
        </div>
      </footer>

      {/* POPUP KHO KỸ NĂNG */}
      {showSkillModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-emerald-500/70 rounded-3xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto text-left shadow-2xl relative space-y-4">
            
            <div className="flex justify-between items-center border-b border-emerald-500/40 pb-3">
              <h3 className="text-base sm:text-lg font-black text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                ⚔️ KHO KỸ NĂNG THẦN ĐIỆN VŨ TRỤ
              </h3>
              <button 
                onClick={() => setShowSkillModal(false)}
                className="bg-rose-600 hover:bg-rose-500 text-white w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center cursor-pointer shadow"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 italic">
              Bấm <b className="text-emerald-400">"Dùng"</b> để kích hoạt trực tiếp, hoặc chọn mức cược và bấm <b className="text-amber-400">"Mua"</b> ngay tại bàn chơi:
            </p>

            <div className="space-y-3">
              {JACKPOT_SKILL_ITEMS.map((skill) => {
                const count = inventory[skill.id] || 0;
                const price = skill.isDynamic && skill.getPrice ? skill.getPrice(currentBet) : (skill.price || 0);

                return (
                  <div key={skill.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-3xl shrink-0">{skill.icon}</span>
                      <div className="min-w-0 space-y-1">
                        <div className="text-sm font-bold text-amber-300 flex items-center gap-2 truncate">
                          <span className="truncate">{skill.name}</span>
                          <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 rounded-full text-[10px] font-black shrink-0">
                            {count} Lượt
                          </span>
                        </div>
                        <div className="text-xs text-slate-300">{skill.desc}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-900">
                      {count > 0 ? (
                        <button
                          onClick={() => handleActivateSkill(skill.id, skill.name)}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110 active:scale-95 px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition shadow cursor-pointer w-full sm:w-auto"
                        >
                          Dùng ⚡
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          {skill.isDynamic && (
                            <select 
                              value={currentBet} 
                              onChange={(e) => handleSelectBet(Number(e.target.value))} 
                              className="bg-slate-900 text-amber-400 font-bold text-xs px-2 py-2 rounded-xl border border-amber-500/50 focus:outline-none cursor-pointer"
                            >
                              {BET_OPTIONS.map((amt) => (
                                <option key={amt} value={amt}>Cược {amt}</option>
                              ))}
                            </select>
                          )}
                          <button
                            onClick={() => handleBuySkillDirectly(skill)}
                            className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 hover:brightness-110 active:scale-95 px-4 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition shadow cursor-pointer whitespace-nowrap"
                          >
                            Mua ({price.toLocaleString()} Ki) 🛒
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 text-center border-t border-slate-800">
              <Link 
                href="/shopskill" 
                className="text-xs text-amber-400 hover:text-amber-300 font-bold underline transition inline-block py-1"
              >
                🔮 Ghé thăm Thần Điện Kỹ Năng chính để xem đầy đủ ➔
              </Link>
            </div>

          </div>
        </div>
      )}

      {/* POPUP LUẬT CHƠI & KỸ NĂNG */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-500/70 rounded-3xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto text-left shadow-2xl relative space-y-4">
            
            <div className="flex justify-between items-center border-b border-amber-500/40 pb-3">
              <h3 className="text-base sm:text-lg font-black text-yellow-300 uppercase tracking-wide flex items-center gap-2">
                📜 MẬT SÁCH LUẬT CHƠI & KỸ NĂNG JACKPOT
              </h3>
              <button 
                onClick={() => setShowRulesModal(false)}
                className="bg-rose-600 hover:bg-rose-500 text-white w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center cursor-pointer shadow"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
                <h4 className="text-amber-400 font-bold flex items-center gap-1.5">
                  🐉 Luật Chung & Biểu Tượng Scatter
                </h4>
                <p className="text-slate-400 leading-relaxed text-xs">
                  • Các biểu tượng nối nhau liên tiếp từ **cột 1 sang phải (ít nhất 3 cột)** sẽ bùng nổ điểm Ki.<br/>
                  • Thu thập đủ **6 biểu tượng Rồng Thần** trên 6 cột sẽ nhận ngay **10 Lượt Lọ Miễn Phí**!
                </p>
              </div>

              <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-500/40 space-y-2">
                <h4 className="text-emerald-400 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                  ⚔️ MẬT KINH KỸ NĂNG VŨ TRỤ (SKILL RULES)
                </h4>
                <div className="space-y-1.5 text-xs text-slate-200">
                  <div>• <b className="text-amber-300">🌟 Triệu Hồi Thần Long (jp_1):</b> Kích hoạt ngay 10 lượt quay miễn phí (Free Spin). Có thể cộng dồn thêm lượt nếu tiếp tục dính biểu tượng Rồng Thần trong lúc quay.</div>
                  <div>• <b className="text-cyan-300">🌀 Hào Quang Saiyan Blue (jp_2):</b> Buff độc quyền cho 10 lượt tiếp theo, ép hệ thống tăng tỷ lệ ra phần thưởng Aura lớn (x10 trở lên).</div>
                  <div>• <b className="text-orange-400">🔥 Phẫn Nộ Super Saiyan 3 (jp_3):</b> Khởi tạo hoặc duy trì chuỗi liên hoàn x2 bậc ngay lập tức khi quay hũ thua.</div>
                  <div>• <b className="text-rose-400">💥 Kamehameha Hủy Diệt (jp_4):</b> Xóa sạch rủi ro, bảo lưu chuỗi liên hoàn và ép ra biểu tượng cấp cao.</div>
                  <div>• <b className="text-blue-400">🛡️ Khiên Giáp Thần Thánh (jp_5):</b> Tự động bảo vệ và hoàn trả 50% tiền cược nếu lượt quay đó không trúng thưởng.</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-950/80 via-amber-950/90 to-red-950/80 p-4 rounded-2xl border-2 border-amber-400/80 space-y-2 shadow-lg">
                <h4 className="text-yellow-300 font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
                  👑 QUY TẮC GIẬT HŨ BÁ CHỦ VŨ TRỤ (NỔ HŨ)
                </h4>
                <div className="space-y-1.5 text-xs text-amber-100">
                  <div className="flex justify-between border-b border-amber-500/30 pb-1">
                    <span className="font-bold text-amber-300">🔥 NGỌC RỒNG TRÁI ĐẤT:</span>
                    <span className="text-white font-semibold">Cược từ 20 đến 200 PTS</span>
                  </div>
                  <div className="flex justify-between border-b border-amber-500/30 pb-1">
                    <span className="font-bold text-purple-300">💎 NGỌC RỒNG NAMEK:</span>
                    <span className="text-white font-semibold">Cược từ 500 đến 5.000 PTS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-yellow-300 animate-pulse">👑 NGỌC RỒNG SIÊU CẤP:</span>
                    <span className="text-yellow-400 font-bold">Mọi mức cược đều có cơ hội Nổ Hũ!</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 font-black text-xs sm:text-sm py-3 rounded-2xl cursor-pointer hover:brightness-110 active:scale-95 shadow-lg shadow-amber-500/30 transition"
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