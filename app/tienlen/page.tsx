"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

// --- CẤU HÌNH SUPABASE ---
const supabaseUrl = "https://iaejbvlibjfpdwuqfszp.supabase.co";
const supabaseKey = "sb_publishable_Bf1jY3-FAjFRij0LMn5FLQ_nLrw2MUE";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

const BET_OPTIONS = [100, 500, 1000, 5000, 10000, 100000];

const ANIME_QUOTES = {
  START: ["Khí áp này... Trận chiến bắt đầu!", "Thế giới này sẽ biết đến nỗi đau!", "Lĩnh Vực Mở Rộng... Khai cuộc!"],
  PASS: ["Bản Vương nhường ngươi bước này!", "Sức mạnh đó... Ta tạm né tránh!", "Không tồi, ta bỏ lượt!"],
  PLAY: ["Thức Thứ Nhất: XUẤT CHIÊU!", "Sức mạnh tuyệt đối! Đỡ lấy!", "Cảm nhận ma lực này đi!"],
  CHOP: ["CHÁY KHÉT! DÍNH ĐÒN CHẶT HEO!", "Tứ Quý / 3 Đôi Thông giáng lâm!", "Không thể trốn thoát!"],
  WIN: ["Tuyệt đối áp đảo! Ta là Bá Chủ!", "Trận chiến kết thúc quá nhanh!", "Ngai vàng này là của ta!"]
};

const DEFAULT_AVATARS = Array.from({ length: 30 }, (_, index) => `/assets/avatar/xtra${index + 1}.ico`);

type Suit = "Bích" | "Chuồn" | "Rô" | "Cơ";
const SUITS: Suit[] = ["Bích", "Chuồn", "Rô", "Cơ"];
const RANKS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];
const SUIT_SYMBOLS = { Bích: "♠", Chuồn: "♣", Rô: "♦", Cơ: "♥" };
const SUIT_COLORS = { Bích: "#1e293b", Chuồn: "#1e293b", Rô: "#ef4444", Cơ: "#ef4444" };

interface Card {
  id: string;
  rank: string;
  suit: Suit;
  rankValue: number;
  suitValue: number;
  selected?: boolean; 
}

interface PlayerState {
  id: string;
  name: string;
  avatar: string;
  isReady: boolean;
  isSpectator: boolean;
  hand: Card[];
  hasPassed: boolean;
  balance: number;
  quote?: string;
}

interface RoomState {
  status: "WAITING" | "COUNTDOWN" | "PLAYING" | "ENDED";
  countdown: number;
  betAmount: number;
  hostId: string | null;
  players: PlayerState[];
  tableCards: Card[];
  currentTurnId: string | null;
  lastWinnerId: string | null;
  winnerName?: string | null;
  chopMessage?: string | null;
  passCount: number;
  snatchTargetId?: string | null;
  snatchSnatcherId?: string | null;
  snatchActive?: boolean;
}

const DEFAULT_ROOM_STATE: RoomState = {
  status: "WAITING",
  countdown: 10,
  betAmount: 1000,
  hostId: null,
  players: [],
  tableCards: [],
  currentTurnId: null,
  lastWinnerId: null,
  winnerName: null,
  chopMessage: null,
  passCount: 0,
  snatchTargetId: null,
  snatchSnatcherId: null,
  snatchActive: false
};

const compareCards = (c1: Card, c2: Card) => {
  if (c1.rankValue !== c2.rankValue) return c1.rankValue - c2.rankValue;
  return c1.suitValue - c2.suitValue;
};

const getCombinationType = (cards: Card[]) => {
  if (cards.length === 0) return { type: "INVALID" };
  const sorted = [...cards].sort((a, b) => compareCards(a, b));
  const len = sorted.length;

  if (len === 1) return { type: "SINGLE", highest: sorted[0] };
  if (len === 2 && sorted[0].rankValue === sorted[1].rankValue) return { type: "PAIR", highest: sorted[1] };
  if (len === 3 && sorted[0].rankValue === sorted[1].rankValue && sorted[1].rankValue === sorted[2].rankValue) return { type: "TRIPLE", highest: sorted[2] };
  if (len === 4 && sorted[0].rankValue === sorted[1].rankValue && sorted[1].rankValue === sorted[2].rankValue && sorted[2].rankValue === sorted[3].rankValue) return { type: "FOUR_OF_KIND", highest: sorted[3] };

  if (len === 6) {
    let isThreePairs = true;
    for (let i = 0; i < 6; i += 2) {
      if (sorted[i].rankValue !== sorted[i+1].rankValue || (i < 4 && sorted[i+2].rankValue - sorted[i].rankValue !== 1)) {
        isThreePairs = false;
        break;
      }
    }
    if (isThreePairs) return { type: "THREE_PAIRS", highest: sorted[5] };
  }

  if (len >= 3) {
    let isStraight = true;
    for (let i = 0; i < len - 1; i++) {
      if (sorted[i].rankValue === 15 || sorted[i + 1].rankValue - sorted[i].rankValue !== 1) {
        isStraight = false;
        break;
      }
    }
    if (isStraight) return { type: "STRAIGHT", highest: sorted[len - 1], length: len };
  }

  return { type: "INVALID" };
};

const isValidMove = (selectedCards: Card[], tableCards: Card[]) => {
  const selCombo = getCombinationType(selectedCards);
  if (selCombo.type === "INVALID") return { valid: false, reason: "Chiêu thức không hợp lệ!" };
  if (tableCards.length === 0) return { valid: true };

  const tableCombo = getCombinationType(tableCards);

  if (tableCombo.type === "SINGLE" && tableCombo.highest?.rankValue === 15) {
    if (selCombo.type === "FOUR_OF_KIND") return { valid: true, chopType: "QUATRO" };
    if (selCombo.type === "THREE_PAIRS") return { valid: true, chopType: "THREE_PAIRS" };
  }

  if (tableCombo.type === "FOUR_OF_KIND" && selCombo.type === "FOUR_OF_KIND") {
    if (compareCards(selCombo.highest!, tableCombo.highest!) > 0) return { valid: true, chopType: "QUATRO" };
    return { valid: false, reason: "Tứ quý chưa đủ uy lực áp đảo!" };
  }

  if (selCombo.type !== tableCombo.type) {
    return { valid: false, reason: "Phải đối chưởng cùng hệ chiêu thức!" };
  }
  if (selCombo.type === "STRAIGHT" && selCombo.length !== tableCombo.length) {
    return { valid: false, reason: "Độ dài chuỗi sảnh phải tương đương!" };
  }
  if (compareCards(selCombo.highest!, tableCombo.highest!) > 0) {
    return { valid: true };
  }

  return { valid: false, reason: "Khí lực chiêu thức quá yếu so với đối phương!" };
};

