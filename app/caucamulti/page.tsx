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

  // --- MULTIPLAYER ROOM STATES (Hỗ trợ tối đa 10 người) ---
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [currentSlot, setCurrentSlot] = useState<string | null>(null);
  const [roomPlayerCount, setRoomPlayerCount] = useState<number>(1);
  const roomChannelRef = useRef<any>(null);
  const [oppAlert, setOppAlert] = useState<string | null>(null);

  // --- HỆ THỐNG KHO SKILL & COOLDOWN (5 Phút) ---
  const [inventory, setInventory] = useState<{ [key: string]: number }>({});
  const [skillCooldowns, setSkillCooldowns] = useState<{ [key: string]: number }>({});
  const [isSkillShopOpen, setIsSkillShopOpen] = useState<boolean>(false);

  // Danh sách 6 Skill Câu Cá Dragon Ball
  const fishingSkills = [
    { id: "fish_sk1", name: "Chân Không Trấn Hải", icon: "🌀", desc: "Cần câu đứng yên 1 chỗ trong 5s khi thả dây rồi mới tuột lên.", price: 200000 },
    { id: "fish_sk2", name: "Bản Năng Vô Cực", icon: "⚡", desc: "Đóng băng thời gian và đứng yên cá lớn/trung bình để giật.", price: 350000 },
    { id: "fish_sk3", name: "Giáp Sắt Kachi Katchin", icon: "🛡️", desc: "Tăng 30% khả năng chống đứt dây khi ghì cá lớn.", price: 150000 },
    { id: "fish_sk4", name: "Thời Gian Ngoại Lệ", icon: "⏳", desc: "Làm chậm toàn bộ cá dưới nước 30% trong vòng 5 giây.", price: 250000 },
    { id: "fish_sk5", name: "Hào Quang Biến Mất", icon: "👻", desc: "Cá nhỏ phớt lờ bạn trong lượt kế, cá lớn cắn câu sẽ dẫy mạnh hơn.", price: 300000 },
    { id: "fish_sk6", name: "Nhãn Quan Thần Linh", icon: "🔮", desc: "Soi chính xác giá trị tiền thưởng của 1 con cá lớn ngẫu nhiên trong hồ.", price: 400000 },
  ];

  // --- HỆ THỐNG THÔNG BÁO ---
  const [myCatchNotice, setMyCatchNotice] = useState<{ text: string; amount: string; show: boolean } | null>(null);
  const [oppCatchNotice, setOppCatchNotice] = useState<{ text: string; amount: string; show: boolean } | null>(null);

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
        .select("balance, avatar_url, equipped_rod, inventory")
        .eq("id", currentUser.id)
        .single();

      if (data) {
        if (data.balance !== undefined) {
          setScore(data.balance);
          (window as any).currentGameScore = data.balance;
        }
        if (data.avatar_url) setUserAvatar(data.avatar_url);
        if (data.equipped_rod) setSelectedRod(data.equipped_rod);
        if (data.inventory) setInventory(data.inventory);
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

  // Mua Skill từ Shop Popup trong game
  const handleBuySkillInGame = async (skill: any) => {
    if (!user) { alert("Vui lòng đăng nhập!"); return; }
    if (score < skill.price) {
      alert("⚡ Số dư Ki không đủ để lĩnh ngộ kỹ năng này!");
      return;
    }

    const newBal = score - skill.price;
    const currentCount = inventory[skill.id] || 0;
    const updatedInventory = { ...inventory, [skill.id]: currentCount + 1 };

    setScore(newBal);
    setInventory(updatedInventory);
    (window as any).currentGameScore = newBal;

    await supabase.from("profiles").update({ balance: newBal, inventory: updatedInventory }).eq("id", user.id);
    alert(`🎉 Lĩnh ngộ thành công kỹ năng [${skill.name}]!`);
  };

  // Sử dụng Skill trong Game (Cooldown 5 phút = 300,000ms)
  const handleUseSkill = (skillId: string) => {
    const now = Date.now();
    const coolEnd = skillCooldowns[skillId] || 0;
    if (now < coolEnd) {
      const remainSec = Math.ceil((coolEnd - now) / 1000);
      alert(`⏳ Kỹ năng đang hồi chiêu! Vui lòng chờ thêm ${remainSec}s.`);
      return;
    }

    const count = inventory[skillId] || 0;
    if (count <= 0) {
      alert("⚡ Ní đã hết lượt sử dụng kỹ năng này! Hãy ghé Thần Điện mua thêm nhé.");
      setIsSkillShopOpen(true);
      return;
    }

    const updatedInv = { ...inventory, [skillId]: count - 1 };
    setInventory(updatedInv);
    if (user) {
      supabase.from("profiles").update({ inventory: updatedInv }).eq("id", user.id);
    }

    setSkillCooldowns({ ...skillCooldowns, [skillId]: now + 300000 });
    window.dispatchEvent(new CustomEvent("triggerFishingSkill", { detail: { skillId } }));
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
    setRoomPlayerCount(1);
    (window as any).roomPlayerCount = 1;
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

    let slotToTake: string | null = null;
    for (let i = 1; i <= 10; i++) {
      const slotKey = `player_${i}`;
      if (targetRoom[slotKey] === user.id) {
        slotToTake = slotKey;
        break;
      }
    }
    if (!slotToTake) {
      for (let i = 1; i <= 10; i++) {
        const slotKey = `player_${i}`;
        if (!targetRoom[slotKey]) {
          slotToTake = slotKey;
          break;
        }
      }
    }

    if (!slotToTake) {
      alert("Phòng này đã đầy (10/10)!");
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
      const count = Math.max(1, Object.keys(state).length);
      setRoomPlayerCount(count);
      (window as any).roomPlayerCount = count;
      if (count > 1) {
        setOppAlert(`🤝 Có ${count} người chơi trong phòng! Lực kéo & chống hụt tăng +${(count - 1) * 2}% mỗi người!`);
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
        setOppCatchNotice({
          text: payload.payload.fishName,
          amount: `+${payload.payload.points.toLocaleString()}🪙`,
          show: true,
        });
        setTimeout(() => setOppCatchNotice(null), 3500);
      }
    });

    channel.on("broadcast", { event: "rare_fish_spawn" }, (payload) => {
      window.dispatchEvent(
        new CustomEvent("showPopupBanner", {
          detail: {
            title: "🔥 QUÁI VẬT KHỔNG LỒ XUẤT HIỆN! 🔥",
            message: `${payload.payload.fishName} bơi từ ngoài vào đáy biển trị giá ${payload.payload.points.toLocaleString()} 🪙!`,
            type: "rare",
          },
        })
      );
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
      // --- TẦNG TRÊN (Cá nhỏ) ---
      { filename: "Amphiprion_ocellaris.png", vnName: "Cá hề Nemo", sizeScale: 0.65, basePoints: 600, multi: 1.2, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Abudefduf_saxatilis.png", vnName: "Cá thia vằn sọc", sizeScale: 0.7, basePoints: 960, multi: 1.3, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Chromis_chromis.png", vnName: "Cá thia xanh", sizeScale: 0.6, basePoints: 720, multi: 1.2, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Carassius_auratus.png", vnName: "Cá vàng cảnh", sizeScale: 0.7, basePoints: 1200, multi: 1.5, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Campostoma_anomalum.png", vnName: "Cá tuế suối", sizeScale: 0.65, basePoints: 900, multi: 1.3, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Abudefduf_sordidus.png", vnName: "Cá thia xám", sizeScale: 0.8, basePoints: 1440, multi: 1.5, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Abramis_brama.png", vnName: "Cá vền nước ngọt", sizeScale: 0.85, basePoints: 2400, multi: 1.8, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Abudefduf_sexfasciatus.png", vnName: "Cá thia sáu sọc", sizeScale: 0.7, basePoints: 1800, multi: 1.6, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Chaetodon_aurantus.png", vnName: "Cá bướm vàng cam", sizeScale: 0.8, basePoints: 3600, multi: 2.0, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Chaetodon_lunula.png", vnName: "Cá bướm mặt trăng", sizeScale: 0.85, basePoints: 6000, multi: 2.2, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Chromis_viridis.png", vnName: "Cá thia lục bảo", sizeScale: 0.6, basePoints: 4800, multi: 2.0, layer: "top", struggleWeight: 0, isRare: false },

      // --- TẦNG GIỮA (Cá trung bình) ---
      { filename: "Acanthurus_coerulus.png", vnName: "Cá đuôi gai xanh", sizeScale: 1.1, basePoints: 60000, multi: 2.5, layer: "mid", struggleWeight: 0.25, isRare: false },
      { filename: "Oreochromis_niloticus.png", vnName: "Cá rô phi vằn", sizeScale: 1.25, basePoints: 96000, multi: 2.8, layer: "mid", struggleWeight: 0.3, isRare: false },
      { filename: "Micropterus_salmoides.png", vnName: "Cá vược miệng rộng", sizeScale: 1.3, basePoints: 180000, multi: 3.0, layer: "mid", struggleWeight: 0.35, isRare: false },
      { filename: "Lates_calcarifer.png", vnName: "Cá chẽm lớn", sizeScale: 1.6, basePoints: 360000, multi: 3.5, layer: "mid", struggleWeight: 0.4, isRare: false },
      { filename: "Perca_flavescens.png", vnName: "Cá vược vàng", sizeScale: 1.1, basePoints: 240000, multi: 3.2, layer: "mid", struggleWeight: 0.35, isRare: false },
      { filename: "Cyprinus_carpio.png", vnName: "Cá chép vàng", sizeScale: 1.5, basePoints: 600000, multi: 4.0, layer: "mid", struggleWeight: 0.45, isRare: false },
      { filename: "Carophi.png", vnName: "Cá rô phi", sizeScale: 1.15, basePoints: 144000, multi: 2.9, layer: "mid", struggleWeight: 0.3, isRare: false },
      { filename: "Canham.png", vnName: "Cá nhám", sizeScale: 1.4, basePoints: 960000, multi: 4.5, layer: "mid", struggleWeight: 0.5, isRare: false },
      { filename: "Arothron_meleagris.png", vnName: "Cá nóc đốm sao", sizeScale: 1.25, basePoints: 1200000, multi: 5.0, layer: "mid", struggleWeight: 0.5, isRare: false },
      { filename: "Caranx_ignobilis.png", vnName: "Cá khế khổng lồ", sizeScale: 1.8, basePoints: 3600000, multi: 6.0, layer: "mid", struggleWeight: 0.55, isRare: false },
      { filename: "Coryphaena_hippurus.png", vnName: "Cá cờ xanh Mahi-Mahi", sizeScale: 1.9, basePoints: 7200000, multi: 7.0, layer: "mid", struggleWeight: 0.6, isRare: false },
      { filename: "Epinephelus_marginatus.png", vnName: "Cá mú đen đại dương", sizeScale: 1.7, basePoints: 10800000, multi: 8.0, layer: "mid", struggleWeight: 0.65, isRare: false },

      // --- TẦNG ĐÁY / SÂU (Cá lớn & Quái vật) ---
      { filename: "Aetobatus_ocellatus.png", vnName: "Cá đuối đốm đại dương", sizeScale: 2.6, basePoints: 18000000, multi: 10.0, layer: "bottom", struggleWeight: 0.75, isRare: true, maxHp: 15 },
      { filename: "Carcharhinus_melanopterus.png", vnName: "Cá mập vây đen", sizeScale: 2.8, basePoints: 42000000, multi: 12.0, layer: "bottom", struggleWeight: 0.8, isRare: true, maxHp: 22 },
      { filename: "Carcharias_taurus.png", vnName: "Cá mập cát khổng lồ", sizeScale: 3.2, basePoints: 96000000, multi: 15.0, layer: "bottom", struggleWeight: 0.85, isRare: true, maxHp: 30 },
      { filename: "Mola_mola.png", vnName: "Cá mặt trăng khổng lồ", sizeScale: 3.4, basePoints: 180000000, multi: 20.0, layer: "bottom", struggleWeight: 0.88, isRare: true, maxHp: 38 },
      { filename: "Sphyrna_zygaena.png", vnName: "Cá mập đầu búa", sizeScale: 3.0, basePoints: 300000000, multi: 25.0, layer: "bottom", struggleWeight: 0.9, isRare: true, maxHp: 45 },
      { filename: "Xiphias_gladius.png", vnName: "Cá kiếm đại dương", sizeScale: 3.4, basePoints: 540000000, multi: 30.0, layer: "bottom", struggleWeight: 0.93, isRare: true, maxHp: 52 },
      { filename: "Mobula_alfredi.png", vnName: "Cá đuối manta khổng lồ", sizeScale: 3.6, basePoints: 900000000, multi: 40.0, layer: "bottom", struggleWeight: 0.95, isRare: true, maxHp: 60 },
      { filename: "Gymnothorax_javanicus.png", vnName: "Cá trình khổng lồ Java", sizeScale: 3.3, basePoints: 1200000000, multi: 50.0, layer: "bottom", struggleWeight: 0.96, isRare: true, maxHp: 70 }
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
    let waterY: number = height * 0.22;
    
    const slotIndex = currentSlot ? parseInt(currentSlot.replace("player_", "")) - 1 : 0;
    const totalSlots = 10;
    let boatX: number = width * (0.1 + (slotIndex / (totalSlots - 1)) * 0.8);
    let boatSpeed: number = 0;
    let boatFacing: number = 1;
    let bottomTimer: NodeJS.Timeout | null = null;

    let oppStates: { [userId: string]: any } = {};
    const critPopups: { x: number; y: number; alpha: number; scale: number }[] = [];

    // --- TRẠNG THÁI ACTIVE SKILLS TRONG GAME ---
    let activeSkillState = {
      sk1_freezeStand: false,
      sk1_timer: null as any,
      sk2_timeFreeze: false,
      sk3_armorBuff: false,
      sk4_slowDown: false,
      sk5_ignoreSmall: false,
      sk6_active: false,
    };

    const fishingSkillListener = (e: any) => {
      const { skillId } = e.detail;
      if (skillId === "fish_sk1") {
        activeSkillState.sk1_freezeStand = true;
        window.dispatchEvent(new CustomEvent("showPopupBanner", { detail: { title: "🌀 CHÂN KHÔNG TRẤN HẢI", message: "Cần câu sẽ đứng yên 5 giây!", type: "coop" } }));
        if (activeSkillState.sk1_timer) clearTimeout(activeSkillState.sk1_timer);
        activeSkillState.sk1_timer = setTimeout(() => {
          activeSkillState.sk1_freezeStand = false;
        }, 5000);
      } else if (skillId === "fish_sk2") {
        activeSkillState.sk2_timeFreeze = true;
        window.dispatchEvent(new CustomEvent("showPopupBanner", { detail: { title: "⚡ BẢN NĂNG VÔ CỰC", message: "Đã kích hoạt đóng băng cá lớn/trung bình trong lượt tới!", type: "rare" } }));
      } else if (skillId === "fish_sk3") {
        activeSkillState.sk3_armorBuff = true;
        window.dispatchEvent(new CustomEvent("showPopupBanner", { detail: { title: "🛡️ GIÁP SẮT KACHI KATCHIN", message: "Tăng 30% kháng đứt dây khi kéo cá lớn!", type: "coop" } }));
      } else if (skillId === "fish_sk4") {
        activeSkillState.sk4_slowDown = true;
        window.dispatchEvent(new CustomEvent("showPopupBanner", { detail: { title: "⏳ THỜI GIAN NGOẠI LỆ", message: "Toàn bộ cá dưới nước bị làm chậm 30% trong 5 giây!", type: "beerus" } }));
        setTimeout(() => { activeSkillState.sk4_slowDown = false; }, 5000);
      } else if (skillId === "fish_sk5") {
        activeSkillState.sk5_ignoreSmall = true;
        window.dispatchEvent(new CustomEvent("showPopupBanner", { detail: { title: "👻 HÀO QUANG BIẾN MẤT", message: "Cá nhỏ sẽ phớt lờ mồi câu trong lần thả tới!", type: "coop" } }));
      } else if (skillId === "fish_sk6") {
        const bottomFishes = fishes.filter(f => f.layer === "bottom" && !f.isCaught);
        if (bottomFishes.length > 0) {
          const randFish = bottomFishes[Math.floor(Math.random() * bottomFishes.length)];
          window.dispatchEvent(new CustomEvent("showPopupBanner", { detail: { title: "🔮 SOI THẤU TƯƠNG LAI", message: `Phát hiện ${randFish.fishData.vnName} trị giá ${randFish.points.toLocaleString()} 🪙!`, type: "rare" } }));
        } else {
          window.dispatchEvent(new CustomEvent("showPopupBanner", { detail: { title: "🔮 SOI THẤU TƯƠNG LAI", message: "Hiện chưa có cá lớn xuất hiện dưới đáy!", type: "beerus" } }));
        }
      }
    };
    window.addEventListener("triggerFishingSkill", fishingSkillListener);

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
      waterY = height * 0.22;
    }
    window.addEventListener("resize", resize);
    resize();

    class Fish {
      direction!: number;
      size!: number;
      y!: number;
      basePoints!: number;
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
      isWaitingForWave?: boolean;

      constructor(forcedLayer?: string, forcedY?: number, forcedDirection?: number, customRng?: () => number) {
        this.rngFunc = customRng || roomRng;
        this.spawn(forcedLayer, forcedY, forcedDirection);
      }

      spawn(forcedLayer?: string, forcedY?: number, forcedDirection?: number) {
        const r = this.rngFunc;
        this.direction = forcedDirection !== undefined ? forcedDirection : (r() > 0.5 ? 1 : -1);
        let availableFish = fishDatabase;
        if (forcedLayer) {
          availableFish = fishDatabase.filter((f) => f.layer === forcedLayer);
          if (availableFish.length === 0) availableFish = fishDatabase;
        }

        const chosenInfo = availableFish[Math.floor(r() * availableFish.length)];
        this.fishObj = loadedFishObjects.find((f) => f.info.filename === chosenInfo.filename) || loadedFishObjects[0];
        this.fishData = this.fishObj.info;
        this.layer = this.fishData.layer;
        this.size = (r() * 8 + 16) * this.fishData.sizeScale;

        const randomPriceFactor = 0.8 + r() * 0.7;
        const rawPoints = this.fishData.basePoints * this.fishData.multi * randomPriceFactor;
        
        const pCount = (window as any).roomPlayerCount || 1;
        const bonusMultiplier = 1 + (pCount - 1) * 0.05;

        if (this.fishData.layer === "bottom") {
          this.points = Math.round(rawPoints * (1 + r() * 1.5) * bonusMultiplier);
        } else {
          this.points = Math.round(rawPoints * bonusMultiplier);
        }

        this.struggleChance = (this.fishData as any).struggleWeight ?? 0.2;
        const baseHp = (this.fishData as any).maxHp ?? 18;
        this.maxHp = Math.round(baseHp * (1 + (pCount - 1) * 0.08));

        this.animFrame = r() * 100;
        this.notifiedRare = false;
        this.isWaitingForWave = false;

        const waterHeight = height - waterY;
        if (this.layer === "top") {
          this.y = forcedY !== undefined ? forcedY : waterY + 20 + r() * (waterHeight * 0.28);
          this.speed = (r() * 1.5 + 1.0) * this.direction;
          this.x = this.direction === 1 ? -this.size * 3 : width + this.size * 3;
        } else if (this.layer === "mid") {
          this.y = forcedY !== undefined ? forcedY : waterY + waterHeight * 0.32 + r() * (waterHeight * 0.35);
          this.speed = (r() * 0.9 + 0.5) * this.direction;
          this.x = this.direction === 1 ? -this.size * 3 : width + this.size * 3;
        } else {
          this.y = forcedY !== undefined ? forcedY : waterY + waterHeight * 0.7 + r() * (waterHeight * 0.22);
          this.speed = (r() * 0.4 + 0.2) * this.direction;
          this.x = this.direction === 1 ? -this.size * 3 : width + this.size * 3;
        }
        this.isCaught = false;
      }

      update() {
        if (this.isCaught || this.isWaitingForWave) return;

        let currentSpeed = this.speed;
        if (activeSkillState.sk4_slowDown) {
          currentSpeed *= 0.7;
        }
        if (activeSkillState.sk2_timeFreeze && (this.layer === "bottom" || this.layer === "mid")) {
          currentSpeed = 0;
        }

        this.x += currentSpeed;
        this.animFrame += 0.08;

        if (this.layer === "bottom" && !this.notifiedRare && this.x > width * 0.2 && this.x < width * 0.8) {
          this.notifiedRare = true;
          window.dispatchEvent(
            new CustomEvent("showPopupBanner", {
              detail: {
                title: "🔥 QUÁI VẬT KHỔNG LỒ XUẤT HIỆN! 🔥",
                message: `${this.fishData.vnName} đang bơi tới dưới đáy! Trị giá ${this.points.toLocaleString()} 🪙!`,
                type: "rare",
              },
            })
          );

          if (roomChannelRef.current) {
            roomChannelRef.current.send({
              type: "broadcast",
              event: "rare_fish_spawn",
              payload: { fishName: this.fishData.vnName, points: this.points },
            });
          }
        }

        if ((this.direction === 1 && this.x > width + this.size * 3) || 
            (this.direction === -1 && this.x < -this.size * 3)) {
          if (this.layer === "bottom") {
            this.isWaitingForWave = true;
            const delayMs = Math.floor(Math.random() * (60000 - 15000 + 1)) + 15000;
            setTimeout(() => {
              if (isMounted) {
                this.spawn("bottom");
              }
            }, delayMs);
          } else {
            this.spawn(this.layer);
          }
        }
      }

      draw() {
        if (this.isWaitingForWave) return;
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
      if (boatSpeed < 0) boatFacing = -1;
      else if (boatSpeed > 0) boatFacing = 1;
    };
    window.addEventListener("moveBoat", moveBoatListener);

    const oppStateListener = (e: any) => {
      const data = e.detail;
      if (data && data.user_id) {
        oppStates[data.user_id] = data;
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
        const scaleFactor = 0.62;
        let rodTipX = boatFacing === -1
          ? boatX - scaleFactor * (2 + Math.cos(-0.42) * 110)
          : boatX + scaleFactor * (2 + Math.cos(-0.42) * 110);
        let rodTipY = waterY - 12 + scaleFactor * (-10 + Math.sin(-0.42) * 110);

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

        let maxAllowedDepthRatio = 0.35;
        if (this.baitPrice >= 10000000) maxAllowedDepthRatio = 1.0;
        else if (this.baitPrice >= 1000000) maxAllowedDepthRatio = 0.88;
        else if (this.baitPrice >= 500000) maxAllowedDepthRatio = 0.75;
        else if (this.baitPrice >= 100000) maxAllowedDepthRatio = 0.6;
        else if (this.baitPrice >= 2000) maxAllowedDepthRatio = 0.48;
        else maxAllowedDepthRatio = 0.38;

        this.maxDepthY = waterY + (height - waterY) * maxAllowedDepthRatio;

        const scaleFactor = 0.62;
        let rodTipX = boatFacing === -1
          ? boatX - scaleFactor * (2 + Math.cos(-0.42) * 110)
          : boatX + scaleFactor * (2 + Math.cos(-0.42) * 110);
        let rodTipY = waterY - 12 + scaleFactor * (-10 + Math.sin(-0.42) * 110);

        if (boatFacing === -1) {
          this.targetWaterX = Math.min(width - 40, Math.max(rodTipX - (rodTipX - 60) * (this.power / 100), 60));
        } else {
          this.targetWaterX = Math.max(40, Math.min(rodTipX + (width - 60 - rodTipX) * (this.power / 100), width - 60));
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
        const pCount = (window as any).roomPlayerCount || 1;
        const playerBuffBonus = 1 + (pCount - 1) * 0.05;

        let hitDamage = multiplier * currentRodDamageBuff * playerBuffBonus;
        
        if (this.isJointPulling || this.isAssistingOpponent) {
          hitDamage *= 2.0;
        }

        let actualCritChance = currentRodCritChance + ((pCount > 1) ? 0.05 * (pCount - 1) : 0);
        const isCrit = !isHold && Math.random() < actualCritChance;
        if (isCrit) {
          hitDamage *= 2.5;
          critPopups.push({ x: this.x + (Math.random() - 0.5) * 40, y: this.y - 30, alpha: 1.0, scale: 1.2 });
        }

        let tensionGain = isHold ? (0.6 / currentRodDamageBuff) : (0.25 / currentRodDamageBuff);
        if (activeSkillState.sk3_armorBuff) {
          tensionGain *= 0.7; // Skill 3: Giảm 30% tăng tension (kháng đứt dây)
        }

        if (this.isJointPulling || this.isAssistingOpponent) tensionGain *= 0.5;
        
        this.lineTension += tensionGain;

        if (this.isAssistingOpponent) {
          Object.values(oppStates).forEach((opp: any) => {
            if (opp?.user_id && roomChannelRef.current) {
              roomChannelRef.current.send({
                type: "broadcast",
                event: "coop_damage_hit",
                payload: { targetUserId: opp.user_id, damage: hitDamage },
              });
            }
          });
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
        const scaleFactor = 0.62;
        let rodTipX = boatFacing === -1
          ? boatX - scaleFactor * (2 + Math.cos(-0.42) * 110)
          : boatX + scaleFactor * (2 + Math.cos(-0.42) * 110);
        let rodTipY = waterY - 12 + scaleFactor * (-10 + Math.sin(-0.42) * 110);

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
          this.y = this.castStartY + (waterY - this.castStartY) * t - Math.sin(t * Math.PI) * 60;
        } else if (this.state === "SINKING") {
          if (!activeSkillState.sk1_freezeStand) {
            this.y += Math.min(2.5, 1.2 + this.baitPrice / 20000000);
          } else {
            if (statusEl) statusEl.innerText = "🌀 Chân Không Trấn Hải: Cần đứng yên!";
          }

          for (let opp of Object.values(oppStates) as any[]) {
            if (opp && opp.hookState === "STRUGGLING") {
              let distToOpp = Math.sqrt(Math.pow(this.x - opp.hookX, 2) + Math.pow(this.y - opp.hookY, 2));
              if (distToOpp < 70) {
                this.state = "COOP_HELPING";
                this.isAssistingOpponent = true;
                this.x = opp.hookX;
                this.y = opp.hookY;
                window.dispatchEvent(
                  new CustomEvent("showPopupBanner", {
                    detail: { title: "🤝 KÉO CHUNG NỐI DÂY!", message: "Bạn đã móc câu trợ giúp đồng đội! Dame x2.0!", type: "coop" },
                  })
                );
                break;
              }
            }
          }

          for (let f of fishes) {
            if (f.isCaught || f.isWaitingForWave || Math.abs(this.y - f.y) > 40) continue;

            if (activeSkillState.sk5_ignoreSmall && f.layer === "top") {
              continue;
            }

            const isBigFish = f.layer === "bottom" || f.fishData.isRare;

            if (isBigFish) {
              if (this.baitPrice < 10000000) {
                continue;
              }

              if (this.baitPrice === 10000000) {
                let mouthX = f.direction === 1 ? f.x + f.size * 0.7 : f.x - f.size * 0.7;
                let mouthY = f.y - f.size * 0.15;
                if (Math.sqrt(Math.pow(this.x - mouthX, 2) + Math.pow(this.y - mouthY, 2)) < 22 + f.size * 0.3) {
                  const pCount = (window as any).roomPlayerCount || 1;
                  const dropChance = Math.max(0.05, 0.35 - (pCount - 1) * 0.05);

                  if (Math.random() < dropChance) {
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
            const isAtVeryBottom = this.y >= height - 40;
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
            this.currentFishHp += (activeSkillState.sk2_timeFreeze ? 0 : 0.035); 
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

              setMyCatchNotice({
                text: currentFish.vnName,
                amount: `+${earnedPoints.toLocaleString()}🪙`,
                show: true,
              });
              setTimeout(() => setMyCatchNotice(null), 3500);

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

        if (activeSkillState.sk5_ignoreSmall && fish.layer === "top") {
          fish.isCaught = false;
          this.caughtFish = null;
          return;
        }

        ctx!.fillStyle = "white";
        for (let i = 0; i < 10; i++) {
          ctx!.beginPath();
          ctx!.arc(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, Math.random() * 4 + 2, 0, Math.PI * 2);
          ctx!.fill();
        }

        if (fish.points >= 5000000 || fish.layer === "bottom") {
          this.state = "STRUGGLING";
          let hpMultiplier = activeSkillState.sk5_ignoreSmall ? 1.5 : 1.0;
          this.maxFishHp = Math.round(fish.maxHp * hpMultiplier);
          this.currentFishHp = this.maxFishHp;
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
        const scaleFactor = 0.62;
        let rodTipX = boatFacing === -1
          ? boatX - scaleFactor * (2 + Math.cos(-0.42) * 110)
          : boatX + scaleFactor * (2 + Math.cos(-0.42) * 110);
        let rodTipY = waterY - 12 + scaleFactor * (-10 + Math.sin(-0.42) * 110);

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
          ctx!.drawImage(activeBaitImg, hx - 12, hy - 12, 24, 24);
        } else {
          ctx!.fillStyle = "#FF9800";
          ctx!.beginPath();
          ctx!.arc(hx, hy, 5, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.strokeStyle = "#B0BEC5";
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.arc(hx, hy + 6, 4, 0, Math.PI, false);
        ctx!.moveTo(hx + 4, hy + 6);
        ctx!.lineTo(hx + 4, hy + 2);
        ctx!.stroke();
      }
    }

    const fishes: Fish[] = [];
    const computedWaterY = (canvas.height / (window.devicePixelRatio || 1)) * 0.22;
    const waterHeight = canvas.height / (window.devicePixelRatio || 1) - computedWaterY;

    for (let i = 0; i < 20; i++) {
      fishes.push(new Fish("top", computedWaterY + 15 + ((waterHeight * 0.28) / 20) * i, undefined, roomRng));
    }
    for (let i = 0; i < 10; i++) {
      fishes.push(new Fish("mid", computedWaterY + waterHeight * 0.32 + ((waterHeight * 0.35) / 10) * i, undefined, roomRng));
    }
    for (let i = 0; i < 2; i++) {
      fishes.push(new Fish("bottom", computedWaterY + waterHeight * 0.7 + ((waterHeight * 0.22) / 2) * i, undefined, roomRng));
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
      let clusterCenters = [60, 150, 280, width - 320, width - 180, width - 70, width / 2 - 80, width / 2 + 90];
      for (let cx of clusterCenters) {
        let countInCluster = Math.floor(roomRng() * 2) + 1;
        for (let i = 0; i < countInCluster; i++) {
          const randomDecor = loadedDecorImages[Math.floor(roomRng() * loadedDecorImages.length)];
          let isWeed = randomDecor.filename.includes("rongbien") || randomDecor.filename.includes("taobien");
          let w = 45 + roomRng() * 45;
          let h = 40 + roomRng() * 40;
          if (randomDecor.filename.includes("sanho")) {
            w = 70;
            h = 55;
          }
          if (randomDecor.filename.includes("dabien")) {
            w = 65;
            h = 50;
          }
          let offsetX = cx + (roomRng() - 0.5) * 50;
          let itemY = height - h - roomRng() * 10;
          placedDecorations.push({ imgObj: randomDecor, x: offsetX, y: itemY, width: w, height: h, isWeed, swayOffset: roomRng() * Math.PI * 2 });
          if (randomDecor.filename.includes("dabien")) {
            for (let b = 0; b < 3; b++) {
              bubbles.push({
                x: offsetX + w * 0.5 + (roomRng() - 0.5) * 20,
                y: itemY + roomRng() * 15,
                radius: roomRng() * 2.5 + 1,
                speed: roomRng() * 0.5 + 0.2,
                alpha: roomRng() * 0.5 + 0.3,
              });
            }
          }
        }
      }
    }
    initDecorationsMap();

    function drawOpponents() {
      Object.values(oppStates).forEach((opp: any) => {
        if (!opp) return;
        const charX = opp.boatRatio !== undefined ? opp.boatRatio * width : width * 0.5;
        const charY = waterY - 12;
        const scaleFactor = 0.62;
        const oppFacing = opp.facing !== undefined ? opp.facing : 1;

        ctx!.save();
        ctx!.translate(charX, charY);
        if (oppFacing === -1) {
          ctx!.scale(-scaleFactor, scaleFactor);
        } else {
          ctx!.scale(scaleFactor, scaleFactor);
        }

        ctx!.fillStyle = "#5D4037";
        ctx!.beginPath();
        ctx!.moveTo(-45, 15);
        ctx!.lineTo(55, 15);
        ctx!.lineTo(40, 28);
        ctx!.lineTo(-30, 28);
        ctx!.closePath();
        ctx!.fill();
        ctx!.strokeStyle = "#3E2723";
        ctx!.lineWidth = 2;
        ctx!.stroke();

        ctx!.fillStyle = "#424242";
        ctx!.fillRect(-10, -15, 20, 30);

        const oppAvatarImg = new Image();
        oppAvatarImg.src = opp.avatar;
        if (oppAvatarImg.complete && oppAvatarImg.naturalWidth !== 0) {
          ctx!.save();
          ctx!.beginPath();
          ctx!.arc(0, 0, 13, 0, Math.PI * 2);
          ctx!.closePath();
          ctx!.clip();
          if (oppFacing === -1) ctx!.scale(-1, 1);
          ctx!.drawImage(oppAvatarImg, -13, -13, 26, 26);
          ctx!.restore();
          ctx!.strokeStyle = "#00B0FF";
          ctx!.lineWidth = 2;
          ctx!.beginPath();
          ctx!.arc(0, 0, 13, 0, Math.PI * 2);
          ctx!.stroke();
        } else {
          ctx!.fillStyle = "#00B0FF";
          ctx!.beginPath();
          ctx!.arc(0, 0, 11, 0, Math.PI * 2);
          ctx!.fill();
        }

        const oppRodImg = new Image();
        oppRodImg.src = `/assets/cauca/cancau/${opp.rodFilename || "cancaucoban.png"}`;
        ctx!.save();
        ctx!.translate(2, 2);
        ctx!.rotate(opp.hookState === "CHARGING" ? -0.5 : -0.42);
        if (oppRodImg.complete && oppRodImg.naturalWidth !== 0) {
          ctx!.drawImage(oppRodImg, 0, -12, 110, 38);
        } else {
          ctx!.strokeStyle = "#5D4037";
          ctx!.lineWidth = 4;
          ctx!.lineCap = "round";
          ctx!.beginPath();
          ctx!.moveTo(0, 0);
          ctx!.lineTo(90, -30);
          ctx!.stroke();
        }
        ctx!.restore();
        ctx!.restore();

        let oppRodTipX = oppFacing === -1
          ? charX - scaleFactor * (2 + Math.cos(-0.42) * 110)
          : charX + scaleFactor * (2 + Math.cos(-0.42) * 110);
        let oppRodTipY = charY + scaleFactor * (-10 + Math.sin(-0.42) * 110);
        let oppHookX = opp.hookX;
        let oppHookY = opp.hookY;

        ctx!.beginPath();
        ctx!.moveTo(oppRodTipX, oppRodTipY);
        if (opp.hookState === "IDLE" || opp.hookState === "CHARGING") {
          ctx!.lineTo(oppRodTipX, oppRodTipY + 15);
          ctx!.strokeStyle = "rgba(255,255,255,0.5)";
          ctx!.lineWidth = 1.5;
          ctx!.stroke();
        } else {
          ctx!.quadraticCurveTo((oppRodTipX + oppHookX) / 2, Math.min(oppRodTipY, oppHookY) - 25, oppHookX, oppHookY);
          ctx!.strokeStyle = "rgba(255,255,255,0.5)";
          ctx!.lineWidth = 1.5;
          ctx!.stroke();
          ctx!.fillStyle = "#FF9800";
          ctx!.beginPath();
          ctx!.arc(oppHookX, oppHookY, 5, 0, Math.PI * 2);
          ctx!.fill();
        }
      });
    }

    function drawBackground() {
      ctx!.fillStyle = "#87CEEB";
      ctx!.fillRect(0, 0, width, waterY);
      ctx!.fillStyle = "#FFEB3B";
      ctx!.beginPath();
      ctx!.arc(width * 0.8, height * 0.08, 35, 0, Math.PI * 2);
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
            let sway = Math.sin(now * 0.0025 + item.swayOffset) * 5;
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
        b.x += Math.sin(now * 0.003 + b.y) * 0.3;
        if (b.y < waterY + 30) b.y = height - 20;
        ctx!.beginPath();
        ctx!.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255, 255, 255, ${b.alpha})`;
        ctx!.fill();
      }

      ctx!.fillStyle = "rgba(255,255,255,0.25)";
      ctx!.fillRect(0, waterY, width, 3);

      drawOpponents();

      if (boatSpeed !== 0 && hook.state === "IDLE") {
        boatX += boatSpeed;
        if (boatX < 40) boatX = 40;
        if (boatX > width - 100) boatX = width - 100;
      }

      const charX = boatX;
      const charY = waterY - 12;
      const scaleFactor = 0.62;

      ctx!.save();
      ctx!.translate(charX, charY);
      if (boatFacing === -1) {
        ctx!.scale(-scaleFactor, scaleFactor);
      } else {
        ctx!.scale(scaleFactor, scaleFactor);
      }

      ctx!.fillStyle = "#8D6E63";
      ctx!.beginPath();
      ctx!.moveTo(-45, 15);
      ctx!.lineTo(55, 15);
      ctx!.lineTo(40, 28);
      ctx!.lineTo(-30, 28);
      ctx!.closePath();
      ctx!.fill();
      ctx!.strokeStyle = "#3E2723";
      ctx!.lineWidth = 2;
      ctx!.stroke();

      ctx!.fillStyle = "#212121";
      ctx!.fillRect(-10, -15, 20, 30);

      const avatarImg = new Image();
      avatarImg.src = userAvatar;
      if (avatarImg.complete && avatarImg.naturalWidth !== 0) {
        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(0, 0, 13, 0, Math.PI * 2);
        ctx!.closePath();
        ctx!.clip();
        if (boatFacing === -1) ctx!.scale(-1, 1);
        ctx!.drawImage(avatarImg, -13, -13, 26, 26);
        ctx!.restore();
        ctx!.strokeStyle = "#FFD700";
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.arc(0, 0, 13, 0, Math.PI * 2);
        ctx!.stroke();
      } else {
        ctx!.fillStyle = "#FFD700";
        ctx!.beginPath();
        ctx!.arc(0, 0, 11, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.save();
      ctx!.translate(2, 2);
      ctx!.rotate(hook.state === "CHARGING" ? -0.5 : -0.42);
      if (rodImg && rodImg.complete && rodImg.naturalWidth !== 0) {
        ctx!.drawImage(rodImg, 0, -12, 110, 38);
      } else {
        ctx!.strokeStyle = "#8B4513";
        ctx!.lineWidth = 4;
        ctx!.lineCap = "round";
        ctx!.beginPath();
        ctx!.moveTo(0, 0);
        ctx!.lineTo(90, -30);
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
        ctx!.font = `900 ${Math.round(18 * p.scale)}px sans-serif`;
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
            facing: boatFacing,
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
      window.removeEventListener("triggerFishingSkill", fishingSkillListener);
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
    { cost: 50000050, filename: "kiblue.png", label: "Mồi Cao Cấp - 50,000,000🪙" },
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
            <h1 className="text-2xl font-black text-amber-400 uppercase tracking-widest drop-shadow-lg">🎣 Sảnh Câu Cá (Tối đa 10 Người)</h1>
            <p className="text-xs text-slate-400 mt-2">Chọn phòng và cùng anh em chiến đấu realtime!</p>
          </div>

          <div className="space-y-3">
            {rooms.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-4">Đang tải danh sách phòng...</div>
            ) : (
              rooms.map((room) => {
                let currentCount = 0;
                for (let i = 1; i <= 10; i++) {
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
      <div className="absolute top-1 left-1 right-1 flex justify-between items-center z-50 pointer-events-auto gap-1">
        <div className="flex items-center space-x-1">
          <button
            onClick={leaveRoom}
            className="bg-rose-900/95 text-rose-200 hover:bg-rose-800 px-2 py-1 rounded-md text-[8px] sm:text-[9px] font-black border border-rose-500/40 shadow cursor-pointer"
          >
            ← Rời
          </button>
          <div className="bg-black/85 text-white px-2 py-1 rounded-md font-bold text-[8px] sm:text-[9px] border border-amber-500/40 shadow flex items-center gap-1">
            <img src={userAvatar} alt="Avatar" className="w-3.5 h-3.5 rounded-full border border-amber-400 object-cover" />
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
            onClick={() => setIsSkillShopOpen(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 px-2 py-1 rounded-md font-black text-[8px] sm:text-[9px] shadow active:scale-95 transition cursor-pointer flex items-center gap-0.5 border border-white/40"
          >
            🔮 Skill Shop
          </button>
        </div>

        {/* --- KHUNG HŨ (JACKPOT) --- */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-slate-950/90 border border-amber-500/60 px-3 py-1 rounded-xl shadow-2xl pointer-events-none scale-90 sm:scale-100">
          <div className="text-center">
            <span className="text-[5px] font-bold text-slate-300 block">CÁ TRÁI ĐẤT</span>
            <span className="text-[9px] font-black text-amber-300">{isMounted ? jackpot.minor.toLocaleString("en-US") : "..."}🪙</span>
          </div>
          <div className="h-4 w-[1px] bg-amber-500/30"></div>
          <div className="text-center">
            <span className="text-[5px] font-bold text-red-400 block">CÁ SIÊU CẤP</span>
            <span className="text-[9px] font-black text-red-500 animate-pulse">{isMounted ? jackpot.grand.toLocaleString("en-US") : "..."}🪙</span>
          </div>
          <div className="h-4 w-[1px] bg-amber-500/30"></div>
          <div className="text-center">
            <span className="text-[5px] font-bold text-blue-400 block">CÁ NAMEK</span>
            <span className="text-[9px] font-black text-cyan-400">{isMounted ? jackpot.major.toLocaleString("en-US") : "..."}🪙</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
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
            className="bg-slate-800/90 text-white font-bold py-1 px-2 rounded-md text-[8px] sm:text-[9px] border border-slate-700 shadow hidden sm:block"
          >
            {isFullscreen ? "🗗 Thu Nhỏ" : "🖵 Full"}
          </button>
        </div>
      </div>

      {/* QUICK SKILL BAR */}
      <div className="absolute bottom-16 left-2 z-40 flex items-center space-x-1 bg-black/80 p-1.5 rounded-xl border border-cyan-500/60 shadow-xl backdrop-blur-md pointer-events-auto">
        {fishingSkills.map((sk) => {
          const count = inventory[sk.id] || 0;
          const coolEnd = skillCooldowns[sk.id] || 0;
          const isCooling = Date.now() < coolEnd;
          return (
            <button
              key={sk.id}
              onClick={() => handleUseSkill(sk.id)}
              title={`${sk.name}: ${sk.desc} (Kho: ${count})`}
              className={`relative w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black border transition cursor-pointer ${
                count > 0 ? "bg-slate-900 border-cyan-400 text-cyan-300 hover:scale-105" : "bg-slate-950 border-slate-800 text-slate-600"
              }`}
            >
              <span>{sk.icon}</span>
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[8px] font-black px-1 rounded-full">
                {count}
              </span>
              {isCooling && (
                <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center text-[8px] text-red-400 font-bold">
                  ⌛
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* POPUP SHOP SKILL TRONG GAME */}
      {isSkillShopOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 pointer-events-auto">
          <div className="bg-slate-950 border-2 border-cyan-500/60 w-full max-w-2xl max-h-[85vh] rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-base sm:text-lg font-black text-cyan-400 uppercase tracking-wider">🔮 Thần Điện Kỹ Năng Câu Cá</h2>
              <button
                onClick={() => setIsSkillShopOpen(false)}
                className="bg-slate-800 hover:bg-rose-600 text-white font-black w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer shadow text-xs"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto my-3 space-y-2 pr-1">
              {fishingSkills.map((sk) => {
                const count = inventory[sk.id] || 0;
                return (
                  <div key={sk.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{sk.icon}</span>
                      <div>
                        <h4 className="text-xs font-black text-amber-300">{sk.name}</h4>
                        <p className="text-[10px] text-slate-300">{sk.desc}</p>
                        <p className="text-[9px] text-cyan-400 font-bold mt-1">Đang có: {count} lượt</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleBuySkillInGame(sk)}
                      className="bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 px-3 py-1.5 rounded-xl text-[10px] font-black shadow cursor-pointer hover:brightness-110"
                    >
                      Mua ({sk.price.toLocaleString()}🪙)
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-1 right-1 z-50 pointer-events-auto">
        <div className="relative">
          <button
            onClick={() => setIsBaitDropdownOpen(!isBaitDropdownOpen)}
            className="bg-slate-900/95 hover:bg-slate-800 border border-amber-500/70 px-2 py-1 rounded-md shadow-2xl flex items-center space-x-1 text-amber-300 text-[8px] sm:text-[9px] font-black cursor-pointer transition select-none"
          >
            <span>🪱</span>
            <span className="truncate max-w-[100px] sm:max-w-[130px]">{selectedBait.name}</span>
            <span>{isBaitDropdownOpen ? "▲" : "▼"}</span>
          </button>
          {isBaitDropdownOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-slate-950/98 border-2 border-amber-500 rounded-xl shadow-2xl overflow-hidden z-50 p-1 space-y-1 backdrop-blur-md">
              <div className="px-2 py-1 text-[8px] font-black text-amber-400 uppercase border-b border-slate-800">Chọn Mồi Câu</div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                {baitList.map((bait) => (
                  <button
                    key={bait.cost}
                    onClick={() => {
                      setSelectedBait({ cost: bait.cost, filename: bait.filename, name: bait.label });
                      setIsBaitDropdownOpen(false);
                      window.dispatchEvent(new CustomEvent("changeBait", { detail: bait.cost }));
                      window.dispatchEvent(new CustomEvent("changeBaitImg", { detail: bait }));
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-black transition cursor-pointer flex items-center justify-between ${
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
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-emerald-500/90 text-white px-3 py-1 rounded-lg font-black text-[10px] shadow-lg animate-bounce border border-emerald-300 pointer-events-none">
          {oppAlert}
        </div>
      )}

      {myCatchNotice && myCatchNotice.show && (
        <div className="absolute top-12 left-2 z-40 bg-slate-900/95 border-2 border-amber-400 px-2 py-1 rounded-xl shadow-2xl pointer-events-none flex items-center gap-1.5 animate-fadeIn">
          <span className="text-xs">🎣</span>
          <div>
            <p className="text-[8px] font-bold text-slate-300">{myCatchNotice.text}</p>
            <p className="text-xs font-black text-amber-300">{myCatchNotice.amount}</p>
          </div>
        </div>
      )}

      {oppCatchNotice && oppCatchNotice.show && (
        <div className="absolute top-12 right-2 z-40 bg-slate-900/95 border-2 border-cyan-400 px-2 py-1 rounded-xl shadow-2xl pointer-events-none flex items-center gap-1.5 animate-fadeIn text-right">
          <div>
            <p className="text-[8px] font-bold text-slate-300">Đồng đội: {oppCatchNotice.text}</p>
            <p className="text-xs font-black text-cyan-300">{oppCatchNotice.amount}</p>
          </div>
          <span className="text-xs">🐟</span>
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
          className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-bounce text-center bg-slate-950/95 border-4 px-4 py-2 rounded-xl shadow-2xl space-y-1 max-w-xs ${
            popupData.type === "beerus"
              ? "border-rose-500 shadow-[0_0_30px_rgba(244,67,54,0.6)]"
              : popupData.type === "coop"
              ? "border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.6)]"
              : "border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.6)]"
          }`}
        >
          <p
            className={`font-black text-[9px] sm:text-[10px] tracking-widest uppercase ${
              popupData.type === "beerus" ? "text-rose-400" : popupData.type === "coop" ? "text-emerald-300" : "text-amber-300"
            }`}
          >
            {popupData.title}
          </p>
          <p className="text-white font-black text-[10px] sm:text-xs leading-snug whitespace-pre-line drop-shadow-[2px_2px_0_#000]">
            {popupData.message}
          </p>
        </div>
      )}

      <div className="absolute bottom-2 left-2 z-40 flex items-center space-x-1.5 bg-black/80 p-1.5 rounded-xl border border-amber-500/60 shadow-xl backdrop-blur-md pointer-events-auto">
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
          className="w-9 h-9 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm rounded-lg active:scale-90 transition shadow cursor-pointer flex items-center justify-center select-none"
        >
          ◀
        </button>
        <span className="text-[9px] font-black text-amber-300 uppercase px-0.5">Chèo</span>
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
          className="w-9 h-9 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm rounded-lg active:scale-90 transition shadow cursor-pointer flex items-center justify-center select-none"
        >
          ▶
        </button>
      </div>

      <div
        id="power-container"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[160px] h-[16px] bg-black/70 rounded-lg border border-white hidden pointer-events-none overflow-hidden shadow-lg z-30"
      >
        <div id="power-bar" className="w-[0%] h-full bg-gradient-to-r from-[#4CAF50] via-[#FFEB3B] to-[#F44336] transition-all duration-75"></div>
      </div>
      <div id="status" className="absolute bottom-14 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] font-black drop-shadow-[1px_1px_1px_#000] text-center w-full z-30 pointer-events-none text-white">
        Sẵn sàng
      </div>

      <canvas id="gameCanvas" className="absolute inset-0 block w-full h-full pointer-events-auto"></canvas>
    </div>
  );
}