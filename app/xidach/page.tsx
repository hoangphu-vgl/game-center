"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  limit,
  arrayUnion,
} from "firebase/firestore";

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const BET_OPTIONS = [50, 100, 200, 500, 1000, 2000, 5000];

const DEALER_TAUNTS = [
  "Rồng Thần nhếch mép: 'Quắc rồi ní ơi! Tuổi gì đòi vượt qua Ki của ta?'",
  "Vegeta cười khẩy: 'Có bấy nhiêu điểm cũng đòi dằn? Bú sữa đi cùi bắp!'",
  "Yamcha nằm đất phẩy tay: 'Thôi xong, điểm Ki vừa bay màu rồi!'",
  "Beerus đại nhân ngáp dài: 'Rút bài gì mà kém cỏi vậy chiến binh?'",
];

const DEALER_PRAISES = [
  "🔥 Kamehameha! Xì Dách tuyệt đỉnh, Rồng Thần cũng phải cúi đầu!",
  "✨ Bùng nổ Ki Aura! Ngũ Linh huyền thoại xuất hiện!",
  "👑 Thắng áp đảo Nhà Cái! Tiền PTS chảy về túi như suối!",
];

interface Card {
  suit: string;
  value: string;
  code: string;
}

interface Player {
  uid: string;
  displayName: string;
  photoURL?: string;
  cards: Card[];
  splitCards?: Card[];
  bet: number;
  status: "waiting" | "playing" | "stood" | "busted" | "win" | "lose";
  isAI?: boolean;
}

interface RoomData {
  roomId: string;
  roomCode: string;
  betTier: number;
  status: "waiting" | "playing" | "ended";
  deck: Card[];
  dealer: Player;
  players: Player[];
  currentTurnIndex: number;
  createdAt: number;
}

