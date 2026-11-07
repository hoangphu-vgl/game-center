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

  // 5 Ghế ngồi phân bổ gọn gàng
  const [seats, setSeats] = useState<(SeatPlayer | null)[]>([null, null, null, null, null]);
  const [pot, setPot] = useState(0);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [phase, setPhase] = useState<GamePhase>('IDLE');
  const [dealerMsg, setDealerMsg] = useState("Nhà cái Whis đã sẵn sàng!");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [raiseVal, setRaiseVal] = useState(100);
  const [isReadyClicked, setIsReadyClicked] = useState(false);

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

  // GHÉP BÀN TỰ ĐỘNG (ROOM_1 HOẶC ROOM_2)
  const handleAutoMatch = async () => {
    if (!currentUser) return;
    setMatching(true);
    showToast("Đang kết nối bàn Poker...");

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
        showToast(`Đã vào bàn #${targetRoom.code}`);
      }
    } catch (e) {
      setInRoom(true);
      setRoomCode("ROOM_1");
    } finally {
      setMatching(false);
    }
  };

  // Realtime Sub dữ liệu
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

  // RỜI BÀN & CƠ CHẾ RESET BÀN TRỐNG KHI KHÔNG CÒN AI
  const handleLeaveRoom = async () => {
    if (roomId && currentUser) {
      const updatedSeats = seats.map(s => s && s.id === currentUser.id ? null : s);
      const isRoomEmpty = updatedSeats.every(s => s === null);

      if (isRoomEmpty) {
        // Reset sạch bàn khi không còn ai chơi
        await supabase.from("poker_rooms").update({
          seats: [null, null, null, null, null],
          pot: 0,
          community_cards: [],
          phase: "IDLE",
          status: "WAITING"
        }).eq("id", roomId);
      } else {
        await supabase.from("poker_rooms").update({ seats: updatedSeats }).eq("id", roomId);
      }
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
    showToast("Đã sẵn sàng!");
  };

  // Bắt đầu chia bài ván mới
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
    setDealerMsg("Nhà cái Whis chia bài ván mới!");
  };

  // Xử lý các vòng cược và cộng/trừ điểm Ki khi SHOWDOWN
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
      setDealerMsg("Mở bài! Nhà cái Whis trao thưởng Pot!");
      
      // TÍNH ĐIỂM VÀ CỘNG THƯỞNG CHO NGƯỜI THẮNG
      handleAwardWinner();
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

  // Hàm tính thưởng & cập nhật điểm balance lên Supabase
  const handleAwardWinner = async () => {
    const activePlayers = seats.filter(s => s && !s.folded && !s.isObserving);
    if (activePlayers.length > 0) {
      const winner = activePlayers[Math.floor(Math.random() * activePlayers.length)];
      if (winner) {
        const rewardPot = pot;
        const newBalance = winner.chips + rewardPot;

        // Cập nhật điểm balance lên Supabase cho winner
        await supabase
          .from("profiles")
          .update({ balance: newBalance })
          .eq("id", winner.id);

        if (winner.id === currentUser?.id) {
          setMyKi(newBalance);
          showToast(`🎉 Bạn đã thắng Pot $${rewardPot.toLocaleString()} Ki!`);
        } else {
          showToast(`🏆 ${winner.name} thắng Pot $${rewardPot.toLocaleString()} Ki!`);
        }
      }
    }
  };

  // Đếm ngược 10s tự động sang ván mới
  const startCountdown = () => {
    setCountdown(10);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev !== null && prev > 1) return prev - 1;
        clearInterval(timer);
        setPhase('IDLE');
        setIsReadyClicked(false);
        setPot(0);
        setCommunityCards([]);
        return null;
      });
    }, 1000);
  };

  if (!inRoom) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/40 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="relative z-10 w-full max-w-sm bg-gray-900/90 border-2 border-yellow-500/50 rounded-3xl p-5 shadow-2xl space-y-5">
          <div className="text-center space-y-1">
            <span className="text-3xl animate-bounce">👑</span>
            <h1 className="text-xl font-black text-yellow-400 uppercase font-mono">TEXAS HOLD'EM POKER</h1>
            <p className="text-slate-400 text-[11px]">Sòng 5 Ghế Realtime Supabase</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={handleAutoMatch}
              disabled={matching}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-950 font-black py-3 rounded-xl hover:brightness-110 active:scale-95 transition text-xs"
            >
              ⚡ GHÉP BÀN TỰ ĐỘNG
            </button>
          </div>
          <div className="text-center pt-1">
            <Link href="/" className="text-[11px] text-gray-400 hover:text-yellow-400 font-bold">← Trang Chủ</Link>
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
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-yellow-500 text-gray-950 px-4 py-1 rounded-full font-black text-[11px] z-50 shadow-2xl">
          🔔 {toastMsg}
        </div>
      )}

      {/* Header thu gọn */}
      <header className="bg-gray-900/90 border-b border-yellow-600/30 px-3 py-1 flex justify-between items-center z-30">
        <div className="flex items-center gap-2">
          <span className="text-sm">👑</span>
          <div>
            <h1 className="text-[11px] font-black text-yellow-400 uppercase font-mono leading-none">Poker VIP Pro</h1>
            <p className="text-[8px] text-gray-400 leading-tight">Phòng #{roomCode} • Blinds $50/$100</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[8px] text-gray-400 font-bold uppercase leading-none">Tổng Pot</p>
            <p className="text-xs font-black text-yellow-400 font-mono leading-tight">${pot.toLocaleString()}</p>
          </div>
          <button onClick={handleLeaveRoom} className="bg-gray-800 text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold hover:bg-gray-700">Rời Bàn 🚪</button>
        </div>
      </header>

      {/* BÀN BÀI OVAL GỌN GÀNG TỰ KHÍT Safari NẰM NGANG */}
      <main className="flex-1 flex items-center justify-center p-1 relative overflow-hidden">
        
        <div 
          className="w-[98%] max-w-[780px] h-[280px] sm:h-[350px] rounded-[150px] border-4 sm:border-6 border-yellow-700/40 relative flex items-center justify-center shadow-2xl"
          style={{ 
            background: "radial-gradient(circle at center, #1b7a3e 0%, #0e4b25 70%, #062b14 100%)",
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.8), 0 0 0 8px #4a2810, 0 15px 30px rgba(0,0,0,0.9)"
          }}
        >
          {/* Watermark Logo */}
          <div className="absolute inset-4 rounded-[120px] border border-emerald-400/10 pointer-events-none flex items-center justify-center">
            <span className="text-emerald-500/10 font-black text-2xl sm:text-4xl tracking-[0.2em] font-mono uppercase select-none">
              POKER ROYALE
            </span>
          </div>

          {/* NHÀ CÁI WHIS (GÓC TRÊN TRUNG TÂM) */}
          <div className="absolute top-1.5 flex flex-col items-center z-20">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-yellow-400 overflow-hidden bg-indigo-950 shadow-md">
              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Whis" alt="Whis" className="w-full h-full object-cover" />
            </div>
            <span className="text-[7px] bg-yellow-500 text-black px-1.5 rounded-full font-black uppercase">NHÀ CÁI WHIS</span>
            <p className="text-[9px] text-yellow-200 bg-black/60 px-2 rounded-full border border-yellow-500/30 mt-0.5 font-mono">
              {dealerMsg} {countdown !== null && `(${countdown}s)`}
            </p>
          </div>

          {/* BÀI CHUNG VÀ POT TRUNG TÂM */}
          <div className="absolute flex flex-col items-center gap-0.5 z-10">
            <div className="bg-gray-950/80 px-2.5 py-0.5 rounded-full border border-yellow-500/50 text-yellow-400 text-[10px] font-black flex items-center gap-1 shadow-lg">
              <span>🪙 POT:</span>
              <span className="font-mono">${pot.toLocaleString()}</span>
            </div>

            <div className="flex gap-1 bg-black/40 p-1.5 rounded-lg border border-white/10 min-h-[45px] items-center">
              {communityCards.length === 0 ? (
                <span className="text-[9px] text-emerald-200/60 font-mono italic px-2">Đợi nhà cái chia bài...</span>
              ) : (
                communityCards.map((card, idx) => (
                  <div key={idx} className="w-7 h-10 sm:w-8 sm:h-12 bg-white rounded flex flex-col justify-between p-0.5 font-black shadow text-gray-900">
                    <span className={`text-[9px] leading-none ${card.color}`}>{card.rank}</span>
                    <span className={`text-xs self-center leading-none ${card.color}`}>{card.suit}</span>
                    <span className={`text-[9px] self-end leading-none ${card.color}`}>{card.rank}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 5 GHẾ NGỒI THU GỌN VẬN HÀNH MƯỢT MÀ */}
          {/* Ghế 0: Dưới (Vị trí Bạn) */}
          <div className="absolute bottom-1 flex flex-col items-center z-20">
            {seats[0] ? (
              <div className="flex flex-col items-center">
                <div className="flex -space-x-2 mb-0.5">
                  {seats[0]?.cards?.map((c, i) => (
                    <div key={i} className="w-7 h-10 bg-white rounded flex flex-col justify-between p-0.5 text-gray-900 text-[9px] font-bold shadow border border-gray-300">
                      <span className={`leading-none ${c.color}`}>{c.rank}{c.suit}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1 bg-gray-900/90 px-2 py-0.5 rounded-full border border-yellow-400 shadow-lg">
                  <img src={seats[0]?.avatar} className="w-5 h-5 rounded-full bg-gray-800" />
                  <div className="text-left">
                    <p className="text-[8px] font-black text-yellow-400 leading-none">{seats[0]?.name} (Bạn)</p>
                    <p className="text-[9px] font-mono font-bold leading-none">${seats[0]?.chips.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : <div className="w-7 h-7 rounded-full border border-dashed border-white/30 bg-black/30 text-[7px] flex items-center justify-center text-white/40">Ghế 1</div>}
          </div>

          {/* Ghế 1: Dưới Trái */}
          <div className="absolute bottom-4 left-[6%] flex flex-col items-center z-10">
            {seats[1] ? (
              <div className="flex flex-col items-center">
                <div className="w-6 h-9 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[8px] font-mono">🎴🎴</div>
                <span className="text-[8px] bg-black/60 px-1.5 rounded text-yellow-400 font-bold mt-0.5">{seats[1]?.name} (${seats[1]?.chips})</span>
              </div>
            ) : <div className="w-7 h-7 rounded-full border border-dashed border-white/20 bg-black/20 text-[7px] flex items-center justify-center text-white/40">Ghế 2</div>}
          </div>

          {/* Ghế 2: Trên Trái */}
          <div className="absolute top-6 left-[6%] flex flex-col items-center z-10">
            {seats[2] ? (
              <div className="flex flex-col items-center">
                <span className="text-[8px] bg-black/60 px-1.5 rounded text-yellow-400 font-bold mb-0.5">{seats[2]?.name} (${seats[2]?.chips})</span>
                <div className="w-6 h-9 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[8px] font-mono">🎴🎴</div>
              </div>
            ) : <div className="w-7 h-7 rounded-full border border-dashed border-white/20 bg-black/20 text-[7px] flex items-center justify-center text-white/40">Ghế 3</div>}
          </div>

          {/* Ghế 3: Trên Phải */}
          <div className="absolute top-6 right-[6%] flex flex-col items-center z-10">
            {seats[3] ? (
              <div className="flex flex-col items-center">
                <span className="text-[8px] bg-black/60 px-1.5 rounded text-yellow-400 font-bold mb-0.5">{seats[3]?.name} (${seats[3]?.chips})</span>
                <div className="w-6 h-9 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[8px] font-mono">🎴🎴</div>
              </div>
            ) : <div className="w-7 h-7 rounded-full border border-dashed border-white/20 bg-black/20 text-[7px] flex items-center justify-center text-white/40">Ghế 4</div>}
          </div>

          {/* Ghế 4: Dưới Phải */}
          <div className="absolute bottom-4 right-[6%] flex flex-col items-center z-10">
            {seats[4] ? (
              <div className="flex flex-col items-center">
                <div className="w-6 h-9 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[8px] font-mono">🎴🎴</div>
                <span className="text-[8px] bg-black/60 px-1.5 rounded text-yellow-400 font-bold mt-0.5">{seats[4]?.name} (${seats[4]?.chips})</span>
              </div>
            ) : <div className="w-7 h-7 rounded-full border border-dashed border-white/20 bg-black/20 text-[7px] flex items-center justify-center text-white/40">Ghế 5</div>}
          </div>

        </div>
      </main>

      {/* FOOTER ĐẶT CƯỢC THU GỌN */}
      <footer className="bg-gray-900 border-t border-gray-800 p-1.5 px-3 z-30">
        <div className="max-w-3xl mx-auto flex flex-col gap-1">
          
          {mySeat?.isObserving ? (
            <div className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-3 py-1 rounded-lg font-bold text-[10px] text-center">
              👀 Đang quan sát. Ván sau sẽ tự động tham gia!
            </div>
          ) : phase === 'IDLE' ? (
            <div className="flex gap-2 w-full">
              {!isReadyClicked ? (
                <button
                  onClick={handleToggleReady}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg shadow active:scale-95 transition text-xs uppercase"
                >
                  🟢 SẴN SÀNG
                </button>
              ) : (
                <div className="flex-1 py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-600/40 font-bold rounded-lg text-[10px] text-center flex items-center justify-center">
                  ✅ ĐÃ SẴN SÀNG - ĐỜI PHÁT BÀI
                </div>
              )}

              <button
                onClick={startNewHand}
                className="py-2 px-5 bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-950 font-black rounded-lg shadow hover:brightness-110 active:scale-95 transition text-xs uppercase"
              >
                ▶️ CHIA BÀI
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              
              {/* THANH CHỌN CHIP CƯỢC NHANH */}
              <div className="flex items-center justify-between gap-1.5 bg-gray-950/80 p-1 px-2.5 rounded-lg border border-gray-800">
                <span className="text-[9px] text-yellow-400 font-mono font-bold shrink-0">Cược: ${raiseVal}</span>
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
                  <button onClick={() => setRaiseVal(50)} className="bg-emerald-950 text-emerald-400 border border-emerald-600/40 px-1.5 py-0.2 rounded text-[9px] font-bold">🪙 $50</button>
                  <button onClick={() => setRaiseVal(100)} className="bg-blue-950 text-blue-400 border border-blue-600/40 px-1.5 py-0.2 rounded text-[9px] font-bold">🪙 $100</button>
                  <button onClick={() => setRaiseVal(500)} className="bg-purple-950 text-purple-400 border border-purple-600/40 px-1.5 py-0.2 rounded text-[9px] font-bold">🪙 $500</button>
                </div>
              </div>

              {/* NÚT THAO TÁC CƯỢC */}
              <div className="flex items-center gap-1.5 w-full">
                <button onClick={() => handleAction('fold')} className="flex-1 bg-red-600/30 text-red-400 border border-red-500/40 py-1.5 rounded-lg font-bold text-[11px]">ÚP BÀI</button>
                <button onClick={() => handleAction('call')} className="flex-1 bg-blue-600/30 text-blue-400 border border-blue-500/40 py-1.5 rounded-lg font-bold text-[11px]">THEO</button>
                <button onClick={() => handleAction('raise')} className="flex-1 bg-yellow-500 text-gray-950 font-black py-1.5 rounded-lg text-[11px] shadow">TỐ (${raiseVal})</button>
                <button onClick={() => handleAction('allin')} className="bg-purple-600 text-white font-black px-3 py-1.5 rounded-lg text-[11px] shadow">ALL-IN 🔥</button>
              </div>

            </div>
          )}

        </div>
      </footer>

    </div>
  );
}