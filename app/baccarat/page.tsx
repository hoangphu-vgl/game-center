"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Card {
  suit: string;
  rank: string;
  value: number;
  color: string;
  symbol: string;
}

const CHIP_LIST = [
  { amount: 100, icon: "/assets/baccarat/dragon-ball-1.png", label: "100" },
  { amount: 500, icon: "/assets/baccarat/dragon-ball-2.png", label: "500" },
  { amount: 1000, icon: "/assets/baccarat/dragon-ball-3.png", label: "1K" },
  { amount: 5000, icon: "/assets/baccarat/dragon-ball-4.png", label: "5K" },
  { amount: 10000, icon: "/assets/baccarat/dragon-ball-5.png", label: "10K" },
  { amount: 250000, icon: "/assets/baccarat/dragon-ball-6.png", label: "250K" },
  { amount: 500000, icon: "/assets/baccarat/dragon-ball-7.png", label: "500K" },
  { amount: 1000000, icon: "/assets/baccarat/kiblue.png", label: "1M" },
];

const BACCARAT_SKILL_ITEMS = [
  { id: "bc_1", name: "🌀 Nhãn Quan Whis", desc: "Xem trước 1 lá bài tiếp theo chuẩn bị được chia từ Nọc (Dùng trước trận).", price: 150000, icon: "🌀", addCount: 1 },
  { id: "bc_2", name: "🛡️ Hộ Thân Ki", desc: "Tự động giảm 50% số Ki bị trừ khi thua cược (+5 lượt/mua).", price: 50000, icon: "🛡️", addCount: 5 },
  { id: "bc_3", name: "⚡ Bản Năng Vô Cực", desc: "Ép lá bài rút thêm thứ 3 của Player thành lá tối ưu nhất 7, 8, 9 (Dùng trước trận).", price: 100000, icon: "⚡", addCount: 1 },
  { id: "bc_4", name: "👑 Quyền Năng Hủy Diệt", desc: "Nhân đôi (x2) lợi nhuận nếu ván cược đó bạn giành chiến thắng (Dùng trước trận).", price: 100000, icon: "👑", addCount: 1 },
  { id: "bc_5", name: "🐉 Long Thần Hộ Mệnh", desc: "Tự động hoàn trả 30% tổng Ki đặt cược nếu bị thua (+5 lượt/mua).", price: 50000, icon: "🐉", addCount: 5 },
];

const DBZ_AURAS = {
  warriorWin: [
    "🔥 GOKU BẢN NĂNG VÔ CỰC: 'Hahaha! Quyết định rút bài quá chuẩn xác, chiến thắng thuộc về ngươi!'",
    "⚡ GOHAN SSJ2: 'Làn sóng năng lượng bùng nổ! Chiến Binh đã lật ngược thế cờ ngoạn mục!'",
    "✨ WHIS: 'Thật tuyệt vời, một cú dằn bài bản lĩnh mang đẳng cấp thần linh!'"
  ],
  champaWin: [
    " ধ্বংস THẦN HỦY DIỆT CHAMPA: 'Hahaha! Non trẻ lắm! Chọn sai thời điểm rút bài thì phải nhận lấy diệt vong!'",
    "⚡ VADOS: 'Champa-sama đã thấu suốt nước đi của ngươi, phán quyết hủy diệt đã điểm!'",
    "👑 VEGETA: 'Tính toán sai một ly đi một dặm! Lần sau hãy tập trung hơn!'"
  ],
  tie: [
    "🌀 RỒNG THẦN SHENRON: 'Sự cân bằng tuyệt đối giữa các chiều không gian... Ván này Hòa khí sinh tài!'"
  ]
};

