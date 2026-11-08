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
  acted: boolean;
}

type GamePhase = 'IDLE' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// --- KỸ NĂNG POKER ---
const POKER_SKILL_ITEMS = [
  { id: "pk_1", name: "⚡ Uy Lực Thần Hủy Diệt", desc: "Tăng 50% độ uy hiếp khi Tố hoặc All-In.", price: 500000, icon: "⚡", addCount: 1, quote: "⚡ 'Cảm nhận sức mạnh của Thần Hủy Diệt đi! Tất cả phải quy phục!'" },
  { id: "pk_2", name: "🔮 Thấu Thị Dư Âm", desc: "Dùng trước khi lật bài Turn/River: Nhìn thấu lá bài tiếp theo của Whis trong 1 giây.", price: 150000, icon: "🔮", addCount: 1, quote: "🔮 'Con mắt thiên nhãn thấu suốt tương lai! Lật bài cho ta thấy!'" },
  { id: "pk_3", name: "🔥 Bùng Nổ Tiềm Năng", desc: "Đổi ngẫu nhiên 1 lá bài trên tay lấy một lá bài mới từ nọc.", price: 100000, icon: "🔥", addCount: 1, quote: "🔥 'Ki bùng nổ! Tái cấu trúc hoàn toàn tay bài của ta!'" },
  { id: "pk_4", name: "🛡️ Tấm Khiên Hư Không", desc: "Khi thua ở vòng Showdown, được hoàn trả 25% tiền cược (+5 lượt/mua).", price: 100000, icon: "🛡️", addCount: 5, quote: "🛡️ 'Hư không thuẫn mở ra! Sát thương này không thể chạm tới ta!'" },
  { id: "pk_5", name: "🌀 Dịch Chuyển Tức Thời", desc: "Chuyển trạng thái sang Xem Bài (Check) hoặc né lượt rủi ro.", price: 50000, icon: "🌀", addCount: 1, quote: "🌀 'Không gian dịch chuyển! Ngươi đã đánh vào hư vô!'" },
];

const WHIS_QUOTES = [
  "Whis: Khí áp thế này mà nhà cái không khóc mới lạ! Chuẩn bị bán muối đi cưng!",
  "Whis: Trơ trẽn thật đấy, bài thì rác mà tố cứ như tỷ phú Đa Cấp thế à?",
  "Whis: Nhà cái dạo này đói kém hay sao mà nhìn mâm Pot thèm thuồng thế kia!",
  "Whis: Ai da, nhà cái hốt Linh Thạch mỏi tay, cẩn thận sập lôi đài lúc nào không hay nha!",
  "Whis: Oai phong lẫm liệt đấy, nhưng chuẩn bị tinh thần ôm hận đi chiến binh!",
  "Whis: Đánh kiểu này thì đến Thần Hủy Diệt cũng phải chào thua độ lỳ của ngươi!"
];

const DEFAULT_AVATARS = Array.from({ length: 30 }, (_, index) => `/assets/avatar/xtra${index + 1}.ico`);

