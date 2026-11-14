"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// --- HỆ THỐNG CLASS & SKILL ĐẶC SẮC (DRAGON BALL STYLE) ---
type FishClassType = "ASSASSIN" | "TANKER" | "MAGE" | "WARRIOR" | "BOSS";

interface FishSkill {
  id: string;
  name: string;
  classType: FishClassType;
  category: "dash" | "combo" | "projectile" | "buff" | "ultimate";
  powerMult: number;
  vfx: "slash" | "lightning" | "poison" | "meteor" | "beam" | "whirlpool" | "shield" | "bite";
  color: string;
  desc: string;
}

const CLASS_META: Record<
  FishClassType,
  { label: string; icon: string; color: string; badgeBg: string; hpBonus: number; atkBonus: number }
> = {
  ASSASSIN: {
    label: "Sát Thủ",
    icon: "⚡",
    color: "#38bdf8",
    badgeBg: "bg-sky-500/20 text-sky-300 border-sky-400/50",
    hpBonus: 0.92,
    atkBonus: 1.18,
  },
  TANKER: {
    label: "Đỡ Đòn",
    icon: "🛡️",
    color: "#4ade80",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-400/50",
    hpBonus: 1.25,
    atkBonus: 0.9,
  },
  MAGE: {
    label: "Pháp Sư",
    icon: "🔮",
    color: "#c084fc",
    badgeBg: "bg-purple-500/20 text-purple-300 border-purple-400/50",
    hpBonus: 0.96,
    atkBonus: 1.15,
  },
  WARRIOR: {
    label: "Đấu Sĩ",
    icon: "⚔️",
    color: "#fb923c",
    badgeBg: "bg-orange-500/20 text-orange-300 border-orange-400/50",
    hpBonus: 1.08,
    atkBonus: 1.08,
  },
  BOSS: {
    label: "Thượng Cổ",
    icon: "👑",
    color: "#f43f5e",
    badgeBg: "bg-rose-500/20 text-rose-300 border-rose-400/50",
    hpBonus: 1.35,
    atkBonus: 1.25,
  },
};

const CLASS_SKILL_POOLS: Record<FishClassType, FishSkill[]> = {
  ASSASSIN: [
    { id: "asn_1", name: "Ảnh Phân Thân Trảm", classType: "ASSASSIN", category: "combo", powerMult: 1.45, vfx: "slash", color: "#38bdf8", desc: "Tốc biến 3 hướng chém liên hoàn" },
    { id: "asn_2", name: "Mũi Khoan Tốc Độ", classType: "ASSASSIN", category: "dash", powerMult: 1.35, vfx: "slash", color: "#0ea5e9", desc: "Lao xuyên mục tiêu như tia chớp" },
    { id: "asn_3", name: "Phi Tiêu Vây Bạc", classType: "ASSASSIN", category: "projectile", powerMult: 1.25, vfx: "slash", color: "#bae6fd", desc: "Phóng 3 luồng kiếm khí sắc lẹm" },
    { id: "asn_4", name: "Sát Ý Bùng Nổ", classType: "ASSASSIN", category: "buff", powerMult: 1.4, vfx: "lightning", color: "#7dd3fc", desc: "Tăng 40% sát thương & hồi 30 Ki" },
    { id: "asn_5", name: "Tuyệt Kỹ: Vô Ảnh Trảm", classType: "ASSASSIN", category: "ultimate", powerMult: 2.55, vfx: "slash", color: "#38bdf8", desc: "Chém nát không gian toàn màn hình" },
  ],
  TANKER: [
    { id: "tnk_1", name: "Thiết Giáp Húc Văng", classType: "TANKER", category: "dash", powerMult: 1.3, vfx: "shield", color: "#4ade80", desc: "Lấy thịt đè người húc bay đối thủ" },
    { id: "tnk_2", name: "Hồi Phục Biển Sâu", classType: "TANKER", category: "buff", powerMult: 1.2, vfx: "shield", color: "#22c55e", desc: "Hồi 15% máu tối đa & tăng giáp" },
    { id: "tnk_3", name: "Sóng Âm Trấn Áp", classType: "TANKER", category: "projectile", powerMult: 1.25, vfx: "whirlpool", color: "#86efac", desc: "Phát sóng chấn động đẩy lùi kẻ địch" },
    { id: "tnk_4", name: "Tuyệt Kỹ: Đại Sơn Áp Đỉnh", classType: "TANKER", category: "ultimate", powerMult: 2.4, vfx: "meteor", color: "#4ade80", desc: "Triệu hồi núi đá ngầm đè bẹp địch" },
  ],
  MAGE: [
    { id: "mag_1", name: "Cầu Lửa Huyết Long", classType: "MAGE", category: "projectile", powerMult: 1.4, vfx: "beam", color: "#f43f5e", desc: "Bắn 3 quả cầu rồng lửa rực cháy" },
    { id: "mag_2", name: "Lôi Điện Giáng Thế", classType: "MAGE", category: "projectile", powerMult: 1.45, vfx: "lightning", color: "#c084fc", desc: "Gọi tia sét đánh thẳng đầu đối thủ" },
    { id: "mag_3", name: "Tụ Khí Nguyên Thần", classType: "MAGE", category: "buff", powerMult: 1.45, vfx: "beam", color: "#e879f9", desc: "Hồi ngay 35 Ki & cường hóa phép" },
    { id: "mag_4", name: "Tuyệt Kỹ: Kamehameha Thủy Long", classType: "MAGE", category: "ultimate", powerMult: 2.65, vfx: "beam", color: "#c084fc", desc: "Chưởng rồng năng lượng hủy diệt" },
  ],
  WARRIOR: [
    { id: "war_1", name: "Cuồng Nộ Xé Xác", classType: "WARRIOR", category: "combo", powerMult: 1.5, vfx: "bite", color: "#fb923c", desc: "Cắn xé liên hoàn 3 nhịp đẫm máu" },
    { id: "war_2", name: "Long Hổ Xung Kích", classType: "WARRIOR", category: "dash", powerMult: 1.45, vfx: "slash", color: "#f97316", desc: "Húc thẳng trực diện phá vỡ phòng thủ" },
    { id: "war_3", name: "Gầm Thét Bá Vương", classType: "WARRIOR", category: "buff", powerMult: 1.45, vfx: "beam", color: "#fdba74", desc: "Tăng 45% công & kích hoạt Siêu Saiyan" },
    { id: "war_4", name: "Tuyệt Kỹ: Bá Vương Trảm", classType: "WARRIOR", category: "ultimate", powerMult: 2.6, vfx: "slash", color: "#fb923c", desc: "Nhát chém hoàng kim nứt vỡ mặt kính" },
  ],
  BOSS: [
    { id: "boss_1", name: "Thiên Thạch Vực Sâu", classType: "BOSS", category: "ultimate", powerMult: 2.75, vfx: "meteor", color: "#f43f5e", desc: "Mưa thiên thạch cổ đại hủy diệt" },
    { id: "boss_2", name: "Đại Hồng Thủy Xoáy", classType: "BOSS", category: "ultimate", powerMult: 2.7, vfx: "whirlpool", color: "#22d3ee", desc: "Nuốt chửng mọi thứ vào tâm bão" },
  ],
};

function detectFishClass(filename: string, vnName = ""): FishClassType {
  const key = `${filename || ""} ${vnName || ""}`.toLowerCase();
  if (key.includes("livyatan") || key.includes("megalodon") || key.includes("mosa")) return "BOSS";
  if (key.includes("chim") || key.includes("ngu") || key.includes("daubua") || key.includes("satthu") || key.includes("loc")) return "ASSASSIN";
  if (key.includes("taituong") || key.includes("basa") || key.includes("tra") || key.includes("nhamvoi") || key.includes("nhatan") || key.includes("tre")) return "TANKER";
  if (key.includes("huyetlong") || key.includes("chep") || key.includes("lahan") || key.includes("duoi") || key.includes("muc")) return "MAGE";
  return "WARRIOR";
}

function rollRandomFishSkills(filename: string, vnName = "", deterministic = false): { fishClass: FishClassType; skills: FishSkill[] } {
  const fishClass = detectFishClass(filename, vnName);
  const pool = [...CLASS_SKILL_POOLS[fishClass]];
  if (!deterministic) {
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }
  return { fishClass, skills: pool.slice(0, 4) };
}

function ensureFishSkills(fish: any): { fishClass: FishClassType; skills: FishSkill[] } {
  if (fish?.fishClass && Array.isArray(fish?.skills) && fish.skills.length > 0) {
    return { fishClass: fish.fishClass, skills: fish.skills };
  }
  return rollRandomFishSkills(fish?.filename || "", fish?.vnName || fish?.name || "");
}

type FishTier = "NONG" | "TRUNG" | "LON" | "BOSS";

interface DbFishSpecies {
  name: string;
  filename: string;
  tier: FishTier;
  minWeight: number;
  maxWeight: number;
  fishClass?: FishClassType;
  quotes: string[];
}

const TIER_META: Record<FishTier, { label: string; minW: number; maxW: number; badge: string }> = {
  NONG: { label: "Tầng Nông", minW: 1.0, maxW: 50.0, badge: "🌿 Tầng Nông (1–50kg)" },
  TRUNG: { label: "Tầng Trung", minW: 50.1, maxW: 200.0, badge: "🌊 Tầng Trung (50–200kg)" },
  LON: { label: "Tầng Cá Lớn", minW: 200.1, maxW: 10000.0, badge: "🔥 Tầng Lớn (200kg–10 tấn)" },
  BOSS: { label: "Boss Thượng Cổ", minW: 20000.0, maxW: 200000.0, badge: "👑 Boss (20–200 tấn)" },
};

const ALL_FISH_DATABASE: DbFishSpecies[] = [
  { name: "Cá Rô Đồng", filename: "carodong.png", tier: "NONG", minWeight: 1.0, maxWeight: 12.0, quotes: ["Nhỏ nhưng có võ!", "Vây gai đâm thấu xương!"] },
  { name: "Cá Diêu Hồng", filename: "cadieuhong.png", tier: "NONG", minWeight: 3.0, maxWeight: 22.0, quotes: ["Ánh hồng rực rỡ!", "Xem ta quất đuôi nè!"] },
  { name: "Cá Lóc Bông", filename: "calocbong.png", tier: "NONG", minWeight: 8.0, maxWeight: 48.0, fishClass: "ASSASSIN", quotes: ["Tập kích chớp nhoáng!", "Hàm răng sắc lẹm!"] },
  { name: "Cá Chép Vàng", filename: "cachepvang.png", tier: "NONG", minWeight: 5.0, maxWeight: 38.0, fishClass: "MAGE", quotes: ["Vượt vũ môn hóa rồng!", "Thủy cầu ma pháp!"] },
  { name: "Cá Mập Trắng", filename: "camaptrang.png", tier: "LON", minWeight: 450.0, maxWeight: 3200.0, fishClass: "WARRIOR", quotes: ["Hàm răng thép!", "Cuồng nộ xé xác!"] },
  { name: "Cá Huyết Long", filename: "cahuyetlong.png", tier: "TRUNG", minWeight: 65.0, maxWeight: 170.0, fishClass: "MAGE", quotes: ["Cầu lửa huyết long!", "Long uy chấn nhiếp!"] },
  { name: "Cá Voi Sát Thủ", filename: "cavoisatthu.png", tier: "LON", minWeight: 1500.0, maxWeight: 6500.0, fishClass: "ASSASSIN", quotes: ["Tốc độ ánh sáng!", "Đoạt mệnh ám ảnh!"] },
  { name: "Cá Tai Tượng Khổng Lồ", filename: "cataituong.png", tier: "TRUNG", minWeight: 55.0, maxWeight: 145.0, fishClass: "TANKER", quotes: ["Lấy thịt đè người!", "Giáp vảy kim cương!"] },
  { name: "Megalodon Sơ Cổ", filename: "megalodon.png", tier: "BOSS", minWeight: 20000.0, maxWeight: 85000.0, fishClass: "BOSS", quotes: ["Thiên thạch giáng thế!", "Húc một phát nứt kính!"] },
];

function detectFishTier(fish: any): FishTier {
  if (fish?.tier && ["NONG", "TRUNG", "LON", "BOSS"].includes(fish.tier)) return fish.tier;
  const w = Number(fish?.weight || fish?.currentWeight || 2.0);
  if (w <= 50) return "NONG";
  if (w <= 200) return "TRUNG";
  if (w <= 15000) return "LON";
  return "BOSS";
}

function formatFishWeight(w: number): string {
  const num = Number(w || 0);
  if (num >= 1000) return `${(num / 1000).toFixed(1)} tấn`;
  return `${num} kg`;
}

function calcBalancedCombatStats(weight: number, meta: { hpBonus: number; atkBonus: number }) {
  const safeW = Math.max(1, Number(weight || 1));
  const baseHp = Math.floor(Math.sqrt(safeW) * 180 + 5000);
  const baseAtk = Math.floor(Math.sqrt(safeW) * 12 + 200);
  return {
    maxHp: Math.round(baseHp * meta.hpBonus),
    atk: Math.round(baseAtk * meta.atkBonus),
  };
}

