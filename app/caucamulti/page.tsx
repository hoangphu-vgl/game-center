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

export default function CauCaMultiPage() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [score, setScore] = useState<number>(1000);
  const [userAvatar, setUserAvatar] = useState<string>("/assets/avatar/xtra1.ico");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // --- MULTIPLAYER ROOM STATES ---
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [currentSlot, setCurrentSlot] = useState<string | null>(null);
  const [roomPlayerCount, setRoomPlayerCount] = useState<number>(1);
  const roomChannelRef = useRef<any>(null);
  const [oppAlert, setOppAlert] = useState<string | null>(null);

  // --- HỆ THỐNG KHO SKILL & COOLDOWN ---
  const [inventory, setInventory] = useState<{ [key: string]: number }>({});
  const [skillCooldowns, setSkillCooldowns] = useState<{ [key: string]: number }>({});
  const [isSkillShopOpen, setIsSkillShopOpen] = useState<boolean>(false);
  const [isSkillDropdownOpen, setIsSkillDropdownOpen] = useState<boolean>(false);

  const fishingSkills = [
    { id: "fish_sk1", name: "Chân Không Trấn Hải", icon: "🌀", desc: "Mồi chìm đến độ sâu mong muốn, chạm giữ để giữ mồi đứng yên 5s.", price: 200000 },
    { id: "fish_sk2", name: "Bản Năng Vô Cực", icon: "⚡", desc: "Đóng băng thời gian toàn hồ trong 5s (Cá lớn có % kháng).", price: 350000 },
    { id: "fish_sk3", name: "Giáp Sắt Kachi Katchin", icon: "🛡️", desc: "Tăng 30% kháng đứt dây khi ghì cá trong 10 giây.", price: 150000 },
    { id: "fish_sk4", name: "Thời Gian Ngoại Lệ", icon: "⏳", desc: "Làm chậm toàn bộ cá dưới nước 30% trong vòng 5 giây.", price: 250000 },
    { id: "fish_sk5", name: "Hào Quang Biến Mất", icon: "👻", desc: "Cá nhỏ phớt lờ bạn trong lượt kế, cá lớn cắn câu sẽ dẫy mạnh hơn.", price: 300000 },
    { id: "fish_sk6", name: "Nhãn Quan Thần Linh", icon: "🔮", desc: "Soi chính xác giá trị tiền thưởng của 1 con cá lớn ngẫu nhiên trong hồ.", price: 400000 },
  ];

  // --- HỆ THỐNG THÔNG BÁO NHỎ GỌN Ở GIỮA TRÊN ---
  const [centerCatchNotice, setCenterCatchNotice] = useState<{ text: string; show: boolean } | null>(null);
  const [myCatchNotice, setMyCatchNotice] = useState<{ text: string; amount: string; show: boolean } | null>(null);
  const [oppCatchNotice, setOppCatchNotice] = useState<{ text: string; amount: string; show: boolean } | null>(null);
  const [bossUI, setBossUI] = useState<{ name: string; hpPercent: number; weightText: string; } | null>(null);

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
    { filename: "cancauvectordo.png", name: "Cần Câu Véc-tơ Đỏ", price3Days: 50000000000, price5Days: 80000000000, price7Days: 110000000000, desc: "Siêu phẩm phối màu đỏ rực", damageBuff: 4.0, critChance: 0.35, buff: "Kéo nhanh" },
    { filename: "cancauvectorvang.png", name: "Cần Câu Véc-tơ Vàng", price3Days: 1000000000000, price5Days: 1600000000000, price7Days: 2200000000000, desc: "Cực phẩm tối thượng dát vàng", damageBuff: 5.5, critChance: 0.45, buff: "X2 Sát Thương & Điểm" }
  ];

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
    setIsSkillDropdownOpen(false);
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
      const players: any[] = [];
      Object.keys(state).forEach((key) => {
        players.push((state[key] as any)[0]);
      });

      const count = Math.max(1, players.length);
      setRoomPlayerCount(count);
      (window as any).roomPlayerCount = count;

      if (players.length > 0) {
        players.sort((a, b) => {
          const slotA = parseInt(a.slot?.replace("player_", "") || "99");
          const slotB = parseInt(b.slot?.replace("player_", "") || "99");
          return slotA - slotB;
        });
        const topPlayer = players[0];
        (window as any).isHost = (topPlayer.user_id === user.id);
      }

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

        setCenterCatchNotice({
          text: `${payload.payload.fishName} (${payload.payload.weightText || ""})`,
          show: true,
        });
        setTimeout(() => setCenterCatchNotice(null), 3500);
      }
    });

    channel.on("broadcast", { event: "sync_fishes" }, (payload) => {
      if (!(window as any).isHost && payload.payload.fishes) {
        window.dispatchEvent(new CustomEvent("receivedSyncFishes", { detail: payload.payload.fishes }));
      }
    });
    
    channel.on("broadcast", { event: "boss_damage" }, (payload) => {
      window.dispatchEvent(new CustomEvent("syncBossDamage", { detail: payload.payload }));
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

    const fishDatabase = [
      // Nhỏ (1-10kg)
      { filename: "Amphiprion_ocellaris.png", vnName: "Cá hề Nemo", sizeScale: 0.65, basePoints: 500, weightRange: [1, 5], multi: 2, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Abudefduf_saxatilis.png", vnName: "Cá thia vằn sọc", sizeScale: 0.7, basePoints: 500, weightRange: [3, 8], multi: 3, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Chromis_chromis.png", vnName: "Cá thia xanh", sizeScale: 0.6, basePoints: 500, weightRange: [2, 6], multi: 2.5, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Carassius_auratus.png", vnName: "Cá vàng cảnh", sizeScale: 0.7, basePoints: 600, weightRange: [4, 10], multi: 4, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Campostoma_anomalum.png", vnName: "Cá tuế suối", sizeScale: 0.65, basePoints: 500, weightRange: [1, 5], multi: 2, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Abudefduf_sordidus.png", vnName: "Cá thia xám", sizeScale: 0.8, basePoints: 600, weightRange: [5, 10], multi: 4.5, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Abramis_brama.png", vnName: "Cá vền nước ngọt", sizeScale: 0.85, basePoints: 700, weightRange: [6, 10], multi: 5, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Abudefduf_sexfasciatus.png", vnName: "Cá thia sáu sọc", sizeScale: 0.7, basePoints: 600, weightRange: [4, 9], multi: 4, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Platax_boersii.png", vnName: "Cá bướm vàng cam", sizeScale: 0.8, basePoints: 800, weightRange: [5, 10], multi: 6, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Chaetodon_lunula.png", vnName: "Cá bướm mặt trăng", sizeScale: 0.85, basePoints: 1000, weightRange: [7, 10], multi: 8, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Chromis_viridis.png", vnName: "Cá thia lục bảo", sizeScale: 0.6, basePoints: 800, weightRange: [4, 9], multi: 6, layer: "top", struggleWeight: 0, isRare: false },

      // Trung (10-100kg)
      { filename: "Acanthurus_coerulus.png", vnName: "Cá đuôi gai xanh", sizeScale: 2.1, basePoints: 200000, weightRange: [10, 30], multi: 10, layer: "mid", struggleWeight: 0.25, isRare: false },
      { filename: "Oreochromis_niloticus.png", vnName: "Cá rô phi vằn", sizeScale: 2.25, basePoints: 200000, weightRange: [20, 45], multi: 12, layer: "mid", struggleWeight: 0.3, isRare: false },
      { filename: "Micropterus_salmoides.png", vnName: "Cá vược miệng rộng", sizeScale: 2.3, basePoints: 300000, weightRange: [30, 60], multi: 15, layer: "mid", struggleWeight: 0.35, isRare: false },
      { filename: "cachep.png", vnName: "Cá chép lớn", sizeScale: 2.6, basePoints: 400000, weightRange: [40, 80], multi: 20, layer: "mid", struggleWeight: 0.4, isRare: false },
      { filename: "cachimbien.png", vnName: "Cá chim biển", sizeScale: 2.1, basePoints: 300000, weightRange: [25, 55], multi: 15, layer: "mid", struggleWeight: 0.35, isRare: false },
      { filename: "carolon.png", vnName: "Cá rô lớn", sizeScale: 2.5, basePoints: 500000, weightRange: [50, 100], multi: 25, layer: "mid", struggleWeight: 0.45, isRare: false },
      { filename: "cabasa.png", vnName: "Cá basa", sizeScale: 2.3, basePoints: 200000, weightRange: [15, 40], multi: 12, layer: "mid", struggleWeight: 0.3, isRare: false },
      { filename: "Bodianus_diplotaenia.png", vnName: "Cá nhám", sizeScale: 2.6, basePoints: 600000, weightRange: [60, 100], multi: 30, layer: "mid", struggleWeight: 0.5, isRare: false },
      { filename: "Arothron_meleagris.png", vnName: "Cá nóc đốm sao", sizeScale: 2.25, basePoints: 200000, weightRange: [10, 35], multi: 10, layer: "mid", struggleWeight: 0.5, isRare: false },
      { filename: "cangubo.png", vnName: "Cá ngừ", sizeScale: 2.4, basePoints: 700000, weightRange: [45, 95], multi: 35, layer: "mid", struggleWeight: 0.55, isRare: false },
      { filename: "catra.png", vnName: "Cá tra", sizeScale: 2.7, basePoints: 800000, weightRange: [70, 100], multi: 40, layer: "mid", struggleWeight: 0.6, isRare: false },
      { filename: "Epinephelus_marginatus.png", vnName: "Cá mú đen đại dương", sizeScale: 2.7, basePoints: 500000, weightRange: [80, 100], multi: 50, layer: "mid", struggleWeight: 0.65, isRare: false },
      // Lớn (100 - 1000kg)
      { filename: "Aetobatus_ocellatus.png", vnName: "Cá đuối đốm đại dương", sizeScale: 4.6, basePoints: 2000000, weightRange: [100, 300], multi: 100, layer: "bottom", struggleWeight: 0.75, isRare: true },
      { filename: "Carcharhinus_melanopterus.png", vnName: "Cá mập vây đen", sizeScale: 4.8, basePoints: 3000000, weightRange: [200, 500], multi: 150, layer: "bottom", struggleWeight: 0.8, isRare: true },
      { filename: "Carcharias_taurus.png", vnName: "Cá mập cát khổng lồ", sizeScale: 4.2, basePoints: 5000000, weightRange: [400, 800], multi: 250, layer: "bottom", struggleWeight: 0.85, isRare: true },
      { filename: "camaptrang.png", vnName: "Cá mặt trăng khổng lồ", sizeScale: 5.4, basePoints: 6000000, weightRange: [600, 1000], multi: 450, layer: "bottom", struggleWeight: 0.88, isRare: true },
      { filename: "camapdaubua.png", vnName: "Cá mập đầu búa", sizeScale: 5.0, basePoints: 4000000, weightRange: [150, 450], multi: 200, layer: "bottom", struggleWeight: 0.9, isRare: true },
      { filename: "Pterois_miles.png", vnName: "Cá kiếm đại dương", sizeScale: 5.4, basePoints: 6000000, weightRange: [700, 1000], multi: 500, layer: "bottom", struggleWeight: 0.93, isRare: true },
      { filename: "cavoisatthu.png", vnName: "Cá voi sát thủ", sizeScale: 6.6, basePoints: 5000000, weightRange: [500, 900], multi: 350, layer: "bottom", struggleWeight: 0.95, isRare: true },
      { filename: "cavoixanh.png", vnName: "Cá voi xanh khổng lồ", sizeScale: 8.3, basePoints: 9000000, weightRange: [800, 1000], multi: 650, layer: "bottom", struggleWeight: 0.96, isRare: true },
      
      // Boss Khổng Lồ
      { filename: "livyatan.png", vnName: "Livyatan Thượng Cổ", sizeScale: 13.5, basePoints: 500000000, weightRange: [1, 50], multi: 1000, layer: "boss", struggleWeight: 1.0, isRare: true }
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
    const critPopups: { x: number; y: number; alpha: number; scale: number; text: string }[] = [];

    let activeSkillState = {
      sk1_armed: false,
      sk1_holding: false,
      sk1_timer: null as any,
      sk2_timeFreeze: false,
      sk3_armorBuff: false,
      sk3_timer: null as any,
      sk4_slowDown: false,
      sk5_ignoreSmall: false,
    };

    const fishingSkillListener = (e: any) => {
      const { skillId } = e.detail;
      if (skillId === "fish_sk1") {
        activeSkillState.sk1_armed = true;
        window.dispatchEvent(new CustomEvent("showPopupBanner", { detail: { title: "🌀 CHÂN KHÔNG TRẤN HẢI", message: "Hãy thả mồi đến độ sâu bạn muốn rồi chạm giữ để giữ mồi đứng yên 5s!", type: "coop" } }));
      } else if (skillId === "fish_sk2") {
        activeSkillState.sk2_timeFreeze = true;
        window.dispatchEvent(new CustomEvent("showPopupBanner", { detail: { title: "⚡ BẢN NĂNG VÔ CỰC", message: "Đã đóng băng thời gian toàn hồ trong 5 giây (Cá lớn có % kháng)!", type: "rare" } }));
        setTimeout(() => { activeSkillState.sk2_timeFreeze = false; }, 5000);
      } else if (skillId === "fish_sk3") {
        activeSkillState.sk3_armorBuff = true;
        window.dispatchEvent(new CustomEvent("showPopupBanner", { detail: { title: "🛡️ GIÁP SẮT KACHI KATCHIN", message: "Tăng 30% kháng đứt dây trong 10 giây!", type: "coop" } }));
        if (activeSkillState.sk3_timer) clearTimeout(activeSkillState.sk3_timer);
        activeSkillState.sk3_timer = setTimeout(() => {
          activeSkillState.sk3_armorBuff = false;
        }, 10000);
      } else if (skillId === "fish_sk4") {
        activeSkillState.sk4_slowDown = true;
        window.dispatchEvent(new CustomEvent("showPopupBanner", { detail: { title: "⏳ THỜI GIAN NGOẠI LỆ", message: "Toàn bộ cá dưới nước bị làm chậm 30% trong 5 giây!", type: "beerus" } }));
        setTimeout(() => { activeSkillState.sk4_slowDown = false; }, 5000);
      } else if (skillId === "fish_sk5") {
        activeSkillState.sk5_ignoreSmall = true;
        window.dispatchEvent(new CustomEvent("showPopupBanner", { detail: { title: "👻 HÀO QUANG BIẾN MẤT", message: "Cá nhỏ sẽ phớt lờ mồi câu trong lần thả tới!", type: "coop" } }));
      } else if (skillId === "fish_sk6") {
        const bottomFishes = fishes.filter(f => (f.layer === "bottom" || f.layer === "boss") && !f.isCaught);
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
      id: string;
      direction!: number;
      size!: number;
      y!: number;
      basePoints!: number;
      points!: number;
      weight!: number;
      hp!: number;
      maxHp!: number;
      speed!: number;
      x!: number;
      isCaught!: boolean;
      fishData!: typeof fishDatabase[0];
      animFrame!: number;
      fishObj!: typeof loadedFishObjects[0];
      layer!: string;
      notifiedRare?: boolean;
      isWaitingForWave?: boolean;

      constructor(forcedLayer?: string, forcedY?: number, forcedDirection?: number, syncData?: any) {
        this.id = Math.random().toString(36).substring(2, 9);
        if (syncData) {
            this.id = syncData.id;
            this.x = syncData.x;
            this.y = syncData.y;
            this.speed = syncData.vx;
            this.direction = syncData.direction;
            this.size = syncData.size;
            this.points = syncData.points;
            this.weight = syncData.weight;
            this.hp = syncData.hp;
            this.maxHp = syncData.maxHp;
            this.layer = syncData.layer;
            const chosenInfo = fishDatabase.find(fd => fd.filename === syncData.filename) || fishDatabase[0];
            this.fishObj = loadedFishObjects.find((fo) => fo.info.filename === chosenInfo.filename) || loadedFishObjects[0];
            this.fishData = this.fishObj.info;
            this.isCaught = false;
            this.animFrame = Math.random() * 100;
        } else {
            this.spawn(forcedLayer, forcedY, forcedDirection);
        }
      }

      spawn(forcedLayer?: string, forcedY?: number, forcedDirection?: number) {
        this.direction = forcedDirection !== undefined ? forcedDirection : (Math.random() > 0.5 ? 1 : -1);
        let availableFish = fishDatabase.filter(f => f.layer !== "boss");
        
        if (forcedLayer === "boss") {
            availableFish = fishDatabase.filter(f => f.layer === "boss");
        } else if (forcedLayer) {
          availableFish = fishDatabase.filter((f) => f.layer === forcedLayer);
          if (availableFish.length === 0) availableFish = fishDatabase.filter(f => f.layer !== "boss");
        }

        const chosenInfo = availableFish[Math.floor(Math.random() * availableFish.length)];
        this.fishObj = loadedFishObjects.find((f) => f.info.filename === chosenInfo.filename) || loadedFishObjects[0];
        this.fishData = this.fishObj.info;
        this.layer = this.fishData.layer;
        this.size = (Math.random() * 8 + 16) * this.fishData.sizeScale;
        
        const wRange = this.fishData.weightRange;
        let weightVal = Math.floor(Math.random() * (wRange[1] - wRange[0] + 1)) + wRange[0];
        this.weight = weightVal;

        const pCount = (window as any).roomPlayerCount || 1;
        const bonusMultiplier = 1 + (pCount - 1) * 0.05;

        this.points = Math.round(this.weight * this.fishData.multi * this.fishData.basePoints * bonusMultiplier);
        
        if (this.layer === "boss") {
            this.hp = this.weight * 100;
        } else if (this.layer === "bottom") {
            this.hp = this.weight * 2.0; 
        } else if (this.layer === "mid" && this.weight >= 30) {
            this.hp = this.weight * 0.8; 
        } else {
            this.hp = 0;
        }
        this.maxHp = this.hp;

        this.animFrame = Math.random() * 100;
        this.notifiedRare = false;
        this.isWaitingForWave = false;

        const waterHeight = height - waterY;
        if (this.layer === "top") {
          this.y = forcedY !== undefined ? forcedY : waterY + 20 + Math.random() * (waterHeight * 0.28);
          this.speed = (Math.random() * 1.5 + 1.0) * this.direction;
          this.x = this.direction === 1 ? -this.size * 3 : width + this.size * 3;
        } else if (this.layer === "mid") {
          this.y = forcedY !== undefined ? forcedY : waterY + waterHeight * 0.32 + Math.random() * (waterHeight * 0.35);
          this.speed = (Math.random() * 0.9 + 0.5) * this.direction;
          this.x = this.direction === 1 ? -this.size * 3 : width + this.size * 3;
        } else {
          this.y = forcedY !== undefined ? forcedY : waterY + waterHeight * 0.7 + Math.random() * (waterHeight * 0.22);
          this.speed = (Math.random() * 0.4 + 0.2) * this.direction;
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
        if (activeSkillState.sk2_timeFreeze) {
          if (this.layer === "top") {
            currentSpeed = 0;
          } else {
            const isResisted = (this.layer === "bottom" || this.layer === "boss") && Math.random() < 0.4;
            if (!isResisted) currentSpeed = 0;
          }
        }

        this.x += currentSpeed;
        this.animFrame += 0.08;

        if ((this.layer === "bottom" || this.layer === "boss") && !this.notifiedRare && this.x > width * 0.2 && this.x < width * 0.8) {
          this.notifiedRare = true;
          let wText = this.layer === "boss" ? `${this.weight} Tấn` : `${this.weight}kg`;

          if ((window as any).isHost && roomChannelRef.current) {
            roomChannelRef.current.send({
              type: "broadcast",
              event: "rare_fish_spawn",
              payload: { fishName: this.fishData.vnName, points: this.points },
            });
          }
        }

        if ((this.direction === 1 && this.x > width + this.size * 3) || 
            (this.direction === -1 && this.x < -this.size * 3)) {
          if ((window as any).isHost) {
            if (this.layer === "boss") {
                const idx = fishes.indexOf(this);
                if (idx > -1) fishes.splice(idx, 1);
            }
            else if (this.layer === "bottom") {
              this.isWaitingForWave = true;
              const delayMs = Math.floor(Math.random() * (60000 - 15000 + 1)) + 15000;
              setTimeout(() => {
                if (isMounted && fishes.includes(this)) {
                  this.spawn("bottom");
                }
              }, delayMs);
            } else {
              this.spawn(this.layer);
            }
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
    
    const syncBossDamageListener = (e: any) => {
        const { fishId, damage } = e.detail;
        const targetFish = fishes.find(f => f.id === fishId);
        if (targetFish && targetFish.hp > 0) {
            targetFish.hp -= damage;
            if (targetFish.hp <= 0 && !(window as any).isHost) {
                targetFish.hp = 0;
            }
        }
    }
    window.addEventListener("syncBossDamage", syncBossDamageListener);

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
      baitPrice!: number;
      
      lineTension: number = 0;          
      isJointPulling: boolean = false;  
      isAssistingOpponent: boolean = false; 
      struggleIdleTime: number = 0;
      tapProgress: number = 0;

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
        this.lineTension = 0;
        this.tapProgress = 0;
        this.isJointPulling = false;
        this.isAssistingOpponent = false;
        this.struggleIdleTime = 0;
        activeSkillState.sk1_holding = false;
        setBossUI(null);

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

        let maxAllowedDepthRatio = 0.35;
        if (this.baitPrice >= 100000000) maxAllowedDepthRatio = 1.0;
        else if (this.baitPrice >= 10000000) maxAllowedDepthRatio = 0.92;
        else if (this.baitPrice >= 1000000) maxAllowedDepthRatio = 0.78;
        else if (this.baitPrice >= 100000) maxAllowedDepthRatio = 0.6;
        else maxAllowedDepthRatio = 0.48;

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
          this.struggleIdleTime = 0;
          this.applyStruggleDamage(1.0);
        }
      }

      holdStruggleTick(isHoldingDown: boolean) {
        if (this.state === "SINKING" && activeSkillState.sk1_armed) {
          activeSkillState.sk1_holding = true;
          if (statusEl) statusEl.innerText = "🌀 Chân Không Trấn Hải: Mồi đứng yên ẩn mình!";
        } else if (this.state === "STRUGGLING" && this.caughtFish && this.caughtFish.hp > 0) {
            if (isHoldingDown) {
                this.lineTension += (activeSkillState.sk3_armorBuff ? 0.3 : 0.6);
                this.struggleIdleTime = 0;
                if (statusEl) {
                    statusEl.innerText = `⚠️ Đang ghì chặt cá! Căng dây: ${Math.round(this.lineTension)}% (Nhớ TAP để giật!)`;
                    statusEl.style.color = "#FF9800";
                }
            } else {
                this.lineTension = Math.max(0, this.lineTension - 0.8);
                this.struggleIdleTime += 1.5;
                if (statusEl) {
                    statusEl.innerText = `🎣 Cá đang bơi kéo trôi đi! Hãy ghì giữ và TAP!`;
                    statusEl.style.color = "#F44336";
                }
            }
        }
      }

      applyStruggleDamage(multiplier: number) {
        const pCount = (window as any).roomPlayerCount || 1;
        const playerBuffBonus = 1 + (pCount - 1) * 0.05;

        // --- PHÂN BỔ TỈ LỆ ROLL SỐ (1-3: 70%, 4: 20%, 5: 10%) ---
        const rollWeight = Math.random() * 100;
        let randomTapVal = 1;
        if (rollWeight < 70) {
          randomTapVal = Math.floor(Math.random() * 3) + 1; // Ra 1, 2 hoặc 3 (70%)
        } else if (rollWeight < 90) {
          randomTapVal = 4; // Ra 4 (20%)
        } else {
          randomTapVal = 5; // Ra 5 (10%)
        }

        let hitDamage = multiplier * currentRodDamageBuff * playerBuffBonus * randomTapVal;
        
        // Mồi quái vật x2 damage
        if (this.baitPrice >= 1000000000) {
          hitDamage *= 2.0;
        }

        // Nếu là kéo phụ (assisting/joint), giảm 50% dame
        if (this.isJointPulling || this.isAssistingOpponent) {
          hitDamage *= 0.5;
        }

        let actualCritChance = 0.10 + ((pCount > 1) ? 0.05 * (pCount - 1) : 0); // Cố định 10% crit (+5% mỗi người chơi thêm)
        const isCrit = Math.random() < actualCritChance;

        if (isCrit) {
          hitDamage *= 2; // X2 sát thương khi chí mạng
        }

        if (this.caughtFish && this.caughtFish.hp > 0) {
            this.caughtFish.hp -= hitDamage;
            if (this.caughtFish.hp < 0) this.caughtFish.hp = 0;
            this.tapProgress = 100 - (this.caughtFish.hp / this.caughtFish.maxHp) * 100;
            
            if (roomChannelRef.current) {
                roomChannelRef.current.send({
                  type: "broadcast",
                  event: "boss_damage",
                  payload: { fishId: this.caughtFish.id, damage: hitDamage },
                });
            }

            if (this.caughtFish.hp <= 0 && !this.isAssistingOpponent) {
                this.state = "REELING_HORIZ";
                this.lineTension = 0;
                setBossUI(null);
                if (statusEl) {
                  statusEl.innerText = `Đã khuất phục được cá! Thu dây lên xuồng...`;
                  statusEl.style.color = "#FFEB3B";
                }
            }
        }

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
          if (powerContainer) powerContainer.style.width = this.power + "%";
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
          if (!activeSkillState.sk1_holding) {
            const baitSpeedBonus = 1.0 + (Math.log10(this.baitPrice + 1) * 0.18);
            this.y += Math.min(4.2, (1.2 + this.baitPrice / 15000000) * baitSpeedBonus);
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
                    detail: { title: "🤝 KÉO CHUNG NỐI DÂY!", message: "Bạn đã móc câu trợ giúp đồng đội (Chia 7/3 hoặc đều Boss, Dame -50%)!", type: "coop" },
                  })
                );
                break;
              }
            }
          }

          for (let f of fishes) {
            if (f.isCaught || f.isWaitingForWave) continue;

            if (activeSkillState.sk5_ignoreSmall && f.layer === "top") {
              continue;
            }

            // --- QUY LUẬT ĂN MỒI CHUẨN XÁC ---
            const isBoss = f.layer === "boss";
            const isBigFish = f.layer === "bottom" || f.fishData.isRare;

            if (isBoss) {
              if (this.baitPrice < 1000000000) continue; // Boss chỉ ăn Mồi Quái Vật
            } else if (isBigFish) {
              if (this.baitPrice < 100000000) continue; // Cá lớn chỉ ăn từ Mồi Xịn trở lên
            }
            // Cá nhỏ ăn tất cả loại mồi

            // --- HITBOX & TỈ LỆ HỤT MỒI THEO VỊ TRÍ ---
            let fishCenterX = f.x;
            let fishCenterY = f.y;
            let fishRadius = Math.max(16, f.size * 0.45);

            let dist = Math.sqrt(Math.pow(this.x - fishCenterX, 2) + Math.pow(this.y - fishCenterY, 2));
            if (dist < fishRadius) {
              let mouthX = f.direction === 1 ? f.x + f.size * 0.7 : f.x - f.size * 0.7;
              let headX = f.direction === 1 ? f.x + f.size * 0.4 : f.x - f.size * 0.4;

              let distToMouth = Math.abs(this.x - mouthX);
              let distToHead = Math.abs(this.x - headX);

              let missChance = 0.10; // Mặc định miệng/thân: 10% hụt
              if (distToMouth < 14) {
                missChance = 0.10; // Ngay miệng: 10% hụt
              } else if (distToHead < 18) {
                missChance = 0.50; // Trúng đầu: 50% hụt
              }

              if (Math.random() < missChance) {
                window.dispatchEvent(
                  new CustomEvent("showPopupBanner", {
                    detail: { title: "💨 MỒI BỊ ĂN MẤT!", message: `Mồi bị ${f.fishData.vnName} ăn mất r! Rút dây lên thôi!`, type: "beerus" },
                  })
                );
                this.state = "REELING_HORIZ";
                break;
              }

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
          if (this.lineTension >= 100) {
            this.state = "IDLE";
            if (statusEl) {
              statusEl.innerText = "💥 Ghì quá căng làm đứt dây mất tiêu!";
              statusEl.style.color = "#F44336";
            }
            window.dispatchEvent(
              new CustomEvent("showPopupBanner", {
                detail: { title: "💥 ĐỨT DÂY MẤT TIÊU!", message: "Ní ghì quá căng khiến dây câu chịu không nổi!", type: "beerus" },
              })
            );
            if (this.caughtFish) this.caughtFish.isCaught = false;
            this.reset();
            return;
          }

          if (this.struggleIdleTime > 250) {
            this.state = "IDLE";
            if (statusEl) {
              statusEl.innerText = "💨 Không ghì giữ nên cá đã bơi tuột mất!";
              statusEl.style.color = "#F44336";
            }
            window.dispatchEvent(
              new CustomEvent("showPopupBanner", {
                detail: { title: "💨 TUỘT MẤT CÁ!", message: "Ní bỏ lỏng không ghì giữ nên cá đã sổng mất tiêu!", type: "beerus" },
              })
            );
            if (this.caughtFish) this.caughtFish.isCaught = false;
            this.reset();
            return;
          }
          
          if (this.caughtFish) {
             setBossUI({
                 name: this.caughtFish.fishData.vnName,
                 hpPercent: Math.max(0, (this.caughtFish.hp / this.caughtFish.maxHp) * 100),
                 weightText: this.caughtFish.layer === "boss" ? `${this.caughtFish.weight} Tấn` : `${this.caughtFish.weight}kg`
             });
          }

        } else if (this.state === "REELING_HORIZ") {
          if (bottomTimer) {
            clearTimeout(bottomTimer);
            bottomTimer = null;
          }
          let dx = rodTipX - this.x;
          let speed = this.caughtFish ? 8 : 15;
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
          let speed = 30;
          if (Math.abs(dy) < speed) {
            if (this.caughtFish) {
              let earnedPoints = this.caughtFish.points;
              const currentFish = this.caughtFish.fishData;
              let wTxt = currentFish.layer === "boss" ? `${this.caughtFish.weight} Tấn` : `${this.caughtFish.weight}kg`;
              if (selectedRod === "cancauvectorvang.png") earnedPoints *= 2;

              if (roomChannelRef.current) {
                roomChannelRef.current.send({
                  type: "broadcast",
                  event: "catch_alert",
                  payload: { user_id: user.id, fishName: currentFish.vnName, weightText: wTxt, points: earnedPoints },
                });
              }

              setMyCatchNotice({
                text: currentFish.vnName,
                amount: `+${earnedPoints.toLocaleString()}🪙`,
                show: true,
              });
              setTimeout(() => setMyCatchNotice(null), 3500);

              setCenterCatchNotice({
                text: `${currentFish.vnName} (${wTxt})`,
                show: true,
              });
              setTimeout(() => setCenterCatchNotice(null), 3500);

              if (currentFish.isRare || currentFish.layer === "boss") {
                window.dispatchEvent(
                  new CustomEvent("showPopupBanner", {
                    detail: {
                      title: `🏆 KÉO ĐƯỢC ${currentFish.vnName.toUpperCase()}!`,
                      message: `Nặng ${wTxt} | +${earnedPoints.toLocaleString()} Điểm!`,
                      type: "rare",
                    },
                  })
                );
              }

              syncScoreToSupabase(((window as any).currentGameScore ?? 1000) + earnedPoints);
              let idx = fishes.indexOf(this.caughtFish);
              if (idx > -1) {
                fishes.splice(idx, 1);
                if (currentFish.layer !== "boss") {
                    fishes.push(new Fish());
                }
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
        this.lineTension = 20;
        this.tapProgress = 0;

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

        if (fish.hp === 0) {
          this.state = "REELING_HORIZ";
          if (statusEl) {
            statusEl.innerText = `Câu được ${fish.fishData.vnName} (${fish.weight}kg)! Thu dây tự động...`;
            statusEl.style.color = "#FFEB3B";
          }
        } else {
          this.state = "STRUGGLING";
          let wTxt = fish.layer === "boss" ? `${fish.weight} Tấn` : `${fish.weight}kg`;
          if (statusEl) {
            statusEl.innerText = `Dính ${fish.fishData.vnName} (${wTxt})! GIỮ (GHÌ) để không trôi - TAP để giật!`;
            statusEl.style.color = "#FF5252";
          }
          setBossUI({
             name: fish.fishData.vnName,
             hpPercent: 100,
             weightText: wTxt
          });
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
          
          if (this.state === "STRUGGLING") {
              ctx!.strokeStyle = isHolding ? "#FFEB3B" : "#FF5252";
          } else {
              ctx!.strokeStyle = "rgba(255,255,255,0.95)";
          }
          
          ctx!.lineWidth = 1.5;
          ctx!.stroke();
          this.drawHookAndBait(drawX, drawY);
        }

        if (this.state === "STRUGGLING" || this.isAssistingOpponent) {
          const barW = 60;
          const barH = 6;
          const barX = drawX - barW / 2;
          
          const tensionY = drawY - 45;
          ctx!.fillStyle = "rgba(0,0,0,0.6)";
          ctx!.fillRect(barX, tensionY, barW, barH);
          const tensionRatio = Math.min(1, this.lineTension / 100);
          ctx!.fillStyle = this.lineTension > 80 ? "#F44336" : "#FFEB3B";
          ctx!.fillRect(barX, tensionY, barW * tensionRatio, barH);
          ctx!.strokeStyle = "#FFFFFF";
          ctx!.lineWidth = 1;
          ctx!.strokeRect(barX, tensionY, barW, barH);
          
          const progY = drawY - 35;
          ctx!.fillStyle = "rgba(0,0,0,0.6)";
          ctx!.fillRect(barX, progY, barW, barH);
          const progRatio = Math.min(1, this.tapProgress / 100);
          ctx!.fillStyle = "#4CAF50";
          ctx!.fillRect(barX, progY, barW * progRatio, barH);
          ctx!.strokeStyle = "#FFFFFF";
          ctx!.lineWidth = 1;
          ctx!.strokeRect(barX, progY, barW, barH);
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

    if ((window as any).isHost) {
      for (let i = 0; i < 20; i++) {
        fishes.push(new Fish("top", computedWaterY + 15 + ((waterHeight * 0.28) / 20) * i));
      }
      for (let i = 0; i < 10; i++) {
        fishes.push(new Fish("mid", computedWaterY + waterHeight * 0.32 + ((waterHeight * 0.35) / 10) * i));
      }
      for (let i = 0; i < 2; i++) {
        fishes.push(new Fish("bottom", computedWaterY + waterHeight * 0.7 + ((waterHeight * 0.22) / 2) * i));
      }
      
      setInterval(() => {
          if (Math.random() < 0.1 && !fishes.some(f => f.layer === "boss")) {
              fishes.push(new Fish("boss", computedWaterY + waterHeight * 0.5));
          }
      }, 60000);
    }

    const syncFishesListener = (e: any) => {
      if (!(window as any).isHost && e.detail) {
        const rawList = e.detail;
        const updatedIds = new Set();
        rawList.forEach((data: any) => {
            updatedIds.add(data.id);
            const existingFish = fishes.find(f => f.id === data.id);
            if (existingFish) {
                existingFish.x = data.x;
                existingFish.y = data.y;
                existingFish.direction = data.direction;
                if (!existingFish.isCaught) existingFish.hp = data.hp;
            } else {
                fishes.push(new Fish(undefined, undefined, undefined, data));
            }
        });
        
        for (let i = fishes.length - 1; i >= 0; i--) {
            if (!updatedIds.has(fishes[i].id) && !fishes[i].isCaught) {
                fishes.splice(i, 1);
            }
        }
      }
    };
    window.addEventListener("receivedSyncFishes", syncFishesListener);

    const hook = new Hook();
    let activeBaitCost = selectedBait.cost;
    const updateBaitCostListener = (e: any) => {
      activeBaitCost = e.detail;
    };
    window.addEventListener("changeBait", updateBaitCostListener);

    const coopDamageListener = (e: any) => {
      if (hook.state === "STRUGGLING") {
        hook.isJointPulling = true;
      }
    };
    window.addEventListener("receivedCoopDamage", coopDamageListener);

    let isHolding = false;
    let holdClientX = canvas.width / 2;

    const handleDown = (clientX: number) => {
      isHolding = true;
      if (hook.state === "STRUGGLING" || hook.isAssistingOpponent) {
        hook.tapStruggle();
      } else if (hook.state === "IDLE") {
        holdClientX = clientX;
        hook.startCharging(activeBaitCost);
      }
    };

    const handleMove = (clientX: number) => {
      if (isHolding && hook.state === "CHARGING") holdClientX = clientX;
    };

    const handleUp = () => {
      isHolding = false;
      if (hook.state === "CHARGING") {
        if (powerContainer) powerContainer.style.display = "none";
        hook.releaseCharging(holdClientX);
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
        let countInCluster = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < countInCluster; i++) {
          const randomDecor = loadedDecorImages[Math.floor(Math.random() * loadedDecorImages.length)];
          let isWeed = randomDecor.filename.includes("rongbien") || randomDecor.filename.includes("taobien");
          let w = 45 + Math.random() * 45;
          let h = 40 + Math.random() * 40;
          if (randomDecor.filename.includes("sanho")) { w = 70; h = 55; }
          if (randomDecor.filename.includes("dabien")) { w = 65; h = 50; }
          let offsetX = cx + (Math.random() - 0.5) * 50;
          let itemY = height - h - Math.random() * 10;
          placedDecorations.push({ imgObj: randomDecor, x: offsetX, y: itemY, width: w, height: h, isWeed, swayOffset: Math.random() * Math.PI * 2 });
          if (randomDecor.filename.includes("dabien")) {
            for (let b = 0; b < 3; b++) {
              bubbles.push({
                x: offsetX + w * 0.5 + (Math.random() - 0.5) * 20,
                y: itemY + Math.random() * 15,
                radius: Math.random() * 2.5 + 1,
                speed: Math.random() * 0.5 + 0.2,
                alpha: Math.random() * 0.5 + 0.3,
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
        ctx!.fillStyle = p.text === "⚡ CRIT!" ? "#FFD700" : "#FFF";
        ctx!.strokeStyle = "#000000";
        ctx!.lineWidth = p.text === "⚡ CRIT!" ? 3 : 2;
        ctx!.strokeText(p.text, p.x, p.y);
        ctx!.fillText(p.text, p.x, p.y);
        ctx!.restore();
      }
    }

    let lastBroadcastTime = 0;
    let syncTimer = 0;
    let animationFrameId: number;

    function gameLoop() {
      ctx!.clearRect(0, 0, width, height);
      drawBackground();

      if ((window as any).isHost && roomChannelRef.current) {
        syncTimer++;
        if (syncTimer > 30) {
          syncTimer = 0;
          const fishPayload = fishes.map(f => ({
            id: f.id,
            x: f.x,
            y: f.y,
            vx: f.speed,
            direction: f.direction,
            size: f.size,
            points: f.points,
            weight: f.weight,
            hp: f.hp,
            maxHp: f.maxHp,
            layer: f.layer,
            filename: f.fishData.filename
          }));
          roomChannelRef.current.send({
            type: "broadcast",
            event: "sync_fishes",
            payload: { fishes: fishPayload }
          });
        }
      }

      for (let f of fishes) {
        f.update();
        f.draw();
      }
      
      hook.holdStruggleTick(isHolding);
      
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
      window.removeEventListener("receivedSyncFishes", syncFishesListener);
      window.removeEventListener("syncBossDamage", syncBossDamageListener);
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
    { cost: 200000, filename: "cagia.png", label: "Mồi Thường - 200,000🪙" },
    { cost: 1000000, filename: "giun.png", label: "Mồi Tiêu Chuẩn - 1,000,000🪙" },
    { cost: 5000000, filename: "moi.png", label: "Mồi Khá - 5,000,000🪙" },
    { cost: 10000000, filename: "tom.png", label: "Mồi Thơm - 10,000,000🪙" },
    { cost: 100000000, filename: "dragon-ball-4.png", label: "Mồi Xịn - 100,000,000🪙" },
    { cost: 500000000, filename: "kiblue.png", label: "Mồi Cao Cấp - 500,000,000🪙" },
    { cost: 1000000000, filename: "hakai.png", label: "Mồi Quái Vật - 1,000,000,000🪙" },
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

        {/* THÔNG BÁO CÁ NHỎ GỌN Ở GIỮA TRÊN */}
        {centerCatchNotice && centerCatchNotice.show && (
          <div className="absolute left-1/2 -translate-x-1/2 top-1.5 z-40 bg-slate-900/90 border border-amber-400/60 px-2.5 py-0.5 rounded-md shadow-lg pointer-events-none flex items-center gap-1 animate-fadeIn">
            <span className="text-[9px]">🎣</span>
            <span className="text-[9px] font-black text-amber-300">{centerCatchNotice.text}</span>
          </div>
        )}

        <div className="flex items-center space-x-1">
          <div className="relative">
            <button
              onClick={() => setIsSkillDropdownOpen(!isSkillDropdownOpen)}
              className="bg-slate-900/95 hover:bg-slate-800 border border-cyan-500/70 px-2.5 py-1 rounded-md shadow-2xl flex items-center space-x-1 text-cyan-300 text-[8px] sm:text-[9px] font-black cursor-pointer transition select-none"
            >
              <span>⚡</span>
              <span>Kỹ Năng</span>
              <span>{isSkillDropdownOpen ? "▲" : "▼"}</span>
            </button>
            {isSkillDropdownOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-slate-950/98 border-2 border-cyan-500 rounded-xl shadow-2xl overflow-hidden z-50 p-1.5 space-y-1 backdrop-blur-md">
                <div className="px-2 py-1 text-[8px] font-black text-cyan-400 uppercase border-b border-slate-800 flex justify-between">
                  <span>Kho Kỹ Năng</span>
                  <span>Chọn để dùng</span>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                  {fishingSkills.map((sk) => {
                    const count = inventory[sk.id] || 0;
                    const coolEnd = skillCooldowns[sk.id] || 0;
                    const isCooling = Date.now() < coolEnd;
                    return (
                      <button
                        key={sk.id}
                        onClick={() => handleUseSkill(sk.id)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-black transition cursor-pointer flex items-center justify-between ${
                          count > 0 && !isCooling ? "bg-slate-900 text-cyan-300 hover:bg-slate-800" : "bg-slate-950 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 truncate">
                          <span>{sk.icon}</span>
                          <span className="truncate">{sk.name}</span>
                        </div>
                        <span className="text-[8px] bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded-full">
                          {isCooling ? "⌛" : `x${count}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setIsBaitDropdownOpen(!isBaitDropdownOpen)}
              className="bg-slate-900/95 hover:bg-slate-800 border border-amber-500/70 px-2 py-1 rounded-md shadow-2xl flex items-center space-x-1 text-amber-300 text-[8px] sm:text-[9px] font-black cursor-pointer transition select-none"
            >
              <span>🪱</span>
              <span className="truncate max-w-[90px] sm:max-w-[120px]">{selectedBait.name}</span>
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
            {isFullscreen ? "🗗" : "🖵"}
          </button>
        </div>
      </div>

      {oppAlert && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-emerald-500/90 text-white px-3 py-1 rounded-lg font-black text-[10px] shadow-lg animate-bounce border border-emerald-300 pointer-events-none">
          {oppAlert}
        </div>
      )}
      
      {bossUI && (
        <div className={`absolute bottom-20 right-4 w-64 sm:w-72 bg-slate-950/95 border-2 p-3 rounded-2xl backdrop-blur-md z-30 shadow-xl animate-fade-in ${bossUI.name.includes("Thượng Cổ") ? 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.5)]' : 'border-amber-500'}`}>
          <div className="flex justify-between items-center text-[10px] sm:text-xs font-black mb-1.5 text-white">
            <span className="truncate max-w-[120px]">{bossUI.name.includes("Thượng Cổ") ? '👑' : '⚠️'} {bossUI.name}</span>
            <span className="text-yellow-300">{bossUI.weightText}</span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-600">
            <div className={`h-full transition-all duration-200 ${bossUI.name.includes("Thượng Cổ") ? 'bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400' : 'bg-gradient-to-r from-amber-500 to-yellow-300'}`} style={{ width: `${bossUI.hpPercent}%` }} />
          </div>
          <div className="text-right text-[9px] text-slate-400 mt-1 font-bold">{Math.round(bossUI.hpPercent)}% HP</div>
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