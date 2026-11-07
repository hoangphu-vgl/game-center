"use client";

import React, { useState, useEffect, useRef } from "react";
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
  const [matching, setMatching] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myKi, setMyKi] = useState(5000);
  const [myName, setMyName] = useState("Chiến Binh");
  const [myAvatar, setMyAvatar] = useState("");

  const [seats, setSeats] = useState<(SeatPlayer | null)[]>([null, null, null, null, null]);
  const [pot, setPot] = useState(0);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [phase, setPhase] = useState<GamePhase>('IDLE');
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [highestBet, setHighestBet] = useState<number>(100);

  const [dealerMsg, setDealerMsg] = useState("Whis: Đang chờ các tay chơi sẵn sàng!");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [raiseVal, setRaiseVal] = useState(100);

  const [resetCountdown, setResetCountdown] = useState<number | null>(null);

  const seatsRef = useRef(seats);
  const roomIdRef = useRef(roomId);
  const currentUserRef = useRef(currentUser);

  seatsRef.current = seats;
  roomIdRef.current = roomId;
  currentUserRef.current = currentUser;

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

  // TỰ ĐỘNG XÓA GHẾ KHI RỜI TRÌNH DUYỆT / F5 / ĐÓNG TAB
  useEffect(() => {
    const removePlayerFromRoom = async () => {
      if (!roomIdRef.current || !currentUserRef.current) return;
      const updatedSeats = seatsRef.current.map(s =>
        (s && (String(s.id) === String(currentUserRef.current.id) || s.name === myName)) ? null : s
      );
      await supabase.from("poker_rooms").update({ seats: updatedSeats }).eq("id", roomIdRef.current);
    };

    const handleBeforeUnload = () => {
      removePlayerFromRoom();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [myName]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleLeaveRoom = async () => {
    if (roomId && currentUser) {
      const updatedSeats = seats.map(s =>
        (s && (String(s.id) === String(currentUser.id) || s.name === myName)) ? null : s
      );
      await supabase.from("poker_rooms").update({ seats: updatedSeats }).eq("id", roomId);
    }
    setInRoom(false);
    setRoomId(null);
  };

  const handleAutoMatch = async () => {
    if (!currentUser) return;
    setMatching(true);
    showToast("Đang tìm bàn trống...");

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
        isReady: false
      };

      if (fixedRooms && fixedRooms.length > 0) {
        let targetRoom = fixedRooms.find(r => {
          const sList = r.seats || [null, null, null, null, null];
          return sList.some((s: any) => s === null);
        }) || fixedRooms[0];

        let currentSeats: (SeatPlayer | null)[] = targetRoom.seats || [null, null, null, null, null];
        currentSeats = currentSeats.map(s => (s && (s.id?.includes("bot") || s.name?.toLowerCase().includes("bot"))) ? null : s);

        const existingIdx = currentSeats.findIndex(s => s && (String(s.id) === String(currentUser.id) || s.name === myName));

        if (existingIdx !== -1) {
          currentSeats[existingIdx] = myData;
        } else {
          const emptyIndex = currentSeats.findIndex(s => s === null);
          if (emptyIndex !== -1) {
            currentSeats[emptyIndex] = myData;
          }
        }

        await supabase.from("poker_rooms").update({ seats: currentSeats }).eq("id", targetRoom.id);
        setRoomId(targetRoom.id);
        setRoomCode(targetRoom.code);
        setInRoom(true);
        showToast(`Đã tham gia #${targetRoom.code}`);
      }
    } catch (e) {
      setInRoom(true);
      setRoomCode("ROOM_1");
    } finally {
      setMatching(false);
    }
  };

  useEffect(() => {
    if (!roomId) return;
    const fetchRoom = async () => {
      const { data } = await supabase.from("poker_rooms").select("*").eq("id", roomId).single();
      if (data) {
        let cleanSeats = (data.seats || [null, null, null, null, null]).map((s: any) =>
          (s && (s.id?.includes("bot") || s.name?.toLowerCase().includes("bot"))) ? null : s
        );
        setSeats(cleanSeats);
        setPot(data.pot || 0);
        setCommunityCards(data.community_cards || []);
        setPhase(data.phase || 'IDLE');
        if (data.current_turn !== undefined) setCurrentTurn(data.current_turn);
      }
    };
    fetchRoom();

    const channel = supabase.channel(`poker_room_${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "poker_rooms", filter: `id=eq.${roomId}` }, (payload: any) => {
        const room = payload.new;
        if (room) {
          let cleanSeats = (room.seats || [null, null, null, null, null]).map((s: any) =>
            (s && (s.id?.includes("bot") || s.name?.toLowerCase().includes("bot"))) ? null : s
          );
          setSeats(cleanSeats);
          setPot(room.pot || 0);
          setCommunityCards(room.community_cards || []);
          setPhase(room.phase || 'IDLE');
          if (room.current_turn !== undefined) setCurrentTurn(room.current_turn);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // RESET VÁN KHI VỀ SHOWDOWN (10S TỔNG KẾT)
  useEffect(() => {
    if (phase === 'SHOWDOWN' && roomId) {
      setResetCountdown(10);
      const interval = setInterval(() => {
        setResetCountdown(prev => (prev !== null && prev > 1 ? prev - 1 : 0));
      }, 1000);

      const timer = setTimeout(async () => {
        const resetSeats = seats.map(s => s ? { ...s, isReady: false, folded: false, cards: [], currentBet: 0 } : null);
        await supabase.from("poker_rooms").update({
          seats: resetSeats,
          pot: 0,
          community_cards: [],
          phase: 'IDLE',
          current_turn: 0
        }).eq("id", roomId);
      }, 10000);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    } else {
      setResetCountdown(null);
    }
  }, [phase, roomId]);

  const handleToggleReady = async () => {
    const myIndex = seats.findIndex(s => s && (String(s.id) === String(currentUser?.id) || s.name === myName));
    if (myIndex === -1) return;

    let newSeats = [...seats];
    if (newSeats[myIndex]) {
      newSeats[myIndex]!.isReady = !newSeats[myIndex]!.isReady;
    }

    const activeSeats = newSeats.filter(s => s !== null);
    const readySeats = activeSeats.filter(s => s && s.isReady);

    if (activeSeats.length >= 2 && readySeats.length === activeSeats.length) {
      await startNewHand(newSeats);
    } else {
      setSeats(newSeats);
      if (roomId) {
        await supabase.from("poker_rooms").update({ seats: newSeats }).eq("id", roomId);
      }
      showToast(newSeats[myIndex]?.isReady ? "✅ Đã sẵn sàng!" : "❌ Đã hủy sẵn sàng.");
    }
  };

  const generateDeck = (): Card[] => {
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
    return deck;
  };

  const startNewHand = async (currentSeatsList: (SeatPlayer | null)[]) => {
    const deck = generateDeck();

    let updatedSeats = currentSeatsList.map(seat => {
      if (!seat) return null;
      const c1 = deck.pop()!;
      const c2 = deck.pop()!;
      const newChips = Math.max(0, seat.chips - 100);
      return {
        ...seat,
        cards: [c1, c2],
        currentBet: 100,
        chips: newChips,
        folded: false,
        isReady: true
      };
    });

    const participatingCount = updatedSeats.filter(s => s && s.cards.length > 0).length;
    if (participatingCount === 0) return;

    const initialPot = participatingCount * 100;
    const firstTurn = getFirstActiveSeat(updatedSeats);

    setHighestBet(100);

    if (roomId) {
      await supabase.from("poker_rooms").update({
        seats: updatedSeats,
        pot: initialPot,
        community_cards: [],
        phase: "PREFLOP",
        current_turn: firstTurn
      }).eq("id", roomId);
    }
    setDealerMsg("Whis: Đã chia 2 lá bài tẩy! Vòng PREFLOP bắt đầu.");
  };

  const getNextActiveSeat = (current: number, seatsList: (SeatPlayer | null)[]) => {
    let next = (current + 1) % 5;
    let count = 0;
    while (count < 5) {
      const p = seatsList[next];
      if (p && p.cards && p.cards.length > 0 && !p.folded) {
        return next;
      }
      next = (next + 1) % 5;
      count++;
    }
    return current;
  };

  const getFirstActiveSeat = (seatsList: (SeatPlayer | null)[]) => {
    for (let i = 0; i < 5; i++) {
      const p = seatsList[i];
      if (p && p.cards && p.cards.length > 0 && !p.folded) {
        return i;
      }
    }
    return 0;
  };

  const handleAction = async (action: 'fold' | 'call' | 'raise' | 'allin', customBet?: number) => {
    const myIndex = seats.findIndex(s => s && (String(s.id) === String(currentUser?.id) || s.name === myName));
    if (myIndex !== currentTurn && phase !== 'IDLE') {
      showToast("Chưa tới lượt của bạn!");
      return;
    }

    let updatedSeats = [...seats];
    const me = updatedSeats[myIndex];
    if (!me) return;

    let addedBet = 0;
    let newHighest = highestBet;

    if (action === 'fold') {
      me.folded = true;
    } else if (action === 'call') {
      const callDiff = Math.max(0, highestBet - me.currentBet);
      addedBet = Math.min(me.chips, callDiff);
      me.chips -= addedBet;
      me.currentBet += addedBet;
    } else if (action === 'raise' || action === 'allin') {
      const targetBet = action === 'allin' ? me.currentBet + me.chips : me.currentBet + (customBet || raiseVal);
      addedBet = targetBet - me.currentBet;
      me.chips -= addedBet;
      me.currentBet = targetBet;
      if (targetBet > highestBet) {
        newHighest = targetBet;
      }
    }

    setHighestBet(newHighest);

    const activePlayers = updatedSeats.filter(s => s && s.cards.length > 0 && !s.folded);
    const newPot = pot + addedBet;

    if (activePlayers.length === 1) {
      setDealerMsg(`Whis: ${activePlayers[0]!.name} chiến thắng do đối thủ đã úp bài!`);
      await executeAwardWinner(activePlayers[0]!, newPot, updatedSeats, communityCards, 'SHOWDOWN', currentTurn);
      return;
    }

    let nextTurnIdx = getNextActiveSeat(currentTurn, updatedSeats);
    
    // ĐIỀU KIỆN HOÀN THÀNH VÒNG: Tất cả người chơi còn lại có tiền cược ngang nhau bằng highestBet
    const isRoundComplete = activePlayers.every(p => p && p.currentBet === newHighest);

    let nextPhase = phase;
    let nextCards = [...communityCards];

    if (isRoundComplete) {
      updatedSeats = updatedSeats.map(s => s ? { ...s, currentBet: 0 } : null);
      setHighestBet(0);

      const deck = generateDeck();

      if (phase === 'PREFLOP') {
        // Chuyển sang FLOP: Lật 3 lá bài chung đầu tiên
        nextCards = [deck.pop()!, deck.pop()!, deck.pop()!];
        nextPhase = 'FLOP';
        setDealerMsg("Whis: Lật 3 lá bài chung (FLOP). Mời cược vòng mới!");
      } else if (phase === 'FLOP') {
        // Chuyển sang TURN: Thêm lá thứ 4
        nextCards = [...communityCards, deck.pop()!];
        nextPhase = 'TURN';
        setDealerMsg("Whis: Lật lá bài chung thứ 4 (TURN). Mời cược!");
      } else if (phase === 'TURN') {
        // Chuyển sang RIVER: Thêm lá thứ 5
        nextCards = [...communityCards, deck.pop()!];
        nextPhase = 'RIVER';
        setDealerMsg("Whis: Lật lá bài chung thứ 5 (RIVER). Vòng cược cuối!");
      } else if (phase === 'RIVER') {
        // Kết thúc vòng RIVER -> SHOWDOWN
        nextPhase = 'SHOWDOWN';
        setDealerMsg("Whis: Hết lượt cược! Mở bài phân định thắng thua (SHOWDOWN).");
      }

      nextTurnIdx = getFirstActiveSeat(updatedSeats);
    }

    if (nextPhase === 'SHOWDOWN') {
      const winner = activePlayers[Math.floor(Math.random() * activePlayers.length)]!;
      await executeAwardWinner(winner, newPot, updatedSeats, nextCards, nextPhase, nextTurnIdx);
    } else {
      if (roomId) {
        await supabase.from("poker_rooms").update({
          seats: updatedSeats,
          community_cards: nextCards,
          phase: nextPhase,
          pot: newPot,
          current_turn: nextTurnIdx
        }).eq("id", roomId);
      }
    }
  };

  const executeAwardWinner = async (winner: SeatPlayer, finalPot: number, finalSeats: (SeatPlayer | null)[], finalCards: Card[], finalPhase: GamePhase, finalTurn: number) => {
    const newBalance = winner.chips + finalPot;

    await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", winner.id);

    const updatedSeatsWithChips = finalSeats.map(s => {
      if (s && (String(s.id) === String(winner.id) || s.name === winner.name)) {
        return { ...s, chips: newBalance };
      }
      return s;
    });

    if (String(winner.id) === String(currentUser?.id) || winner.name === myName) {
      setMyKi(newBalance);
      showToast(`🎉 Bạn thắng Pot $${finalPot.toLocaleString()} Ki!`);
    } else {
      showToast(`🏆 ${winner.name} thắng Pot $${finalPot.toLocaleString()} Ki!`);
    }

    if (roomId) {
      await supabase.from("poker_rooms").update({
        seats: updatedSeatsWithChips,
        pot: finalPot,
        community_cards: finalCards,
        phase: finalPhase,
        current_turn: finalTurn
      }).eq("id", roomId);
    }
  };

  if (!inRoom) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
        <div className="relative z-10 w-full max-w-sm bg-gray-900/90 border-2 border-yellow-500/50 rounded-3xl p-5 shadow-2xl space-y-5 text-center">
          <span className="text-3xl animate-bounce">👑</span>
          <h1 className="text-xl font-black text-yellow-400 uppercase font-mono">TEXAS HOLD'EM POKER</h1>
          <p className="text-slate-400 text-[11px]">Đấu Bài 5 Ghế Realtime Supabase</p>
          <button
            onClick={handleAutoMatch}
            disabled={matching}
            className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-950 font-black py-3 rounded-xl hover:brightness-110 active:scale-95 transition text-xs"
          >
            ⚡ GHÉP BÀN TỰ ĐỘNG
          </button>
          <div>
            <Link href="/" className="text-[11px] text-gray-400 hover:text-yellow-400 font-bold">← Trang Chủ</Link>
          </div>
        </div>
      </div>
    );
  }

  const mySeatIndex = seats.findIndex(s => s && (String(s.id) === String(currentUser?.id) || s.name === myName));
  const isMyTurn = mySeatIndex === currentTurn && phase !== 'IDLE' && phase !== 'SHOWDOWN';
  const mySeat = mySeatIndex !== -1 ? seats[mySeatIndex] : null;

  return (
    <div className="bg-gray-950 text-white min-h-screen flex flex-col justify-between select-none overflow-hidden font-sans">
      
      {toastMsg && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-yellow-500 text-gray-950 px-4 py-1 rounded-full font-black text-[11px] z-50 shadow-2xl">
          🔔 {toastMsg}
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-900/90 border-b border-yellow-600/30 px-3 py-1 flex justify-between items-center z-30">
        <div className="flex items-center gap-2">
          <span className="text-sm">👑</span>
          <div>
            <h1 className="text-[11px] font-black text-yellow-400 uppercase font-mono leading-none">Poker VIP Pro</h1>
            <p className="text-[8px] text-gray-400 leading-tight">Phòng #{roomCode} • Blinds $50/$100</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[8px] text-gray-400 font-bold uppercase leading-none">Tổng Pot</p>
            <p className="text-xs font-black text-yellow-400 font-mono leading-tight">${pot.toLocaleString()}</p>
          </div>
          <button onClick={handleLeaveRoom} className="bg-gray-800 text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold hover:bg-gray-700">Rời Bàn 🚪</button>
        </div>
      </header>

      {/* BÀN BÀI OVAL */}
      <main className="flex-1 flex items-center justify-center p-1 relative overflow-hidden">
        
        <div 
          className="w-[98%] max-w-[780px] h-[280px] sm:h-[350px] rounded-[150px] border-4 sm:border-6 border-yellow-700/40 relative flex items-center justify-center shadow-2xl"
          style={{ 
            background: "radial-gradient(circle at center, #1b7a3e 0%, #0e4b25 70%, #062b14 100%)",
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.8), 0 0 0 8px #4a2810, 0 15px 30px rgba(0,0,0,0.9)"
          }}
        >
          <div className="absolute inset-4 rounded-[120px] border border-emerald-400/10 pointer-events-none flex items-center justify-center">
            <span className="text-emerald-500/10 font-black text-2xl sm:text-4xl tracking-[0.2em] font-mono uppercase select-none">
              POKER ROYALE
            </span>
          </div>

          {/* TRỌNG TÀI WHIS */}
          <div className="absolute top-1.5 flex flex-col items-center z-20">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-yellow-400 overflow-hidden bg-indigo-950 shadow-md">
              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Whis" alt="Whis" className="w-full h-full object-cover" />
            </div>
            <span className="text-[7px] bg-yellow-500 text-black px-1.5 rounded-full font-black uppercase mt-0.5">TRỌNG TÀI WHIS</span>
            <p className="text-[9px] text-yellow-200 bg-black/60 px-2 rounded-full border border-yellow-500/30 mt-0.5 font-mono">
              {resetCountdown !== null ? `⏳ Tổng kết ván kết thúc (Tự reset bàn sau ${resetCountdown}s)...` : dealerMsg}
            </p>
          </div>

          {/* BÀI CHUNG VÀ POT */}
          <div className="absolute flex flex-col items-center gap-0.5 z-10">
            <div className="bg-gray-950/80 px-2.5 py-0.5 rounded-full border border-yellow-500/50 text-yellow-400 text-[10px] font-black flex items-center gap-1 shadow-lg">
              <span>🪙 POT:</span>
              <span className="font-mono">${pot.toLocaleString()}</span>
            </div>

            <div className="flex gap-1 bg-black/40 p-1.5 rounded-lg border border-white/10 min-h-[45px] items-center">
              {communityCards.length === 0 ? (
                <span className="text-[9px] text-emerald-200/60 font-mono italic px-2">
                  Cần tất cả người chơi Ready để bắt đầu!
                </span>
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

          {/* 5 GHẾ NGỒI POKER */}
          {seats.map((seat, index) => {
            if (!seat) {
              return (
                <div key={index} className={`absolute text-[7px] text-white/40 border border-dashed border-white/20 w-7 h-7 rounded-full flex items-center justify-center bg-black/20 ${
                  index === 0 ? "bottom-1" : index === 1 ? "bottom-4 left-[6%]" : index === 2 ? "top-6 left-[6%]" : index === 3 ? "top-6 right-[6%]" : "bottom-4 right-[6%]"
                }`}>
                  Ghế {index + 1}
                </div>
              );
            }

            const isTurn = index === currentTurn && phase !== 'IDLE' && phase !== 'SHOWDOWN';
            const isMySeat = String(seat.id) === String(currentUser?.id) || seat.name === myName;

            return (
              <div key={index} className={`absolute flex flex-col items-center transition-all ${
                index === 0 ? "bottom-1 z-20" : index === 1 ? "bottom-4 left-[6%] z-10" : index === 2 ? "top-6 left-[6%] z-10" : index === 3 ? "top-6 right-[6%] z-10" : "bottom-4 right-[6%] z-10"
              }`}>
                
                {isTurn && (
                  <span className="text-[8px] bg-red-600 text-white px-1.5 py-0.2 rounded-full font-bold animate-pulse mb-0.5">
                    ⏳ Lượt chọn...
                  </span>
                )}
                {phase === 'IDLE' && (
                  <span className={`text-[7px] px-1.5 py-0.2 rounded-full font-bold mb-0.5 ${seat.isReady ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-400'}`}>
                    {seat.isReady ? '✅ ĐÃ READY' : '⏳ CHỜ READY'}
                  </span>
                )}
                {seat.folded && <span className="text-[7px] bg-red-950 text-red-400 px-1 rounded mb-0.5">ĐÃ ÚP BÀI</span>}

                <div className="flex -space-x-2 mb-0.5">
                  {isMySeat || phase === 'SHOWDOWN' ? (
                    seat.cards.map((c, i) => (
                      <div key={i} className="w-6 h-9 bg-white rounded flex flex-col justify-between p-0.5 text-gray-900 text-[8px] font-bold shadow">
                        <span className={`leading-none ${c.color}`}>{c.rank}{c.suit}</span>
                      </div>
                    ))
                  ) : (
                    seat.cards.length > 0 && <div className="w-6 h-9 bg-blue-900 border border-white/40 rounded flex items-center justify-center text-[7px] font-mono">🎴🎴</div>
                  )}
                </div>

                <div className={`flex items-center gap-1 bg-gray-900/90 px-2 py-0.5 rounded-full border ${isTurn ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-gray-700'}`}>
                  <img src={seat.avatar} className="w-4 h-4 rounded-full bg-gray-800" />
                  <div className="text-left">
                    <p className="text-[7px] font-black text-yellow-400 leading-none truncate max-w-[60px]">{seat.name}</p>
                    <p className="text-[8px] font-mono font-bold leading-none">${seat.chips.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </main>

      {/* FOOTER ĐẶT CƯỢC */}
      <footer className="bg-gray-900 border-t border-gray-800 p-1.5 px-3 z-30">
        <div className="max-w-3xl mx-auto flex flex-col gap-1">
          
          {phase === 'IDLE' ? (
            <div className="flex gap-2 w-full">
              <button
                onClick={handleToggleReady}
                className={`flex-1 py-2 font-black rounded-lg shadow active:scale-95 transition text-xs uppercase ${
                  mySeat?.isReady 
                    ? "bg-rose-600 hover:bg-rose-500 text-white" 
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {mySeat?.isReady ? "❌ HỦY SẮN SÀNG" : "🟢 SẴN SÀNG THAM GIA"}
              </button>
            </div>
          ) : phase === 'SHOWDOWN' ? (
            <div className="flex gap-2 w-full text-center justify-center items-center text-xs text-yellow-400 font-bold py-1 font-mono">
              ⏳ Ván đấu kết thúc. Tự động reset bàn sau {resetCountdown ?? 10}s...
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-1.5 bg-gray-950/80 p-1 px-2.5 rounded-lg border border-gray-800">
                <span className="text-[9px] text-yellow-400 font-mono font-bold shrink-0">Cược: ${raiseVal}</span>
                <input
                  type="range"
                  min={50}
                  max={myKi}
                  step={50}
                  value={raiseVal}
                  onChange={(e) => setRaiseVal(Number(e.target.value))}
                  disabled={!isMyTurn}
                  className="flex-1 accent-yellow-500 h-1 disabled:opacity-30"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setRaiseVal(50)} disabled={!isMyTurn} className="bg-emerald-950 text-emerald-400 border border-emerald-600/40 px-1.5 py-0.2 rounded text-[9px] font-bold disabled:opacity-30">🪙 $50</button>
                  <button onClick={() => setRaiseVal(100)} disabled={!isMyTurn} className="bg-blue-950 text-blue-400 border border-blue-600/40 px-1.5 py-0.2 rounded text-[9px] font-bold disabled:opacity-30">🪙 $100</button>
                  <button onClick={() => setRaiseVal(500)} disabled={!isMyTurn} className="bg-purple-950 text-purple-400 border border-purple-600/40 px-1.5 py-0.2 rounded text-[9px] font-bold disabled:opacity-30">🪙 $500</button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 w-full">
                <button 
                  onClick={() => handleAction('fold')} 
                  disabled={!isMyTurn}
                  className="flex-1 bg-red-600/30 text-red-400 border border-red-500/40 py-1.5 rounded-lg font-bold text-[11px] disabled:opacity-30"
                >
                  ÚP BÀI
                </button>
                <button 
                  onClick={() => handleAction('call')} 
                  disabled={!isMyTurn}
                  className="flex-1 bg-blue-600/30 text-blue-400 border border-blue-500/40 py-1.5 rounded-lg font-bold text-[11px] disabled:opacity-30"
                >
                  THEO
                </button>
                <button 
                  onClick={() => handleAction('raise')} 
                  disabled={!isMyTurn}
                  className="flex-1 bg-yellow-500 text-gray-950 font-black py-1.5 rounded-lg text-[11px] shadow disabled:opacity-30"
                >
                  TỐ (${raiseVal})
                </button>
                <button 
                  onClick={() => handleAction('allin')} 
                  disabled={!isMyTurn}
                  className="bg-purple-600 text-white font-black px-3 py-1.5 rounded-lg text-[11px] shadow disabled:opacity-30"
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