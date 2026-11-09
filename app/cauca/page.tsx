"use client";

import React, { useState, useEffect } from "react";
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
    flowType: 'pkce',
  },
});

export default function CauCaPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [score, setScore] = useState<number>(1000);
  const [userAvatar, setUserAvatar] = useState<string>("/assets/avatar/xtra1.ico");
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [selectedBait, setSelectedBait] = useState<{ cost: number; filename: string; name: string }>({ 
    cost: 100000, 
    filename: "giun.png", 
    name: "Mồi Tiêu Chuẩn (100,000🪙)" 
  });
  const [isBaitDropdownOpen, setIsBaitDropdownOpen] = useState(false);

  const [selectedRod, setSelectedRod] = useState<string>("cancaucoban.png");
  const [popupData, setPopupData] = useState<{ show: boolean; title: string; message: string; type: 'rare' | 'beerus' } | null>(null);

  const [isShopOpen, setIsShopOpen] = useState(false);
  const [userRodsMap, setUserRodsMap] = useState<{ [filename: string]: string | null }>({ "cancaucoban.png": null });
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

  const [jackpot, setJackpot] = useState({
    minor: 100000,
    major: 500000,
    grand: 2000000
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    async function getProfile(currentUser: any) {
      if (!currentUser) return;
      setUser(currentUser);
      const { data } = await supabase
        .from('profiles')
        .select('balance, avatar_url, equipped_rod')
        .eq('id', currentUser.id)
        .single();
      
      if (data) {
        if (data.balance !== undefined) {
          setScore(data.balance);
          (window as any).currentGameScore = data.balance;
        }
        if (data.avatar_url) {
          setUserAvatar(data.avatar_url);
        }
        if (data.equipped_rod) {
          setSelectedRod(data.equipped_rod);
        }
      }

      const { data: rodsData } = await supabase
        .from('user_rods')
        .select('rod_filename, expires_at')
        .eq('user_id', currentUser.id);

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
      await supabase
        .from('profiles')
        .update({ balance: newScore })
        .eq('id', user.id);
    }
  };

  const showShopNotice = (msg: string) => {
    setShopNotification(msg);
    setTimeout(() => setShopNotification(null), 3000);
  };

  const handleRentRod = async (rod: typeof shopRods[0], days: number) => {
    if (!user) return;

    let priceToPay = rod.price3Days;
    if (days === 5) priceToPay = rod.price5Days;
    if (days === 7) priceToPay = rod.price7Days;

    if (score < priceToPay) {
      alert("⚡ Số dư không đủ để thuê cần này!");
      return;
    }

    const newBalance = score - priceToPay;
    const now = new Date();
    const currentExpiry = userRodsMap[rod.filename];
    let baseTime = (currentExpiry && new Date(currentExpiry) > now) ? new Date(currentExpiry) : now;
    const newExpiresAt = new Date(baseTime.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('profiles').update({ balance: newBalance }).eq('id', user.id);
    await supabase.from('user_rods').upsert([
      { user_id: user.id, rod_filename: rod.filename, rod_name: rod.name, expires_at: newExpiresAt }
    ], { onConflict: 'user_id,rod_filename' });

    setScore(newBalance);
    (window as any).currentGameScore = newBalance;
    setUserRodsMap({ ...userRodsMap, [rod.filename]: newExpiresAt });
    showShopNotice(`🎉 Thuê thành công ${rod.name} (${days} ngày)!`);
  };

  const handleEquipRod = async (filename: string) => {
    setSelectedRod(filename);
    window.dispatchEvent(new CustomEvent('changeRod', { detail: filename }));
    if (user) {
      await supabase
        .from('profiles')
        .update({ equipped_rod: filename })
        .eq('id', user.id);
    }
    showShopNotice(`✨ Đã trang bị cần câu mới!`);
  };

  useEffect(() => {
    async function fetchInitialJackpot() {
      const { data } = await supabase
        .from('cauca_jackpot')
        .select('*')
        .eq('id', 'global')
        .single();
      if (data) {
        setJackpot({ minor: data.minor, major: data.major, grand: data.grand });
      }
    }
    fetchInitialJackpot();

    const channel = supabase
      .channel('public:cauca_jackpot')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cauca_jackpot' }, (payload) => {
        if (payload.new) {
          setJackpot({
            minor: payload.new.minor,
            major: payload.new.major,
            grand: payload.new.grand
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const statusEl = document.getElementById('status');
    const powerContainer = document.getElementById('power-container');
    const powerBar = document.getElementById('power-bar');

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

    const decorFilenames = ['dabien.png', 'dabien2.png', 'rongbien.png', 'sanho.png', 'sanho2.png', 'taobien.png', 'taobien2.png'];
    const loadedDecorImages = decorFilenames.map((fname) => {
      const img = new Image();
      img.src = `/assets/cauca/daybien/${fname}`;
      return { img, filename: fname };
    });

    let width: number = window.innerWidth;
    let height: number = window.innerHeight;
    let waterY: number = height * 0.3;
    let boatX: number = 200; 
    let boatSpeed: number = 0; 
    let bottomTimer: NodeJS.Timeout | null = null;
    
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
      if (boatX > width - 150) boatX = width * 0.3;
    }
    window.addEventListener('resize', resize);
    resize();

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

      constructor(forcedLayer?: string, forcedY?: number, forcedDirection?: number) {
        this.spawn(forcedLayer, forcedY, forcedDirection);
      }
      
      spawn(forcedLayer?: string, forcedY?: number, forcedDirection?: number) {
        this.direction = forcedDirection !== undefined ? forcedDirection : (Math.random() > 0.5 ? 1 : -1);
        
        let availableFish = fishDatabase;
        if (forcedLayer) {
          availableFish = fishDatabase.filter(f => f.layer === forcedLayer);
          if (availableFish.length === 0) availableFish = fishDatabase;
        }

        const chosenInfo = availableFish[Math.floor(Math.random() * availableFish.length)];
        this.fishObj = loadedFishObjects.find(f => f.info.filename === chosenInfo.filename) || loadedFishObjects[0];
        this.fishData = this.fishObj.info;
        this.layer = this.fishData.layer;

        this.size = (Math.random() * 8 + 14) * this.fishData.sizeScale;
        
        const rawPoints = this.fishData.basePoints * this.fishData.multi;
        if (this.fishData.layer === 'bottom') {
          const randomMultiplier = 1 + Math.random() * 1.5;
          this.points = Math.round(rawPoints * randomMultiplier);
        } else {
          this.points = Math.round(rawPoints);
        }

        this.struggleChance = (this.fishData as any).struggleWeight ?? 0.2;
        this.maxHp = (this.fishData as any).maxHp ?? 15;
        this.animFrame = Math.random() * 100;
        this.notifiedRare = false;

        const waterHeight = height - waterY;
        
        if (this.layer === "top") {
          this.y = forcedY !== undefined ? forcedY : (waterY + 25 + Math.random() * (waterHeight * 0.25));
          this.speed = (Math.random() * 2.6 + 2.0) * this.direction;
        } else if (this.layer === "mid") {
          this.y = forcedY !== undefined ? forcedY : (waterY + (waterHeight * 0.32) + Math.random() * (waterHeight * 0.3));
          this.speed = (Math.random() * 1.1 + 0.7) * this.direction;
        } else {
          this.y = forcedY !== undefined ? forcedY : (waterY + (waterHeight * 0.68) + Math.random() * (waterHeight * 0.25));
          this.speed = (Math.random() * 0.5 + 0.25) * this.direction;
        }

        this.x = this.direction === 1 ? -this.size * 2 : width + this.size * 2;
        this.isCaught = false;
      }

      update() {
        if (this.isCaught) return;
        this.x += this.speed;
        this.animFrame += 0.08;

        if (this.points >= 100000000 && !this.notifiedRare && this.x > width * 0.2 && this.x < width * 0.8) {
          this.notifiedRare = true;
          window.dispatchEvent(new CustomEvent('showPopupBanner', {
            detail: {
              title: "🔥 CẢNH BÁO: QUÁI VẬT KHỔNG LỒ SIÊU HIẾM! 🔥",
              message: `Thần Beerus phát hiện sinh vật ${this.fishData.vnName} huyền thoại trị giá ${this.points.toLocaleString()} 🪙!`,
              type: 'rare'
            }
          }));
        }
        
        if ((this.direction === 1 && this.x > width + this.size * 2) || 
            (this.direction === -1 && this.x < -this.size * 2)) {
          this.spawn(this.layer);
        }
      }

      draw() {
        ctx!.save();
        ctx!.translate(this.x, this.y);

        const gentleSwim = Math.sin(this.animFrame) * 0.04;
        ctx!.rotate(gentleSwim);

        if (this.direction === 1) {
          ctx!.scale(-1, 1);
        }
        
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
    window.addEventListener('changeBaitImg', updateBaitListener);

    const rodImg = new Image();
    rodImg.src = `/assets/cauca/cancau/${selectedRod}`;

    let currentRodDamageBuff = 1.0;
    let currentRodCritChance = 0.1;
    const updateRodListener = (e: any) => {
      const filename = e.detail;
      rodImg.src = `/assets/cauca/cancau/${filename}`;
      const foundRod = shopRods.find(r => r.filename === filename);
      if (foundRod) {
        currentRodDamageBuff = foundRod.damageBuff;
        currentRodCritChance = foundRod.critChance;
      }
    };
    window.addEventListener('changeRod', updateRodListener);

    const initialRodObj = shopRods.find(r => r.filename === selectedRod);
    if (initialRodObj) {
      currentRodDamageBuff = initialRodObj.damageBuff;
      currentRodCritChance = initialRodObj.critChance;
    }

    const moveBoatListener = (e: any) => {
      boatSpeed = e.detail; 
    };
    window.addEventListener('moveBoat', moveBoatListener);

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

      constructor() {
        this.reset();
      }
      reset() {
        let rodBaseX = boatX + 2;
        let rodBaseY = waterY - 32;
        let tipDist = 120;
        let angle = -0.42;
        let rodTipX = rodBaseX + Math.cos(angle) * tipDist;
        let rodTipY = rodBaseY + Math.sin(angle) * tipDist;

        this.x = rodTipX;
        this.y = rodTipY;
        this.state = 'IDLE'; 
        this.power = 0;
        this.targetWaterX = 0;
        this.maxDepthY = 0;
        this.castStartX = 0;
        this.castStartY = 0;
        this.castProgress = 0;
        this.caughtFish = null;
        this.currentFishHp = 0;
        this.maxFishHp = 0;
        if (bottomTimer) { clearTimeout(bottomTimer); bottomTimer = null; }

        if (statusEl) {
          statusEl.innerText = "Sẵn sàng (Đè giữ màn hình để gồng lực quăng)";
          statusEl.style.color = "white";
        }
        if (powerContainer) powerContainer.style.display = 'none';
      }

      startCharging(selectedBaitCost: number) {
        if (this.state !== 'IDLE') return;
        const currentActiveScore = (window as any).currentGameScore ?? 1000;
        if (currentActiveScore < selectedBaitCost) {
          alert("⚡ Điểm không đủ để mua mồi này! Hãy tích lũy thêm điểm nhé!");
          return;
        }
        this.baitPrice = selectedBaitCost;
        this.state = 'CHARGING';
        this.power = 0;
        if (powerContainer) powerContainer.style.display = 'block';
        if (statusEl) statusEl.innerText = "Đang gồng lực... (Giữ lâu để lực căng tối đa)";
      }

      releaseCharging(pointerX: number) {
        if (this.state !== 'CHARGING') return;

        const currentActiveScore = (window as any).currentGameScore ?? 1000;
        const newScore = currentActiveScore - this.baitPrice;
        syncScoreToSupabase(newScore);

        async function contributeJackpot(baitCost: number) {
          const { data } = await supabase.from('cauca_jackpot').select('*').eq('id', 'global').single();
          if (data) {
            let addMinor = 0;
            let addMajor = 0;
            let addGrand = Math.round(baitCost * 0.1); 

            if (baitCost >= 10 && baitCost <= 1000) {
              addMinor = Math.round(baitCost * 0.2); 
            } else if (baitCost >= 2000 && baitCost <= 100000) {
              addMajor = Math.round(baitCost * 0.2); 
            }

            await supabase.from('cauca_jackpot').update({
              minor: data.minor + addMinor,
              major: data.major + addMajor,
              grand: data.grand + addGrand
            }).eq('id', 'global');
          }
        }
        contributeJackpot(this.baitPrice);

        const totalWaterHeight = height - waterY;
        
        let maxAllowedDepthRatio = 0.3; 
        if (this.baitPrice >= 10000) maxAllowedDepthRatio = 1.0; 
        else if (this.baitPrice >= 5000) maxAllowedDepthRatio = 0.9;
        else if (this.baitPrice >= 1000) maxAllowedDepthRatio = 0.75;
        else if (this.baitPrice >= 500) maxAllowedDepthRatio = 0.6;
        else if (this.baitPrice >= 100) maxAllowedDepthRatio = 0.45;
        else if (this.baitPrice >= 50) maxAllowedDepthRatio = 0.38;

        const powerRatio = this.power / 100;
        this.maxDepthY = waterY + totalWaterHeight * maxAllowedDepthRatio;
        
        let rodBaseX = boatX + 2;
        let rodBaseY = waterY - 32;
        let tipDist = 120;
        let angle = -0.42;
        let rodTipX = rodBaseX + Math.cos(angle) * tipDist;
        let rodTipY = rodBaseY + Math.sin(angle) * tipDist;

        const minDistance = 50;
        const maxDistance = width - 80;
        this.targetWaterX = Math.max(minDistance, Math.min(rodTipX + (maxDistance - rodTipX) * powerRatio, maxDistance));
        
        this.state = 'CASTING';
        this.castStartX = rodTipX;
        this.castStartY = rodTipY;
        this.castProgress = 0;
        
        if (powerContainer) powerContainer.style.display = 'none';
        if (statusEl) statusEl.innerText = "Đang quăng mồi câu xuống nước...";
      }

      tapStruggle() {
        if (this.state === 'STRUGGLING') {
          let hitDamage = 1.0 * currentRodDamageBuff;
          
          const isCrit = Math.random() < currentRodCritChance;
          if (isCrit) {
            hitDamage *= 2.5;
            critPopups.push({
              x: this.x + (Math.random() - 0.5) * 40,
              y: this.y - 30,
              alpha: 1.0,
              scale: 1.2
            });
          }

          this.currentFishHp -= hitDamage;

          if (this.currentFishHp <= 0) {
            this.state = 'REELING_HORIZ';
            if (statusEl) {
              statusEl.innerText = `Đã RỈT CẠN MÁU ${this.caughtFish?.fishData.vnName}! Kéo lên xuồng...`;
              statusEl.style.color = "#FFEB3B";
            }
          }
        }
      }

      update() {
        let rodBaseX = boatX + 2;
        let rodBaseY = waterY - 32;
        let tipDist = 120;
        let angle = -0.42;
        let rodTipX = rodBaseX + Math.cos(angle) * tipDist;
        let rodTipY = rodBaseY + Math.sin(angle) * tipDist;

        if (this.state === 'IDLE' || this.state === 'CHARGING') {
          this.x = rodTipX;
          this.y = rodTipY;
        }

        if (this.state === 'CHARGING') {
          this.power += 1.8; 
          if (this.power > 100) this.power = 100;
          if (powerBar) powerBar.style.width = this.power + '%';
        }
        else if (this.state === 'CASTING') {
          const sinkSpeedMultiplier = this.baitPrice >= 1000 ? 0.025 : 0.04;
          this.castProgress += sinkSpeedMultiplier; 
          
          if (this.castProgress >= 1) {
            this.castProgress = 1;
            this.state = 'SINKING';
            if (statusEl) statusEl.innerText = "Mồi đang lơ lửng chờ cá táp...";
          }
          
          let t = this.castProgress;
          this.x = this.castStartX + (this.targetWaterX - this.castStartX) * t;
          let linearY = this.castStartY + (waterY - this.castStartY) * t;
          let arc = Math.sin(t * Math.PI) * 70; 
          this.y = linearY - arc;
        }
        else if (this.state === 'SINKING') {
          const sinkRate = Math.min(2.5, 1.2 + (this.baitPrice / 2000));
          this.y += sinkRate; 
          
          for (let f of fishes) {
            if (f.isCaught) continue;
            
            if (f.layer === 'bottom' && this.baitPrice < 10000) {
              continue; 
            }
            
            if (Math.abs(this.y - f.y) > 40) continue;
            
            let mouthX = f.direction === 1 ? f.x + f.size * 0.7 : f.x - f.size * 0.7;
            let mouthY = f.y - f.size * 0.15; 
            
            let dx = this.x - mouthX;
            let dy = this.y - mouthY;
            let dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 22 + f.size * 0.3) { 
              this.catchFish(f);
              break;
            }
          }

          if (this.state === 'SINKING' && this.y >= this.maxDepthY) {
            const isAtVeryBottom = this.y >= height - 80;

            if (isAtVeryBottom && !bottomTimer) {
              if (statusEl) {
                statusEl.innerText = "Mồi đã chạm đáy! Chờ 3 giây không cá ăn sẽ mất mồi...";
                statusEl.style.color = "#F44336";
              }
              bottomTimer = setTimeout(() => {
                if (this.state === 'SINKING') {
                  this.state = 'REELING_HORIZ';
                  
                  const beerusInsults = [
                    "Hừ! Đồ ăn dở tệ thế này mà cũng đòi dâng lên cho Ta à? HAKAI bây giờ!",
                    "Ngươi lóng ngóng thế này thì chừng nào mới đạt được Bản Năng Vô Hạn hả?",
                    "Cá ở hồ của Ta thông minh lắm, đâu dễ gì dính mồi cùi bắp của ngươi!",
                    "Thất vọng tràn trề! Ngươi mà cứ thế này thì chuẩn bị tinh thần bay màu cùng hành tinh đi!"
                  ];
                  const randomInsult = beerusInsults[Math.floor(Math.random() * beerusInsults.length)];

                  window.dispatchEvent(new CustomEvent('showPopupBanner', {
                    detail: {
                      title: "😼 THẦN BEERUS NỔI GIẬN (CÂU HỤT)",
                      message: randomInsult,
                      type: 'beerus'
                    }
                  }));

                  if (statusEl) {
                    statusEl.innerText = `Quá 3 giây không cá táp! Mất mồi (-${this.baitPrice} điểm)`;
                    statusEl.style.color = "#F44336";
                  }
                }
              }, 3000);
            } else if (!isAtVeryBottom) {
              this.state = 'REELING_HORIZ';
              if (statusEl) {
                statusEl.innerText = "Mồi hết tầm chìm, thu dây về (Không mất mồi)";
                statusEl.style.color = "#aaa";
              }
            }
          }
        }
        else if (this.state === 'STRUGGLING') {
          if (!this.caughtFish) return;
          
          this.currentFishHp += 0.04;
          if (this.currentFishHp > this.maxFishHp) {
            this.caughtFish.isCaught = false; 
            this.caughtFish = null;
            this.state = 'REELING_HORIZ';

            window.dispatchEvent(new CustomEvent('showPopupBanner', {
              detail: {
                title: "😼 THẦN BEERUS BĨU MÔI",
                message: "Đúng là vô dụng! Cả một con cá lớn thế mà cũng để sổng mất! HAKAI ngươi bây giờ!",
                type: 'beerus'
              }
            }));

            if (statusEl) {
              statusEl.innerText = "Đứt dây! Cá giãy quá mạnh đã sổng mất!";
              statusEl.style.color = "#F44336";
            }
          }
        }
        else if (this.state === 'REELING_HORIZ') {
          if (bottomTimer) { clearTimeout(bottomTimer); bottomTimer = null; }
          let dx = rodTipX - this.x;
          let speed = this.caughtFish ? 5 : 12;
          
          if (Math.abs(dx) < speed) {
            this.x = rodTipX;
            this.state = 'REELING_VERT';
            if (this.caughtFish && statusEl) statusEl.innerText = "Thu thẳng lên xuồng!";
          } else {
            this.x += Math.sign(dx) * speed;
            if (this.caughtFish) {
              let mouthOffsetX = this.caughtFish.direction === 1 ? this.caughtFish.size * 0.7 : -this.caughtFish.size * 0.7;
              let mouthOffsetY = -this.caughtFish.size * 0.15;
              this.caughtFish.x = this.x - mouthOffsetX;
              this.caughtFish.y = this.y - mouthOffsetY;
            }
          }
        }
        else if (this.state === 'REELING_VERT') {
          let dy = rodTipY - this.y;
          let speed = 25; 
          
          if (Math.abs(dy) < speed) {
            if (this.caughtFish) {
              let earnedPoints = this.caughtFish.points;
              const currentCaughtFishData = this.caughtFish.fishData;

              if (selectedRod === 'cancauvectorvang.png') {
                earnedPoints *= 2;
              }

              const dbPraises = [
                `Tuyệt vời! Sức mạnh Ki của ngươi khi rỉt sạch máu ${currentCaughtFishData.vnName} đã đạt đến đỉnh cao!`,
                `Goku và Vegeta phải nể phục cú sát thương kéo ${currentCaughtFishData.vnName} thần sầu này đấy!`,
                `Chà, phong cách rỉt dame ${currentCaughtFishData.vnName} này mang ý chí của một Siêu Saiyan thực thụ!`,
                `Thần Beerus gật đầu tán thưởng: Món ${currentCaughtFishData.vnName} này tuyệt hảo, ngươi làm tốt lắm!`
              ];
              const randomPraise = dbPraises[Math.floor(Math.random() * dbPraises.length)];

              if (currentCaughtFishData.isRare) {
                const randChance = Math.random();
                if (randChance < 0.25) { 
                  const currentBaitPrice = this.baitPrice;
                  async function triggerJackpotWin(baitCost: number) {
                    const { data } = await supabase.from('cauca_jackpot').select('*').eq('id', 'global').single();
                    if (data) {
                      let wonAmount = 0;
                      let hũName = "";

                      if (baitCost >= 10 && baitCost <= 1000) {
                        wonAmount = data.minor;
                        hũName = "Cá Trái Đất (Minor)";
                        await supabase.from('cauca_jackpot').update({ minor: 100000 }).eq('id', 'global'); 
                      } else if (baitCost >= 2000 && baitCost <= 100000) {
                        wonAmount = data.major;
                        hũName = "Cá Namek (Major)";
                        await supabase.from('cauca_jackpot').update({ major: 500000 }).eq('id', 'global'); 
                      } else {
                        wonAmount = data.grand;
                        hũName = "Cá Siêu Cấp (Grand)";
                        await supabase.from('cauca_jackpot').update({ grand: 2000000 }).eq('id', 'global'); 
                      }

                      earnedPoints += wonAmount;
                      window.dispatchEvent(new CustomEvent('showPopupBanner', { 
                        detail: { 
                          title: `🎉 NỔ HŨ THÀNH CÔNG HŨ ${hũName}! 🎉`,
                          message: `${randomPraise} \n Nhận thêm +${wonAmount.toLocaleString()} 🪙 từ Hũ Thần!`,
                          type: 'rare' 
                        } 
                      }));
                    }
                  }
                  triggerJackpotWin(currentBaitPrice);
                } else {
                  window.dispatchEvent(new CustomEvent('showPopupBanner', { 
                    detail: { 
                      title: `🏆 RỈT CẠN MÁU ${currentCaughtFishData.vnName.toUpperCase()}!`, 
                      message: randomPraise + `\n Thưởng: +${earnedPoints.toLocaleString()} Điểm!`,
                      type: 'rare' 
                    } 
                  }));
                }
              } else {
                window.dispatchEvent(new CustomEvent('showPopupBanner', {
                  detail: {
                    title: `🎣 CÂU THÀNH CÔNG: ${currentCaughtFishData.vnName.toUpperCase()}`,
                    message: randomPraise + `\n Nhận +${earnedPoints.toLocaleString()} 🪙`,
                    type: 'rare'
                  }
                }));
              }

              const currentActiveScore = (window as any).currentGameScore ?? 1000;
              const finalScore = currentActiveScore + earnedPoints;
              syncScoreToSupabase(finalScore);

              let idx = fishes.indexOf(this.caughtFish);
              if (idx > -1) {
                fishes.splice(idx, 1);
                fishes.push(new Fish());
              }
            }
            this.reset();
          } else {
            this.y += Math.sign(dy) * speed;
            if (this.caughtFish) {
              let mouthOffsetX = this.caughtFish.direction === 1 ? this.caughtFish.size * 0.7 : -this.caughtFish.size * 0.7;
              let mouthOffsetY = -this.caughtFish.size * 0.15;
              this.caughtFish.x = this.x - mouthOffsetX;
              this.caughtFish.y = this.y - mouthOffsetY;
              this.caughtFish.x += (Math.random() - 0.5) * 6; 
            }
          }
        }
      }

      catchFish(fish: Fish) {
        if (bottomTimer) { clearTimeout(bottomTimer); bottomTimer = null; }
        this.caughtFish = fish;
        fish.isCaught = true;
        
        ctx!.fillStyle = 'white';
        for(let i=0; i<10; i++) {
          ctx!.beginPath();
          ctx!.arc(this.x + (Math.random()-0.5)*20, this.y + (Math.random()-0.5)*20, Math.random()*4+2, 0, Math.PI*2);
          ctx!.fill();
        }
        
        const needsStruggle = fish.points >= 5000000;

        if (needsStruggle) {
          this.state = 'STRUGGLING';
          this.maxFishHp = fish.maxHp;
          this.currentFishHp = fish.maxHp;
          if (statusEl) {
            statusEl.innerText = `Dính ${fish.fishData.vnName} khủng (${fish.points.toLocaleString()}🪙)! NHẤP LIÊN TỤC BẰNG CẢM GIÁC ĐỂ GÂY SÁT THƯƠNG!`;
            statusEl.style.color = "#FF5252";
          }
        } else {
          this.state = 'REELING_HORIZ';
          if (statusEl) {
            statusEl.innerText = `Dính ${fish.fishData.vnName}! Kéo lên xuồng...`;
            statusEl.style.color = "#FFEB3B";
          }
        }
      }

      draw() {
        let drawX = this.x;
        let drawY = this.y;
        
        if (this.state === 'STRUGGLING') {
          drawX += (Math.random() - 0.5) * 14;
          drawY += (Math.random() - 0.5) * 14;
        }

        let rodBaseX = boatX + 2;
        let rodBaseY = waterY - 32;
        let tipDist = 120;
        let angle = -0.42;
        let rodTipX = rodBaseX + Math.cos(angle) * tipDist;
        let rodTipY = rodBaseY + Math.sin(angle) * tipDist;

        ctx!.beginPath();
        ctx!.moveTo(rodTipX, rodTipY);
        if (this.state === 'IDLE' || this.state === 'CHARGING') {
          ctx!.lineTo(rodTipX, rodTipY + 20);
          ctx!.strokeStyle = 'rgba(255,255,255,0.95)';
          ctx!.lineWidth = 1.5;
          ctx!.stroke();
          this.drawHookAndBait(rodTipX, rodTipY + 20);
        } else {
          let controlX = (rodTipX + drawX) / 2;
          let controlY = Math.min(rodTipY, drawY) - 30;
          ctx!.quadraticCurveTo(controlX, controlY, drawX, drawY);
          ctx!.strokeStyle = 'rgba(255,255,255,0.95)';
          ctx!.lineWidth = 1.5;
          ctx!.stroke();
          this.drawHookAndBait(drawX, drawY);
        }
      }

      drawHookAndBait(hx: number, hy: number) {
        if (typeof activeBaitImg !== 'undefined' && activeBaitImg.complete && activeBaitImg.naturalWidth !== 0) {
          ctx!.imageSmoothingEnabled = false; 
          const bSize = 28; 
          ctx!.drawImage(activeBaitImg, hx - bSize / 2, hy - bSize / 2, bSize, bSize);
        } else {
          ctx!.fillStyle = '#FF9800'; 
          ctx!.beginPath(); 
          ctx!.arc(hx, hy, 6, 0, Math.PI * 2); 
          ctx!.fill();
        }

        ctx!.strokeStyle = '#B0BEC5';
        ctx!.lineWidth = 2.5;
        ctx!.beginPath();
        ctx!.arc(hx, hy + 8, 5, 0, Math.PI, false); 
        ctx!.moveTo(hx + 5, hy + 8);
        ctx!.lineTo(hx + 5, hy + 2);
        ctx!.stroke();

        ctx!.fillStyle = '#FFFFFF';
        ctx!.beginPath(); 
        ctx!.arc(hx - 2, hy + 6, 1.5, 0, Math.PI * 2); 
        ctx!.fill();
      }
    }

    const fishes: Fish[] = [];
    const computedWaterY = canvas.height / (window.devicePixelRatio || 1) * 0.3;
    const waterHeight = (canvas.height / (window.devicePixelRatio || 1)) - computedWaterY;

    // Phân bổ số lượng cá theo tầng: Cá nhỏ nhiều nhất, cá trung ít hơn, cá lớn ít nhất
    const topSlots = 12;
    for (let i = 0; i < topSlots; i++) {
      let clusterY = computedWaterY + 20 + (waterHeight * 0.28 / topSlots) * i;
      let clusterSize = Math.floor(Math.random() * 3) + 2; 
      let sharedDir = Math.random() > 0.5 ? 1 : -1;
      for (let j = 0; j < clusterSize; j++) {
        let f = new Fish("top", clusterY + (Math.random() - 0.5) * 15, sharedDir);
        f.x = sharedDir === 1 ? (-Math.random() * 500 - j * 60) : (width + Math.random() * 500 + j * 60);
        fishes.push(f);
      }
    }

    const midSlots = 7;
    for (let i = 0; i < midSlots; i++) {
      let slotY = computedWaterY + (waterHeight * 0.32) + (waterHeight * 0.32 / midSlots) * i;
      let f = new Fish("mid", slotY);
      fishes.push(f);
    }

    const bottomSlots = 4;
    for (let i = 0; i < bottomSlots; i++) {
      let slotY = computedWaterY + (waterHeight * 0.68) + (waterHeight * 0.28 / bottomSlots) * i;
      let f = new Fish("bottom", slotY);
      fishes.push(f);
    }

    const hook = new Hook();

    let activeBaitCost = selectedBait.cost;
    const updateBaitCostListener = (e: any) => { activeBaitCost = e.detail; };
    window.addEventListener('changeBait', updateBaitCostListener);

    let isHolding = false;
    let holdClientX = canvas.width / 2;

    const handleDown = (clientX: number) => {
      if (hook.state === 'STRUGGLING') {
        hook.tapStruggle();
      } else if (hook.state === 'IDLE') {
        isHolding = true;
        holdClientX = clientX;
        hook.startCharging(activeBaitCost);
      }
    };

    const handleMove = (clientX: number) => {
      if (isHolding && hook.state === 'CHARGING') {
        holdClientX = clientX;
      }
    };

    const handleUp = () => {
      if (isHolding && hook.state === 'CHARGING') {
        isHolding = false;
        if (powerContainer) powerContainer.style.display = 'none';
        hook.releaseCharging(holdClientX);
      }
    };

    const onMouseDown = (e: MouseEvent) => handleDown(e.clientX);
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleUp();

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleDown(e.touches[0].clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleUp();
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    canvas.addEventListener('touchstart', onTouchStart, {passive: false});
    canvas.addEventListener('touchmove', onTouchMove, {passive: false});
    window.addEventListener('touchend', onTouchEnd);

    const placedDecorations: { 
      imgObj: typeof loadedDecorImages[0]; 
      x: number; 
      y: number; 
      width: number; 
      height: number; 
      isWeed: boolean;
      swayOffset: number;
    }[] = [];

    const bubbles: { x: number; y: number; radius: number; speed: number; alpha: number }[] = [];

    function initDecorationsMap() {
      placedDecorations.length = 0;
      bubbles.length = 0;
      if (loadedDecorImages.length === 0) return;

      let clusterCenters = [80, 180, 320, width - 380, width - 220, width - 90, width / 2 - 100, width / 2 + 120];

      for (let cx of clusterCenters) {
        let countInCluster = Math.floor(Math.random() * 2) + 1; 
        for (let i = 0; i < countInCluster; i++) {
          const randomDecor = loadedDecorImages[Math.floor(Math.random() * loadedDecorImages.length)];
          let isWeed = randomDecor.filename.includes('rongbien') || randomDecor.filename.includes('taobien');
          
          let w = 55 + Math.random() * 55;
          let h = 50 + Math.random() * 50;
          if (randomDecor.filename.includes('sanho')) { w = 85; h = 70; }
          if (randomDecor.filename.includes('dabien')) { w = 80; h = 60; }

          let offsetX = cx + (Math.random() - 0.5) * 70;
          let itemY = height - h - (Math.random() * 15);

          placedDecorations.push({
            imgObj: randomDecor,
            x: offsetX,
            y: itemY,
            width: w,
            height: h,
            isWeed: isWeed,
            swayOffset: Math.random() * Math.PI * 2
          });

          if (randomDecor.filename.includes('dabien')) {
            for (let b = 0; b < 4; b++) {
              bubbles.push({
                x: offsetX + w * 0.5 + (Math.random() - 0.5) * 30,
                y: itemY + Math.random() * 20,
                radius: Math.random() * 3 + 1.5,
                speed: Math.random() * 0.6 + 0.3,
                alpha: Math.random() * 0.6 + 0.3
              });
            }
          }
        }
      }
    }
    initDecorationsMap();

    function drawSeaBedDecorations() {
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

      ctx!.fillStyle = 'rgba(255, 255, 255, 0.65)';
      for (let b of bubbles) {
        b.y -= b.speed;
        b.x += Math.sin(now * 0.003 + b.y) * 0.4; 

        if (b.y < waterY + 40) {
          b.y = height - 30; 
        }

        ctx!.beginPath();
        ctx!.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255, 255, 255, ${b.alpha})`;
        ctx!.fill();
      }
    }

    function drawBackground() {
      ctx!.fillStyle = '#87CEEB';
      ctx!.fillRect(0, 0, width, waterY);
      
      ctx!.fillStyle = '#FFEB3B';
      ctx!.beginPath(); ctx!.arc(width*0.8, height*0.1, 40, 0, Math.PI*2); ctx!.fill();

      let grad = ctx!.createLinearGradient(0, waterY, 0, height);
      grad.addColorStop(0, '#0288D1'); 
      grad.addColorStop(1, '#000A1F'); 
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, waterY, width, height - waterY);
      
      drawSeaBedDecorations();

      ctx!.fillStyle = 'rgba(255,255,255,0.25)';
      ctx!.fillRect(0, waterY, width, 4);

      if (boatSpeed !== 0 && hook.state === 'IDLE') {
        boatX += boatSpeed;
        if (boatX < 50) boatX = 50;
        if (boatX > width - 120) boatX = width - 120;
      }

      ctx!.fillStyle = '#8D6E63';
      ctx!.beginPath();
      ctx!.moveTo(boatX - 50, waterY);
      ctx!.lineTo(boatX + 60, waterY);
      ctx!.lineTo(boatX + 45, waterY + 16);
      ctx!.lineTo(boatX - 35, waterY + 16);
      ctx!.closePath();
      ctx!.fill();
      ctx!.strokeStyle = '#3E2723';
      ctx!.lineWidth = 2;
      ctx!.stroke();

      const charX = boatX;
      const charY = waterY - 15;
      ctx!.fillStyle = '#212121';
      ctx!.fillRect(charX - 12, charY - 32, 24, 35);

      const avatarImg = new Image();
      avatarImg.src = userAvatar;
      if (avatarImg.complete && avatarImg.naturalWidth !== 0) {
        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(charX, charY - 14, 15, 0, Math.PI * 2);
        ctx!.closePath();
        ctx!.clip();
        ctx!.drawImage(avatarImg, charX - 15, charY - 29, 30, 30);
        ctx!.restore();
        ctx!.strokeStyle = '#FFD700';
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.arc(charX, charY - 14, 15, 0, Math.PI * 2);
        ctx!.stroke();
      } else {
        ctx!.fillStyle = '#FFD700';
        ctx!.beginPath(); ctx!.arc(charX, charY - 14, 13, 0, Math.PI * 2); ctx!.fill();
      }

      const rodBaseX = charX + 2;
      const rodBaseY = charY - 12;

      ctx!.save();
      ctx!.translate(rodBaseX, rodBaseY);
      let rodAngle = hook.state === 'CHARGING' ? -0.5 : -0.42;
      ctx!.rotate(rodAngle);
      
      if (rodImg && rodImg.complete && rodImg.naturalWidth !== 0) {
        ctx!.drawImage(rodImg, 0, -14, 135, 45);
      } else {
        ctx!.strokeStyle = '#8B4513';
        ctx!.lineWidth = 5;
        ctx!.lineCap = 'round';
        ctx!.beginPath();
        ctx!.moveTo(0, 0);
        ctx!.lineTo(110, -35);
        ctx!.stroke();

        ctx!.strokeStyle = '#FFD700';
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.moveTo(80, -23);
        ctx!.lineTo(90, -28);
        ctx!.stroke();
      }
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
        ctx!.fillStyle = '#FFD700';
        ctx!.strokeStyle = '#000000';
        ctx!.lineWidth = 3;
        ctx!.strokeText("⚡ CRIT!", p.x, p.y);
        ctx!.fillText("⚡ CRIT!", p.x, p.y);
        ctx!.restore();
      }
    }

    let animationFrameId: number;
    function gameLoop() {
      ctx!.clearRect(0, 0, width, height);
      drawBackground();
      
      for (let f of fishes) {
        f.update();
        f.draw();
      }
      
      hook.update();
      hook.draw();

      animationFrameId = requestAnimationFrame(gameLoop);
    }

    gameLoop();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('changeBait', updateBaitCostListener);
      window.removeEventListener('changeBaitImg', updateBaitListener);
      window.removeEventListener('changeRod', updateRodListener);
      window.removeEventListener('moveBoat', moveBoatListener);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMounted, userAvatar, selectedRod]);

  useEffect(() => {
    const handlePopupBanner = (e: any) => {
      setPopupData({ 
        show: true, 
        title: e.detail.title, 
        message: e.detail.message,
        type: e.detail.type
      });
      setTimeout(() => setPopupData(null), 4500);
    };
    window.addEventListener('showPopupBanner', handlePopupBanner);

    return () => {
      window.removeEventListener('showPopupBanner', handlePopupBanner);
    };
  }, []);

  const handleBaitChange = (bait: { cost: number; filename: string; name: string }) => {
    setSelectedBait(bait);
    setIsBaitDropdownOpen(false);
    window.dispatchEvent(new CustomEvent('changeBait', { detail: bait.cost }));
    window.dispatchEvent(new CustomEvent('changeBaitImg', { detail: bait }));
  };

  const handleBoatMove = (speed: number) => {
    window.dispatchEvent(new CustomEvent('moveBoat', { detail: speed }));
  };

  const baitList = [
    { cost: 1000, filename: "dausenzu.png", label: "Mồi Sơ Cấp (1,000🪙)" },
    { cost: 2000, filename: "cagia.png", label: "Mồi Thường (2,000🪙)" },
    { cost: 100000, filename: "giun.png", label: "Mồi Tiêu Chuẩn (100,000🪙)" },
    { cost: 500000, filename: "moi.png", label: "Mồi Khá (500,000🪙)" },
    { cost: 1000000, filename: "tom.png", label: "Mồi Thơm (1,000,000🪙)" },
    { cost: 10000000, filename: "dragon-ball-4.png", label: "Mồi Xịn (10,000,000🪙)" },
    { cost: 50000000, filename: "kiblue.png", label: "Mồi Cao Cấp (50,000,000🪙)" },
    { cost: 100000000, filename: "hakai.png", label: "Mồi Quái Vật (100,000,000🪙)" }
  ];

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 select-none font-sans" style={{ touchAction: 'manipulation' }}>
      
      <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-auto z-40">
        <div className="flex items-center space-x-1.5">
          <Link href="/" className="bg-slate-900/90 text-amber-400 hover:underline px-2.5 py-1.5 rounded-lg text-[9px] font-black border border-amber-500/40 shadow">
            ← Cổng Game
          </Link>
          <div className="bg-black/80 text-white px-2.5 py-1.5 rounded-lg font-bold text-[9px] border border-amber-500/40 shadow flex items-center gap-1.5">
            <img src={userAvatar} alt="Avatar" className="w-4 h-4 rounded-full border border-amber-400 object-cover" />
            <span><span id="score" className="text-[#FFEB3B] font-black">{isMounted ? score.toLocaleString() : "..."}</span> 🪙</span>
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
              if(!document.fullscreenElement) { 
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

      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-slate-950/90 border border-amber-500/60 px-3 py-1 rounded-xl shadow-2xl flex items-center space-x-3 pointer-events-none">
        <div className="text-center">
          <span className="text-[7px] font-bold text-slate-300 block">CÁ TRÁI ĐẤT</span>
          <span className="text-[10px] sm:text-xs font-black text-amber-300">{isMounted ? jackpot.minor.toLocaleString('en-US') : "..."} 🪙</span>
        </div>
        <div className="h-5 w-[1px] bg-amber-500/30"></div>
        <div className="text-center">
          <span className="text-[7px] font-bold text-red-400 block">CÁ SIÊU CẤP</span>
          <span className="text-[10px] sm:text-xs font-black text-red-500 animate-pulse">{isMounted ? jackpot.grand.toLocaleString('en-US') : "..."} 🪙</span>
        </div>
        <div className="h-5 w-[1px] bg-amber-500/30"></div>
        <div className="text-center">
          <span className="text-[7px] font-bold text-blue-400 block">CÁ NAMEK</span>
          <span className="text-[10px] sm:text-xs font-black text-cyan-400">{isMounted ? jackpot.major.toLocaleString('en-US') : "..."} 🪙</span>
        </div>
      </div>

      {/* THANH CHỌN MỒI DROPDOWN GỌN GÀNG GÓC PHẢI */}
      <div className="absolute top-12 right-2 z-40">
        <div className="relative">
          <button
            onClick={() => setIsBaitDropdownOpen(!isBaitDropdownOpen)}
            className="bg-slate-900/95 hover:bg-slate-800 border border-amber-500/60 px-2.5 py-1.5 rounded-xl shadow-xl flex items-center space-x-1.5 text-amber-300 text-[9px] font-black cursor-pointer transition"
          >
            <span>🪱</span>
            <img src={`/assets/baits/${selectedBait.filename}`} alt="Bait" className="w-3.5 h-3.5 object-contain" />
            <span className="truncate max-w-[110px]">{selectedBait.name}</span>
            <span className="text-[8px] ml-0.5">{isBaitDropdownOpen ? "▲" : "▼"}</span>
          </button>

          {isBaitDropdownOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-slate-950/95 border-2 border-amber-500/70 rounded-xl shadow-2xl overflow-hidden z-50 p-1 space-y-1 backdrop-blur-md">
              <div className="px-2 py-1 text-[8px] font-black text-amber-400 uppercase border-b border-slate-800">
                Danh Sách Mồi Câu
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
                {baitList.map((bait) => (
                  <button
                    key={bait.cost}
                    onClick={() => handleBaitChange({ cost: bait.cost, filename: bait.filename, name: bait.label })}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-black transition cursor-pointer flex items-center gap-2 ${
                      selectedBait.cost === bait.cost
                        ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow"
                        : "bg-slate-900/80 text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <img src={`/assets/baits/${bait.filename}`} alt={bait.label} className="w-4 h-4 object-contain shrink-0" />
                    <span className="truncate">{bait.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isShopOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-950 border-2 border-amber-500/60 w-full max-w-4xl max-h-[85vh] rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col relative overflow-hidden">
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base sm:text-xl font-black text-amber-400 uppercase tracking-wider">
                  🛍️ Cửa Hàng & Kho Cần Câu
                </h2>
                <p className="text-slate-400 text-[10px]">Thuê theo mốc ngày hoặc trang bị trực tiếp để câu cá!</p>
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
                    const daysLeft = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hoursLeft = Math.floor((diff / (1000 * 60 * 60)) % 24);
                    timeLeftStr = `Còn hạn: ${daysLeft}d ${hoursLeft}h`;
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
                              3N <br/>{rod.price3Days.toLocaleString()}🪙
                            </button>
                            <button
                              onClick={() => handleRentRod(rod, 5)}
                              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 py-1 rounded text-[8px] font-black cursor-pointer"
                            >
                              5N <br/>{rod.price5Days.toLocaleString()}🪙
                            </button>
                            <button
                              onClick={() => handleRentRod(rod, 7)}
                              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 py-1 rounded text-[8px] font-black cursor-pointer"
                            >
                              7N <br/>{rod.price7Days.toLocaleString()}🪙
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
                Xác Nhận & Quay Lại Câu Cá
              </button>
            </div>

          </div>
        </div>
      )}

      {popupData && popupData.show && (
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none animate-bounce text-center bg-slate-950/95 border-4 px-5 py-3 rounded-2xl shadow-2xl space-y-1 max-w-sm ${
          popupData.type === 'beerus' ? 'border-rose-500 shadow-[0_0_40px_rgba(244,67,54,0.6)]' : 'border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.6)]'
        }`}>
          <p className={`font-black text-[10px] sm:text-xs tracking-widest uppercase ${popupData.type === 'beerus' ? 'text-rose-400' : 'text-amber-300'}`}>
            {popupData.title}
          </p>
          <p className="text-white font-black text-xs sm:text-sm leading-snug whitespace-pre-line drop-shadow-[2px_2px_0_#000]">
            {popupData.message}
          </p>
        </div>
      )}

      {/* NÚT CHÈO THUYỀN TỐI ƯU CẢ MOUSE VÀ TOUCH */}
      <div className="absolute bottom-3 left-3 z-30 flex items-center space-x-2 bg-black/70 p-2 rounded-xl border border-amber-500/50 shadow-2xl backdrop-blur-md pointer-events-auto">
        <button
          onMouseDown={(e) => { e.stopPropagation(); handleBoatMove(-4); }}
          onMouseUp={(e) => { e.stopPropagation(); handleBoatMove(0); }}
          onMouseLeave={(e) => { e.stopPropagation(); handleBoatMove(0); }}
          onTouchStart={(e) => { e.stopPropagation(); handleBoatMove(-4); }}
          onTouchEnd={(e) => { e.stopPropagation(); handleBoatMove(0); }}
          className="w-10 h-10 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-base rounded-lg active:scale-95 transition shadow-lg cursor-pointer flex items-center justify-center select-none"
        >
          ◀
        </button>
        <span className="text-[10px] font-black text-amber-300 uppercase px-1">Chèo</span>
        <button
          onMouseDown={(e) => { e.stopPropagation(); handleBoatMove(4); }}
          onMouseUp={(e) => { e.stopPropagation(); handleBoatMove(0); }}
          onMouseLeave={(e) => { e.stopPropagation(); handleBoatMove(0); }}
          onTouchStart={(e) => { e.stopPropagation(); handleBoatMove(4); }}
          onTouchEnd={(e) => { e.stopPropagation(); handleBoatMove(0); }}
          className="w-10 h-10 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-base rounded-lg active:scale-95 transition shadow-lg cursor-pointer flex items-center justify-center select-none"
        >
          ▶
        </button>
      </div>

      <div id="power-container" className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[200px] h-[20px] bg-black/70 rounded-xl border-2 border-white hidden pointer-events-none overflow-hidden shadow-lg z-10">
        <div id="power-bar" className="w-[0%] h-full bg-gradient-to-r from-[#4CAF50] via-[#FFEB3B] to-[#F44336] transition-all duration-75"></div>
      </div>

      <canvas id="gameCanvas" className="absolute inset-0 block w-full h-full"></canvas>
    </div>
  );
}