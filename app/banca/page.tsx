"use client";

import React, { useEffect, useRef, useState } from "react";
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

const FISH_SPECIES = [
  // --- NHÓM CÁ NHỎ (1 - 30 kg / Multi 1 - 30) ---
  { file: "Aulostomus_maculatus", name: "Cá Chân Dài", group: "small", radius: 20, speedRange: [1.2, 1.6], baseReward: 1400, schooling: true },
  { file: "Carassius_auratus", name: "Cá Vàng", group: "small", radius: 18, speedRange: [1.3, 1.7], baseReward: 1050, schooling: true },
  { file: "Haemulon_parra", name: "Cá Hường Sọc", group: "small", radius: 19, speedRange: [1.2, 1.5], baseReward: 1250, schooling: true },
  { file: "Haemulon_sciurus", name: "Cá Hường Vàng", group: "small", radius: 19, speedRange: [1.2, 1.5], baseReward: 1250, schooling: true },
  { file: "Lepomis_gibbosus", name: "Cá Hổ Vằn Nhỏ", group: "small", radius: 18, speedRange: [1.2, 1.6], baseReward: 1540, schooling: true },
  { file: "Lepomis_gulosus", name: "Cá Mõm Dẹt", group: "small", radius: 18, speedRange: [1.2, 1.6], baseReward: 1540, schooling: true },
  { file: "Lipophrys_pholis", name: "Cá Kèo Biển", group: "small", radius: 17, speedRange: [1.3, 1.8], baseReward: 900, schooling: true },
  { file: "Microspathodon_chrysurus", name: "Cá Thia Đuôi Vàng", group: "small", radius: 17, speedRange: [1.3, 1.8], baseReward: 1000, schooling: true },
  { file: "Microspathodon_dorsalis", name: "Cá Thia Lưng Xanh", group: "small", radius: 17, speedRange: [1.3, 1.8], baseReward: 1000, schooling: true },
  { file: "Phoxinus_phoxinus", name: "Cá Trích Bột", group: "small", radius: 15, speedRange: [1.5, 2.0], baseReward: 700, schooling: true },
  { file: "Pimephales_notatus", name: "Cá Tuế Chấm", group: "small", radius: 15, speedRange: [1.5, 2.0], baseReward: 700, schooling: true },
  { file: "Pimephales_promelas", name: "Cá Tuế Đầu Đen", group: "small", radius: 15, speedRange: [1.5, 2.0], baseReward: 700, schooling: true },
  { file: "Thalassoma_lunare", name: "Cá Bàng Chài Xanh", group: "small", radius: 19, speedRange: [1.2, 1.6], baseReward: 17500, schooling: true },
  { file: "Umbra_limi", name: "Cá Bùn Đen", group: "small", radius: 16, speedRange: [1.4, 1.8], baseReward: 850, schooling: true },
  { file: "Zanclus_cornutus", name: "Cá Mặt Quỷ Nhỏ", group: "small", radius: 20, speedRange: [1.1, 1.5], baseReward: 21000, schooling: true },
  { file: "Zebrasoma_scopas", name: "Cá Bác Sĩ", group: "small", radius: 19, speedRange: [1.1, 1.5], baseReward: 1960, schooling: true },

  // --- NHÓM CÁ VỪA (30 - 100 kg / Multi 30 - 100) ---
  { file: "Abramis_brama", name: "Cá Tráp Đen", group: "medium", radius: 28, speedRange: [0.8, 1.2], baseReward: 5600, aggressive: false },
  { file: "Aplodinotus_grunniens", name: "Cá Tráp Trắng", group: "medium", radius: 30, speedRange: [0.7, 1.1], baseReward: 7000, aggressive: false },
  { file: "Cephalopholis_argus", name: "Cá Mú Chấm Xanh", group: "medium", radius: 32, speedRange: [0.8, 1.2], baseReward: 10500, aggressive: true },
  { file: "Cephalopholis_miniata", name: "Cá Mú Đỏ", group: "medium", radius: 31, speedRange: [0.8, 1.2], baseReward: 112000, aggressive: true },
  { file: "Holacanthus_ciliaris", name: "Cá Hoàng Đế", group: "medium", radius: 29, speedRange: [0.9, 1.3], baseReward: 8400, aggressive: false },
  { file: "Lepomis_macrochirus", name: "Cá Rô Phi Xanh", group: "medium", radius: 27, speedRange: [0.9, 1.3], baseReward: 4900, aggressive: false },
  { file: "Lutjanus_apodus", name: "Cá Hồng Sậm", group: "medium", radius: 30, speedRange: [0.8, 1.2], baseReward: 9800, aggressive: true },
  { file: "Oncorhynchus_mykiss", name: "Cá Hồi Vân", group: "medium", radius: 32, speedRange: [0.9, 1.3], baseReward: 126000, aggressive: false },
  { file: "Pomacanthus_imperator", name: "Cá Hoàng Hậu", group: "medium", radius: 32, speedRange: [0.8, 1.2], baseReward: 140000, aggressive: false },
  { file: "Pterois_miles", name: "Cá Sư Tử Biển", group: "medium", radius: 28, speedRange: [0.9, 1.3], baseReward: 9100, aggressive: true },
  { file: "Pterois_volitans", name: "Cá Sư Tử Đỏ", group: "medium", radius: 28, speedRange: [0.9, 1.3], baseReward: 9100, aggressive: true },
  { file: "Scarus_psittacus", name: "Cá Vẹt Đại Dương", group: "medium", radius: 33, speedRange: [0.7, 1.0], baseReward: 154000, aggressive: false },
  { file: "Tylosurus_crocodilus", name: "Cá Nhái Đớp Mồi", group: "medium", radius: 26, speedRange: [1.2, 1.7], baseReward: 77000, aggressive: true },
  { file: "Zebrasoma_velifer", name: "Cá Bướm Sọc Vằn", group: "medium", radius: 28, speedRange: [0.8, 1.2], baseReward: 63000, aggressive: false },

  // --- NHÓM CÁ LỚN (100 kg - 1 Tấn) ---
  { file: "Carcharhinus_melanopterus", name: "Cá Mập Vây Đen", group: "large", radius: 104, speedRange: [0.2, 0.5], baseReward: 150000000 },
  { file: "Carcharias_taurus", name: "Cá Mập Cát Khổng Lồ", group: "large", radius: 112, speedRange: [0.2, 0.3], baseReward: 200000000 },
  { file: "Cheilinus_undulatus", name: "Cá M Napoleon", group: "large", radius: 124, speedRange: [0.2, 0.3], baseReward: 250000000 },
  { file: "Hypanus_americanus", name: "Cá Đuối Gai Độc", group: "large", radius: 96, speedRange: [0.2, 0.5], baseReward: 120000000 },
  { file: "Hypanus_satinus", name: "Cá Đuối Mượt", group: "large", radius: 90, speedRange: [0.2, 0.5], baseReward: 100000000 },
  { file: "Lepisosteus_oculatus", name: "Cá Hỏa Tiễn Miền Nam", group: "large", radius: 90, speedRange: [0.35, 0.55], baseReward: 95000000 },
  { file: "Lepisosteus_osseus", name: "Cá Hỏa Tiễn Mõm Dài", group: "large", radius: 94, speedRange: [0.2, 0.55], baseReward: 105000000 },
  { file: "Micropterus_salmoides", name: "Cá Vược Đen Khổng Lồ", group: "large", radius: 84, speedRange: [0.2, 0.6], baseReward: 80000000 },
  { file: "Micropterus_treculii", name: "Cá Vược Sông Guadalupe", group: "large", radius: 80, speedRange: [0.2, 0.6], baseReward: 75000000 },
  { file: "Triaenodon_obesus", name: "Cá Mập Vây Trắng", group: "large", radius: 100, speedRange: [0.2, 0.3], baseReward: 140000000 }
];