function buildDefaultDemoRoster() {
  const demoSpecies = [
    { name: "Cá Mập Trắng", filename: "camaptrang.png", weight: 450, fishClass: "WARRIOR" as FishClassType, rank: "S" },
    { name: "Cá Huyết Long", filename: "cahuyetlong.png", weight: 120, fishClass: "MAGE" as FishClassType, rank: "A" },
    { name: "Cá Voi Sát Thủ", filename: "cavoisatthu.png", weight: 1500, fishClass: "ASSASSIN" as FishClassType, rank: "SS" },
    { name: "Cá Tai Tượng Khổng Lồ", filename: "cataituong.png", weight: 95, fishClass: "TANKER" as FishClassType, rank: "A" },
    { name: "Cá Lóc Bông", filename: "calocbong.png", weight: 35, fishClass: "ASSASSIN" as FishClassType, rank: "B" },
  ];

  return demoSpecies.map((item, idx) => {
    const rolled = rollRandomFishSkills(item.filename, item.name, true);
    const meta = CLASS_META[item.fishClass];
    const stats = calcBalancedCombatStats(item.weight, meta);
    return {
      id: `demo_fish_${idx}`,
      _source: "aquarium",
      rank: item.rank,
      gender: "♂",
      name: item.name,
      filename: item.filename,
      tier: detectFishTier({ weight: item.weight }),
      fishClass: item.fishClass,
      skills: rolled.skills,
      weight: item.weight,
      maxHp: stats.maxHp,
      atk: stats.atk,
      kiGain: 16,
      auraColor: meta.color,
      scale: 0.92,
      quotes: [`${meta.icon} Hệ ${meta.label} xuất kích!`, `Xem ${rolled.skills[0]?.name} nè!`, "Gồng Ki bùng nổ!"],
    };
  });
}

const supabaseUrl = "https://iaejbvlibjfpdwuqfszp.supabase.co";
const supabaseKey = "sb_publishable_Bf1jY3-FAjFRij0LMn5FLQ_nLrw2MUE";
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

function extractFishFilename(f: any): string {
  const raw =
    f?.filename ||
    f?.file ||
    f?.img ||
    f?.image ||
    f?.src ||
    f?.icon ||
    (typeof f?.name === "string" && /^[a-z0-9_.-]+$/i.test(f.name.trim()) ? f.name.trim() : "");

  if (!raw || typeof raw !== "string") return "camaptrang.png";

  let clean = raw.trim();
  if (clean.startsWith("http") || clean.startsWith("/")) return clean;
  if (!/\.(png|jpg|jpeg|webp|gif|ico|svg)$/i.test(clean)) {
    clean = `${clean}.png`;
  }
  return clean;
}