export default function XiDachPage() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [selectedBetTier, setSelectedBetTier] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(false);
  const [tauntMessage, setTauntMessage] = useState<string>("🐲 Rồng Thần sẵn sàng thách đấu! Hãy chọn phòng cược!");

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
    if (!roomId) return;
    const roomRef = doc(db, "xidach_rooms", roomId);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        setRoom(docSnap.data() as RoomData);
      } else {
        setRoomId(null);
        setRoom(null);
      }
    });
    return () => unsubscribe();
  }, [roomId]);

  const createDeck = (): Card[] => {
    const deck: Card[] = [];
    SUITS.forEach((s) => {
      VALUES.forEach((v) => {
        deck.push({ suit: s, value: v, code: `${v}${s}` });
      });
    });
    return deck.sort(() => Math.random() - 0.5);
  };

  const calculateHandScore = (cards: Card[]) => {
    if (!cards || cards.length === 0) return 0;
    let score = 0;
    let aceCount = 0;

    cards.forEach((c) => {
      if (["J", "Q", "K"].includes(c.value)) score += 10;
      else if (c.value === "A") aceCount++;
      else score += parseInt(c.value);
    });

    for (let i = 0; i < aceCount; i++) {
      if (cards.length === 2) {
        if (score + 11 <= 21) score += 11;
        else score += 1;
      } else {
        if (score + 10 <= 21) score += 10;
        else score += 1;
      }
    }
    return score;
  };

  // PHÂN LUỒNG PHÒNG THEO ĐÚNG MẮC CƯỢC SELECTED
  const joinOrCreateRoom = async () => {
    if (!user) {
      alert("Ní vui lòng đăng nhập Google để vào sòng bài!");
      return;
    }
    if (points < selectedBetTier) {
      alert(`Ní không đủ điểm Ki PTS (${points}) để tham gia phòng cược ${selectedBetTier} PTS!`);
      return;
    }

    setLoading(true);
    try {
      const roomsRef = collection(db, "xidach_rooms");
      // Tìm phòng khớp mức cược selectedBetTier
      const q = query(
        roomsRef,
        where("betTier", "==", selectedBetTier),
        limit(10)
      );
      const querySnap = await getDocs(q);

      let targetRoomId: string | null = null;
      for (const docSnap of querySnap.docs) {
        const data = docSnap.data() as RoomData;
        if (data.players.length < 5 && !data.players.some((p) => p.uid === user.uid)) {
          targetRoomId = docSnap.id;
          break;
        }
      }

      const newPlayer: Player = {
        uid: user.uid,
        displayName: user.displayName || "Chiến Binh Saiyan",
        photoURL: user.photoURL || "",
        cards: [],
        bet: selectedBetTier,
        status: "waiting",
      };

      if (targetRoomId) {
        const roomRef = doc(db, "xidach_rooms", targetRoomId);
        await updateDoc(roomRef, {
          players: arrayUnion(newPlayer),
        });
        setRoomId(targetRoomId);
      } else {
        const newRoomRef = doc(collection(db, "xidach_rooms"));
        const generatedCode = `ROOM-${selectedBetTier}-` + Math.floor(1000 + Math.random() * 9000);
        const initialDeck = createDeck();

        const aiDealer: Player = {
          uid: "AI_DEALER",
          displayName: "🐲 Rồng Thần (Nhà Cái)",
          cards: [],
          bet: 0,
          status: "waiting",
          isAI: true,
        };

        const newRoomData: RoomData = {
          roomId: newRoomRef.id,
          roomCode: generatedCode,
          betTier: selectedBetTier,
          status: "waiting",
          deck: initialDeck,
          dealer: aiDealer,
          players: [newPlayer],
          currentTurnIndex: 0,
          createdAt: Date.now(),
        };

        await setDoc(newRoomRef, newRoomData);
        setRoomId(newRoomRef.id);
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi kết nối phòng cược!");
    } finally {
      setLoading(false);
    }
  };

  const leaveRoom = () => {
    setRoomId(null);
    setRoom(null);
  };

  const startGame = async () => {
    if (!roomId || !room) return;
    const roomRef = doc(db, "xidach_rooms", roomId);

    let deck = [...room.deck];
    if (deck.length < 20) deck = createDeck();

    const updatedPlayers = room.players.map((p) => ({
      ...p,
      cards: [deck.pop()!, deck.pop()!],
      splitCards: [],
      status: "playing" as const,
    }));

    const updatedDealer = {
      ...room.dealer,
      cards: [deck.pop()!, deck.pop()!],
      status: "playing" as const,
    };

    setTauntMessage("🔥 Bàn đấu bắt đầu! Nhà Cái Rồng Thần thách thức toàn bộ chiến binh!");

    await updateDoc(roomRef, {
      status: "playing",
      deck,
      players: updatedPlayers,
      dealer: updatedDealer,
      currentTurnIndex: 0,
    });
  };

  const drawCard = async () => {
    if (!roomId || !room || !user) return;
    const currentPlayer = room.players[room.currentTurnIndex];
    if (currentPlayer?.uid !== user.uid) return;

    let deck = [...room.deck];
    if (deck.length === 0) deck = createDeck();

    const drawnCard = deck.pop()!;
    const newCards = [...currentPlayer.cards, drawnCard];
    const newScore = calculateHandScore(newCards);

    const updatedPlayers = [...room.players];
    const isBusted = newScore > 21;

    updatedPlayers[room.currentTurnIndex] = {
      ...currentPlayer,
      cards: newCards,
      status: isBusted ? "busted" : "playing",
    };

    if (isBusted) {
      const taunt = DEALER_TAUNTS[Math.floor(Math.random() * DEALER_TAUNTS.length)];
      setTauntMessage(taunt);
    }

    let nextTurn = room.currentTurnIndex;
    if (isBusted || newCards.length === 5) {
      nextTurn += 1;
    }

    const roomRef = doc(db, "xidach_rooms", roomId);
    await updateDoc(roomRef, {
      deck,
      players: updatedPlayers,
      currentTurnIndex: nextTurn,
    });

    if (nextTurn >= room.players.length) {
      processAITurn(deck, updatedPlayers, room.dealer);
    }
  };

  // TÍNH NĂNG TÁCH ĐÔI KHI CÓ 2 LÁ BÀI CÙNG GIÁ TRỊ
  const splitPairHand = async () => {
    if (!roomId || !room || !user) return;
    const currentPlayer = room.players[room.currentTurnIndex];
    if (currentPlayer?.uid !== user.uid || currentPlayer.cards.length !== 2) return;

    if (points < currentPlayer.bet * 2) {
      alert("Ní không đủ điểm Ki PTS để nhân đôi cược khi tách bài!");
      return;
    }

    let deck = [...room.deck];
    if (deck.length < 2) deck = createDeck();

    // Tách 2 lá ra và rút thêm mỗi bên 1 lá
    const card1 = currentPlayer.cards[0];
    const card2 = currentPlayer.cards[1];

    const hand1 = [card1, deck.pop()!];
    const hand2 = [card2, deck.pop()!];

    const updatedPlayers = [...room.players];
    updatedPlayers[room.currentTurnIndex] = {
      ...currentPlayer,
      cards: hand1,
      splitCards: hand2,
      bet: currentPlayer.bet * 2,
    };

    setTauntMessage("✂️ Đã tách đôi thành công! Cược được nhân đôi!");

    const roomRef = doc(db, "xidach_rooms", roomId);
    await updateDoc(roomRef, {
      deck,
      players: updatedPlayers,
    });
  };

  const standHand = async () => {
    if (!roomId || !room || !user) return;
    const currentPlayer = room.players[room.currentTurnIndex];
    if (currentPlayer?.uid !== user.uid) return;

    const updatedPlayers = [...room.players];
    updatedPlayers[room.currentTurnIndex] = {
      ...currentPlayer,
      status: "stood",
    };

    const nextTurn = room.currentTurnIndex + 1;
    const roomRef = doc(db, "xidach_rooms", roomId);

    await updateDoc(roomRef, {
      players: updatedPlayers,
      currentTurnIndex: nextTurn,
    });

    if (nextTurn >= room.players.length) {
      processAITurn(room.deck, updatedPlayers, room.dealer);
    }
  };

  const processAITurn = async (currentDeck: Card[], currentPlayers: Player[], dealer: Player) => {
    if (!roomId) return;
    let deck = [...currentDeck];
    let dealerCards = [...dealer.cards];
    let dealerScore = calculateHandScore(dealerCards);

    while (dealerScore < 15 && dealerCards.length < 5) {
      dealerCards.push(deck.pop()!);
      dealerScore = calculateHandScore(dealerCards);
    }

    let hasAnyWinner = false;

    const finalPlayers = currentPlayers.map((p) => {
      if (p.cards.length === 0) return p;

      const pScore1 = calculateHandScore(p.cards);
      const pScore2 = p.splitCards && p.splitCards.length > 0 ? calculateHandScore(p.splitCards) : 0;
      
      const bestPScore = Math.max(pScore1 > 21 ? 0 : pScore1, pScore2 > 21 ? 0 : pScore2);
      let isWin = false;

      if (bestPScore === 0) {
        isWin = false;
      } else if (dealerScore > 21) {
        isWin = true;
      } else if (bestPScore > dealerScore) {
        isWin = true;
      } else {
        isWin = false;
      }

      if (isWin) hasAnyWinner = true;

      return {
        ...p,
        status: (isWin ? "win" : "lose") as "win" | "lose",
      };
    });

    if (hasAnyWinner) {
      setTauntMessage(DEALER_PRAISES[Math.floor(Math.random() * DEALER_PRAISES.length)]);
    } else {
      setTauntMessage("🐲 Nhà Cái Rồng Thần quét sạch sàn đấu! Húp trọn Ki PTS!");
    }

    if (user) {
      const me = finalPlayers.find((p) => p.uid === user.uid);
      if (me && me.cards.length > 0) {
        const delta = me.status === "win" ? me.bet : -me.bet;
        const newPts = points + delta;
        setPoints(newPts);
        const userRef = doc(db, "users", user.uid);
        updateDoc(userRef, { points: newPts }).catch((e) => console.log(e));
      }
    }

    const roomRef = doc(db, "xidach_rooms", roomId);
    await updateDoc(roomRef, {
      deck,
      dealer: { ...dealer, cards: dealerCards, status: dealerScore > 21 ? "busted" : "stood" },
      players: finalPlayers,
      status: "ended",
    });
  };

  const myTurnIndex = room?.players.findIndex((p) => p.uid === user?.uid) ?? -1;
  const myPlayer = myTurnIndex !== -1 ? room?.players[myTurnIndex] : null;

  const isMyTurn =
    room?.status === "playing" &&
    room.currentTurnIndex === myTurnIndex &&
    myTurnIndex !== -1;

  // Kiểm tra điều kiện Tách Bài (2 lá đầu cùng giá trị)
  const canSplit =
    isMyTurn &&
    myPlayer &&
    myPlayer.cards.length === 2 &&
    (!myPlayer.splitCards || myPlayer.splitCards.length === 0) &&
    (myPlayer.cards[0].value === myPlayer.cards[1].value ||
      (["10", "J", "Q", "K"].includes(myPlayer.cards[0].value) &&
        ["10", "J", "Q", "K"].includes(myPlayer.cards[1].value)));

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans select-none flex flex-col items-center justify-start p-2 sm:p-4">
      {/* Top Bar Navigation */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-3 px-2">
        <Link href="/" className="text-xs sm:text-sm font-extrabold text-amber-400 hover:underline flex items-center gap-1">
          ← Về Cổng Game
        </Link>
        <div className="flex items-center gap-3">
          {roomId && (
            <button
              onClick={leaveRoom}
              className="bg-rose-900/80 border border-rose-500/50 hover:bg-rose-800 text-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow"
            >
              🚪 Đổi Phòng Cược Mới
            </button>
          )}
          <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/50 px-3.5 py-1.5 rounded-xl shadow-md">
            <span className="text-sm">🪙</span>
            <span className="font-extrabold text-amber-400 text-xs sm:text-sm">{points.toLocaleString()}</span>
            <span className="text-[10px] text-amber-300/70 font-bold">PTS</span>
          </div>
        </div>
      </div>

      {/* SÒNG BÀI THẢM XANH CASINO */}
      <div className="w-full max-w-6xl bg-gradient-to-b from-emerald-900 via-emerald-950 to-slate-950 border-4 border-amber-600/70 rounded-3xl p-3 sm:p-6 shadow-[0_0_60px_rgba(5,150,105,0.25)] flex flex-col justify-between min-h-[640px] relative">
        
        {!roomId ? (
          /* MÀN HÌNH CHỌN PHÒNG THEO CÁC MỨC CƯỢC RIÊNG */
          <div className="flex flex-col items-center justify-center my-auto gap-6 text-center px-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 tracking-wider">
                🎴 SÒNG XÌ DÁCH PHÂN MỨC CƯỢC
              </h1>
              <p className="text-xs sm:text-base text-emerald-200/90 max-w-xl mx-auto font-medium">
                Chọn mức cược ní muốn tham gia. Hệ thống tự tạo & ghép phòng đúng phân khúc 6 vị trí!
              </p>
            </div>

            <div className="bg-slate-900/90 border border-emerald-500/40 p-4 sm:p-6 rounded-3xl flex flex-col items-center gap-4 shadow-xl max-w-2xl w-full">
              <span className="text-xs sm:text-sm font-black text-amber-300 tracking-widest uppercase">
                🔥 CHỌN PHÒNG CƯỢC (ĐÚNG PHÂN KHÚC CỤ THỂ)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full">
                {BET_OPTIONS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setSelectedBetTier(amt)}
                    className={`p-3 rounded-2xl text-xs sm:text-sm font-black border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      selectedBetTier === amt
                        ? "bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 border-amber-300 shadow-xl scale-105 ring-2 ring-amber-300"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    <span className="text-base sm:text-lg">🏛️</span>
                    <span>Phòng {amt} PTS</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={joinOrCreateRoom}
              disabled={loading}
              className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-slate-950 font-black px-10 py-4 rounded-2xl text-base sm:text-xl tracking-wider hover:brightness-110 active:scale-95 transition shadow-xl shadow-orange-500/20 cursor-pointer"
            >
              {loading ? "ĐANG VÀO PHÒNG CƯỢC..." : `🔥 VÀO PHÒNG ${selectedBetTier} PTS`}
            </button>
          </div>
        ) : (
          /* BÀN BÀI THẬT ĐANG CHƠI */
          <>
            {/* Header Trong Bàn */}
            <div className="flex justify-between items-center bg-slate-950/90 border border-emerald-800 px-3.5 py-2 rounded-2xl text-xs">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-black">PHÒNG CƯỢC:</span>
                <span className="bg-amber-500/20 text-amber-300 font-mono font-bold px-2.5 py-0.5 rounded border border-amber-500/40">
                  {room?.roomCode} ({room?.betTier} PTS)
                </span>
              </div>
              <div className="text-amber-300 font-bold truncate max-w-[280px] sm:max-w-none">
                💬 {tauntMessage}
              </div>
            </div>

            {/* VÙNG NHÀ CÁI AI */}
            <div className="flex flex-col items-center gap-2 my-2 border-b border-emerald-800/40 pb-4">
              <div className="bg-slate-900/90 border border-amber-500/60 px-5 py-2 rounded-2xl flex items-center gap-2 shadow-xl">
                <span className="text-xl">🐲</span>
                <span className="font-extrabold text-amber-300 text-sm sm:text-base">{room?.dealer.displayName}</span>
                <span className="bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded text-xs font-mono font-bold">
                  {room?.status === "ended" ? `Điểm: ${calculateHandScore(room.dealer.cards)}` : "Nhà Cái AI"}
                </span>
              </div>

              <div className="flex gap-2">
                {room?.dealer.cards.map((c, idx) => (
                  <div
                    key={idx}
                    className="w-11 h-16 sm:w-14 sm:h-20 bg-white text-slate-950 rounded-xl flex flex-col items-center justify-center font-bold text-sm sm:text-base shadow-lg border border-slate-300"
                  >
                    <span className={c.suit === "♥" || c.suit === "♦" ? "text-rose-600" : "text-slate-950"}>
                      {c.value}{c.suit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* VÙNG 5 VỊ TRÍ NGƯỜI CHƠI TRONG BÀN */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 my-3">
              {room?.players.map((p, idx) => {
                const isCurrentTurn = room.status === "playing" && room.currentTurnIndex === idx;
                const score1 = calculateHandScore(p.cards);
                const score2 = p.splitCards ? calculateHandScore(p.splitCards) : 0;
                const isWaitingForNextHand = room.status === "playing" && p.cards.length === 0;

                return (
                  <div
                    key={p.uid}
                    className={`bg-slate-900/90 border rounded-2xl p-2.5 flex flex-col items-center justify-between gap-2 transition-all shadow-md ${
                      isCurrentTurn
                        ? "border-amber-400 ring-4 ring-amber-400/50 scale-105 z-10"
                        : "border-emerald-800/80 opacity-90"
                    }`}
                  >
                    <div className="text-center truncate w-full">
                      <div className="text-xs font-black text-amber-300 truncate">{p.displayName}</div>
                      <div className="text-[10px] text-emerald-300 font-mono font-semibold">Cược: {p.bet} PTS</div>
                    </div>

                    {isWaitingForNextHand ? (
                      <div className="text-[10px] text-amber-400/90 font-bold bg-amber-500/10 px-2 py-3 rounded-lg border border-amber-500/20 text-center animate-pulse">
                        ⏳ Chờ ván mới...
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 items-center">
                        {/* Tụ Bài 1 */}
                        <div className="flex gap-1 justify-center flex-wrap">
                          {p.cards.map((c, cIdx) => (
                            <div
                              key={cIdx}
                              className="w-8 h-12 sm:w-10 sm:h-14 bg-white text-slate-950 rounded flex items-center justify-center font-bold text-xs shadow border border-slate-300"
                            >
                              <span className={c.suit === "♥" || c.suit === "♦" ? "text-rose-600" : "text-slate-950"}>
                                {c.value}{c.suit}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Tụ Bài Tách (Nếu có) */}
                        {p.splitCards && p.splitCards.length > 0 && (
                          <div className="flex gap-1 justify-center flex-wrap border-t border-amber-500/30 pt-1 mt-1">
                            {p.splitCards.map((c, cIdx) => (
                              <div
                                key={cIdx}
                                className="w-8 h-12 sm:w-10 sm:h-14 bg-amber-100 text-slate-950 rounded flex items-center justify-center font-bold text-xs shadow border border-amber-400"
                              >
                                <span className={c.suit === "♥" || c.suit === "♦" ? "text-rose-600" : "text-slate-950"}>
                                  {c.value}{c.suit}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-xs font-black">
                      {p.status === "win" ? (
                        <span className="text-amber-400 animate-bounce">🏆 THẮNG (+{p.bet})</span>
                      ) : p.status === "lose" ? (
                        <span className="text-rose-400">💥 THUA (-{p.bet})</span>
                      ) : p.status === "busted" ? (
                        <span className="text-rose-500">QUẮC ({score1})</span>
                      ) : p.cards.length > 0 ? (
                        <span className="text-slate-200">
                          Điểm: {score1} {score2 > 0 ? `| Tụ 2: ${score2}` : ""}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* THANH ĐIỀU KHIỂN & CÁC NÚT THAO TÁC */}
            <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900 border border-emerald-800 p-3 sm:p-4 rounded-2xl gap-3 shadow-xl">
              <div className="text-xs sm:text-sm font-bold text-emerald-200 text-center sm:text-left">
                {room?.status === "waiting" ? (
                  <span>⏳ Đang chờ người vào bàn cược {room.betTier} PTS ({room.players.length}/5). Sẵn sàng bấm Chia bài!</span>
                ) : room?.status === "playing" ? (
                  <span>
                    👉 Lượt quay bài:{" "}
                    <strong className="text-amber-400 font-extrabold text-sm sm:text-base">
                      {room.players[room.currentTurnIndex]?.displayName}
                    </strong>
                  </span>
                ) : (
                  <span className="text-amber-400 font-black">🎉 Ván đấu đã hoàn tất!</span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-center">
                {room?.status === "waiting" && (
                  <button
                    onClick={startGame}
                    className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm transition shadow hover:brightness-110 active:scale-95 cursor-pointer"
                  >
                    🚀 BẮT ĐẦU CHIA BÀI
                  </button>
                )}

                {isMyTurn && (
                  <>
                    <button
                      onClick={drawCard}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm transition shadow cursor-pointer active:scale-95 animate-pulse"
                    >
                      ➕ RÚT BÀI (HIT)
                    </button>

                    {canSplit && (
                      <button
                        onClick={splitPairHand}
                        className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm transition shadow cursor-pointer active:scale-95 border-2 border-yellow-200"
                      >
                        ✂️ TÁCH ĐÔI (SPLIT)
                      </button>
                    )}

                    <button
                      onClick={standHand}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm transition shadow cursor-pointer active:scale-95"
                    >
                      ✋ DẰN (STAND)
                    </button>
                  </>
                )}

                {room?.status === "ended" && (
                  <button
                    onClick={startGame}
                    className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm transition shadow hover:brightness-110 active:scale-95 cursor-pointer"
                  >
                    🔄 CHƠI VÁN MỚI
                  </button>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}