export default function PokerPage() {
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string>("");

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myKi, setMyKi] = useState(5000);
  const [myName, setMyName] = useState("Chiến Binh");
  const [myAvatar, setMyAvatar] = useState(DEFAULT_AVATARS[0]);

  const [seats, setSeats] = useState<(SeatPlayer | null)[]>([null, null, null, null, null]);
  const [pot, setPot] = useState(0);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [phase, setPhase] = useState<GamePhase>('IDLE');
  const [currentTurn, setCurrentTurn] = useState<number>(0);

  const [dealerMsg, setDealerMsg] = useState("Whis: Đang chờ các đại cao thủ sẵn sàng tụ khí nhập cuộc!");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [raiseVal, setRaiseVal] = useState(100);
  const [resetCountdown, setResetCountdown] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [inventory, setInventory] = useState<{ [key: string]: number }>({});
  const [hasUsedSkillThisMatch, setHasUsedSkillThisMatch] = useState<boolean>(false);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(30);

  const [clairvoyanceCard, setClairvoyanceCard] = useState<Card | null>(null);
  const nextCardRef = useRef<Card | null>(null);

  const seatsRef = useRef(seats);
  const roomIdRef = useRef(roomId);
  const currentUserRef = useRef(currentUser);
  const currentTurnRef = useRef(currentTurn);
  const phaseRef = useRef(phase);
  const potRef = useRef(pot);

  seatsRef.current = seats;
  roomIdRef.current = roomId;
  currentUserRef.current = currentUser;
  currentTurnRef.current = currentTurn;
  phaseRef.current = phase;
  potRef.current = pot;

  useEffect(() => {
    async function loadUser() {
      let uid = "";
      let name = "";
      let avatar = "";
      let balance = 5000;
      let userInv = {};

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        uid = session.user.id;
        setCurrentUser(session.user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance, full_name, avatar_url, inventory")
          .eq("id", uid)
          .single();

        if (profile) {
          name = profile.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.username || "";
          avatar = profile.avatar_url || "";
          balance = profile.balance ?? 5000;
          userInv = profile.inventory ?? {};
        }
      }

      if (!name) name = localStorage.getItem("tlmn_user_name") || "";
      if (!avatar) avatar = localStorage.getItem("tlmn_user_avatar") || "";

      if (!uid) {
        const storedUid = localStorage.getItem("tlmn_user_id");
        if (storedUid) {
          uid = storedUid;
        } else {
          uid = "user_" + Math.random().toString(36).substring(2, 9);
          localStorage.setItem("tlmn_user_id", uid);
        }
        setCurrentUser({ id: uid });
      }

      if (!name) name = "Chiến Binh " + uid.substring(uid.length - 4);
      if (!avatar) avatar = DEFAULT_AVATARS[0];

      setMyKi(balance);
      setMyName(name);
      setMyAvatar(avatar);
      setInventory(userInv);
    }
    loadUser();
  }, []);

  const updateSupabaseInventoryAndBalance = async (newBal: number, newInv: any) => {
    setMyKi(newBal);
    setInventory(newInv);
    if (currentUser?.id) {
      await supabase.from("profiles").update({ balance: newBal, inventory: newInv }).eq("id", currentUser.id);
    }
  };

  const handleBuySkillDirectly = async (skill: any) => {
    if (!currentUser?.id) { alert("Vui lòng đăng nhập để mua kỹ năng!"); return; }
    if (myKi < skill.price) { alert("⚡ Điểm Ki không đủ để mua kỹ năng này!"); return; }

    if (confirm(`Xác nhận dùng ${skill.price.toLocaleString()} Ki để mua thêm +${skill.addCount} lượt [${skill.name}]?`)) {
      const newBal = myKi - skill.price;
      const currentCount = inventory[skill.id] || 0;
      const newInv = { ...inventory, [skill.id]: currentCount + skill.addCount };
      
      await updateSupabaseInventoryAndBalance(newBal, newInv);
      alert(`🎉 Mua thành công +${skill.addCount} lượt [${skill.name}]!`);
    }
  };

  const handleActivateSkill = async (skillId: string, skillName: string, quoteText: string) => {
    if (phase === 'IDLE' || phase === 'SHOWDOWN') {
      alert("⚠️ Chỉ có thể sử dụng kỹ năng khi ván đấu Poker đang diễn ra trên bàn!");
      return;
    }

    const mySeatIndex = seats.findIndex(s => s && (String(s.id) === String(currentUser?.id) || s.name === myName));
    if (mySeatIndex !== currentTurn) {
      alert("⏳ Chưa tới lượt của bạn! Kỹ năng bắt buộc phải dùng trong lượt đi của mình.");
      return;
    }

    if (hasUsedSkillThisMatch) {
      alert("⚠️ Bạn đã sử dụng kỹ năng trong trận đấu này rồi! Chỉ được phép dùng tối đa 1 kỹ năng mỗi ván.");
      return;
    }

    if (skillId === 'pk_2' && phase !== 'FLOP' && phase !== 'TURN') {
      alert("⚠️ Kỹ năng [Thấu Thị Dư Âm] chỉ được phép sử dụng ở cuối vòng Flop (trước khi lật lá Turn) hoặc cuối vòng Turn (trước khi lật lá River)!");
      return;
    }

    const currentCount = inventory[skillId] || 0;
    if (currentCount > 0) {
      if (skillId === 'pk_4') {
        alert(`🛡️ [${skillName}] là khiên tự động bảo vệ khi thua ở vòng Showdown.`);
        setShowSkillModal(false);
        return;
      }

      const newInv = { ...inventory, [skillId]: currentCount - 1 };
      await updateSupabaseInventoryAndBalance(myKi, newInv);
      setHasUsedSkillThisMatch(true);
      setShowSkillModal(false);

      if (skillId === 'pk_2' && nextCardRef.current) {
        setClairvoyanceCard(nextCardRef.current);
        setTimeout(() => {
          setClairvoyanceCard(null);
        }, 1000);
      }

      const fullAnnouncement = `${myName} đã thi triển kỹ năng [${skillName}]!\n${quoteText}`;
      setDealerMsg(fullAnnouncement);
      showToast(`⚔️ KỸ NĂNG KÍCH HOẠT: ${skillName}`);
    } else {
      alert(`⚠️ Bạn đã hết lượt kỹ năng [${skillName}]! Hãy bấm nút mua thêm.`);
    }
  };

  // --- XỬ LÝ KHI RỜI BÀN HOẶC THOÁT NGANG GIỮA TRẬN ---
  const processLeaveOrUnload = async (currentRoomId: string, currentSeats: (SeatPlayer | null)[], currentUserId: string, currentName: string) => {
    if (!currentRoomId) return;

    const leavingPlayer = currentSeats.find(s => s && (String(s.id) === String(currentUserId) || s.name === currentName));
    const isPlayingMatch = phaseRef.current !== 'IDLE' && phaseRef.current !== 'SHOWDOWN' && leavingPlayer && leavingPlayer.cards.length > 0;

    let updatedSeats = currentSeats.map(s =>
      (s && (String(s.id) === String(currentUserId) || s.name === currentName)) ? null : s
    );

    // Nếu đang chơi mà bỏ ngang -> mất điểm cược (không hoàn tiền, đã trừ chip từ đầu ván)
    if (isPlayingMatch) {
      const remainingActive = updatedSeats.filter(s => s !== null && s.cards.length > 0 && !s.folded);
      // Nếu bàn còn đúng 1 người chơi duy nhất -> người đó hốt trọn Pot
      if (remainingActive.length === 1) {
        const winner = remainingActive[0]!;
        const totalPot = potRef.current;
        const newWinnerChips = winner.chips + totalPot;

        await supabase.from("profiles").update({ balance: newWinnerChips }).eq("id", winner.id);

        updatedSeats = updatedSeats.map(s => (s && s.id === winner.id) ? { ...s, chips: newWinnerChips } : s);

        await supabase.from("poker_rooms").update({
          seats: updatedSeats,
          pot: 0,
          community_cards: [],
          phase: 'IDLE',
          current_turn: 0
        }).eq("id", currentRoomId);
        return;
      }
    }

    const activeCount = updatedSeats.filter(s => s !== null).length;
    if (activeCount === 0) {
      await supabase.from("poker_rooms").update({
        seats: [null, null, null, null, null],
        pot: 0,
        community_cards: [],
        phase: 'IDLE',
        current_turn: 0
      }).eq("id", currentRoomId);
    } else {
      await supabase.from("poker_rooms").update({ seats: updatedSeats }).eq("id", currentRoomId);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (roomIdRef.current && currentUserRef.current) {
        processLeaveOrUnload(roomIdRef.current, seatsRef.current, currentUserRef.current.id, myName);
      }
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

  const handleForceResetRoom = async () => {
    if (!roomId) return;
    await supabase.from("poker_rooms").update({
      seats: [null, null, null, null, null],
      pot: 0,
      community_cards: [],
      phase: 'IDLE',
      current_turn: 0
    }).eq("id", roomId);
    showToast("🧹 Đã dọn sạch lôi đài thành công!");
  };

  const handleLeaveRoom = async () => {
    if (roomId && currentUser) {
      await processLeaveOrUnload(roomId, seats, currentUser.id, myName);
    }
    setInRoom(false);
    setRoomId(null);
  };

  const handleJoinRoomByCode = async (code: string) => {
    if (!currentUser) return;
    showToast(`Đang bước vào Lôi Đài #${code}...`);

    try {
      let { data: targetRoom } = await supabase
        .from("poker_rooms")
        .select("*")
        .eq("code", code)
        .single();

      if (!targetRoom) {
        const { data: newRoom, error: createErr } = await supabase
          .from("poker_rooms")
          .insert([{
            code: code,
            seats: [null, null, null, null, null],
            pot: 0,
            community_cards: [],
            phase: 'IDLE',
            current_turn: 0
          }])
          .select()
          .single();

        if (createErr) {
          alert("Lỗi tạo lôi đài: " + createErr.message);
          return;
        }
        targetRoom = newRoom;
      }

      const myData: SeatPlayer = {
        id: currentUser.id,
        name: myName,
        avatar: myAvatar,
        chips: myKi,
        cards: [],
        currentBet: 0,
        folded: false,
        isReady: false,
        acted: false
      };

      let currentSeats: (SeatPlayer | null)[] = targetRoom.seats || [null, null, null, null, null];
      currentSeats = currentSeats.map(s => (s && (s.id?.includes("bot") || s.name?.toLowerCase().includes("bot"))) ? null : s);

      const existingIdx = currentSeats.findIndex(s => s && (String(s.id) === String(currentUser.id) || s.name === myName));

      if (existingIdx !== -1) {
        currentSeats[existingIdx] = myData;
      } else {
        const emptyIndex = currentSeats.findIndex(s => s === null);
        if (emptyIndex === -1) {
          alert("Lôi đài đã hội tụ đủ 5 Đại Cao Thủ!");
          return;
        }
        currentSeats[emptyIndex] = myData;
      }

      await supabase.from("poker_rooms").update({ seats: currentSeats }).eq("id", targetRoom.id);
      setRoomId(targetRoom.id);
      setRoomCode(code);
      setInRoom(true);
      showToast(`Đã vào Lôi Đài #${code}`);
    } catch (e: any) {
      alert("Lỗi bước vào lôi đài: " + e.message);
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

  useEffect(() => {
    if (phase === 'IDLE' || phase === 'SHOWDOWN') {
      return;
    }

    setTurnTimeLeft(30);

    const timer = setInterval(() => {
      setTurnTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          const currentS = seatsRef.current;
          const activeSIndex = currentTurnRef.current;
          const currentP = currentS[activeSIndex];

          if (currentP && currentUserRef.current && (String(currentP.id) === String(currentUserRef.current.id))) {
            handleAction('fold');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentTurn, phase]);

  useEffect(() => {
    if (phase === 'SHOWDOWN' && roomId) {
      setResetCountdown(10);
      const randomQuote = WHIS_QUOTES[Math.floor(Math.random() * WHIS_QUOTES.length)];
      setDealerMsg(randomQuote);

      const interval = setInterval(() => {
        setResetCountdown(prev => (prev !== null && prev > 1 ? prev - 1 : 0));
      }, 1000);

      const timer = setTimeout(async () => {
        const resetSeats = seats.map(s => s ? { ...s, isReady: false, folded: false, cards: [], currentBet: 0, acted: false } : null);
        setHasUsedSkillThisMatch(false);
        setClairvoyanceCard(null);
        nextCardRef.current = null;
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
      showToast(newSeats[myIndex]?.isReady ? "✨ Đã sẵn sàng xuất chiến!" : "❌ Đã hủy sẵn sàng.");
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
    setHasUsedSkillThisMatch(false);
    setClairvoyanceCard(null);

    const tCard = deck.pop()!;
    const rCard = deck.pop()!;
    (window as any)._preppedTurnCard = tCard;
    (window as any)._preppedRiverCard = rCard;

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
        isReady: true,
        acted: false
      };
    });

    const participatingCount = updatedSeats.filter(s => s && s.cards.length > 0).length;
    if (participatingCount === 0) return;

    const initialPot = participatingCount * 100;
    const firstTurn = getFirstActiveSeat(updatedSeats);

    if (roomId) {
      await supabase.from("poker_rooms").update({
        seats: updatedSeats,
        pot: initialPot,
        community_cards: [],
        phase: "PREFLOP",
        current_turn: firstTurn
      }).eq("id", roomId);
    }
    setDealerMsg("Whis: Đã chia 2 bài tẩy! Cẩn thận cái ví của nhà cái đấy nhé!");
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

    me.acted = true; 

    const activeBefore = updatedSeats.filter(s => s && s.cards.length > 0 && !s.folded);
    const currentHighestBet = activeBefore.length > 0 ? Math.max(...activeBefore.map(s => s!.currentBet)) : 0;

    let addedBet = 0;

    if (action === 'fold') {
      me.folded = true;
    } else if (action === 'call') {
      const callDiff = Math.max(0, currentHighestBet - me.currentBet);
      addedBet = Math.min(me.chips, callDiff);
      me.chips -= addedBet;
      me.currentBet += addedBet;
    } else if (action === 'raise' || action === 'allin') {
      const targetBet = action === 'allin' ? me.currentBet + me.chips : me.currentBet + (customBet || raiseVal);
      addedBet = Math.min(me.chips, targetBet - me.currentBet);
      me.chips -= addedBet;
      me.currentBet += addedBet;
      
      if (me.currentBet > currentHighestBet) {
        updatedSeats.forEach(s => {
          if (s && s.id !== me.id && !s.folded && s.cards.length > 0) {
            s.acted = false; 
          }
        });
      }
    }

    const activeAfter = updatedSeats.filter(s => s && s.cards.length > 0 && !s.folded);
    const newHighest = activeAfter.length > 0 ? Math.max(...activeAfter.map(s => s!.currentBet)) : 0;
    const newPot = pot + addedBet;

    if (activeAfter.length === 1) {
      setDealerMsg(`Whis: ${activeAfter[0]!.name} hốt trọn ổ vì đối thủ hèn nhát úp bài!`);
      await executeAwardWinner(activeAfter[0]!, newPot, updatedSeats, communityCards, 'SHOWDOWN', currentTurn);
      return;
    }

    const allMatched = activeAfter.every(p => p && p.acted && (p.currentBet === newHighest || p.chips === 0));

    let nextTurnIdx = currentTurn;
    let nextPhase = phase;
    let nextCards = [...communityCards];

    if (allMatched) {
      updatedSeats = updatedSeats.map(s => s ? { ...s, currentBet: 0, acted: false } : null);

      const deck = generateDeck();

      if (phase === 'PREFLOP') {
        const c1 = deck.pop()!;
        const c2 = deck.pop()!;
        const c3 = deck.pop()!;
        nextCards = [c1, c2, c3];
        nextPhase = 'FLOP';

        const preppedTurn = (window as any)._preppedTurnCard || deck.pop()!;
        nextCardRef.current = preppedTurn;

        setDealerMsg("Whis: Lật 3 lá FLOP! Mời các tay chơi cược vòng mới!");
      } else if (phase === 'FLOP') {
        const turnCard = (window as any)._preppedTurnCard || deck.pop()!;
        nextCards = [...communityCards, turnCard];
        nextPhase = 'TURN';

        const preppedRiver = (window as any)._preppedRiverCard || deck.pop()!;
        nextCardRef.current = preppedRiver;

        setDealerMsg("Whis: Lá TURN thứ 4 xuất hiện! Tiếp tục chiến đấu!");
      } else if (phase === 'TURN') {
        const riverCard = (window as any)._preppedRiverCard || deck.pop()!;
        nextCards = [...communityCards, riverCard];
        nextPhase = 'RIVER';
        setDealerMsg("Whis: Lá RIVER cuối cùng! Cân não chưa nào!");
      } else if (phase === 'RIVER') {
        nextPhase = 'SHOWDOWN';
        setDealerMsg("Whis: Hết giờ lật bài! So tài cao thấp!");
      }

      nextTurnIdx = getFirstActiveSeat(updatedSeats);
    } else {
      nextTurnIdx = getNextActiveSeat(currentTurn, updatedSeats);
    }

    const remainingWithChips = activeAfter.filter(s => s && s.chips > 0);
    if (remainingWithChips.length <= 1 && nextPhase !== 'SHOWDOWN') {
      while (nextCards.length < 5) {
        const extraDeck = generateDeck();
        nextCards.push(extraDeck.pop()!);
      }
      nextPhase = 'SHOWDOWN';
      setDealerMsg("Whis: Đã All-in toàn bộ! Tự động lật bài phân định thắng thua!");
    }

    if (nextPhase === 'SHOWDOWN') {
      const winner = activeAfter[Math.floor(Math.random() * activeAfter.length)]!;
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
      showToast(`🎉 Bạn hốt trọn Pot $${finalPot.toLocaleString()} Ki! Đỉnh chóp!`);
    } else {
      showToast(`🏆 ${winner.name} lượm gọn $${finalPot.toLocaleString()} Ki! Quá khét!`);
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
      <div className="min-h-screen bg-slate-950 p-4 flex flex-col items-center justify-center select-none relative">
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={() => setShowSkillModal(true)}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white border border-cyan-400/40 px-3 py-1.5 rounded-lg text-xs font-bold shadow hover:brightness-110 transition active:scale-95 flex items-center gap-1 cursor-pointer"
          >
            ⚡ Kho Skill
          </button>
          <button
            onClick={() => setShowRulesModal(true)}
            className="bg-slate-900 text-yellow-400 border border-yellow-500/40 px-3 py-1.5 rounded-lg text-xs font-bold shadow hover:bg-slate-800 transition active:scale-95 flex items-center gap-1 cursor-pointer"
          >
            📜 Luật Chơi
          </button>
        </div>

        <div className="w-full max-w-xl flex justify-between items-center mb-4">
          <Link href="/" className="bg-slate-900 text-amber-400 border border-amber-500/40 px-3 py-1.5 rounded-lg text-xs font-bold">
            ⬅️ Trang Chủ
          </Link>
          <div className="text-amber-400 font-black text-xs">⚡ Linh Thạch: {myKi.toLocaleString()}</div>
        </div>
        
        <div className="text-center mb-6">
          <div className="text-4xl mb-1">⚡🐉</div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-emerald-400 to-cyan-400">CHỌN LÔI ĐÀI POKER</h1>
          <p className="text-slate-400 text-[10px] tracking-widest uppercase mt-1">Sòng Bài Vũ Trụ • Chọn Lôi Đài Thủ Công</p>
        </div>

        <div className="grid grid-cols-1 gap-3 w-full max-w-xl">
          <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-xl flex justify-between items-center shadow-md">
            <div>
              <div className="text-sm font-black text-emerald-400">LÔI ĐÀI 1 (Hành Tinh Namek)</div>
              <div className="text-slate-400 text-[10px] mt-0.5">Blinds $50 / $100 • Sân Đấu Cổ Đại</div>
            </div>
            <button 
              onClick={() => handleJoinRoomByCode("ROOM_1")} 
              className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-2 px-5 rounded-lg text-xs shadow cursor-pointer"
            >
              VÀO BÀN 🚀
            </button>
          </div>

          <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-xl flex justify-between items-center shadow-md">
            <div>
              <div className="text-sm font-black text-emerald-400">LÔI ĐÀI 2 (Đại Hội Sức Mạnh)</div>
              <div className="text-slate-400 text-[10px] mt-0.5">Blinds $50 / $100 • Sân Đấu Thần Thánh</div>
            </div>
            <button 
              onClick={() => handleJoinRoomByCode("ROOM_2")} 
              className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-2 px-5 rounded-lg text-xs shadow cursor-pointer"
            >
              VÀO BÀN 🚀
            </button>
          </div>
        </div>

        {/* POPUP KHO SKILL */}
        {showSkillModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 pointer-events-auto">
            <div className="bg-slate-900 border-2 border-cyan-500/70 rounded-3xl max-w-xl w-full p-5 max-h-[85vh] overflow-y-auto text-left shadow-2xl relative space-y-4 font-sans text-white">
              <div className="flex justify-between items-center border-b border-cyan-500/40 pb-3">
                <h3 className="text-sm md:text-base font-black text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                  ⚔️ KHO KỸ NĂNG POKER THẦN THÁNH
                </h3>
                <button onClick={() => setShowSkillModal(false)} className="bg-rose-600 hover:bg-rose-500 text-white w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center cursor-pointer shadow">✕</button>
              </div>

              <div className="space-y-3">
                {POKER_SKILL_ITEMS.map((skill) => {
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
                          <button onClick={() => handleActivateSkill(skill.id, skill.name, skill.quote)} className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:brightness-110 px-5 py-2 rounded-xl text-[11px] font-black tracking-wider uppercase transition shadow cursor-pointer w-full sm:w-auto">
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

        {showRulesModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-yellow-500/60 rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto text-left shadow-2xl relative">
              <div className="flex justify-between items-center mb-3 border-b border-yellow-500/30 pb-2">
                <h3 className="text-sm font-black text-yellow-400 uppercase tracking-wide flex items-center gap-1.5">
                  📜 TRỌN BỘ LUẬT POKER VŨ TRỤ
                </h3>
                <button 
                  onClick={() => setShowRulesModal(false)}
                  className="bg-rose-600 hover:bg-rose-500 text-white w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-[11px] text-slate-300 leading-relaxed font-sans">
                <div>
                  <h4 className="text-yellow-400 font-bold mb-1">1. Giới thiệu & Nhập cuộc:</h4>
                  <p>Mỗi người chơi khi vào bàn sẽ mang theo lượng Linh Thạch (Ki) của mình. Bàn chơi tối đa 5 người, chọn bàn thủ công (Lôi Đài 1 hoặc 2) và bấm <strong className="text-emerald-400">Sẵn Sàng</strong> để bắt đầu ván đấu khi có từ 2 người trở lên.</p>
                </div>

                <div>
                  <h4 className="text-yellow-400 font-bold mb-1">2. Các Vòng Cược (Betting Rounds):</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Pre-Flop:</strong> Mỗi người chơi được chia 2 lá bài tẩy riêng biệt. Tiền cược mù ban đầu mỗi người là $100.</li>
                    <li><strong>Flop:</strong> Trọng tài Whis lật 3 lá bài chung đầu tiên giữa bàn.</li>
                    <li><strong>Turn:</strong> Lật lá bài chung thứ 4.</li>
                    <li><strong>River:</strong> Lật lá bài chung thứ 5 (lá cuối cùng).</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-yellow-400 font-bold mb-1">3. Các Hành Động Trong Lượt (⏱️ Giới hạn 30 giây):</h4>
                  <p className="mb-1">Mỗi người có 30 giây suy nghĩ mỗi lượt. Quá thời gian hệ thống tự động úp bài.</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong className="text-rose-400">Úp Bài (Fold):</strong> Bỏ bài nếu thấy bài yếu, chấp nhận mất tiền cược trước đó.</li>
                    <li><strong className="text-cyan-400">Theo (Call):</strong> Bỏ ra số tiền cược ngang bằng với người tố trước đó để tiếp tục chơi.</li>
                    <li><strong className="text-yellow-400">Tố (Raise):</strong> Tăng mức cược lên cao hơn để áp đảo đối thủ.</li>
                    <li><strong className="text-purple-400">All-In:</strong> Cược toàn bộ số Linh Thạch còn lại của mình vào Pot. Khi đối thủ không đủ tiền, bàn chơi tự động mở hết bài (Showdown).</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-yellow-400 font-bold mb-1">4. Xếp Hạng Bài (Từ cao xuống thấp):</h4>
                  <p>Thùng Phá Sảnh &gt; Tứ Quý &gt; Cù Lũ &gt; Thùng (Flush) &gt; Sảnh (Straight) &gt; Sám Chi (3 lá) &gt; Thú (2 đôi) &gt; Một Đôi &gt; Mậu Thầu (Bài cao).</p>
                </div>
              </div>

              <div className="mt-5 text-center">
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black px-6 py-2 rounded-xl text-xs uppercase shadow cursor-pointer"
                >
                  Đã Hiểu, Chiến Thôi! 🚀
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const mySeatIndex = seats.findIndex(s => s && (String(s.id) === String(currentUser?.id) || s.name === myName));
  const isMyTurn = mySeatIndex === currentTurn && phase !== 'IDLE' && phase !== 'SHOWDOWN';
  const mySeat = mySeatIndex !== -1 ? seats[mySeatIndex] : null;

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 text-white flex flex-col justify-between select-none font-sans" style={{ touchAction: 'manipulation' }}>
      
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.12),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-25 bg-[url('/assets/tienlen/backgroundroom1.png')] bg-cover bg-center pointer-events-none" />

      {toastMsg && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-950 px-5 py-2 rounded-full font-black text-xs z-50 shadow-2xl animate-bounce border-2 border-white/40">
          🔔 {toastMsg}
        </div>
      )}

      {/* HEADER */}
      <header className="bg-slate-900/95 border-b border-yellow-500/40 px-3 py-1.5 flex justify-between items-center z-30 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-[10px] font-black text-yellow-400 uppercase font-mono tracking-tight leading-none">Poker VIP Royale #{roomCode}</h1>
            <p className="text-[8px] text-emerald-400 font-bold leading-tight">Blinds $50/$100</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="text-right bg-black/40 px-2 py-0.5 rounded-lg border border-yellow-500/20">
            <p className="text-[7px] text-gray-400 font-bold uppercase leading-none">Tổng Pot</p>
            <p className="text-[11px] font-black text-yellow-400 font-mono leading-tight">${pot.toLocaleString()}</p>
          </div>

          <button
            onClick={() => setShowSkillModal(true)}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white border border-cyan-300/40 px-2.5 py-1 rounded-lg text-[9px] font-black shadow transition active:scale-95 cursor-pointer"
          >
            ⚡ Skill
          </button>

          <button
            onClick={() => setShowRulesModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-yellow-500/40 px-2 py-1 rounded-lg text-[9px] font-black shadow transition active:scale-95 cursor-pointer"
            title="Xem luật chơi"
          >
            📜 Luật
          </button>

          <button
            onClick={handleForceResetRoom}
            className="bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-lg text-[9px] font-black shadow transition active:scale-95 cursor-pointer"
            title="Dọn bàn khẩn cấp khi bị kẹt"
          >
            🧹 Reset
          </button>

          <button 
            onClick={() => { if(!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true); } else { document.exitFullscreen(); setIsFullscreen(false); } }} 
            className="bg-slate-800 text-white font-bold py-1 px-2 rounded-lg text-[9px] cursor-pointer"
          >
            {isFullscreen ? "🗗" : "🖵"}
          </button>

          <button onClick={handleLeaveRoom} className="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded-lg text-[9px] font-bold shadow transition cursor-pointer">
            Rời 🚪
          </button>
        </div>
      </header>

      {/* SÀN ĐẤU OVAL */}
      <main className="flex-1 flex items-center justify-center p-1 sm:p-2 relative overflow-hidden">
        <div className="w-[98%] max-w-[1100px] h-[72vh] sm:h-[78vh] transition-all duration-300 rounded-[140px] sm:rounded-[200px] border-4 sm:border-6 border-amber-900/80 relative flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.9)]"
          style={{ 
            background: "radial-gradient(circle at center, #065f2c 0%, #064e21 60%, #022c12 100%)",
            boxShadow: "inset 0 0 70px rgba(0,0,0,0.85), 0 0 0 6px #381d09, 0 20px 40px rgba(0,0,0,0.9)"
          }}
        >
          <div className="absolute inset-4 rounded-[110px] sm:rounded-[160px] border border-emerald-300/10 pointer-events-none flex items-center justify-center">
            <span className="text-emerald-400/15 font-black text-base sm:text-3xl tracking-[0.3em] font-mono uppercase select-none drop-shadow">
              TEXAS HOLD'EM
            </span>
          </div>

          {/* KHU VỰC TRỌNG TÀI WHIS & BỘ BÀI ÚP */}
          <div className="absolute top-2 flex flex-col items-center z-20 px-2 max-w-[320px]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-yellow-400 overflow-hidden bg-indigo-950 shadow-lg animate-pulse">
                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Whis" alt="Whis" className="w-full h-full object-cover" />
              </div>

              {/* BỘ BÀI ÚP / HIỆN LÁ BÀI THẤU THỊ TRONG 1S */}
              <div className="relative flex items-center justify-center">
                {clairvoyanceCard ? (
                  <div className="w-7 h-10 sm:w-9 sm:h-13 bg-white rounded-lg flex flex-col justify-between p-1 font-black shadow-[0_0_20px_rgba(234,179,8,1)] text-gray-900 animate-bounce">
                    <span className={`text-[9px] leading-none ${clairvoyanceCard.color}`}>{clairvoyanceCard.rank}</span>
                    <span className={`text-xs self-center leading-none ${clairvoyanceCard.color}`}>{clairvoyanceCard.suit}</span>
                    <span className={`text-[9px] self-end leading-none ${clairvoyanceCard.color}`}>{clairvoyanceCard.rank}</span>
                  </div>
                ) : (
                  <div className="w-7 h-10 sm:w-9 sm:h-13 bg-blue-900 border-2 border-amber-400/80 rounded-lg shadow-xl flex items-center justify-center text-[10px] text-amber-300 font-mono font-bold tracking-tighter">
                    🎴
                  </div>
                )}
              </div>
            </div>

            <span className="text-[6px] bg-yellow-400 text-gray-950 px-2 rounded-full font-black uppercase mt-1 shadow">TRỌNG TÀI WHIS / THÔNG BÁO</span>
            <p className="text-[7px] sm:text-[8px] text-yellow-200 bg-black/85 px-3 py-1 rounded-xl border border-yellow-500/50 mt-0.5 font-mono text-center shadow-lg leading-tight whitespace-pre-wrap">
              {resetCountdown !== null ? `⏳ Tổng kết ván (Tự reset sau ${resetCountdown}s)...` : dealerMsg}
            </p>
          </div>

          <div className="absolute flex flex-col items-center gap-1 z-10">
            <div className="bg-gray-950/90 px-3 py-0.5 rounded-full border border-yellow-500/60 text-yellow-400 text-[10px] font-black flex items-center gap-1.5 shadow-xl font-mono">
              <span>🪙 POT:</span>
              <span className="text-amber-300">${pot.toLocaleString()}</span>
            </div>

            <div className="flex gap-1.5 bg-black/50 p-1.5 rounded-xl border border-white/15 min-h-[44px] sm:min-h-[54px] items-center shadow-inner">
              {communityCards.length === 0 ? (
                <span className="text-[9px] text-emerald-200/60 font-mono italic px-2">
                  Chờ người chơi sẵn sàng chia bài...
                </span>
              ) : (
                communityCards.map((card, idx) => (
                  <div key={idx} className="w-7 h-10 sm:w-9 sm:h-13 bg-white rounded-lg flex flex-col justify-between p-1 font-black shadow-2xl text-gray-900 transform transition hover:scale-110">
                    <span className={`text-[9px] sm:text-[11px] leading-none ${card.color}`}>{card.rank}</span>
                    <span className={`text-xs sm:text-sm self-center leading-none ${card.color}`}>{card.suit}</span>
                    <span className={`text-[9px] sm:text-[11px] self-end leading-none ${card.color}`}>{card.rank}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {seats.map((seat, index) => {
            if (!seat) {
              return (
                <div key={index} className={`absolute text-[8px] text-white/40 border border-dashed border-white/30 w-7 h-7 rounded-full flex items-center justify-center bg-black/30 backdrop-blur-sm ${
                  index === 0 ? "bottom-3 left-1/2 -translate-x-1/2" : 
                  index === 1 ? "bottom-6 left-[10%]" : 
                  index === 2 ? "top-1/2 -translate-y-1/2 left-[2%]" : 
                  index === 3 ? "top-1/2 -translate-y-1/2 right-[2%]" : 
                  "bottom-6 right-[10%]"
                }`}>
                  Trống
                </div>
              );
            }

            const isTurn = index === currentTurn && phase !== 'IDLE' && phase !== 'SHOWDOWN';
            const isMySeat = String(seat.id) === String(currentUser?.id) || seat.name === myName;

            return (
              <div key={index} className={`absolute flex flex-col items-center transition-all duration-200 ${
                index === 0 ? "bottom-3 left-1/2 -translate-x-1/2 z-25" : 
                index === 1 ? "bottom-6 left-[10%] z-15" : 
                index === 2 ? "top-1/2 -translate-y-1/2 left-[2%] z-15" : 
                index === 3 ? "top-1/2 -translate-y-1/2 right-[2%] z-15" : 
                "bottom-6 right-[10%] z-15"
              }`}>
                
                {isTurn && (
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[7px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-bold animate-ping shadow-lg">⚡ LƯỢT</span>
                    <span className="text-[8px] bg-black/80 text-yellow-400 px-1.5 py-0.5 rounded-full font-mono font-black border border-yellow-500/50">⏱️ {turnTimeLeft}s</span>
                  </div>
                )}
                {phase === 'IDLE' && (
                  <span className={`text-[7px] px-2 py-0.5 rounded-full font-bold mb-0.5 shadow ${seat.isReady ? 'bg-emerald-400 text-gray-950 font-black' : 'bg-gray-800 text-gray-400'}`}>
                    {seat.isReady ? '✅ SẴN SÀNG' : '⏳ CHỜ'}
                  </span>
                )}
                {seat.folded && <span className="text-[7px] bg-red-950 text-red-400 border border-red-500/40 px-1.5 rounded mb-0.5 font-bold">ĐÃ ÚP BÀI</span>}

                <div className="flex -space-x-2 mb-0.5">
                  {isMySeat || phase === 'SHOWDOWN' ? (
                    seat.cards.map((c, i) => (
                      <div key={i} className="w-6 h-9 sm:w-7 sm:h-11 bg-white rounded-md flex flex-col justify-between p-0.5 text-gray-900 text-[8px] font-black shadow-xl">
                        <span className={`leading-none ${c.color}`}>{c.rank}{c.suit}</span>
                      </div>
                    ))
                  ) : (
                    seat.cards.length > 0 && <div className="w-6 h-9 sm:w-7 sm:h-11 bg-indigo-950 border border-indigo-400/50 rounded-md flex items-center justify-center text-[7px] font-mono shadow-lg">🎴🎴</div>
                  )}
                </div>

                <div className={`flex items-center gap-1 bg-gray-900/95 px-2 py-0.5 rounded-full border backdrop-blur shadow-xl ${isTurn ? 'border-yellow-400 ring-2 ring-yellow-400/40 scale-105' : 'border-gray-700'}`}>
                  <img src={seat.avatar} className="w-4 h-4 rounded-full bg-gray-800 border border-yellow-500/40" />
                  <div className="text-left">
                    <p className="text-[7px] font-black text-yellow-400 leading-none truncate max-w-[55px]">{seat.name}</p>
                    <p className="text-[8px] font-mono font-black text-emerald-300 leading-tight">${seat.chips.toLocaleString()}</p>
                  </div>
                </div>

                {seat.currentBet > 0 && !seat.folded && (
                  <div className="mt-1 bg-black/75 px-2 py-0.5 rounded-full border border-yellow-500/50 text-[8px] text-yellow-300 font-mono font-black shadow-md flex items-center gap-1 animate-fadeIn">
                    <span>🪙 Cược:</span>
                    <span className="text-amber-400">${seat.currentBet.toLocaleString()}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900/95 border-t border-yellow-500/40 p-2 px-3 z-30 backdrop-blur-md shrink-0">
        <div className="max-w-xl mx-auto flex flex-col gap-1.5">
          {phase === 'IDLE' ? (
            <div className="flex gap-2 w-full">
              <button
                onClick={handleToggleReady}
                className={`w-full py-2 font-black rounded-xl shadow-lg active:scale-95 transition text-xs tracking-wider uppercase cursor-pointer ${
                  mySeat?.isReady 
                    ? "bg-rose-600 hover:bg-rose-500 text-white" 
                    : "bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 text-gray-950"
                }`}
              >
                {mySeat?.isReady ? "❌ HỦY SẴN SÀNG" : "🟢 SẴN SÀNG NHẬP CUỘC"}
              </button>
            </div>
          ) : phase === 'SHOWDOWN' ? (
            <div className="flex gap-2 w-full text-center justify-center items-center text-[11px] text-yellow-400 font-bold py-1 font-mono">
              ⏳ Ván đấu kết thúc. Tự động reset bàn sau {resetCountdown ?? 10}s...
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 bg-black/60 p-1 px-3 rounded-xl border border-gray-800">
                <span className="text-[9px] text-yellow-400 font-mono font-black shrink-0">Cược: ${raiseVal}</span>
                <input
                  type="range"
                  min={50}
                  max={myKi}
                  step={50}
                  value={raiseVal}
                  onChange={(e) => setRaiseVal(Number(e.target.value))}
                  disabled={!isMyTurn}
                  className="flex-1 accent-yellow-400 h-1 rounded-lg disabled:opacity-30 cursor-pointer"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setRaiseVal(50)} disabled={!isMyTurn} className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/40 px-1.5 py-0.5 rounded text-[8px] font-bold disabled:opacity-30 transition cursor-pointer">50</button>
                  <button onClick={() => setRaiseVal(100)} disabled={!isMyTurn} className="bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-600/40 px-1.5 py-0.5 rounded text-[8px] font-bold disabled:opacity-30 transition cursor-pointer">100</button>
                  <button onClick={() => setRaiseVal(500)} disabled={!isMyTurn} className="bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-600/40 px-1.5 py-0.5 rounded text-[8px] font-bold disabled:opacity-30 transition cursor-pointer">500</button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 w-full">
                <button 
                  onClick={() => handleAction('fold')} 
                  disabled={!isMyTurn}
                  className="bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-500/50 py-1.5 rounded-xl font-black text-[10px] transition active:scale-95 disabled:opacity-30 shadow cursor-pointer"
                >
                  ÚP BÀI 🏳️
                </button>
                <button 
                  onClick={() => handleAction('call')} 
                  disabled={!isMyTurn}
                  className="bg-blue-950/70 hover:bg-blue-900 text-blue-300 border border-blue-500/50 py-1.5 rounded-xl font-black text-[10px] transition active:scale-95 disabled:opacity-30 shadow cursor-pointer"
                >
                  THEO 🤝
                </button>
                <button 
                  onClick={() => handleAction('raise')} 
                  disabled={!isMyTurn}
                  className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:brightness-110 text-gray-950 font-black py-1.5 rounded-xl text-[10px] transition active:scale-95 disabled:opacity-30 shadow cursor-pointer"
                >
                  TỐ 🚀
                </button>
                <button 
                  onClick={() => handleAction('allin')} 
                  disabled={!isMyTurn}
                  className="bg-gradient-to-r from-purple-600 to-indigo-700 hover:brightness-110 text-white font-black py-1.5 rounded-xl text-[10px] transition active:scale-95 disabled:opacity-30 shadow animate-pulse cursor-pointer"
                >
                  ALL-IN 🔥
                </button>
              </div>
            </div>
          )}
        </div>
      </footer>

      {/* POPUP KHO SKILL */}
      {showSkillModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 pointer-events-auto">
          <div className="bg-slate-900 border-2 border-cyan-500/70 rounded-3xl max-w-xl w-full p-5 max-h-[85vh] overflow-y-auto text-left shadow-2xl relative space-y-4 font-sans text-white">
            <div className="flex justify-between items-center border-b border-cyan-500/40 pb-3">
              <h3 className="text-sm md:text-base font-black text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                ⚔️ KHO KỸ NĂNG POKER THẦN THÁNH
              </h3>
              <button onClick={() => setShowSkillModal(false)} className="bg-rose-600 hover:bg-rose-500 text-white w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center cursor-pointer shadow">✕</button>
            </div>

            <div className="space-y-3">
              {POKER_SKILL_ITEMS.map((skill) => {
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
                        <button onClick={() => handleActivateSkill(skill.id, skill.name, skill.quote)} className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:brightness-110 px-5 py-2 rounded-xl text-[11px] font-black tracking-wider uppercase transition shadow cursor-pointer w-full sm:w-auto">
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

      {showRulesModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-yellow-500/60 rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto text-left shadow-2xl relative">
            <div className="flex justify-between items-center mb-3 border-b border-yellow-500/30 pb-2">
              <h3 className="text-sm font-black text-yellow-400 uppercase tracking-wide flex items-center gap-1.5">
                📜 TRỌN BỘ LUẬT POKER VŨ TRỤ
              </h3>
              <button 
                onClick={() => setShowRulesModal(false)}
                className="bg-rose-600 hover:bg-rose-500 text-white w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-[11px] text-slate-300 leading-relaxed font-sans">
              <div>
                <h4 className="text-yellow-400 font-bold mb-1">1. Giới thiệu & Nhập cuộc:</h4>
                <p>Mỗi người chơi khi vào bàn sẽ mang theo lượng Linh Thạch (Ki) của mình. Bàn chơi tối đa 5 người, chọn bàn thủ công (Lôi Đài 1 hoặc 2) và bấm <strong className="text-emerald-400">Sẵn Sàng</strong> để bắt đầu ván đấu khi có từ 2 người trở lên.</p>
              </div>

              <div>
                <h4 className="text-yellow-400 font-bold mb-1">2. Các Vòng Cược (Betting Rounds):</h4>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Pre-Flop:</strong> Mỗi người chơi được chia 2 lá bài tẩy riêng biệt. Tiền cược mù ban đầu mỗi người là $100.</li>
                  <li><strong>Flop:</strong> Trọng tài Whis lật 3 lá bài chung đầu tiên giữa bàn.</li>
                  <li><strong>Turn:</strong> Lật lá bài chung thứ 4.</li>
                  <li><strong>River:</strong> Lật lá bài chung thứ 5 (lá cuối cùng).</li>
                </ul>
              </div>

              <div>
                <h4 className="text-yellow-400 font-bold mb-1">3. Các Hành Động Trong Lượt (⏱️ Giới hạn 30 giây):</h4>
                <p className="mb-1">Mỗi người có 30 giây suy nghĩ mỗi lượt. Quá thời gian hệ thống tự động úp bài.</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong className="text-rose-400">Úp Bài (Fold):</strong> Bỏ bài nếu thấy bài yếu, chấp nhận mất tiền cược trước đó.</li>
                  <li><strong className="text-cyan-400">Theo (Call):</strong> Bỏ ra số tiền cược ngang bằng với người tố trước đó để tiếp tục chơi.</li>
                  <li><strong className="text-yellow-400">Tố (Raise):</strong> Tăng mức cược lên cao hơn để áp đảo đối thủ.</li>
                  <li><strong className="text-purple-400">All-In:</strong> Cược toàn bộ số Linh Thạch còn lại của mình vào Pot. Khi đối thủ không đủ tiền, bàn chơi tự động mở hết bài (Showdown).</li>
                </ul>
              </div>

              <div>
                <h4 className="text-yellow-400 font-bold mb-1">4. Xếp Hạng Bài (Từ cao xuống thấp):</h4>
                <p>Thùng Phá Sảnh &gt; Tứ Quý &gt; Cù Lũ &gt; Thùng (Flush) &gt; Sảnh (Straight) &gt; Sám Chi (3 lá) &gt; Thú (2 đôi) &gt; Một Đôi &gt; Mậu Thầu (Bài cao).</p>
              </div>
            </div>

            <div className="mt-5 text-center">
              <button
                onClick={() => setShowRulesModal(false)}
                className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black px-6 py-2 rounded-xl text-xs uppercase shadow cursor-pointer"
              >
                Đã Hiểu, Chiến Thôi! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}