export default function ArenaCaPage() {
  const [user, setUser] = useState<any>(null);
  const [score, setScore] = useState<number>(0);
  const [rawInventory, setRawInventory] = useState<any>({});
  const [isHardcoreMode, setIsHardcoreMode] = useState<boolean>(false);
  const [battleMode, setBattleMode] = useState<1 | 3 | 5>(5); // Hỗ trợ 1v1, 3v3, 5v5

  // Trạng thái Auto-Farm PvE và PvP Flag
  const [isAutoFarm, setIsAutoFarm] = useState<boolean>(false);
  const [isPvPActive, setIsPvPActive] = useState<boolean>(false);
  const [lastMatchWon, setLastMatchWon] = useState<boolean>(false);

  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [isRoomLobbyOpen, setIsRoomLobbyOpen] = useState<boolean>(false);
  const [roomFishPickerOpen, setRoomFishPickerOpen] = useState<boolean>(false);
  
  // Hồ chờ Multiplayer (1 đến 5 con khác nhau)
  const [roomMyFishList, setRoomMyFishList] = useState<any[]>([]);
  const [roomRivalFishList, setRoomRivalFishList] = useState<any[]>([]);
  const [isMyReady, setIsMyReady] = useState<boolean>(false);
  const [isRivalReady, setIsRivalReady] = useState<boolean>(false);
  const [matchCountdown, setMatchCountdown] = useState<number | null>(null);

  // Kho cá tổng và Đội hình chiến đấu PvE (1 đến 5 con không trùng lặp)
  const [playerRoster, setPlayerRoster] = useState<any[]>(() => buildDefaultDemoRoster());
  const [activeBattleTeam, setActiveBattleTeam] = useState<any[]>(() => buildDefaultDemoRoster().slice(0, 5));
  const [isFishPickerOpen, setIsFishPickerOpen] = useState<boolean>(false);
  const [pickerFilter, setPickerFilter] = useState<"all" | "aquarium" | "fish_inventory">("all");

  const [currentEnemyCfg, setCurrentEnemyCfg] = useState<any>(() => {
    const first = ALL_FISH_DATABASE[0];
    const rolled = rollRandomFishSkills(first.filename, first.name, true);
    const meta = CLASS_META[first.fishClass || rolled.fishClass];
    const stats = calcBalancedCombatStats(450, meta);
    return {
      name: first.name,
      filename: first.filename,
      tier: first.tier,
      isBossBattle: false,
      fishClass: first.fishClass || rolled.fishClass,
      skills: rolled.skills,
      weight: 450,
      maxHp: stats.maxHp,
      atk: stats.atk,
      kiGain: 15,
      quotes: first.quotes,
    };
  });

  const recentEnemyHistoryRef = useRef<string[]>([]);
  const [winStreak, setWinStreak] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fishImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});

  const hudRefs = useRef({
    pDot: null as any,
    pName: null as any,
    pClassBadge: null as any,
    pWeight: null as any,
    pHpBar: null as any,
    pHpText: null as any,
    pKiBar: null as any,
    eDot: null as any,
    eName: null as any,
    eClassBadge: null as any,
    eWeight: null as any,
    eHpBar: null as any,
    eHpText: null as any,
    eKiBar: null as any,
    streakText: null as any,
    playerRosterLabel: null as any,
    ultCutIn: null as any,
    ultCasterName: null as any,
    ultSkillTitle: null as any,
    radarOverlay: null as any,
    resultOverlay: null as any,
    resultBadge: null as any,
    resultSub: null as any,
    pvpActionButtons: null as any,
  });

  const battleRef = useRef({
    width: 800,
    height: 450,
    teamPlayer: [] as any[],
    teamRival: [] as any[],
    shakeTime: 0,
    shakeIntensity: 0,
    hitStopTimer: 0,
    cameraZoom: 1.0,
    screenFlash: 0,
    screenFlashColor: "#ffffff",
    gameOver: false,
    bubbles: [] as any[],
    seaweeds: [] as any[],
    particles: [] as any[],
    shockwaves: [] as any[],
    floatingTexts: [] as any[],
    glassCracks: [] as any[],
    projectiles: [] as any[],
    slashArcs: [] as any[],
    afterimages: [] as any[],
    activeUltVfx: null as any,
    cutInTimer: 0,
  });

  function getCachedFishImage(filename: string) {
    const cleanName = filename || "camaptrang.png";
    if (fishImagesRef.current[cleanName]) return fishImagesRef.current[cleanName];

    const img = new Image();
    const primarySrc =
      cleanName.startsWith("http") || cleanName.startsWith("/")
        ? cleanName
        : `/assets/cauca/${cleanName}`;

    img.onerror = () => {
      if (!img.dataset.retried) {
        img.dataset.retried = "true";
        img.src = "/assets/cauca/camaptrang.png";
      }
    };

    img.src = primarySrc;
    fishImagesRef.current[cleanName] = img;
    return img;
  }

  // --- GHÉP ĐỘI PVE NGẪU NHIÊN TOÀN BỘ, KHÔNG TRÙNG LẶP ---
  function pickRandomDatabaseFish(): DbFishSpecies {
    const history = recentEnemyHistoryRef.current;
    const available = ALL_FISH_DATABASE.filter((f) => !history.includes(f.name));
    const pool = available.length > 0 ? available : ALL_FISH_DATABASE;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    recentEnemyHistoryRef.current = [...history.slice(-3), picked.name];
    return picked;
  }

  function buildRandomEnemyConfig(playerFish: any) {
    const picked = pickRandomDatabaseFish();
    const playerW = Number(playerFish?.weight || 50);
    const minW = Math.max(picked.minWeight, playerW * 0.7);
    const maxW = Math.min(picked.maxWeight * 1.5, 5000);
    const randomWeight = +(minW + Math.random() * (maxW - minW)).toFixed(1);

    const rolled = rollRandomFishSkills(picked.filename, picked.name);
    const finalClass = picked.fishClass || rolled.fishClass;
    const meta = CLASS_META[finalClass];
    const stats = calcBalancedCombatStats(randomWeight, meta);

    return {
      name: picked.name,
      filename: picked.filename,
      tier: picked.tier,
      isBossBattle: picked.tier === "BOSS",
      fishClass: finalClass,
      skills: rolled.skills,
      weight: randomWeight,
      maxHp: stats.maxHp,
      atk: stats.atk,
      kiGain: finalClass === "ASSASSIN" || finalClass === "MAGE" ? 18 : 15,
      quotes: picked.quotes,
    };
  }

  useEffect(() => {
    async function loadUserData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data } = await supabase
          .from("profiles")
          .select("balance, inventory")
          .eq("id", session.user.id)
          .single();

        if (data) {
          const safeBalance = Number(data.balance ?? 0);
          setScore(Number.isNaN(safeBalance) ? 0 : safeBalance);

          const inv = data.inventory || {};
          setRawInventory(inv);

          const aqFishes = (inv.aquarium || []).map((f: any) => ({ ...f, _source: "aquarium" }));
          const bagFishes = (inv.fish_inventory || []).map((f: any) => ({ ...f, _source: "fish_inventory" }));
          const allDbFishes = [...aqFishes, ...bagFishes];

          if (allDbFishes.length === 0) return;

          let needSaveMigratedSkills = false;

          const mappedFishes = allDbFishes.map((f: any, idx: number) => {
            const filename = extractFishFilename(f);
            getCachedFishImage(filename);

            const vnName = f.vnName || f.name || `Cá Cưng ${idx + 1}`;
            const { fishClass, skills } = ensureFishSkills({ ...f, filename, vnName });

            if (!f.fishClass || !Array.isArray(f.skills) || f.skills.length === 0) {
              needSaveMigratedSkills = true;
              f.fishClass = fishClass;
              f.skills = skills;
            }

            const meta = CLASS_META[fishClass];
            const w = Number(f.currentWeight || f.weight || 2.0);
            const stats = calcBalancedCombatStats(w, meta);

            return {
              id: f.id || `fish_${idx}`,
              _source: f._source,
              rawObj: f,
              rank: f.rank || "D",
              gender: f.gender || "",
              name: vnName,
              filename,
              tier: f.tier || detectFishTier({ weight: w }),
              fishClass,
              skills,
              weight: w,
              maxHp: f.arenaHp ? Number(f.arenaHp) : stats.maxHp,
              atk: f.power ? Number(f.power) : stats.atk,
              kiGain: fishClass === "ASSASSIN" || fishClass === "MAGE" ? 18 : 15,
              auraColor: meta.color,
              scale: 0.92,
              quotes: [
                `${meta.icon} Hệ ${meta.label} xuất kích!`,
                `Xem ${skills[0]?.name || "tuyệt chiêu"} nè!`,
                "Gồng Ki bùng nổ!",
              ],
            };
          });

          let finalRoster: any[] = [...mappedFishes];
          if (finalRoster.length < 5) {
            const fillers = buildDefaultDemoRoster().slice(0, 5 - finalRoster.length);
            finalRoster = [...finalRoster, ...fillers];
          }

          setPlayerRoster(finalRoster);
          setActiveBattleTeam(finalRoster.slice(0, battleMode));
          setCurrentEnemyCfg(buildRandomEnemyConfig(finalRoster[0]));

          if (needSaveMigratedSkills) {
            const updatedInv = {
              ...inv,
              aquarium: aqFishes.map(({ _source, ...rest }: any) => rest),
              fish_inventory: bagFishes.map(({ _source, ...rest }: any) => rest),
            };
            setRawInventory(updatedInv);
            await supabase.from("profiles").update({ inventory: updatedInv }).eq("id", session.user.id);
          }
        }
      }
    }
    loadUserData();

    ALL_FISH_DATABASE.forEach((enemy) => {
      getCachedFishImage(enemy.filename);
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const container = containerRef.current;
    const updateSize = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      battleRef.current.width = rect.width || 800;
      battleRef.current.height = rect.height || 450;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(battleRef.current.width * dpr);
      canvas.height = Math.floor(battleRef.current.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initEnvironment();
    };

    window.addEventListener("resize", updateSize);
    updateSize();

    startMatch();

    let lastTime = 0;
    let animId: number;

    const gameLoop = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const rawDt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;

      updateGame(rawDt);
      drawGame(ctx);
      animId = requestAnimationFrame(gameLoop);
    };
    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", updateSize);
    };
  }, [activeBattleTeam, currentEnemyCfg, battleMode]);

  function initEnvironment() {
    const { width, height } = battleRef.current;
    const bs = battleRef.current;
    bs.bubbles = [];
    for (let i = 0; i < 34; i++) {
      bs.bubbles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 2 + Math.random() * 5,
        speed: 0.4 + Math.random() * 1.1,
        wobble: Math.random() * Math.PI * 2,
      });
    }

    bs.seaweeds = [];
    const count = Math.max(6, Math.floor(width / 95));
    for (let i = 0; i < count; i++) {
      bs.seaweeds.push({
        x: (i + 0.5) * (width / count) + (Math.random() - 0.5) * 25,
        segments: 5 + Math.floor(Math.random() * 4),
        segLen: 14 + Math.random() * 8,
        phase: Math.random() * Math.PI * 2,
        hue: 135 + Math.random() * 35,
      });
    }
  }

  function createFish(cfg: any, isPlayer: boolean, index: number, total: number) {
    const width = battleRef.current.width || 800;
    const height = battleRef.current.height || 450;
    // GIẢN RA: Tăng khoảng cách xuất phát hai bên trái/phải rộng rãi hơn
    const startX = isPlayer ? width * 0.18 : width * 0.82;
    const spacing = height / (total + 1);
    const startY = spacing * (index + 1);

    const fishClass: FishClassType = cfg.fishClass || "WARRIOR";
    const meta = CLASS_META[fishClass];
    const skills: FishSkill[] =
      Array.isArray(cfg.skills) && cfg.skills.length > 0
        ? cfg.skills
        : rollRandomFishSkills(cfg.filename, cfg.name).skills;

    return {
      isPlayer,
      id: cfg.id || `${isPlayer ? "P" : "E"}_${index}`,
      _source: cfg._source,
      rank: cfg.rank || "D",
      name: cfg.name,
      filename: cfg.filename,
      fishClass,
      classLabel: `${meta.icon} ${meta.label}`,
      skills,
      activeSkill: null as FishSkill | null,
      weight: cfg.weight,
      maxHp: cfg.maxHp,
      hp: cfg.maxHp,
      atk: cfg.atk,
      kiGain: cfg.kiGain || 15,
      ki: 35 + Math.random() * 15,
      maxKi: 100,
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      homeX: startX,
      homeY: startY,
      dir: isPlayer ? 1 : -1,
      baseScale: cfg.scale || 0.92,
      currentScale: cfg.scale || 0.92,
      auraColor: meta.color,
      quotes: cfg.quotes || [`${meta.icon} ${meta.label} xung trận!`],
      aiState: "CIRCLING",
      aiTimer: 0.8 + Math.random() * 0.6,
      skillCooldown: 2.5 + Math.random() * 2.0,
      comboStep: 0,
      comboMaxSteps: 3,
      comboTimer: 0,
      afterimageTimer: 0,
      powerBuff: 1.0,
      superSaiyan: false,
      swimPhase: Math.random() * Math.PI * 2,
      flashTimer: 0,
      speech: null,
      speechTimer: 0,
      isAlive: true,
    };
  }

  function startMatch(customPTeam?: any[], customRivalTeam?: any[], isPvP = false) {
    setIsPvPActive(isPvP);
    const roster = activeBattleTeam.length > 0 ? activeBattleTeam : buildDefaultDemoRoster().slice(0, battleMode);
    const bs = battleRef.current;

    const countP = customPTeam ? customPTeam.length : battleMode;
    const pTeam = customPTeam || [];
    if (!customPTeam) {
      for (let i = 0; i < countP; i++) {
        pTeam.push(createFish(roster[i % roster.length], true, i, countP));
      }
    }
    bs.teamPlayer = pTeam;

    const countE = customRivalTeam ? customRivalTeam.length : battleMode;
    const eTeam = customRivalTeam || [];
    if (!customRivalTeam) {
      const activeLeader = roster[0];
      for (let i = 0; i < countE; i++) {
        const enemyCfg = i === 0 ? currentEnemyCfg : buildRandomEnemyConfig(activeLeader);
        eTeam.push(createFish(enemyCfg, false, i, countE));
      }
    }
    bs.teamRival = eTeam;

    bs.particles = [];
    bs.shockwaves = [];
    bs.floatingTexts = [];
    bs.glassCracks = [];
    bs.projectiles = [];
    bs.slashArcs = [];
    bs.afterimages = [];
    bs.activeUltVfx = null;
    bs.gameOver = false;
    bs.hitStopTimer = 0;
    bs.shakeTime = 0;
    bs.cameraZoom = 1.0;
    bs.screenFlash = 0;

    if (hudRefs.current.resultOverlay) hudRefs.current.resultOverlay.classList.add("hidden");
    if (hudRefs.current.ultCutIn) hudRefs.current.ultCutIn.classList.add("hidden");

    const leadP = bs.teamPlayer[0];
    const leadE = bs.teamRival[0];
    const pMeta = CLASS_META[leadP.fishClass as FishClassType];
    const eMeta = CLASS_META[leadE.fishClass as FishClassType];

    if (hudRefs.current.pDot) hudRefs.current.pDot.style.backgroundColor = pMeta.color;
    if (hudRefs.current.pClassBadge) hudRefs.current.pClassBadge.textContent = `${pMeta.icon} ${pMeta.label}`;
    if (hudRefs.current.eDot) hudRefs.current.eDot.style.backgroundColor = eMeta.color;
    if (hudRefs.current.eClassBadge) hudRefs.current.eClassBadge.textContent = `${eMeta.icon} ${eMeta.label}`;

    if (hudRefs.current.playerRosterLabel) {
      hudRefs.current.playerRosterLabel.textContent = `Đội hình ${battleMode}v${battleMode} (${bs.teamPlayer.length}/${battleMode})`;
    }

    sayQuote(leadP, leadP.quotes[0]);
    sayQuote(leadE, leadE.quotes[0]);
    updateHUD();
  }

  function scanRandomEnemy() {
    if (isScanning || activeBattleTeam.length === 0) return;
    setIsScanning(true);
    if (hudRefs.current.resultOverlay) hudRefs.current.resultOverlay.classList.add("hidden");
    if (hudRefs.current.radarOverlay) hudRefs.current.radarOverlay.classList.remove("hidden");

    const activePlayerFish = activeBattleTeam[0];

    setTimeout(() => {
      setCurrentEnemyCfg(buildRandomEnemyConfig(activePlayerFish));
      if (hudRefs.current.radarOverlay) hudRefs.current.radarOverlay.classList.add("hidden");
      setIsScanning(false);
      startMatch(undefined, undefined, false);
    }, 900);
  }

  function scanBossEnemy() {
    if (isScanning || activeBattleTeam.length === 0) return;
    setIsScanning(true);
    if (hudRefs.current.resultOverlay) hudRefs.current.resultOverlay.classList.add("hidden");
    if (hudRefs.current.radarOverlay) hudRefs.current.radarOverlay.classList.remove("hidden");

    const activePlayerFish = activeBattleTeam[0];

    setTimeout(() => {
      const bossList = ALL_FISH_DATABASE.filter((f) => f.tier === "BOSS");
      const picked = bossList[Math.floor(Math.random() * bossList.length)] || ALL_FISH_DATABASE[0];
      const randomWeight = +(picked.minWeight + Math.random() * (picked.maxWeight - picked.minWeight)).toFixed(1);
      const rolled = rollRandomFishSkills(picked.filename, picked.name);

      const scaledMaxHp = Math.max(1250, Math.round(activePlayerFish.maxHp * 1.5));
      const scaledAtk = Math.max(125, Math.round(activePlayerFish.atk * 1.2));

      setCurrentEnemyCfg({
        name: picked.name,
        filename: picked.filename,
        tier: "BOSS",
        isBossBattle: true,
        fishClass: "BOSS" as FishClassType,
        skills: rolled.skills,
        weight: randomWeight,
        maxHp: scaledMaxHp,
        atk: scaledAtk,
        kiGain: 18,
        quotes: picked.quotes,
      });

      if (hudRefs.current.radarOverlay) hudRefs.current.radarOverlay.classList.add("hidden");
      setIsScanning(false);
      startMatch(undefined, undefined, false);
    }, 1000);
  }

  // --- MULTIPLAYER ROOM & HỒ CHỜ THẢ CÁ ---
  async function joinMultiplayerRoom(roomId: string) {
    if (!user?.id) {
      alert("Vui lòng đăng nhập để vào phòng đọ cá!");
      return;
    }
    if (activeChannel) {
      activeChannel.unsubscribe();
    }
    setCurrentRoomId(roomId);
    setIsRoomLobbyOpen(false);
    setRoomFishPickerOpen(true);
    setRoomMyFishList([]);
    setRoomRivalFishList([]);
    setIsMyReady(false);
    setIsRivalReady(false);

    const channel = supabase.channel(`arena_${roomId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "fish_action" }, (payload) => {
        const data = payload.payload;
        if (data.type === "UPDATE_FISH_LIST") {
          setRoomRivalFishList(data.fishList || []);
          setIsRivalReady(data.isReady || false);
        } else if (data.type === "SET_READY") {
          setIsRivalReady(data.isReady || false);
        } else if (data.type === "START_MATCH") {
          setRoomFishPickerOpen(false);
          startPvPCountdown(data.rivalFishList);
        } else if (data.type === "REVENGE") {
          setRoomFishPickerOpen(true);
          setIsMyReady(false);
          setIsRivalReady(false);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.send({
            type: "broadcast",
            event: "fish_action",
            payload: { type: "JOIN_ROOM", userId: user.id, name: user.email || "Người chơi" },
          });
        }
      });

    setActiveChannel(channel);
  }

  async function addFishToRoomPool(fish: any) {
    if (roomMyFishList.length >= battleMode) {
      alert(`Chế độ hiện tại (${battleMode}v${battleMode}) chỉ được thả tối đa ${battleMode} con cá xuống hồ chờ!`);
      return;
    }
    if (roomMyFishList.some((f) => f.id === fish.id)) {
      alert("Con cá này đã có trong hồ chờ của bạn rồi!");
      return;
    }
    const newList = [...roomMyFishList, fish];
    setRoomMyFishList(newList);
    setIsMyReady(false);

    if (activeChannel) {
      await activeChannel.send({
        type: "broadcast",
        event: "fish_action",
        payload: {
          type: "UPDATE_FISH_LIST",
          userId: user?.id,
          fishList: newList,
          isReady: false,
        },
      });
    }
  }

  async function removeFishFromRoomPool(fishId: string) {
    const newList = roomMyFishList.filter((f) => f.id !== fishId);
    setRoomMyFishList(newList);
    setIsMyReady(false);

    if (activeChannel) {
      await activeChannel.send({
        type: "broadcast",
        event: "fish_action",
        payload: {
          type: "UPDATE_FISH_LIST",
          userId: user?.id,
          fishList: newList,
          isReady: false,
        },
      });
    }
  }

  async function toggleMyReadyState() {
    if (roomMyFishList.length === 0) {
      alert("Bạn phải thả ít nhất 1 con cá xuống hồ trước khi bấm Sẵn Sàng!");
      return;
    }
    const nextReady = !isMyReady;
    setIsMyReady(nextReady);

    if (activeChannel) {
      await activeChannel.send({
        type: "broadcast",
        event: "fish_action",
        payload: {
          type: "SET_READY",
          userId: user?.id,
          isReady: nextReady,
        },
      });
    }

    if (nextReady && isRivalReady) {
      if (activeChannel) {
        await activeChannel.send({
          type: "broadcast",
          event: "fish_action",
          payload: {
            type: "START_MATCH",
            rivalFishList: roomMyFishList,
          },
        });
      }
      startPvPCountdown(roomMyFishList);
    }
  }

  function startPvPCountdown(rivalFishDataList: any[]) {
    setMatchCountdown(3);
    let count = 3;
    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        setMatchCountdown(count);
      } else {
        clearInterval(timer);
        setMatchCountdown(null);
        setRoomFishPickerOpen(false);

        const pTeam = roomMyFishList.map((f, i) => createFish(f, true, i, roomMyFishList.length));
        const eTeam = rivalFishDataList.map((f, i) => createFish(f, false, i, rivalFishDataList.length));
        startMatch(pTeam, eTeam, true);
      }
    }, 1000);
  }

  async function handlePvPRevenge() {
    if (activeChannel) {
      await activeChannel.send({
        type: "broadcast",
        event: "fish_action",
        payload: { type: "REVENGE", userId: user?.id },
      });
    }
    setRoomFishPickerOpen(true);
    setIsMyReady(false);
    setIsRivalReady(false);
  }

  function leaveMultiplayerRoom() {
    if (activeChannel) {
      activeChannel.send({
        type: "broadcast",
        event: "fish_action",
        payload: { type: "LEAVE_ROOM", userId: user?.id },
      });
      activeChannel.unsubscribe();
      setActiveChannel(null);
    }
    setCurrentRoomId(null);
    setIsRoomLobbyOpen(false);
    setRoomFishPickerOpen(false);
  }

  function sayQuote(fish: any, text: string) {
    fish.speech = text;
    fish.speechTimer = 2.0;
  }

  function triggerShake(intensity: number, duration = 0.25) {
    const bs = battleRef.current;
    bs.shakeIntensity = Math.max(bs.shakeIntensity, intensity);
    bs.shakeTime = Math.max(bs.shakeTime, duration);
  }

  function triggerFlash(color = "#ffffff", alpha = 0.45) {
    battleRef.current.screenFlash = alpha;
    battleRef.current.screenFlashColor = color;
  }

  function spawnFloatingText(x: number, y: number, text: string, color = "#fff", size = 20) {
    battleRef.current.floatingTexts.push({
      x,
      y,
      vy: -65,
      text,
      color,
      size,
      life: 1.0,
      maxLife: 1.0,
    });
  }

  function spawnShockwave(x: number, y: number, color: string, maxRadius = 120) {
    battleRef.current.shockwaves.push({
      x,
      y,
      r: 10,
      maxR: maxRadius,
      color,
      life: 0.5,
      maxLife: 0.5,
    });
  }

  function spawnSlashArc(x: number, y: number, color: string, angle: number) {
    battleRef.current.slashArcs.push({
      x,
      y,
      color,
      angle,
      radius: 50 + Math.random() * 25,
      life: 0.32,
      maxLife: 0.32,
    });
  }

  function spawnParticles(x: number, y: number, color: string, count = 22, speedScale = 1) {
    const bs = battleRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (80 + Math.random() * 220) * speedScale;
      bs.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 3 + Math.random() * 4.5,
        color: Math.random() > 0.3 ? color : "#ffffff",
        life: 0.4 + Math.random() * 0.5,
        maxLife: 0.9,
      });
    }
  }

  function spawnGlassCrack(x: number, y: number) {
    const bs = battleRef.current;
    if (bs.glassCracks.length > 5) bs.glassCracks.shift();
    const lines = [];
    const branches = 7 + Math.floor(Math.random() * 4);
    for (let i = 0; i < branches; i++) {
      const a = (i / branches) * Math.PI * 2 + Math.random() * 0.4;
      const len = 30 + Math.random() * 40;
      lines.push({ x1: x, y1: y, x2: x + Math.cos(a) * len, y2: x + Math.sin(a) * len });
    }
    bs.glassCracks.push({ x, y, lines, alpha: 0.85 });
  }

  function decideNextAiAction(fish: any, opponent: any) {
    const mySkills: FishSkill[] = fish.skills || [];
    if (mySkills.length === 0) return;

    if (fish.ki >= fish.maxKi) {
      const ultSkill =
        mySkills.find((s) => s.category === "ultimate") ||
        [...mySkills].sort((a, b) => b.powerMult - a.powerMult)[0];
      executeSkill(fish, opponent, ultSkill, true);
      return;
    }

    const nonUltSkills = mySkills.filter((s) => s.category !== "ultimate");
    const candidatePool = nonUltSkills.length > 0 ? nonUltSkills : mySkills;
    const chosenSkill = candidatePool[Math.floor(Math.random() * candidatePool.length)];

    executeSkill(fish, opponent, chosenSkill, false);
  }

  function executeSkill(fish: any, opponent: any, skill: FishSkill, isOverdrive: boolean) {
    fish.activeSkill = skill;
    fish.dir = opponent.x >= fish.x ? 1 : -1;
    fish.skillCooldown = 3.0 + Math.random() * 2.0;

    if (isOverdrive) {
      fish.ki = 0;
      fish.aiState = "CAST_ULTIMATE";
      fish.aiTimer = 0.9;
      fish.superSaiyan = true;

      const dmg = Math.round(fish.atk * skill.powerMult * fish.powerBuff);
      fish.powerBuff = 1.0;

      if (fish.isPlayer && hudRefs.current.ultCasterName) {
        hudRefs.current.ultCasterName.textContent = `${fish.name} (${fish.classLabel})`;
        hudRefs.current.ultSkillTitle.textContent = `⚡ ${skill.name.toUpperCase()}!`;
        if (hudRefs.current.ultCutIn) hudRefs.current.ultCutIn.classList.remove("hidden");
        battleRef.current.cutInTimer = 1.1;
      }

      battleRef.current.cameraZoom = 1.08;
      triggerFlash(skill.color, 0.5);
      sayQuote(fish, `${skill.name}!!`);

      triggerSkillVisualEffect(fish, opponent, skill);
      spawnShockwave(opponent.x, opponent.y, skill.color, 190);
      spawnShockwave(opponent.x, opponent.y, "#ffffff", 130);
      spawnParticles(opponent.x, opponent.y, skill.color, 40, 1.5);

      applyDamage(fish, opponent, dmg, true, `💥 ${skill.name.toUpperCase()}: -${dmg}!`);
      spawnGlassCrack(opponent.x + (Math.random() - 0.5) * 40, opponent.y + (Math.random() - 0.5) * 40);
      return;
    }

    // Hiển thị tên Skill rõ ràng, sắc nét trên đầu cá
    spawnFloatingText(fish.x, fish.y - 52, `🔥 ${skill.name.toUpperCase()}`, skill.color, 15);

    if (skill.category === "buff") {
      fish.aiState = "CHARGING";
      fish.aiTimer = 0.5;
      fish.ki = Math.min(fish.maxKi, fish.ki + 32);
      fish.powerBuff = Math.min(2.0, +(fish.powerBuff + (skill.powerMult - 1)).toFixed(2));
      if (fish.ki >= 70) fish.superSaiyan = true;

      if (fish.fishClass === "TANKER" || fish.fishClass === "WARRIOR") {
        const healAmt = Math.round(fish.maxHp * (fish.fishClass === "TANKER" ? 0.16 : 0.1));
        fish.hp = Math.min(fish.maxHp, fish.hp + healAmt);
        spawnFloatingText(fish.x, fish.y - 28, `💚 +${healAmt} HP`, "#4ade80", 15);
      }

      triggerShake(5, 0.15);
      spawnShockwave(fish.x, fish.y, skill.color, 90);
      spawnParticles(fish.x, fish.y, skill.color, 18, 0.9);
      sayQuote(fish, `${skill.name}!`);
      return;
    }

    if (skill.category === "projectile") {
      fish.aiState = "KI_BARRAGE";
      fish.aiTimer = 0.45;
      spawnShockwave(fish.x + fish.dir * 30, fish.y, skill.color, 75);
      sayQuote(fish, `${skill.name}!`);

      const boltCount = 3;
      for (let i = 0; i < boltCount; i++) {
        const spreadY = (i - 1) * 25;
        const speed = 620 + i * 40;
        const angleToOpp = Math.atan2(opponent.y - fish.y, opponent.x - fish.x);
        battleRef.current.projectiles.push({
          ownerIsPlayer: fish.isPlayer,
          skillName: skill.name,
          vfx: skill.vfx,
          x: fish.x + fish.dir * 45,
          y: fish.y + spreadY * 0.4,
          vx: Math.cos(angleToOpp) * speed,
          vy: Math.sin(angleToOpp) * speed + spreadY,
          radius: 14,
          color: skill.color,
          damage: Math.round((fish.atk * skill.powerMult * fish.powerBuff) / boltCount),
          life: 1.5,
        });
      }
      return;
    }

    if (skill.category === "combo") {
      fish.aiState = "TELEPORT_COMBO";
      fish.comboStep = 0;
      fish.comboMaxSteps = fish.fishClass === "ASSASSIN" ? 4 : 3;
      fish.comboTimer = 0.05;
      fish.aiTimer = 0.8;
      sayQuote(fish, `${skill.name}!`);
      return;
    }

    fish.aiState = "DASH_ATTACK";
    fish.aiTimer = 0.45;
    const dx = opponent.x - fish.x;
    const dy = opponent.y - fish.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dashSpeed = Math.max(battleRef.current.width * 1.5, 720);

    fish.vx = (dx / dist) * dashSpeed;
    fish.vy = (dy / dist) * dashSpeed;
    spawnShockwave(fish.x, fish.y, skill.color, 85);
    spawnParticles(fish.x, fish.y, skill.color, 16, 0.9);
    sayQuote(fish, `${skill.name}!`);
  }

  function triggerSkillVisualEffect(attacker: any, defender: any, skill: FishSkill) {
    const vfx = skill.vfx;
    if (vfx === "lightning") {
      const bolts = [];
      for (let b = 0; b < 5; b++) {
        const targetX = defender.x + (b - 2) * 30;
        const pts = [{ x: targetX + (Math.random() - 0.5) * 45, y: 0 }];
        const steps = 6;
        for (let s = 1; s <= steps; s++) {
          pts.push({
            x: targetX + (s === steps ? 0 : (Math.random() - 0.5) * 50),
            y: (defender.y / steps) * s,
          });
        }
        bolts.push(pts);
      }
      battleRef.current.activeUltVfx = {
        type: "lightning",
        bolts,
        x2: defender.x,
        y2: defender.y,
        color: skill.color,
        life: 0.8,
        maxLife: 0.8,
      };
    } else if (vfx === "meteor") {
      const meteors = [];
      for (let m = 0; m < 6; m++) {
        const tx = defender.x + (Math.random() - 0.5) * 120;
        const ty = defender.y + (Math.random() - 0.5) * 70;
        meteors.push({
          sx: tx - attacker.dir * 240,
          sy: -50 - m * 50,
          tx,
          ty,
          r: 20 + Math.random() * 12,
        });
      }
      battleRef.current.activeUltVfx = {
        type: "meteor",
        meteors,
        x2: defender.x,
        y2: defender.y,
        color: skill.color,
        life: 0.85,
        maxLife: 0.85,
      };
    } else {
      battleRef.current.activeUltVfx = {
        type: "beam",
        x1: attacker.x + attacker.dir * 45,
        y1: attacker.y,
        x2: defender.x,
        y2: defender.y,
        color: skill.color,
        core: "#ffffff",
        life: 0.8,
        maxLife: 0.8,
      };
    }
  }

  function applyDamage(attacker: any, defender: any, rawDamage: number, isCrit = false, customLabel?: string) {
    if (!defender || !defender.isAlive) return;

    if (Math.random() < 0.15) {
      const dodgeDir = defender.x >= (attacker?.x || 0) ? 1 : -1;
      defender.vx = dodgeDir * 260;
      defender.vy = (Math.random() - 0.5) * 130;
      spawnFloatingText(defender.x, defender.y - 40, "🏃‍♂️ NÉ ĐÒN!", "#38bdf8", 17);
      spawnParticles(defender.x, defender.y, "#38bdf8", 12, 1.1);
      return;
    }

    const bs = battleRef.current;
    const finalDamage =
      defender.fishClass === "TANKER" ? Math.max(1, Math.round(rawDamage * 0.88)) : rawDamage;

    defender.hp = Math.max(0, defender.hp - finalDamage);
    defender.flashTimer = 0.18;
    defender.ki = Math.min(defender.maxKi, defender.ki + 16);
    if (attacker) attacker.ki = Math.min(attacker.maxKi, attacker.ki + 12);

    if (defender.aiState === "DASH_ATTACK") {
      defender.aiState = "CIRCLING";
    }

    const pushDir = defender.x >= (attacker?.x || 0) ? 1 : -1;
    const knockbackResistance = defender.fishClass === "TANKER" || defender.fishClass === "BOSS" ? 0.65 : 1.0;
    defender.vx = pushDir * (isCrit ? 350 : 220) * knockbackResistance;
    defender.vy = (Math.random() - 0.5) * 150;

    bs.hitStopTimer = isCrit ? 0.04 : 0.02;
    triggerShake(isCrit ? 14 : 7, isCrit ? 0.28 : 0.14);

    const midX = ((attacker?.x || defender.x) + defender.x) / 2;
    const midY = ((attacker?.y || defender.y) + defender.y) / 2;
    spawnShockwave(defender.x, defender.y, isCrit ? "#facc15" : "#38bdf8", isCrit ? 130 : 80);
    spawnParticles(midX, midY, attacker?.auraColor || "#38bdf8", isCrit ? 26 : 14, isCrit ? 1.3 : 1.0);

    spawnFloatingText(
      defender.x,
      defender.y - 42,
      customLabel || (isCrit ? `💥 -${finalDamage} CHÍ MẠNG!` : `-${finalDamage}`),
      isCrit ? "#facc15" : "#ffffff",
      isCrit ? 21 : 16
    );

    if (defender.hp <= 0) {
      defender.hp = 0;
      defender.isAlive = false;
      spawnFloatingText(defender.x, defender.y - 58, "💀 GỤC NGÃ!", "#f43f5e", 20);
    }
    updateHUD();
  }

  async function endMatch(playerWon: boolean) {
    const bs = battleRef.current;
    bs.gameOver = true;
    setLastMatchWon(playerWon);
    triggerFlash(playerWon ? "#22c55e" : "#ef4444", 0.55);
    if (hudRefs.current.ultCutIn) hudRefs.current.ultCutIn.classList.add("hidden");
    if (hudRefs.current.resultOverlay) hudRefs.current.resultOverlay.classList.remove("hidden");

    if (playerWon) {
      const isBossWin = Boolean(currentEnemyCfg?.isBossBattle);
      const bonusWeight = isBossWin ? 1.5 : 0.8;

      const currentStreak = winStreak + 1;
      setWinStreak(currentStreak);
      if (hudRefs.current.streakText) hudRefs.current.streakText.textContent = `Chuỗi: ${currentStreak}🔥`;

      const baseCoins = isBossWin ? 1500 : 500;
      const streakBonus = isBossWin ? (currentStreak - 1) * 400 : (currentStreak - 1) * 150;

      let bonusCoins = baseCoins + streakBonus;
      if (isHardcoreMode) {
        bonusCoins *= 2;
      }

      const updatedTeam = [...activeBattleTeam];
      const activeFish = updatedTeam[0];
      if (activeFish) {
        activeFish.weight = +(activeFish.weight + bonusWeight).toFixed(1);
        activeFish.tier = detectFishTier(activeFish);
        const meta = CLASS_META[activeFish.fishClass as FishClassType] || CLASS_META.WARRIOR;
        const newStats = calcBalancedCombatStats(activeFish.weight, meta);
        activeFish.maxHp = newStats.maxHp;
        activeFish.atk = newStats.atk;
        setActiveBattleTeam(updatedTeam);
      }

      const newScore = Number(score ?? 0) + bonusCoins;
      setScore(newScore);

      if (user?.id && activeFish && !String(activeFish.id).startsWith("demo_fish_")) {
        const nextInv = { ...rawInventory };
        if (activeFish._source === "aquarium" && Array.isArray(nextInv.aquarium)) {
          nextInv.aquarium = nextInv.aquarium.map((f: any) =>
            f.id === activeFish.id ? { ...f, weight: activeFish.weight, currentWeight: activeFish.weight } : f
          );
        } else if (Array.isArray(nextInv.fish_inventory)) {
          nextInv.fish_inventory = nextInv.fish_inventory.map((f: any) =>
            f.id === activeFish.id ? { ...f, weight: activeFish.weight } : f
          );
        }
        setRawInventory(nextInv);

        await supabase
          .from("profiles")
          .update({
            balance: newScore,
            inventory: nextInv,
          })
          .eq("id", user.id);
      }

      if (hudRefs.current.resultBadge) {
        hudRefs.current.resultBadge.textContent = isBossWin ? "👑 ĐỘI HÌNH HẠ GỤC BOSS!" : `🏆 CHIẾN THẮNG TRẬN ĐẤU!`;
        hudRefs.current.resultBadge.className =
          "font-arcade font-extrabold text-2xl sm:text-5xl italic tracking-wider text-emerald-400 drop-shadow-[0_4px_16px_rgba(34,197,94,0.6)] mb-2";
      }
      if (hudRefs.current.resultSub) {
        hudRefs.current.resultSub.textContent = `Đội hình quét sạch đối thủ! Nhận +${bonusCoins.toLocaleString()} Xu ${
          isHardcoreMode ? "(🔥 Hardcore x2)" : "(🌱 Chill)"
        } (Chuỗi ${currentStreak}🔥)!`;
      }

      // Tự động quét PvE tiếp nếu bật Auto-Farm
      if (!isPvPActive && isAutoFarm) {
        setTimeout(() => {
          scanRandomEnemy();
        }, 1500);
        return;
      }
    } else {
      setWinStreak(0);
      if (hudRefs.current.streakText) hudRefs.current.streakText.textContent = "Chuỗi: 0🔥";

      const updatedTeam = [...activeBattleTeam];
      const deadFish = updatedTeam[0];

      if (isHardcoreMode && deadFish && !String(deadFish.id).startsWith("demo_fish_")) {
        const nextInv = { ...rawInventory };
        if (deadFish._source === "aquarium" && Array.isArray(nextInv.aquarium)) {
          nextInv.aquarium = nextInv.aquarium.filter((f: any) => f.id !== deadFish.id);
        } else if (Array.isArray(nextInv.fish_inventory)) {
          nextInv.fish_inventory = nextInv.fish_inventory.filter((f: any) => f.id !== deadFish.id);
        }
        setRawInventory(nextInv);

        updatedTeam.shift();
        setActiveBattleTeam(updatedTeam.length > 0 ? updatedTeam : buildDefaultDemoRoster().slice(0, battleMode));

        if (user?.id) {
          await supabase.from("profiles").update({ inventory: nextInv }).eq("id", user.id);
        }
      }

      if (hudRefs.current.resultBadge) {
        hudRefs.current.resultBadge.textContent = isHardcoreMode ? "💀 TỬ TRẬN - MẤT CHỦ LỰC!" : `💀 THẤT TRẬN!`;
        hudRefs.current.resultBadge.className =
          "font-arcade font-extrabold text-2xl sm:text-5xl italic tracking-wider text-rose-500 drop-shadow-[0_4px_16px_rgba(244,63,94,0.6)] mb-2";
      }
      if (hudRefs.current.resultSub) {
        hudRefs.current.resultSub.textContent = isHardcoreMode
          ? `${deadFish?.name || "Cá"} đã ngã xuống và vĩnh viễn biến mất khỏi hồ do bật chế độ Sinh Tử!`
          : `Đội hình đã thua cuộc. Thử lại ở trận sau nhé!`;
      }
    }
  }

  function updateHUD() {
    const bs = battleRef.current;
    if (!bs.teamPlayer || bs.teamPlayer.length === 0 || !bs.teamRival || bs.teamRival.length === 0) return;

    const alivePlayers = bs.teamPlayer.filter((f: any) => f.isAlive);
    const aliveRivals = bs.teamRival.filter((f: any) => f.isAlive);

    const leadP = alivePlayers[0] || bs.teamPlayer[0];
    const leadE = aliveRivals[0] || bs.teamRival[0];

    const totalHpP = bs.teamPlayer.reduce((sum, f) => sum + f.hp, 0);
    const maxTotalHpP = bs.teamPlayer.reduce((sum, f) => sum + f.maxHp, 0) || 1;
    const totalHpE = bs.teamRival.reduce((sum, f) => sum + f.hp, 0);
    const maxTotalHpE = bs.teamRival.reduce((sum, f) => sum + f.maxHp, 0) || 1;

    if (hudRefs.current.pName) hudRefs.current.pName.textContent = `${leadP.name} (${alivePlayers.length}/${bs.teamPlayer.length} sống)`;
    if (hudRefs.current.pWeight) hudRefs.current.pWeight.textContent = formatFishWeight(leadP.weight);
    if (hudRefs.current.pHpBar) hudRefs.current.pHpBar.style.width = `${Math.max(0, (totalHpP / maxTotalHpP) * 100)}%`;
    if (hudRefs.current.pHpText) hudRefs.current.pHpText.textContent = `Tổng HP: ${totalHpP} / ${maxTotalHpP}`;
    if (hudRefs.current.pKiBar) {
      hudRefs.current.pKiBar.style.width = `${Math.max(0, (leadP.ki / leadP.maxKi) * 100)}%`;
      hudRefs.current.pKiBar.classList.toggle("ki-full", leadP.ki >= 85);
    }

    if (hudRefs.current.eName) hudRefs.current.eName.textContent = `${leadE.name} (${aliveRivals.length}/${bs.teamRival.length} sống)`;
    if (hudRefs.current.eWeight) hudRefs.current.eWeight.textContent = formatFishWeight(leadE.weight);
    if (hudRefs.current.eHpBar) hudRefs.current.eHpBar.style.width = `${Math.max(0, (totalHpE / maxTotalHpE) * 100)}%`;
    if (hudRefs.current.eHpText) hudRefs.current.eHpText.textContent = `Tổng HP: ${totalHpE} / ${maxTotalHpE}`;
    if (hudRefs.current.eKiBar) {
      hudRefs.current.eKiBar.style.width = `${Math.max(0, (leadE.ki / leadE.maxKi) * 100)}%`;
      hudRefs.current.eKiBar.classList.toggle("ki-full", leadE.ki >= 85);
    }
  }

  function updateGame(rawDt: number) {
    const bs = battleRef.current;
    const dt = rawDt * simSpeed;

    if (bs.hitStopTimer > 0) {
      bs.hitStopTimer -= rawDt;
      return;
    }

    if (bs.shakeTime > 0) bs.shakeTime = Math.max(0, bs.shakeTime - rawDt);
    if (bs.screenFlash > 0) bs.screenFlash = Math.max(0, bs.screenFlash - rawDt * 2.2);
    bs.cameraZoom += (1.0 - bs.cameraZoom) * 6 * rawDt;

    if (bs.cutInTimer > 0) {
      bs.cutInTimer -= rawDt;
      if (bs.cutInTimer <= 0 && hudRefs.current.ultCutIn) {
        hudRefs.current.ultCutIn.classList.add("hidden");
      }
    }

    for (const b of bs.bubbles) {
      b.y -= b.speed * 45 * dt;
      b.wobble += dt * 2.5;
      b.x += Math.sin(b.wobble) * 0.4;
      if (b.y < -10) {
        b.y = bs.height + 10;
        b.x = Math.random() * bs.width;
      }
    }

    for (let i = bs.shockwaves.length - 1; i >= 0; i--) {
      const sw = bs.shockwaves[i];
      sw.life -= dt;
      sw.r = 10 + (sw.maxR - 10) * (1 - Math.max(0, sw.life) / sw.maxLife);
      if (sw.life <= 0) bs.shockwaves.splice(i, 1);
    }

    for (let i = bs.slashArcs.length - 1; i >= 0; i--) {
      bs.slashArcs[i].life -= dt;
      if (bs.slashArcs[i].life <= 0) bs.slashArcs.splice(i, 1);
    }

    for (let i = bs.afterimages.length - 1; i >= 0; i--) {
      bs.afterimages[i].life -= dt;
      if (bs.afterimages[i].life <= 0) bs.afterimages.splice(i, 1);
    }

    for (let i = bs.particles.length - 1; i >= 0; i--) {
      const p = bs.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      if (p.life <= 0) bs.particles.splice(i, 1);
    }

    for (let i = bs.floatingTexts.length - 1; i >= 0; i--) {
      const ft = bs.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) bs.floatingTexts.splice(i, 1);
    }

    if (bs.activeUltVfx) {
      bs.activeUltVfx.life -= dt;
      if (bs.activeUltVfx.life <= 0) bs.activeUltVfx = null;
    }

    if (!bs.teamPlayer || bs.teamPlayer.length === 0 || !bs.teamRival || bs.teamRival.length === 0) return;

    const alivePlayers = bs.teamPlayer.filter((f: any) => f.isAlive);
    const aliveRivals = bs.teamRival.filter((f: any) => f.isAlive);

    if (!bs.gameOver) {
      if (alivePlayers.length === 0) {
        bs.gameOver = true;
        setTimeout(() => endMatch(false), 400);
        return;
      }
      if (aliveRivals.length === 0) {
        bs.gameOver = true;
        setTimeout(() => endMatch(true), 400);
        return;
      }
    }

    // Xử lý đạn chưởng lực & va chạm ĐỌ KI giữa các luồng đạn ngược chiều
    for (let i = bs.projectiles.length - 1; i >= 0; i--) {
      const proj = bs.projectiles[i];
      proj.life -= dt;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      spawnParticles(proj.x, proj.y, proj.color, 1, 0.3);

      for (let j = i - 1; j >= 0; j--) {
        const otherProj = bs.projectiles[j];
        if (proj.ownerIsPlayer !== otherProj.ownerIsPlayer) {
          if (Math.hypot(proj.x - otherProj.x, proj.y - otherProj.y) < 36) {
            spawnShockwave((proj.x + otherProj.x) / 2, (proj.y + otherProj.y) / 2, "#facc15", 100);
            spawnFloatingText((proj.x + otherProj.x) / 2, (proj.y + otherProj.y) / 2, "⚡ ĐỌ KI!", "#facc15", 18);
            bs.projectiles.splice(i, 1);
            bs.projectiles.splice(j, 1);
            break;
          }
        }
      }

      const targets = proj.ownerIsPlayer ? aliveRivals : alivePlayers;
      const attackers = proj.ownerIsPlayer ? alivePlayers : aliveRivals;
      const attacker = attackers[0];

      let hitTarget = null;
      for (const t of targets) {
        if (Math.hypot(proj.x - t.x, proj.y - t.y) < t.radius + 22) {
          hitTarget = t;
          break;
        }
      }

      if (!bs.gameOver && hitTarget) {
        spawnShockwave(proj.x, proj.y, proj.color, 85);
        spawnParticles(proj.x, proj.y, proj.color, 16, 1.0);
        applyDamage(attacker, hitTarget, proj.damage, false, `🔥 -${proj.damage}`);
        bs.projectiles.splice(i, 1);
        continue;
      }

      if (proj.life <= 0 || proj.x < -50 || proj.x > bs.width + 50 || proj.y < -50 || proj.y > bs.height + 50) {
        bs.projectiles.splice(i, 1);
      }
    }

    for (const fish of bs.teamPlayer) {
      if (fish.isAlive) updateFighterTeamMode(fish, aliveRivals, dt);
    }
    for (const fish of bs.teamRival) {
      if (fish.isAlive) updateFighterTeamMode(fish, alivePlayers, dt);
    }

    updateHUD();
  }

  function updateFighterTeamMode(fish: any, aliveEnemies: any[], dt: number) {
    const bs = battleRef.current;
    fish.swimPhase += dt * (fish.aiState === "CHARGING" ? 20 : 8);
    if (fish.flashTimer > 0) fish.flashTimer = Math.max(0, fish.flashTimer - dt);
    fish.currentScale += (fish.baseScale - fish.currentScale) * 5 * dt;
    if (fish.skillCooldown > 0) fish.skillCooldown -= dt;

    if (fish.speechTimer > 0) {
      fish.speechTimer -= dt;
      if (fish.speechTimer <= 0) fish.speech = null;
    }

    if (aliveEnemies.length === 0) return;

    let opponent = aliveEnemies[0];
    let minDst = Infinity;
    for (const e of aliveEnemies) {
      const dst = Math.hypot(e.x - fish.x, e.y - fish.y);
      if (dst < minDst) {
        minDst = dst;
        opponent = e;
      }
    }

    if (!bs.gameOver && fish.aiState === "TELEPORT_COMBO") {
      fish.comboTimer -= dt;
      if (fish.comboTimer <= 0) {
        fish.comboStep++;
        const maxSteps = fish.comboMaxSteps || 3;
        if (fish.comboStep <= maxSteps && opponent.isAlive) {
          const side = fish.comboStep % 2 === 1 ? -1 : 1;
          const offsetY = (fish.comboStep - 2) * 32;
          fish.x = opponent.x + side * 60;
          fish.y = opponent.y + offsetY;
          fish.dir = -side;

          bs.afterimages.push({
            x: fish.x,
            y: fish.y,
            dir: fish.dir,
            scale: fish.currentScale,
            filename: fish.filename,
            color: fish.auraColor,
            life: 0.25,
            maxLife: 0.25,
          });

          const mult = fish.activeSkill?.powerMult || 1.45;
          const hitDmg = Math.round((fish.atk * mult * fish.powerBuff) / maxSteps);
          const isFinisher = fish.comboStep === maxSteps;
          spawnSlashArc(opponent.x, opponent.y, fish.auraColor, side * 0.6);
          applyDamage(
            fish,
            opponent,
            isFinisher ? Math.round(hitDmg * 1.5) : hitDmg,
            isFinisher,
            isFinisher ? `⚡ KẾT LIỄU -${Math.round(hitDmg * 1.5)}!` : `⚔️ -${hitDmg}`
          );
          fish.comboTimer = 0.14;
        } else {
          fish.powerBuff = 1.0;
          fish.aiState = "CIRCLING";
          fish.aiTimer = 0.45;
          fish.vx = (fish.isPlayer ? -1 : 1) * 280;
        }
      }
      return;
    }

    if (fish.aiState === "DASH_ATTACK") {
      fish.afterimageTimer -= dt;
      if (fish.afterimageTimer <= 0) {
        fish.afterimageTimer = 0.04;
        bs.afterimages.push({
          x: fish.x,
          y: fish.y,
          dir: fish.dir,
          scale: fish.currentScale,
          filename: fish.filename,
          color: fish.auraColor,
          life: 0.2,
          maxLife: 0.2,
        });
      }

      if (!bs.gameOver && minDst < 75) {
        fish.aiState = "CIRCLING";
        fish.aiTimer = 0.5 + Math.random() * 0.35;
        fish.vx = (fish.isPlayer ? -1 : 1) * 240;
        const mult = fish.activeSkill?.powerMult || 1.25;
        const critChance = fish.fishClass === "ASSASSIN" ? 0.42 : 0.24;
        const isCrit = fish.powerBuff > 1.15 || Math.random() < critChance;
        const dmg = Math.round(fish.atk * mult * fish.powerBuff * (isCrit ? 1.35 : 1));
        fish.powerBuff = 1.0;
        spawnSlashArc(opponent.x, opponent.y, fish.auraColor, 0.35);
        applyDamage(fish, opponent, dmg, isCrit);
      }
    }

    if (!bs.gameOver) {
      fish.ki = Math.min(fish.maxKi, fish.ki + fish.kiGain * dt);
      fish.aiTimer -= dt;
      if (fish.aiTimer <= 0 && fish.skillCooldown <= 0) {
        if (fish.aiState !== "CIRCLING") {
          fish.aiState = "CIRCLING";
          fish.aiTimer = 0.5 + Math.random() * 0.4;
        } else {
          decideNextAiAction(fish, opponent);
        }
      }
    }

    if (fish.aiState !== "DASH_ATTACK") {
      const hpRatio = fish.hp / fish.maxHp;
      // GIẢN RA: Tăng khoảng cách tản ra để đánh thoáng hơn (90 - 140px)
      const targetRange = hpRatio < 0.25 ? 140 : 90;

      if (minDst > targetRange) {
        const angle = Math.atan2(opponent.y - fish.y, opponent.x - fish.x);
        fish.vx = Math.cos(angle) * 190;
        fish.vy = Math.sin(angle) * 190;
      } else if (minDst < 55) {
        const angle = Math.atan2(fish.y - opponent.y, fish.x - opponent.x);
        fish.vx = Math.cos(angle) * 160;
        fish.vy = Math.sin(angle) * 160;
      } else {
        const bobX = Math.cos(fish.swimPhase * 0.8) * 40;
        const bobY = Math.sin(fish.swimPhase * 1.1) * 40;
        fish.vx += (bobX - fish.vx) * 5 * dt;
        fish.vy += (bobY - fish.vy) * 5 * dt;

        // ĐẤM THƯỜNG / CHÉM CẬN CHIẾN: Thay vì cụng đầu, mỗi đòn đánh cận chiến có vung chém rõ ràng
        if (!bs.gameOver && Math.random() < 0.04) {
          const dmg = Math.round(fish.atk * 0.95);
          spawnSlashArc((fish.x + opponent.x) / 2, (fish.y + opponent.y) / 2, fish.auraColor, 0.2);
          applyDamage(fish, opponent, dmg, false, `👊 ĐẤM THƯỜNG: -${dmg}`);
        }
      }
      fish.dir = opponent.x >= fish.x ? 1 : -1;
    }

    fish.x += fish.vx * dt;
    fish.y += fish.vy * dt;

    const marginX = 60;
    const marginY = 50;
    const { width, height } = bs;
    fish.x = Math.max(marginX, Math.min(width - marginX, fish.x));
    fish.y = Math.max(marginY, Math.min(height - marginY, fish.y));
  }

  function drawGame(ctx: CanvasRenderingContext2D) {
    const bs = battleRef.current;
    const { width, height } = bs;

    ctx.save();
    if (bs.cameraZoom !== 1.0) {
      ctx.translate(width / 2, height / 2);
      ctx.scale(bs.cameraZoom, bs.cameraZoom);
      ctx.translate(-width / 2, -height / 2);
    }

    if (bs.shakeTime > 0) {
      const dx = (Math.random() - 0.5) * bs.shakeIntensity * 2;
      const dy = (Math.random() - 0.5) * bs.shakeIntensity * 2;
      ctx.translate(dx, dy);
    }

    const waterGrad = ctx.createLinearGradient(0, 0, 0, height);
    waterGrad.addColorStop(0, "#0369a1");
    waterGrad.addColorStop(0.45, "#0c4a6e");
    waterGrad.addColorStop(1, "#041426");
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, 0, width, height);

    const time = performance.now() * 0.001;
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const rayX = width * (0.15 + i * 0.18) + Math.sin(time * 0.7 + i) * 25;
      const rayGrad = ctx.createLinearGradient(rayX, 0, rayX + 40, height * 0.85);
      rayGrad.addColorStop(0, "rgba(186, 230, 253, 0.18)");
      rayGrad.addColorStop(1, "rgba(186, 230, 253, 0)");
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(rayX - 25, 0);
      ctx.lineTo(rayX + 35, 0);
      ctx.lineTo(rayX + 110, height * 0.85);
      ctx.lineTo(rayX - 60, height * 0.85);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    drawAquariumFloor(ctx, time);

    for (const b of bs.bubbles) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(224, 242, 254, 0.5)";
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
      ctx.fill();
    }

    for (const ai of bs.afterimages) {
      const alpha = Math.max(0, ai.life / ai.maxLife) * 0.5;
      ctx.save();
      ctx.translate(ai.x, ai.y);
      ctx.scale(-ai.dir * ai.scale, ai.scale);
      ctx.globalAlpha = alpha;
      const img = getCachedFishImage(ai.filename);
      if (img && img.complete && img.naturalWidth !== 0) {
        const ratio = img.naturalWidth / img.naturalHeight;
        const drawW = 90;
        const drawH = drawW / (ratio || 1.33);
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      }
      ctx.restore();
    }

    for (const fish of bs.teamPlayer) {
      drawFishFighter(ctx, fish, time);
    }
    for (const fish of bs.teamRival) {
      drawFishFighter(ctx, fish, time);
    }

    for (const proj of bs.projectiles) {
      ctx.save();
      const grad = ctx.createRadialGradient(proj.x, proj.y, 2, proj.x, proj.y, proj.radius * 2.0);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.4, proj.color);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius * 2.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const sl of bs.slashArcs) {
      const alpha = Math.max(0, sl.life / sl.maxLife);
      ctx.save();
      ctx.translate(sl.x, sl.y);
      ctx.rotate(sl.angle);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = sl.color;
      ctx.lineWidth = 9 * alpha + 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, sl.radius, -1.0, 1.0);
      ctx.stroke();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4 * alpha + 1;
      ctx.beginPath();
      ctx.arc(0, 0, sl.radius, -0.8, 0.8);
      ctx.stroke();
      ctx.restore();
    }

    if (bs.activeUltVfx) drawUltimateVfx(ctx, bs.activeUltVfx, time);

    for (const sw of bs.shockwaves) {
      const alpha = Math.max(0, sw.life / sw.maxLife);
      ctx.save();
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 5 * alpha + 1;
      ctx.stroke();
      ctx.restore();
    }

    for (const p of bs.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const fish of bs.teamPlayer) {
      if (fish.speech) drawSpeechBubble(ctx, fish);
    }
    for (const fish of bs.teamRival) {
      if (fish.speech) drawSpeechBubble(ctx, fish);
    }

    for (const ft of bs.floatingTexts) {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${ft.size}px "Chakra Petch", sans-serif`;
      ctx.textAlign = "center";
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = "rgba(2, 6, 23, 0.9)";
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    for (const crack of bs.glassCracks) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${crack.alpha})`;
      ctx.lineWidth = 1.8;
      for (const l of crack.lines) {
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (bs.screenFlash > 0) {
      ctx.save();
      ctx.globalAlpha = bs.screenFlash;
      ctx.fillStyle = bs.screenFlashColor;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawAquariumFloor(ctx: CanvasRenderingContext2D, time: number) {
    const { width, height } = battleRef.current;
    const floorY = height - 34;

    for (const sw of battleRef.current.seaweeds) {
      ctx.save();
      ctx.strokeStyle = `hsl(${sw.hue}, 70%, 38%)`;
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      let px = sw.x;
      let py = floorY + 8;
      ctx.moveTo(px, py);
      for (let s = 1; s <= sw.segments; s++) {
        const sway = Math.sin(time * 2.2 + sw.phase + s * 0.55) * (s * 2.4);
        px = sw.x + sway;
        py -= sw.segLen;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    const sandGrad = ctx.createLinearGradient(0, floorY, 0, height);
    sandGrad.addColorStop(0, "#d97706");
    sandGrad.addColorStop(1, "#78350f");
    ctx.fillStyle = sandGrad;
    ctx.beginPath();
    ctx.moveTo(0, floorY + 6);
    ctx.quadraticCurveTo(width * 0.25, floorY - 6, width * 0.5, floorY + 4);
    ctx.quadraticCurveTo(width * 0.75, floorY + 12, width, floorY + 2);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  }

  function drawFishFighter(ctx: CanvasRenderingContext2D, fish: any, time: number) {
    ctx.save();
    ctx.translate(fish.x, fish.y);

    if (!fish.isAlive) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("💀", 0, 0);
      ctx.restore();
      return;
    }

    const barW = 50;
    const hpPercent = Math.max(0, fish.hp / fish.maxHp);
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(-barW / 2, -42, barW, 6);
    ctx.fillStyle = fish.isPlayer ? "#4ade80" : "#f43f5e";
    ctx.fillRect(-barW / 2, -42, barW * hpPercent, 6);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 10px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(fish.name, 0, -47);

    const kiRatio = fish.ki / fish.maxKi;
    const isCharging = fish.aiState === "CHARGING";
    const showAura = kiRatio > 0.35 || isCharging || fish.powerBuff > 1.1;

    if (showAura) {
      const auraScale = (isCharging ? 1.3 : 0.9 + kiRatio * 0.3) * fish.currentScale;
      ctx.save();
      ctx.scale(auraScale, auraScale);

      const flameCount = 12;
      ctx.beginPath();
      for (let i = 0; i <= flameCount; i++) {
        const angle = (i / flameCount) * Math.PI * 2;
        const flicker = Math.sin(time * 24 + i * 1.7) * 10;
        const radX = 60 + flicker;
        const radY = 40 + flicker * 0.7;
        const px = Math.cos(angle) * radX;
        const py = Math.sin(angle) * radY - 4;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const auraGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 72);
      auraGrad.addColorStop(0, "#ffffff");
      auraGrad.addColorStop(0.4, fish.auraColor);
      auraGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = auraGrad;
      ctx.globalAlpha = isCharging ? 0.9 : 0.6;
      ctx.fill();
      ctx.restore();
    }

    ctx.scale(-fish.dir * fish.currentScale, fish.currentScale);
    if (fish.flashTimer > 0) ctx.filter = "brightness(2.5)";

    ctx.imageSmoothingEnabled = false;

    const img = getCachedFishImage(fish.filename);
    if (img && img.complete && img.naturalWidth !== 0) {
      const ratio = img.naturalWidth / img.naturalHeight;
      const drawW = 90;
      const drawH = drawW / (ratio || 1.33);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.fillStyle = "rgba(250, 204, 21, 0.85)";
      ctx.fillRect(-30, -20, 60, 40);
    }

    ctx.restore();
  }

  function drawUltimateVfx(ctx: CanvasRenderingContext2D, vfx: any, time: number) {
    const progress = 1 - Math.max(0, vfx.life / vfx.maxLife);
    const alpha = Math.max(0, vfx.life / vfx.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;

    if (vfx.type === "lightning" && vfx.bolts) {
      for (const pts of vfx.bolts) {
        ctx.strokeStyle = vfx.color;
        ctx.lineWidth = 12 * alpha + 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        pts.forEach((p: any, idx: number) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 5 * alpha + 1;
        ctx.beginPath();
        pts.forEach((p: any, idx: number) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
      }
      const boomR = 35 + progress * 110;
      const boomGrad = ctx.createRadialGradient(vfx.x2, vfx.y2, 5, vfx.x2, vfx.y2, boomR);
      boomGrad.addColorStop(0, "#ffffff");
      boomGrad.addColorStop(0.5, vfx.color);
      boomGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = boomGrad;
      ctx.beginPath();
      ctx.arc(vfx.x2, vfx.y2, boomR, 0, Math.PI * 2);
      ctx.fill();
    } else if (vfx.type === "meteor" && vfx.meteors) {
      const t = Math.min(1, progress * 1.45);
      for (const m of vfx.meteors) {
        const cx = m.sx + (m.tx - m.sx) * t;
        const cy = m.sy + (m.ty - m.sy) * t;
        ctx.strokeStyle = vfx.color;
        ctx.lineWidth = m.r * 1.3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.sx, m.sy);
        ctx.lineTo(cx, cy);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx, cy, m.r * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.lineCap = "round";
      ctx.strokeStyle = vfx.color;
      ctx.lineWidth = 58 * alpha + 16;
      ctx.beginPath();
      ctx.moveTo(vfx.x1, vfx.y1);
      ctx.lineTo(vfx.x2, vfx.y2);
      ctx.stroke();

      ctx.strokeStyle = vfx.core || "#ffffff";
      ctx.lineWidth = 26 * alpha + 6;
      ctx.beginPath();
      ctx.moveTo(vfx.x1, vfx.y1);
      ctx.lineTo(vfx.x2, vfx.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSpeechBubble(ctx: CanvasRenderingContext2D, fish: any) {
    const text = fish.speech;
    if (!text || !fish.isAlive) return;
    const { width } = battleRef.current;

    ctx.save();
    ctx.font = '700 12px "Chakra Petch", sans-serif';
    const padX = 10;
    const textW = ctx.measureText(text).width;
    const boxW = textW + padX * 2;
    const boxH = 26;

    let bx = fish.x - boxW / 2;
    let by = fish.y - 72;
    bx = Math.max(8, Math.min(width - boxW - 8, bx));
    by = Math.max(8, by);

    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, bx + boxW / 2, by + boxH / 2);
    ctx.restore();
  }

  function handleToggleBattleTeamMember(fish: any) {
    if (activeBattleTeam.some((f) => f.id === fish.id)) {
      if (activeBattleTeam.length <= 1) {
        alert("Đội hình phải có ít nhất 1 con cá!");
        return;
      }
      setActiveBattleTeam(activeBattleTeam.filter((f) => f.id !== fish.id));
    } else {
      if (activeBattleTeam.length >= battleMode) {
        alert(`Chế độ hiện tại (${battleMode}v${battleMode}) chỉ cho phép chọn tối đa ${battleMode} con cá khác nhau trong đội hình!`);
        return;
      }
      setActiveBattleTeam([...activeBattleTeam, fish]);
    }
  }

  return (
    <div
      className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-slate-950 font-sans pointer-events-auto select-none flex flex-col justify-between p-1.5 sm:p-2.5 text-white"
      style={{ touchAction: "none" }}
    >
      {/* 🐟 MODAL CHỌN ĐỘI HÌNH PVE */}
      {isFishPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-900 border-2 border-emerald-400/70 w-full max-w-6xl h-[90dvh] rounded-3xl p-4 sm:p-6 shadow-[0_0_40px_rgba(16,185,129,0.35)] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🐟</span>
                <div>
                  <h2 className="text-base sm:text-xl font-black text-emerald-300 uppercase tracking-wider">
                    Chọn Đội Hình Xuất Trận ({activeBattleTeam.length}/{battleMode} con)
                  </h2>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    Chọn các con cá khác nhau từ hồ cá &amp; kho cá cho chế độ {battleMode}v{battleMode} (Không trùng lặp)!
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsFishPickerOpen(false);
                  startMatch(undefined, undefined, false);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-1.5 rounded-xl text-xs cursor-pointer"
              >
                XÁC NHẬN &amp; BEM!
              </button>
            </div>

            <div className="flex gap-2 my-3">
              {[
                { key: "all", label: `Tất Cả (${playerRoster.length})` },
                { key: "aquarium", label: `🌊 Hồ Cá (${playerRoster.filter((f) => f._source === "aquarium").length})` },
                { key: "fish_inventory", label: `🎒 Kho Cá (${playerRoster.filter((f) => f._source === "fish_inventory").length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setPickerFilter(tab.key as any)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                    pickerFilter === tab.key
                      ? "bg-emerald-500 text-slate-950 shadow-lg"
                      : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {playerRoster
                .filter((f) => (pickerFilter === "all" ? true : f._source === pickerFilter))
                .map((fish) => {
                  const isSelected = activeBattleTeam.some((f) => f.id === fish.id);
                  const meta = CLASS_META[fish.fishClass as FishClassType] || CLASS_META.WARRIOR;

                  return (
                    <div
                      key={fish.id}
                      onClick={() => handleToggleBattleTeamMember(fish)}
                      className={`relative bg-slate-950 rounded-2xl p-3 flex flex-col justify-between cursor-pointer border-2 transition-all hover:scale-[1.01] ${
                        isSelected
                          ? "border-emerald-400 ring-2 ring-emerald-400/50 bg-emerald-950/25"
                          : "border-slate-800 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex justify-between items-center gap-1 mb-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${meta.badgeBg}`}>
                          {meta.icon} {meta.label}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{fish.rank || "D"}</span>
                      </div>

                      <div className="h-16 flex items-center justify-center my-1">
                        <img
                          src={
                            fish.filename.startsWith("http") || fish.filename.startsWith("/")
                              ? fish.filename
                              : `/assets/cauca/${fish.filename}`
                          }
                          alt={fish.name}
                          className="max-h-full object-contain drop-shadow-md"
                        />
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-white truncate text-center mb-1.5">{fish.name}</h4>
                        <div className="grid grid-cols-3 gap-1 text-center bg-slate-900 rounded-lg p-1 text-[10px] font-bold border border-slate-800 mb-2">
                          <span className="text-amber-300">⚖️ {formatFishWeight(fish.weight)}</span>
                          <span className="text-emerald-400">❤️ {fish.maxHp}</span>
                          <span className="text-rose-400">⚔️ {fish.atk}</span>
                        </div>
                      </div>

                      <div
                        className={`text-center font-black text-[10px] py-1 rounded-lg uppercase ${
                          isSelected ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {isSelected ? "ĐÃ CHỌN VÀO ĐỘI" : "+ THÊM VÀO ĐỘI"}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER HUDS */}
      <header className="w-full mx-auto z-10 bg-slate-900/85 backdrop-blur-md border border-cyan-500/30 rounded-xl px-2.5 py-1.5 shadow-md">
        <div className="flex items-center justify-between gap-2">
          {/* PLAYER FISH HUD (XANH LÁ) */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <div className="flex items-center gap-1.5 truncate">
                <Link
                  href="/caucamulti/hoca"
                  className="bg-slate-800 hover:bg-slate-700 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-black border border-emerald-500/40 shrink-0"
                >
                  ← Hồ Cá
                </Link>
                <span
                  ref={(el) => {
                    hudRefs.current.pDot = el;
                  }}
                  className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                ></span>
                <span
                  ref={(el) => {
                    hudRefs.current.pName = el;
                  }}
                  className="font-arcade font-bold text-xs text-emerald-400 truncate"
                >
                  Đội Nhà
                </span>
              </div>
              <span
                ref={(el) => {
                  hudRefs.current.pWeight = el;
                }}
                className="text-[10px] font-semibold text-emerald-300 shrink-0"
              >
                0 kg
              </span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full p-0.5 border border-slate-700 overflow-hidden relative">
              <div
                ref={(el) => {
                  hudRefs.current.pHpBar = el;
                }}
                className="h-full bg-emerald-500 rounded-full transition-all duration-150"
                style={{ width: "100%" }}
              ></div>
              <span
                ref={(el) => {
                  hudRefs.current.pHpText = el;
                }}
                className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow"
              >
                1000 / 1000
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-0.5 overflow-hidden">
              <div
                ref={(el) => {
                  hudRefs.current.pKiBar = el;
                }}
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-300 to-white rounded-full transition-all duration-100"
                style={{ width: "20%" }}
              ></div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center justify-center px-1">
            <span className="font-arcade font-extrabold text-sm sm:text-base italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-red-500 leading-none">
              {battleMode}v{battleMode}
            </span>
            <span
              ref={(el) => {
                hudRefs.current.streakText = el;
              }}
              className="text-[9px] font-bold text-emerald-400 mt-0.5"
            >
              Chuỗi: {winStreak}🔥
            </span>
          </div>

          {/* ENEMY FISH HUD (ĐỎ) */}
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center justify-between gap-1 mb-0.5 flex-row-reverse">
              <div className="flex items-center gap-1.5 truncate flex-row-reverse">
                <span
                  ref={(el) => {
                    hudRefs.current.eDot = el;
                  }}
                  className="inline-block w-2 h-2 rounded-full bg-red-600 shrink-0"
                ></span>
                <span
                  ref={(el) => {
                    hudRefs.current.eName = el;
                  }}
                  className="font-arcade font-bold text-xs text-red-400 truncate"
                >
                  Đội Địch
                </span>
              </div>
              <span
                ref={(el) => {
                  hudRefs.current.eWeight = el;
                }}
                className="text-[10px] font-semibold text-red-300 shrink-0"
              >
                0 kg
              </span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full p-0.5 border border-slate-700 overflow-hidden relative">
              <div
                ref={(el) => {
                  hudRefs.current.eHpBar = el;
                }}
                className="h-full bg-red-600 rounded-full transition-all duration-150 ml-auto"
                style={{ width: "100%" }}
              ></div>
              <span
                ref={(el) => {
                  hudRefs.current.eHpText = el;
                }}
                className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow"
              >
                1000 / 1000
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-0.5 overflow-hidden">
              <div
                ref={(el) => {
                  hudRefs.current.eKiBar = el;
                }}
                className="h-full bg-gradient-to-l from-red-500 via-rose-300 to-white rounded-full transition-all duration-100 ml-auto"
                style={{ width: "20%" }}
              ></div>
            </div>
          </div>
        </div>
      </header>

      {/* KHUNG XEM ĐÁ CÁ */}
      <main
        ref={containerRef}
        className="relative flex-1 w-full mx-auto my-1.5 rounded-2xl overflow-hidden border-2 border-cyan-400/40 shadow-[0_0_30px_rgba(6,182,212,0.2)] bg-sky-950"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-pointer"
          onClick={(e) => {
            const canvas = canvasRef.current;
            const rect = canvas?.getBoundingClientRect();
            if (!canvas || !rect) return;

            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const tapX = (e.clientX - rect.left) * scaleX;
            const tapY = (e.clientY - rect.top) * scaleY;

            spawnShockwave(tapX, tapY, "#bae6fd", 60);
            spawnParticles(tapX, tapY, "#fde047", 10, 0.6);
            const bs = battleRef.current;
            if (!bs.gameOver && !isScanning && bs.teamPlayer.length > 0) {
              bs.teamPlayer.forEach((f) => {
                if (f.isAlive) f.ki = Math.min(f.maxKi, f.ki + 10);
              });
              spawnFloatingText(tapX, tapY - 14, "+10% Ki", "#fde047", 14);
              updateHUD();
            }
          }}
        ></canvas>

        {/* ULTIMATE CUT-IN BANNER */}
        <div
          ref={(el) => {
            hudRefs.current.ultCutIn = el;
          }}
          className="pointer-events-none hidden absolute inset-x-0 top-1/4 flex items-center justify-center z-10"
        >
          <div className="px-6 py-1.5 bg-gradient-to-r from-transparent via-amber-500/90 to-transparent border-y-2 border-yellow-200 text-center transform -skew-x-12 shadow-2xl">
            <div
              ref={(el) => {
                hudRefs.current.ultCasterName = el;
              }}
              className="text-[11px] font-bold uppercase tracking-widest text-slate-950"
            >
              CÁ NHÀ
            </div>
            <div
              ref={(el) => {
                hudRefs.current.ultSkillTitle = el;
              }}
              className="font-arcade font-extrabold text-xl sm:text-3xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
            >
              ⚡ TUYỆT KỸ!
            </div>
          </div>
        </div>

        {/* RADAR SCANNING OVERLAY */}
        <div
          ref={(el) => {
            hudRefs.current.radarOverlay = el;
          }}
          className="hidden absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-20"
        >
          <div className="relative w-24 h-24 rounded-full border-2 border-cyan-400/60 flex items-center justify-center mb-3 bg-cyan-950/40 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
            <span className="text-3xl">📡</span>
          </div>
          <div className="font-arcade font-bold text-lg sm:text-2xl text-cyan-300 tracking-wide">ĐANG QUÉT ĐỘI HÌNH ĐỊCH...</div>
          <p className="text-xs text-slate-400 mt-1">Tìm kiếm đối thủ {battleMode}v{battleMode} hoàn toàn ngẫu nhiên</p>
        </div>

        {/* VICTORY / DEFEAT BANNER */}
        <div
          ref={(el) => {
            hudRefs.current.resultOverlay = el;
          }}
          className="hidden absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-20"
        >
          <div
            ref={(el) => {
              hudRefs.current.resultBadge = el;
            }}
            className="font-arcade font-extrabold text-3xl sm:text-5xl italic tracking-wider text-yellow-400 drop-shadow-[0_4px_16px_rgba(250,204,21,0.6)] mb-2"
          >
            🏆 KẾT QUẢ TRẬN ĐẤU
          </div>
          <p
            ref={(el) => {
              hudRefs.current.resultSub = el;
            }}
            className="text-xs sm:text-base text-slate-200 max-w-md mb-4"
          >
            Chi tiết thông báo trận đấu!
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {isPvPActive ? (
              <>
                {lastMatchWon ? (
                  <button
                    onClick={() => {
                      if (hudRefs.current.resultOverlay) hudRefs.current.resultOverlay.classList.add("hidden");
                      setRoomFishPickerOpen(true);
                    }}
                    className="bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 font-arcade font-bold px-5 py-2.5 rounded-xl shadow-lg border-b-4 border-emerald-800 text-xs sm:text-sm cursor-pointer"
                  >
                    🚀 Gửi khiêu chiến tiếp
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (hudRefs.current.resultOverlay) hudRefs.current.resultOverlay.classList.add("hidden");
                      handlePvPRevenge();
                    }}
                    className="bg-gradient-to-b from-rose-500 to-red-700 text-white font-arcade font-bold px-5 py-2.5 rounded-xl shadow-lg border-b-4 border-red-950 text-xs sm:text-sm cursor-pointer animate-pulse"
                  >
                    🔥 Báo thù
                  </button>
                )}
                <button
                  onClick={() => {
                    if (hudRefs.current.resultOverlay) hudRefs.current.resultOverlay.classList.add("hidden");
                    leaveMultiplayerRoom();
                  }}
                  className="bg-gradient-to-b from-slate-600 to-slate-800 text-white font-arcade font-bold px-5 py-2.5 rounded-xl shadow-lg border-b-4 border-slate-950 text-xs sm:text-sm cursor-pointer"
                >
                  🚪 Thoát phòng
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => startMatch(undefined, undefined, false)}
                  className="bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 font-arcade font-bold px-4 py-2 rounded-xl shadow-lg border-b-4 border-emerald-800 text-xs cursor-pointer"
                >
                  ⚔️ Đấu Tiếp {battleMode}v{battleMode}
                </button>
                <button
                  onClick={scanRandomEnemy}
                  className="bg-gradient-to-b from-cyan-400 to-blue-600 text-white font-arcade font-bold px-4 py-2 rounded-xl shadow-lg border-b-4 border-blue-900 text-xs cursor-pointer"
                >
                  📡 Quét Địch Ngẫu Nhiên
                </button>
                <button
                  onClick={scanBossEnemy}
                  className="bg-gradient-to-b from-rose-500 to-red-700 text-white font-arcade font-bold px-4 py-2 rounded-xl shadow-lg border-b-4 border-red-950 text-xs cursor-pointer"
                >
                  👑 Săn Boss (+1,500 Xu)
                </button>
                <button
                  onClick={() => setIsFishPickerOpen(true)}
                  className="bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 font-arcade font-bold px-4 py-2 rounded-xl shadow-lg border-b-4 border-orange-800 text-xs cursor-pointer"
                >
                  🐟 Đổi Đội Hình
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      {/* THANH ĐIỀU KHIỂN SÁT ĐÁY */}
      <footer className="w-full mx-auto z-10 flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5">
        <div className="flex items-center bg-slate-900/95 border border-cyan-500/40 rounded-xl p-1 gap-1 shrink-0 w-full sm:w-auto justify-center">
          {([1, 3, 5] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setBattleMode(mode);
                setActiveBattleTeam(playerRoster.slice(0, mode));
                startMatch(undefined, undefined, false);
              }}
              className={`px-3 py-1.5 rounded-lg font-arcade font-extrabold text-xs transition cursor-pointer flex-1 sm:flex-initial ${
                battleMode === mode
                  ? "bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 shadow-md"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {mode}v{mode}
            </button>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-6 gap-1 sm:gap-1.5 w-full">
          <button
            onClick={() => setSimSpeed((s) => (s === 1 ? 2 : s === 2 ? 3 : 1))}
            className="flex items-center justify-center gap-1 bg-gradient-to-b from-amber-400 to-orange-500 border-b-2 border-orange-800 rounded-lg py-1.5 px-1 text-slate-950 font-arcade font-bold text-[10px] sm:text-xs cursor-pointer active:scale-95 transition truncate"
          >
            <span>⏩</span>
            <span>{simSpeed}x</span>
          </button>

          <button
            onClick={() => setIsAutoFarm(!isAutoFarm)}
            className={`flex items-center justify-center gap-1 border-b-2 rounded-lg py-1.5 px-1 font-arcade font-bold text-[10px] sm:text-xs cursor-pointer active:scale-95 transition truncate ${
              isAutoFarm
                ? "bg-gradient-to-b from-emerald-500 to-teal-700 border-teal-950 text-white animate-pulse"
                : "bg-gradient-to-b from-slate-700 to-slate-900 border-slate-950 text-slate-300"
            }`}
          >
            <span>🤖</span>
            <span className="truncate">{isAutoFarm ? "Auto Farm: BẬT" : "Auto Farm: TẮT"}</span>
          </button>

          <button
            onClick={scanRandomEnemy}
            className="flex items-center justify-center gap-1 bg-gradient-to-b from-cyan-400 to-blue-600 border-b-2 border-blue-900 rounded-lg py-1.5 px-1 text-white font-arcade font-bold text-[10px] sm:text-xs cursor-pointer active:scale-95 transition truncate"
          >
            <span>📡</span>
            <span className="truncate">Quét PvE</span>
          </button>

          <button
            onClick={() => {
              if (isScanning) return;
              setIsFishPickerOpen(true);
            }}
            className="flex items-center justify-center gap-1 bg-gradient-to-b from-emerald-400 to-teal-600 border-b-2 border-teal-900 rounded-lg py-1.5 px-1 text-slate-950 font-arcade font-bold text-[10px] sm:text-xs cursor-pointer active:scale-95 transition truncate"
          >
            <span>🐟</span>
            <span
              ref={(el) => {
                hudRefs.current.playerRosterLabel = el;
              }}
              className="truncate"
            >
              Chọn Đội ({activeBattleTeam.length})
            </span>
          </button>

          <button
            onClick={() => setIsHardcoreMode(!isHardcoreMode)}
            className={`flex items-center justify-center gap-1 border-b-2 rounded-lg py-1.5 px-1 font-arcade font-bold text-[10px] sm:text-xs cursor-pointer active:scale-95 transition truncate ${
              isHardcoreMode
                ? "bg-gradient-to-b from-rose-600 to-red-900 border-red-950 text-white animate-pulse"
                : "bg-gradient-to-b from-slate-700 to-slate-900 border-slate-950 text-slate-300"
            }`}
          >
            <span>💀</span>
            <span className="truncate">{isHardcoreMode ? "Tử: BẬT" : "Tử: TẮT"}</span>
          </button>

          <button
            onClick={() => setIsRoomLobbyOpen(true)}
            className="flex items-center justify-center gap-1 bg-gradient-to-b from-indigo-500 to-purple-700 border-b-2 border-indigo-950 rounded-lg py-1.5 px-1 text-white font-arcade font-bold text-[10px] sm:text-xs cursor-pointer active:scale-95 transition truncate"
          >
            <span>🏟️</span>
            <span className="truncate">{currentRoomId ? currentRoomId : "Phòng"}</span>
          </button>
        </div>
      </footer>

      {/* 🏟️ MODAL CHỌN PHÒNG REALTIME */}
      {isRoomLobbyOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-purple-500/50 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-arcade font-bold text-yellow-400">🏟️ PHÒNG ĐỌ CÁ MULTIPLAYER</h3>
              <button
                onClick={() => setIsRoomLobbyOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Chọn phòng, thả cá xuống hồ chờ (tối đa {battleMode} con không trùng lặp), đợi người chơi thứ 2 rồi bấm Sẵn Sàng!
            </p>

            <div className="flex flex-col gap-3">
              {[
                { id: "room_1", name: "🏠 Phòng 1: Ao Làng (Chill)", color: "from-blue-600 to-cyan-700" },
                { id: "room_2", name: "⚔️ Phòng 2: Sông Lớn (Cạnh tranh)", color: "from-emerald-600 to-teal-700" },
                { id: "room_3", name: "👑 Phòng 3: Đại Dương Thượng Cổ", color: "from-rose-600 to-red-800" },
              ].map((room) => (
                <button
                  key={room.id}
                  onClick={() => joinMultiplayerRoom(room.id)}
                  className={`p-4 bg-gradient-to-r ${room.color} rounded-xl font-bold shadow-lg transition active:scale-95 flex justify-between items-center text-left cursor-pointer`}
                >
                  <div>
                    <div className="text-sm font-bold">{room.name}</div>
                    <div className="text-[10px] opacity-80 font-normal">Trạng thái: Sẵn sàng vào phòng</div>
                  </div>
                  <span className="text-xs bg-slate-950 px-3 py-1.5 rounded-lg text-yellow-300 font-arcade">
                    VÀO NGAY
                  </span>
                </button>
              ))}

              {currentRoomId && (
                <button
                  onClick={leaveMultiplayerRoom}
                  className="mt-2 p-3 bg-red-600/30 border border-red-500/50 hover:bg-red-600/50 rounded-xl font-bold text-red-300 text-xs transition cursor-pointer"
                >
                  🚪 Rời khỏi phòng ({currentRoomId})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🐟 MODAL HỒ CHỜ THẢ CÁ MULTIPLAYER */}
      {roomFishPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex items-center justify-center p-3">
          <div className="bg-slate-900 border-2 border-purple-500/75 w-full max-w-4xl h-[90vh] rounded-3xl p-5 shadow-2xl flex flex-col text-white">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
              <div>
                <h3 className="text-lg font-arcade font-bold text-yellow-400">
                  🏟️ HỒ CHỜ PHÒNG: {currentRoomId} ({battleMode}v{battleMode})
                </h3>
                <p className="text-xs text-slate-300">Thả cá xuống hồ chờ (tối đa {battleMode} con không trùng lặp) rồi bấm Sẵn Sàng!</p>
              </div>
              <button
                onClick={() => setRoomFishPickerOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {matchCountdown !== null && (
              <div className="bg-amber-950/85 border-2 border-amber-400 rounded-2xl p-6 mb-4 text-center">
                <div className="text-xs text-amber-200 font-bold mb-1">Cả hai đã sẵn sàng! Trận đấu bắt đầu sau:</div>
                <div className="font-arcade font-extrabold text-6xl text-amber-400 animate-bounce">{matchCountdown}</div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-950 border border-emerald-500/50 rounded-2xl p-4 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-emerald-400">🌿 Hồ Chờ Của Bạn ({roomMyFishList.length}/{battleMode})</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isMyReady ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"}`}>
                    {isMyReady ? "ĐÃ SẴN SÀNG" : "CHƯA SẴN SÀNG"}
                  </span>
                </div>
                <div className="flex-1 min-h-[110px] bg-slate-900/70 rounded-xl p-2 flex flex-wrap gap-2 overflow-y-auto">
                  {roomMyFishList.length === 0 ? (
                    <div className="w-full text-center text-xs text-slate-500 py-8">Chưa có con cá nào trong hồ. Nhấn chọn bên dưới để thả vào!</div>
                  ) : (
                    roomMyFishList.map((f) => (
                      <div key={f.id} className="relative bg-slate-800 border border-emerald-400/40 rounded-xl p-2 flex items-center gap-2 w-[47%]">
                        <img src={`/assets/cauca/${f.filename}`} alt={f.name} className="w-10 h-10 object-contain" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate text-white">{f.name}</div>
                          <div className="text-[9px] text-amber-300">{formatFishWeight(f.weight)}</div>
                        </div>
                        <button
                          onClick={() => removeFishFromRoomPool(f.id)}
                          className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-700 text-white w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <button
                  onClick={toggleMyReadyState}
                  disabled={roomMyFishList.length === 0}
                  className={`mt-3 w-full py-2.5 rounded-xl font-arcade font-bold text-xs shadow-lg transition cursor-pointer ${
                    isMyReady
                      ? "bg-amber-500 text-slate-950 border-b-4 border-amber-700"
                      : "bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 border-b-4 border-teal-800 disabled:opacity-50"
                  }`}
                >
                  {isMyReady ? "HỦY SẴN SÀNG" : "✅ SẴN SÀNG BEM!"}
                </button>
              </div>

              <div className="bg-slate-950 border border-rose-500/50 rounded-2xl p-4 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-rose-400">🔥 Hồ Chờ Đối Thủ ({roomRivalFishList.length}/{battleMode})</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isRivalReady ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"}`}>
                    {isRivalReady ? "ĐÃ SẴN SÀNG" : "ĐANG CHỜ..."}
                  </span>
                </div>
                <div className="flex-1 min-h-[110px] bg-slate-900/70 rounded-xl p-2 flex flex-wrap gap-2 overflow-y-auto">
                  {roomRivalFishList.length === 0 ? (
                    <div className="w-full text-center text-xs text-slate-500 py-8">Đối thủ chưa thả cá vào hồ.</div>
                  ) : (
                    roomRivalFishList.map((f) => (
                      <div key={f.id} className="bg-slate-800 border border-rose-400/40 rounded-xl p-2 flex items-center gap-2 w-[47%]">
                        <img src={`/assets/cauca/${f.filename}`} alt={f.name} className="w-10 h-10 object-contain" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate text-white">{f.name}</div>
                          <div className="text-[9px] text-amber-300">{formatFishWeight(f.weight)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-3 py-2.5 text-center text-xs font-bold text-slate-400 bg-slate-900 rounded-xl border border-slate-800">
                  {isRivalReady ? "✨ Đối thủ đã sẵn sàng chiến đấu!" : "⏳ Đang đợi đối thủ xếp đội hình..."}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="text-xs font-bold text-slate-300 mb-2">Bấm vào cá dưới đây để thả vào hồ chờ:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {playerRoster.map((fish) => {
                  const isAlreadyInPool = roomMyFishList.some((f) => f.id === fish.id);
                  return (
                    <div
                      key={fish.id}
                      onClick={() => !isAlreadyInPool && addFishToRoomPool(fish)}
                      className={`bg-slate-950 border rounded-xl p-2 flex items-center gap-2 transition cursor-pointer ${
                        isAlreadyInPool ? "opacity-40 border-slate-800 cursor-not-allowed" : "border-slate-800 hover:border-purple-400"
                      }`}
                    >
                      <img src={`/assets/cauca/${fish.filename}`} alt={fish.name} className="w-12 h-12 object-contain" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate text-white">{fish.name}</div>
                        <div className="text-[10px] text-amber-300">{formatFishWeight(fish.weight)}</div>
                        <div className="text-[9px] text-emerald-400">{isAlreadyInPool ? "Đã thả" : "+ Thả vào hồ"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,600;0,700;1,700&display=swap");
        .font-arcade {
          font-family: "Chakra Petch", sans-serif;
        }
        @keyframes pulseGlow {
          0%,
          100% {
            box-shadow: 0 0 14px rgba(250, 204, 21, 0.8);
          }
          50% {
            box-shadow: 0 0 28px rgba(250, 204, 21, 1);
          }
        }
        .ki-full {
          animation: pulseGlow 0.9s infinite;
        }
      `}</style>
    </div>
  );
}