export default function BaccaratPage() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>("Chiến Binh");
  const [userAvatar, setUserAvatar] = useState<string>("/assets/avatar/xtra30.ico");
  
  // Đã sửa 543545 thành 0
  const [balance, setBalance] = useState<number>(0); 
  const [inventory, setInventory] = useState<{ [key: string]: number }>({});
  const [currentChip, setCurrentChip] = useState<number>(100);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [showSkillModal, setShowSkillModal] = useState<boolean>(false);
  
  // Trạng thái kiểm soát: Mỗi ván chỉ được dùng tối đa 1 skill
  const [usedSkillThisMatch, setUsedSkillThisMatch] = useState<boolean>(false);
  
  const [bets, setBets] = useState({
    warrior: { amount: 0, chipIcon: "" },
    champa: { amount: 0, chipIcon: "" },
    tie: { amount: 0, chipIcon: "" },
    warriorPair: { amount: 0, chipIcon: "" },
    champaPair: { amount: 0, chipIcon: "" },
    dragonSummon: { amount: 0, chipIcon: "" },
    samCo: { amount: 0, chipIcon: "" },
    tai: { amount: 0, chipIcon: "" },
    xiu: { amount: 0, chipIcon: "" },
    finishingMove: { amount: 0, chipIcon: "" },
  });
  
  const [gameState, setGameState] = useState<"betting" | "dealing" | "player_turn" | "result">("betting");
  const [statusMessage, setStatusMessage] = useState<string>("Thần Hủy Diệt Champa đang chờ lệnh cược! Hãy triệu hồi Ngọc Rồng chiến đấu.");

  const [warriorHand, setWarriorHand] = useState<Card[]>([]);
  const [champaHand, setChampaHand] = useState<Card[]>([]);
  const [warriorScore, setWarriorScore] = useState<number>(0);
  const [champaScore, setChampaScore] = useState<number>(0);

  const [resultData, setResultData] = useState<{
    title: string;
    desc: string;
    netProfit: number;
    winner: string;
    quote: string;
    jackpotMsg?: string;
  } | null>(null);

  const [jackpots, setJackpots] = useState({ minor: 10000, major: 50000, grand: 200000 });
  const jackpotsRef = useRef(jackpots);
  const deckRef = useRef<Card[]>([]);
  
  // Đã sửa 543545 thành 0
  const balanceRef = useRef<number>(0); 
  const inventoryRef = useRef<{ [key: string]: number }>({});
  const currentChipRef = useRef<number>(100);
  const handsRef = useRef<{ wHand: Card[]; cHand: Card[] }>({ wHand: [], cHand: [] });

  const buffBc3Active = useRef<boolean>(false);
  const buffBc4Active = useRef<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    currentChipRef.current = currentChip;
  }, [currentChip]);

  useEffect(() => {
    jackpotsRef.current = jackpots;
  }, [jackpots]);

  // Đồng bộ dữ liệu real-time từ Supabase
  useEffect(() => {
    async function initAndFetchUserData() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        if (currentUser) {
          // ĐÃ XÓA CỘT LỖI: username và avatar
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("balance, full_name, avatar_url, inventory")
            .eq("id", currentUser.id)
            .single();
          
          if (error) {
            console.error("Lỗi fetch profile:", error);
          }

          if (profile) {
            const realBal = profile.balance ?? 0;
            setBalance(realBal);
            balanceRef.current = realBal;
            
            if (profile.inventory) {
              setInventory(profile.inventory);
              inventoryRef.current = profile.inventory;
            }
            // Dùng full_name hoặc email thay vì username
            const nameToUse = profile.full_name || currentUser.email?.split("@")[0] || "Chiến Binh";
            setUserName(nameToUse);
            setUserAvatar(profile.avatar_url || "/assets/avatar/xtra30.ico");
          }
        }

        const { data: jackpotData } = await supabase
          .from("baccarat_jackpot")
          .select("minor, major, grand")
          .eq("id", "global")
          .single();

        if (jackpotData) {
          setJackpots({
            minor: jackpotData.minor ?? 10000,
            major: jackpotData.major ?? 50000,
            grand: jackpotData.grand ?? 200000,
          });
        }
      } catch (e) {
        console.error("Lỗi tải thông tin:", e);
      }
    }

    initAndFetchUserData();
    createDeck();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        initAndFetchUserData();
      }
    };

    window.addEventListener("focus", initAndFetchUserData);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const channel = supabase
      .channel("baccarat_jackpot_sync_v9")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "baccarat_jackpot", filter: "id=eq.global" },
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
      window.removeEventListener("focus", initAndFetchUserData);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, []);

  const updateSupabaseData = async (newBal: number, newInv: any) => {
    setBalance(newBal);
    balanceRef.current = newBal;
    setInventory(newInv);
    inventoryRef.current = newInv;
    try {
      if (user) {
        await supabase.from("profiles").update({ balance: newBal, inventory: newInv }).eq("id", user.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateBaccaratJackpotInDB = async (newPool: { minor: number; major: number; grand: number }) => {
    setJackpots(newPool);
    try {
      await supabase.from("baccarat_jackpot").update(newPool).eq("id", "global");
    } catch (e) {
      console.error(e);
    }
  };

  const contributeToJackpotOnly = async (totalBet: number) => {
    const currentPool = jackpotsRef.current;
    let addMinor = 0;
    let addMajor = 0;
    let addGrand = Math.floor(totalBet * 0.25);

    const chipTier = currentChipRef.current;
    if (chipTier <= 5000) {
      addMinor = Math.floor(totalBet * 0.60);
    } else {
      addMajor = Math.floor(totalBet * 0.60);
    }

    await updateBaccaratJackpotInDB({
      minor: currentPool.minor + addMinor,
      major: currentPool.major + addMajor,
      grand: currentPool.grand + addGrand,
    });
  };

  const checkJackpotWinOnWin = async () => {
    const currentPool = jackpotsRef.current;
    const chipTier = currentChipRef.current;

    const grandHit = Math.random() < 0.008; 
    let majorHit = false;
    let minorHit = false;

    if (chipTier <= 5000) {
      minorHit = !grandHit && Math.random() < 0.02; 
    } else {
      majorHit = !grandHit && Math.random() < 0.02; 
    }

    let jackpotWonAmount = 0;
    let jackpotName = "";
    let updatedMinor = currentPool.minor;
    let updatedMajor = currentPool.major;
    let updatedGrand = currentPool.grand;

    if (grandHit) {
      jackpotWonAmount = currentPool.grand;
      jackpotName = "👑 SIÊU CẤP HŨ (GRAND)";
      updatedGrand = 200000;
    } else if (majorHit) {
      jackpotWonAmount = currentPool.major;
      jackpotName = "💎 HŨ NAMEK (MAJOR)";
      updatedMajor = 50000;
    } else if (minorHit) {
      jackpotWonAmount = currentPool.minor;
      jackpotName = "🔥 HŨ TRÁI ĐẤT (MINOR)";
      updatedMinor = 10000;
    }

    if (jackpotWonAmount > 0) {
      await updateBaccaratJackpotInDB({ minor: updatedMinor, major: updatedMajor, grand: updatedGrand });
    }

    return { jackpotWonAmount, jackpotName };
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.log(err));
    } else {
      document.exitFullscreen?.();
    }
  };

  const getCardValue = (rank: string) => {
    if (rank === "A") return 1;
    if (["10", "J", "Q", "K"].includes(rank)) return 0;
    return parseInt(rank);
  };

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case "hearts": return "♥";
      case "diamonds": return "♦";
      case "clubs": return "♣";
      case "spades": return "♠";
      default: return "";
    }
  };

  const createDeck = () => {
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    let newDeck: Card[] = [];
    for (let i = 0; i < 8; i++) {
      for (let suit of suits) {
        for (let rank of ranks) {
          newDeck.push({
            suit,
            rank,
            value: getCardValue(rank),
            color: suit === "hearts" || suit === "diamonds" ? "red" : "black",
            symbol: getSuitSymbol(suit),
          });
        }
      }
    }
    for (let pass = 0; pass < 3; pass++) {
      for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
      }
    }
    deckRef.current = newDeck;
  };

  const calculateScore = (hand: Card[]) => {
    let sum = hand.reduce((acc, card) => acc + card.value, 0);
    return sum % 10;
  };

  const handleBuySkillDirectly = async (skill: any) => {
    if (!user) { alert("Vui lòng đăng nhập để mua kỹ năng!"); return; }
    if (balanceRef.current < skill.price) { alert("⚡ Điểm Ki không đủ để mua kỹ năng này!"); return; }

    if (confirm(`Xác nhận dùng ${skill.price.toLocaleString()} Ki để mua thêm +${skill.addCount} lượt [${skill.name}]?`)) {
      const newBal = balanceRef.current - skill.price;
      const currentCount = inventoryRef.current[skill.id] || 0;
      const newInv = { ...inventoryRef.current, [skill.id]: currentCount + skill.addCount };
      
      await updateSupabaseData(newBal, newInv);
      alert(`🎉 Mua thành công +${skill.addCount} lượt [${skill.name}]!`);
    }
  };

  // 🌟 XỬ LÝ KÍCH HOẠT KỸ NĂNG: Khóa tối đa 1 skill/ván, tự động đóng popup và hiển thị thông báo
  const handleActivateSkill = async (skillId: string, skillName: string) => {
    if (gameState !== "betting") {
      alert(`⚠️ Không thể kích hoạt [${skillName}] lúc này! Chỉ được sử dụng các tuyệt kỹ TRƯỚC KHI BẮT ĐẦU VÁN ĐẤU.`);
      return;
    }

    if (usedSkillThisMatch) {
      alert("⚠️ Mỗi ván chơi bạn chỉ được sử dụng tối đa 1 kỹ năng để giữ sự cân bằng!");
      return;
    }

    const currentCount = inventoryRef.current[skillId] || 0;
    if (currentCount > 0) {
      const newInv = { ...inventoryRef.current, [skillId]: currentCount - 1 };
      await updateSupabaseData(balanceRef.current, newInv);
      
      // Đánh dấu đã dùng skill trong ván này
      setUsedSkillThisMatch(true);
      setShowSkillModal(false); // Tự động đóng popup kho skill

      let notificationText = `⚡ Đã kích hoạt thành công kỹ năng [${skillName}]!`;

      if (skillId === 'bc_1') {
        const peekCard = deckRef.current[deckRef.current.length - 1];
        notificationText = `🌀 Nhãn Quan Whis thấu thị thành công! Lá tiếp theo: [ ${peekCard.rank} ${getSuitSymbol(peekCard.suit)} ]`;
      } else if (skillId === 'bc_2') {
        notificationText = `🛡️ Hộ Thân Ki đã sẵn sàng bảo vệ bạn (Giảm 50% thiệt hại khi thua ván này)!`;
      } else if (skillId === 'bc_3') {
        buffBc3Active.current = true;
        notificationText = `⚡ Bản Năng Vô Cực đã kích hoạt! Lá bài rút thêm sẽ đạt điểm tối ưu.`;
      } else if (skillId === 'bc_4') {
        buffBc4Active.current = true;
        notificationText = `👑 Quyền Năng Hủy Diệt đã sẵn sàng nhân đôi lợi nhuận ván này!`;
      } else if (skillId === 'bc_5') {
        notificationText = `🐉 Long Thần Hộ Mệnh đã kích hoạt bảo vệ (Hoàn trả 30% tiền cược nếu thua)!`;
      }

      setStatusMessage(notificationText);
    } else {
      alert(`⚠️ Bạn đã hết lượt kỹ năng [${skillName}]! Hãy bấm nút "Mua" bên dưới.`);
    }
  };

  const deductPassiveSkill = async (skillId: string) => {
    const count = inventoryRef.current[skillId] || 0;
    if (count > 0) {
      const newInv = { ...inventoryRef.current, [skillId]: count - 1 };
      await updateSupabaseData(balanceRef.current, newInv);
    }
  };

  const placeBet = (zone: keyof typeof bets) => {
    if (gameState !== "betting") return;
    if (balance < currentChip) {
      setStatusMessage("⚡ Ki không đủ để đặt cược!");
      return;
    }

    const newBalance = balance - currentChip;
    setBalance(newBalance);
    balanceRef.current = newBalance;

    const chipObj = CHIP_LIST.find(c => c.amount === currentChip);

    setBets((prev) => ({
      ...prev,
      [zone]: {
        amount: prev[zone].amount + currentChip,
        chipIcon: chipObj ? chipObj.icon : prev[zone].chipIcon || CHIP_LIST[0].icon,
      },
    }));
    setStatusMessage(`✨ Đã đặt ${currentChip.toLocaleString()} Ki vào cửa ${zone.toUpperCase()}!`);
  };

  const clearBets = () => {
    if (gameState !== "betting") return;
    let totalBet = Object.values(bets).reduce((a, b) => a + b.amount, 0);
    const refundedBalance = balance + totalBet;
    setBalance(refundedBalance);
    balanceRef.current = refundedBalance;
    setBets({
      warrior: { amount: 0, chipIcon: "" },
      champa: { amount: 0, chipIcon: "" },
      tie: { amount: 0, chipIcon: "" },
      warriorPair: { amount: 0, chipIcon: "" },
      champaPair: { amount: 0, chipIcon: "" },
      dragonSummon: { amount: 0, chipIcon: "" },
      samCo: { amount: 0, chipIcon: "" },
      tai: { amount: 0, chipIcon: "" },
      xiu: { amount: 0, chipIcon: "" },
      finishingMove: { amount: 0, chipIcon: "" },
    });
    setStatusMessage("🌀 Đã thu hồi toàn bộ năng lượng cược. Sẵn sàng trận mới!");
  };

  const getTotalBet = () => Object.values(bets).reduce((a, b) => a + b.amount, 0);
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const startGame = async () => {
    const totalBet = getTotalBet();
    if (totalBet === 0) return;

    await updateSupabaseData(balanceRef.current, inventoryRef.current);
    await contributeToJackpotOnly(totalBet);

    if (deckRef.current.length < 40) createDeck();

    setGameState("dealing");
    setWarriorHand([]);
    setChampaHand([]);
    setWarriorScore(0);
    setChampaScore(0);
    setResultData(null);

    setStatusMessage("🐉 Đang chia 2 lá bài đầu tiên cho cả hai bên...");

    let wHand: Card[] = [];
    let cHand: Card[] = [];

    await sleep(500);
    wHand.push(deckRef.current.pop()!);
    setWarriorHand([...wHand]);
    setWarriorScore(calculateScore(wHand));

    await sleep(500);
    cHand.push(deckRef.current.pop()!);
    setChampaHand([...cHand]);
    setChampaScore(calculateScore(cHand));

    await sleep(500);
    wHand.push(deckRef.current.pop()!);
    setWarriorHand([...wHand]);
    setWarriorScore(calculateScore(wHand));

    await sleep(500);
    cHand.push(deckRef.current.pop()!);
    setChampaHand([...cHand]);
    setChampaScore(calculateScore(cHand));

    handsRef.current = { wHand, cHand };

    let wScore = calculateScore(wHand);
    let cScore = calculateScore(cHand);

    if (wScore >= 8 || cScore >= 8) {
      await resolveGame(wHand, cHand, wScore, cScore, `Thắng Tự Nhiên Sức Mạnh Tuyệt Đối (${wScore} vs ${cScore})`);
      return;
    }

    setGameState("player_turn");
    setStatusMessage("⚡ Đến lượt bạn! Bạn muốn RÚT THÊM BÀI hay DẰN BÀI (Giữ nguyên)?");
  };

  const handlePlayerDraw = async () => {
    if (gameState !== "player_turn") return;
    
    let { wHand, cHand } = handsRef.current;
    setStatusMessage("⚡ Bạn đã chọn RÚT THÊM BÀI định mệnh!");
    await sleep(600);

    let newCard = deckRef.current.pop()!;

    if (buffBc3Active.current) {
      const currentScore = calculateScore(wHand);
      const neededValue = (9 - currentScore + 10) % 10;
      const optimalIdx = deckRef.current.findIndex(c => c.value === neededValue || c.value === neededValue - 1);
      if (optimalIdx !== -1) {
        newCard = deckRef.current.splice(optimalIdx, 1)[0];
      }
      buffBc3Active.current = false;
    }

    wHand.push(newCard);
    setWarriorHand([...wHand]);
    const newWScore = calculateScore(wHand);
    setWarriorScore(newWScore);

    await finishChampaTurnAndResolve(wHand, cHand, newCard.value);
  };

  const handlePlayerStand = async () => {
    if (gameState !== "player_turn") return;
    
    let { wHand, cHand } = handsRef.current;
    if (buffBc3Active.current) buffBc3Active.current = false;
    setStatusMessage("🛡️ Bạn đã chọn DẰN BÀI (Giữ nguyên điểm số). Đến lượt Champa...");
    await sleep(600);

    await finishChampaTurnAndResolve(wHand, cHand, null);
  };

  const finishChampaTurnAndResolve = async (wHand: Card[], cHand: Card[], playerThirdCardVal: number | null) => {
    let cScore = calculateScore(cHand);
    let champaDraws = false;

    if (playerThirdCardVal === null) {
      if (cScore <= 5) champaDraws = true;
    } else {
      if (cScore <= 2) champaDraws = true;
      else if (cScore === 3 && playerThirdCardVal !== 8) champaDraws = true;
      else if (cScore === 4 && [2, 3, 4, 5, 6, 7].includes(playerThirdCardVal)) champaDraws = true;
      else if (cScore === 5 && [4, 5, 6, 7].includes(playerThirdCardVal)) champaDraws = true;
      else if (cScore === 6 && [6, 7].includes(playerThirdCardVal)) champaDraws = true;
    }

    if (champaDraws) {
      setStatusMessage("⚡ Thần Hủy Diệt Champa quyết định RÚT THÊM lá bài thứ 3!");
      await sleep(700);
      cHand.push(deckRef.current.pop()!);
      setChampaHand([...cHand]);
      cScore = calculateScore(cHand);
      setChampaScore(cScore);
    } else {
      setStatusMessage("🛡️ Thần Hủy Diệt Champa quyết định DẰN BÀI!");
      await sleep(500);
    }

    const finalWScore = calculateScore(wHand);
    await resolveGame(wHand, cHand, finalWScore, cScore, "Hoàn tất quyết định thủ công");
  };

  const resolveGame = async (wHand: Card[], cHand: Card[], wScore: number, cScore: number, reason: string) => {
    await sleep(700);

    let totalWin = 0;
    let mainWinner = "";
    let quoteList = DBZ_AURAS.tie;
    let isWarriorWonMain = false;

    if (wScore > cScore) {
      mainWinner = `${userName} Thắng`;
      quoteList = DBZ_AURAS.warriorWin;
      isWarriorWonMain = true;
      if (bets.warrior.amount > 0) totalWin += bets.warrior.amount * 2;
    } else if (cScore > wScore) {
      mainWinner = "Thần Hủy Diệt Champa Thắng";
      quoteList = DBZ_AURAS.champaWin;
      if (bets.champa.amount > 0) totalWin += bets.champa.amount + bets.champa.amount * 0.95;
    } else {
      mainWinner = "Hòa Khí Cân Bằng";
      quoteList = DBZ_AURAS.tie;
      if (bets.tie.amount > 0) totalWin += bets.tie.amount * 9;
      if (bets.warrior.amount > 0) totalWin += bets.warrior.amount;
      if (bets.champa.amount > 0) totalWin += bets.champa.amount;
    }

    const wPair = wHand[0].rank === wHand[1].rank;
    const cPair = cHand[0].rank === cHand[1].rank;
    if (wPair && bets.warriorPair.amount > 0) totalWin += bets.warriorPair.amount * 12;
    if (cPair && bets.champaPair.amount > 0) totalWin += bets.champaPair.amount * 12;

    const wFlush = wHand.length === 3 && wHand[0].suit === wHand[1].suit && wHand[1].suit === wHand[2].suit;
    const cFlush = cHand.length === 3 && cHand[0].suit === cHand[1].suit && cHand[1].suit === cHand[2].suit;
    if ((wFlush || cFlush) && bets.dragonSummon.amount > 0) totalWin += bets.dragonSummon.amount * 26;

    const wSamCo = wHand.length === 3 && wHand[0].rank === wHand[1].rank && wHand[1].rank === wHand[2].rank;
    const cSamCo = cHand.length === 3 && cHand[0].rank === cHand[1].rank && cHand[1].rank === cHand[2].rank;
    if ((wSamCo || cSamCo) && bets.samCo.amount > 0) totalWin += bets.samCo.amount * 46;

    const totalPointsSum = wScore + cScore;
    if (totalPointsSum >= 10 && bets.tai.amount > 0) totalWin += bets.tai.amount * 1.95;
    if (totalPointsSum <= 9 && bets.xiu.amount > 0) totalWin += bets.xiu.amount * 1.95;

    const diffScore = Math.abs(wScore - cScore);
    if (diffScore >= 5 && bets.finishingMove.amount > 0 && wScore !== cScore) {
      totalWin += bets.finishingMove.amount * 6;
    }

    const totalBetAmount = getTotalBet();

    if (totalWin > totalBetAmount && buffBc4Active.current) {
      const profit = totalWin - totalBetAmount;
      totalWin += profit;
      reason += " (Đã x2 Lợi Nhuận Quyền Năng)";
      buffBc4Active.current = false;
    } else if (buffBc4Active.current) {
      buffBc4Active.current = false;
    }

    let netProfit = totalWin - totalBetAmount;

    if (netProfit < 0) {
      if (inventoryRef.current['bc_2'] > 0) {
        const refund = Math.abs(netProfit) * 0.5;
        totalWin += refund;
        netProfit += refund;
        reason += "\n🛡️ Hộ Thân Ki (Hoàn 50%)";
        await deductPassiveSkill('bc_2');
      } else if (inventoryRef.current['bc_5'] > 0) {
        const refund = Math.abs(netProfit) * 0.3;
        totalWin += refund;
        netProfit += refund;
        reason += "\n🐉 Long Thần Hộ Mệnh (Hoàn 30%)";
        await deductPassiveSkill('bc_5');
      }
    }

    let jackpotWonAmount = 0;
    let jackpotName = "";
    if (isWarriorWonMain || totalWin > totalBetAmount) {
      const jpResult = await checkJackpotWinOnWin();
      jackpotWonAmount = jpResult.jackpotWonAmount;
      jackpotName = jpResult.jackpotName;
    }

    if (jackpotWonAmount > 0) {
      totalWin += jackpotWonAmount;
      netProfit += jackpotWonAmount;
    }

    const finalBalance = balanceRef.current + totalWin;
    await updateSupabaseData(finalBalance, inventoryRef.current);

    const selectedQuote = quoteList[Math.floor(Math.random() * quoteList.length)];
    let jpMsg = jackpotWonAmount > 0 ? `👑 NỔ HŨ THÀNH CÔNG! Trúng ${jackpotName} nhận ngay +${jackpotWonAmount.toLocaleString()} Ki! 🔥` : "";

    setStatusMessage(jpMsg ? jpMsg : selectedQuote);
    setResultData({
      title: jackpotWonAmount > 0 ? "🌟 NỔ HŨ RỒNG THẦN CỰC ĐỈNH!" : mainWinner,
      desc: `${userName} (${wScore} Điểm) vs Champa (${cScore} Điểm) - ${reason}`,
      netProfit,
      winner: mainWinner,
      quote: selectedQuote,
      jackpotMsg: jpMsg,
    });
    setGameState("result");
  };

  const resetGame = () => {
    setBets({
      warrior: { amount: 0, chipIcon: "" },
      champa: { amount: 0, chipIcon: "" },
      tie: { amount: 0, chipIcon: "" },
      warriorPair: { amount: 0, chipIcon: "" },
      champaPair: { amount: 0, chipIcon: "" },
      dragonSummon: { amount: 0, chipIcon: "" },
      samCo: { amount: 0, chipIcon: "" },
      tai: { amount: 0, chipIcon: "" },
      xiu: { amount: 0, chipIcon: "" },
      finishingMove: { amount: 0, chipIcon: "" },
    });
    setWarriorHand([]);
    setChampaHand([]);
    setWarriorScore(0);
    setChampaScore(0);
    setResultData(null);
    setGameState("betting");
    setUsedSkillThisMatch(false); // Reset trạng thái skill cho ván mới
    setStatusMessage("🔥 Ván đấu mới đã sẵn sàng. Hãy đặt cược và Triệu Hồi Bài!");
  };

  const formatMoney = (amount: number) => amount.toLocaleString() + " Ki";

  return (
    <div className="fixed inset-0 h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_center,#0f172a_0%,#020617_100%)] text-white font-sans select-none flex flex-col justify-between p-2 md:p-3" style={{ touchAction: 'manipulation' }}>
      
      {/* 🚀 HEADER TOP BAR */}
      <header className="w-full max-w-7xl mx-auto px-3 flex justify-between items-center bg-slate-900/95 border border-cyan-500/40 rounded-2xl py-1.5 md:py-2 shadow-2xl shrink-0 backdrop-blur-md relative z-30">
        
        <div className="flex items-center gap-2">
          <Link href="/" className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/40 px-3 py-1 rounded-xl text-xs font-black shadow transition active:scale-95">
            🏠 Cổng Game
          </Link>
          <button 
            onClick={() => setShowRules(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-xl text-xs shadow transition active:scale-95 cursor-pointer"
          >
            📜 Luật
          </button>
        </div>

        {/* KHO KỸ NĂNG & USER INFO */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSkillModal(true)}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black px-3 py-1.5 rounded-xl text-xs shadow-lg transition active:scale-95 flex items-center gap-1.5 cursor-pointer border border-cyan-300/40"
          >
            <span>⚡ Kho Skill</span>
          </button>

          <button
            onClick={toggleFullScreen}
            className="bg-slate-800 text-cyan-400 border border-cyan-500/40 px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer hidden sm:block"
          >
            ⛶ Full
          </button>

          <div className="bg-slate-950/80 border border-cyan-500/50 px-3 py-1 rounded-full flex items-center gap-2 shadow-inner">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400 overflow-hidden flex items-center justify-center shrink-0">
              {userAvatar ? <img src={userAvatar} alt="avatar" className="w-full h-full object-cover" /> : <span className="text-xs">⚡</span>}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-cyan-300 font-black truncate max-w-[70px]">{userName}</span>
              <span className="font-extrabold text-amber-400 font-mono text-xs">
                {/* Đã sửa placeholder hiển thị thành 0 */}
                {mounted ? balance.toLocaleString() : "0"} Ki
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 🏆 HŨ JACKPOT */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-center gap-2 md:gap-4 shrink-0 mt-1">
        <div className="text-center bg-slate-900/90 px-3 py-1 rounded-xl border border-cyan-500/40 shadow">
          <div className="text-[8px] text-cyan-300 uppercase font-bold">Rồng Trái Đất (100-5K)</div>
          <div className="text-xs font-black text-cyan-200 font-mono">{mounted ? jackpots.minor.toLocaleString() : "10,000"}</div>
        </div>

        <div className="text-center bg-slate-900/95 px-4 py-1 rounded-xl border-2 border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.4)] animate-pulse scale-105">
          <div className="text-[9px] text-yellow-300 uppercase font-black">🌟 Siêu Cấp Hũ</div>
          <div className="text-sm font-black text-yellow-400 font-mono">{mounted ? jackpots.grand.toLocaleString() : "200,000"}</div>
        </div>

        <div className="text-center bg-slate-900/90 px-3 py-1 rounded-xl border border-emerald-500/40 shadow">
          <div className="text-[8px] text-emerald-300 uppercase font-bold">Rồng Namek (&ge;10K)</div>
          <div className="text-xs font-black text-emerald-200 font-mono">{mounted ? jackpots.major.toLocaleString() : "50,000"}</div>
        </div>
      </div>

      {/* 🐉 THOẠI AURA TRUNG TÂM */}
      <div className="w-full max-w-4xl mx-auto bg-slate-900/90 border border-cyan-500/40 rounded-xl px-4 py-0.5 text-center shadow shrink-0 mt-0.5">
        <p className="text-xs font-bold text-cyan-300 animate-pulse tracking-wide truncate">💬 {statusMessage}</p>
      </div>

      {/* 🎴 BÀN CHƠI BACCARAT */}
      <main className="relative w-full max-w-7xl mx-auto flex-1 flex flex-col justify-between border-4 border-cyan-500/60 rounded-[30px] p-2 md:p-4 my-1 bg-[radial-gradient(circle_at_center,#1e3a8a_0%,#020617_100%)] shadow-[0_0_35px_rgba(6,182,212,0.4)] overflow-hidden">
        
        {/* 🐉 HÌNH RỒNG TRANG TRÍ */}
        <div className="absolute left-2 top-2 w-16 h-24 md:w-24 md:h-36 opacity-35 pointer-events-none hidden sm:block bg-contain bg-no-repeat bg-center" style={{ backgroundImage: "url('/assets/baccarat/shenron.png')" }}></div>
        <div className="absolute right-2 top-2 w-16 h-24 md:w-24 md:h-36 opacity-35 pointer-events-none hidden sm:block bg-contain bg-no-repeat bg-center" style={{ backgroundImage: "url('/assets/baccarat/shenronnamek.png')" }}></div>

        {/* 📜 POPUP LUẬT CHƠI */}
        {showRules && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-fadeIn">
            <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-center px-5 py-3 border-b border-cyan-500/30 bg-slate-950/60 shrink-0">
                <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wide">📜 Sổ Tay Luật Chơi Baccarat</h3>
                <button onClick={() => setShowRules(false)} className="w-7 h-7 rounded-full bg-slate-800 text-rose-400 border border-rose-500/50 flex items-center justify-center font-bold text-xs cursor-pointer">✕</button>
              </div>
              <div className="p-4 overflow-y-auto space-y-3 text-xs text-slate-300 flex-1 pr-2">
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-cyan-500/30">
                  <span className="text-cyan-400 font-black block mb-1">1. ⚔️ Luật Cơ Bản</span>
                  <p className="text-[11px] leading-relaxed text-slate-300">Trận đấu so tài giữa <b>{userName}</b> và <b>Thần Hủy Diệt Champa</b>. Bên nào có tổng điểm gần <b>9</b> nhất sẽ thắng.</p>
                </div>
              </div>
              <div className="p-3 border-t border-cyan-500/30 bg-slate-950/60 shrink-0">
                <button onClick={() => setShowRules(false)} className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-xs py-2.5 rounded-xl shadow cursor-pointer uppercase">Đã Hiểu ⚔️</button>
              </div>
            </div>
          </div>
        )}

        {/* ⚡ POPUP KHO KỸ NĂNG BACCARAT */}
        {showSkillModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-fadeIn">
            <div className="bg-slate-900 border-2 border-cyan-500/70 rounded-3xl max-w-xl w-full p-5 max-h-[85vh] overflow-y-auto text-left shadow-2xl relative space-y-4 font-sans">
              
              <div className="flex justify-between items-center border-b border-cyan-500/40 pb-3">
                <h3 className="text-sm md:text-base font-black text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                  ⚔️ KHO KỸ NĂNG BACCARAT THẦN THÁNH
                </h3>
                <button onClick={() => setShowSkillModal(false)} className="bg-rose-600 hover:bg-rose-500 text-white w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center cursor-pointer shadow">✕</button>
              </div>

              <p className="text-[11px] text-slate-300 italic">
                Bấm <b className="text-cyan-400">"Dùng"</b> để kích hoạt tuyệt kỹ chủ động <span className="text-amber-300 font-bold">TRƯỚC VÁN ĐẤU</span>. Mỗi ván chỉ được sử dụng tối đa <b className="text-rose-400">1 kỹ năng duy nhất</b>.
              </p>

              <div className="space-y-3">
                {BACCARAT_SKILL_ITEMS.map((skill) => {
                  const count = inventory[skill.id] || 0;
                  return (
                    <div key={skill.id} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-3xl shrink-0">{skill.icon}</span>
                        <div className="min-w-0 space-y-1">
                          <div className="text-sm font-bold text-amber-300 flex items-center gap-2 truncate">
                            <span className="truncate">{skill.name}</span>
                            <span className="bg-cyan-950 text-cyan-300 border border-cyan-500/50 px-2 py-0.5 rounded-full text-[10px] font-black shrink-0">{count} Lượt</span>
                          </div>
                          <div className="text-[11px] text-slate-300 leading-snug">{skill.desc}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-900">
                        {count > 0 ? (
                          <button onClick={() => handleActivateSkill(skill.id, skill.name)} className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:brightness-110 px-5 py-2 rounded-xl text-[11px] font-black tracking-wider uppercase transition shadow cursor-pointer w-full sm:w-auto">
                            Dùng ⚡
                          </button>
                        ) : (
                          <button onClick={() => handleBuySkillDirectly(skill)} className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 hover:brightness-110 px-4 py-2 rounded-xl text-[11px] font-black tracking-wider uppercase transition shadow cursor-pointer whitespace-nowrap w-full sm:w-auto">
                            Mua ({skill.price.toLocaleString()} Ki) 🛒
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}

        {/* RESULT OVERLAY */}
        {gameState === "result" && resultData && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 text-center animate-fadeIn space-y-2 rounded-[30px]">
            {resultData.jackpotMsg && (
              <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black px-4 py-1.5 rounded-xl text-xs md:text-sm animate-bounce shadow-lg">
                {resultData.jackpotMsg}
              </div>
            )}
            <h2 className={`text-2xl md:text-3xl font-black font-serif ${resultData.winner.includes('Thắng') && resultData.winner !== 'Thần Hủy Diệt Champa Thắng' ? 'text-cyan-400' : resultData.winner === 'Thần Hủy Diệt Champa Thắng' ? 'text-rose-400' : 'text-emerald-400'}`}>
              {resultData.title}
            </h2>
            <p className="text-xs md:text-sm text-slate-300">{resultData.desc}</p>
            <p className="text-xs italic text-yellow-300 max-w-md px-4 font-bold">"{resultData.quote}"</p>
            <p className={`text-xl font-bold ${resultData.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {resultData.netProfit >= 0 ? `+${formatMoney(resultData.netProfit)}` : `-${formatMoney(Math.abs(resultData.netProfit))}`}
            </p>
            <button onClick={resetGame} className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 text-slate-950 font-black text-xs px-6 py-2.5 rounded-2xl shadow-lg active:scale-95 cursor-pointer uppercase">
              Ván Đấu Tiếp Theo 🔥
            </button>
          </div>
        )}

        {/* 1. KHU VỰC CHAMPA */}
        <div className="flex flex-col items-center w-full pb-1 border-b border-cyan-500/35 relative z-10 shrink-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-7 h-7 md:w-9 md:h-9 rounded-full overflow-hidden bg-rose-950 border-2 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)] flex items-center justify-center">
              <img src="/assets/baccarat/champa.png" alt="Champa" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] md:text-xs font-black text-rose-400 uppercase tracking-wider">THẦN HỦY DIỆT CHAMPA</span>
              <span className="text-[11px] text-slate-300 font-bold">Điểm số: <span className="text-rose-500 font-black text-sm md:text-base">{champaScore}</span></span>
            </div>
          </div>
          
          <div className="flex justify-center h-[65px] md:h-[90px] items-center gap-2">
            {champaHand.map((card, idx) => (
              <div key={idx} className={`w-12 h-17 md:w-16 md:h-23 bg-gradient-to-b from-slate-100 to-white rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-slate-300 flex flex-col justify-between p-1.5 font-black text-[10px] md:text-xs transform hover:scale-105 transition ${card.color === 'red' ? 'text-rose-600' : 'text-slate-900'}`}>
                <div className="leading-none">{card.rank}<span className="text-[9px]">{card.symbol}</span></div>
                <div className="text-center text-lg md:text-2xl drop-shadow">{card.symbol}</div>
                <div className="leading-none text-right rotate-180">{card.rank}<span className="text-[9px]">{card.symbol}</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. CÁC Ô ĐẶT CƯỢC */}
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-1.5 my-1 relative z-10 text-[10px] md:text-xs">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
            <div onClick={() => placeBet('champaPair')} className="border border-dashed border-rose-500/50 bg-slate-950/70 hover:bg-rose-950/40 rounded-xl p-1.5 text-center cursor-pointer relative flex flex-col items-center justify-center min-h-[46px] transition">
              <span className="font-bold text-rose-400 text-[10px]">Đôi Champa</span>
              <span className="text-[8px] text-slate-400">1 : 11</span>
              {bets.champaPair.amount > 0 && <div className="absolute inset-0 bg-slate-950/90 rounded-xl flex items-center justify-center gap-1 px-1"><img src={bets.champaPair.chipIcon} alt="chip" className="w-5 h-5 object-contain" /><span className="text-yellow-300 font-black text-[9px] font-mono">{bets.champaPair.amount.toLocaleString()}</span></div>}
            </div>
            <div onClick={() => placeBet('warriorPair')} className="border border-dashed border-cyan-500/50 bg-slate-950/70 hover:bg-cyan-950/40 rounded-xl p-1.5 text-center cursor-pointer relative flex flex-col items-center justify-center min-h-[46px] transition">
              <span className="font-bold text-cyan-400 text-[10px]">Đôi {userName}</span>
              <span className="text-[8px] text-slate-400">1 : 11</span>
              {bets.warriorPair.amount > 0 && <div className="absolute inset-0 bg-slate-950/90 rounded-xl flex items-center justify-center gap-1 px-1"><img src={bets.warriorPair.chipIcon} alt="chip" className="w-5 h-5 object-contain" /><span className="text-yellow-300 font-black text-[9px] font-mono">{bets.warriorPair.amount.toLocaleString()}</span></div>}
            </div>
            <div onClick={() => placeBet('dragonSummon')} className="border border-dashed border-amber-500/50 bg-slate-950/70 hover:bg-amber-950/40 rounded-xl p-1.5 text-center cursor-pointer relative flex flex-col items-center justify-center min-h-[46px] transition">
              <span className="font-bold text-amber-400 text-[10px]">Rồng Thần</span>
              <span className="text-[8px] text-slate-400">1 : 25</span>
              {bets.dragonSummon.amount > 0 && <div className="absolute inset-0 bg-slate-950/90 rounded-xl flex items-center justify-center gap-1 px-1"><img src={bets.dragonSummon.chipIcon} alt="chip" className="w-5 h-5 object-contain" /><span className="text-yellow-300 font-black text-[9px] font-mono">{bets.dragonSummon.amount.toLocaleString()}</span></div>}
            </div>
            <div onClick={() => placeBet('samCo')} className="border-2 border-dashed border-yellow-400/70 bg-slate-950/80 hover:bg-amber-950/40 rounded-xl p-1.5 text-center cursor-pointer relative flex flex-col items-center justify-center min-h-[46px] transition">
              <span className="font-black text-yellow-300 text-[10px]">Sám Cô Hủy Diệt</span>
              <span className="text-[8px] text-yellow-200/80 font-bold">1 : 45</span>
              {bets.samCo.amount > 0 && <div className="absolute inset-0 bg-slate-950/90 rounded-xl flex items-center justify-center gap-1 px-1"><img src={bets.samCo.chipIcon} alt="chip" className="w-5 h-5 object-contain" /><span className="text-yellow-300 font-black text-[9px] font-mono">{bets.samCo.amount.toLocaleString()}</span></div>}
            </div>
            <div onClick={() => placeBet('tai')} className="border border-dashed border-indigo-500/50 bg-slate-950/70 hover:bg-indigo-950/40 rounded-xl p-1.5 text-center cursor-pointer relative flex flex-col items-center justify-center min-h-[46px] transition">
              <span className="font-bold text-indigo-400 text-[10px]">Tài</span>
              <span className="text-[8px] text-slate-400">1 : 1.95</span>
              {bets.tai.amount > 0 && <div className="absolute inset-0 bg-slate-950/90 rounded-xl flex items-center justify-center gap-1 px-1"><img src={bets.tai.chipIcon} alt="chip" className="w-5 h-5 object-contain" /><span className="text-yellow-300 font-black text-[9px] font-mono">{bets.tai.amount.toLocaleString()}</span></div>}
            </div>
            <div onClick={() => placeBet('xiu')} className="border border-dashed border-blue-500/50 bg-slate-950/70 hover:bg-blue-950/40 rounded-xl p-1.5 text-center cursor-pointer relative flex flex-col items-center justify-center min-h-[46px] transition">
              <span className="font-bold text-blue-400 text-[10px]">Xỉu</span>
              <span className="text-[8px] text-slate-400">1 : 1.95</span>
              {bets.xiu.amount > 0 && <div className="absolute inset-0 bg-slate-950/90 rounded-xl flex items-center justify-center gap-1 px-1"><img src={bets.xiu.chipIcon} alt="chip" className="w-5 h-5 object-contain" /><span className="text-yellow-300 font-black text-[9px] font-mono">{bets.xiu.amount.toLocaleString()}</span></div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div onClick={() => placeBet('tie')} className="border-2 border-dashed border-emerald-500/60 bg-slate-950/70 hover:bg-emerald-950/40 rounded-xl p-2 text-center cursor-pointer relative flex items-center justify-between px-4 min-h-[42px] transition">
              <span className="font-bold text-emerald-400 text-xs md:text-sm">HÒA KHÍ (1 : 8)</span>
              {bets.tie.amount > 0 ? <div className="bg-slate-900 border border-yellow-400 px-2 py-0.5 rounded-lg flex items-center gap-1"><img src={bets.tie.chipIcon} alt="chip" className="w-5 h-5 object-contain" /><span className="text-yellow-300 font-black text-xs font-mono">{bets.tie.amount.toLocaleString()}</span></div> : <span className="text-[9px] text-slate-400 font-bold uppercase">ĐẶT CƯỢC ➔</span>}
            </div>
            <div onClick={() => placeBet('finishingMove')} className="border-2 border-dashed border-purple-500/60 bg-slate-950/70 hover:bg-purple-950/40 rounded-xl p-2 text-center cursor-pointer relative flex items-center justify-between px-4 min-h-[42px] transition">
              <span className="font-bold text-purple-400 text-xs md:text-sm">TUYỆT CHIÊU KẾT LIỄU (1 : 5)</span>
              {bets.finishingMove.amount > 0 ? <div className="bg-slate-900 border border-yellow-400 px-2 py-0.5 rounded-lg flex items-center gap-1"><img src={bets.finishingMove.chipIcon} alt="chip" className="w-5 h-5 object-contain" /><span className="text-yellow-300 font-black text-xs font-mono">{bets.finishingMove.amount.toLocaleString()}</span></div> : <span className="text-[9px] text-slate-400 font-bold uppercase">ĐẶT CƯỢC ➔</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div onClick={() => placeBet('champa')} className="border-3 border-dashed border-rose-500/80 bg-slate-950/70 hover:bg-rose-950/40 rounded-xl p-2.5 text-center cursor-pointer relative flex items-center justify-between px-4 min-h-[50px] transition">
              <div><span className="font-black text-rose-400 text-xs md:text-sm block">THẦN HỦY DIỆT CHAMPA</span><span className="text-[9px] text-slate-400">1 : 0.95</span></div>
              {bets.champa.amount > 0 ? <div className="bg-slate-900 border-2 border-yellow-400 px-2.5 py-0.5 rounded-xl flex items-center gap-1.5"><img src={bets.champa.chipIcon} alt="chip" className="w-6 h-6 object-contain" /><span className="text-yellow-300 font-black text-xs md:text-sm font-mono">{bets.champa.amount.toLocaleString()} Ki</span></div> : <span className="text-[9px] text-slate-400 font-bold uppercase">ĐẶT CƯỢC ➔</span>}
            </div>
            <div onClick={() => placeBet('warrior')} className="border-3 border-dashed border-cyan-500/80 bg-slate-950/70 hover:bg-cyan-950/40 rounded-xl p-2.5 text-center cursor-pointer relative flex items-center justify-between px-4 min-h-[50px] transition">
              <div><span className="font-black text-cyan-400 text-xs md:text-sm block">{userName.toUpperCase()}</span><span className="text-[9px] text-slate-400">1 : 1</span></div>
              {bets.warrior.amount > 0 ? <div className="bg-slate-900 border-2 border-yellow-400 px-2.5 py-0.5 rounded-xl flex items-center gap-1.5"><img src={bets.warrior.chipIcon} alt="chip" className="w-6 h-6 object-contain" /><span className="text-yellow-300 font-black text-xs md:text-sm font-mono">{bets.warrior.amount.toLocaleString()} Ki</span></div> : <span className="text-[9px] text-slate-400 font-bold uppercase">ĐẶT CƯỢC ➔</span>}
            </div>
          </div>
        </div>

        {/* 3. KHU VỰC CHIẾN BINH */}
        <div className="flex flex-col items-center w-full pt-0.5 relative z-10 shrink-0">
          <div className="flex items-center justify-center gap-3 w-full px-4">
            <div className="w-36 flex justify-end">
              {gameState === "player_turn" && (
                <button onClick={handlePlayerDraw} className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs px-3 py-2.5 rounded-2xl shadow-xl cursor-pointer uppercase animate-bounce border border-yellow-200">
                  Rút Bài
                </button>
              )}
            </div>

            <div className="flex justify-center h-[65px] md:h-[90px] items-center gap-2">
              {warriorHand.map((card, idx) => (
                <div key={idx} className={`w-12 h-17 md:w-16 md:h-23 bg-gradient-to-b from-slate-100 to-white rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-slate-300 flex flex-col justify-between p-1.5 font-black text-[10px] md:text-xs transform hover:scale-105 transition ${card.color === 'red' ? 'text-rose-600' : 'text-slate-900'}`}>
                  <div className="leading-none">{card.rank}<span className="text-[9px]">{card.symbol}</span></div>
                  <div className="text-center text-lg md:text-2xl drop-shadow">{card.symbol}</div>
                  <div className="leading-none text-right rotate-180">{card.rank}<span className="text-[9px]">{card.symbol}</span></div>
                </div>
              ))}
            </div>

            <div className="w-36 flex justify-start">
              {gameState === "player_turn" && (
                <button onClick={handlePlayerStand} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs px-3 py-2.5 rounded-2xl shadow-xl cursor-pointer uppercase animate-bounce border border-purple-300">
                  Dằn Bài
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-cyan-500/20 border-2 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)] overflow-hidden flex items-center justify-center shrink-0">
              {userAvatar ? <img src={userAvatar} alt="avatar" className="w-full h-full object-cover" /> : <span className="text-xs">⚡</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] md:text-xs font-black text-cyan-400 uppercase tracking-wider">{userName}</span>
              <span className="text-[11px] text-slate-200 font-bold">Điểm số: <span className="text-cyan-400 font-black text-sm md:text-base">{warriorScore}</span></span>
            </div>
          </div>
        </div>

      </main>

      {/* 🚀 FOOTER */}
      <footer className="w-full max-w-7xl mx-auto bg-slate-900/95 border border-cyan-500/40 rounded-3xl p-2 md:p-2.5 flex flex-col gap-2 shadow-2xl shrink-0 backdrop-blur-md z-30">
        <div className="w-full">
          <button onClick={startGame} disabled={gameState !== "betting" || getTotalBet() === 0} className="w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 text-slate-950 font-black text-xs md:text-sm py-2.5 rounded-2xl shadow-lg cursor-pointer hover:brightness-110 disabled:opacity-50 uppercase tracking-wider transition active:scale-95">
            {gameState === "dealing" ? "Đang Chia Bài..." : "Triệu Hồi Bài 🔥"}
          </button>
        </div>

        <div className="flex gap-1.5 items-center justify-center overflow-x-auto py-0.5 px-1">
          {CHIP_LIST.map((chip) => {
            const isSelected = currentChip === chip.amount;
            return (
              <div key={chip.amount} onClick={() => setCurrentChip(chip.amount)} className={`flex flex-col items-center justify-center cursor-pointer transition-all ${isSelected ? "scale-110 drop-shadow-[0_0_10px_#22d3ee]" : "opacity-70 hover:opacity-100"}`}>
                <div className="w-8 h-8 md:w-10 md:h-10 relative rounded-full overflow-hidden border-2 border-cyan-400 bg-slate-950 flex items-center justify-center">
                  <img src={chip.icon} alt={chip.label} className="w-full h-full object-contain" />
                </div>
                <span className={`text-[8px] md:text-[9px] font-black mt-0.5 ${isSelected ? "text-cyan-300 font-extrabold" : "text-slate-400"}`}>{chip.label}</span>
              </div>
            );
          })}
        </div>

        <div className="w-full flex justify-center pt-0.5">
          <button onClick={clearBets} disabled={gameState !== "betting"} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2 rounded-2xl shadow cursor-pointer disabled:opacity-50 transition uppercase tracking-wide">
            🗑 Xóa Cược
          </button>
        </div>
      </footer>

    </div>
  );
}