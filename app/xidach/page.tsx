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
  bet: number;
  status: "waiting" | "playing" | "stood" | "busted" | "win" | "lose";
  isAI?: boolean;
}

interface RoomData {
  roomId: string;
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
  const [betAmount, setBetAmount] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(false);

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

  const joinOrCreateRoom = async () => {
    if (!user) {
      alert("Ní vui lòng đăng nhập để tham gia bàn Xì Dách!");
      return;
    }
    if (points < betAmount) {
      alert("Ní không đủ điểm Ki PTS để tham gia cược!");
      return;
    }

    setLoading(true);
    try {
      const roomsRef = collection(db, "xidach_rooms");
      const q = query(roomsRef, where("status", "==", "waiting"), limit(10));
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
        displayName: user.displayName || "Chiến binh Saiyan",
        photoURL: user.photoURL || "",
        cards: [],
        bet: betAmount,
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
      alert("Lỗi kết nối phòng!");
    } finally {
      setLoading(false);
    }
  };

  const startGame = async () => {
    if (!roomId || !room) return;
    const roomRef = doc(db, "xidach_rooms", roomId);

    let deck = [...room.deck];
    if (deck.length < 20) deck = createDeck();

    const updatedPlayers = room.players.map((p) => ({
      ...p,
      cards: [deck.pop()!, deck.pop()!],
      status: "playing" as const,
    }));

    const updatedDealer = {
      ...room.dealer,
      cards: [deck.pop()!, deck.pop()!],
      status: "playing" as const,
    };

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
    updatedPlayers[room.currentTurnIndex] = {
      ...currentPlayer,
      cards: newCards,
      status: newScore > 21 ? "busted" : "playing",
    };

    let nextTurn = room.currentTurnIndex;
    if (newScore > 21 || newCards.length === 5) {
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

    const finalPlayers = currentPlayers.map((p) => {
      const pScore = calculateHandScore(p.cards);
      let isWin = false;

      if (pScore > 21) {
        isWin = false;
      } else if (dealerScore > 21) {
        isWin = true;
      } else if (pScore > dealerScore) {
        isWin = true;
      } else {
        isWin = false;
      }

      return {
        ...p,
        status: (isWin ? "win" : "lose") as "win" | "lose",
      };
    });

    if (user) {
      const me = finalPlayers.find((p) => p.uid === user.uid);
      if (me) {
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

  const isMyTurn =
    room?.status === "playing" &&
    room.players[room.currentTurnIndex]?.uid === user?.uid;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans select-none flex flex-col items-center justify-start p-3 sm:p-5">
      {/* Top Bar */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-4 px-2">
        <Link href="/" className="text-sm font-bold text-amber-400 hover:underline">
          ← Về Cổng Game
        </Link>
        <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/50 px-4 py-2 rounded-xl shadow-lg">
          <span className="text-base">🪙</span>
          <span className="font-bold text-amber-400 text-sm sm:text-base">{points.toLocaleString()}</span>
          <span className="text-xs text-amber-300/70">PTS</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="w-full max-w-5xl bg-emerald-950/90 border-4 border-amber-600/60 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col justify-between min-h-[620px]">
        
        {!roomId ? (
          <div className="flex flex-col items-center justify-center my-auto gap-5 text-center px-4">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-amber-300 tracking-wide">
              🎴 SÀN XÌ DÁCH MULTIPLAYER
            </h1>
            <p className="text-sm sm:text-base text-emerald-100 max-w-lg leading-relaxed">
              Trò chơi đấu trí đối kháng trực tuyến 6 người (5 Người chơi + 1 AI Nhà Cái). Tự động ghép bàn, tính điểm Ki PTS realtime cực mượt!
            </p>

            <div className="flex items-center gap-2 my-3 flex-wrap justify-center">
              <span className="text-sm font-bold text-amber-300 mr-2">CHỌN MỨC CƯỢC:</span>
              {[50, 100, 200, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBetAmount(amt)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition cursor-pointer ${
                    betAmount === amt
                      ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md scale-105"
                      : "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  {amt} PTS
                </button>
              ))}
            </div>

            <button
              onClick={joinOrCreateRoom}
              disabled={loading}
              className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-slate-950 font-extrabold px-8 py-4 rounded-2xl text-base sm:text-lg tracking-wider hover:brightness-110 active:scale-95 transition shadow-lg cursor-pointer mt-2"
            >
              {loading ? "ĐANG GHÉP PHÒNG..." : "🔥 CHƠI NGAY (VÀO BÀN)"}
            </button>
          </div>
        ) : (
          <>
            {/* NHÀ CÁI AI */}
            <div className="flex flex-col items-center gap-2 border-b border-emerald-800/60 pb-4">
              <div className="bg-slate-900 border border-amber-500/60 px-5 py-2 rounded-2xl flex items-center gap-2 shadow-lg">
                <span className="text-xl">🐲</span>
                <span className="font-bold text-amber-300 text-sm sm:text-base">{room?.dealer.displayName}</span>
                <span className="bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded text-xs font-mono font-bold">
                  {room?.status === "ended" ? `Điểm: ${calculateHandScore(room.dealer.cards)}` : "Nhà Cái AI"}
                </span>
              </div>

              <div className="flex gap-2 mt-1">
                {room?.dealer.cards.map((c, idx) => (
                  <div
                    key={idx}
                    className="w-12 h-16 sm:w-14 sm:h-20 bg-white text-slate-950 rounded-xl flex flex-col items-center justify-center font-bold text-base shadow-lg border border-slate-300"
                  >
                    <span className={c.suit === "♥" || c.suit === "♦" ? "text-rose-600" : "text-slate-900"}>
                      {c.value}{c.suit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* DANH SÁCH NGƯỜI CHƠI TRONG BÀN */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-4">
              {room?.players.map((p, idx) => {
                const isCurrentTurn = room.status === "playing" && room.currentTurnIndex === idx;
                const score = calculateHandScore(p.cards);

                return (
                  <div
                    key={p.uid}
                    className={`bg-slate-900/90 border rounded-2xl p-3 flex flex-col items-center justify-between gap-2.5 transition shadow-md ${
                      isCurrentTurn
                        ? "border-amber-400 ring-4 ring-amber-400/40 scale-105"
                        : "border-emerald-800/80"
                    }`}
                  >
                    <div className="text-center truncate w-full">
                      <div className="text-xs sm:text-sm font-bold text-amber-300 truncate">{p.displayName}</div>
                      <div className="text-[11px] text-emerald-300 font-medium">Cược: {p.bet} PTS</div>
                    </div>

                    <div className="flex gap-1.5 justify-center flex-wrap min-h-[50px] items-center">
                      {p.cards.map((c, cIdx) => (
                        <div
                          key={cIdx}
                          className="w-10 h-14 sm:w-12 sm:h-16 bg-white text-slate-950 rounded-lg flex items-center justify-center font-bold text-sm shadow border border-slate-300"
                        >
                          <span className={c.suit === "♥" || c.suit === "♦" ? "text-rose-600" : "text-slate-900"}>
                            {c.value}{c.suit}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="text-xs font-bold">
                      {p.status === "win" ? (
                        <span className="text-amber-400 animate-bounce">🏆 THẮNG (+{p.bet})</span>
                      ) : p.status === "lose" ? (
                        <span className="text-rose-400">💥 THUA (-{p.bet})</span>
                      ) : p.status === "busted" ? (
                        <span className="text-rose-500">QUẮC ({score})</span>
                      ) : (
                        <span className="text-slate-200">Điểm: {score}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* THANH ĐIỀU KHIỂN & TRẠNG THÁI */}
            <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900 border border-emerald-800 p-3.5 rounded-2xl gap-3 shadow-lg">
              <div className="text-xs sm:text-sm font-medium text-emerald-200 text-center sm:text-left">
                {room?.status === "waiting" ? (
                  <span>⏳ Đang chờ người chơi vào bàn ({room.players.length}/5)...</span>
                ) : room?.status === "playing" ? (
                  <span>🔥 Đang tới lượt: <strong className="text-amber-400">{room.players[room.currentTurnIndex]?.displayName}</strong></span>
                ) : (
                  <span className="text-amber-400 font-bold">🎉 Ván đấu đã kết thúc! Bấm ván mới để tiếp tục.</span>
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap justify-center">
                {room?.status === "waiting" && (
                  <button
                    onClick={startGame}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl text-xs sm:text-sm transition shadow cursor-pointer"
                  >
                    🚀 BẮT ĐẦU CHIA BÀI
                  </button>
                )}

                {isMyTurn && (
                  <>
                    <button
                      onClick={drawCard}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition shadow cursor-pointer"
                    >
                      ➕ RÚT BÀI (HIT)
                    </button>
                    <button
                      onClick={standHand}
                      className="bg-rose-500 hover:bg-rose-400 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition shadow cursor-pointer"
                    >
                      ✋ DẰN (STAND)
                    </button>
                  </>
                )}

                {room?.status === "ended" && (
                  <button
                    onClick={startGame}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl text-xs sm:text-sm transition shadow cursor-pointer"
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