export default function TienLenOnlineVip() {
  const [myUserId, setMyUserId] = useState<string>("");
  const [myName, setMyName] = useState<string>("");
  const [myAvatar, setMyAvatar] = useState<string>(DEFAULT_AVATARS[0]);
  const [myRealBalance, setMyRealBalance] = useState<number>(5000);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [currentPhase, setCurrentPhase] = useState<"HOME" | "LOBBY" | "ROOM">("HOME");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<RoomState | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  
  const [showRuleModal, setShowRuleModal] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      let uid = "";
      let name = "";
      let avatar = "";
      let balance = 5000;

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        uid = session.user.id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, balance")
          .eq("id", uid)
          .single();

        if (profile) {
          name = profile.full_name || session.user.user_metadata?.username || "";
          avatar = profile.avatar_url || "";
          balance = profile.balance ?? 5000;
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
      }

      if (!name) name = "Chiến Binh " + uid.substring(uid.length - 4);
      if (!avatar) avatar = DEFAULT_AVATARS[0];

      setMyUserId(uid);
      setMyName(name);
      setMyAvatar(avatar);
      setMyRealBalance(balance);
    };

    fetchUserProfile();
  }, []);

  const stateRef = useRef({ width: 0, height: 0, data: roomData, myId: myUserId, roomId: roomId });
  useEffect(() => {
    stateRef.current.data = roomData;
    stateRef.current.myId = myUserId;
    stateRef.current.roomId = roomId;
  }, [roomData, myUserId, roomId]);

  useEffect(() => {
    if (currentPhase !== "ROOM" || !roomId) return;
    const img = new Image();
    if (roomId === "ROOM_1") {
      img.src = "/assets/tienlen/backgroundroom1.png";
    } else {
      img.src = "/assets/tienlen/backgroundroom2.png";
    }
    img.onload = () => {
      bgImageRef.current = img;
    };
  }, [currentPhase, roomId]);

  // XỬ LÝ KHI RỜI BÀN (XỬ THUA NẾU ĐANG PLAYING)
  const leaveRoomInternal = useCallback(async () => {
    const { data, myId, roomId: rId } = stateRef.current;
    if (!rId || !myId) return;

    let currentPlayers: PlayerState[] = [];
    let currentStatus = "WAITING";
    let betAmt = 1000;

    if (data && data.players) {
      currentPlayers = data.players;
      currentStatus = data.status;
      betAmt = data.betAmount;
    } else {
      const { data: res } = await supabase.from("tienlen_rooms").select("state").eq("id", rId).single();
      if (res?.state?.players) {
        currentPlayers = res.state.players;
        currentStatus = res.state.status;
        betAmt = res.state.betAmount || 1000;
      }
    }

    const leaver = currentPlayers.find(p => p.id === myId);
    const remainingPlayers = currentPlayers.filter(p => p.id !== myId);
    let updatedState: RoomState;

    if (remainingPlayers.length === 0) {
      updatedState = DEFAULT_ROOM_STATE;
    } else {
      // NẾU ĐANG TRONG TRẬN ĐẤU (PLAYING) MÀ BỎ CHẠY -> XỬ THUA, TRỪ ĐIỂM, NGƯỜI CÒN LẠI THẮNG
      if (currentStatus === "PLAYING" && leaver && !leaver.isSpectator) {
        const activeRemaining = remainingPlayers.filter(p => !p.isSpectator);
        if (activeRemaining.length === 1) {
          const winner = activeRemaining[0];
          const penalty = 13 * betAmt; // Phạt nặng khi bỏ trận

          leaver.balance -= penalty;
          winner.balance += penalty;

          updatedState = {
            ...(data || DEFAULT_ROOM_STATE),
            status: "ENDED",
            players: remainingPlayers.map(p => p.id === winner.id ? { ...p, balance: winner.balance } : p),
            winnerName: `${winner.name} (Do đối thủ bỏ chạy 🏳️)`,
            chopMessage: `⚡ ${leaver.name} đã đào tẩu giữa trận! Xử thua trừ ${penalty.toLocaleString()} Linh Thạch!`,
            snatchActive: false
          };

          await supabase.from("tienlen_rooms").update({ state: updatedState }).eq("id", rId);
          return;
        }
      }

      const oldHost = data?.hostId || currentPlayers[0]?.id;
      const newHost = remainingPlayers.some(p => p.id === oldHost) ? oldHost : remainingPlayers[0].id;
      updatedState = {
        ...(data || DEFAULT_ROOM_STATE),
        players: remainingPlayers,
        hostId: newHost
      };
    }

    await supabase.from("tienlen_rooms").update({ state: updatedState }).eq("id", rId);
  }, []);

  useEffect(() => {
    const handlePopState = () => leaveRoomInternal();
    const handleBeforeUnload = () => {
      const { data, myId, roomId: rId } = stateRef.current;
      if (!rId || !myId) return;

      const currentPlayers = data?.players || [];
      const currentStatus = data?.status || "WAITING";
      const betAmt = data?.betAmount || 1000;
      const leaver = currentPlayers.find(p => p.id === myId);
      const remainingPlayers = currentPlayers.filter(p => p.id !== myId);
      let updatedState: RoomState;

      if (remainingPlayers.length === 0) {
        updatedState = DEFAULT_ROOM_STATE;
      } else {
        if (currentStatus === "PLAYING" && leaver && !leaver.isSpectator) {
          const activeRemaining = remainingPlayers.filter(p => !p.isSpectator);
          if (activeRemaining.length === 1) {
            const winner = activeRemaining[0];
            const penalty = 13 * betAmt;
            leaver.balance -= penalty;
            winner.balance += penalty;
            updatedState = {
              ...(data || DEFAULT_ROOM_STATE),
              status: "ENDED",
              players: remainingPlayers,
              winnerName: `${winner.name} (Đối thủ bỏ chạy)`,
              chopMessage: `⚡ ${leaver.name} đã bỏ trốn! Xử thua!`,
              snatchActive: false
            };
          } else {
            const oldHost = data?.hostId || currentPlayers[0]?.id;
            const newHost = remainingPlayers.some(p => p.id === oldHost) ? oldHost : remainingPlayers[0].id;
            updatedState = { ...(data || DEFAULT_ROOM_STATE), players: remainingPlayers, hostId: newHost };
          }
        } else {
          const oldHost = data?.hostId || currentPlayers[0]?.id;
          const newHost = remainingPlayers.some(p => p.id === oldHost) ? oldHost : remainingPlayers[0].id;
          updatedState = { ...(data || DEFAULT_ROOM_STATE), players: remainingPlayers, hostId: newHost };
        }
      }

      navigator.sendBeacon(
        `${supabaseUrl}/rest/v1/tienlen_rooms?id=eq.${rId}`,
        JSON.stringify({ state: updatedState })
      );
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [leaveRoomInternal]);

  const updateRoomState = async (newState: Partial<RoomState>) => {
    if (!roomId || !roomData) return;
    const mergedState = { ...roomData, ...newState };
    await supabase.from("tienlen_rooms").update({ state: mergedState }).eq("id", roomId);
  };

  useEffect(() => {
    if (currentPhase !== "ROOM" || !roomId) return;

    supabase.from("tienlen_rooms").select("state").eq("id", roomId).single().then(({ data }) => {
      if (data && data.state) {
        setRoomData(data.state);
      } else {
        setRoomData(DEFAULT_ROOM_STATE);
      }
    });

    const channel = supabase.channel(`room_chan_${roomId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tienlen_rooms", filter: `id=eq.${roomId}` }, (payload) => {
        if (payload.new && payload.new.state) {
          setRoomData(payload.new.state);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentPhase, roomId]);

  useEffect(() => {
    if (!roomData || roomData.status !== "COUNTDOWN" || roomData.players[0]?.id !== myUserId) return;
    
    if (roomData.countdown > 0) {
      const timer = setTimeout(() => {
        updateRoomState({ countdown: roomData.countdown - 1 });
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      handleStartGame(roomData);
    }
  }, [roomData?.status, roomData?.countdown]);

  useEffect(() => {
    if (!roomData || !roomData.snatchActive || roomData.snatchSnatcherId !== myUserId) return;

    const timer = setTimeout(() => {
      updateRoomState({
        status: "ENDED",
        snatchActive: false,
        chopMessage: "⏰ Hết thời gian tụ khí bắt heo!"
      });

      setTimeout(() => {
        updateRoomState({ 
          status: "WAITING", 
          countdown: 10, 
          tableCards: [],
          chopMessage: null,
          snatchActive: false,
          players: roomData.players.map(p => ({ ...p, isReady: false, isSpectator: false, hand: [] })) 
        });
      }, 4000);
    }, 10000);

    return () => clearTimeout(timer);
  }, [roomData?.snatchActive, roomData?.snatchSnatcherId]);

  const handleJoinRoom = async (selectedRoom: string) => {
    if (isJoining) return;
    setIsJoining(true);

    try {
      const { data } = await supabase.from("tienlen_rooms").select("state").eq("id", selectedRoom).single();
      let state: RoomState = data && data.state ? data.state : DEFAULT_ROOM_STATE;

      const currentPlayers = state.players || [];
      const filteredPlayers = currentPlayers.filter(p => p.id !== myUserId);

      if (filteredPlayers.length >= 4) {
        alert("Lôi đài đã hội tụ đủ 4 Đại Cao Thủ!");
        setIsJoining(false);
        return;
      }

      const newPlayer: PlayerState = {
        id: myUserId,
        name: myName,
        avatar: myAvatar,
        isReady: false,
        isSpectator: false,
        hand: [],
        hasPassed: false,
        balance: myRealBalance,
        quote: "Khí áp thật kinh người..."
      };

      const updatedPlayers = [...filteredPlayers, newPlayer];
      const hostId = state.hostId && updatedPlayers.some(p => p.id === state.hostId) ? state.hostId : updatedPlayers[0].id;

      const updatedState = { 
        ...state, 
        players: updatedPlayers, 
        hostId,
        snatchActive: false,
        snatchTargetId: null,
        snatchSnatcherId: null
      };

      await supabase.from("tienlen_rooms").upsert({ id: selectedRoom, state: updatedState });

      setRoomId(selectedRoom);
      setRoomData(updatedState);
      setCurrentPhase("ROOM");
    } catch (err: any) {
      alert("Lỗi bước vào lôi đài: " + err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveRoom = async () => {
    await leaveRoomInternal();
    setRoomId(null);
    setRoomData(null);
    setCurrentPhase("LOBBY");
  };

  const handleSelectBet = async (bet: number) => {
    if (!roomData || roomData.hostId !== myUserId || roomData.status === "PLAYING") return;
    await updateRoomState({ betAmount: bet });
  };

  const handleToggleReady = async () => {
    if (!roomData) return;
    const newPlayers = roomData.players.map(p => p.id === myUserId ? { ...p, isReady: !p.isReady } : p);
    
    let newStatus = roomData.status;
    let newCountdown = roomData.countdown;
    const readyCount = newPlayers.filter(p => p.isReady).length;
    
    if (newPlayers.length >= 2 && readyCount === newPlayers.length) {
      handleStartGame({ ...roomData, players: newPlayers });
      return;
    } 
    else if (readyCount >= 2 && newStatus === "WAITING") {
      newStatus = "COUNTDOWN";
      newCountdown = 10;
    } 
    else if (readyCount < 2) {
      newStatus = "WAITING";
      newCountdown = 10;
    }

    await updateRoomState({ players: newPlayers, status: newStatus, countdown: newCountdown });
  };

  const handleStartGame = async (stateToStart: RoomState) => {
    let deck: Card[] = [];
    for (let r = 0; r < RANKS.length; r++) {
      for (let s = 0; s < SUITS.length; s++) {
        deck.push({ id: `${RANKS[r]}_${SUITS[s]}`, rank: RANKS[r], suit: SUITS[s], rankValue: r + 3, suitValue: s, selected: false });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    let deckIndex = 0;
    const updatedPlayers = stateToStart.players.map(p => {
      if (p.isReady) {
        let hand = deck.slice(deckIndex * 13, (deckIndex + 1) * 13);
        hand.sort((a, b) => compareCards(a, b));
        deckIndex++;
        return {
          ...p,
          isSpectator: false,
          hand: hand,
          hasPassed: false,
          quote: ANIME_QUOTES.START[Math.floor(Math.random() * ANIME_QUOTES.START.length)]
        };
      } else {
        return {
          ...p,
          isSpectator: true,
          hand: [],
          hasPassed: true,
          quote: "Ta tọa sơn quan hổ đấu!"
        };
      }
    });

    const activePlayers = updatedPlayers.filter(p => !p.isSpectator);
    let firstTurnId = activePlayers[0]?.id;

    if (stateToStart.lastWinnerId && activePlayers.find(p => p.id === stateToStart.lastWinnerId)) {
      firstTurnId = stateToStart.lastWinnerId;
    } else {
      const playerWith3Bich = activePlayers.find(p => p.hand.find(c => c.id === "3_Bích"));
      if (playerWith3Bich) firstTurnId = playerWith3Bich.id;
    }

    await updateRoomState({
      status: "PLAYING",
      players: updatedPlayers,
      tableCards: [],
      currentTurnId: firstTurnId,
      passCount: 0,
      winnerName: null,
      chopMessage: null,
      snatchActive: false,
      snatchTargetId: null,
      snatchSnatcherId: null
    });
  };

  const getNextTurnPlayerId = (currentPlayers: PlayerState[], currentId: string) => {
    const actives = currentPlayers.filter(p => !p.isSpectator);
    if (actives.length === 0) return null;
    
    const currIdx = actives.findIndex(p => p.id === currentId);
    let nextIdx = (currIdx + 1) % actives.length;
    
    let count = 0;
    while (actives[nextIdx].hasPassed && count < actives.length) {
      nextIdx = (nextIdx + 1) % actives.length;
      count++;
    }
    return actives[nextIdx].id;
  };

  const checkEndgameSnatch = (players: PlayerState[], winnerId: string) => {
    const activePlayers = players.filter(p => !p.isSpectator);
    if (activePlayers.length === 2) {
      const loser = activePlayers.find(p => p.id !== winnerId);
      if (loser) {
        const hasPig = loser.hand.some(c => c.rank === "2");
        if (hasPig) {
          return { snatchActive: true, targetId: loser.id, snatcherId: winnerId };
        }
      }
    }
    return { snatchActive: false, targetId: null, snatcherId: null };
  };

  const handlePlayCards = async () => {
    setErrorMessage("");
    if (!roomData || roomData.currentTurnId !== myUserId) {
      setErrorMessage("Chưa tới lượt xuất chiêu của ngươi!");
      return;
    }

    const me = roomData.players.find(p => p.id === myUserId);
    const selected = me?.hand.filter(c => c.selected) || [];

    if (selected.length === 0) {
      setErrorMessage("Hãy chọn ấn ký bài để bộc phát công lực!");
      return;
    }

    const check = isValidMove(selected, roomData.tableCards);
    if (!check.valid) {
      setErrorMessage(check.reason || "Nước đi không hợp lệ!");
      return;
    }

    const newPlayers = [...roomData.players];
    const myIdx = newPlayers.findIndex(p => p.id === myUserId);
    newPlayers[myIdx].hand = me!.hand.filter(c => !c.selected);
    newPlayers[myIdx].quote = ANIME_QUOTES.PLAY[Math.floor(Math.random() * ANIME_QUOTES.PLAY.length)];

    let chopText = null;
    if (check.chopType) {
      const multiplier = check.chopType === "QUATRO" ? 10 : 5;
      const penaltyAmount = roomData.betAmount * multiplier;
      newPlayers[myIdx].balance += penaltyAmount;
      newPlayers[myIdx].quote = ANIME_QUOTES.CHOP[Math.floor(Math.random() * ANIME_QUOTES.CHOP.length)];
      chopText = `⚡ ${newPlayers[myIdx].name} KHAI HỎA CHẶT HEO! Ép nổ x${multiplier} công lực (+${penaltyAmount.toLocaleString()} Linh Thạch)!`;
    }

    if (newPlayers[myIdx].hand.length === 0) {
      newPlayers[myIdx].quote = ANIME_QUOTES.WIN[Math.floor(Math.random() * ANIME_QUOTES.WIN.length)];

      newPlayers.forEach(p => {
        if (!p.isSpectator && p.id !== myUserId) {
          const cardCount = p.hand.length;
          const losePenalty = cardCount * roomData.betAmount;
          p.balance -= losePenalty;
          newPlayers[myIdx].balance += losePenalty;
        }
      });

      const snatchCheck = checkEndgameSnatch(newPlayers, myUserId);

      await updateRoomState({ 
        status: snatchCheck.snatchActive ? "PLAYING" : "ENDED", 
        lastWinnerId: myUserId, 
        winnerName: me?.name || "Siêu Chiến Binh",
        tableCards: selected, 
        players: newPlayers,
        chopMessage: chopText,
        snatchActive: snatchCheck.snatchActive,
        snatchTargetId: snatchCheck.targetId,
        snatchSnatcherId: snatchCheck.snatcherId
      });

      if (!snatchCheck.snatchActive) {
        setTimeout(() => {
          updateRoomState({ 
            status: "WAITING", 
            countdown: 10, 
            tableCards: [],
            chopMessage: null,
            snatchActive: false,
            players: newPlayers.map(p => ({ ...p, isReady: false, isSpectator: false, hand: [] })) 
          });
        }, 6000);
      }
      return;
    }

    const nextId = getNextTurnPlayerId(newPlayers, myUserId);
    await updateRoomState({ 
      tableCards: selected, 
      players: newPlayers, 
      passCount: 0, 
      currentTurnId: nextId,
      chopMessage: chopText
    });
  };

  const handleSnatchPig = async (chosenSuit: Suit | null) => {
    if (!roomData || !roomData.snatchActive || roomData.snatchSnatcherId !== myUserId) return;

    const newPlayers = [...roomData.players];
    const targetPlayer = newPlayers.find(p => p.id === roomData.snatchTargetId);
    const snatcherPlayer = newPlayers.find(p => p.id === myUserId);

    if (!targetPlayer || !snatcherPlayer) return;

    let snatchMsg = "";
    const bet = roomData.betAmount;

    if (chosenSuit === null) {
      snatchMsg = `🛡️ ${snatcherPlayer.name} thu hồi khí tức, bỏ qua việc truy sát Heo! Trận chiến hạ màn.`;
    } else {
      const targetPig = targetPlayer.hand.find(c => c.rank === "2" && c.suit === chosenSuit);
      if (targetPig) {
        const multiplier = (chosenSuit === "Bích" || chosenSuit === "Chuồn") ? 2 : 4;
        const reward = bet * multiplier;

        targetPlayer.balance -= reward;
        snatcherPlayer.balance += reward;
        snatchMsg = `🎯 TRUY SÁT CHUẨN XÁC! ${targetPlayer.name} giấu Heo ${chosenSuit}, bị phạt cống nạp ${reward.toLocaleString()} Linh Thạch cho ${snatcherPlayer.name}!`;
      } else {
        const expectedMultiplier = (chosenSuit === "Bích" || chosenSuit === "Chuồn") ? 2 : 4;
        const penalty = bet * expectedMultiplier * 2; 

        snatcherPlayer.balance -= penalty;
        targetPlayer.balance += penalty;
        snatchMsg = `❌ PHÁN ĐOÁN SAI! ${snatcherPlayer.name} truy sát hụt Heo ${chosenSuit}, bị phản phệ GẤP ĐÔI (-${penalty.toLocaleString()} Linh Thạch)!`;
      }
    }

    await updateRoomState({
      status: "ENDED",
      winnerName: snatcherPlayer.name,
      chopMessage: snatchMsg,
      snatchActive: false,
      players: newPlayers
    });

    setTimeout(() => {
      updateRoomState({ 
        status: "WAITING", 
        countdown: 10, 
        tableCards: [],
        chopMessage: null,
        snatchActive: false,
        players: newPlayers.map(p => ({ ...p, isReady: false, isSpectator: false, hand: [] })) 
      });
    }, 6000);
  };

  const handlePassTurn = async () => {
    setErrorMessage("");
    if (!roomData || roomData.currentTurnId !== myUserId) {
      setErrorMessage("Chưa tới lượt xuất chiêu của ngươi!");
      return;
    }

    if (roomData.tableCards.length === 0) {
      setErrorMessage("Lôi đài trống trải, không thể né tránh (Bỏ lượt) lúc này!");
      return;
    }

    const activePlayers = roomData.players.filter(p => !p.isSpectator);
    const newPlayers = [...roomData.players];
    const myIdx = newPlayers.findIndex(p => p.id === myUserId);
    newPlayers[myIdx].hasPassed = true;
    newPlayers[myIdx].quote = ANIME_QUOTES.PASS[Math.floor(Math.random() * ANIME_QUOTES.PASS.length)];
    
    const passedPlayers = newPlayers.filter(p => !p.isSpectator && p.hasPassed);
    
    if (passedPlayers.length >= activePlayers.length - 1) {
      const nextLeaderId = getNextTurnPlayerId(newPlayers, myUserId);
      const resetPlayers = newPlayers.map(p => ({
        ...p,
        hasPassed: p.isSpectator ? true : false
      }));

      await updateRoomState({ 
        passCount: 0, 
        tableCards: [], 
        players: resetPlayers, 
        currentTurnId: nextLeaderId || myUserId,
        chopMessage: null
      });
    } else {
      const nextId = getNextTurnPlayerId(newPlayers, myUserId);
      await updateRoomState({ 
        players: newPlayers, 
        passCount: roomData.passCount + 1, 
        currentTurnId: nextId,
        chopMessage: null
      });
    }
  };

  // CANVAS RENDER: FIX TỌA ĐỘ TOUCH TRÊN IOS PWA KHI XOAY NGANG & CHỐNG TRẢ NGƯỢC LÁ BÀI
  useEffect(() => {
    if (currentPhase !== "ROOM") return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const updateCanvasSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      
      stateRef.current.width = w;
      stateRef.current.height = h;
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    window.addEventListener("orientationchange", () => {
      setTimeout(updateCanvasSize, 300);
    });

    const drawCard = (ctx: CanvasRenderingContext2D, x: number, y: number, card: Card | null, width: number, height: number, isFaceUp: boolean = true) => {
      const radius = 6;
      ctx.save(); ctx.translate(x, y);
      ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
      ctx.beginPath();
      ctx.moveTo(radius, 0); ctx.lineTo(width - radius, 0); ctx.quadraticCurveTo(width, 0, width, radius);
      ctx.lineTo(width, height - radius); ctx.quadraticCurveTo(width, height, width - radius, height);
      ctx.lineTo(radius, height); ctx.quadraticCurveTo(0, height, 0, height - radius);
      ctx.lineTo(0, radius); ctx.quadraticCurveTo(0, 0, radius, 0); ctx.closePath();

      if (isFaceUp && card) {
        ctx.fillStyle = "#ffffff"; ctx.fill();
        ctx.shadowColor = "transparent"; ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = SUIT_COLORS[card.suit];
        const fontSize = Math.max(12, width * 0.26);
        ctx.font = `900 ${fontSize}px sans-serif`; ctx.fillText(card.rank, 5, fontSize + 2);
        const symbolSize = Math.max(10, width * 0.2);
        ctx.font = `${symbolSize}px sans-serif`; ctx.fillText(SUIT_SYMBOLS[card.suit], 5, fontSize + symbolSize + 3);
        const centerSize = Math.max(22, width * 0.38);
        ctx.font = `${centerSize}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(SUIT_SYMBOLS[card.suit], width / 2, height / 2 + 1);
      } else {
        ctx.fillStyle = "#1e3a8a"; ctx.fill();
        ctx.shadowColor = "transparent"; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.strokeRect(3, 3, width - 6, height - 6);
        ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.arc(width/2, height/2, width*0.3, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    };

    let animationFrameId: number;
    const render = () => {
      const { width: w, height: h, data, myId } = stateRef.current;
      if (!data) return;

      ctx.clearRect(0, 0, w, h);
      
      const bgImg = bgImageRef.current;
      if (bgImg && bgImg.complete) {
        ctx.drawImage(bgImg, 0, 0, w, h);
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(0, 0, w, h);
      } else {
        const gradient = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, Math.max(w, h));
        gradient.addColorStop(0, "#15803d"); 
        gradient.addColorStop(0.7, "#065f46"); 
        gradient.addColorStop(1, "#022c22"); 
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
      }

      ctx.strokeStyle = "rgba(234, 179, 8, 0.35)"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(w / 2, h / 2 - 25, w * 0.38, h * 0.28, 0, 0, Math.PI * 2); ctx.stroke();

      if (data.status === "PLAYING" || data.status === "ENDED") {
        if (data.tableCards.length > 0 && !data.snatchActive) {
          const tCardW = Math.min(w / 12, 52); const tCardH = tCardW * 1.45;
          const totalW = (data.tableCards.length - 1) * 22 + tCardW;
          data.tableCards.forEach((card, idx) => drawCard(ctx, w / 2 - totalW / 2 + idx * 22, h / 2 - tCardH / 2 - 30, card, tCardW, tCardH, true));
        }

        const myIdx = data.players.findIndex(p => p.id === myId);
        const cardW = Math.min(w / 11, 58); const cardH = cardW * 1.45;
        const oppCardW = Math.min(w / 18, 34); const oppCardH = oppCardW * 1.45;

        data.players.forEach((p, idx) => {
          let relativePos = myIdx === -1 ? idx : (idx - myIdx + data.players.length) % data.players.length;
          
          if (relativePos === 0 && p.id === myId) {
            if (!p.isSpectator) {
              const overlap = Math.min(cardW * 0.4, (w - cardW - 20) / (p.hand.length || 1));
              const totalHandWidth = (p.hand.length - 1) * overlap + cardW;
              const handY = h - cardH - 65;
              p.hand.forEach((card, i) => drawCard(ctx, w / 2 - totalHandWidth / 2 + i * overlap, card.selected ? handY - 22 : handY, card, cardW, cardH, true));
            }
          } else {
            const x = relativePos === 1 ? w - oppCardW - 20 : relativePos === 2 ? w / 2 - oppCardW / 2 : 20;
            const y = relativePos === 1 ? h / 2 - oppCardH - 20 : relativePos === 2 ? 6 : h / 2 - oppCardH - 20;
            
            if (!p.isSpectator && p.hand.length > 0) {
              drawCard(ctx, x, y, null, oppCardW, oppCardH, false);
            }
          }
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };
    animationFrameId = requestAnimationFrame(render);

    // XỬ LÝ CHỈ DÙNG TOUCHSTART ĐỂ BẮT CHUẨN XÁC, TRÁNH LỖI GẤP ĐÔI SỰ KIỆN TRÊN MOBILE
    const handleCardSelection = (e: TouchEvent | MouseEvent) => {
      const { width: w, height: h, data, myId } = stateRef.current;
      if (!data || data.status !== "PLAYING") return;
      const me = data.players.find(p => p.id === myId);
      if (!me || me.isSpectator) return;

      const rect = canvas.getBoundingClientRect();
      let clientX = 0, clientY = 0;

      if ('touches' in e) {
        if (e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      const cX = clientX - rect.left;
      const cY = clientY - rect.top;

      const cardW = Math.min(w / 11, 58); const cardH = cardW * 1.45;
      const overlap = Math.min(cardW * 0.4, (w - cardW - 20) / (me.hand.length || 1));
      const handStartX = w / 2 - ((me.hand.length - 1) * overlap + cardW) / 2;
      const handY = h - cardH - 65;
      const hitBufferY = 30;

      // Duyệt ngược từ phải qua trái để chọn đúng lá bài trên cùng khi bị xếp chồng
      for (let i = me.hand.length - 1; i >= 0; i--) {
        const card = me.hand[i];
        const cardX = handStartX + i * overlap;
        const cardY = card.selected ? handY - 22 : handY;
        const clickableW = (i === me.hand.length - 1) ? cardW : overlap;

        if (cX >= cardX - 8 && cX <= cardX + clickableW + 8 && cY >= cardY - hitBufferY && cY <= cardY + cardH + hitBufferY) {
           const newPlayers = [...data.players];
           const myIdx = newPlayers.findIndex(p => p.id === myId);
           newPlayers[myIdx].hand[i].selected = !newPlayers[myIdx].hand[i].selected;
           
           setRoomData({...data, players: newPlayers});
           break; 
        }
      }
    };
    
    const canvasElement = canvasRef.current;
    // Chỉ lắng nghe touchstart trên mobile để nhạy và không bị trả ngược trạng thái
    canvasElement?.addEventListener("touchstart", handleCardSelection, { passive: true });
    canvasElement?.addEventListener("click", handleCardSelection);

    return () => { 
      cancelAnimationFrame(animationFrameId); 
      window.removeEventListener("resize", updateCanvasSize); 
      canvasElement?.removeEventListener("touchstart", handleCardSelection); 
      canvasElement?.removeEventListener("click", handleCardSelection); 
    };
  }, [currentPhase, roomData?.status]);

  const renderCornerSlots = () => {
    if (!roomData) return null;
    const myIdx = roomData.players.findIndex(p => p.id === myUserId);
    const slots = [0, 1, 2, 3];

    return slots.map(slotIdx => {
      let player = roomData.players.find((_, pIdx) => {
        let rel = myIdx === -1 ? pIdx : (pIdx - myIdx + roomData.players.length) % roomData.players.length;
        return rel === slotIdx;
      });

      const posStyle = 
        slotIdx === 0 ? "bottom-1 left-1/2 -translate-x-1/2 z-10" : 
        slotIdx === 1 ? "right-2 top-1/2 translate-y-6 flex-col items-end z-20" :
        slotIdx === 2 ? "top-10 left-1/2 -translate-x-1/2 flex-col items-center z-20" :
        "left-2 top-1/2 translate-y-6 flex-col items-start z-20";

      const isCurrentTurn = roomData.status === "PLAYING" && player?.id === roomData.currentTurnId;
      const isMe = slotIdx === 0 && player;
      const canAct = isMe && roomData.status === "PLAYING" && !player.isSpectator && isCurrentTurn;

      return (
        <div key={slotIdx} className={`absolute flex ${posStyle} pointer-events-none transition-all duration-300 items-center`}>
          
          {/* NÚT NÉ TRÁNH (BÊN TRÁI AVATAR CỦA TÔI) */}
          {isMe && (
            <div className="pointer-events-auto mr-2">
              <button 
                onClick={handlePassTurn} 
                disabled={!canAct}
                className={`font-bold py-2 px-3.5 rounded-xl shadow-lg text-[10px] border transition active:scale-95 ${canAct ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600 cursor-pointer' : 'bg-slate-900/40 text-slate-500 border-slate-800/40 cursor-not-allowed opacity-40'}`}
              >
                Né Tránh 🛡️
              </button>
            </div>
          )}

          {player ? (
            <div className={`bg-slate-900/95 border p-1 rounded-lg text-center shadow-xl backdrop-blur-md min-w-[85px] flex flex-col items-center ${isCurrentTurn ? 'border-yellow-400 ring-1 ring-yellow-400/30 animate-pulse' : 'border-emerald-500/40'}`}>
              
              {player.quote && roomData.status === "PLAYING" && (
                <div className="text-[7px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full mb-0.5 animate-pulse truncate max-w-[90px] shadow-sm">
                  ✨ {player.quote}
                </div>
              )}

              <div className="w-5 h-5 rounded-full bg-slate-800 border border-yellow-500 flex items-center justify-center text-[10px] mb-0.5 overflow-hidden shadow-inner">
                {player.avatar ? (
                  <img src={player.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  "🥷"
                )}
              </div>

              <div className="text-white font-black text-[8px] truncate max-w-[70px]">{player.name}</div>
              <div className="text-yellow-400 font-bold text-[7px]">⚡ {(player.balance || 100000).toLocaleString()}</div>
              
              {roomData.status === "PLAYING" ? (
                <div className={`mt-0.5 text-[6px] font-black px-1 py-0.1 rounded-full ${player.isSpectator ? 'bg-slate-800 text-slate-400' : (player.hasPassed ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40')}`}>
                  {player.isSpectator ? '👀' : (player.hasPassed ? '🛑 BỎ' : `🃏 ${player.hand.length}`)}
                </div>
              ) : (
                <div className={`mt-0.5 text-[6px] font-bold px-1 py-0.1 rounded-full ${player.isReady ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}`}>
                  {player.isReady ? "✨ SẴN SÀNG" : "💤 ĐỢI"}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-950/40 border border-dashed border-slate-700/60 p-1 rounded-lg text-center min-w-[65px]">
              <div className="text-slate-500 text-[8px] font-bold">Trống 🪑</div>
            </div>
          )}

          {/* NÚT XUẤT CHIÊU (BÊN PHẢI AVATAR CỦA TÔI) */}
          {isMe && (
            <div className="pointer-events-auto ml-2">
              <button 
                onClick={handlePlayCards} 
                disabled={!canAct}
                className={`font-black py-2 px-4 rounded-xl shadow-lg text-[10px] transition active:scale-95 ${canAct ? 'bg-gradient-to-t from-emerald-500 to-teal-400 text-slate-950 cursor-pointer shadow-emerald-500/30' : 'bg-slate-800/50 text-slate-500 cursor-not-allowed opacity-40'}`}
              >
                Xuất Chiêu ⚔️
              </button>
            </div>
          )}

        </div>
      );
    });
  };

  if (currentPhase === "HOME") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-4xl mb-1">⚡ 🐉 💥</div>
          <h1 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-emerald-400 to-cyan-400">ĐẠI HỘI VÕ THUẬT 13 ẤN KÝ</h1>
          <p className="text-slate-400 text-[10px] tracking-widest uppercase">Lôi Đài Vũ Trụ • Tối Ưu PWA & Mobile</p>
          <div className="flex gap-2 justify-center mt-4">
            <Link href="/" className="bg-slate-800 text-amber-400 font-bold py-2 px-5 rounded-full text-xs border border-amber-500/40">
              🏠 Trang Chủ
            </Link>
            <button onClick={() => setCurrentPhase("LOBBY")} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black py-2 px-6 rounded-full text-xs shadow-md">
              VÀO LÔI ĐÀI 🔥
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentPhase === "LOBBY") {
    return (
      <div className="min-h-screen bg-slate-950 p-4 flex flex-col items-center">
        <div className="w-full max-w-xl flex justify-between items-center mb-4">
          <Link href="/" className="bg-slate-900 text-amber-400 border border-amber-500/40 px-3 py-1.5 rounded-lg text-xs font-bold">
            ⬅️ Trang Chủ
          </Link>
          <div className="text-amber-400 font-black text-xs">⚡ Linh Thạch: {myRealBalance.toLocaleString()}</div>
        </div>
        <h2 className="text-xl font-black text-yellow-400 mb-4 tracking-wide">🏰 CHỌN LÔI ĐÀI VŨ TRỤ</h2>
        <div className="grid grid-cols-1 gap-3 w-full max-w-xl">
          <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-xl flex justify-between items-center shadow-md">
            <div>
              <div className="text-sm font-black text-emerald-400">LÔI ĐÀI 1 (Hành Tinh Namek)</div>
              <div className="text-slate-400 text-[10px] mt-0.5">Nền Khí Tức Cổ Đại HD</div>
            </div>
            <button 
              onClick={() => handleJoinRoom("ROOM_1")} 
              disabled={isJoining}
              className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-2 px-5 rounded-lg text-xs shadow"
            >
              {isJoining ? "Đang vào..." : "XUẤT TRẬN 🚀"}
            </button>
          </div>

          <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-xl flex justify-between items-center shadow-md">
            <div>
              <div className="text-sm font-black text-emerald-400">LÔI ĐÀI 2 (Đại Hội Sức Mạnh)</div>
              <div className="text-slate-400 text-[10px] mt-0.5">Sàn Đấu Thần Thánh HD</div>
            </div>
            <button 
              onClick={() => handleJoinRoom("ROOM_2")} 
              disabled={isJoining}
              className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-2 px-5 rounded-lg text-xs shadow"
            >
              {isJoining ? "Đang vào..." : "XUẤT TRẬN 🚀"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 select-none" style={{ touchAction: 'manipulation' }}>
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* TOP HEADER NHỎ GỌN */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-auto z-40">
        <div className="bg-slate-900/95 border border-yellow-500/40 px-2.5 py-1 rounded-lg shadow-lg backdrop-blur-md flex flex-col gap-0.5">
           <div className="text-yellow-400 font-bold text-[8px] uppercase tracking-wider">
             ⚡ Cược: {(roomData?.betAmount || 1000).toLocaleString()} {roomData?.hostId === myUserId ? "(Chủ Bàn)" : ""}
           </div>
           {roomData?.hostId === myUserId && roomData?.status !== "PLAYING" && (
             <div className="flex gap-1 py-0.5">
               {BET_OPTIONS.map(b => (
                 <button
                   key={b}
                   onClick={() => handleSelectBet(b)}
                   className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition ${roomData?.betAmount === b ? 'bg-yellow-500 text-slate-950 border-yellow-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                 >
                   {b >= 1000 ? `${b/1000}k` : b}
                 </button>
               ))}
             </div>
           )}
        </div>

        <div className="flex gap-1.5 items-center">
          <button 
            onClick={() => setShowRuleModal(true)} 
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-1.5 px-2.5 rounded-lg shadow text-[9px] cursor-pointer"
          >
            📜 LUẬT
          </button>
          <button 
            onClick={handleLeaveRoom} 
            className="bg-rose-600 hover:bg-rose-500 text-white font-black py-1.5 px-2.5 rounded-lg shadow text-[9px] cursor-pointer"
          >
            🚪 THOÁT
          </button>
          <button 
            onClick={() => { if(!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true); } else { document.exitFullscreen(); setIsFullscreen(false); } }} 
            className="bg-slate-800/90 text-white font-bold py-1.5 px-2 rounded-lg text-[9px]"
          >
            {isFullscreen ? "🗗" : "🖵"}
          </button>
        </div>
      </div>

      {/* POPUP LUẬT LỆ ĐẦY ĐỦ CHI TIẾT */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-slate-900 border-2 border-yellow-400 w-full max-w-md rounded-2xl p-5 shadow-2xl text-white">
            <div className="text-center mb-3">
              <h3 className="text-base font-black text-yellow-400 uppercase tracking-widest">
                📜 LUẬT ĐẠI HỘI VÕ ĐẠO 13 ẤN KÝ
              </h3>
            </div>
            
            <div className="space-y-2 text-[11px] text-slate-300 max-h-[60vh] overflow-y-auto pr-1">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-yellow-500/30">
                <div className="font-black text-yellow-400 mb-0.5">1. Sẵn Sàng & Tụ Khí</div>
                <p>Bấm Sẵn Sàng để tham gia. Khi đủ 2+ cao thủ, đồng hồ 10s đếm ngược bắt đầu phát 13 ấn ký bài ngẫu nhiên.</p>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-yellow-500/30">
                <div className="font-black text-yellow-400 mb-0.5">2. Thứ Tự Xuất Chiêu</div>
                <p>Ván đầu tiên ai nắm giữ 3 Bích (♠ 3) được quyền đánh trước. Các ván sau người thống trị (thắng ván trước) đi đầu.</p>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-yellow-500/30">
                <div className="font-black text-yellow-400 mb-0.5">3. Hệ Thống Chiêu Thức</div>
                <p>Bao gồm: Đơn, Đôi, Ba, Sảnh (liên tiếp từ 3 trở lên), Tứ Quý và 3 Đôi Thông.</p>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-yellow-500/30">
                <div className="font-black text-yellow-400 mb-0.5">4. Chặt Heo & Phạt Nặng</div>
                <p>Dùng Tứ Quý hoặc 3 Đôi Thông để chặt Heo (2) đơn lẻ, ép đối thủ nộp phạt x5 đến x10 lần Linh Thạch.</p>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-yellow-500/30">
                <div className="font-black text-yellow-400 mb-0.5">5. Truy Sát Heo (Cuối trận)</div>
                <p>Nếu còn 2 người và đối thủ ôm Heo thua trận, kích hoạt 10s Truy Sát để người thắng đoán chất Heo phạt nặng.</p>
              </div>
            </div>

            <div className="mt-4 text-center">
              <button 
                onClick={() => setShowRuleModal(false)}
                className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-2.5 px-8 rounded-xl active:scale-95 transition text-xs cursor-pointer"
              >
                ĐÃ RÕ, TRỞ LẠI ⚔️
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 z-10">
        {renderCornerSlots()}

        {roomData?.snatchActive && roomData.snatchSnatcherId === myUserId && (
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-40 w-full max-w-xs px-3">
            <div className="bg-slate-900/95 border border-yellow-500/60 p-2.5 rounded-xl text-center shadow-2xl">
              <h4 className="text-[10px] font-black text-yellow-400 uppercase mb-1.5">🎯 TRUY SÁT HEO!</h4>
              <div className="grid grid-cols-2 gap-1 mb-1.5">
                <button onClick={() => handleSnatchPig("Bích")} className="bg-slate-800 text-white font-bold py-1 px-1 rounded text-[9px]">♠ Heo Bích (x2)</button>
                <button onClick={() => handleSnatchPig("Chuồn")} className="bg-slate-800 text-white font-bold py-1 px-1 rounded text-[9px]">♣ Heo Chuồn (x2)</button>
                <button onClick={() => handleSnatchPig("Rô")} className="bg-rose-950 text-rose-300 font-bold py-1 px-1 rounded text-[9px]">♦ Heo Rô (x4)</button>
                <button onClick={() => handleSnatchPig("Cơ")} className="bg-rose-950 text-rose-300 font-bold py-1 px-1 rounded text-[9px]">♥ Heo Cơ (x4)</button>
              </div>
              <button onClick={() => handleSnatchPig(null)} className="w-full bg-slate-800 text-slate-300 font-bold py-1 rounded text-[9px]">
                🛡️ Bỏ qua
              </button>
            </div>
          </div>
        )}

        {roomData?.chopMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[9px] font-black px-3 py-1 rounded-full shadow animate-bounce z-40">
             {roomData.chopMessage}
          </div>
        )}

        {errorMessage && (
          <div className="absolute top-26 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[9px] font-bold px-3 py-0.5 rounded-full shadow animate-bounce z-40">
             ⚠️ {errorMessage}
          </div>
        )}

        {roomData?.status === "ENDED" && !roomData?.snatchActive && (
          <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-50 w-full max-w-xs px-4">
            <div className="bg-slate-900/95 border-2 border-yellow-400 p-3 rounded-xl text-center shadow-2xl">
              <h3 className="text-xs font-black text-yellow-400 uppercase mb-0.5">
                👑 {roomData.winnerName} THẮNG!
              </h3>
              <div className="text-[9px] text-yellow-200 font-semibold">
                {roomData.chopMessage || "Hấp thụ linh khí thành công! 💰"}
              </div>
            </div>
          </div>
        )}

        {roomData?.status !== "PLAYING" && roomData?.status !== "ENDED" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto p-4 z-30">
            {roomData?.status === "COUNTDOWN" && (
              <div className="text-center mb-3">
                 <div className="text-[9px] text-yellow-400 font-bold tracking-widest uppercase mb-0.5">Khai Trận</div>
                 <div className="text-4xl font-black text-yellow-400 animate-bounce">{roomData.countdown}s</div>
              </div>
            )}

            <button 
              onClick={handleToggleReady} 
              className={`font-black py-2.5 px-8 rounded-full text-xs shadow-md transition active:scale-95 ${roomData?.players.find(p=>p.id===myUserId)?.isReady ? 'bg-rose-600 text-white' : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950'}`}
            >
              {roomData?.players.find(p=>p.id===myUserId)?.isReady ? 'HỦY SẴN SÀNG' : 'SẴN SÀNG KHAI TRẬN 🔥'}
            </button>
          </div>
        )}

        {roomData?.status === "PLAYING" && roomData.players.find(p=>p.id===myUserId)?.isSpectator && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-black/60 border border-yellow-500/50 text-yellow-400 text-[9px] font-bold px-2.5 py-0.5 rounded-full animate-pulse">
             👁️ Đang quan sát lôi đài
          </div>
        )}
      </div>
    </div>
  );
}