// --- 2 SIÊU BOSS ---
const BOSS_SPECIES = [
  {
    file: "megalodon",
    name: "Megalodon Siêu Cấp",
    radius: 190,
    baseReward: 500000000,
    weightRange: [15, 40],
    baseHp: 2000000,
    speed: 0.9
  },
  {
    file: "mosa",
    name: "Mosasaurus Thượng Cổ",
    radius: 210,
    baseReward: 1000000000,
    weightRange: [30, 80],
    baseHp: 5000000,
    speed: 0.8
  }
];

export default function FishShooterGame() {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [score, setScore] = useState<number>(1000);
  const [userAvatar, setUserAvatar] = useState<string>("/assets/avatar/xtra1.ico");

  // --- HỆ SỐ ZOOM (MẶC ĐỊNH 0.7 ĐỂ HỒ RỘNG THÊNH THANG) ---
  const ZOOM_SCALE = 0.7;

  // --- SẢNH CHỜ & PHÒNG BẮN CÁ ---
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [currentSlot, setCurrentSlot] = useState<string | null>(null);
  const roomChannelRef = useRef<any>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<any[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentBulletIndex, setCurrentBulletIndex] = useState(6);
  const [isBulletMenuOpen, setIsBulletMenuOpen] = useState(false);
  const bulletLevels = [100, 5000, 10000000, 50000000, 100000000, 500000000, 1000000000];
  const bulletDamages = [10, 50, 100, 150, 400, 650, 1050];

  const [currentSkillIndex, setCurrentSkillIndex] = useState(0);
  const [isSkillMenuOpen, setIsSkillMenuOpen] = useState(false);
  const skillsList = [
    { name: "⚡ Đóng Băng Thời Gian", cost: 100 },
    { name: "🔥 Kamehameha Xả Láng", cost: 500 },
    { name: "🌀 Quả Cầu Kênh Ki", cost: 1000 }
  ];

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [activeSkillNotice, setActiveSkillNotice] = useState<string | null>(null);
  
  const [largeFishPopup, setLargeFishPopup] = useState<{ name: string; reward: number; weightText: string } | null>(null);
  const [activeLargeFishUI, setActiveLargeFishUI] = useState<{ name: string; hpPercent: number; weightText: string; isBoss: boolean; timeLeft?: number } | null>(null);

  const [ownedGuns, setOwnedGuns] = useState([
    { id: 1, name: "🔫 Súng Pháo Tiêu Chuẩn (Đang dùng)", active: true },
    { id: 2, name: "🚀 Đại Bác Tứ Phương V,2", active: false }
  ]);

  const isMovingLeft = useRef(false);
  const isMovingRight = useRef(false);

  const gameState = useRef({
    cannonProgress: 0,
    cannonAngle: 0,
    bullets: [] as any[],
    fishes: [] as any[],
    bubbles: [] as any[],
    bulletLevel: 10000000,
    bulletDamage: 500,
    bulletIndex: 6,
    bossSpawnTimer: 18000, 
    peerCannons: {} as Record<string, any>,
    isHost: false,
    imagesLoaded: {} as Record<string, HTMLImageElement>,
    bulletImagesLoaded: [] as HTMLImageElement[],
    largeFishTimer: 0,
  });

  useEffect(() => {
    gameState.current.bossSpawnTimer = Math.floor(Math.random() * (36000 - 18000 + 1)) + 18000;
  }, []);

  useEffect(() => {
    async function getProfile(currentUser: any) {
      if (!currentUser) return;
      setUser(currentUser);
      const { data } = await supabase
        .from("profiles")
        .select("balance, avatar_url")
        .eq("id", currentUser.id)
        .single();

      if (data) {
        if (data.balance !== undefined && data.balance !== null) {
          setScore(data.balance);
          (window as any).currentGameScore = data.balance;
        }
        if (data.avatar_url) setUserAvatar(data.avatar_url);
      }
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

  useEffect(() => {
    setIsMounted(true);

    async function fetchRooms() {
      const { data } = await supabase.from("banca_rooms").select("*").order("id").limit(3);
      if (data) setRooms(data);
    }
    fetchRooms();

    const roomsChannel = supabase
      .channel("public:banca_rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "banca_rooms" }, (payload: any) => {
        const newRoom = payload.new as any;
        if (newRoom && newRoom.id) {
          setRooms((prev) => prev.map((r) => (r.id === newRoom.id ? newRoom : r)));
        }
      })
      .subscribe();

    (window as any).updateGameScore = (newScore: number) => {
      syncScoreToSupabase(newScore);
    };

    return () => {
      supabase.removeChannel(roomsChannel);
    };
  }, []);

  const syncScoreToSupabase = async (newScore: number) => {
    setScore(newScore);
    (window as any).currentGameScore = newScore;
    if (user) {
      await supabase.from("profiles").update({ balance: newScore }).eq("id", user.id);
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!user) {
      alert("Vui lòng đăng nhập để tham gia phòng!");
      return;
    }

    const { data: targetRoom } = await supabase.from("banca_rooms").select("*").eq("id", roomId).single();
    if (!targetRoom) {
      alert("Không tìm thấy phòng chơi!");
      return;
    }

    let slotToTake: string | null = null;
    for (let i = 1; i <= 4; i++) {
      const slotKey = `player_${i}`;
      if (targetRoom[slotKey] === user.id) {
        slotToTake = slotKey;
        break;
      }
    }
    if (!slotToTake) {
      for (let i = 1; i <= 4; i++) {
        const slotKey = `player_${i}`;
        if (!targetRoom[slotKey]) {
          slotToTake = slotKey;
          break;
        }
      }
    }

    if (!slotToTake) {
      alert("Phòng này đã đầy (4/4 người)!");
      return;
    }

    if (targetRoom[slotToTake] !== user.id) {
      await supabase.from("banca_rooms").update({ [slotToTake]: user.id }).eq("id", roomId);
    }

    setCurrentSlot(slotToTake);
    setActiveRoom(roomId);

    const channel = supabase.channel(`banca_game_${roomId}`, { config: { presence: { key: user.id } } });
    roomChannelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const players: any[] = [];
        Object.keys(state).forEach((key) => {
          players.push((state[key] as any)[0]);
        });
        setOnlinePlayers(players);

        if (players.length > 0) {
          players.sort((a, b) => {
            const slotA = parseInt(a.slot?.replace("player_", "") || "99");
            const slotB = parseInt(b.slot?.replace("player_", "") || "99");
            return slotA - slotB;
          });
          const topPlayer = players[0];
          gameState.current.isHost = (topPlayer.userId === user.id);
        }
      })
      .on("broadcast", { event: "fire_bullet" }, ({ payload }) => {
        if (payload.userId !== user.id) {
          gameState.current.bullets.push({
            userId: payload.userId,
            x: payload.x,
            y: payload.y,
            vx: payload.vx,
            vy: payload.vy,
            damage: payload.damage,
            bulletIndex: payload.bulletIndex,
            isExploding: false,
            explosionRadius: 0,
            maxRadius: payload.maxRadius
          });
        }
      })
      .on("broadcast", { event: "cannon_move" }, ({ payload }) => {
        if (payload.userId !== user.id) {
          if (!gameState.current.peerCannons) gameState.current.peerCannons = {};
          gameState.current.peerCannons[payload.userId] = {
            progress: payload.progress,
            angle: payload.angle,
            avatar: payload.avatar
          };
        }
      })
      .on("broadcast", { event: "sync_fishes" }, ({ payload }) => {
        if (!gameState.current.isHost && payload.fishes) {
          gameState.current.fishes = payload.fishes;
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId: user.id, avatar: userAvatar, slot: slotToTake });
        }
      });
  };

  const leaveRoom = async () => {
    if (activeRoom && currentSlot && user) {
      await supabase.from("banca_rooms").update({ [currentSlot]: null }).eq("id", activeRoom);
    }
    if (roomChannelRef.current) {
      roomChannelRef.current.unsubscribe();
      roomChannelRef.current = null;
    }
    setActiveRoom(null);
    setCurrentSlot(null);
  };

  useEffect(() => {
    gameState.current.bulletLevel = bulletLevels[currentBulletIndex];
    gameState.current.bulletDamage = bulletDamages[currentBulletIndex];
    gameState.current.bulletIndex = currentBulletIndex;
  }, [currentBulletIndex]);

  useEffect(() => {
    const loadedImages: Record<string, HTMLImageElement> = {};
    FISH_SPECIES.forEach(fish => {
      const img = new Image();
      img.src = `/assets/banca/${fish.file}.png`;
      loadedImages[fish.file] = img;
    });
    BOSS_SPECIES.forEach(boss => {
      const img = new Image();
      img.src = `/assets/banca/${boss.file}.png`;
      loadedImages[boss.file] = img;
    });
    gameState.current.imagesLoaded = loadedImages;

    const bulletImgs: HTMLImageElement[] = [];
    for (let i = 1; i <= 7; i++) {
      const bImg = new Image();
      bImg.src = `/assets/banca/dan/dragon-ball-${i}.png`;
      bulletImgs.push(bImg);
    }
    gameState.current.bulletImagesLoaded = bulletImgs;
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    let animationFrameId: number;
    let syncTimer = 0;

    // Chiều rộng & cao logic trong hệ tọa độ zoom
    const getVirtualDimensions = () => {
      return {
        w: window.innerWidth / ZOOM_SCALE,
        h: window.innerHeight / ZOOM_SCALE
      };
    };

    const getCannonTransform = (progress: number, w: number, h: number) => {
      const margin = 40;
      const bottomLen = w - margin * 2;
      const rightLen = h - margin * 2;
      const topLen = w - margin * 2;
      const leftLen = h - margin * 2;
      const perimeter = bottomLen + rightLen + topLen + leftLen;

      const p = ((progress % perimeter) + perimeter) % perimeter;
      let x = 0, y = 0, defaultAngle = 0;

      if (p < bottomLen) {
        x = margin + p; y = h - margin; defaultAngle = -Math.PI / 2;
      } else if (p < bottomLen + rightLen) {
        const subP = p - bottomLen;
        x = w - margin; y = h - margin - subP; defaultAngle = Math.PI;
      } else if (p < bottomLen + rightLen + topLen) {
        const subP = p - (bottomLen + rightLen);
        x = w - margin - subP; y = margin; defaultAngle = Math.PI / 2;
      } else {
        const subP = p - (bottomLen + rightLen + topLen);
        x = margin; y = margin + subP; defaultAngle = 0;
      }

      return { x, y, defaultAngle, perimeter };
    };

    const createFishInstance = (template: any, x: number, y: number, vx: number, vy: number, isBoss = false) => {
      let weightVal = 1;
      let hp = 100;

      if (isBoss) {
        const weightTons = Math.floor(Math.random() * (template.weightRange[1] - template.weightRange[0] + 1)) + template.weightRange[0];
        weightVal = weightTons; 
        hp = template.baseHp * (weightTons / template.weightRange[0]);
        const reward = template.baseReward * (weightTons / template.weightRange[0]);

        return {
          id: Math.random().toString(36).substring(2, 9),
          file: template.file,
          name: template.name,
          group: "boss",
          weight: weightTons,
          isTons: true,
          reward: reward,
          x, y, vx, vy,
          radius: template.radius,
          hp: hp,
          maxHp: hp,
          timer: 300 * 60,
          tailTimer: 0,
          damageContributors: {} as Record<string, number>
        };
      }

      if (template.group === "small") {
        weightVal = Math.floor(Math.random() * 30) + 1;
        hp = weightVal * 15; 
      } else if (template.group === "medium") {
        weightVal = Math.floor(Math.random() * 71) + 30;
        hp = weightVal * 60; 
      } else if (template.group === "large") {
        weightVal = Math.floor(Math.random() * 901) + 100;
        hp = weightVal * 2500 * 1.3 * 2; 
      }

      const reward = template.baseReward * (weightVal / 10);

      return {
        id: Math.random().toString(36).substring(2, 9),
        file: template.file,
        name: template.name,
        group: template.group,
        weight: weightVal,
        isTons: false,
        reward: Math.max(10, Math.floor(reward)),
        aggressive: template.aggressive,
        x, y, vx, vy,
        radius: template.radius,
        hp: hp,
        maxHp: hp,
        tailTimer: Math.random() * 100,
        damageContributors: {} as Record<string, number>
      };
    };

    const spawnFish = () => {
      if (!gameState.current.isHost) return;
      const fishes = gameState.current.fishes;
      const { w: currentWidth, h: currentHeight } = getVirtualDimensions();

      const hasBoss = fishes.some(f => f.group === "boss");

      if (!hasBoss) {
        if (gameState.current.bossSpawnTimer > 0) {
          gameState.current.bossSpawnTimer--;
        } else {
          const bossTemplate = BOSS_SPECIES[Math.floor(Math.random() * BOSS_SPECIES.length)];
          const bossX = currentWidth / 2;
          const bossY = currentHeight / 2;
          const newBoss = createFishInstance(bossTemplate, bossX, bossY, bossTemplate.speed, 0, true);
          
          fishes.push(newBoss);

          setLargeFishPopup({ 
            name: `🔥 SIÊU BOSS ${bossTemplate.name.toUpperCase()} XUẤT HIỆN!`, 
            reward: 0, 
            weightText: `${newBoss.weight} Tấn` 
          });
          setTimeout(() => setLargeFishPopup(null), 4500);

          return;
        }
      }

      const hasLargeFish = fishes.some(f => f.group === "large");
      if (!hasLargeFish) {
        if (gameState.current.largeFishTimer > 0) {
          gameState.current.largeFishTimer--;
        } else {
          const largeTemplates = FISH_SPECIES.filter(f => f.group === "large");
          const template = largeTemplates[Math.floor(Math.random() * largeTemplates.length)];
          const speed = template.speedRange[0] + Math.random() * (template.speedRange[1] - template.speedRange[0]);
          const x = -150, y = Math.random() * (currentHeight - 200) + 100;
          
          const newLargeFish = createFishInstance(template, x, y, speed, (Math.random() - 0.5) * 0.1);
          fishes.push(newLargeFish);

          setLargeFishPopup({ 
            name: `⚠️ CÁ KHỦNG XUẤT HIỆN: ${template.name}`, 
            reward: 0, 
            weightText: `${newLargeFish.weight}kg` 
          });
          setTimeout(() => setLargeFishPopup(null), 3500);

          gameState.current.largeFishTimer = (Math.floor(Math.random() * 176) + 5) * 60;
        }
      }

      if (Math.random() < 0.04) {
        const medTemplates = FISH_SPECIES.filter(f => f.group === "medium");
        const template = medTemplates[Math.floor(Math.random() * medTemplates.length)];
        const speed = template.speedRange[0] + Math.random() * (template.speedRange[1] - template.speedRange[0]);
        const type = Math.floor(Math.random() * 4);
        let x = 0, y = 0, vx = 0, vy = 0;

        if (type === 0) { x = -100; y = Math.random() * (currentHeight - 200) + 100; vx = speed; vy = (Math.random() - 0.5) * 0.1; }
        else if (type === 1) { x = currentWidth + 100; y = Math.random() * (currentHeight - 200) + 100; vx = -speed; vy = (Math.random() - 0.5) * 0.1; }
        else if (type === 2) { x = Math.random() * (currentWidth - 200) + 100; y = -100; vx = (Math.random() - 0.5) * 0.1; vy = speed; }
        else { x = Math.random() * (currentWidth - 200) + 100; y = currentHeight + 100; vx = (Math.random() - 0.5) * 0.1; vy = -speed; }

        fishes.push(createFishInstance(template, x, y, vx, vy));
      }

      if (Math.random() < 0.05) {
        const smallTemplates = FISH_SPECIES.filter(f => f.group === "small");
        const template = smallTemplates[Math.floor(Math.random() * smallTemplates.length)];
        const speed = template.speedRange[0] + Math.random() * (template.speedRange[1] - template.speedRange[0]);
        const type = Math.floor(Math.random() * 4);
        let x = 0, y = 0, vx = 0, vy = 0;

        if (type === 0) { x = -80; y = Math.random() * (currentHeight - 200) + 100; vx = speed; vy = (Math.random() - 0.5) * 0.15; }
        else if (type === 1) { x = currentWidth + 80; y = Math.random() * (currentHeight - 200) + 100; vx = -speed; vy = (Math.random() - 0.5) * 0.15; }
        else if (type === 2) { x = Math.random() * (currentWidth - 200) + 100; y = -80; vx = (Math.random() - 0.5) * 0.15; vy = speed; }
        else { x = Math.random() * (currentWidth - 200) + 100; y = currentHeight + 80; vx = (Math.random() - 0.5) * 0.15; vy = -speed; }

        fishes.push(createFishInstance(template, x, y, vx, vy));
      }
    };

    const spawnBubble = () => {
      const { w } = getVirtualDimensions();
      if (Math.random() < 0.1) {
        gameState.current.bubbles.push({
          x: Math.random() * w,
          y: window.innerHeight / ZOOM_SCALE + 10,
          radius: Math.random() * 5 + 2,
          speed: Math.random() * 2 + 1,
          opacity: Math.random() * 0.4 + 0.1
        });
      }
    };

    const handleCanvasClick = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      // Quy đổi tọa độ click màn hình sang tọa độ ảo trong thế giới Zoom
      const targetX = (clientX - rect.left) / ZOOM_SCALE;
      const targetY = (clientY - rect.top) / ZOOM_SCALE;

      const { w, h } = getVirtualDimensions();

      if (clientY < 75 || (clientY > window.innerHeight - 110 && clientX < 160) || (clientY < 100 && clientX > window.innerWidth - 280)) return;

      const transform = getCannonTransform(gameState.current.cannonProgress, w, h);
      const cannonX = transform.x;
      const cannonY = transform.y;

      const angle = Math.atan2(targetY - cannonY, targetX - cannonX);
      gameState.current.cannonAngle = angle;

      const speed = 15;
      const muzzleX = cannonX + Math.cos(angle) * 45;
      const muzzleY = cannonY + Math.sin(angle) * 45;

      const cost = gameState.current.bulletLevel;
      const currentActiveScore = (window as any).currentGameScore ?? score;
      
      if (currentActiveScore < cost) {
        alert("⚡ Số dư không đủ!");
        return;
      }
      
      syncScoreToSupabase(currentActiveScore - cost);

      const bulletIndex = gameState.current.bulletIndex;
      const calculatedMaxRadius = 40 + (bulletIndex * 25);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const damage = gameState.current.bulletDamage;
      const shooterId = user?.id || "local_player";

      gameState.current.bullets.push({
        userId: shooterId,
        x: muzzleX,
        y: muzzleY,
        vx, vy,
        damage,
        bulletIndex: bulletIndex,
        isExploding: false,
        explosionRadius: 0,
        maxRadius: calculatedMaxRadius
      });

      if (roomChannelRef.current && user) {
        roomChannelRef.current.send({
          type: "broadcast",
          event: "fire_bullet",
          payload: {
            userId: shooterId,
            x: muzzleX,
            y: muzzleY,
            vx, vy,
            damage,
            bulletIndex,
            maxRadius: calculatedMaxRadius
          }
        });
      }
    };

    canvas.addEventListener("pointerdown", handleCanvasClick);

    const gameLoop = () => {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const { w: currentWidth, h: currentHeight } = getVirtualDimensions();

      const bgGradient = ctx.createLinearGradient(0, 0, 0, currentHeight);
      bgGradient.addColorStop(0, "#011e3d");
      bgGradient.addColorStop(1, "#000814");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, currentWidth, currentHeight);

      // --- ÁP DỤNG ZOOM TOÀN BỘ KHÔNG GIAN HỒ ---
      ctx.save();
      ctx.scale(ZOOM_SCALE, ZOOM_SCALE);

      const realWidth = currentWidth;
      const realHeight = currentHeight;

      spawnBubble();
      gameState.current.bubbles.forEach((b, index) => {
        b.y -= b.speed;
        b.x += Math.sin(b.y / 25) * 0.6;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${b.opacity})`;
        ctx.fill();
        if (b.y < -10) gameState.current.bubbles.splice(index, 1);
      });

      const moveSpeed = 6;
      const tempTransform = getCannonTransform(0, realWidth, realHeight);
      const maxPerimeter = tempTransform.perimeter;

      if (isMovingLeft.current) gameState.current.cannonProgress -= moveSpeed;
      if (isMovingRight.current) gameState.current.cannonProgress += moveSpeed;
      gameState.current.cannonProgress = ((gameState.current.cannonProgress % maxPerimeter) + maxPerimeter) % maxPerimeter;

      if (roomChannelRef.current && user) {
        roomChannelRef.current.send({
          type: "broadcast",
          event: "cannon_move",
          payload: {
            userId: user.id,
            progress: gameState.current.cannonProgress,
            angle: gameState.current.cannonAngle,
            avatar: userAvatar
          }
        });
      }

      spawnFish();

      if (gameState.current.isHost && roomChannelRef.current) {
        syncTimer++;
        if (syncTimer > 30) {
          syncTimer = 0;
          roomChannelRef.current.send({
            type: "broadcast",
            event: "sync_fishes",
            payload: { fishes: gameState.current.fishes }
          });
        }
      }

      gameState.current.fishes.forEach((fish, fIndex) => {
        if (fish.group === "boss") {
          fish.timer--;
          if (fish.timer <= 0) {
            gameState.current.fishes.splice(fIndex, 1);
            setLargeFishPopup({ name: `⏳ BOSS ĐÃ RỜI ĐI DO HẾT THỜI GIAN! (Không có thưởng)`, reward: 0, weightText: "" });
            setTimeout(() => setLargeFishPopup(null), 3500);

            gameState.current.bossSpawnTimer = Math.floor(Math.random() * (36000 - 18000 + 1)) + 18000;
            return;
          }

          fish.x += fish.vx;
          if (fish.x < 250 || fish.x > realWidth - 250) {
            fish.vx *= -1;
          }
          fish.y += Math.sin(fish.x / 100) * 0.4;
        } else {
          fish.x += fish.vx;
          fish.y += fish.vy;
        }

        fish.tailTimer += 0.1;
        
        ctx.save();
        ctx.translate(fish.x, fish.y);
        const fishAngle = fish.group === "boss" ? (fish.vx < 0 ? Math.PI : 0) : Math.atan2(fish.vy, fish.vx) + Math.PI;
        ctx.rotate(fishAngle);

        const tailWag = Math.sin(fish.tailTimer) * 0.04;
        ctx.scale(1 + tailWag, 1 - tailWag);

        const img = gameState.current.imagesLoaded[fish.file];
        const size = fish.radius * 2.2;
        if (img && img.complete && img.naturalWidth !== 0) {
          ctx.drawImage(img, -size / 2, -size / 2, size, size);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, fish.radius, 0, Math.PI * 2);
          ctx.fillStyle = fish.group === "boss" ? "#ef4444" : fish.group === "large" ? "#f59e0b" : "#38bdf8";
          ctx.fill();
        }
        ctx.restore();

        if (fish.group === "boss") {
          ctx.save();
          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          ctx.fillRect(fish.x - 60, fish.y - fish.radius - 32, 120, 14);
          const hpRatio = Math.max(0, fish.hp / fish.maxHp);
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(fish.x - 58, fish.y - fish.radius - 30, 116 * hpRatio, 10);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`👑 ${fish.name} (${fish.weight} Tấn)`, fish.x, fish.y - fish.radius - 38);
          ctx.restore();
        }

        if (fish.group !== "boss" && (fish.x > realWidth + 250 || fish.x < -250 || fish.y > realHeight + 250 || fish.y < -250)) {
          gameState.current.fishes.splice(fIndex, 1);
        }
      });

      const activeTarget = gameState.current.fishes.find(f => f.group === "large" || f.group === "boss");
      if (activeTarget) {
        setActiveLargeFishUI({
          name: activeTarget.name,
          hpPercent: Math.max(0, Math.min(100, (activeTarget.hp / activeTarget.maxHp) * 100)),
          weightText: activeTarget.isTons ? `${activeTarget.weight} Tấn` : `${activeTarget.weight}kg`,
          isBoss: activeTarget.group === "boss",
          timeLeft: activeTarget.timer ? Math.ceil(activeTarget.timer / 60) : undefined
        });
      } else {
        setActiveLargeFishUI(null);
      }

      const transform = getCannonTransform(gameState.current.cannonProgress, realWidth, realHeight);
      const renderCannon = (tx: number, ty: number, angle: number, isSelf = true) => {
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(angle + Math.PI / 2);

        ctx.beginPath();
        ctx.arc(0, 0, 30, Math.PI, 0);
        ctx.fillStyle = isSelf ? "#0f172a" : "#311010";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = isSelf ? "#38bdf8" : "#f43f5e";
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(0, -22, 16, 28, 0, 0, Math.PI * 2);
        const cannonGrad = ctx.createLinearGradient(-16, -50, 16, 0);
        cannonGrad.addColorStop(0, isSelf ? "#0284c7" : "#e11d48");
        cannonGrad.addColorStop(1, isSelf ? "#0369a1" : "#be123c");
        ctx.fillStyle = cannonGrad;
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.roundRect(-20, -46, 40, 14, 4);
        ctx.fillStyle = isSelf ? "#38bdf8" : "#fb7185";
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      };

      renderCannon(transform.x, transform.y, gameState.current.cannonAngle, true);

      if (gameState.current.peerCannons) {
        Object.keys(gameState.current.peerCannons).forEach((peerId) => {
          const peer = gameState.current.peerCannons[peerId];
          if (peer) {
            const peerTrans = getCannonTransform(peer.progress, realWidth, realHeight);
            renderCannon(peerTrans.x, peerTrans.y, peer.angle, false);
          }
        });
      }

      gameState.current.bullets.forEach((bullet, bIndex) => {
        if (!bullet.isExploding) {
          bullet.x += bullet.vx;
          bullet.y += bullet.vy;
          
          ctx.save();
          const safeIndex = Math.min(Math.max(0, bullet.bulletIndex ?? 0), (gameState.current.bulletImagesLoaded?.length || 1) - 1);
          const bImg = gameState.current.bulletImagesLoaded?.[safeIndex];
          const bSize = 28 + (safeIndex * 2);

          if (bImg && bImg.complete && bImg.naturalWidth !== 0) {
            ctx.drawImage(bImg, bullet.x - bSize / 2, bullet.y - bSize / 2, bSize, bSize);
          } else {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = "#facc15";
            ctx.fill();
          }
          ctx.restore();

          if (bullet.x < 0 || bullet.x > realWidth || bullet.y < 0 || bullet.y > realHeight) {
            bullet.isExploding = true;
          }

          gameState.current.fishes.forEach(fish => {
            const dist = Math.hypot(fish.x - bullet.x, fish.y - bullet.y);
            if (dist < fish.radius + 10) {
              bullet.isExploding = true;
            }
          });
        } else {
          bullet.explosionRadius += 7;
          
          const gradient = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, bullet.explosionRadius);
          gradient.addColorStop(0, "rgba(255, 200, 0, 0.95)");
          gradient.addColorStop(0.4, "rgba(255, 50, 0, 0.8)");
          gradient.addColorStop(1, "rgba(0, 245, 212, 0)");
          
          ctx.beginPath();
          ctx.arc(bullet.x, bullet.y, bullet.explosionRadius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();

          gameState.current.fishes.forEach((fish, fIndex) => {
            if (fish.hp > 0) {
              const dist = Math.hypot(fish.x - bullet.x, fish.y - bullet.y);
              if (dist < bullet.explosionRadius + fish.radius) {
                const actualDmg = Math.min(fish.hp, bullet.damage);
                fish.hp -= actualDmg;

                if (!fish.damageContributors) fish.damageContributors = {};
                fish.damageContributors[bullet.userId] = (fish.damageContributors[bullet.userId] || 0) + actualDmg;
                
                if (fish.hp <= 0) {
                  const totalReward = fish.reward;
                  const currentUserId = user?.id || "local_player";
                  const totalHpCa = fish.maxHp;

                  Object.keys(fish.damageContributors).forEach(async (shooterId) => {
                    const dmgDealt = fish.damageContributors[shooterId];
                    const shareRatio = dmgDealt / totalHpCa;
                    const personalReward = Math.floor(totalReward * shareRatio);

                    if (personalReward > 0) {
                      if (shooterId === currentUserId) {
                        const currentActiveScore = (window as any).currentGameScore ?? score;
                        syncScoreToSupabase(currentActiveScore + personalReward);
                      }
                    }
                  });

                  if (fish.group === "large" || fish.group === "boss") {
                    const myDmg = fish.damageContributors[currentUserId] || 0;
                    const myRatio = Math.round((myDmg / totalHpCa) * 100);
                    setLargeFishPopup({
                      name: `🎉 TIÊU DIỆT THÀNH CÔNG: ${fish.name.toUpperCase()}!`,
                      reward: Math.floor(totalReward * (myDmg / totalHpCa)),
                      weightText: fish.isTons ? `${fish.weight} Tấn (Đóng góp ${myRatio}%)` : `${fish.weight}kg (Đóng góp ${myRatio}%)`
                    });
                    setTimeout(() => setLargeFishPopup(null), 5000);
                  }

                  if (fish.group === "boss") {
                    gameState.current.bossSpawnTimer = Math.floor(Math.random() * (36000 - 18000 + 1)) + 18000;
                  }

                  gameState.current.fishes.splice(fIndex, 1);
                }
              }
            }
          });

          if (bullet.explosionRadius > bullet.maxRadius) {
            gameState.current.bullets.splice(bIndex, 1);
          }
        }
      });

      // Phục hồi lại context sau khi vẽ canvas zoom
      ctx.restore();

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (canvas) canvas.removeEventListener("pointerdown", handleCanvasClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeRoom]);

  if (!activeRoom) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-white overflow-hidden">
        <div className="absolute top-4 left-4">
          <Link href="/" className="bg-slate-900 border border-cyan-500/40 text-cyan-400 px-4 py-2 rounded-xl font-black text-sm shadow hover:bg-slate-800 transition">
            ← Quay Lại
          </Link>
        </div>

        <div className="max-w-md w-full bg-slate-900/90 border-2 border-cyan-500/60 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-cyan-400 uppercase tracking-widest drop-shadow-lg">🌊 Sảnh Bắn Cá Đa Người Chơi</h1>
            <p className="text-xs text-slate-400 mt-2">Chọn phòng để cùng bạn bè di chuyển súng và săn cá realtime!</p>
          </div>

          <div className="space-y-3">
            {rooms.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-4">Đang tải danh sách phòng...</div>
            ) : (
              rooms.map((room) => {
                let currentCount = 0;
                for (let i = 1; i <= 4; i++) {
                  if (room[`player_${i}`]) currentCount++;
                }
                const isFull = currentCount >= room.max_players;

                return (
                  <button
                    key={room.id}
                    disabled={isFull}
                    onClick={() => joinRoom(room.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition font-black ${
                      isFull
                        ? "bg-slate-800 border-rose-500/40 text-rose-300 cursor-not-allowed"
                        : "bg-slate-950 border-cyan-500/40 text-cyan-300 hover:bg-slate-800 hover:scale-[1.02] cursor-pointer"
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
            <img src={userAvatar} className="w-10 h-10 rounded-full border-2 border-cyan-400 object-cover" />
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
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-slate-950 select-none font-sans pointer-events-auto" style={{ touchAction: "manipulation", margin: 0, padding: 0 }}>
      {/* HEADER TỐI ƯU MOBILE MỞ RỘNG TỐI ĐA */}
      <div className="absolute top-1.5 left-1.5 right-1.5 flex justify-between items-center z-50 pointer-events-auto gap-1">
        <div className="flex items-center space-x-1">
          <button
            onClick={leaveRoom}
            className="bg-rose-900/95 text-rose-200 hover:bg-rose-800 px-2 py-1 rounded-md text-[8px] sm:text-[9px] font-black border border-rose-500/40 shadow cursor-pointer"
          >
            ← Rời
          </button>
          <div className="bg-black/85 text-white px-2 py-1 rounded-md font-bold text-[8px] sm:text-[9px] border border-cyan-500/40 shadow flex items-center gap-1">
            <img src={userAvatar} alt="Avatar" className="w-3.5 h-3.5 rounded-full border border-cyan-400 object-cover" />
            <span>
              <span id="score" className="text-[#FFEB3B] font-black">
                {isMounted ? score.toLocaleString() : "..."}
              </span>🪙
            </span>
          </div>
          <button
            onClick={() => setIsShopOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 px-2 py-1 rounded-md font-black text-[8px] sm:text-[9px] shadow active:scale-95 transition cursor-pointer flex items-center gap-0.5 border border-white/40"
          >
            🛍️ Shop
          </button>
          <button
            onClick={() => setIsInventoryOpen(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 px-2 py-1 rounded-md font-black text-[8px] sm:text-[9px] shadow active:scale-95 transition cursor-pointer flex items-center gap-0.5 border border-white/40"
          >
            🎒 Súng
          </button>
        </div>

        <div className="flex items-center space-x-1">
          <div className="relative">
            <button
              onClick={() => { setIsBulletMenuOpen(!isBulletMenuOpen); setIsSkillMenuOpen(false); }}
              className="bg-slate-900/95 hover:bg-slate-800 border border-cyan-500/70 px-2 py-1 rounded-md shadow-2xl flex items-center space-x-1 text-cyan-300 text-[8px] sm:text-[9px] font-black cursor-pointer transition select-none"
            >
              <span>🎯</span>
              <span>Tier {currentBulletIndex + 1}: {bulletLevels[currentBulletIndex].toLocaleString()}</span>
              <span>{isBulletMenuOpen ? "▲" : "▼"}</span>
            </button>
            {isBulletMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-slate-950/98 border-2 border-cyan-500 rounded-xl shadow-2xl overflow-hidden z-50 p-1 space-y-1 backdrop-blur-md">
                <div className="px-2 py-1 text-[8px] font-black text-cyan-400 uppercase border-b border-slate-800">Chọn Cấp Đạn</div>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                  {bulletLevels.map((lvl, index) => (
                    <button
                      key={lvl}
                      onClick={() => {
                        setCurrentBulletIndex(index);
                        setIsBulletMenuOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-black transition cursor-pointer flex items-center justify-between ${
                        currentBulletIndex === index
                          ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow"
                          : "bg-slate-900 text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <span className="truncate">Tier {index + 1}: {lvl.toLocaleString()}🪙</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => { setIsSkillMenuOpen(!isSkillMenuOpen); setIsBulletMenuOpen(false); }}
              className="bg-slate-900/95 hover:bg-slate-800 border border-purple-500/70 px-2 py-1 rounded-md shadow-2xl flex items-center space-x-1 text-purple-300 text-[8px] sm:text-[9px] font-black cursor-pointer transition select-none"
            >
              <span>⚡</span>
              <span className="truncate max-w-[80px]">{skillsList[currentSkillIndex].name}</span>
              <span>{isSkillMenuOpen ? "▲" : "▼"}</span>
            </button>
            {isSkillMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-slate-950/98 border-2 border-purple-500 rounded-xl shadow-2xl overflow-hidden z-50 p-1 space-y-1 backdrop-blur-md">
                <div className="px-2 py-1 text-[8px] font-black text-purple-400 uppercase border-b border-slate-800">Kỹ Năng Săn Cá</div>
                <div className="space-y-1">
                  {skillsList.map((sk, index) => (
                    <button
                      key={sk.name}
                      onClick={() => {
                        setCurrentSkillIndex(index);
                        setIsSkillMenuOpen(false);
                        setActiveSkillNotice(sk.name);
                        setTimeout(() => setActiveSkillNotice(null), 2500);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-black transition cursor-pointer flex items-center justify-between ${
                        currentSkillIndex === index
                          ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow"
                          : "bg-slate-900 text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <span className="truncate">{sk.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- ĐỒNG ĐỘI --- */}
      <div className="absolute top-12 left-2 flex items-center gap-1 z-25 bg-slate-950/80 border border-cyan-500/40 px-2 py-1 rounded-lg backdrop-blur-md text-[8px]">
        <span className="font-bold text-slate-300 uppercase">Đội ({onlinePlayers.length}/4):</span>
        <div className="flex -space-x-1.5">
          {onlinePlayers.map((p, idx) => (
            <img key={idx} src={p.avatar || userAvatar} className="w-4 h-4 rounded-full border border-cyan-400 object-cover" title={`Slot: ${p.slot}`} />
          ))}
        </div>
      </div>

      {activeSkillNotice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-purple-900/90 border border-purple-400 text-purple-200 px-4 py-1 rounded-full font-bold text-[9px] shadow-[0_0_20px_rgba(168,85,247,0.8)] z-30 animate-bounce pointer-events-none">
          ✨ Đã kích hoạt: {activeSkillNotice}!
        </div>
      )}

      {/* --- THANH MÁU CÁ LỚN / BOSS Ở GÓC PHẢI TRÊN --- */}
      {activeLargeFishUI && (
        <div className={`absolute top-12 right-2 w-52 sm:w-60 bg-slate-950/95 border-2 p-2 rounded-xl backdrop-blur-md z-30 shadow-xl animate-fade-in ${activeLargeFishUI.isBoss ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'border-amber-500'}`}>
          <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-black mb-1 text-white">
            <span className="truncate max-w-[90px]">{activeLargeFishUI.isBoss ? '👑' : '⚠️'} {activeLargeFishUI.name}</span>
            <span className="text-yellow-300">{activeLargeFishUI.weightText}</span>
            {activeLargeFishUI.timeLeft !== undefined && (
              <span className="text-cyan-300">⏱️ {Math.floor(activeLargeFishUI.timeLeft / 60)}:{(activeLargeFishUI.timeLeft % 60).toString().padStart(2, '0')}</span>
            )}
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-600">
            <div className={`h-full transition-all duration-200 ${activeLargeFishUI.isBoss ? 'bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400' : 'bg-gradient-to-r from-amber-500 to-yellow-300'}`} style={{ width: `${activeLargeFishUI.hpPercent}%` }} />
          </div>
          <div className="text-right text-[8px] text-slate-400 mt-0.5 font-bold">{Math.round(activeLargeFishUI.hpPercent)}% HP</div>
        </div>
      )}

      {/* --- POPUP THÔNG BÁO --- */}
      {largeFishPopup && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-red-600/95 via-amber-600/95 to-red-600/95 border-2 border-yellow-300 px-4 py-3 rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.9)] z-40 text-center animate-bounce pointer-events-none max-w-xs">
          <h2 className="text-white font-black text-sm sm:text-base drop-shadow my-0.5">{largeFishPopup.name}</h2>
          {largeFishPopup.weightText && (
            <p className="text-yellow-200 font-bold text-[9px] sm:text-xs bg-black/50 px-3 py-0.5 rounded-full inline-block mt-0.5">
              ⚖️ Trọng lượng: {largeFishPopup.weightText} {largeFishPopup.reward > 0 ? `| +${largeFishPopup.reward.toLocaleString()}🪙` : ""}
            </p>
          )}
        </div>
      )}

      {/* --- NÚT ĐIỀU HƯỚNG TRÁI PHẢI (CHÈO SÚNG) GỐC DƯỚI TRÁI --- */}
      <div className="absolute bottom-2 left-2 z-40 flex items-center space-x-1.5 bg-black/80 p-1.5 rounded-xl border border-cyan-500/60 shadow-xl backdrop-blur-md pointer-events-auto">
        <button
          onPointerDown={() => isMovingLeft.current = true}
          onPointerUp={() => isMovingLeft.current = false}
          onPointerLeave={() => isMovingLeft.current = false}
          className="w-9 h-9 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black text-sm rounded-lg active:scale-90 transition shadow cursor-pointer flex items-center justify-center select-none"
        >
          ◀
        </button>
        <span className="text-[9px] font-black text-cyan-300 uppercase px-0.5">Súng</span>
        <button
          onPointerDown={() => isMovingRight.current = true}
          onPointerUp={() => isMovingRight.current = false}
          onPointerLeave={() => isMovingRight.current = false}
          className="w-9 h-9 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black text-sm rounded-lg active:scale-90 transition shadow cursor-pointer flex items-center justify-center select-none"
        >
          ▶
        </button>
      </div>

      {isProfileOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-cyan-400/60 p-5 rounded-2xl w-full max-w-xs text-cyan-100 shadow">
            <h3 className="text-base font-black text-cyan-400 mb-3 flex items-center gap-2">👤 Thông Tin Người Chơi</h3>
            <div className="space-y-2 text-xs mb-4">
              <p>🎯 Cấp độ: <span className="text-yellow-400 font-bold">Thợ Săn Thượng Thừa</span></p>
              <p>🪙 Vàng hiện có: <span className="text-amber-400 font-bold">{score.toLocaleString()}</span></p>
            </div>
            <button onClick={() => setIsProfileOpen(false)} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-xl text-xs transition-all cursor-pointer">Đóng</button>
          </div>
        </div>
      )}

      {isInventoryOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-cyan-400/60 p-5 rounded-2xl w-full max-w-sm text-cyan-100 shadow">
            <h3 className="text-base font-black text-cyan-400 mb-3 flex items-center gap-2">🎒 Kho Súng Đã Mua</h3>
            <div className="space-y-2.5 text-xs mb-4 max-h-52 overflow-y-auto">
              {ownedGuns.map((gun, idx) => (
                <div key={gun.id} className="bg-slate-800/80 p-2.5 rounded-xl border border-cyan-500/30 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-cyan-300">{gun.name}</p>
                    <p className="text-[10px] text-slate-400">Đã sở hữu vĩnh viễn</p>
                  </div>
                  <button onClick={() => setOwnedGuns(ownedGuns.map((g, i) => ({ ...g, active: i === idx })))} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${gun.active ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    {gun.active ? 'Đang dùng' : 'Trang bị'}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setIsInventoryOpen(false)} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-xl text-xs transition-all cursor-pointer">Đóng</button>
          </div>
        </div>
      )}

      {isShopOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-amber-400/60 p-5 rounded-2xl w-full max-w-sm text-amber-100 shadow">
            <h3 className="text-base font-black text-amber-400 mb-3 flex items-center gap-2">🛒 Cửa Hàng Nhanh</h3>
            <div className="space-y-2.5 text-xs mb-4 max-h-52 overflow-y-auto">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-amber-500/30 flex justify-between items-center">
                <div>
                  <p className="font-bold text-amber-300">🚀 Đại Bác Tứ Phương V,2</p>
                  <p className="text-[10px] text-slate-400">Giá: 5.000.000 🪙</p>
                </div>
                <button onClick={() => {
                  const currentActiveScore = (window as any).currentGameScore ?? score;
                  if (currentActiveScore >= 5000000) {
                    syncScoreToSupabase(currentActiveScore - 5000000);
                    setOwnedGuns([...ownedGuns, { id: 3, name: "🚀 Đại Bác Tứ Phương V,2", active: false }]);
                    alert("Mua thành công súng mới!");
                  } else { alert("Không đủ vàng!"); }
                }} className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-2.5 py-1 rounded-lg text-[10px] cursor-pointer">Mua Ngay</button>
              </div>
            </div>
            <button onClick={() => setIsShopOpen(false)} className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold py-2 rounded-xl text-xs transition-all cursor-pointer">Đóng</button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="absolute inset-0 w-screen h-screen block pointer-events-auto" style={{ width: "100vw", height: "100vh" }}></canvas>
    </div>
  );
}