"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// --- CẤU HÌNH SUPABASE ---
const supabaseUrl = "https://iaejbvlibjfpdwuqfszp.supabase.co";
const supabaseKey = "sb_publishable_Bf1jY3-FAjFRij0LMn5FLQ_nLrw2MUE";
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

// Thuật toán sinh số ngẫu nhiên theo Seed đồng bộ theo phòng
function createSeededRandom(seedStr: string) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed << 5) - seed + seedStr.charCodeAt(i);
    seed |= 0;
  }
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function CauCa2NPage() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [score, setScore] = useState<number>(1000);
  const [userAvatar, setUserAvatar] = useState<string>("/assets/avatar/xtra1.ico");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // --- MULTIPLAYER ROOM STATES ---
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [currentSlot, setCurrentSlot] = useState<"player_1" | "player_2" | null>(null);
  const [isCoopMode, setIsCoopMode] = useState<boolean>(false);
  const roomChannelRef = useRef<any>(null);
  const [oppAlert, setOppAlert] = useState<string | null>(null);

  const [selectedBait, setSelectedBait] = useState<{ cost: number; filename: string; name: string }>({
    cost: 100000,
    filename: "giun.png",
    name: "Mồi Tiêu Chuẩn (100,000🪙)",
  });
  const [isBaitDropdownOpen, setIsBaitDropdownOpen] = useState<boolean>(false);

  const [selectedRod, setSelectedRod] = useState<string>("cancaucoban.png");
  const [popupData, setPopupData] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "rare" | "beerus" | "coop";
  } | null>(null);

  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [userRodsMap, setUserRodsMap] = useState<{ [filename: string]: string | null }>({
    "cancaucoban.png": null,
  });
  const [shopNotification, setShopNotification] = useState<string | null>(null);

  const shopRods = [
    { filename: "cancaucoban.png", name: "Cần Câu Cơ Bản", price3Days: 0, price5Days: 0, price7Days: 0, desc: "Mặc định khởi nghiệp", damageBuff: 1.0, critChance: 0.1, buff: "Ổn định" },
    { filename: "cancaugo.png", name: "Cần Câu Gỗ", price3Days: 500000, price5Days: 800000, price7Days: 1100000, desc: "Chế tác từ gỗ tự nhiên dẻo dai", damageBuff: 1.2, critChance: 0.12, buff: "Lực kéo +20%" },
    { filename: "cancaugoliem.png", name: "Cần Câu Gỗ Liêm", price3Days: 200000000, price5Days: 320000000, price7Days: 450000000, desc: "Làm từ gỗ liêm quý hiếm", damageBuff: 1.5, critChance: 0.15, buff: "Sát thương +50%" },
    { filename: "cancaumaycoban.png", name: "Cần Câu Máy Cơ Bản", price3Days: 500000000, price5Days: 800000000, price7Days: 1100000000, desc: "Trang bị máy quay truyền thống", damageBuff: 1.8, critChance: 0.18, buff: "Thu dây nhanh" },
    { filename: "cancaumaychuyennghiep.png", name: "Cần Câu Máy Chuyên Nghiệp", price3Days: 1500000000, price5Days: 2400000000, price7Days: 3300000000, desc: "Tích hợp máy câu hiện đại", damageBuff: 2.2, critChance: 0.22, buff: "Sát thương x2.2" },
    { filename: "cancaucatrenbang.png", name: "Cần Câu Cá Trên Băng", price3Days: 5000000000, price5Days: 8000000000, price7Days: 11000000000, desc: "Dòng cần độc đáo tầng sâu", damageBuff: 2.6, critChance: 0.25, buff: "Tăng cá hiếm" },
    { filename: "cancauvectogo.png", name: "Cần Câu Véc-tơ Gỗ", price3Days: 10000000000, price5Days: 16000000000, price7Days: 22000000000, desc: "Công nghệ véc-tơ kết hợp gỗ", damageBuff: 3.2, critChance: 0.3, buff: "Săn cá lớn" },
    { filename: "cancauvectordo.png", name: "Cần Câu Véc-tơ Đỏ", price3Days: 50000000000, price5Days: 80000000000, price7Days: 110000000000, desc: "Siêu phẩm phối màu đỏ rực", damageBuff: 4.0, critChance: 0.35, buff: "Tăng Nổ Hũ" },
    { filename: "cancauvectorvang.png", name: "Cần Câu Véc-tơ Vàng", price3Days: 1000000000000, price5Days: 1600000000000, price7Days: 2200000000000, desc: "Cực phẩm tối thượng dát vàng", damageBuff: 5.5, critChance: 0.45, buff: "X2 Sát Thương & Điểm" }
  ];

  const [jackpot, setJackpot] = useState({ minor: 100000, major: 500000, grand: 2000000 });

  useEffect(() => {
    setIsMounted(true);

    async function fetchRooms() {
      const { data } = await supabase.from("cauca_rooms").select("*").order("id");
      if (data) setRooms(data);
    }
    fetchRooms();

    // ĐÃ SỬA LỖI CÚ PHÁP (payload.new as any)?.id
    const roomsChannel = supabase
      .channel("public:cauca_rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "cauca_rooms" }, (payload: any) => {
        const newRoom = payload.new as any;
        if (newRoom && newRoom.id) {
          setRooms((prev) => prev.map((r) => (r.id === newRoom.id ? newRoom : r)));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
    };
  }, []);

  useEffect(() => {
    async function getProfile(currentUser: any) {
      if (!currentUser) return;
      setUser(currentUser);
      const { data } = await supabase
        .from("profiles")
        .select("balance, avatar_url, equipped_rod")
        .eq("id", currentUser.id)
        .single();

      if (data) {
        if (data.balance !== undefined) {
          setScore(data.balance);
          (window as any).currentGameScore = data.balance;
        }
        if (data.avatar_url) setUserAvatar(data.avatar_url);
        if (data.equipped_rod) setSelectedRod(data.equipped_rod);
      }

      const { data: rodsData } = await supabase
        .from("user_rods")
        .select("rod_filename, expires_at")
        .eq("user_id", currentUser.id);

      const map: { [filename: string]: string | null } = { "cancaucoban.png": null };
      if (rodsData && rodsData.length > 0) {
        const now = new Date();
        rodsData.forEach((r: any) => {
          if (!r.expires_at || new Date(r.expires_at) > now) {
            map[r.rod_filename] = r.expires_at;
          }
        });
      }
      setUserRodsMap(map);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) getProfile(session.user);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) getProfile(session.user);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const syncScoreToSupabase = async (newScore: number) => {
    setScore(newScore);
    (window as any).currentGameScore = newScore;
    if (user) {
      await supabase.from("profiles").update({ balance: newScore }).eq("id", user.id);
    }
  };

  const showShopNotice = (msg: string) => {
    setShopNotification(msg);
    setTimeout(() => setShopNotification(null), 3000);
  };

  const handleRentRod = async (rod: typeof shopRods[0], days: number) => {
    if (!user) return;
    let priceToPay = days === 5 ? rod.price5Days : days === 7 ? rod.price7Days : rod.price3Days;
    if (score < priceToPay) {
      alert("⚡ Số dư không đủ!");
      return;
    }

    const newBalance = score - priceToPay;
    const now = new Date();
    const currentExpiry = userRodsMap[rod.filename];
    let baseTime = currentExpiry && new Date(currentExpiry) > now ? new Date(currentExpiry) : now;
    const newExpiresAt = new Date(baseTime.getTime() + days * 86400000).toISOString();

    await supabase.from("profiles").update({ balance: newBalance }).eq("id", user.id);
    await supabase.from("user_rods").upsert(
      [{ user_id: user.id, rod_filename: rod.filename, rod_name: rod.name, expires_at: newExpiresAt }],
      { onConflict: "user_id,rod_filename" }
    );

    setScore(newBalance);
    (window as any).currentGameScore = newBalance;
    setUserRodsMap({ ...userRodsMap, [rod.filename]: newExpiresAt });
    showShopNotice(`🎉 Thuê thành công ${rod.name} (${days} ngày)!`);
  };

  const handleEquipRod = async (filename: string) => {
    setSelectedRod(filename);
    window.dispatchEvent(new CustomEvent("changeRod", { detail: filename }));
    if (user) {
      await supabase.from("profiles").update({ equipped_rod: filename }).eq("id", user.id);
    }
    showShopNotice(`✨ Đã trang bị cần câu mới!`);
  };

  useEffect(() => {
    async function fetchInitialJackpot() {
      const { data } = await supabase.from("cauca_jackpot").select("*").eq("id", "global").single();
      if (data) setJackpot({ minor: data.minor, major: data.major, grand: data.grand });
    }
    fetchInitialJackpot();

    const channel = supabase
      .channel("public:cauca_jackpot")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "cauca_jackpot" }, (payload) => {
        if (payload.new) setJackpot({ minor: payload.new.minor, major: payload.new.major, grand: payload.new.grand });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const leaveRoom = async () => {
    if (activeRoom && currentSlot && user) {
      await supabase.from("cauca_rooms").update({ [currentSlot]: null }).eq("id", activeRoom);
    }
    if (roomChannelRef.current) {
      roomChannelRef.current.unsubscribe();
      roomChannelRef.current = null;
    }
    setActiveRoom(null);
    setCurrentSlot(null);
    setIsCoopMode(false);
    (window as any).isCoopMode = false;
  };

  const joinRoom = async (roomId: string) => {
    if (!user) {
      alert("Vui lòng đăng nhập để tham gia!");
      return;
    }

    const { data: targetRoom } = await supabase.from("cauca_rooms").select("*").eq("id", roomId).single();
    if (!targetRoom) {
      alert("Không tìm thấy phòng!");
      return;
    }

    let slotToTake: "player_1" | "player_2" | null = null;
    if (targetRoom.player_1 === user.id) slotToTake = "player_1";
    else if (targetRoom.player_2 === user.id) slotToTake = "player_2";
    else if (!targetRoom.player_1) slotToTake = "player_1";
    else if (!targetRoom.player_2) slotToTake = "player_2";

    if (!slotToTake) {
      alert("Phòng này đã đầy (2/2)!");
      return;
    }

    if (targetRoom[slotToTake] !== user.id) {
      await supabase.from("cauca_rooms").update({ [slotToTake]: user.id }).eq("id", roomId);
    }

    setCurrentSlot(slotToTake);
    setActiveRoom(roomId);

    const channel = supabase.channel(`gameplay_${roomId}`, { config: { presence: { key: user.id } } });
    roomChannelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      const coop = count >= 2;
      setIsCoopMode(coop);
      (window as any).isCoopMode = coop;
      if (coop) {
        setOppAlert("🤝 Có đồng đội tham gia! Đè giữ hoặc tap để rỉt cá!");
        setTimeout(() => setOppAlert(null), 4000);
      }
    });

    channel.on("broadcast", { event: "player_state" }, (payload) => {
      if (payload.payload.user_id !== user.id) {
        window.dispatchEvent(new CustomEvent("updateOpponentState", { detail: payload.payload }));
      }
    });

    channel.on("broadcast", { event: "coop_damage_hit" }, (payload) => {
      if (payload.payload.targetUserId === user.id) {
        window.dispatchEvent(new CustomEvent("receivedCoopDamage", { detail: payload.payload }));
      }
    });

    channel.on("broadcast", { event: "catch_alert" }, (payload) => {
      if (payload.payload.user_id !== user.id) {
        window.dispatchEvent(
          new CustomEvent("showPopupBanner", {
            detail: {
              title: "🎣 ĐỒNG ĐỘI VỪA KÉO ĐƯỢC CÁ!",
              message: `Người chơi bên kia sông vừa kéo lên ${payload.payload.fishName} (+${payload.payload.points.toLocaleString()} 🪙)`,
              type: "coop",
            },
          })
        );
      }
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: user.id, avatar: userAvatar, slot: slotToTake });
      }
    });
  };

  useEffect(() => {
    const handleUnload = () => {
      if (activeRoom && currentSlot && user) {
        supabase.from("cauca_rooms").update({ [currentSlot]: null }).eq("id", activeRoom);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [activeRoom, currentSlot, user]);

  useEffect(() => {
    if (!isMounted || !activeRoom) return;
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const statusEl = document.getElementById("status");
    const powerContainer = document.getElementById("power-container");
    const powerBar = document.getElementById("power-bar");

    const roomRng = createSeededRandom(activeRoom || "room_1");

    const fishDatabase = [
      { filename: "Amphiprion_ocellaris.png", vnName: "Cá hề Nemo", sizeScale: 0.65, basePoints: 500, multi: 1.2, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Abudefduf_saxatilis.png", vnName: "Cá thia vằn sọc", sizeScale: 0.7, basePoints: 800, multi: 1.3, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Chromis_chromis.png", vnName: "Cá thia xanh", sizeScale: 0.6, basePoints: 600, multi: 1.2, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Carassius_auratus.png", vnName: "Cá vàng cảnh", sizeScale: 0.7, basePoints: 1000, multi: 1.5, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Campostoma_anomalum.png", vnName: "Cá tuế suối", sizeScale: 0.65, basePoints: 750, multi: 1.3, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Abudefduf_sordidus.png", vnName: "Cá thia xám", sizeScale: 0.8, basePoints: 1200, multi: 1.5, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Abramis_brama.png", vnName: "Cá vền nước ngọt", sizeScale: 0.85, basePoints: 2000, multi: 1.8, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Abudefduf_sexfasciatus.png", vnName: "Cá thia sáu sọc", sizeScale: 0.7, basePoints: 1500, multi: 1.6, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Chaetodon_aurantus.png", vnName: "Cá bướm vàng cam", sizeScale: 0.8, basePoints: 3000, multi: 2.0, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Chaetodon_lunula.png", vnName: "Cá bướm mặt trăng", sizeScale: 0.85, basePoints: 5000, multi: 2.2, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Chromis_viridis.png", vnName: "Cá thia lục bảo", sizeScale: 0.6, basePoints: 4000, multi: 2.0, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Acanthurus_coerulus.png", vnName: "Cá đuôi gai xanh", sizeScale: 1.1, basePoints: 50000, multi: 2.5, layer: "mid", struggleWeight: 0.25, isRare: false },
      { filename: "Oreochromis_niloticus.png", vnName: "Cá rô phi vằn", sizeScale: 1.25, basePoints: 80000, multi: 2.8, layer: "mid", struggleWeight: 0.3, isRare: false },
      { filename: "Micropterus_salmoides.png", vnName: "Cá vược miệng rộng", sizeScale: 1.3, basePoints: 150000, multi: 3.0, layer: "mid", struggleWeight: 0.35, isRare: false },
      { filename: "Lates_calcarifer.png", vnName: "Cá chẽm lớn", sizeScale: 1.6, basePoints: 300000, multi: 3.5, layer: "mid", struggleWeight: 0.4, isRare: false },
      { filename: "Perca_flavescens.png", vnName: "Cá vược vàng", sizeScale: 1.1, basePoints: 200000, multi: 3.2, layer: "mid", struggleWeight: 0.35, isRare: false },
      { filename: "Cyprinus_carpio.png", vnName: "Cá chép vàng", sizeScale: 1.5, basePoints: 500000, multi: 4.0, layer: "mid", struggleWeight: 0.45, isRare: false },
      { filename: "Carophi.png", vnName: "Cá rô phi", sizeScale: 1.15, basePoints: 120000, multi: 2.9, layer: "mid", struggleWeight: 0.3, isRare: false },
      { filename: "Canham.png", vnName: "Cá nhám", sizeScale: 1.4, basePoints: 800000, multi: 4.5, layer: "mid", struggleWeight: 0.5, isRare: false },
      { filename: "Arothron_meleagris.png", vnName: "Cá nóc đốm sao", sizeScale: 1.25, basePoints: 1000000, multi: 5.0, layer: "mid", struggleWeight: 0.5, isRare: false },
      { filename: "Caranx_ignobilis.png", vnName: "Cá khế khổng lồ", sizeScale: 1.8, basePoints: 3000000, multi: 6.0, layer: "mid", struggleWeight: 0.55, isRare: false },
      { filename: "Coryphaena_hippurus.png", vnName: "Cá cờ xanh Mahi-Mahi", sizeScale: 1.9, basePoints: 6000000, multi: 7.0, layer: "mid", struggleWeight: 0.6, isRare: false },
      { filename: "Epinephelus_marginatus.png", vnName: "Cá mú đen đại dương", sizeScale: 1.7, basePoints: 9000000, multi: 8.0, layer: "mid", struggleWeight: 0.65, isRare: false },
      { filename: "Aetobatus_ocellatus.png", vnName: "Cá đuối đốm đại dương", sizeScale: 2.6, basePoints: 15000000, multi: 10.0, layer: "bottom", struggleWeight: 0.75, isRare: true, maxHp: 15 },
      { filename: "Carcharhinus_melanopterus.png", vnName: "Cá mập vây đen", sizeScale: 2.8, basePoints: 35000000, multi: 12.0, layer: "bottom", struggleWeight: 0.8, isRare: true, maxHp: 22 },
      { filename: "Carcharias_taurus.png", vnName: "Cá mập cát khổng lồ", sizeScale: 3.2, basePoints: 80000000, multi: 15.0, layer: "bottom", struggleWeight: 0.85, isRare: true, maxHp: 30 },
      { filename: "Mola_mola.png", vnName: "Cá mặt trăng khổng lồ", sizeScale: 3.4, basePoints: 150000000, multi: 20.0, layer: "bottom", struggleWeight: 0.88, isRare: true, maxHp: 38 },
      { filename: "Sphyrna_zygaena.png", vnName: "Cá mập đầu búa", sizeScale: 3.0, basePoints: 250000000, multi: 25.0, layer: "bottom", struggleWeight: 0.9, isRare: true, maxHp: 45 },
      { filename: "Xiphias_gladius.png", vnName: "Cá kiếm đại dương", sizeScale: 3.4, basePoints: 450000000, multi: 30.0, layer: "bottom", struggleWeight: 0.93, isRare: true, maxHp: 52 },
      { filename: "Mobula_alfredi.png", vnName: "Cá đuối manta khổng lồ", sizeScale: 3.6, basePoints: 750000000, multi: 40.0, layer: "bottom", struggleWeight: 0.95, isRare: true, maxHp: 60 },
      { filename: "Gymnothorax_javanicus.png", vnName: "Cá trình khổng lồ Java", sizeScale: 3.3, basePoints: 1000000000, multi: 50.0, layer: "bottom", struggleWeight: 0.96, isRare: true, maxHp: 70 }
    ];

    const loadedFishObjects = fishDatabase.map((item) => {
      const img = new Image();
      img.src = `/assets/cauca/${item.filename}`;
      return { img, info: item };
    });

    const decorFilenames = ["dabien.png", "dabien2.png", "rongbien.png", "sanho.png", "sanho2.png", "taobien.png", "taobien2.png"];
    const loadedDecorImages = decorFilenames.map((fname) => {
      const img = new Image();
      img.src = `/assets/cauca/daybien/${fname}`;
      return { img, filename: fname };
    });

    let width: number = window.innerWidth;
    let height: number = window.innerHeight;
    let waterY: number = height * 0.3;
    
    const isPlayer2 = currentSlot === "player_2";
    let boatX: number = isPlayer2 ? width * 0.75 : width * 0.25;
    let boatSpeed: number = 0;
    let bottomTimer: NodeJS.Timeout | null = null;

    let oppState: any = null;
    let oppTargetBoatX = isPlayer2 ? width * 0.25 : width * 0.75;
    let oppCurrentBoatX = oppTargetBoatX;

    const critPopups: { x: number; y: number; alpha: number; scale: number }[] = [];

    (window as any).updateGameScore = (newScore: number) => {
      syncScoreToSupabase(newScore);
    };

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.scale(dpr, dpr);
      width = w;
      height = h;
      waterY = height * 0.3;
    }
    window.addEventListener("resize", resize);
    resize();

    // LỚP CÁ ĐỒNG BỘ THEO THỜI GIAN THỰC (DATE.NOW)
    class Fish {
      direction!: number;
      size!: number;
      y!: number;
      points!: number;
      speed!: number;
      struggleChance!: number;
      maxHp!: number;
      x!: number;
      isCaught!: boolean;
      fishData!: typeof fishDatabase[0];
      animFrame!: number;
      fishObj!: typeof loadedFishObjects[0];
      layer!: string;
      notifiedRare?: boolean;
      rngFunc: () => number;
      timeOffset: number;

      constructor(forcedLayer?: string, forcedY?: number, forcedDirection?: number, customRng?: () => number) {
        this.rngFunc = customRng || roomRng;
        this.timeOffset = this.rngFunc() * 10000;
        this.spawn(forcedLayer, forcedY, forcedDirection);
      }

      spawn(forcedLayer?: string, forcedY?: number, forcedDirection?: number) {
        const r = this.rngFunc;
        this.direction = forcedDirection !== undefined ? forcedDirection : r() > 0.5 ? 1 : -1;
        let availableFish = fishDatabase;
        if (forcedLayer) {
          availableFish = fishDatabase.filter((f) => f.layer === forcedLayer);
          if (availableFish.length === 0) availableFish = fishDatabase;
        }

        const chosenInfo = availableFish[Math.floor(r() * availableFish.length)];
        this.fishObj = loadedFishObjects.find((f) => f.info.filename === chosenInfo.filename) || loadedFishObjects[0];
        this.fishData = this.fishObj.info;
        this.layer = this.fishData.layer;
        this.size = (r() * 8 + 14) * this.fishData.sizeScale;

        const randomPriceFactor = 0.8 + r() * 0.7;
        const rawPoints = this.fishData.basePoints * this.fishData.multi * randomPriceFactor;
        if (this.fishData.layer === "bottom") {
          this.points = Math.round(rawPoints * (1 + r() * 1.5));
        } else {
          this.points = Math.round(rawPoints);
        }

        this.struggleChance = (this.fishData as any).struggleWeight ?? 0.2;
        this.maxHp = (this.fishData as any).maxHp ?? 15;
        this.animFrame = r() * 100;
        this.notifiedRare = false;

        const waterHeight = height - waterY;
        if (this.layer === "top") {
          this.y = forcedY !== undefined ? forcedY : waterY + 25 + r() * (waterHeight * 0.25);
          this.speed = (r() * 1.6 + 1.2) * this.direction;
        } else if (this.layer === "mid") {
          this.y = forcedY !== undefined ? forcedY : waterY + waterHeight * 0.32 + r() * (waterHeight * 0.3);
          this.speed = (r() * 1.0 + 0.6) * this.direction;
        } else {
          this.y = forcedY !== undefined ? forcedY : waterY + waterHeight * 0.68 + r() * (waterHeight * 0.25);
          this.speed = (r() * 0.5 + 0.25) * this.direction;
        }
        this.isCaught = false;
      }

      update() {
        if (this.isCaught) return;

        // TÍNH VỊ TRÍ X ĐỒNG BỘ 100% THEO THỜI GIAN CHUẨN
        const nowSec = Date.now() / 1000 + this.timeOffset;
        const totalDistance = width + this.size * 4;
        const rawPos = (nowSec * Math.abs(this.speed) * 60) % totalDistance;

        if (this.direction === 1) {
          this.x = -this.size * 2 + rawPos;
        } else {
          this.x = width + this.size * 2 - rawPos;
        }

        this.animFrame += 0.08;

        if (this.points >= 100000000 && !this.notifiedRare && this.x > width * 0.2 && this.x < width * 0.8) {
          this.notifiedRare = true;
          window.dispatchEvent(
            new CustomEvent("showPopupBanner", {
              detail: {
                title: "🔥 QUÁI VẬT KHỔNG LỒ XUẤT HIỆN! 🔥",
                message: `Thần Beerus phát hiện ${this.fishData.vnName} huyền thoại!`,
                type: "rare",
              },
            })
          );
        }
      }

      draw() {
        ctx!.save();
        ctx!.translate(this.x, this.y);
        ctx!.rotate(Math.sin(this.animFrame) * 0.04);
        if (this.direction === 1) ctx!.scale(-1, 1);
        const img = this.fishObj.img;
        if (img && img.complete && img.naturalWidth !== 0) {
          ctx!.imageSmoothingEnabled = false;
          ctx!.drawImage(img, -this.size, -this.size * 0.6, this.size * 2.2, this.size * 1.2);
        }
        ctx!.restore();
      }
    }

    const activeBaitImg = new Image();
    activeBaitImg.src = `/assets/baits/${selectedBait.filename}`;
    let currentActiveBaitCost = selectedBait.cost;
    const updateBaitListener = (e: any) => {
      activeBaitImg.src = `/assets/baits/${e.detail.filename}`;
      currentActiveBaitCost = e.detail.cost;
    };
    window.addEventListener("changeBaitImg", updateBaitListener);

    const rodImg = new Image();
    rodImg.src = `/assets/cauca/cancau/${selectedRod}`;
    let currentRodDamageBuff = 1.0;
    let currentRodCritChance = 0.1;
    const updateRodListener = (e: any) => {
      const filename = e.detail;
      rodImg.src = `/assets/cauca/cancau/${filename}`;
      const foundRod = shopRods.find((r) => r.filename === filename);
      if (foundRod) {
        currentRodDamageBuff = foundRod.damageBuff;
        currentRodCritChance = foundRod.critChance;
      }
    };
    window.addEventListener("changeRod", updateRodListener);

    const initialRodObj = shopRods.find((r) => r.filename === selectedRod);
    if (initialRodObj) {
      currentRodDamageBuff = initialRodObj.damageBuff;
      currentRodCritChance = initialRodObj.critChance;
    }

    const moveBoatListener = (e: any) => {
      boatSpeed = e.detail;
    };
    window.addEventListener("moveBoat", moveBoatListener);

    const oppStateListener = (e: any) => {
      oppState = e.detail;
      if (oppState.boatRatio !== undefined) {
        oppTargetBoatX = oppState.boatRatio * width;
      }
    };
    window.addEventListener("updateOpponentState", oppStateListener);

    class Hook {
      x!: number;
      y!: number;
      state!: string;
      power!: number;
      targetWaterX!: number;
      maxDepthY!: number;
      castStartX!: number;
      castStartY!: number;
      castProgress!: number;
      caughtFish: Fish | null = null;
      currentFishHp!: number;
      maxFishHp!: number;
      baitPrice!: number;
      
      lineTension: number = 0;          
      isJointPulling: boolean = false;  
      isAssistingOpponent: boolean = false; 

      constructor() {
        this.reset();
      }

      reset() {
        let rodTipX = isPlayer2 ? boatX - (2 + Math.cos(-0.42) * 120) : boatX + 2 + Math.cos(-0.42) * 120;
        let rodTipY = waterY - 32 + Math.sin(-0.42) * 120;
        this.x = rodTipX;
        this.y = rodTipY;
        this.state = "IDLE";
        this.power = 0;
        this.targetWaterX = 0;
        this.maxDepthY = 0;
        this.castStartX = 0;
        this.castStartY = 0;
        this.castProgress = 0;
        this.caughtFish = null;
        this.currentFishHp = 0;
        this.maxFishHp = 0;
        this.lineTension = 0;
        this.isJointPulling = false;
        this.isAssistingOpponent = false;

        if (bottomTimer) {
          clearTimeout(bottomTimer);
          bottomTimer = null;
        }
        if (statusEl) {
          statusEl.innerText = "Sẵn sàng (Chạm giữ để quăng)";
          statusEl.style.color = "white";
        }
        if (powerContainer) powerContainer.style.display = "none";
      }

      startCharging(selectedBaitCost: number) {
        if (this.state !== "IDLE") return;
        const currentActiveScore = (window as any).currentGameScore ?? 1000;
        if (currentActiveScore < selectedBaitCost) {
          alert("⚡ Số dư không đủ!");
          return;
        }
        this.baitPrice = selectedBaitCost;
        this.state = "CHARGING";
        this.power = 0;
        if (powerContainer) powerContainer.style.display = "block";
        if (statusEl) statusEl.innerText = "Đang gồng lực...";
      }

      releaseCharging(pointerX: number) {
        if (this.state !== "CHARGING") return;
        const currentActiveScore = (window as any).currentGameScore ?? 1000;
        syncScoreToSupabase(currentActiveScore - this.baitPrice);

        async function contributeJackpot(baitCost: number) {
          const { data } = await supabase.from("cauca_jackpot").select("*").eq("id", "global").single();
          if (data) {
            let addMinor = baitCost >= 10 && baitCost <= 1000 ? Math.round(baitCost * 0.2) : 0;
            let addMajor = baitCost >= 2000 && baitCost <= 100000 ? Math.round(baitCost * 0.2) : 0;
            let addGrand = Math.round(baitCost * 0.1);
            await supabase
              .from("cauca_jackpot")
              .update({ minor: data.minor + addMinor, major: data.major + addMajor, grand: data.grand + addGrand })
              .eq("id", "global");
          }
        }
        contributeJackpot(this.baitPrice);

        let maxAllowedDepthRatio = 0.3;
        if (this.baitPrice >= 10000000) maxAllowedDepthRatio = 1.0;
        else if (this.baitPrice >= 1000000) maxAllowedDepthRatio = 0.85;
        else if (this.baitPrice >= 500000) maxAllowedDepthRatio = 0.7;
        else if (this.baitPrice >= 100000) maxAllowedDepthRatio = 0.55;
        else if (this.baitPrice >= 2000) maxAllowedDepthRatio = 0.45;
        else maxAllowedDepthRatio = 0.35;

        this.maxDepthY = waterY + (height - waterY) * maxAllowedDepthRatio;

        let rodTipX = isPlayer2 ? boatX - (2 + Math.cos(-0.42) * 120) : boatX + 2 + Math.cos(-0.42) * 120;
        let rodTipY = waterY - 32 + Math.sin(-0.42) * 120;

        if (isPlayer2) {
          this.targetWaterX = Math.min(width - 50, Math.max(rodTipX - (rodTipX - 80) * (this.power / 100), 80));
        } else {
          this.targetWaterX = Math.max(50, Math.min(rodTipX + (width - 80 - rodTipX) * (this.power / 100), width - 80));
        }

        this.state = "CASTING";
        this.castStartX = rodTipX;
        this.castStartY = rodTipY;
        this.castProgress = 0;
        if (powerContainer) powerContainer.style.display = "none";
        if (statusEl) statusEl.innerText = "Đang quăng mồi...";
      }

      tapStruggle() {
        if (this.state === "STRUGGLING" || this.isAssistingOpponent) {
          this.applyStruggleDamage(1.0);
        }
      }

      holdStruggleTick() {
        if (this.state === "STRUGGLING" || this.isAssistingOpponent) {
          this.applyStruggleDamage(0.08, true);
        }
      }

      applyStruggleDamage(multiplier: number, isHold: boolean = false) {
        let hitDamage = multiplier * currentRodDamageBuff;
        
        if (this.isJointPulling || this.isAssistingOpponent) {
          hitDamage *= 2.0;
        } else if ((window as any).isCoopMode) {
          hitDamage *= 1.5;
        }

        let actualCritChance = currentRodCritChance + ((window as any).isCoopMode ? 0.15 : 0);
        const isCrit = !isHold && Math.random() < actualCritChance;
        if (isCrit) {
          hitDamage *= 2.5;
          critPopups.push({ x: this.x + (Math.random() - 0.5) * 40, y: this.y - 30, alpha: 1.0, scale: 1.2 });
        }

        let tensionGain = isHold ? (0.6 / currentRodDamageBuff) : (0.25 / currentRodDamageBuff);
        if (this.isJointPulling || this.isAssistingOpponent) tensionGain *= 0.5;
        
        this.lineTension += tensionGain;

        if (this.isAssistingOpponent && oppState?.user_id) {
          if (roomChannelRef.current) {
            roomChannelRef.current.send({
              type: "broadcast",
              event: "coop_damage_hit",
              payload: { targetUserId: oppState.user_id, damage: hitDamage },
            });
          }
        } else {
          this.currentFishHp -= hitDamage;
          if (this.currentFishHp <= 0) {
            this.state = "REELING_HORIZ";
            if (statusEl) {
              statusEl.innerText = `Đã RỈT CẠN MÁU ${this.caughtFish?.fishData.vnName}! Kéo lên xuồng...`;
              statusEl.style.color = "#FFEB3B";
            }
          }
        }
      }

      update() {
        let rodTipX = isPlayer2 ? boatX - (2 + Math.cos(-0.42) * 120) : boatX + 2 + Math.cos(-0.42) * 120;
        let rodTipY = waterY - 32 + Math.sin(-0.42) * 120;

        if (this.state === "IDLE" || this.state === "CHARGING") {
          this.x = rodTipX;
          this.y = rodTipY;
        }

        if (this.state === "CHARGING") {
          this.power += 1.8;
          if (this.power > 100) this.power = 100;
          if (powerBar) powerBar.style.width = this.power + "%";
        } else if (this.state === "CASTING") {
          this.castProgress += this.baitPrice >= 1000 ? 0.025 : 0.04;
          if (this.castProgress >= 1) {
            this.castProgress = 1;
            this.state = "SINKING";
            if (statusEl) statusEl.innerText = "Mồi đang chìm...";
          }
          let t = this.castProgress;
          this.x = this.castStartX + (this.targetWaterX - this.castStartX) * t;
          this.y = this.castStartY + (waterY - this.castStartY) * t - Math.sin(t * Math.PI) * 70;
        } else if (this.state === "SINKING") {
          this.y += Math.min(2.5, 1.2 + this.baitPrice / 20000000);

          if (oppState && oppState.hookState === "STRUGGLING") {
            let distToOppHook = Math.sqrt(Math.pow(this.x - oppState.hookX, 2) + Math.pow(this.y - oppState.hookY, 2));
            if (distToOppHook < 70) {
              this.state = "COOP_HELPING";
              this.isAssistingOpponent = true;
              this.x = oppState.hookX;
              this.y = oppState.hookY;
              window.dispatchEvent(
                new CustomEvent("showPopupBanner", {
                  detail: { title: "🤝 KÉO CHUNG NỐI DÂY!", message: "Bạn đã móc câu trợ giúp đồng đội! Dame x2.0!", type: "coop" },
                })
              );
              return;
            }
          }

          // XỬ LÝ LOGIC CẮN MỒI & TUỘT CÁ ĐƯỢC ĐIỀU CHỈNH CHUẨN ĐÉT
          for (let f of fishes) {
            if (f.isCaught || Math.abs(this.y - f.y) > 40) continue;

            const isBigFish = f.layer === "bottom" || f.fishData.isRare;

            if (isBigFish) {
              // Cá lớn BỎ QUA nếu dùng mồi quá nhỏ (< 10 Trụi)
              if (this.baitPrice < 10000000) {
                continue;
              }

              // Mồi Xịn (10,000,000🪙): Có 35% tỷ lệ TUỘT CÁ khi đớp!
              if (this.baitPrice === 10000000) {
                let mouthX = f.direction === 1 ? f.x + f.size * 0.7 : f.x - f.size * 0.7;
                let mouthY = f.y - f.size * 0.15;
                if (Math.sqrt(Math.pow(this.x - mouthX, 2) + Math.pow(this.y - mouthY, 2)) < 22 + f.size * 0.3) {
                  if (Math.random() < 0.35) {
                    this.state = "REELING_HORIZ";
                    window.dispatchEvent(
                      new CustomEvent("showPopupBanner", {
                        detail: { title: "⚠️ TUỘT CÁ RỒI!", message: "Cá lớn giật quá mạnh làm sổng Mồi Xịn!", type: "beerus" },
                      })
                    );
                    break;
                  }
                }
              }
            }

            let mouthX = f.direction === 1 ? f.x + f.size * 0.7 : f.x - f.size * 0.7;
            let mouthY = f.y - f.size * 0.15;
            if (Math.sqrt(Math.pow(this.x - mouthX, 2) + Math.pow(this.y - mouthY, 2)) < 22 + f.size * 0.3) {
              this.catchFish(f);
              break;
            }
          }

          if (this.state === "SINKING" && this.y >= this.maxDepthY) {
            const isAtVeryBottom = this.y >= height - 80;
            if (isAtVeryBottom && !bottomTimer) {
              if (statusEl) {
                statusEl.innerText = "Mồi chạm đáy! Chờ 3s...";
                statusEl.style.color = "#F44336";
              }
              bottomTimer = setTimeout(() => {
                if (this.state === "SINKING") {
                  this.state = "REELING_HORIZ";
                  window.dispatchEvent(
                    new CustomEvent("showPopupBanner", {
                      detail: { title: "😼 THẦN BEERUS NỔI GIẬN", message: "HAKAI!", type: "beerus" },
                    })
                  );
                }
              }, 3000);
            } else if (!isAtVeryBottom) {
              this.state = "REELING_HORIZ";
              if (statusEl) {
                statusEl.innerText = "Mồi hết tầm chìm, thu dây về";
                statusEl.style.color = "#aaa";
              }
            }
          }
        } else if (this.state === "STRUGGLING" || this.isAssistingOpponent) {
          this.lineTension = Math.max(0, this.lineTension - 0.08); 
          
          if (this.caughtFish) {
            this.currentFishHp += 0.035; 
            if (this.currentFishHp > this.maxFishHp) {
              this.caughtFish.isCaught = false;
              this.caughtFish = null;
              this.state = "REELING_HORIZ";
              window.dispatchEvent(
                new CustomEvent("showPopupBanner", {
                  detail: { title: "😼 THẦN BEERUS BĨU MÔI", message: "Cá sổng mất!", type: "beerus" },
                })
              );
              if (statusEl) {
                statusEl.innerText = "Sổng cá!";
                statusEl.style.color = "#F44336";
              }
            }
          }

          if (this.lineTension >= 100) {
            if (this.caughtFish) this.caughtFish.isCaught = false;
            this.caughtFish = null;
            this.state = "REELING_HORIZ";
            this.lineTension = 0;
            this.isJointPulling = false;
            this.isAssistingOpponent = false;

            window.dispatchEvent(
              new CustomEvent("showPopupBanner", {
                detail: { title: "💥 BỤP! ĐỨT DÂY CÂU!", message: "Cần câu quá tải hoặc đè giữ quá lâu làm đứt dây!", type: "beerus" },
              })
            );
            if (statusEl) {
              statusEl.innerText = "ĐỨT DÂY! Cần không đủ cấp hoặc đè giữ quá mức!";
              statusEl.style.color = "#F44336";
            }
          }
        } else if (this.state === "REELING_HORIZ") {
          if (bottomTimer) {
            clearTimeout(bottomTimer);
            bottomTimer = null;
          }
          let dx = rodTipX - this.x;
          let speed = this.caughtFish ? 5 : 12;
          if (Math.abs(dx) < speed) {
            this.x = rodTipX;
            this.state = "REELING_VERT";
            if (this.caughtFish && statusEl) statusEl.innerText = "Kéo lên!";
          } else {
            this.x += Math.sign(dx) * speed;
            if (this.caughtFish) {
              this.caughtFish.x = this.x - (this.caughtFish.direction === 1 ? this.caughtFish.size * 0.7 : -this.caughtFish.size * 0.7);
              this.caughtFish.y = this.y - -this.caughtFish.size * 0.15;
            }
          }
        } else if (this.state === "REELING_VERT") {
          let dy = rodTipY - this.y;
          let speed = 25;
          if (Math.abs(dy) < speed) {
            if (this.caughtFish) {
              let earnedPoints = this.caughtFish.points;
              const currentFish = this.caughtFish.fishData;
              if (selectedRod === "cancauvectorvang.png") earnedPoints *= 2;

              if (roomChannelRef.current) {
                roomChannelRef.current.send({
                  type: "broadcast",
                  event: "catch_alert",
                  payload: { user_id: user.id, fishName: currentFish.vnName, points: earnedPoints },
                });
              }

              if (currentFish.isRare) {
                if (Math.random() < 0.25) {
                  const cbCost = this.baitPrice;
                  async function triggerJackpotWin() {
                    const { data } = await supabase.from("cauca_jackpot").select("*").eq("id", "global").single();
                    if (data) {
                      let won = 0;
                      let hName = "";
                      if (cbCost >= 10 && cbCost <= 1000) {
                        won = data.minor;
                        hName = "Cá Trái Đất";
                        await supabase.from("cauca_jackpot").update({ minor: 100000 }).eq("id", "global");
                      } else if (cbCost >= 2000 && cbCost <= 100000) {
                        won = data.major;
                        hName = "Cá Namek";
                        await supabase.from("cauca_jackpot").update({ major: 500000 }).eq("id", "global");
                      } else {
                        won = data.grand;
                        hName = "Cá Siêu Cấp";
                        await supabase.from("cauca_jackpot").update({ grand: 2000000 }).eq("id", "global");
                      }
                      earnedPoints += won;
                      window.dispatchEvent(
                        new CustomEvent("showPopupBanner", {
                          detail: {
                            title: `🎉 NỔ HŨ ${hName}! 🎉`,
                            message: `Thưởng thêm +${won.toLocaleString()} 🪙`,
                            type: "rare",
                          },
                        })
                      );
                    }
                  }
                  triggerJackpotWin();
                } else {
                  window.dispatchEvent(
                    new CustomEvent("showPopupBanner", {
                      detail: {
                        title: `🏆 KÉO ĐƯỢC ${currentFish.vnName.toUpperCase()}!`,
                        message: `+${earnedPoints.toLocaleString()} Điểm!`,
                        type: "rare",
                      },
                    })
                  );
                }
              } else {
                window.dispatchEvent(
                  new CustomEvent("showPopupBanner", {
                    detail: { title: `🎣 CÂU THÀNH CÔNG: ${currentFish.vnName}`, message: `+${earnedPoints.toLocaleString()} 🪙`, type: "rare" },
                  })
                );
              }

              syncScoreToSupabase(((window as any).currentGameScore ?? 1000) + earnedPoints);
              let idx = fishes.indexOf(this.caughtFish);
              if (idx > -1) {
                fishes.splice(idx, 1);
                fishes.push(new Fish(undefined, undefined, undefined, roomRng));
              }
            }
            this.reset();
          } else {
            this.y += Math.sign(dy) * speed;
            if (this.caughtFish) {
              this.caughtFish.x =
                this.x -
                (this.caughtFish.direction === 1 ? this.caughtFish.size * 0.7 : -this.caughtFish.size * 0.7) +
                (Math.random() - 0.5) * 6;
              this.caughtFish.y = this.y - -this.caughtFish.size * 0.15;
            }
          }
        }
      }

      catchFish(fish: Fish) {
        if (bottomTimer) {
          clearTimeout(bottomTimer);
          bottomTimer = null;
        }
        this.caughtFish = fish;
        fish.isCaught = true;
        this.lineTension = 0;
        ctx!.fillStyle = "white";
        for (let i = 0; i < 10; i++) {
          ctx!.beginPath();
          ctx!.arc(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, Math.random() * 4 + 2, 0, Math.PI * 2);
          ctx!.fill();
        }

        if (fish.points >= 5000000) {
          this.state = "STRUGGLING";
          this.maxFishHp = fish.maxHp;
          this.currentFishHp = fish.maxHp;
          if (statusEl) {
            statusEl.innerText = `Dính ${fish.fishData.vnName}! ĐÈ GIỮ HOẶC NHẤP ĐỂ KÉO!`;
            statusEl.style.color = "#FF5252";
          }
        } else {
          this.state = "REELING_HORIZ";
          if (statusEl) {
            statusEl.innerText = `Dính ${fish.fishData.vnName}! Kéo lên xuồng...`;
            statusEl.style.color = "#FFEB3B";
          }
        }
      }

      draw() {
        let drawX = this.x;
        let drawY = this.y;
        if (this.state === "STRUGGLING" || this.isAssistingOpponent) {
          drawX += (Math.random() - 0.5) * 14;
          drawY += (Math.random() - 0.5) * 14;
        }
        let rodTipX = isPlayer2 ? boatX - (2 + Math.cos(-0.42) * 120) : boatX + 2 + Math.cos(-0.42) * 120;
        let rodTipY = waterY - 32 + Math.sin(-0.42) * 120;

        ctx!.beginPath();
        ctx!.moveTo(rodTipX, rodTipY);
        if (this.state === "IDLE" || this.state === "CHARGING") {
          ctx!.lineTo(rodTipX, rodTipY + 20);
          ctx!.strokeStyle = "rgba(255,255,255,0.95)";
          ctx!.lineWidth = 1.5;
          ctx!.stroke();
          this.drawHookAndBait(rodTipX, rodTipY + 20);
        } else {
          ctx!.quadraticCurveTo((rodTipX + drawX) / 2, Math.min(rodTipY, drawY) - 30, drawX, drawY);
          ctx!.strokeStyle = this.lineTension > 70 ? "#F44336" : "rgba(255,255,255,0.95)";
          ctx!.lineWidth = this.lineTension > 70 ? 2.5 : 1.5;
          ctx!.stroke();
          this.drawHookAndBait(drawX, drawY);
        }

        if (this.state === "STRUGGLING" || this.isAssistingOpponent) {
          const barW = 60;
          const barH = 6;
          const barX = drawX - barW / 2;
          const barY = drawY - 35;

          ctx!.fillStyle = "rgba(0,0,0,0.6)";
          ctx!.fillRect(barX, barY, barW, barH);

          const tensionRatio = Math.min(1, this.lineTension / 100);
          ctx!.fillStyle = tensionRatio > 0.7 ? "#FF1744" : tensionRatio > 0.4 ? "#FFEA00" : "#00E676";
          ctx!.fillRect(barX, barY, barW * tensionRatio, barH);

          ctx!.strokeStyle = "#FFFFFF";
          ctx!.lineWidth = 1;
          ctx!.strokeRect(barX, barY, barW, barH);
        }
      }

      drawHookAndBait(hx: number, hy: number) {
        if (typeof activeBaitImg !== "undefined" && activeBaitImg.complete && activeBaitImg.naturalWidth !== 0) {
          ctx!.imageSmoothingEnabled = false;
          ctx!.drawImage(activeBaitImg, hx - 14, hy - 14, 28, 28);
        } else {
          ctx!.fillStyle = "#FF9800";
          ctx!.beginPath();
          ctx!.arc(hx, hy, 6, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.strokeStyle = "#B0BEC5";
        ctx!.lineWidth = 2.5;
        ctx!.beginPath();
        ctx!.arc(hx, hy + 8, 5, 0, Math.PI, false);
        ctx!.moveTo(hx + 5, hy + 8);
        ctx!.lineTo(hx + 5, hy + 2);
        ctx!.stroke();
        ctx!.fillStyle = "#FFFFFF";
        ctx!.beginPath();
        ctx!.arc(hx - 2, hy + 6, 1.5, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    const fishes: Fish[] = [];
    const computedWaterY = (canvas.height / (window.devicePixelRatio || 1)) * 0.3;
    const waterHeight = canvas.height / (window.devicePixelRatio || 1) - computedWaterY;

    for (let i = 0; i < Math.floor(roomRng() * 5) + 4; i++) {
      fishes.push(new Fish("top", computedWaterY + 20 + ((waterHeight * 0.28) / 6) * i, undefined, roomRng));
    }
    for (let i = 0; i < Math.floor(roomRng() * 5) + 2; i++) {
      fishes.push(new Fish("mid", computedWaterY + waterHeight * 0.32 + ((waterHeight * 0.32) / 4) * i, undefined, roomRng));
    }
    for (let i = 0; i < Math.floor(roomRng() * 2) + 2; i++) {
      fishes.push(new Fish("bottom", computedWaterY + waterHeight * 0.68 + ((waterHeight * 0.28) / 3) * i, undefined, roomRng));
    }

    const hook = new Hook();
    let activeBaitCost = selectedBait.cost;
    const updateBaitCostListener = (e: any) => {
      activeBaitCost = e.detail;
    };
    window.addEventListener("changeBait", updateBaitCostListener);

    const coopDamageListener = (e: any) => {
      if (hook.state === "STRUGGLING") {
        hook.currentFishHp -= e.detail.damage;
        hook.isJointPulling = true;
        if (hook.currentFishHp <= 0) {
          hook.state = "REELING_HORIZ";
        }
      }
    };
    window.addEventListener("receivedCoopDamage", coopDamageListener);

    let isHolding = false;
    let holdClientX = canvas.width / 2;

    const handleDown = (clientX: number) => {
      if (hook.state === "STRUGGLING" || hook.isAssistingOpponent) {
        isHolding = true;
        hook.tapStruggle();
      } else if (hook.state === "IDLE") {
        isHolding = true;
        holdClientX = clientX;
        hook.startCharging(activeBaitCost);
      }
    };

    const handleMove = (clientX: number) => {
      if (isHolding && hook.state === "CHARGING") holdClientX = clientX;
    };

    const handleUp = () => {
      if (isHolding && hook.state === "CHARGING") {
        isHolding = false;
        if (powerContainer) powerContainer.style.display = "none";
        hook.releaseCharging(holdClientX);
      } else {
        isHolding = false;
      }
    };

    const onMouseDown = (e: MouseEvent) => handleDown(e.clientX);
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleUp();
    const onTouchStart = (e: TouchEvent) => {
      handleDown(e.touches[0].clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      handleMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => {
      handleUp();
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    const placedDecorations: any[] = [];
    const bubbles: any[] = [];

    function initDecorationsMap() {
      if (loadedDecorImages.length === 0) return;
      let clusterCenters = [80, 180, 320, width - 380, width - 220, width - 90, width / 2 - 100, width / 2 + 120];
      for (let cx of clusterCenters) {
        let countInCluster = Math.floor(roomRng() * 2) + 1;
        for (let i = 0; i < countInCluster; i++) {
          const randomDecor = loadedDecorImages[Math.floor(roomRng() * loadedDecorImages.length)];
          let isWeed = randomDecor.filename.includes("rongbien") || randomDecor.filename.includes("taobien");
          let w = 55 + roomRng() * 55;
          let h = 50 + roomRng() * 50;
          if (randomDecor.filename.includes("sanho")) {
            w = 85;
            h = 70;
          }
          if (randomDecor.filename.includes("dabien")) {
            w = 80;
            h = 60;
          }
          let offsetX = cx + (roomRng() - 0.5) * 70;
          let itemY = height - h - roomRng() * 15;
          placedDecorations.push({ imgObj: randomDecor, x: offsetX, y: itemY, width: w, height: h, isWeed, swayOffset: roomRng() * Math.PI * 2 });
          if (randomDecor.filename.includes("dabien")) {
            for (let b = 0; b < 4; b++) {
              bubbles.push({
                x: offsetX + w * 0.5 + (roomRng() - 0.5) * 30,
                y: itemY + roomRng() * 20,
                radius: roomRng() * 3 + 1.5,
                speed: roomRng() * 0.6 + 0.3,
                alpha: roomRng() * 0.6 + 0.3,
              });
            }
          }
        }
      }
    }
    initDecorationsMap();

    function drawOpponent() {
      if (!oppState) return;
      oppCurrentBoatX += (oppTargetBoatX - oppCurrentBoatX) * 0.15;

      const charX = oppCurrentBoatX;
      const charY = waterY - 35;
      const scaleFactor = 0.85;

      const oppIsPlayer2 = !isPlayer2;

      ctx!.save();
      ctx!.translate(charX, charY);
      if (oppIsPlayer2) {
        ctx!.scale(-scaleFactor, scaleFactor);
      } else {
        ctx!.scale(scaleFactor, scaleFactor);
      }

      ctx!.fillStyle = "#5D4037";
      ctx!.beginPath();
      ctx!.moveTo(-50, 20);
      ctx!.lineTo(60, 20);
      ctx!.lineTo(45, 36);
      ctx!.lineTo(-35, 36);
      ctx!.closePath();
      ctx!.fill();
      ctx!.strokeStyle = "#3E2723";
      ctx!.lineWidth = 2;
      ctx!.stroke();

      ctx!.fillStyle = "#424242";
      ctx!.fillRect(-12, -32, 24, 35);

      const oppAvatarImg = new Image();
      oppAvatarImg.src = oppState.avatar;
      if (oppAvatarImg.complete && oppAvatarImg.naturalWidth !== 0) {
        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(0, -14, 15, 0, Math.PI * 2);
        ctx!.closePath();
        ctx!.clip();
        if (oppIsPlayer2) ctx!.scale(-1, 1);
        ctx!.drawImage(oppAvatarImg, -15, -29, 30, 30);
        ctx!.restore();
        ctx!.strokeStyle = "#00B0FF";
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.arc(0, -14, 15, 0, Math.PI * 2);
        ctx!.stroke();
      } else {
        ctx!.fillStyle = "#00B0FF";
        ctx!.beginPath();
        ctx!.arc(0, -14, 13, 0, Math.PI * 2);
        ctx!.fill();
      }

      const oppRodImg = new Image();
      oppRodImg.src = `/assets/cauca/cancau/${oppState.rodFilename}`;
      ctx!.save();
      ctx!.translate(2, -12);
      ctx!.rotate(oppState.hookState === "CHARGING" ? -0.5 : -0.42);
      if (oppRodImg.complete && oppRodImg.naturalWidth !== 0) {
        ctx!.drawImage(oppRodImg, 0, -14, 135, 45);
      } else {
        ctx!.strokeStyle = "#5D4037";
        ctx!.lineWidth = 5;
        ctx!.lineCap = "round";
        ctx!.beginPath();
        ctx!.moveTo(0, 0);
        ctx!.lineTo(110, -35);
        ctx!.stroke();
      }
      ctx!.restore();

      ctx!.restore();

      let oppRodTipX = oppIsPlayer2 
        ? charX - scaleFactor * (2 + Math.cos(-0.42) * 120)
        : charX + scaleFactor * (2 + Math.cos(-0.42) * 120);
      let oppRodTipY = charY + scaleFactor * (-12 + Math.sin(-0.42) * 120);
      let oppHookX = oppState.hookX;
      let oppHookY = oppState.hookY;

      ctx!.beginPath();
      ctx!.moveTo(oppRodTipX, oppRodTipY);
      if (oppState.hookState === "IDLE" || oppState.hookState === "CHARGING") {
        ctx!.lineTo(oppRodTipX, oppRodTipY + 20);
        ctx!.strokeStyle = "rgba(255,255,255,0.5)";
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
      } else {
        ctx!.quadraticCurveTo((oppRodTipX + oppHookX) / 2, Math.min(oppRodTipY, oppHookY) - 30, oppHookX, oppHookY);
        ctx!.strokeStyle = "rgba(255,255,255,0.5)";
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
        ctx!.fillStyle = "#FF9800";
        ctx!.beginPath();
        ctx!.arc(oppHookX, oppHookY, 6, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function drawBackground() {
      ctx!.fillStyle = "#87CEEB";
      ctx!.fillRect(0, 0, width, waterY);
      ctx!.fillStyle = "#FFEB3B";
      ctx!.beginPath();
      ctx!.arc(width * 0.8, height * 0.1, 40, 0, Math.PI * 2);
      ctx!.fill();

      let grad = ctx!.createLinearGradient(0, waterY, 0, height);
      grad.addColorStop(0, "#0288D1");
      grad.addColorStop(1, "#000A1F");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, waterY, width, height - waterY);

      const now = Date.now();
      for (let item of placedDecorations) {
        const img = item.imgObj.img;
        if (img && img.complete && img.naturalWidth !== 0) {
          ctx!.save();
          if (item.isWeed) {
            let sway = Math.sin(now * 0.0025 + item.swayOffset) * 6;
            ctx!.translate(item.x + item.width / 2, item.y + item.height);
            ctx!.transform(1, 0, sway / item.height, 1, 0, 0);
            ctx!.drawImage(img, -item.width / 2, -item.height, item.width, item.height);
          } else {
            ctx!.drawImage(img, item.x, item.y, item.width, item.height);
          }
          ctx!.restore();
        }
      }
      ctx!.fillStyle = "rgba(255, 255, 255, 0.65)";
      for (let b of bubbles) {
        b.y -= b.speed;
        b.x += Math.sin(now * 0.003 + b.y) * 0.4;
        if (b.y < waterY + 40) b.y = height - 30;
        ctx!.beginPath();
        ctx!.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255, 255, 255, ${b.alpha})`;
        ctx!.fill();
      }

      ctx!.fillStyle = "rgba(255,255,255,0.25)";
      ctx!.fillRect(0, waterY, width, 4);

      drawOpponent();

      if (boatSpeed !== 0 && hook.state === "IDLE") {
        boatX += boatSpeed;
        if (boatX < 50) boatX = 50;
        if (boatX > width - 120) boatX = width - 120;
      }

      const charX = boatX;
      const charY = waterY - 15;

      ctx!.save();
      ctx!.translate(charX, charY);
      if (isPlayer2) {
        ctx!.scale(-1, 1);
      }

      ctx!.fillStyle = "#8D6E63";
      ctx!.beginPath();
      ctx!.moveTo(-50, 15);
      ctx!.lineTo(60, 15);
      ctx!.lineTo(45, 31);
      ctx!.lineTo(-35, 31);
      ctx!.closePath();
      ctx!.fill();
      ctx!.strokeStyle = "#3E2723";
      ctx!.lineWidth = 2;
      ctx!.stroke();

      ctx!.fillStyle = "#212121";
      ctx!.fillRect(-12, -17, 24, 35);

      const avatarImg = new Image();
      avatarImg.src = userAvatar;
      if (avatarImg.complete && avatarImg.naturalWidth !== 0) {
        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(0, 1, 15, 0, Math.PI * 2);
        ctx!.closePath();
        ctx!.clip();
        if (isPlayer2) ctx!.scale(-1, 1);
        ctx!.drawImage(avatarImg, -15, -14, 30, 30);
        ctx!.restore();
        ctx!.strokeStyle = "#FFD700";
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.arc(0, 1, 15, 0, Math.PI * 2);
        ctx!.stroke();
      } else {
        ctx!.fillStyle = "#FFD700";
        ctx!.beginPath();
        ctx!.arc(0, 1, 13, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.save();
      ctx!.translate(2, 3);
      ctx!.rotate(hook.state === "CHARGING" ? -0.5 : -0.42);
      if (rodImg && rodImg.complete && rodImg.naturalWidth !== 0) {
        ctx!.drawImage(rodImg, 0, -14, 135, 45);
      } else {
        ctx!.strokeStyle = "#8B4513";
        ctx!.lineWidth = 5;
        ctx!.lineCap = "round";
        ctx!.beginPath();
        ctx!.moveTo(0, 0);
        ctx!.lineTo(110, -35);
        ctx!.stroke();
      }
      ctx!.restore();

      ctx!.restore();

      for (let i = critPopups.length - 1; i >= 0; i--) {
        let p = critPopups[i];
        p.y -= 1.5;
        p.alpha -= 0.03;
        p.scale += 0.02;
        if (p.alpha <= 0) {
          critPopups.splice(i, 1);
          continue;
        }
        ctx!.save();
        ctx!.globalAlpha = p.alpha;
        ctx!.font = `900 ${Math.round(20 * p.scale)}px sans-serif`;
        ctx!.fillStyle = "#FFD700";
        ctx!.strokeStyle = "#000000";
        ctx!.lineWidth = 3;
        ctx!.strokeText("⚡ CRIT!", p.x, p.y);
        ctx!.fillText("⚡ CRIT!", p.x, p.y);
        ctx!.restore();
      }
    }

    let lastBroadcastTime = 0;
    let animationFrameId: number;
    function gameLoop() {
      ctx!.clearRect(0, 0, width, height);
      drawBackground();

      if (isHolding) {
        hook.holdStruggleTick();
      }

      for (let f of fishes) {
        f.update();
        f.draw();
      }
      hook.update();
      hook.draw();

      const now = Date.now();
      if (roomChannelRef.current && now - lastBroadcastTime > 100) {
        roomChannelRef.current.send({
          type: "broadcast",
          event: "player_state",
          payload: {
            user_id: user.id,
            avatar: userAvatar,
            rodFilename: selectedRod,
            boatRatio: boatX / width,
            hookX: hook.x,
            hookY: hook.y,
            hookState: hook.state,
          },
        });
        lastBroadcastTime = now;
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    }
    gameLoop();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("changeBait", updateBaitCostListener);
      window.removeEventListener("changeBaitImg", updateBaitListener);
      window.removeEventListener("changeRod", updateRodListener);
      window.removeEventListener("moveBoat", moveBoatListener);
      window.removeEventListener("updateOpponentState", oppStateListener);
      window.removeEventListener("receivedCoopDamage", coopDamageListener);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMounted, activeRoom, userAvatar, selectedRod]);

  useEffect(() => {
    const handlePopupBanner = (e: any) => {
      setPopupData({ show: true, title: e.detail.title, message: e.detail.message, type: e.detail.type });
      setTimeout(() => setPopupData(null), 4500);
    };
    window.addEventListener("showPopupBanner", handlePopupBanner);
    return () => {
      window.removeEventListener("showPopupBanner", handlePopupBanner);
    };
  }, []);

  const baitList = [
    { cost: 1000, filename: "dausenzu.png", label: "Mồi Sơ Cấp - 1,000🪙" },
    { cost: 2000, filename: "cagia.png", label: "Mồi Thường - 2,000🪙" },
    { cost: 100000, filename: "giun.png", label: "Mồi Tiêu Chuẩn - 100,000🪙" },
    { cost: 500000, filename: "moi.png", label: "Mồi Khá - 500,000🪙" },
    { cost: 1000000, filename: "tom.png", label: "Mồi Thơm - 1,000,000🪙" },
    { cost: 10000000, filename: "dragon-ball-4.png", label: "Mồi Xịn - 10,000,000🪙" },
    { cost: 50000000, filename: "kiblue.png", label: "Mồi Cao Cấp - 50,000,000🪙" },
    { cost: 100000000, filename: "hakai.png", label: "Mồi Quái Vật - 100,000,000🪙" },
  ];

  if (!activeRoom) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-white">
        <div className="absolute top-4 left-4">
          <Link href="/" className="bg-slate-900 border border-amber-500/40 text-amber-400 px-4 py-2 rounded-xl font-black text-sm shadow">
            ← Quay Lại
          </Link>
        </div>

        <div className="max-w-md w-full bg-slate-900/80 border-2 border-amber-500/60 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-amber-400 uppercase tracking-widest drop-shadow-lg">🎣 Sảnh Câu Cá 2 Người</h1>
            <p className="text-xs text-slate-400 mt-2">Đồng bộ phòng thời gian thực với Supabase!</p>
          </div>

          <div className="space-y-3">
            {rooms.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-4">Đang tải danh sách phòng...</div>
            ) : (
              rooms.map((room) => {
                let currentCount = 0;
                if (room.player_1) currentCount++;
                if (room.player_2) currentCount++;
                const isFull = currentCount >= room.max_players;

                return (
                  <button
                    key={room.id}
                    disabled={isFull}
                    onClick={() => joinRoom(room.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition font-black ${
                      isFull
                        ? "bg-slate-800 border-rose-500/40 text-rose-300 cursor-not-allowed"
                        : "bg-slate-950 border-amber-500/40 text-amber-300 hover:bg-slate-800 hover:scale-[1.02] cursor-pointer"
                    }`}
                  >
                    <span className="text-base uppercase">{room.name}</span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-md ${
                        isFull ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {currentCount} / {room.max_players} Người
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-6 p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center space-x-3">
            <img src={userAvatar} className="w-10 h-10 rounded-full border-2 border-amber-400" />
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold">Số dư hiện tại</p>
              <p className="text-lg text-amber-300 font-black">{isMounted ? score.toLocaleString() : "..."} 🪙</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 select-none font-sans pointer-events-auto" style={{ touchAction: "manipulation" }}>
      <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-50 pointer-events-auto">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={leaveRoom}
            className="bg-rose-900/95 text-rose-200 hover:bg-rose-800 px-2.5 py-1.5 rounded-lg text-[9px] font-black border border-rose-500/40 shadow cursor-pointer"
          >
            ← Rời Phòng
          </button>
          <div className="bg-black/85 text-white px-2.5 py-1.5 rounded-lg font-bold text-[9px] border border-amber-500/40 shadow flex items-center gap-1.5">
            <img src={userAvatar} alt="Avatar" className="w-4 h-4 rounded-full border border-amber-400 object-cover" />
            <span>
              <span id="score" className="text-[#FFEB3B] font-black">
                {isMounted ? score.toLocaleString() : "..."}
              </span>{" "}
              🪙
            </span>
          </div>
          <button
            onClick={() => setIsShopOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 px-2.5 py-1.5 rounded-lg font-black text-[9px] shadow-lg active:scale-95 transition cursor-pointer flex items-center gap-1 border border-white/40"
          >
            🛍️ Shop Cần
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                setIsFullscreen(true);
              } else {
                document.exitFullscreen();
                setIsFullscreen(false);
              }
            }}
            className="bg-slate-800/90 hover:bg-slate-700 text-white font-bold py-1.5 px-2.5 rounded-lg text-[9px] border border-slate-700 shadow"
          >
            {isFullscreen ? "🗗 Thu Nhỏ" : "🖵 Toàn Màn Hình"}
          </button>
        </div>
      </div>

      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-slate-950/90 border border-amber-500/60 px-3 py-1 rounded-xl shadow-2xl flex items-center space-x-3 pointer-events-none">
        <div className="text-center">
          <span className="text-[7px] font-bold text-slate-300 block">CÁ TRÁI ĐẤT</span>
          <span className="text-[10px] sm:text-xs font-black text-amber-300">{isMounted ? jackpot.minor.toLocaleString("en-US") : "..."} 🪙</span>
        </div>
        <div className="h-5 w-[1px] bg-amber-500/30"></div>
        <div className="text-center">
          <span className="text-[7px] font-bold text-red-400 block">CÁ SIÊU CẤP</span>
          <span className="text-[10px] sm:text-xs font-black text-red-500 animate-pulse">{isMounted ? jackpot.grand.toLocaleString("en-US") : "..."} 🪙</span>
        </div>
        <div className="h-5 w-[1px] bg-amber-500/30"></div>
        <div className="text-center">
          <span className="text-[7px] font-bold text-blue-400 block">CÁ NAMEK</span>
          <span className="text-[10px] sm:text-xs font-black text-cyan-400">{isMounted ? jackpot.major.toLocaleString("en-US") : "..."} 🪙</span>
        </div>
      </div>

      <div className="absolute top-12 right-2 z-50 pointer-events-auto">
        <div className="relative">
          <button
            onClick={() => setIsBaitDropdownOpen(!isBaitDropdownOpen)}
            className="bg-slate-900/95 hover:bg-slate-800 border border-amber-500/70 px-3 py-1.5 rounded-xl shadow-2xl flex items-center space-x-2 text-amber-300 text-[10px] font-black cursor-pointer transition select-none"
          >
            <span>🪱</span>
            <span className="truncate max-w-[140px]">{selectedBait.name}</span>
            <span className="text-[9px]">{isBaitDropdownOpen ? "▲" : "▼"}</span>
          </button>
          {isBaitDropdownOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-slate-950/98 border-2 border-amber-500 rounded-xl shadow-2xl overflow-hidden z-50 p-1 space-y-1 backdrop-blur-md">
              <div className="px-2 py-1 text-[8px] font-black text-amber-400 uppercase border-b border-slate-800">Chọn Mồi Câu</div>
              <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
                {baitList.map((bait) => (
                  <button
                    key={bait.cost}
                    onClick={() => {
                      setSelectedBait({ cost: bait.cost, filename: bait.filename, name: bait.label });
                      setIsBaitDropdownOpen(false);
                      window.dispatchEvent(new CustomEvent("changeBait", { detail: bait.cost }));
                      window.dispatchEvent(new CustomEvent("changeBaitImg", { detail: bait }));
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center justify-between ${
                      selectedBait.cost === bait.cost
                        ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow"
                        : "bg-slate-900 text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <span className="truncate">{bait.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {oppAlert && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-emerald-500/90 text-white px-4 py-1.5 rounded-xl font-black text-xs shadow-lg animate-bounce border border-emerald-300 pointer-events-none">
          {oppAlert}
        </div>
      )}

      {isShopOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 pointer-events-auto">
          <div className="bg-slate-950 border-2 border-amber-500/60 w-full max-w-4xl max-h-[85vh] rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base sm:text-xl font-black text-amber-400 uppercase tracking-wider">🛍️ Cửa Hàng & Kho Cần</h2>
                <p className="text-slate-400 text-[10px]">Thuê theo mốc ngày hoặc trang bị trực tiếp!</p>
              </div>
              <button
                onClick={() => setIsShopOpen(false)}
                className="bg-slate-800 hover:bg-rose-600 text-white font-black w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer shadow text-xs"
              >
                ✕
              </button>
            </div>
            {shopNotification && (
              <div className="my-2 bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl font-black text-xs text-center animate-bounce shadow">
                {shopNotification}
              </div>
            )}
            <div className="flex-1 overflow-y-auto my-3 pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {shopRods.map((rod) => {
                const expiresAt = userRodsMap[rod.filename];
                const isOwned = expiresAt !== undefined;
                const isEquipped = selectedRod === rod.filename;
                let timeLeftStr = "";
                if (isOwned && expiresAt) {
                  const diff = new Date(expiresAt).getTime() - Date.now();
                  if (diff > 0) {
                    timeLeftStr = `Còn hạn: ${Math.floor(diff / 86400000)}d ${Math.floor((diff / 3600000) % 24)}h`;
                  } else {
                    timeLeftStr = "Đã hết hạn";
                  }
                } else if (rod.price3Days === 0) {
                  timeLeftStr = "Vĩnh viễn";
                }

                return (
                  <div
                    key={rod.filename}
                    className={`bg-slate-900 border rounded-2xl p-3 flex flex-col justify-between shadow-lg relative ${
                      isEquipped ? "border-amber-400 ring-2 ring-amber-400/40" : "border-slate-800"
                    }`}
                  >
                    {isEquipped && (
                      <span className="absolute top-2 right-2 bg-amber-500 text-slate-950 text-[8px] font-black px-2 py-0.5 rounded-md uppercase">
                        Đang Dùng
                      </span>
                    )}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-amber-300">{rod.name}</h4>
                      <div className="w-full h-16 bg-black/50 rounded-xl flex items-center justify-center p-1 border border-slate-800">
                        <img src={`/assets/cauca/cancau/${rod.filename}`} alt={rod.name} className="max-h-full object-contain" />
                      </div>
                      <p className="text-[10px] text-slate-300 leading-snug">{rod.desc}</p>
                      <div className="bg-slate-950 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-lg border border-emerald-500/20">
                        ✨ {rod.buff}
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800 space-y-2">
                      <div className="text-[9px] font-bold text-slate-400 flex justify-between">
                        <span>Trạng thái:</span>
                        <span className={isOwned ? "text-emerald-400 font-black" : "text-rose-400"}>{timeLeftStr || "Chưa thuê"}</span>
                      </div>
                      {rod.price3Days === 0 ? (
                        <button
                          disabled={isEquipped}
                          onClick={() => handleEquipRod(rod.filename)}
                          className={`w-full py-1.5 rounded-xl text-[10px] font-black cursor-pointer shadow ${
                            isEquipped ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-emerald-500 text-slate-950"
                          }`}
                        >
                          {isEquipped ? "Đang Sử Dụng" : "Trang Bị"}
                        </button>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-3 gap-1">
                            <button
                              onClick={() => handleRentRod(rod, 3)}
                              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 py-1 rounded text-[8px] font-black cursor-pointer"
                            >
                              3N <br />
                              {rod.price3Days.toLocaleString()}🪙
                            </button>
                            <button
                              onClick={() => handleRentRod(rod, 5)}
                              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 py-1 rounded text-[8px] font-black cursor-pointer"
                            >
                              5N <br />
                              {rod.price5Days.toLocaleString()}🪙
                            </button>
                            <button
                              onClick={() => handleRentRod(rod, 7)}
                              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 py-1 rounded text-[8px] font-black cursor-pointer"
                            >
                              7N <br />
                              {rod.price7Days.toLocaleString()}🪙
                            </button>
                          </div>
                          {isOwned && (
                            <button
                              disabled={isEquipped}
                              onClick={() => handleEquipRod(rod.filename)}
                              className={`w-full py-1 rounded-xl text-[10px] font-black cursor-pointer shadow ${
                                isEquipped ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-emerald-500 text-slate-950"
                              }`}
                            >
                              {isEquipped ? "Đang Sử Dụng" : "Trang Bị Ngay"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsShopOpen(false)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-1.5 rounded-xl text-xs shadow cursor-pointer"
              >
                Xác Nhận & Quay Lại
              </button>
            </div>
          </div>
        </div>
      )}

      {popupData && popupData.show && (
        <div
          className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-bounce text-center bg-slate-950/95 border-4 px-5 py-3 rounded-2xl shadow-2xl space-y-1 max-w-sm ${
            popupData.type === "beerus"
              ? "border-rose-500 shadow-[0_0_40px_rgba(244,67,54,0.6)]"
              : popupData.type === "coop"
              ? "border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.6)]"
              : "border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.6)]"
          }`}
        >
          <p
            className={`font-black text-[10px] sm:text-xs tracking-widest uppercase ${
              popupData.type === "beerus" ? "text-rose-400" : popupData.type === "coop" ? "text-emerald-300" : "text-amber-300"
            }`}
          >
            {popupData.title}
          </p>
          <p className="text-white font-black text-xs sm:text-sm leading-snug whitespace-pre-line drop-shadow-[2px_2px_0_#000]">
            {popupData.message}
          </p>
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-40 flex items-center space-x-2 bg-black/80 p-2 rounded-xl border border-amber-500/60 shadow-2xl backdrop-blur-md pointer-events-auto">
        <button
          onMouseDown={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("moveBoat", { detail: -4 }));
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("moveBoat", { detail: 0 }));
          }}
          onMouseLeave={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("moveBoat", { detail: 0 }));
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("moveBoat", { detail: -4 }));
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("moveBoat", { detail: 0 }));
          }}
          className="w-11 h-11 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-lg rounded-xl active:scale-90 transition shadow-lg cursor-pointer flex items-center justify-center select-none"
        >
          ◀
        </button>
        <span className="text-[10px] font-black text-amber-300 uppercase px-1">Chèo</span>
        <button
          onMouseDown={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("moveBoat", { detail: 4 }));
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("moveBoat", { detail: 0 }));
          }}
          onMouseLeave={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("moveBoat", { detail: 0 }));
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("moveBoat", { detail: 4 }));
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("moveBoat", { detail: 0 }));
          }}
          className="w-11 h-11 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-lg rounded-xl active:scale-90 transition shadow-lg cursor-pointer flex items-center justify-center select-none"
        >
          ▶
        </button>
      </div>

      <div
        id="power-container"
        className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[200px] h-[20px] bg-black/70 rounded-xl border-2 border-white hidden pointer-events-none overflow-hidden shadow-lg z-30"
      >
        <div id="power-bar" className="w-[0%] h-full bg-gradient-to-r from-[#4CAF50] via-[#FFEB3B] to-[#F44336] transition-all duration-75"></div>
      </div>
      <div id="status" className="absolute bottom-20 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-black drop-shadow-[1px_1px_1px_#000] text-center w-full z-30 pointer-events-none text-white">
        Sẵn sàng
      </div>

      <canvas id="gameCanvas" className="absolute inset-0 block w-full h-full pointer-events-auto"></canvas>
    </div>
  );
}