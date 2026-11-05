"use client";

import React, { useState, useEffect, useRef } from "react";
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
  roomCode: string;
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

  // Check Auth
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

  // Lắng nghe dữ liệu Phòng Realtime
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

  // Tạo Bộ Bài Ngẫu Nhiên
  const createDeck = (): Card[] => {
    const deck: Card[] = [];
    SUITS.forEach((s) => {
      VALUES.forEach((v) => {
        deck.push({ suit: s, value: v, code: `${v}${s}` });
      });
    });
    return deck.sort(() => Math.random() - 0.5);
  };

  // Tính Điểm Bài Xì Dách
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

  // VÀO HOẶC TẠO PHÒNG
  const joinOrCreateRoom = async () => {
    if (!user) {
      alert("Ní vui lòng đăng nhập Google để vào sòng bài!");
      return;
    }
    if (points < betAmount) {
      alert("Ní không đủ điểm Ki PTS để tham gia mức cược này!");
      return;
    }

    setLoading(true);
    try {
      const roomsRef = collection(db, "xidach_rooms");
      const q = query(roomsRef, limit(10));
      const querySnap = await getDocs(q);

      let targetRoomId: string | null = null;
      for (const docSnap of querySnap.docs) {
        const data = docSnap.data() as RoomData;
        if (data.players.length < 5 && !data.players.some((p) => p.uid === user.uid)) {
          targetRoomId = docSnap.id;
          break;
        }
      }

      // Người chơi mới vào: Nếu phòng đang chơi thì để trạng thái 'waiting' (chờ ván sau)
      const newPlayer: Player = {
        uid: user.uid,
        displayName: user.displayName || "Chiến Binh Saiyan",
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
        // Tạo phòng mới với Mã Phòng ngẫu nhiên
        const newRoomRef = doc(collection(db, "xidach_rooms"));
        const generatedCode = "XD-" + Math.floor(1000 + Math.random() * 9000);
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
      alert("Lỗi kết nối tạo/vào phòng!");
    } finally {
      setLoading(false);
    }
  };

  // Quay lại tạo / tìm phòng mới
  const leaveRoom = () => {
    setRoomId(null);
    setRoom(null);
  };

  // CHIA BÀI VÁN MỚI (CHIA CHO TẤT CẢ NGƯỜI ĐANG CÓ TRONG BÀN)
  const startGame = async () => {
    if (!roomId || !room) return;
    const roomRef = doc(db, "xidach_rooms", roomId);

    let deck = [...room.deck];
    if (deck.length < 20) deck = createDeck();

    // Tất cả người chơi trong phòng đều được tham gia ván mới
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

  // RÚT BÀI THEO THỨ TỰ TỪ TRÁI SANG PHẢI
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
    // Tự chuyển lượt nếu Quắc (>21) hoặc đủ 5 lá (Ngũ Linh)
    if (newScore > 21 || newCards.length === 5) {
      nextTurn += 1;
    }

    const roomRef = doc(db, "xidach_rooms", roomId);
    await updateDoc(roomRef, {
      deck,
      players: updatedPlayers,
      currentTurnIndex: nextTurn,
    });

    // Nếu đã duyệt hết người chơi từ trái sang phải -> Tới lượt AI Nhà Cái
    if (nextTurn >= room.players.length) {
      processAITurn(deck, updatedPlayers, room.dealer);
    }
  };

  // DẰN BÀI (STAND)
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

  // NHÀ CÁI AI TỰ RÚT BÀI VÀ XÉT ĐIỂM HÀNG LOẠT
  const processAITurn = async (currentDeck: Card[], currentPlayers: Player[], dealer: Player) => {
    if (!roomId) return;
    let deck = [...currentDeck];
    let dealerCards = [...dealer.cards];
    let dealerScore = calculateHandScore(dealerCards);

    // AI tự rút nếu dưới 15 điểm
    while (dealerScore < 15 && dealerCards.length < 5) {
      dealerCards.push(deck.pop()!);
      dealerScore = calculateHandScore(dealerCards);
    }

    const finalPlayers = currentPlayers.map((p) => {
      // Người đứng xem không tính kết quả ván này
      if (p.cards.length === 0) return p;

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

    // Cập nhật điểm Ki PTS cá nhân
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
  const isMyTurn =
    room?.status === "playing" &&
    room.currentTurnIndex === myTurnIndex &&
    myTurnIndex !== -1;

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
              🚪 Thoát / Tạo Phòng Mới
            </button>
          )}
          <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/50 px-3.5 py-1.5 rounded-xl shadow-md">
            <span className="text-sm">🪙</span>
            <span className="font-extrabold text-amber-400 text-xs sm:text-sm">{points.toLocaleString()}</span>
            <span className="text-[10px] text-amber-300/70 font-bold">PTS</span>
          </div>
        </div>
      </div>

      {/* SÒNG BÀI XÌ DÁCH (THẢM XANH EMERALD SANG TRỌNG) */}
      <div className="w-full max-w-6xl bg-gradient-to-b from-emerald-900 via-emerald-950 to-slate-950 border-4 border-amber-600/70 rounded-3xl p-3 sm:p-6 shadow-[0_0_60px_rgba(5,150,105,0.25)] flex flex-col justify-between min-h-[640px] relative">
        
        {!roomId ? (
          /* MÀN HÌNH TẠO & VÀO PHÒNG TỰ ĐỘNG */
          <div className="flex flex-col items-center justify-center my-auto gap-6 text-center px-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 tracking-wider">
                🎴 XÌ DÁCH MULTIPLAYER REALTIME
              </h1>
              <p className="text-xs sm:text-base text-emerald-200/90 max-w-xl mx-auto font-medium">
                Tự động tạo & ghép phòng 6 vị trí (5 Người chơi + 1 AI Nhà Cái Rồng Thần). Cược điểm Ki PTS gắt gao!
              </p>
            </div>

            <div className="bg-slate-900/90 border border-emerald-500/40 p-4 sm:p-5 rounded-2xl flex flex-col items-center gap-3 shadow-xl">
              <span className="text-xs font-extrabold text-amber-300 tracking-widest uppercase">CHỌN MỨC CƯỢC BAN ĐẦU</span>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {[50, 100, 200, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setBetAmount(amt)}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black border transition cursor-pointer ${
                      betAmount === amt
                        ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 border-amber-300 shadow-lg scale-105"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {amt} PTS
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={joinOrCreateRoom}
              disabled={loading}
              className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-slate-950 font-black px-10 py-4 rounded-2xl text-base sm:text-xl tracking-wider hover:brightness-110 active:scale-95 transition shadow-xl shadow-orange-500/20 cursor-pointer"
            >
              {loading ? "ĐANG TẠO / GHÉP PHÒNG..." : "🔥 BẤM CHƠI NGAY (VÀO BÀN)"}
            </button>
          </div>
        ) : (
          /* BÀN BÀI THẬT ĐANG HOẠT ĐỘNG */
          <>
            {/* Header Trong Bàn: Mã Phòng & Thông tin */}
            <div className="flex justify-between items-center bg-slate-950/80 border border-emerald-800 px-3.5 py-2 rounded-2xl text-xs">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-black">MÃ PHÒNG:</span>
                <span className="bg-amber-500/20 text-amber-300 font-mono font-bold px-2.5 py-0.5 rounded border border-amber-500/40">
                  {room?.roomCode}
                </span>
              </div>
              <div className="text-emerald-300 font-medium hidden sm:block">
                ⚡ Tự động chia bài từ trái sang phải
              </div>
            </div>

            {/* VÙNG NHÀ CÁI AI (Ở ĐỈNH BÀN BÀI) */}
            <div className="flex flex-col items-center gap-2 my-2 border-b border-emerald-800/40 pb-4">
              <div className="bg-slate-900/90 border border-amber-500/60 px-5 py-2 rounded-2xl flex items-center gap-2 shadow-xl">
                <span className="text-xl">🐲</span>
                <span className="font-extrabold text-amber-300 text-sm sm:text-base">{room?.dealer.displayName}</span>
                <span className="bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded text-xs font-mono font-bold">
                  {room?.status === "ended" ? `Điểm: ${calculateHandScore(room.dealer.cards)}` : "Nhà Cái AI"}
                </span>
              </div>

              {/* Các lá bài của Nhà Cái AI */}
              <div className="flex gap-2">
                {room?.dealer.cards.map((c, idx) => (
                  <div
                    key={idx}
                    className="w-11 h-16 sm:w-14 sm:h-20 bg-white text-slate-950 rounded-xl flex flex-col items-center justify-center font-bold text-sm sm:text-base shadow-lg border border-slate-300 transition-transform"
                  >
                    <span className={c.suit === "♥" || c.suit === "♦" ? "text-rose-600" : "text-slate-950"}>
                      {c.value}{c.suit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* VÙNG 5 VỊ TRÍ NGƯỜI CHƠI TRONG BÀN (XẾP HÀNG TỪ TRÁI SANG PHẢI) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 my-3">
              {room?.players.map((p, idx) => {
                const isCurrentTurn = room.status === "playing" && room.currentTurnIndex === idx;
                const score = calculateHandScore(p.cards);
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
                    {/* Thông tin tên & số cược */}
                    <div className="text-center truncate w-full">
                      <div className="text-xs font-black text-amber-300 truncate">{p.displayName}</div>
                      <div className="text-[10px] text-emerald-300 font-mono font-semibold">Cược: {p.bet} PTS</div>
                    </div>

                    {/* Vùng Lá Bài */}
                    {isWaitingForNextHand ? (
                      <div className="text-[10px] text-amber-400/90 font-bold bg-amber-500/10 px-2 py-3 rounded-lg border border-amber-500/20 text-center animate-pulse">
                        ⏳ Đang chờ ván mới...
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-center flex-wrap min-h-[50px] items-center">
                        {p.cards.map((c, cIdx) => (
                          <div
                            key={cIdx}
                            className="w-9 h-13 sm:w-11 sm:h-16 bg-white text-slate-950 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shadow border border-slate-300"
                          >
                            <span className={c.suit === "♥" || c.suit === "♦" ? "text-rose-600" : "text-slate-950"}>
                              {c.value}{c.suit}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Trạng Thái Thắng / Thua / Điểm */}
                    <div className="text-xs font-black">
                      {p.status === "win" ? (
                        <span className="text-amber-400 animate-bounce">🏆 THẮNG (+{p.bet})</span>
                      ) : p.status === "lose" ? (
                        <span className="text-rose-400">💥 THUA (-{p.bet})</span>
                      ) : p.status === "busted" ? (
                        <span className="text-rose-500">QUẮC ({score})</span>
                      ) : p.cards.length > 0 ? (
                        <span className="text-slate-200">Điểm: {score}</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* THANH THÔNG BÁO & NÚT THAO TÁC RÚT BÀI THEO LƯỢT */}
            <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900 border border-emerald-800 p-3 sm:p-4 rounded-2xl gap-3 shadow-xl">
              <div className="text-xs sm:text-sm font-bold text-emerald-200 text-center sm:text-left">
                {room?.status === "waiting" ? (
                  <span>⏳ Đang ở phòng chờ ({room.players.length}/5 người). Sẵn sàng bấm Chia bài!</span>
                ) : room?.status === "playing" ? (
                  <span>
                    👉 Đang tới lượt (Từ trái qua phải):{" "}
                    <strong className="text-amber-400 font-extrabold text-sm sm:text-base">
                      {room.players[room.currentTurnIndex]?.displayName}
                    </strong>
                  </span>
                ) : (
                  <span className="text-amber-400 font-black">🎉 Ván đấu đã xong! Bấm "Chơi ván mới" để Nhà Cái chia bài tiếp.</span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-center">
                {/* Nút Bắt Đầu Chia Bài */}
                {room?.status === "waiting" && (
                  <button
                    onClick={startGame}
                    className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm transition shadow hover:brightness-110 active:scale-95 cursor-pointer"
                  >
                    🚀 BẮT ĐẦU CHIA BÀI
                  </button>
                )}

                {/* Các Nút Thao Tác Khi Đúng Lượt */}
                {isMyTurn && (
                  <>
                    <button
                      onClick={drawCard}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm transition shadow cursor-pointer active:scale-95 animate-pulse"
                    >
                      ➕ RÚT BÀI (HIT)
                    </button>
                    <button
                      onClick={standHand}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm transition shadow cursor-pointer active:scale-95"
                    >
                      ✋ DẰN (STAND)
                    </button>
                  </>
                )}

                {/* Nút Chơi Ván Tiếp Theo */}
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