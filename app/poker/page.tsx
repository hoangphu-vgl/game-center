"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
  color: string;
}

interface SeatPlayer {
  id: string;
  name: string;
  avatar: string;
  chips: number;
  cards: Card[];
  currentBet: number;
  folded: boolean;
  isReady: boolean;
  isObserving: boolean;
}

type GamePhase = 'IDLE' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export default function PokerPage() {
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string>("");
  const [inputRoomCode, setInputRoomCode] = useState("");
  const [matching, setMatching] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myKi, setMyKi] = useState(10000);
  const [myName, setMyName] = useState("Chiến Binh");
  const [myAvatar, setMyAvatar] = useState("");

  // 5 Ghế ngồi xung quanh bàn (Đã bỏ ghế số 6 để không đè Nhà cái)
  const [seats, setSeats] = useState<(SeatPlayer | null)[]>([null, null, null, null, null]);
  const [pot, setPot] = useState(0);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [phase, setPhase] = useState<GamePhase>('IDLE');
  const [dealerMsg, setDealerMsg] = useState("Nhà cái Whis đã sẵn sàng!");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [raiseVal, setRaiseVal] = useState(100);
  const [isReadyClicked, setIsReadyClicked] = useState(false);

  // Animation Chia bài
  const [isDealingAnimation, setIsDealingAnimation] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance, full_name, avatar_url")
          .eq("id", session.user.id)
          .single();

        const name = profile?.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.username || "Chiến Binh";
        const avatar = profile?.avatar_url || session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${session.user.id}`;
        
        setMyKi(profile?.balance ?? 5000);
        setMyName(name);
        setMyAvatar(avatar);
      } else {
        const guestId = "guest_" + Math.floor(Math.random() * 8999 + 1000);
        setCurrentUser({ id: guestId });
        setMyName(`Saiyan_${guestId.slice(-4)}`);
        setMyAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${guestId}`);
      }
    }
    loadUser();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Ghép bàn tự động vào ROOM_1 hoặc ROOM_2
  const handleAutoMatch = async () => {
    if (!currentUser) return;
    setMatching(true);
    showToast("Đang tìm bàn...");

    try {
      const { data: fixedRooms } = await supabase
        .from("poker_rooms")
        .select("*")
        .in("code", ["ROOM_1", "ROOM_2"]);

      const myData: SeatPlayer = {
        id: currentUser.id,
        name: myName,
        avatar: myAvatar,
        chips: myKi,
        cards: [],
        currentBet: 0,
        folded: false,
        isReady: false,
        isObserving: false
      };

      if (fixedRooms && fixedRooms.length > 0) {
        let targetRoom = fixedRooms.find(r => {
          const sList = r.seats || [null, null, null, null, null];
          return sList.some((s: any) => s === null);
        });

        if (!targetRoom) targetRoom = fixedRooms[0];

        let currentSeats: (SeatPlayer | null)[] = targetRoom.seats || [null, null, null, null, null];
        const existingIdx = currentSeats.findIndex(s => s && s.id === currentUser.id);

        if (existingIdx !== -1) {
          currentSeats[existingIdx] = myData;
        } else {
          const emptyIndex = currentSeats.findIndex(s => s === null);
          if (emptyIndex !== -1) {
            myData.isObserving = targetRoom.phase !== "IDLE";
            currentSeats[emptyIndex] = myData;
          } else {
            myData.isObserving = true;
          }
        }

        await supabase.from("poker_rooms").update({ seats: currentSeats }).eq("id", targetRoom.id);
        setRoomId(targetRoom.id);
        setRoomCode(targetRoom.code);
        setInRoom(true);
        showToast(`Đã vào #${targetRoom.code}`);
      }
    } catch (e) {
      setInRoom(true);
      setRoomCode("ROOM_1");
    } finally {
      setMatching(false);
    }
  };

  // Realtime Sub
  useEffect(() => {
    if (!roomId) return;
    const fetchRoom = async () => {
      const { data } = await supabase.from("poker_rooms").select("*").eq("id", roomId).single();
      if (data) {
        setSeats(data.seats || [null, null, null, null, null]);
        setPot(data.pot || 0);
        setCommunityCards(data.community_cards || []);
        setPhase(data.phase || 'IDLE');
      }
    };
    fetchRoom();

    const channel = supabase.channel(`poker_room_${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "poker_rooms", filter: `id=eq.${roomId}` }, (payload: any) => {
        const room = payload.new;
        if (room) {
          setSeats(room.seats);
          setPot(room.pot);
          setCommunityCards(room.community_cards || []);
          setPhase(room.phase);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const handleLeaveRoom = async () => {
    if (roomId && currentUser) {
      const updatedSeats = seats.map(s => s && s.id === currentUser.id ? null : s);
      await supabase.from("poker_rooms").update({ seats: updatedSeats }).eq("id", roomId);
    }
    setInRoom(false);
    setRoomId(null);
    setIsReadyClicked(false);
  };

  // Bấm Sẵn Sàng
  const handleToggleReady = async () => {
    setIsReadyClicked(true);
    const updatedSeats = seats.map(s => s && s.id === currentUser?.id ? { ...s, isReady: true } : s);
    if (roomId) {
      await supabase.from("poker_rooms").update({ seats: updatedSeats }).eq("id", roomId);
    } else {
      setSeats(updatedSeats);
    }
    showToast("Đã sẵn sàng chiến đấu!");
  };

  // Nhà cái Whis chia bài ván mới
  const startNewHand = async () => {
    setIsDealingAnimation(true);
    setTimeout(() => setIsDealingAnimation(false), 1200);

    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank, value: RANK_VALUES[rank], color: (suit === '♥' || suit === '♦') ? 'text-red-600' : 'text-gray-900' });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const updatedSeats = seats.map(seat => {
      if (!seat || !seat.isReady) return seat;
      const c1 = deck.pop()!;
      const c2 = deck.pop()!;
      return {
        ...seat,
        cards: [c1, c2],
        currentBet: 100,
        chips: Math.max(0, seat.chips - 100),
        folded: false,
        isObserving: false
      };
    });

    const activePlayersCount = updatedSeats.filter(s => s && !s.isObserving && s.isReady).length;
    const initialPot = activePlayersCount * 100;

    if (roomId) {
      await supabase.from("poker_rooms").update({
        seats: updatedSeats,
        pot: initialPot,
        community_cards: [],
        phase: "PREFLOP"
      }).eq("id", roomId);
    } else {
      setSeats(updatedSeats);
      setPot(initialPot);
      setPhase("PREFLOP");
    }
    setDealerMsg("Nhà cái Whis chia bài cho các chiến binh!");
  };

  const handleAction = async (action: 'fold' | 'call' | 'raise' | 'allin', customBet?: number) => {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank, value: RANK_VALUES[rank], color: (suit === '♥' || suit === '♦') ? 'text-red-600' : 'text-gray-900' });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    let nextPhase = phase;
    let nextCards = [...communityCards];
    let addedBet = customBet || raiseVal;
    if (action === 'allin') addedBet = myKi;

    if (phase === 'PREFLOP') {
      nextCards = [deck.pop()!, deck.pop()!, deck.pop()!];
      nextPhase = 'FLOP';
      setDealerMsg("Nhà cái Whis lật FLOP!");
    } else if (phase === 'FLOP') {
      nextCards.push(deck.pop()!);
      nextPhase = 'TURN';
      setDealerMsg("Nhà cái Whis lật TURN!");
    } else if (phase === 'TURN') {
      nextCards.push(deck.pop()!);
      nextPhase = 'RIVER';
      setDealerMsg("Nhà cái Whis lật RIVER!");
    } else if (phase === 'RIVER') {
      nextPhase = 'SHOWDOWN';
      setDealerMsg("Mở bài! Trao thưởng Pot!");
      startCountdown();
    }

    const newPot = pot + (action === 'fold' ? 0 : addedBet);

    if (roomId) {
      await supabase.from("poker_rooms").update({
        community_cards: nextCards,
        phase: nextPhase,
        pot: newPot
      }).eq("id", roomId);
    } else {
      setCommunityCards(nextCards);
      setPhase(nextPhase);
      setPot(newPot);
    }
  };

  const startCountdown = () => {
    setCountdown(10);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev !== null && prev > 1) return prev - 1;
        clearInterval(timer);
        setPhase('IDLE');
        setIsReadyClicked(false);
        return null;
      });
    }, 1000);
  };

  if (!inRoom) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/40 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="relative z-10 w-full max-w-md bg-gray-900/90 border-2 border-yellow-500/50 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <span className="text-4xl animate-bounce">👑</span>
            <h1 className="text-2xl font-black text-yellow-400 uppercase font-mono">TEXAS HOLD'EM POKER</h1>
            <p className="text-slate-400 text-xs">Phòng ROOM_1 & ROOM_2 (5 Ghế Chuẩn)</p>
          </div>
          <div className="space-y-4">
            <button
              onClick={handleAutoMatch}
              disabled={matching}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-950 font-black py-3.5 rounded-2xl hover:brightness-110 active:scale-95 transition text-sm"
            >
              ⚡ GHÉP BÀN TỰ ĐỘNG
            </button>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ROOM_1 HOẶC ROOM_2"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value)}
                className="flex-1 bg-gray-950 border border-gray-700 text-xs text-yellow-400 font-mono px-4 py-2.5 rounded-xl uppercase"
              />
              <button onClick={() => {}} className="bg-emerald-600 px-4 py-2.5 rounded-xl font-bold text-xs">VÀO</button>
            </div>
          </div>
          <div className="text-center pt-2">
            <Link href="/" className="text-xs text-gray-400 hover:text-yellow-400 font-bold">← Trang Chủ</Link>
          </div>
        </div>
      </div>
    );
  }

  const mySeatIndex = seats.findIndex(s => s && s.id === currentUser?.id);
  const mySeat = mySeatIndex !== -1 ? seats[mySeatIndex] : null;

  return (
    <div className="bg-gray-950 text-white min-h-screen flex flex-col justify-between select-none overflow-hidden font-sans">
      
      {toastMsg && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 bg-yellow-500 text-gray-950 px-5 py-1 rounded-full font-black text-xs z-50 shadow-2xl">
          🔔 {toastMsg}
        </div>
      )}

      {/* Top Header */}
      <header className="bg-gray-900/90 border-b border-yellow-600/30 px-3 py-1.5 flex justify-between items-center z-30">
        <div className="flex items-center gap-2">
          <span className="text-base">👑</span>
          <div>
            <h1 className="text-xs font-black text-yellow-400 uppercase font-mono">Poker VIP Pro</h1>
            <p className="text-[9px] text-gray-400">Bàn #{roomCode} • Blinds $50/$100</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[8px] text-gray-400 font-bold uppercase">Tổng Pot</p>
            <p className="text-sm font-black text-yellow-400 font-mono">${pot.toLocaleString()}</p>
          </div>
          <button onClick={handleLeaveRoom} className="bg-gray-800 text-rose-400 px-2.5 py-1 rounded-lg text-[11px] font-bold hover:bg-gray-700">Rời Bàn 🚪</button>
        </div>
      </header>

      {/* Main Table Playfield (Tự khít khung hình iPhone ngang nhờ flex-1 & object-fit) */}
      <main className="flex-1 flex items-center justify-center p-1 sm:p-3 relative overflow-hidden">
        
        <div 
          className="w-full max-w-[880px] h-[340px] sm:h-[420px] rounded-[180px] sm:rounded-[220px] border-6 sm:border-8 border-yellow-700/40 relative flex items-center justify-center shadow-2xl mx-2"
          style={{ 
            background: "radial-gradient(circle at center, #1b7a3e 0%, #0e4b25 70%, #062b14 100%)",
            boxShadow: "inset 0 0 80px rgba(0,0,0,0.8), 0 0 0 10px #4a2810, 0 20px 40px rgba(0,0,0,0.9)"
          }}
        >
          {/* Logo Watermark */}
          <div className="absolute inset-6 rounded-[160px] border border-emerald-400/10 pointer-events-none flex items-center justify-center">
            <span className="text-emerald-500/10 font-black text-3xl sm:text-5xl tracking-[0.2em] font-mono uppercase select-none">
              POKER ROYALE
            </span>
          </div>

          {/* NHÀ CÁI WHIS (Ở GIỮA PHÍA TRÊN - ĐƯỢC CÁCH LY AN TOÀN KHÔNG BỊ GHẾ ĐÈ) */}
          <div className="absolute top-2 sm:top-3 flex flex-col items-center z-20">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-yellow-400 overflow-hidden bg-indigo-950 shadow-lg">
              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Whis" alt="Whis" className="w-full h-full object-cover" />
            </div>
            <span className="text-[8px] bg-yellow-500 text-black px-2 py-0.2 rounded-full font-black mt-0.5 uppercase">NHÀ CÁI WHIS</span>
            <p className="text-[10px] text-yellow-200 bg-black/60 px-3 py-0.5 rounded-full border border-yellow-500/30 mt-0.5 font-mono">
              {dealerMsg} {countdown !== null && `(${countdown}s)`}
            </p>
          </div>

          {/* BÀI CHUNG VÀ POT TRUNG TÂM */}
          <div className="absolute flex flex-col items-center gap-1 z-10">
            <div className="bg-gray-950/80 px-3 py-0.5 rounded-full border border-yellow-500/50 text-yellow-400 text-xs font-black flex items-center gap-1 shadow-xl">
              <span>🪙 POT:</span>
              <span className="font-mono text-sm">${pot.toLocaleString()}</span>
            </div>

            <div className="flex gap-1 bg-black/40 p-2 rounded-xl border border-white/10 min-h-[50px] sm:min-h-[60px] items-center">
              {communityCards.length === 0 ? (
                <span className="text-[10px] sm:text-xs text-emerald-200/60 font-mono italic px-2">Đợi nhà cái chia bài...</span>
              ) : (
                communityCards.map((card, idx) => (
                  <div key={idx} className="w-8 h-12 sm:w-10 sm:h-15 bg-white rounded-md flex flex-col justify-between p-1 font-black shadow-lg text-gray-900">
                    <span className={`text-[11px] ${card.color}`}>{card.rank}</span>
                    <span className={`text-sm sm:text-base self-center ${card.color}`}>{card.suit}</span>
                    <span className={`text-[11px] self-end ${card.color}`}>{card.rank}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 5 GHẾ PHÂN BỔ ĐỀU QUANH BÀN (ĐÃ XÓA GHẾ SỐ 6, TRÁNH ĐÈ NHÀ CÁI) */}
          {/* Ghế 0: Dưới (Vị trí Bạn) */}
          <div className="absolute bottom-1 sm:bottom-2 flex flex-col items-center z-20">
            {seats[0] ? (
              <div className="flex flex-col items-center">
                <div className={`flex -space-x-3 mb-1 ${isDealingAnimation ? 'animate-bounce' : ''}`}>
                  {seats[0]?.cards?.map((c, i) => (
                    <div key={i} className="w-8 h-11 sm:w-9 sm:h-12 bg-white rounded flex flex-col justify-between p-0.5 text-gray-900 text-[10px] font-bold shadow-md border border-gray-300">
                      <span className={c.color}>{c.rank}{c.suit}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 bg-gray-900/90 px-3 py-0.5 sm:py-1 rounded-full border-2 border-yellow-400 shadow-xl">
                  <img src={seats[0]?.avatar} className="w-6 h-6 rounded-full bg-gray-800" />
                  <div className="text-left">
                    <p className="text-[9px] font-black text-yellow-400 leading-none">{seats[0]?.name} (Bạn)</p>
                    <p className="text-[11px] font-mono font-bold">${seats[0]?.chips.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : <div className="w-8 h-8 rounded-full border border-dashed border-white/30 bg-black/30 text-[8px] flex items-center justify-center text-white/40">Ghế 1</div>}
          </div>

          {/* Ghế 1: Dưới Trái */}
          <div className="absolute bottom-6 sm:bottom-8 left-[8%] sm:left-[12%] flex flex-col items-center z-10">
            {seats[1] ? (
              <div className="flex flex-col items-center">
                <div className="w-7 h-10 sm:w-8 sm:h-11 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[9px] font-mono">🎴🎴</div>
                <span className="text-[8px] sm:text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-yellow-400 font-bold mt-0.5">{seats[1]?.name} (${seats[1]?.chips})</span>
              </div>
            ) : <div className="w-8 h-8 rounded-full border border-dashed border-white/20 bg-black/20 text-[8px] flex items-center justify-center text-white/40">Ghế 2</div>}
          </div>

          {/* Ghế 2: Trên Trái */}
          <div className="absolute top-10 sm:top-12 left-[8%] sm:left-[12%] flex flex-col items-center z-10">
            {seats[2] ? (
              <div className="flex flex-col items-center">
                <span className="text-[8px] sm:text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-yellow-400 font-bold mb-0.5">{seats[2]?.name} (${seats[2]?.chips})</span>
                <div className="w-7 h-10 sm:w-8 sm:h-11 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[9px] font-mono">🎴🎴</div>
              </div>
            ) : <div className="w-8 h-8 rounded-full border border-dashed border-white/20 bg-black/20 text-[8px] flex items-center justify-center text-white/40">Ghế 3</div>}
          </div>

          {/* Ghế 3: Trên Phải */}
          <div className="absolute top-10 sm:top-12 right-[8%] sm:right-[12%] flex flex-col items-center z-10">
            {seats[3] ? (
              <div className="flex flex-col items-center">
                <span className="text-[8px] sm:text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-yellow-400 font-bold mb-0.5">{seats[3]?.name} (${seats[3]?.chips})</span>
                <div className="w-7 h-10 sm:w-8 sm:h-11 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[9px] font-mono">🎴🎴</div>
              </div>
            ) : <div className="w-8 h-8 rounded-full border border-dashed border-white/20 bg-black/20 text-[8px] flex items-center justify-center text-white/40">Ghế 4</div>}
          </div>

          {/* Ghế 4: Dưới Phải */}
          <div className="absolute bottom-6 sm:bottom-8 right-[8%] sm:right-[12%] flex flex-col items-center z-10">
            {seats[4] ? (
              <div className="flex flex-col items-center">
                <div className="w-7 h-10 sm:w-8 sm:h-11 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[9px] font-mono">🎴🎴</div>
                <span className="text-[8px] sm:text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-yellow-400 font-bold mt-0.5">{seats[4]?.name} (${seats[4]?.chips})</span>
              </div>
            ) : <div className="w-8 h-8 rounded-full border border-dashed border-white/20 bg-black/20 text-[8px] flex items-center justify-center text-white/40">Ghế 5</div>}
          </div>

        </div>
      </main>

      {/* FOOTER CƯỢC & NÚT SẴN SÀNG */}
      <footer className="bg-gray-900 border-t border-gray-800 p-2 px-4 z-30">
        <div className="max-w-4xl mx-auto flex flex-col gap-1.5">
          
          {mySeat?.isObserving ? (
            <div className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-4 py-2 rounded-xl font-bold text-xs text-center">
              👀 Đang quan sát. Ván sau sẽ tự động tham gia!
            </div>
          ) : phase === 'IDLE' ? (
            <div className="flex gap-2 w-full">
              {!isReadyClicked ? (
                <button
                  onClick={handleToggleReady}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg active:scale-95 transition text-xs uppercase"
                >
                  🟢 SẴN SÀNG (READY)
                </button>
              ) : (
                <div className="flex-1 py-2 bg-emerald-950 text-emerald-300 border border-emerald-600/40 font-bold rounded-xl text-xs text-center flex items-center justify-center gap-2">
                  <span>✅ ĐÃ SẴN SÀNG - ĐỢI NHÀ CÁI WHIS CHIA BÀI</span>
                </div>
              )}

              {/* Chủ phòng hoặc bất kỳ ai cũng có thể bấm phát bài nếu muốn */}
              <button
                onClick={startNewHand}
                className="py-2.5 px-6 bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-950 font-black rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition text-xs uppercase"
              >
                ▶️ CHIA BÀI
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              
              {/* THANH CHỌN CHIP CƯỢC NHANH */}
              <div className="flex items-center justify-between gap-2 bg-gray-950/80 p-1 px-3 rounded-xl border border-gray-800">
                <span className="text-[10px] text-yellow-400 font-mono font-bold shrink-0">Cược: ${raiseVal}</span>
                <input
                  type="range"
                  min={50}
                  max={myKi}
                  step={50}
                  value={raiseVal}
                  onChange={(e) => setRaiseVal(Number(e.target.value))}
                  className="flex-1 accent-yellow-500 h-1"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setRaiseVal(50)} className="bg-emerald-950 text-emerald-400 border border-emerald-600/40 px-2 py-0.5 rounded text-[10px] font-bold">🪙 $50</button>
                  <button onClick={() => setRaiseVal(100)} className="bg-blue-950 text-blue-400 border border-blue-600/40 px-2 py-0.5 rounded text-[10px] font-bold">🪙 $100</button>
                  <button onClick={() => setRaiseVal(500)} className="bg-purple-950 text-purple-400 border border-purple-600/40 px-2 py-0.5 rounded text-[10px] font-bold">🪙 $500</button>
                  <button onClick={() => setRaiseVal(1000)} className="bg-amber-950 text-amber-400 border border-amber-600/40 px-2 py-0.5 rounded text-[10px] font-bold">🪙 $1k</button>
                </div>
              </div>

              {/* NÚT THAO TÁC GAME */}
              <div className="flex items-center gap-2 w-full">
                <button 
                  onClick={() => handleAction('fold')} 
                  className="flex-1 bg-red-600/30 text-red-400 border border-red-500/40 py-2 rounded-xl font-bold text-xs hover:bg-red-600/50 active:scale-95"
                >
                  ÚP BÀI (FOLD)
                </button>
                <button 
                  onClick={() => handleAction('call')} 
                  className="flex-1 bg-blue-600/30 text-blue-400 border border-blue-500/40 py-2 rounded-xl font-bold text-xs hover:bg-blue-600/50 active:scale-95"
                >
                  THEO (CALL)
                </button>
                <button 
                  onClick={() => handleAction('raise')} 
                  className="flex-1 bg-yellow-500 text-gray-950 font-black py-2 rounded-xl text-xs hover:bg-yellow-400 active:scale-95 shadow-lg shadow-yellow-500/20"
                >
                  TỐ (${raiseVal})
                </button>
                <button 
                  onClick={() => handleAction('allin')} 
                  className="bg-purple-600 text-white font-black px-4 py-2 rounded-xl text-xs hover:bg-purple-500 active:scale-95 shadow-lg shadow-purple-600/30"
                >
                  ALL-IN 🔥
                </button>
              </div>

            </div>
          )}

        </div>
      </footer>

    </div>
  );
}