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

  // User State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myKi, setMyKi] = useState(10000);
  const [myName, setMyName] = useState("Chiến Binh");
  const [myAvatar, setMyAvatar] = useState("");

  // Zoom & Layout Mobile Safari State
  const [tableScale, setTableScale] = useState<number>(1);

  // Game Realtime State
  const [seats, setSeats] = useState<(SeatPlayer | null)[]>([null, null, null, null, null, null]);
  const [pot, setPot] = useState(0);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [phase, setPhase] = useState<GamePhase>('IDLE');
  const [dealerMsg, setDealerMsg] = useState("Nhà cái Whis đã sẵn sàng chia bài!");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [raiseVal, setRaiseVal] = useState(100);

  // Animation Chia bài State
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

  // GHÉP BÀN: CHỈ CHỌN 1 TRONG 2 PHÒNG CỐ ĐỊNH (ROOM_1 HOẶC ROOM_2)
  const handleAutoMatch = async () => {
    if (!currentUser) return;
    setMatching(true);
    showToast("Đang tìm ghế trống trong 2 phòng...");

    try {
      // Tìm 2 phòng cố định ROOM_1 và ROOM_2
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
        isReady: true,
        isObserving: false
      };

      if (fixedRooms && fixedRooms.length > 0) {
        // Tìm phòng nào còn ghế trống (ghế null)
        let targetRoom = fixedRooms.find(r => {
          const sList = r.seats || [];
          return sList.some((s: any) => s === null);
        });

        // Nếu cả 2 đều đầy, chọn đại ROOM_1 vào ngồi quan sát
        if (!targetRoom) targetRoom = fixedRooms[0];

        let currentSeats: (SeatPlayer | null)[] = targetRoom.seats || [null, null, null, null, null, null];
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
        showToast(`Đã vào sòng #${targetRoom.code}`);
      } else {
        alert("Chưa khởi tạo 2 phòng cố định trên Supabase!");
      }
    } catch (e) {
      setInRoom(true);
      setRoomCode("ROOM_1");
    } finally {
      setMatching(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!inputRoomCode.trim()) return;
    const codeUpper = inputRoomCode.trim().toUpperCase();
    if (codeUpper !== "ROOM_1" && codeUpper !== "ROOM_2") {
      alert("Hệ thống chỉ có 2 phòng cố định: ROOM_1 hoặc ROOM_2!");
      return;
    }
    setMatching(true);

    try {
      const { data: room } = await supabase.from("poker_rooms").select("*").eq("code", codeUpper).single();
      if (room) {
        let currentSeats = room.seats || [null, null, null, null, null, null];
        const emptyIndex = currentSeats.findIndex((s: any) => s === null);
        
        const myData: SeatPlayer = {
          id: currentUser.id,
          name: myName,
          avatar: myAvatar,
          chips: myKi,
          cards: [],
          currentBet: 0,
          folded: false,
          isReady: emptyIndex !== -1,
          isObserving: room.phase !== "IDLE" || emptyIndex === -1
        };

        if (emptyIndex !== -1) currentSeats[emptyIndex] = myData;
        await supabase.from("poker_rooms").update({ seats: currentSeats }).eq("id", room.id);

        setRoomId(room.id);
        setRoomCode(room.code);
        setInRoom(true);
      }
    } catch (e) {
      alert("Lỗi kết nối!");
    } finally {
      setMatching(false);
    }
  };

  // Đồng bộ Realtime Supabase
  useEffect(() => {
    if (!roomId) return;
    const fetchRoom = async () => {
      const { data } = await supabase.from("poker_rooms").select("*").eq("id", roomId).single();
      if (data) {
        setSeats(data.seats || [null, null, null, null, null, null]);
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
  };

  // Nhà cái Whis chia bài ván mới kèm hiệu ứng
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
      if (!seat) return null;
      const c1 = deck.pop()!;
      const c2 = deck.pop()!;
      return {
        ...seat,
        cards: [c1, c2],
        currentBet: 100,
        chips: Math.max(0, seat.chips - 100),
        folded: false,
        isObserving: false,
        isReady: true
      };
    });

    const activePlayersCount = updatedSeats.filter(s => s && !s.isObserving).length;
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
    setDealerMsg("Nhà cái Whis đang vung bài chia cho 6 ghế!");
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
      setDealerMsg("Nhà cái Whis lật 3 lá bài chung (FLOP)!");
    } else if (phase === 'FLOP') {
      nextCards.push(deck.pop()!);
      nextPhase = 'TURN';
      setDealerMsg("Nhà cái Whis lật lá bài thứ 4 (TURN)!");
    } else if (phase === 'TURN') {
      nextCards.push(deck.pop()!);
      nextPhase = 'RIVER';
      setDealerMsg("Nhà cái Whis lật lá bài cuối cùng (RIVER)!");
    } else if (phase === 'RIVER') {
      nextPhase = 'SHOWDOWN';
      setDealerMsg("Mở bài! Nhà cái Whis trao thưởng Pot!");
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
        return null;
      });
    }, 1000);
  };

  // SẢNH GHÉP BÀN (CHỈ CÓ 2 PHÒNG CỐ ĐỊNH)
  if (!inRoom) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/40 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="relative z-10 w-full max-w-md bg-gray-900/90 border-2 border-yellow-500/50 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <span className="text-4xl animate-bounce">👑</span>
            <h1 className="text-2xl font-black text-yellow-400 uppercase font-mono">TEXAS HOLD'EM POKER</h1>
            <p className="text-slate-400 text-xs">Hệ thống 2 phòng cố định: ROOM_1 & ROOM_2</p>
          </div>
          <div className="space-y-4">
            <button
              onClick={handleAutoMatch}
              disabled={matching}
              className="w-full bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-gray-950 font-black py-3.5 rounded-2xl hover:brightness-110 active:scale-95 transition"
            >
              ⚡ GHÉP BÀN TỰ ĐỘNG (ROOM 1 HOẶC 2)
            </button>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="NHẬP: ROOM_1 HOẶC ROOM_2"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value)}
                className="flex-1 bg-gray-950 border border-gray-700 text-xs text-yellow-400 font-mono px-4 py-2.5 rounded-xl uppercase"
              />
              <button onClick={handleJoinByCode} className="bg-emerald-600 px-4 py-2.5 rounded-xl font-bold text-xs">VÀO</button>
            </div>
          </div>
          <div className="text-center pt-2">
            <Link href="/" className="text-xs text-gray-400 hover:text-yellow-400 font-bold">← Quay lại Trang Chủ</Link>
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
        <div className="fixed top-14 left-1/2 -translate-x-1/2 bg-yellow-500 text-gray-950 px-6 py-1.5 rounded-full font-black text-xs z-50 shadow-2xl">
          🔔 {toastMsg}
        </div>
      )}

      {/* Top Header Navigation gọn gàng cho Safari ngang */}
      <header className="bg-gray-900/90 border-b border-yellow-600/30 px-4 py-2 flex justify-between items-center z-30">
        <div className="flex items-center gap-2">
          <span className="text-lg">👑</span>
          <div>
            <h1 className="text-xs font-black text-yellow-400 uppercase font-mono">Texas Hold'em VIP Pro</h1>
            <p className="text-[10px] text-gray-400">Bàn #{roomCode} • Blinds $50/$100</p>
          </div>
        </div>

        {/* Nút Zoom & Pot */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-950 border border-gray-800 rounded-lg p-0.5">
            <button onClick={() => setTableScale(1)} className={`px-2 py-0.5 text-[10px] font-bold rounded ${tableScale === 1 ? 'bg-yellow-500 text-black' : 'text-gray-400'}`}>100%</button>
            <button onClick={() => setTableScale(1.15)} className={`px-2 py-0.5 text-[10px] font-bold rounded ${tableScale === 1.15 ? 'bg-yellow-500 text-black' : 'text-gray-400'}`}>115%</button>
            <button onClick={() => setTableScale(1.3)} className={`px-2 py-0.5 text-[10px] font-bold rounded ${tableScale === 1.3 ? 'bg-yellow-500 text-black' : 'text-gray-400'}`}>130%</button>
          </div>

          <div className="text-right">
            <p className="text-[9px] text-gray-400 font-bold uppercase">Tổng Pot Bàn</p>
            <p className="text-base font-black text-yellow-400 font-mono">${pot.toLocaleString()}</p>
          </div>
          <button onClick={handleLeaveRoom} className="bg-gray-800 text-rose-400 px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-gray-700">Rời Bàn 🚪</button>
        </div>
      </header>

      {/* Main Poker Table Playfield */}
      <main className="flex-1 flex items-center justify-center p-2 relative overflow-hidden">
        
        {/* Felt Table Oval (Có hỗ trợ Zoom Scale cho Mobile) */}
        <div 
          className="w-[96%] max-w-[960px] h-[440px] sm:h-[490px] rounded-[240px] border-8 border-yellow-700/40 relative flex items-center justify-center shadow-2xl transition-transform duration-300"
          style={{ 
            transform: `scale(${tableScale})`,
            background: "radial-gradient(circle at center, #1b7a3e 0%, #0e4b25 70%, #062b14 100%)",
            boxShadow: "inset 0 0 100px rgba(0,0,0,0.8), 0 0 0 12px #4a2810, 0 25px 50px rgba(0,0,0,0.9)"
          }}
        >
          {/* Logo Watermark */}
          <div className="absolute inset-8 rounded-[200px] border border-emerald-400/10 pointer-events-none flex items-center justify-center">
            <span className="text-emerald-500/10 font-black text-4xl sm:text-6xl tracking-[0.2em] font-mono uppercase select-none">
              POKER ROYALE
            </span>
          </div>

          {/* NHÀ CÁI WHIS (Ở GIỮA PHÍA TRÊN) */}
          <div className="absolute top-3 flex flex-col items-center z-20">
            <div className="w-11 h-11 rounded-full border-2 border-yellow-400 overflow-hidden bg-indigo-950 shadow-lg">
              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Whis" alt="Whis" className="w-full h-full object-cover" />
            </div>
            <span className="text-[8px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-black mt-0.5 uppercase">NHÀ CÁI WHIS</span>
            <p className="text-[10px] text-yellow-200 bg-black/60 px-3 py-0.5 rounded-full border border-yellow-500/30 mt-0.5 font-mono">
              {dealerMsg} {countdown !== null && `(${countdown}s)`}
            </p>
          </div>

          {/* BÀI CHUNG VÀ POT TRUNG TÂM */}
          <div className="absolute flex flex-col items-center gap-1.5 z-10">
            <div className="bg-gray-950/80 px-4 py-1 rounded-full border border-yellow-500/50 text-yellow-400 text-xs font-black flex items-center gap-1 shadow-xl">
              <span>🪙 POT:</span>
              <span className="font-mono text-sm">${pot.toLocaleString()}</span>
            </div>

            <div className="flex gap-1.5 bg-black/40 p-2 rounded-xl border border-white/10 min-h-[60px] items-center">
              {communityCards.length === 0 ? (
                <span className="text-[11px] text-emerald-200/60 font-mono italic px-3">Đợi nhà cái Whis chia bài...</span>
              ) : (
                communityCards.map((card, idx) => (
                  <div key={idx} className="w-9 h-13 sm:w-11 sm:h-16 bg-white rounded-md flex flex-col justify-between p-1 font-black shadow-lg text-gray-900">
                    <span className={`text-xs ${card.color}`}>{card.rank}</span>
                    <span className={`text-sm self-center ${card.color}`}>{card.suit}</span>
                    <span className={`text-xs self-end ${card.color}`}>{card.rank}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 6 GHẾ PHÂN BỔ ĐỀU QUANH BÀN */}
          {/* Ghế 0: Dưới (Vị trí Bạn) */}
          <div className="absolute bottom-2 flex flex-col items-center z-20">
            {seats[0] ? (
              <div className="flex flex-col items-center">
                <div className={`flex -space-x-3 mb-1 ${isDealingAnimation ? 'animate-bounce' : ''}`}>
                  {seats[0]?.cards?.map((c, i) => (
                    <div key={i} className="w-9 h-12 bg-white rounded flex flex-col justify-between p-0.5 text-gray-900 text-[10px] font-bold shadow-md border border-gray-300">
                      <span className={c.color}>{c.rank}{c.suit}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 bg-gray-900/90 px-3 py-1 rounded-full border-2 border-yellow-400 shadow-xl">
                  <img src={seats[0]?.avatar} className="w-7 h-7 rounded-full bg-gray-800" />
                  <div className="text-left">
                    <p className="text-[9px] font-black text-yellow-400 leading-none">{seats[0]?.name} (Bạn)</p>
                    <p className="text-xs font-mono font-bold">${seats[0]?.chips.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : <div className="w-9 h-9 rounded-full border border-dashed border-white/30 bg-black/30 text-[9px] flex items-center justify-center text-white/40">Ghế 1</div>}
          </div>

          {/* Ghế 1: Dưới Trái */}
          <div className="absolute bottom-8 left-[10%] flex flex-col items-center z-10">
            {seats[1] ? (
              <div className="flex flex-col items-center">
                <div className="w-8 h-11 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[9px] font-mono">🎴🎴</div>
                <span className="text-[9px] bg-black/60 px-2 py-0.5 rounded text-yellow-400 font-bold mt-1">{seats[1]?.name} (${seats[1]?.chips})</span>
              </div>
            ) : <div className="w-9 h-9 rounded-full border border-dashed border-white/20 bg-black/20 text-[8px] flex items-center justify-center text-white/40">Ghế 2</div>}
          </div>

          {/* Ghế 2: Trên Trái */}
          <div className="absolute top-8 left-[10%] flex flex-col items-center z-10">
            {seats[2] ? (
              <div className="flex flex-col items-center">
                <span className="text-[9px] bg-black/60 px-2 py-0.5 rounded text-yellow-400 font-bold mb-1">{seats[2]?.name} (${seats[2]?.chips})</span>
                <div className="w-8 h-11 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[9px] font-mono">🎴🎴</div>
              </div>
            ) : <div className="w-9 h-9 rounded-full border border-dashed border-white/20 bg-black/20 text-[8px] flex items-center justify-center text-white/40">Ghế 3</div>}
          </div>

          {/* Ghế 3: Trên Phải */}
          <div className="absolute top-8 right-[10%] flex flex-col items-center z-10">
            {seats[3] ? (
              <div className="flex flex-col items-center">
                <span className="text-[9px] bg-black/60 px-2 py-0.5 rounded text-yellow-400 font-bold mb-1">{seats[3]?.name} (${seats[3]?.chips})</span>
                <div className="w-8 h-11 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[9px] font-mono">🎴🎴</div>
              </div>
            ) : <div className="w-9 h-9 rounded-full border border-dashed border-white/20 bg-black/20 text-[8px] flex items-center justify-center text-white/40">Ghế 4</div>}
          </div>

          {/* Ghế 4: Dưới Phải */}
          <div className="absolute bottom-8 right-[10%] flex flex-col items-center z-10">
            {seats[4] ? (
              <div className="flex flex-col items-center">
                <div className="w-8 h-11 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[9px] font-mono">🎴🎴</div>
                <span className="text-[9px] bg-black/60 px-2 py-0.5 rounded text-yellow-400 font-bold mt-1">{seats[4]?.name} (${seats[4]?.chips})</span>
              </div>
            ) : <div className="w-9 h-9 rounded-full border border-dashed border-white/20 bg-black/20 text-[8px] flex items-center justify-center text-white/40">Ghế 5</div>}
          </div>

          {/* Ghế 5: Phía Sau Nhà Cái */}
          <div className="absolute top-1 right-[38%] flex flex-col items-center z-10">
            {seats[5] ? (
              <div className="flex flex-col items-center">
                <span className="text-[8px] bg-black/60 px-1.5 py-0.5 rounded text-yellow-400 font-bold mb-0.5">{seats[5]?.name}</span>
                <div className="w-7 h-9 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[8px]">🎴</div>
              </div>
            ) : <div className="w-7 h-7 rounded-full border border-dashed border-white/20 bg-black/20 text-[8px] flex items-center justify-center text-white/30">Ghế 6</div>}
          </div>

        </div>
      </main>

      {/* FOOTER ĐẶT CƯỢC: CÓ CHIP $50, $100, $500, $1000 & THANH SLIDER TÙY CHỈNH */}
      <footer className="bg-gray-900 border-t border-gray-800 p-2.5 px-4 z-30">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          
          {mySeat?.isObserving ? (
            <div className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-4 py-2 rounded-xl font-bold text-xs text-center">
              👀 Bạn đang ở chế độ Quan sát. Ván mới sẽ tự động đưa bạn vào chơi!
            </div>
          ) : phase === 'IDLE' ? (
            <button
              onClick={startNewHand}
              className="w-full py-2.5 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-gray-950 font-black rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition text-xs uppercase"
            >
              ▶️ BẮT ĐẦU VÁN MỚI VỚI NHÀ CÁI WHIS
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              
              {/* THANH CHỌN MỨC CƯỢC NHANH & CHIP */}
              <div className="flex items-center justify-between gap-2 bg-gray-950/80 p-1.5 px-3 rounded-xl border border-gray-800">
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

              {/* NÚT THAO TÁC CƯỢC CHÍNH */}
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