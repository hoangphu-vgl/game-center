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

  // 6 Ghế ngồi xung quanh bàn
  const [seats, setSeats] = useState<(SeatPlayer | null)[]>([null, null, null, null, null, null]);
  const [pot, setPot] = useState(0);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [phase, setPhase] = useState<GamePhase>('IDLE');
  const [dealerMsg, setDealerMsg] = useState("Nhà cái Whis đã sẵn sàng chia bài!");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [raiseVal, setRaiseVal] = useState(500);

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance, full_name")
          .eq("id", session.user.id)
          .single();
        if (profile) setMyKi(profile.balance || 5000);
      } else {
        const guestId = "guest_" + Math.floor(Math.random() * 8999 + 1000);
        setCurrentUser({ id: guestId, user_metadata: { username: `Chiến Binh_${guestId.slice(-4)}` } });
      }
    }
    loadUser();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Ghép bàn tự động hoặc tạo bàn mới
  const handleAutoMatch = async () => {
    if (!currentUser) return;
    setMatching(true);
    showToast("Đang tìm bàn Poker trống...");

    try {
      const { data: openRooms } = await supabase
        .from("poker_rooms")
        .select("*")
        .eq("status", "WAITING")
        .limit(1);

      const myData: SeatPlayer = {
        id: currentUser.id,
        name: currentUser.user_metadata?.username || "Chiến Binh",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=" + currentUser.id,
        chips: myKi,
        cards: [],
        currentBet: 0,
        folded: false,
        isReady: true,
        isObserving: false
      };

      if (openRooms && openRooms.length > 0) {
        const room = openRooms[0];
        let currentSeats = room.seats || [null, null, null, null, null, null];
        // Tìm ghế trống đầu tiên
        const emptyIndex = currentSeats.findIndex((s: any) => s === null);
        if (emptyIndex !== -1) {
          currentSeats[emptyIndex] = myData;
        } else {
          myData.isObserving = true; // Hết ghế thì vào ngồi quan sát
        }

        await supabase.from("poker_rooms").update({ seats: currentSeats }).eq("id", room.id);
        setRoomId(room.id);
        setRoomCode(room.code);
        setInRoom(true);
        showToast(`Đã vào phòng #${room.code}!`);
      } else {
        const generatedCode = "ROOM_" + Math.floor(Math.random() * 899 + 100);
        const initialSeats = [myData, null, null, null, null, null];

        const { data: createdRoom } = await supabase.from("poker_rooms").insert([{
          code: generatedCode,
          seats: initialSeats,
          status: "WAITING",
          pot: 0,
          community_cards: [],
          phase: "IDLE"
        }]).select().single();

        if (createdRoom) {
          setRoomId(createdRoom.id);
          setRoomCode(createdRoom.code);
          setInRoom(true);
          showToast(`Đã tạo bàn #${generatedCode}!`);
        }
      }
    } catch (e) {
      // Local fallback nếu lỗi supabase
      const myData: SeatPlayer = {
        id: currentUser.id,
        name: currentUser.user_metadata?.username || "Bạn",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=hero",
        chips: myKi,
        cards: [],
        currentBet: 0,
        folded: false,
        isReady: true,
        isObserving: false
      };
      setSeats([myData, null, null, null, null, null]);
      setRoomCode("LOCAL");
      setInRoom(true);
    } finally {
      setMatching(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!inputRoomCode.trim()) return;
    setMatching(true);
    const codeUpper = inputRoomCode.trim().toUpperCase();

    try {
      const { data: room } = await supabase.from("poker_rooms").select("*").eq("code", codeUpper).single();
      if (room) {
        let currentSeats = room.seats || [null, null, null, null, null, null];
        const emptyIndex = currentSeats.findIndex((s: any) => s === null);
        const myData: SeatPlayer = {
          id: currentUser.id,
          name: currentUser.user_metadata?.username || "Khách",
          avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=" + currentUser.id,
          chips: myKi,
          cards: [],
          currentBet: 0,
          folded: false,
          isReady: emptyIndex !== -1,
          isObserving: emptyIndex === -1
        };

        if (emptyIndex !== -1) currentSeats[emptyIndex] = myData;
        await supabase.from("poker_rooms").update({ seats: currentSeats }).eq("id", room.id);

        setRoomId(room.id);
        setRoomCode(room.code);
        setInRoom(true);
      } else {
        alert("Không tìm thấy phòng!");
      }
    } catch (e) {
      alert("Lỗi kết nối phòng!");
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
        setSeats(data.seats || [null, null, null, null, null, null]);
        setPot(data.pot || 0);
        setCommunityCards(data.community_cards || []);
        setPhase(data.phase || 'IDLE');
      }
    };
    fetchRoom();

    const channel = supabase.channel(`room_${roomId}`)
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

  // Nhà cái Whis chia bài ván mới
  const startNewHand = async () => {
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
      if (!seat || seat.isObserving || !seat.isReady) return seat;
      const c1 = deck.pop()!;
      const c2 = deck.pop()!;
      return { ...seat, cards: [c1, c2], currentBet: 100, chips: Math.max(0, seat.chips - 100), folded: false };
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
    setDealerMsg("Nhà cái Whis đã chia 2 lá bài tẩy cho các tay chơi!");
  };

  // Tiến trình lật bài chung tự động qua các vòng
  const handleAction = async (action: 'fold' | 'call' | 'raise') => {
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

    if (roomId) {
      await supabase.from("poker_rooms").update({
        community_cards: nextCards,
        phase: nextPhase
      }).eq("id", roomId);
    } else {
      setCommunityCards(nextCards);
      setPhase(nextPhase);
    }
  };

  // Đếm ngược 10s bắt đầu ván mới
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

  if (!inRoom) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/40 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="relative z-10 w-full max-w-md bg-gray-900/90 border-2 border-yellow-500/50 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <span className="text-4xl animate-bounce">👑</span>
            <h1 className="text-2xl font-black text-yellow-400 uppercase font-mono">TEXAS HOLD'EM POKER</h1>
            <p className="text-slate-400 text-xs">Bàn 6 ghế tiêu chuẩn • Chơi với Nhà cái Whis</p>
          </div>
          <div className="space-y-4">
            <button
              onClick={handleAutoMatch}
              disabled={matching}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-950 font-black py-3.5 rounded-2xl hover:brightness-110 active:scale-95 transition"
            >
              ⚡ GHÉP BÀN TỰ ĐỘNG
            </button>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="MÃ PHÒNG"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value)}
                className="flex-1 bg-gray-950 border border-gray-700 text-sm text-yellow-400 font-mono px-4 py-2.5 rounded-xl uppercase"
              />
              <button onClick={handleJoinByCode} className="bg-emerald-600 px-4 py-2.5 rounded-xl font-bold text-xs">VÀO</button>
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
  const myPlayer = mySeatIndex !== -1 ? seats[mySeatIndex] : null;

  return (
    <div className="bg-gray-950 text-white min-h-screen flex flex-col justify-between select-none overflow-hidden font-sans">
      
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-yellow-500 text-gray-950 px-6 py-2 rounded-full font-black text-sm z-50 shadow-2xl">
          🔔 {toastMsg}
        </div>
      )}

      {/* Top Header */}
      <header className="bg-gray-900/90 border-b border-yellow-600/30 px-4 py-3 flex justify-between items-center z-30">
        <div className="flex items-center gap-3">
          <span className="text-xl">👑</span>
          <div>
            <h1 className="text-sm font-black text-yellow-400 uppercase font-mono">Poker VIP Royale</h1>
            <p className="text-xs text-gray-400">Phòng: #{roomCode || "LOCAL"} • Bàn 6 Ghế</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-bold">Tổng Pot</p>
            <p className="text-lg font-black text-yellow-400 font-mono">${pot.toLocaleString()}</p>
          </div>
          <button onClick={() => { setInRoom(false); setRoomId(null); }} className="bg-gray-800 text-rose-400 px-3 py-1.5 rounded-xl text-xs font-bold">Rời Bàn</button>
        </div>
      </header>

      {/* Main Table Playfield */}
      <main className="flex-1 flex items-center justify-center p-2 relative">
        
        {/* Bàn Thảm Xanh Oval */}
        <div 
          className="w-[95%] max-w-[980px] h-[480px] md:h-[530px] rounded-[240px] border-8 border-yellow-700/40 relative flex items-center justify-center shadow-2xl"
          style={{ background: "radial-gradient(circle at center, #1b7a3e 0%, #0e4b25 70%, #062b14 100%)", boxShadow: "inset 0 0 100px rgba(0,0,0,0.8), 0 0 0 12px #4a2810, 0 25px 50px rgba(0,0,0,0.9)" }}
        >
          
          {/* --- NHÀ CÁI WHIS (Ở GIỮA PHÍA TRÊN) --- */}
          <div className="absolute top-4 flex flex-col items-center z-10">
            <div className="w-12 h-12 rounded-full border-2 border-yellow-400 overflow-hidden bg-indigo-950 shadow-lg">
              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Whis" alt="Whis" className="w-full h-full object-cover" />
            </div>
            <span className="text-[9px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-black mt-1 uppercase">NHÀ CÁI WHIS</span>
            <p className="text-[11px] text-yellow-200 bg-black/60 px-3 py-0.5 rounded-full border border-yellow-500/30 mt-1 font-mono">
              {dealerMsg} {countdown !== null && `(${countdown}s)`}
            </p>
          </div>

          {/* --- BÀI CHUNG Ở GIỮA BÀN --- */}
          <div className="absolute flex flex-col items-center gap-2 z-10">
            <div className="bg-gray-950/80 px-4 py-1 rounded-full border border-yellow-500/40 text-yellow-400 text-xs font-black">
              POT: <span className="font-mono">${pot.toLocaleString()}</span>
            </div>
            <div className="flex gap-2 bg-black/40 p-2.5 rounded-xl border border-white/10 min-h-[65px] items-center">
              {communityCards.length === 0 ? (
                <span className="text-xs text-emerald-200/60 font-mono italic">Đợi nhà cái chia bài...</span>
              ) : (
                communityCards.map((card, idx) => (
                  <div key={idx} className="w-10 h-14 bg-white rounded-lg flex flex-col justify-between p-1 font-black shadow-lg text-gray-900">
                    <span className={`text-xs ${card.color}`}>{card.rank}</span>
                    <span className={`text-base self-center ${card.color}`}>{card.suit}</span>
                    <span className={`text-xs self-end ${card.color}`}>{card.rank}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* --- 6 GHẾ NGỒI XUNG QUANH BÀN --- */}
          {/* Ghế 0: Dưới (Bạn) */}
          <div className="absolute bottom-2 flex flex-col items-center z-20">
            {seats[0] ? (
              <div className="flex flex-col items-center">
                <div className="flex -space-x-3 mb-1">
                  {seats[0]?.cards?.map((c, i) => (
                    <div key={i} className="w-9 h-12 bg-white rounded flex flex-col justify-between p-0.5 text-gray-900 text-[10px] font-bold">
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
            ) : (
              <button onClick={() => {}} className="w-12 h-12 rounded-full border border-dashed border-white/40 bg-black/30 text-[10px] text-white/60">Ghế 1</button>
            )}
          </div>

          {/* Ghế 1: Dưới Trái */}
          <div className="absolute bottom-8 left-[12%] flex flex-col items-center z-10">
            {seats[1] ? (
              <div className="flex flex-col items-center">
                <div className="w-9 h-12 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[10px] font-mono">🎴🎴</div>
                <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded text-yellow-400 font-bold mt-1">{seats[1]?.name} (${seats[1]?.chips})</span>
              </div>
            ) : <div className="w-10 h-10 rounded-full border border-dashed border-white/20 bg-black/20 text-[9px] flex items-center justify-center text-white/40">Ghế 2</div>}
          </div>

          {/* Ghế 2: Trên Trái */}
          <div className="absolute top-10 left-[12%] flex flex-col items-center z-10">
            {seats[2] ? (
              <div className="flex flex-col items-center">
                <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded text-yellow-400 font-bold mb-1">{seats[2]?.name} (${seats[2]?.chips})</span>
                <div className="w-9 h-12 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[10px] font-mono">🎴🎴</div>
              </div>
            ) : <div className="w-10 h-10 rounded-full border border-dashed border-white/20 bg-black/20 text-[9px] flex items-center justify-center text-white/40">Ghế 3</div>}
          </div>

          {/* Ghế 3: Trên (Đối thủ đối diện) */}
          <div className="absolute top-2 flex flex-col items-center z-10">
            {seats[3] ? (
              <div className="flex flex-col items-center">
                <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded text-yellow-400 font-bold mb-1">{seats[3]?.name} (${seats[3]?.chips})</span>
                <div className="w-9 h-12 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[10px] font-mono">🎴🎴</div>
              </div>
            ) : <div className="w-10 h-10 rounded-full border border-dashed border-white/20 bg-black/20 text-[9px] flex items-center justify-center text-white/40">Ghế 4</div>}
          </div>

          {/* Ghế 4: Trên Phải */}
          <div className="absolute top-10 right-[12%] flex flex-col items-center z-10">
            {seats[4] ? (
              <div className="flex flex-col items-center">
                <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded text-yellow-400 font-bold mb-1">{seats[4]?.name} (${seats[4]?.chips})</span>
                <div className="w-9 h-12 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[10px] font-mono">🎴🎴</div>
              </div>
            ) : <div className="w-10 h-10 rounded-full border border-dashed border-white/20 bg-black/20 text-[9px] flex items-center justify-center text-white/40">Ghế 5</div>}
          </div>

          {/* Ghế 5: Dưới Phải */}
          <div className="absolute bottom-8 right-[12%] flex flex-col items-center z-10">
            {seats[5] ? (
              <div className="flex flex-col items-center">
                <div className="w-9 h-12 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[10px] font-mono">🎴🎴</div>
                <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded text-yellow-400 font-bold mt-1">{seats[5]?.name} (${seats[5]?.chips})</span>
              </div>
            ) : <div className="w-10 h-10 rounded-full border border-dashed border-white/20 bg-black/20 text-[9px] flex items-center justify-center text-white/40">Ghế 6</div>}
          </div>

        </div>
      </main>

      {/* Footer Controls */}
      <footer className="bg-gray-900 border-t border-gray-800 p-3 px-6 z-30">
        <div className="max-w-3xl mx-auto flex justify-center gap-3">
          {phase === 'IDLE' ? (
            <button
              onClick={startNewHand}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-950 font-black rounded-xl shadow-lg hover:brightness-110"
            >
              ▶️ BẮT ĐẦU VÁN MỚI VỚI NHÀ CÁI WHIS
            </button>
          ) : (
            <div className="flex gap-2 w-full">
              <button onClick={() => handleAction('fold')} className="flex-1 bg-red-600/30 text-red-400 py-2.5 rounded-xl font-bold text-xs">ÚP BÀI</button>
              <button onClick={() => handleAction('call')} className="flex-1 bg-blue-600/30 text-blue-400 py-2.5 rounded-xl font-bold text-xs">THEO</button>
              <button onClick={() => handleAction('raise')} className="flex-1 bg-yellow-500 text-gray-950 py-2.5 rounded-xl font-black text-xs">TIẾP TỤC LẬT BÀI</button>
            </div>
          )}
        </div>
      </footer>

    </div>
  );
}