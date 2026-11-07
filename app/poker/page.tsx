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

interface PlayerState {
  id: string;
  name: string;
  chips: number;
  cards: Card[];
  currentBet: number;
  folded: boolean;
  actionText?: string;
}

type GamePhase = 'IDLE' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export default function PokerPage() {
  // Lobby States
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string>("");
  const [inputRoomCode, setInputRoomCode] = useState("");
  const [matching, setMatching] = useState(false);

  // User State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myKi, setMyKi] = useState(10000);

  // Game Realtime State
  const [p1, setP1] = useState<PlayerState | null>(null);
  const [p2, setP2] = useState<PlayerState | null>(null);
  const [pot, setPot] = useState(0);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [phase, setPhase] = useState<GamePhase>('IDLE');
  const [currentTurnId, setCurrentTurnId] = useState<string>("");
  const [currentHighBet, setCurrentHighBet] = useState(100);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [dealerMsg, setDealerMsg] = useState("Nhà cái Whis đang đợi người chơi...");
  const [raiseVal, setRaiseVal] = useState(500);

  // Xác định role của client hiện tại (isHost: Player 1, isGuest: Player 2)
  const isHost = currentUser && p1 && currentUser.id === p1.id;
  const isMyTurn = currentUser && currentTurnId === currentUser.id;

  // 1. Tải thông tin người dùng từ Supabase Auth
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
        setCurrentUser({ id: guestId, user_metadata: { username: `Saiyan_${guestId.slice(-4)}` } });
      }
    }
    loadUser();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // 2. Tự động Ghép Bàn (Matchmaking)
  const handleAutoMatch = async () => {
    if (!currentUser) return;
    setMatching(true);
    showToast("Đang tìm bàn Poker trống...");

    try {
      // Tìm bàn có trạng thái WAITING
      const { data: openRooms, error } = await supabase
        .from("poker_rooms")
        .select("*")
        .eq("status", "WAITING")
        .limit(1);

      if (!error && openRooms && openRooms.length > 0) {
        const room = openRooms[0];
        const updatedP2: PlayerState = {
          id: currentUser.id,
          name: currentUser.user_metadata?.username || currentUser.user_metadata?.full_name || "Đối Thủ Saiyan",
          chips: myKi,
          cards: [],
          currentBet: 0,
          folded: false
        };

        const { error: joinError } = await supabase
          .from("poker_rooms")
          .update({
            player2: updatedP2,
            status: "PLAYING"
          })
          .eq("id", room.id);

        if (!joinError) {
          setRoomId(room.id);
          setRoomCode(room.code);
          setInRoom(true);
          showToast(`Đã vào phòng #${room.code}!`);
        }
      } else {
        // Nếu không tìm thấy bàn trống, tự tạo phòng mới
        const generatedCode = "ROOM_" + Math.floor(Math.random() * 899 + 100);
        const initialP1: PlayerState = {
          id: currentUser.id,
          name: currentUser.user_metadata?.username || currentUser.user_metadata?.full_name || "Chủ Phòng Saiyan",
          chips: myKi,
          cards: [],
          currentBet: 0,
          folded: false
        };

        const { data: createdRoom, error: createError } = await supabase
          .from("poker_rooms")
          .insert([{
            code: generatedCode,
            player1: initialP1,
            player2: null,
            status: "WAITING",
            pot: 0,
            community_cards: [],
            phase: "IDLE",
            current_turn_id: currentUser.id
          }])
          .select()
          .single();

        if (!createError && createdRoom) {
          setRoomId(createdRoom.id);
          setRoomCode(createdRoom.code);
          setInRoom(true);
          showToast(`Đã tạo phòng #${generatedCode}! Đang chờ đối thủ...`);
        }
      }
    } catch (err: any) {
      showToast("Không thể kết nối cơ sở dữ liệu Supabase!");
    } finally {
      setMatching(false);
    }
  };

  // 3. Vào phòng theo Mã Phòng (Join by Code)
  const handleJoinByCode = async () => {
    if (!inputRoomCode.trim()) {
      alert("Vui lòng nhập Mã Phòng!");
      return;
    }
    setMatching(true);
    const codeUpper = inputRoomCode.trim().toUpperCase();

    try {
      const { data: room, error } = await supabase
        .from("poker_rooms")
        .select("*")
        .eq("code", codeUpper)
        .single();

      if (!error && room) {
        if (!room.player2 && room.player1?.id !== currentUser.id) {
          const updatedP2: PlayerState = {
            id: currentUser.id,
            name: currentUser.user_metadata?.username || "Chiến Binh",
            chips: myKi,
            cards: [],
            currentBet: 0,
            folded: false
          };

          await supabase
            .from("poker_rooms")
            .update({
              player2: updatedP2,
              status: "PLAYING"
            })
            .eq("id", room.id);

          setRoomId(room.id);
          setRoomCode(room.code);
          setInRoom(true);
          showToast(`Đã tham gia phòng #${room.code}`);
        } else if (room.player1?.id === currentUser.id) {
          setRoomId(room.id);
          setRoomCode(room.code);
          setInRoom(true);
        } else {
          alert("Phòng này đã đầy 2 người chơi!");
        }
      } else {
        alert("Không tìm thấy phòng với mã này!");
      }
    } catch (e) {
      alert("Lỗi khi kết nối phòng!");
    } finally {
      setMatching(false);
    }
  };

  // 4. Lắng nghe đồng bộ dữ liệu Bàn bài Realtime qua kênh Supabase Broadcast/Changes
  useEffect(() => {
    if (!roomId) return;

    // Fetch dữ liệu phòng lần đầu khi truy cập
    const fetchRoom = async () => {
      const { data } = await supabase
        .from("poker_rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      if (data) {
        setP1(data.player1);
        setP2(data.player2);
        setPot(data.pot);
        setCommunityCards(data.community_cards || []);
        setPhase(data.phase || 'IDLE');
        setCurrentTurnId(data.current_turn_id || "");
      }
    };
    fetchRoom();

    // Subscribe nhận dữ liệu cập nhật theo thời gian thực
    const channel = supabase
      .channel(`poker_room_${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "poker_rooms", filter: `id=eq.${roomId}` }, (payload: any) => {
        const room = payload.new;
        if (room) {
          setP1(room.player1);
          setP2(room.player2);
          setPot(room.pot);
          setCommunityCards(room.community_cards || []);
          setPhase(room.phase);
          setCurrentTurnId(room.current_turn_id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // 5. Nhà Cái Whis bắt đầu chia bài mới (Bản sao phòng P1/Host sẽ làm Dealer)
  const startNewHand = async () => {
    if (!roomId || !p1 || !p2) return;

    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          suit,
          rank,
          value: RANK_VALUES[rank],
          color: (suit === '♥' || suit === '♦') ? 'text-red-600' : 'text-gray-900'
        });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const c1 = deck.pop()!;
    const c2 = deck.pop()!;
    const c3 = deck.pop()!;
    const c4 = deck.pop()!;

    const sb = 50;
    const bb = 100;

    const newP1: PlayerState = {
      ...p1,
      cards: [c1, c2],
      currentBet: sb,
      chips: Math.max(0, p1.chips - sb),
      folded: false,
      actionText: "Small Blind ($50)"
    };

    const newP2: PlayerState = {
      ...p2,
      cards: [c3, c4],
      currentBet: bb,
      chips: Math.max(0, p2.chips - bb),
      folded: false,
      actionText: "Big Blind ($100)"
    };

    const initialPot = sb + bb;

    await supabase.from("poker_rooms").update({
      player1: newP1,
      player2: newP2,
      pot: initialPot,
      community_cards: [],
      phase: "PREFLOP",
      current_turn_id: newP1.id
    }).eq("id", roomId);

    setDealerMsg("Nhà cái Whis đã chia 2 lá bài tẩy cho 2 tay chơi!");
    showToast("Ván bài bắt đầu!");
  };

  // 6. Xử lý các thao tác đặt cược của Người chơi (Fold, Call, Raise, All-in)
  const handlePlayerAction = async (action: 'fold' | 'call' | 'raise' | 'allin') => {
    if (!roomId || !p1 || !p2 || !currentUser) return;

    const isP1 = currentUser.id === p1.id;
    const activePlayer = isP1 ? { ...p1 } : { ...p2 };
    const nextPlayerId = isP1 ? p2.id : p1.id;

    let updatedPot = pot;

    if (action === 'fold') {
      activePlayer.folded = true;
      activePlayer.actionText = "ÚP BÀI (FOLD)";

      const updatedP1 = isP1 ? activePlayer : p1;
      const updatedP2 = isP1 ? p2 : activePlayer;

      await supabase.from("poker_rooms").update({
        player1: updatedP1,
        player2: updatedP2,
        phase: "SHOWDOWN"
      }).eq("id", roomId);

      setDealerMsg(`${activePlayer.name} đã úp bài! Nhà cái Whis trao Pot cho đối thủ.`);
      return;
    } else if (action === 'call') {
      const diff = currentHighBet - activePlayer.currentBet;
      const amt = Math.min(diff, activePlayer.chips);
      activePlayer.chips -= amt;
      activePlayer.currentBet += amt;
      updatedPot += amt;
      activePlayer.actionText = `Theo $${amt}`;
    } else if (action === 'raise') {
      const diff = raiseVal - activePlayer.currentBet;
      const amt = Math.min(diff, activePlayer.chips);
      activePlayer.chips -= amt;
      activePlayer.currentBet += amt;
      updatedPot += amt;
      activePlayer.actionText = `Tố $${raiseVal}`;
      setCurrentHighBet(raiseVal);
    } else if (action === 'allin') {
      const amt = activePlayer.chips;
      activePlayer.currentBet += amt;
      updatedPot += amt;
      activePlayer.chips = 0;
      activePlayer.actionText = "ALL-IN!";
    }

    const updatedP1 = isP1 ? activePlayer : p1;
    const updatedP2 = isP1 ? p2 : activePlayer;

    // Chuyển giai đoạn bài nếu cả 2 đã theo cược bằng nhau
    let nextPhase = phase;
    let nextCards = [...communityCards];

    if (updatedP1.currentBet === updatedP2.currentBet && updatedP1.currentBet > 0) {
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
        setDealerMsg("Mở bài! Nhà cái Whis trao thưởng Pot cho người thắng!");
      }
      updatedP1.currentBet = 0;
      updatedP2.currentBet = 0;
    }

    await supabase.from("poker_rooms").update({
      player1: updatedP1,
      player2: updatedP2,
      pot: updatedPot,
      community_cards: nextCards,
      phase: nextPhase,
      current_turn_id: nextPlayerId
    }).eq("id", roomId);
  };

  // 7. GIAO DIỆN SẢNH GHÉP BÀN (LOBBY VIEW)
  if (!inRoom) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/40 via-gray-950 to-gray-950 pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-md bg-gray-900/90 border-2 border-yellow-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(234,179,8,0.25)] backdrop-blur-xl space-y-6">
          
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-yellow-600 via-amber-400 to-yellow-200 border-2 border-yellow-300 flex items-center justify-center text-gray-950 font-black text-2xl shadow-xl animate-bounce">
              👑
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 uppercase tracking-wider font-mono">
              TEXAS HOLD'EM POKER
            </h1>
            <p className="text-slate-400 text-xs font-medium">
              Sát phạt Poker Multiplayer kết nối Realtime Supabase + NPC Nhà Cái Whis
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <button
              onClick={handleAutoMatch}
              disabled={matching}
              className="w-full bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-gray-950 font-black text-sm py-4 rounded-2xl cursor-pointer hover:brightness-110 active:scale-95 transition shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>⚡</span> {matching ? "ĐANG KẾT NỐI BÀI..." : "GHÉP BÀN TỰ ĐỘNG"}
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="h-px bg-gray-800 flex-1" />
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Hoặc Nhập Mã Phòng</span>
              <div className="h-px bg-gray-800 flex-1" />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="VD: ROOM777"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value)}
                className="flex-1 bg-gray-950 border border-gray-700 text-sm text-yellow-400 font-mono px-4 py-3 rounded-xl focus:outline-none focus:border-yellow-500 uppercase tracking-widest"
              />
              <button
                onClick={handleJoinByCode}
                disabled={matching}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-5 py-3 rounded-xl transition active:scale-95 shadow-md"
              >
                VÀO PHÒNG 🚪
              </button>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-gray-800">
            <Link href="/" className="text-xs text-gray-400 hover:text-yellow-400 font-bold transition">
              ← Quay lại Trang Chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 8. GIAO DIỆN BÀN POKER CHUẨN THẢM XANH HIGH-END DỰA TRÊN HTML MẪU
  const myPlayer = currentUser?.id === p1?.id ? p1 : p2;
  const opponentPlayer = currentUser?.id === p1?.id ? p2 : p1;

  return (
    <div className="bg-gray-950 text-white min-h-screen flex flex-col justify-between select-none overflow-hidden font-sans">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-yellow-500 text-gray-950 px-6 py-2 rounded-full font-black text-sm shadow-2xl z-50 animate-bounce">
          🔔 {toastMsg}
        </div>
      )}

      {/* Top Header Navigation */}
      <header className="bg-gray-900/90 border-b border-yellow-600/30 px-4 md:px-8 py-3 flex justify-between items-center backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-600 to-yellow-300 border border-yellow-400 flex items-center justify-center text-gray-950 font-black shadow-lg">
            👑
          </div>
          <div>
            <h1 className="text-sm md:text-base font-black text-yellow-400 tracking-wider font-mono uppercase">
              Texas Hold'em VIP Pro
            </h1>
            <p className="text-xs text-gray-400 flex items-center gap-2">
              <span>Bàn #{roomCode || "REALTIME"}</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Blinds: $50 / $100</span>
            </p>
          </div>
        </div>

        {/* Table Stats & Pot Display */}
        <div className="flex items-center gap-4 md:gap-8">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Tổng Pot Bàn</p>
            <p className="text-lg md:text-2xl font-black text-yellow-400 font-mono tracking-wide">
              ${pot.toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setInRoom(false); setRoomId(null); }}
              className="bg-gray-800 hover:bg-gray-700 text-rose-400 border border-rose-600/40 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95"
            >
              Rời Bàn 🚪
            </button>
          </div>
        </div>
      </header>

      {/* Main Poker Table Playfield */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-6 relative overflow-hidden">
        
        {/* Felt Table Oval */}
        <div 
          className="w-[96%] max-w-[950px] h-[480px] md:h-[520px] rounded-[240px] border-4 md:border-8 border-yellow-700/30 relative flex items-center justify-center shadow-2xl"
          style={{
            background: "radial-gradient(circle at center, #1b7a3e 0%, #0e4b25 70%, #062b14 100%)",
            boxShadow: "inset 0 0 100px rgba(0, 0, 0, 0.8), 0 0 0 14px #4a2810, 0 0 0 18px #261306, 0 25px 60px rgba(0, 0, 0, 0.9)"
          }}
        >
          {/* Table Watermark Logo */}
          <div className="absolute inset-8 rounded-[200px] border border-emerald-400/10 pointer-events-none flex items-center justify-center">
            <span className="text-emerald-500/10 font-black text-4xl sm:text-7xl tracking-[0.2em] font-mono uppercase select-none">
              POKER ROYALE
            </span>
          </div>

          {/* Center Community Cards & Dealer Pot */}
          <div className="z-10 flex flex-col items-center gap-3">
            
            {/* NPC Nhà Cái Whis */}
            <div className="flex flex-col items-center mb-1">
              <div className="w-12 h-12 rounded-full border-2 border-yellow-400 overflow-hidden bg-indigo-950 shadow-xl">
                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Whis" alt="Whis" className="w-full h-full object-cover" />
              </div>
              <span className="text-[9px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-black mt-1 uppercase">NHÀ CÁI WHIS</span>
              <p className="text-[11px] text-yellow-200 bg-black/60 px-3 py-0.5 rounded-full border border-yellow-500/30 mt-1">
                {dealerMsg}
              </p>
            </div>

            {/* Main Pot Badge */}
            <div className="bg-gray-950/80 backdrop-blur-md px-5 py-1.5 rounded-full border border-yellow-500/50 text-yellow-400 text-sm font-black shadow-2xl flex items-center gap-2">
              <span>🪙 POT: <span className="font-mono text-lg">${pot.toLocaleString()}</span></span>
            </div>

            {/* 5 Community Cards */}
            <div className="flex gap-1.5 sm:gap-2.5 bg-black/40 p-2.5 sm:p-3 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl min-h-[70px] items-center">
              {communityCards.length === 0 ? (
                <span className="text-xs text-emerald-200/60 font-mono italic px-4">Đợi nhà cái Whis chia bài...</span>
              ) : (
                communityCards.map((card, idx) => (
                  <div key={idx} className="w-10 h-14 sm:w-14 sm:h-20 bg-white rounded-lg flex flex-col justify-between p-1 sm:p-1.5 text-gray-900 font-black shadow-lg">
                    <span className={`text-xs sm:text-sm leading-none ${card.color}`}>{card.rank}{card.suit}</span>
                    <span className={`text-base sm:text-2xl self-center leading-none ${card.color}`}>{card.suit}</span>
                    <span className={`text-xs sm:text-sm self-end leading-none ${card.color}`}>{card.rank}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SEAT OPPONENT */}
          <div className="absolute -top-6 sm:-top-8 flex flex-col items-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-yellow-400 bg-gray-800 flex items-center justify-center relative shadow-xl overflow-hidden">
              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Vegeta" alt="Opponent" className="w-full h-full object-cover" />
              <span className="absolute -bottom-1 bg-gray-900 px-2 py-0.5 rounded text-[9px] text-gray-300 font-bold border border-gray-700">
                {opponentPlayer ? opponentPlayer.name : "Đang chờ đối thủ..."}
              </span>
            </div>
            <span className="text-xs font-black text-yellow-400 font-mono mt-2 bg-black/60 px-2.5 py-0.5 rounded-full border border-yellow-500/20">
              ${opponentPlayer ? opponentPlayer.chips.toLocaleString() : 0}
            </span>
          </div>

          {/* SEAT HERO (BẠN) */}
          <div className="absolute -bottom-10 sm:-bottom-12 flex flex-col items-center z-20">
            <div className="flex -space-x-4 mb-1">
              {myPlayer?.cards.length === 2 ? (
                myPlayer.cards.map((c, idx) => (
                  <div key={idx} className={`w-12 h-16 sm:w-16 sm:h-24 bg-white rounded-lg flex flex-col justify-between p-1 sm:p-2 font-black shadow-2xl border border-gray-300 transform ${idx === 0 ? '-rotate-6' : 'rotate-6'}`}>
                    <span className={`text-xs sm:text-sm leading-none ${c.color}`}>{c.rank}{c.suit}</span>
                    <span className={`text-base sm:text-2xl self-center leading-none ${c.color}`}>{c.suit}</span>
                    <span className={`text-xs sm:text-sm self-end leading-none ${c.color}`}>{c.rank}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-yellow-300/60 italic font-mono bg-black/40 px-3 py-1 rounded-full">
                  {p2 ? "Sẵn sàng chia bài" : "Đợi đối thủ vào phòng..."}
                </div>
              )}
            </div>

            <div className={`flex items-center gap-3 bg-gray-900/90 p-1.5 px-4 rounded-full border-2 ${isMyTurn ? 'border-yellow-400 animate-pulse shadow-[0_0_20px_rgba(234,179,8,0.6)]' : 'border-gray-700'} shadow-2xl backdrop-blur-md`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-500 to-yellow-200 flex items-center justify-center text-gray-950 font-black">
                🛡️
              </div>
              <div className="text-left">
                <p className="text-[10px] text-yellow-400 font-black tracking-wider uppercase leading-none">
                  {myPlayer ? myPlayer.name : "BẠN (YOU)"}
                </p>
                <p className="text-sm font-black text-white font-mono leading-tight">
                  ${myPlayer ? myPlayer.chips.toLocaleString() : myKi.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Player Action Control Panel Footer */}
      <footer className="bg-gray-900/95 border-t border-gray-800 p-3 sm:p-4 px-4 sm:px-8 backdrop-blur-md z-30">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          {phase === 'IDLE' || phase === 'SHOWDOWN' ? (
            <button
              onClick={startNewHand}
              disabled={!p2}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-gray-950 font-black rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition text-sm disabled:opacity-50"
            >
              ▶️ {p2 ? "NHÀ CÁI WHIS CHIA BÀI VÁN MỚI" : "ĐANG ĐỜI ĐỐI THỦ VÀO PHÒNG..."}
            </button>
          ) : (
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-mono">Tố Ki: ${raiseVal}</span>
                <input
                  type="range"
                  min={currentHighBet + 100}
                  max={myPlayer?.chips || 10000}
                  step={100}
                  value={raiseVal}
                  onChange={(e) => setRaiseVal(Number(e.target.value))}
                  className="flex-1 accent-yellow-500"
                />
              </div>

              <div className="flex items-center gap-2 sm:gap-3 w-full justify-center">
                <button
                  onClick={() => handlePlayerAction('fold')}
                  disabled={!isMyTurn}
                  className="flex-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition active:scale-95 shadow-lg disabled:opacity-40"
                >
                  ÚP BÀI (FOLD)
                </button>

                <button
                  onClick={() => handlePlayerAction('call')}
                  disabled={!isMyTurn}
                  className="flex-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/40 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition active:scale-95 shadow-lg disabled:opacity-40"
                >
                  THEO (CALL)
                </button>

                <button
                  onClick={() => handlePlayerAction('raise')}
                  disabled={!isMyTurn}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-gray-950 px-3 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-lg shadow-yellow-500/20 transition active:scale-95 disabled:opacity-40"
                >
                  TỐ (${raiseVal})
                </button>

                <button
                  onClick={() => handlePlayerAction('allin')}
                  disabled={!isMyTurn}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-lg shadow-purple-600/30 transition active:scale-95 disabled:opacity-40"
                >
                  ALL-IN
                </button>
              </div>
            </div>
          )}

        </div>
      </footer>

    </div>
  );
}