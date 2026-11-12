"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// --- HỆ THỐNG CLASS & SKILL TÍCH HỢP TRỰC TIẾP ---
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
    { id: "asn_5", name: "Vũ Điệu Tử Thần", classType: "ASSASSIN", category: "combo", powerMult: 1.6, vfx: "slash", color: "#0284c7", desc: "Liên kích 4 nhát chí mạng liên tiếp" },
    { id: "asn_6", name: "Đoạt Mệnh Ám Ảnh", classType: "ASSASSIN", category: "dash", powerMult: 1.5, vfx: "bite", color: "#38bdf8", desc: "Tập kích sau lưng gây choáng nhẹ" },
    { id: "asn_7", name: "Lôi Tốc Xé Gió", classType: "ASSASSIN", category: "projectile", powerMult: 1.35, vfx: "lightning", color: "#e0f2fe", desc: "Bắn cầu điện tốc độ siêu thanh" },
    { id: "asn_8", name: "Tuyệt Kỹ: Vô Ảnh Trảm", classType: "ASSASSIN", category: "ultimate", powerMult: 2.55, vfx: "slash", color: "#38bdf8", desc: "Chém nát không gian toàn màn hình" },
  ],
  TANKER: [
    { id: "tnk_1", name: "Thiết Giáp Húc Văng", classType: "TANKER", category: "dash", powerMult: 1.3, vfx: "shield", color: "#4ade80", desc: "Lấy thịt đè người húc bay đối thủ" },
    { id: "tnk_2", name: "Hồi Phục Biển Sâu", classType: "TANKER", category: "buff", powerMult: 1.2, vfx: "shield", color: "#22c55e", desc: "Hồi 15% máu tối đa & tăng giáp" },
    { id: "tnk_3", name: "Sóng Âm Trấn Áp", classType: "TANKER", category: "projectile", powerMult: 1.25, vfx: "whirlpool", color: "#86efac", desc: "Phát sóng chấn động đẩy lùi kẻ địch" },
    { id: "tnk_4", name: "Khiên Vảy Kim Cương", classType: "TANKER", category: "buff", powerMult: 1.35, vfx: "shield", color: "#bbf7d0", desc: "Gồng cứng vảy tăng 35% lực đọ sức" },
    { id: "tnk_5", name: "Địa Chấn Đáy Bể", classType: "TANKER", category: "dash", powerMult: 1.45, vfx: "meteor", color: "#16a34a", desc: "Nện mạnh xuống cát tạo sóng xung kích" },
    { id: "tnk_6", name: "Phun Bùn Độc Tố", classType: "TANKER", category: "projectile", powerMult: 1.3, vfx: "poison", color: "#a3e635", desc: "Bắn 3 khối bùn độc làm chậm" },
    { id: "tnk_7", name: "Bức Tường Sắt Đá", classType: "TANKER", category: "combo", powerMult: 1.4, vfx: "shield", color: "#4ade80", desc: "Ép góc liên hoàn bằng thân khổng lồ" },
    { id: "tnk_8", name: "Tuyệt Kỹ: Đại Sơn Áp Đỉnh", classType: "TANKER", category: "ultimate", powerMult: 2.4, vfx: "meteor", color: "#4ade80", desc: "Triệu hồi núi đá ngầm đè bẹp địch" },
  ],
  MAGE: [
    { id: "mag_1", name: "Cầu Lửa Huyết Long", classType: "MAGE", category: "projectile", powerMult: 1.4, vfx: "beam", color: "#f43f5e", desc: "Bắn 3 quả cầu rồng lửa rực cháy" },
    { id: "mag_2", name: "Lôi Điện Giáng Thế", classType: "MAGE", category: "projectile", powerMult: 1.45, vfx: "lightning", color: "#c084fc", desc: "Gọi tia sét đánh thẳng đầu đối thủ" },
    { id: "mag_3", name: "Độc Mực Hắc Ám", classType: "MAGE", category: "projectile", powerMult: 1.35, vfx: "poison", color: "#a855f7", desc: "Phun chùm độc tố ăn mòn giáp" },
    { id: "mag_4", name: "Tụ Khí Nguyên Thần", classType: "MAGE", category: "buff", powerMult: 1.45, vfx: "beam", color: "#e879f9", desc: "Hồi ngay 35 Ki & cường hóa phép" },
    { id: "mag_5", name: "Xoáy Nước Ma Thuật", classType: "MAGE", category: "combo", powerMult: 1.5, vfx: "whirlpool", color: "#22d3ee", desc: "Nhốt đối thủ trong lốc xoáy liên hoàn" },
    { id: "mag_6", name: "Mưa Sao Băng Đáy Biển", classType: "MAGE", category: "projectile", powerMult: 1.55, vfx: "meteor", color: "#d8b4fe", desc: "Rải mưa thiên thạch mini" },
    { id: "mag_7", name: "Bùng Nổ Năng Lượng", classType: "MAGE", category: "dash", powerMult: 1.4, vfx: "beam", color: "#f0abfc", desc: "Kích nổ vòng sáng quanh bản thân" },
    { id: "mag_8", name: "Tuyệt Kỹ: Kamehameha Thủy Long", classType: "MAGE", category: "ultimate", powerMult: 2.65, vfx: "beam", color: "#c084fc", desc: "Chưởng rồng năng lượng hủy diệt" },
  ],
  WARRIOR: [
    { id: "war_1", name: "Cuồng Nộ Xé Xác", classType: "WARRIOR", category: "combo", powerMult: 1.5, vfx: "bite", color: "#fb923c", desc: "Cắn xé liên hoàn 3 nhịp đẫm máu" },
    { id: "war_2", name: "Long Hổ Xung Kích", classType: "WARRIOR", category: "dash", powerMult: 1.45, vfx: "slash", color: "#f97316", desc: "Húc thẳng trực diện phá vỡ phòng thủ" },
    { id: "war_3", name: "Gầm Thét Bá Vương", classType: "WARRIOR", category: "buff", powerMult: 1.45, vfx: "beam", color: "#fdba74", desc: "Tăng 45% công & kích hoạt Siêu Saiyan" },
    { id: "war_4", name: "Sóng Kiếm Chém Ngang", classType: "WARRIOR", category: "projectile", powerMult: 1.35, vfx: "slash", color: "#ea580c", desc: "Phóng 3 luồng sóng xung kích đỏ rực" },
    { id: "war_5", name: "Hàm Răng Thép", classType: "WARRIOR", category: "dash", powerMult: 1.55, vfx: "bite", color: "#ef4444", desc: "Ngoạm chặt và quăng quật đối thủ" },
    { id: "war_6", name: "Liên Hoàn Cước Đuôi", classType: "WARRIOR", category: "combo", powerMult: 1.5, vfx: "whirlpool", color: "#f59e0b", desc: "Quất đuôi tạo lốc xoáy đánh văng" },
    { id: "war_7", name: "Huyết Chiến Bất Khuất", classType: "WARRIOR", category: "buff", powerMult: 1.5, vfx: "lightning", color: "#fb7185", desc: "Hồi 10% máu & tăng mạnh chí mạng" },
    { id: "war_8", name: "Tuyệt Kỹ: Bá Vương Trảm", classType: "WARRIOR", category: "ultimate", powerMult: 2.6, vfx: "slash", color: "#fb923c", desc: "Nhát chém hoàng kim nứt vỡ mặt kính" },
  ],
  BOSS: [
    { id: "boss_1", name: "Thiên Thạch Vực Sâu", classType: "BOSS", category: "ultimate", powerMult: 2.75, vfx: "meteor", color: "#f43f5e", desc: "Mưa thiên thạch cổ đại hủy diệt" },
    { id: "boss_2", name: "Đại Hồng Thủy Xoáy", classType: "BOSS", category: "ultimate", powerMult: 2.7, vfx: "whirlpool", color: "#22d3ee", desc: "Nuốt chửng mọi thứ vào tâm bão" },
    { id: "boss_3", name: "Hàm Răng Thượng Cổ", classType: "BOSS", category: "combo", powerMult: 1.8, vfx: "bite", color: "#fb7185", desc: "Cắn nát không gian 3 lần liên tiếp" },
    { id: "boss_4", name: "Lôi Đình Hủy Diệt", classType: "BOSS", category: "projectile", powerMult: 1.7, vfx: "lightning", color: "#facc15", desc: "Giáng sấm sét toàn đấu trường" },
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

function rollRandomFishSkills(
  filename: string,
  vnName = "",
  deterministic = false
): { fishClass: FishClassType; skills: FishSkill[] } {
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

// --- PHÂN TẦNG CÁ & DATABASE AI TOÀN BỘ LOÀI ---
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
  // === 1. TẦNG NÔNG (1 – 50 kg) ===
  { name: "Cá Rô Đồng", filename: "carodong.png", tier: "NONG", minWeight: 1.0, maxWeight: 12.0, quotes: ["Nhỏ nhưng có võ!", "Vây gai đâm thấu xương!"] },
  { name: "Cá Diêu Hồng", filename: "cadieuhong.png", tier: "NONG", minWeight: 3.0, maxWeight: 22.0, quotes: ["Ánh hồng rực rỡ!", "Xem ta quất đuôi nè!"] },
  { name: "Cá Lóc Bông", filename: "calocbong.png", tier: "NONG", minWeight: 8.0, maxWeight: 48.0, fishClass: "ASSASSIN", quotes: ["Tập kích chớp nhoáng!", "Hàm răng sắc lẹm!"] },
  { name: "Cá Chép Vàng", filename: "cachepvang.png", tier: "NONG", minWeight: 5.0, maxWeight: 38.0, fishClass: "MAGE", quotes: ["Vượt vũ môn hóa rồng!", "Thủy cầu ma pháp!"] },
  { name: "Cá Trê Phi", filename: "catrephi.png", tier: "NONG", minWeight: 10.0, maxWeight: 50.0, fishClass: "TANKER", quotes: ["Da trơn khó bắt!", "Húc văng đối thủ!"] },
  { name: "Cá La Hán", filename: "calahan.png", tier: "NONG", minWeight: 4.0, maxWeight: 30.0, fishClass: "MAGE", quotes: ["Đầu gù tụ khí!", "Chưởng lực bùng nổ!"] },

  // === 2. TẦNG TRUNG (50 – 200 kg) ===
  { name: "Cá Tai Tượng Khổng Lồ", filename: "cataituong.png", tier: "TRUNG", minWeight: 55.0, maxWeight: 145.0, fishClass: "TANKER", quotes: ["Lấy thịt đè người!", "Giáp vảy kim cương!"] },
  { name: "Cá Tra Dầu", filename: "catradau.png", tier: "TRUNG", minWeight: 80.0, maxWeight: 195.0, fishClass: "TANKER", quotes: ["Sức mạnh sông Mê Kông!", "Địa chấn đáy bể!"] },
  { name: "Cá Chép Koi Hoàng Kim", filename: "cachepkoi.png", tier: "TRUNG", minWeight: 52.0, maxWeight: 130.0, fishClass: "MAGE", quotes: ["Hào quang hoàng kim!", "Kamehameha thủy long!"] },
  { name: "Cá Huyết Long", filename: "cahuyetlong.png", tier: "TRUNG", minWeight: 65.0, maxWeight: 170.0, fishClass: "MAGE", quotes: ["Cầu lửa huyết long!", "Long uy chấn nhiếp!"] },
  { name: "Cá Chim Trắng", filename: "cachimtrang.png", tier: "TRUNG", minWeight: 50.5, maxWeight: 120.0, fishClass: "ASSASSIN", quotes: ["Tốc độ tia chớp!", "Ảnh phân thân trảm!"] },
  { name: "Cá Ngừ Vây Xanh", filename: "canguvayxanh.png", tier: "TRUNG", minWeight: 90.0, maxWeight: 200.0, fishClass: "ASSASSIN", quotes: ["Mũi khoan siêu thanh!", "Không kịp trở tay đâu!"] },

  // === 3. TẦNG CÁ LỚN (200 kg – 10,000 kg) ===
  { name: "Cá Mập Trắng", filename: "camaptrang.png", tier: "LON", minWeight: 450.0, maxWeight: 3200.0, fishClass: "WARRIOR", quotes: ["Hàm răng thép!", "Cuồng nộ xé xác!"] },
  { name: "Cá Mập Đầu Búa", filename: "camapdaubua.png", tier: "LON", minWeight: 250.0, maxWeight: 1800.0, fishClass: "ASSASSIN", quotes: ["Cú đập búa tạ!", "Vô ảnh trảm!"] },
  { name: "Cá Voi Sát Thủ", filename: "cavoisatthu.png", tier: "LON", minWeight: 1500.0, maxWeight: 6500.0, fishClass: "ASSASSIN", quotes: ["Tốc độ ánh sáng!", "Đoạt mệnh ám ảnh!"] },
  { name: "Cá Đuối Mata Điện", filename: "caduoimata.png", tier: "LON", minWeight: 300.0, maxWeight: 2200.0, fishClass: "MAGE", quotes: ["Lôi điện giáng thế!", "Sấm sét giật tê tái!"] },
  { name: "Cá Nhám Voi Khổng Lồ", filename: "canhamvoi.png", tier: "LON", minWeight: 2500.0, maxWeight: 10000.0, fishClass: "TANKER", quotes: ["Bức tường sắt đá!", "Đại sơn áp đỉnh!"] },
  { name: "Cá Hô Đại Nam", filename: "cahodainam.png", tier: "LON", minWeight: 210.0, maxWeight: 950.0, fishClass: "WARRIOR", quotes: ["Bá vương sông nước!", "Bá vương trảm!"] },

  // === 4. TẦNG BOSS THƯỢNG CỔ (20 tấn – 200 tấn = 20,000 – 200,000 kg) ===
  { name: "Megalodon Sơ Cổ", filename: "megalodon.png", tier: "BOSS", minWeight: 20000.0, maxWeight: 85000.0, fishClass: "BOSS", quotes: ["Thiên thạch giáng thế!", "Húc một phát nứt kính!", "Gào thét đi cá con!"] },
  { name: "Mosasaurus Đại Dương", filename: "mosa.png", tier: "BOSS", minWeight: 45000.0, maxWeight: 130000.0, fishClass: "BOSS", quotes: ["Nuốt chửng đại dương!", "Xoáy nước tử thần!", "Quỳ gối trước cổ thú!"] },
  { name: "Livyatan Thượng Cổ", filename: "livyatan.png", tier: "BOSS", minWeight: 80000.0, maxWeight: 200000.0, fishClass: "BOSS", quotes: ["Chúa tể biển sâu!", "Nghiền nát tất cả!", "Bóng tối nuốt chửng ngươi!"] },
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

// Công thức đồng bộ chỉ số HP & ATK theo cân nặng (nhịp trận ~12-16s ở 1x, đánh đã tay)
function calcBalancedCombatStats(weight: number, meta: { hpBonus: number; atkBonus: number }) {
  const safeW = Math.max(1, Number(weight || 1));
  const baseHp = Math.floor(Math.sqrt(safeW) * 76 + 520);
  const baseAtk = Math.floor(Math.sqrt(safeW) * 14 + 105);
  return {
    maxHp: Math.round(baseHp * meta.hpBonus),
    atk: Math.round(baseAtk * meta.atkBonus),
  };
}

// --- CẤU HÌNH SUPABASE ---
const supabaseUrl = "https://iaejbvlibjfpdwuqfszp.supabase.co";
const supabaseKey = "sb_publishable_Bf1jY3-FAjFRij0LMn5FLQ_nLrw2MUE";
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

function normalizeFishSlug(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\(con\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}

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
  const [isHardcoreMode, setIsHardcoreMode] = useState<boolean>(false); // 💀 Chế độ sinh tử
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null); // Đang ở phòng nào
  const [activeChannel, setActiveChannel] = useState<any>(null); // Kênh realtime Supabase
  const [isRoomLobbyOpen, setIsRoomLobbyOpen] = useState<boolean>(false); // Bật/tắt bảng chọn 3 phòng

  const [playerRoster, setPlayerRoster] = useState<any[]>([]);
  const [playerRosterIdx, setPlayerRosterIdx] = useState<number>(0);
  const [currentEnemyCfg, setCurrentEnemyCfg] = useState<any>(() => {
    const first = ALL_FISH_DATABASE.find((f) => f.tier === "NONG") || ALL_FISH_DATABASE[0];
    const rolled = rollRandomFishSkills(first.filename, first.name, true);
    const meta = CLASS_META[first.fishClass || rolled.fishClass];
    const stats = calcBalancedCombatStats(12.0, meta);
    return {
      name: first.name,
      filename: first.filename,
      tier: first.tier,
      isBossBattle: false,
      fishClass: first.fishClass || rolled.fishClass,
      skills: rolled.skills,
      weight: 12.0,
      maxHp: stats.maxHp,
      atk: stats.atk,
      kiGain: 15,
      quotes: first.quotes,
    };
  });

  // Lưu lịch sử tên đối thủ đã gặp để chống trùng lặp tối đa 2 lần liên tiếp
  const recentEnemyHistoryRef = useRef<string[]>([]);

  // Modal Kho Cá chọn chiến binh
  const [isFishPickerOpen, setIsFishPickerOpen] = useState<boolean>(false);
  const [pickerFilter, setPickerFilter] = useState<"all" | "aquarium" | "fish_inventory">("all");

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
  });

  const battleRef = useRef({
    width: 800,
    height: 450,
    playerFish: null as any,
    rivalFish: null as any,
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
    clashState: null as any,
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

  // Chọn loài ngẫu nhiên trong danh sách nhưng không trùng quá 2 lần liên tiếp
  function pickNonDuplicateSpecies(candidates: DbFishSpecies[]): DbFishSpecies {
    const history = recentEnemyHistoryRef.current;
    const lastOne = history[history.length - 1];
    const lastTwo = history[history.length - 2];
    let validPool = candidates;

    if (lastOne && lastTwo && lastOne === lastTwo && candidates.length > 1) {
      validPool = candidates.filter((c) => c.name !== lastOne);
    }

    const picked = validPool[Math.floor(Math.random() * validPool.length)];
    recentEnemyHistoryRef.current = [...history.slice(-4), picked.name];
    return picked;
  }

  // Tạo cấu hình AI cùng tầng với con cá đang chọn
  function buildSameTierEnemyConfig(playerFish: any) {
    const playerTier = detectFishTier(playerFish);
    const tierCap = TIER_META[playerTier].maxW;
    const sameTierList = ALL_FISH_DATABASE.filter((f) => f.tier === playerTier);
    const picked = pickNonDuplicateSpecies(sameTierList);

    const playerW = Number(playerFish?.weight || 50);
    const minW = Math.max(picked.minWeight, playerW * 0.8);
    const maxW = playerTier === "LON" || playerTier === "BOSS"
      ? Math.min(tierCap, playerW * 1.3)
      : Math.min(picked.maxWeight, tierCap);
    const randomWeight = +(minW + Math.random() * (maxW - minW)).toFixed(1);

    const rolled = rollRandomFishSkills(picked.filename, picked.name);
    const finalClass = picked.fishClass || rolled.fishClass;
    const meta = CLASS_META[finalClass];
    const stats = calcBalancedCombatStats(randomWeight, meta);

    return {
      name: picked.name,
      filename: picked.filename,
      tier: playerTier,
      isBossBattle: false,
      fishClass: finalClass,
      skills: rolled.skills,
      weight: randomWeight,
      maxHp: stats.maxHp,
      atk: stats.atk,
      kiGain: finalClass === "ASSASSIN" || finalClass === "MAGE" ? 18 : 15,
      quotes: picked.quotes,
    };
  }

  // 1. TẢI DỮ LIỆU TỪ SUPABASE & GÁN CLASS + 4 SKILL
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

          // 🛑 CHẶN NGAY: Nếu kho cá hoàn toàn trống, thông báo và không tạo cá ma mặc định nữa!
          if (allDbFishes.length === 0) {
            alert("Túi cá và hồ cá của ní đang trống hoàn toàn! Hãy đi câu hoặc bắt cá trước khi vào Đấu Trường nhé.");
            setPlayerRoster([]);
            return;
          }

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
              scale: 1.12,
              quotes: [
                `${meta.icon} Hệ ${meta.label} xuất kích!`,
                `Xem ${skills[0]?.name || "tuyệt chiêu"} nè!`,
                "Gồng Ki bùng nổ!",
              ],
            };
          });

          setPlayerRoster(mappedFishes);
          setCurrentEnemyCfg(buildSameTierEnemyConfig(mappedFishes[0]));

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

  // 2. KHỞI TẠO CANVAS & GAME LOOP
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const container = containerRef.current;
    const updateSize = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      battleRef.current.width = rect.width;
      battleRef.current.height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initEnvironment();
    };

    window.addEventListener("resize", updateSize);
    updateSize();

    if (playerRoster.length > 0) {
      startMatch();
    }

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
  }, [playerRoster, playerRosterIdx, currentEnemyCfg]);

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

  function createFish(cfg: any, isPlayer: boolean) {
    const { width, height } = battleRef.current;
    const startX = isPlayer ? width * 0.25 : width * 0.75;
    const startY = height * 0.53;
    const fishClass: FishClassType = cfg.fishClass || "WARRIOR";
    const meta = CLASS_META[fishClass];
    const skills: FishSkill[] =
      Array.isArray(cfg.skills) && cfg.skills.length > 0
        ? cfg.skills
        : rollRandomFishSkills(cfg.filename, cfg.name).skills;

    return {
      isPlayer,
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
      baseScale: cfg.scale || 1.12,
      currentScale: cfg.scale || 1.12,
      auraColor: cfg.auraColor || meta.color,
      quotes: cfg.quotes || [`${meta.icon} ${meta.label} xung trận!`],
      aiState: "CIRCLING",
      aiTimer: 0.6 + Math.random() * 0.4,
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
    };
  }

  function startMatch() {
    if (playerRoster.length === 0) return;
    const safeIdx = playerRosterIdx % playerRoster.length;
    const pCfg = playerRoster[safeIdx];
    const bs = battleRef.current;

    bs.playerFish = createFish(pCfg, true);
    bs.rivalFish = createFish(currentEnemyCfg, false);

    bs.particles = [];
    bs.shockwaves = [];
    bs.floatingTexts = [];
    bs.glassCracks = [];
    bs.projectiles = [];
    bs.slashArcs = [];
    bs.afterimages = [];
    bs.activeUltVfx = null;
    bs.clashState = null;
    bs.gameOver = false;
    bs.hitStopTimer = 0;
    bs.shakeTime = 0;
    bs.cameraZoom = 1.0;
    bs.screenFlash = 0;

    if (hudRefs.current.resultOverlay) hudRefs.current.resultOverlay.classList.add("hidden");
    if (hudRefs.current.ultCutIn) hudRefs.current.ultCutIn.classList.add("hidden");

    const pMeta = CLASS_META[bs.playerFish.fishClass as FishClassType];
    const eMeta = CLASS_META[bs.rivalFish.fishClass as FishClassType];

    if (hudRefs.current.pDot) hudRefs.current.pDot.style.backgroundColor = pMeta.color;
    if (hudRefs.current.pClassBadge) hudRefs.current.pClassBadge.textContent = `${pMeta.icon} ${pMeta.label}`;
    if (hudRefs.current.eDot) hudRefs.current.eDot.style.backgroundColor = eMeta.color;
    if (hudRefs.current.eClassBadge) hudRefs.current.eClassBadge.textContent = `${eMeta.icon} ${eMeta.label}`;

    if (hudRefs.current.playerRosterLabel) {
      hudRefs.current.playerRosterLabel.textContent = `${safeIdx + 1} / ${playerRoster.length} Cá Cưng`;
    }

    sayQuote(bs.playerFish, pCfg.quotes[0]);
    sayQuote(bs.rivalFish, currentEnemyCfg.quotes[0]);
    updateHUD();
  }

  // QUÉT ĐỐI THỦ PVE CÙNG TẦNG CÁ ĐANG CẦM (RANDOM KÝ <= MAX TẦNG, KHÔNG TRÙNG QUÁ 2 LẦN)
  function scanSameTierEnemy() {
    if (isScanning || playerRoster.length === 0) return;
    setIsScanning(true);
    if (hudRefs.current.resultOverlay) hudRefs.current.resultOverlay.classList.add("hidden");
    if (hudRefs.current.radarOverlay) hudRefs.current.radarOverlay.classList.remove("hidden");

    const activePlayerFish = playerRoster[playerRosterIdx % playerRoster.length];

    setTimeout(() => {
      setCurrentEnemyCfg(buildSameTierEnemyConfig(activePlayerFish));
      if (hudRefs.current.radarOverlay) hudRefs.current.radarOverlay.classList.add("hidden");
      setIsScanning(false);
    }, 900);
  }

  // KHIÊU CHIẾN BOSS THƯỢNG CỔ (20–200 TẤN, SCALE MÁU THEO CÁ NHÀ + QUÀ BOSS NGON HƠN)
  function scanBossEnemy() {
    if (isScanning || playerRoster.length === 0) return;
    setIsScanning(true);
    if (hudRefs.current.resultOverlay) hudRefs.current.resultOverlay.classList.add("hidden");
    if (hudRefs.current.radarOverlay) hudRefs.current.radarOverlay.classList.remove("hidden");

    const activePlayerFish = playerRoster[playerRosterIdx % playerRoster.length];

    setTimeout(() => {
      const bossList = ALL_FISH_DATABASE.filter((f) => f.tier === "BOSS");
      const picked = pickNonDuplicateSpecies(bossList);
      const randomWeight = +(picked.minWeight + Math.random() * (picked.maxWeight - picked.minWeight)).toFixed(1);
      const rolled = rollRandomFishSkills(picked.filename, picked.name);

      // Scale máu & công Boss cân bằng theo chỉ số cá nhà để đánh kịch tính ~15-20s
      const scaledMaxHp = Math.max(1250, Math.round(activePlayerFish.maxHp * 1.42));
      const scaledAtk = Math.max(125, Math.round(activePlayerFish.atk * 1.15));

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
        kiGain: 16,
        quotes: picked.quotes,
      });

      if (hudRefs.current.radarOverlay) hudRefs.current.radarOverlay.classList.add("hidden");
      setIsScanning(false);
    }, 1000);
  }
// 👇 DÁN CỤM 3 HÀM REALTIME NÀY VÀO NGAY ĐÂY:
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

    // Tạo kênh kết nối Supabase Realtime cho phòng
    const channel = supabase.channel(`arena_${roomId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'fish_action' }, (payload) => {
        const data = payload.payload;
        console.log("Nhận tín hiệu PvP từ đối thủ:", data);
        
        // 👉 Xử lý khi đối thủ bên kia ra đòn tấn công hoặc dùng skill
        if (data.type === 'PVP_ATTACK' && battleRef.current.playerFish) {
          const bs = battleRef.current;
          // Trừ máu cá nhà theo sát thương đối thủ vừa gây ra
          bs.playerFish.hp = Math.max(0, bs.playerFish.hp - data.damage);
          triggerShake(12, 0.25);
          spawnFloatingText(bs.playerFish.x, bs.playerFish.y - 40, `💥 -${data.damage} (PvP)`, "#f43f5e", 18);
          updateHUD();
          
          if (bs.playerFish.hp <= 0 && !bs.gameOver) {
            bs.gameOver = true;
            setTimeout(() => endMatch(false), 400);
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Đã vào phòng realtime: ${roomId}`);
          await channel.send({
            type: 'broadcast',
            event: 'fish_action',
            payload: { type: 'JOIN_ROOM', userId: user.id, name: user.email || 'Người chơi' }
          });
        }
      });
      
    setActiveChannel(channel);
  }

  function leaveMultiplayerRoom() {
    if (activeChannel) {
      activeChannel.send({
        type: 'broadcast',
        event: 'fish_action',
        payload: { type: 'LEAVE_ROOM', userId: user?.id }
      });
      activeChannel.unsubscribe();
      setActiveChannel(null);
    }
    setCurrentRoomId(null);
  }

  function sendRealtimeAction(actionType: string, actionData: any) {
    if (!activeChannel) return;
    activeChannel.send({
      type: 'broadcast',
      event: 'fish_action',
      payload: { userId: user?.id, type: actionType, ...actionData },
    });
  }
  function sayQuote(fish: any, text: string) {
    fish.speech = text;
    fish.speechTimer = 1.9;
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

  function spawnFloatingText(x: number, y: number, text: string, color = "#fff", size = 19) {
    battleRef.current.floatingTexts.push({
      x,
      y,
      vy: -58,
      text,
      color,
      size,
      life: 0.95,
      maxLife: 0.95,
    });
  }

  function spawnShockwave(x: number, y: number, color: string, maxRadius = 110) {
    battleRef.current.shockwaves.push({
      x,
      y,
      r: 10,
      maxR: maxRadius,
      color,
      life: 0.45,
      maxLife: 0.45,
    });
  }

  function spawnSlashArc(x: number, y: number, color: string, angle: number) {
    battleRef.current.slashArcs.push({
      x,
      y,
      color,
      angle,
      radius: 44 + Math.random() * 24,
      life: 0.28,
      maxLife: 0.28,
    });
  }

  function spawnParticles(x: number, y: number, color: string, count = 18, speedScale = 1) {
    const bs = battleRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (70 + Math.random() * 210) * speedScale;
      bs.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 2.5 + Math.random() * 4.8,
        color: Math.random() > 0.35 ? color : "#ffffff",
        life: 0.35 + Math.random() * 0.48,
        maxLife: 0.85,
      });
    }
  }

  function spawnGlassCrack(x: number, y: number) {
    const bs = battleRef.current;
    if (bs.glassCracks.length > 5) bs.glassCracks.shift();
    const lines = [];
    const branches = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < branches; i++) {
      const a = (i / branches) * Math.PI * 2 + Math.random() * 0.4;
      const len = 22 + Math.random() * 34;
      lines.push({ x1: x, y1: y, x2: x + Math.cos(a) * len, y2: y + Math.sin(a) * len });
    }
    bs.glassCracks.push({ x, y, lines, alpha: 0.72 });
  }

  // --- AI CHỌN 1 TRONG 4 SKILL RIÊNG CỦA CON CÁ ---
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

  // --- THỰC THI SKILL THEO ĐÚNG THUỘC TÍNH SKILL CỦA CON CÁ ---
  function executeSkill(fish: any, opponent: any, skill: FishSkill, isOverdrive: boolean) {
    fish.activeSkill = skill;
    fish.dir = opponent.x >= fish.x ? 1 : -1;

    if (isOverdrive) {
      fish.ki = 0;
      fish.aiState = "CAST_ULTIMATE";
      fish.aiTimer = 0.92;
      fish.superSaiyan = true;

      const dmg = Math.round(fish.atk * skill.powerMult * fish.powerBuff);
      fish.powerBuff = 1.0;

      if (hudRefs.current.ultCasterName) {
        hudRefs.current.ultCasterName.textContent = `${fish.name} (${fish.classLabel})`;
      }
      if (hudRefs.current.ultSkillTitle) {
        hudRefs.current.ultSkillTitle.textContent = `⚡ ${skill.name.toUpperCase()}!`;
      }
      if (hudRefs.current.ultCutIn) hudRefs.current.ultCutIn.classList.remove("hidden");

      battleRef.current.cutInTimer = 1.15;
      battleRef.current.cameraZoom = 1.08;
      triggerFlash(skill.color, 0.5);
      sayQuote(fish, `${skill.name}!!`);

      triggerSkillVisualEffect(fish, opponent, skill);
      spawnShockwave(opponent.x, opponent.y, skill.color, 195);
      spawnShockwave(opponent.x, opponent.y, "#ffffff", 135);
      spawnParticles(opponent.x, opponent.y, skill.color, 44, 1.5);

      applyDamage(fish, opponent, dmg, true, `💥 ${skill.name}: -${dmg}!`);
      spawnGlassCrack(opponent.x + (Math.random() - 0.5) * 35, opponent.y + (Math.random() - 0.5) * 35);
      return;
    }

    spawnFloatingText(fish.x, fish.y - 52, `✨ ${skill.name}`, skill.color, 14);

    if (skill.category === "buff") {
      fish.aiState = "CHARGING";
      fish.aiTimer = 0.6;
      fish.ki = Math.min(fish.maxKi, fish.ki + 28);
      fish.powerBuff = Math.min(1.9, +(fish.powerBuff + (skill.powerMult - 1)).toFixed(2));
      if (fish.ki >= 70) fish.superSaiyan = true;

      if (fish.fishClass === "TANKER" || fish.fishClass === "WARRIOR") {
        const healAmt = Math.round(fish.maxHp * (fish.fishClass === "TANKER" ? 0.14 : 0.08));
        fish.hp = Math.min(fish.maxHp, fish.hp + healAmt);
        spawnFloatingText(fish.x, fish.y - 28, `💚 +${healAmt} HP`, "#4ade80", 15);
      }

      triggerShake(4, 0.16);
      spawnShockwave(fish.x, fish.y, skill.color, 95);
      spawnParticles(fish.x, fish.y, skill.color, 20, 0.85);
      sayQuote(fish, `${skill.name}!`);
      return;
    }

    if (skill.category === "projectile") {
      fish.aiState = "KI_BARRAGE";
      fish.aiTimer = 0.55;
      spawnShockwave(fish.x + fish.dir * 35, fish.y, skill.color, 70);
      sayQuote(fish, `${skill.name}!`);

      const boltCount = fish.fishClass === "MAGE" ? 4 : 3;
      for (let i = 0; i < boltCount; i++) {
        const spreadY = (i - (boltCount - 1) / 2) * 24;
        const speed = 530 + i * 35;
        battleRef.current.projectiles.push({
          ownerIsPlayer: fish.isPlayer,
          skillName: skill.name,
          vfx: skill.vfx,
          x: fish.x + fish.dir * 45,
          y: fish.y + spreadY * 0.4,
          vx: fish.dir * speed,
          vy: spreadY * 1.35,
          radius: 13,
          color: skill.color,
          damage: Math.round((fish.atk * skill.powerMult * fish.powerBuff) / boltCount),
          life: 1.45,
        });
      }
      return;
    }

    if (skill.category === "combo") {
      fish.aiState = "TELEPORT_COMBO";
      fish.comboStep = 0;
      fish.comboMaxSteps = fish.fishClass === "ASSASSIN" ? 4 : 3;
      fish.comboTimer = 0.05;
      fish.aiTimer = 0.85;
      sayQuote(fish, `${skill.name}!`);
      return;
    }

    fish.aiState = "DASH_ATTACK";
    fish.aiTimer = 0.48;
    const dx = opponent.x - fish.x;
    const dy = opponent.y - fish.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dashSpeed = Math.max(battleRef.current.width * 1.55, 740);

    fish.vx = (dx / dist) * dashSpeed;
    fish.vy = (dy / dist) * dashSpeed;
    spawnShockwave(fish.x, fish.y, skill.color, 80);
    spawnParticles(fish.x, fish.y, skill.color, 15, 0.85);
    sayQuote(fish, `${skill.name}!`);
  }

  function triggerSkillVisualEffect(attacker: any, defender: any, skill: FishSkill) {
    const vfx = skill.vfx;
    if (vfx === "lightning") {
      const bolts = [];
      for (let b = 0; b < 5; b++) {
        const targetX = defender.x + (b - 2) * 28;
        const pts = [{ x: targetX + (Math.random() - 0.5) * 40, y: 0 }];
        const steps = 6;
        for (let s = 1; s <= steps; s++) {
          pts.push({
            x: targetX + (s === steps ? 0 : (Math.random() - 0.5) * 48),
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
        life: 0.85,
        maxLife: 0.85,
      };
    } else if (vfx === "meteor") {
      const meteors = [];
      for (let m = 0; m < 6; m++) {
        const tx = defender.x + (Math.random() - 0.5) * 110;
        const ty = defender.y + (Math.random() - 0.5) * 60;
        meteors.push({
          sx: tx - attacker.dir * 220,
          sy: -40 - m * 45,
          tx,
          ty,
          r: 18 + Math.random() * 12,
        });
      }
      battleRef.current.activeUltVfx = {
        type: "meteor",
        meteors,
        x2: defender.x,
        y2: defender.y,
        color: skill.color,
        life: 0.9,
        maxLife: 0.9,
      };
    } else if (vfx === "poison") {
      battleRef.current.activeUltVfx = {
        type: "poison",
        x2: defender.x,
        y2: defender.y,
        color: skill.color,
        life: 0.85,
        maxLife: 0.85,
      };
    } else if (vfx === "whirlpool") {
      battleRef.current.activeUltVfx = {
        type: "whirlpool",
        x2: defender.x,
        y2: defender.y,
        color: skill.color,
        life: 0.9,
        maxLife: 0.9,
      };
    } else if (vfx === "slash" || vfx === "bite") {
      for (let s = 0; s < 5; s++) {
        spawnSlashArc(
          defender.x + (Math.random() - 0.5) * 40,
          defender.y + (Math.random() - 0.5) * 40,
          skill.color,
          (s - 2) * 0.55
        );
      }
      battleRef.current.activeUltVfx = {
        type: "beam",
        x1: attacker.x + attacker.dir * 45,
        y1: attacker.y,
        x2: defender.x,
        y2: defender.y,
        color: skill.color,
        core: "#ffffff",
        life: 0.7,
        maxLife: 0.7,
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
        life: 0.85,
        maxLife: 0.85,
      };
    }
  }

  function applyDamage(attacker: any, defender: any, rawDamage: number, isCrit = false, customLabel?: string) {
    const bs = battleRef.current;
    const finalDamage =
      defender.fishClass === "TANKER" ? Math.max(1, Math.round(rawDamage * 0.88)) : rawDamage;

    defender.hp = Math.max(0, defender.hp - finalDamage);
    defender.flashTimer = 0.16;
    defender.ki = Math.min(defender.maxKi, defender.ki + 14);
    attacker.ki = Math.min(attacker.maxKi, attacker.ki + 11);

    if (defender.aiState === "DASH_ATTACK") {
      defender.aiState = "CIRCLING";
    }

    const pushDir = defender.x >= attacker.x ? 1 : -1;
    const knockbackResistance = defender.fishClass === "TANKER" || defender.fishClass === "BOSS" ? 0.65 : 1.0;
    defender.vx = pushDir * (isCrit ? 480 : 280) * knockbackResistance;
    defender.vy = (Math.random() - 0.5) * 160;

    bs.hitStopTimer = isCrit ? 0.06 : 0.03;
    triggerShake(isCrit ? 16 : 8, isCrit ? 0.35 : 0.18);

    const midX = (attacker.x + defender.x) / 2;
    const midY = (attacker.y + defender.y) / 2;
    spawnShockwave(defender.x, defender.y, isCrit ? "#facc15" : "#38bdf8", isCrit ? 150 : 90);
    spawnParticles(midX, midY, attacker.auraColor, isCrit ? 28 : 14, isCrit ? 1.3 : 1);

    spawnFloatingText(
      defender.x,
      defender.y - 42,
      customLabel || (isCrit ? `💥 -${finalDamage} CHÍ MẠNG!` : `-${finalDamage}`),
      isCrit ? "#facc15" : "#ffffff",
      isCrit ? 21 : 17
    );

    if (defender.hp <= 0 && !bs.gameOver) {
      bs.gameOver = true; // Khóa ngay trận đấu để không nhận thêm đòn đánh thừa
      
      // Cho game khựng lại 0.4 giây để người chơi thưởng thức trọn vẹn đòn chí mạng cuối cùng
      setTimeout(() => {
        endMatch(attacker.isPlayer);
      }, 400); 
    }
    updateHUD();
  }

  // 3. KẾT THÚC TRẬN ĐẤU & CẬP NHẬT AN TOÀN LÊN SUPABASE (THƯỞNG BOSS CAO HƠN)
  async function endMatch(playerWon: boolean) {
    const bs = battleRef.current;
    bs.gameOver = true;
    triggerFlash(playerWon ? "#facc15" : "#f43f5e", 0.55);
    if (hudRefs.current.ultCutIn) hudRefs.current.ultCutIn.classList.add("hidden");
    if (hudRefs.current.resultOverlay) hudRefs.current.resultOverlay.classList.remove("hidden");

    if (playerWon) {
      const isBossWin = Boolean(currentEnemyCfg?.isBossBattle);
      const bonusWeight = isBossWin ? 1.5 : 0.8;

      // 1. TĂNG CHUỖI THẮNG VÀ TÍNH THƯỞNG TĂNG DẦN THEO WINSTREAK
      const currentStreak = winStreak + 1;
      setWinStreak(currentStreak);
      if (hudRefs.current.streakText) hudRefs.current.streakText.textContent = `Chuỗi: ${currentStreak}🔥`;

      const baseCoins = isBossWin ? 1500 : 500;
      const streakBonus = isBossWin ? (currentStreak - 1) * 400 : (currentStreak - 1) * 150;
      
      // 2. CHECK HARDCORE: BẬT LÀ X2 TIỀN THƯỞNG, TẮT THÌ ĂN BÌNH THƯỜNG (CHILL)
      let bonusCoins = baseCoins + streakBonus;
      if (isHardcoreMode) {
        bonusCoins *= 2; 
      }

      const updatedRoster = [...playerRoster];
      const safeIdx = playerRosterIdx % updatedRoster.length;
      const activeFish = updatedRoster[safeIdx];
      activeFish.weight = +(activeFish.weight + bonusWeight).toFixed(1);
      activeFish.tier = detectFishTier(activeFish);
      const meta = CLASS_META[activeFish.fishClass as FishClassType] || CLASS_META.WARRIOR;
      const newStats = calcBalancedCombatStats(activeFish.weight, meta);
      activeFish.maxHp = newStats.maxHp;
      activeFish.atk = newStats.atk;
      setPlayerRoster(updatedRoster);

      const newScore = Number(score ?? 0) + bonusCoins;
      setScore(newScore);

      if (user?.id) {
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
        hudRefs.current.resultBadge.textContent = isBossWin ? "👑 HẠ GỤC BOSS THƯỢNG CỔ!" : "🏆 CHIẾN THẮNG!";
        hudRefs.current.resultBadge.className =
          "font-arcade font-extrabold text-2xl sm:text-5xl italic tracking-wider text-yellow-400 drop-shadow-[0_4px_16px_rgba(250,204,21,0.6)] mb-2";
      }
      if (hudRefs.current.resultSub) {
        hudRefs.current.resultSub.textContent = `${bs.playerFish.name} hạ gục ${bs.rivalFish.name}! Tăng +${bonusWeight} kg & nhận +${bonusCoins.toLocaleString()} Xu ${isHardcoreMode ? "(🔥 Hardcore x2)" : "(🌱 Chill)"} (Chuỗi ${currentStreak}🔥)!`;
      }
    } else {
      // 3. NHÁNH THUA TRẬN (RESET CHUỖI VÀ XÉT HARDCORE XÓA CÁ VĨNH VIỄN)
      setWinStreak(0);
      if (hudRefs.current.streakText) hudRefs.current.streakText.textContent = "Chuỗi: 0🔥";

      const updatedRoster = [...playerRoster];
      const safeIdx = playerRosterIdx % updatedRoster.length;
      const deadFish = updatedRoster[safeIdx];

      if (isHardcoreMode) {
        // Hardcore BẬT: Xóa vĩnh viễn con cá đang đấu khỏi inventory
        const nextInv = { ...rawInventory };
        if (deadFish._source === "aquarium" && Array.isArray(nextInv.aquarium)) {
          nextInv.aquarium = nextInv.aquarium.filter((f: any) => f.id !== deadFish.id);
        } else if (Array.isArray(nextInv.fish_inventory)) {
          nextInv.fish_inventory = nextInv.fish_inventory.filter((f: any) => f.id !== deadFish.id);
        }
        setRawInventory(nextInv);

        updatedRoster.splice(safeIdx, 1);
        setPlayerRoster(updatedRoster);
        setPlayerRosterIdx(0);

        if (user?.id) {
          await supabase
            .from("profiles")
            .update({ inventory: nextInv })
            .eq("id", user.id);
        }
      }

      if (hudRefs.current.resultBadge) {
        hudRefs.current.resultBadge.textContent = isHardcoreMode ? "💀 TỬ TRẬN - MẤT VĨNH VIỄN!" : "💀 THẤT TRẬN!";
        hudRefs.current.resultBadge.className =
          "font-arcade font-extrabold text-2xl sm:text-5xl italic tracking-wider text-rose-500 drop-shadow-[0_4px_16px_rgba(244,63,94,0.6)] mb-2";
      }
      if (hudRefs.current.resultSub) {
        hudRefs.current.resultSub.textContent = isHardcoreMode 
          ? `${deadFish.name} đã ngã xuống và vĩnh viễn biến mất khỏi hồ do bật chế độ Sinh Tử!` 
          : `${bs.playerFish.name} đã thua cuộc. Thử lại ở trận sau nhé!`;
      }
    }
  }

  function updateHUD() {
    const bs = battleRef.current;
    if (!bs.playerFish || !bs.rivalFish) return;

    const safeIdx = playerRoster.length > 0 ? playerRosterIdx % playerRoster.length : 0;

    if (hudRefs.current.pName) hudRefs.current.pName.textContent = bs.playerFish.name;
    if (hudRefs.current.pWeight) hudRefs.current.pWeight.textContent = formatFishWeight(playerRoster[safeIdx]?.weight || 2);
    if (hudRefs.current.pHpBar) hudRefs.current.pHpBar.style.width = `${(bs.playerFish.hp / bs.playerFish.maxHp) * 100}%`;
    if (hudRefs.current.pHpText) hudRefs.current.pHpText.textContent = `${bs.playerFish.hp} / ${bs.playerFish.maxHp}`;
    if (hudRefs.current.pKiBar) {
      hudRefs.current.pKiBar.style.width = `${(bs.playerFish.ki / bs.playerFish.maxKi) * 100}%`;
      hudRefs.current.pKiBar.classList.toggle("ki-full", bs.playerFish.ki >= 85);
    }

    if (hudRefs.current.eName) hudRefs.current.eName.textContent = bs.rivalFish.name;
    if (hudRefs.current.eWeight) hudRefs.current.eWeight.textContent = formatFishWeight(bs.rivalFish.weight);
    if (hudRefs.current.eHpBar) hudRefs.current.eHpBar.style.width = `${(bs.rivalFish.hp / bs.rivalFish.maxHp) * 100}%`;
    if (hudRefs.current.eHpText) hudRefs.current.eHpText.textContent = `${bs.rivalFish.hp} / ${bs.rivalFish.maxHp}`;
    if (hudRefs.current.eKiBar) {
      hudRefs.current.eKiBar.style.width = `${(bs.rivalFish.ki / bs.rivalFish.maxKi) * 100}%`;
      hudRefs.current.eKiBar.classList.toggle("ki-full", bs.rivalFish.ki >= 85);
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

    if (!bs.playerFish || !bs.rivalFish) return;

    for (let i = bs.projectiles.length - 1; i >= 0; i--) {
      const proj = bs.projectiles[i];
      proj.life -= dt;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      spawnParticles(proj.x, proj.y, proj.color, 1, 0.3);

      const target = proj.ownerIsPlayer ? bs.rivalFish : bs.playerFish;
      const attacker = proj.ownerIsPlayer ? bs.playerFish : bs.rivalFish;

      if (!bs.gameOver && Math.hypot(proj.x - target.x, proj.y - target.y) < 48) {
        spawnShockwave(proj.x, proj.y, proj.color, 75);
        spawnParticles(proj.x, proj.y, proj.color, 14, 0.9);
        applyDamage(attacker, target, proj.damage, false, `🔥 -${proj.damage}`);
        bs.projectiles.splice(i, 1);
        continue;
      }

      if (proj.life <= 0 || proj.x < -50 || proj.x > bs.width + 50) {
        bs.projectiles.splice(i, 1);
      }
    }

    bs.playerFish.homeX = bs.width * 0.27;
    bs.playerFish.homeY = bs.height * 0.54;
    bs.rivalFish.homeX = bs.width * 0.73;
    bs.rivalFish.homeY = bs.height * 0.54;

    if (bs.clashState && !bs.gameOver) {
      bs.clashState.timer -= dt;
      if (Math.random() < 0.75) {
        spawnParticles(bs.clashState.x, bs.clashState.y, "#facc15", 6, 1.3);
        spawnSlashArc(bs.clashState.x, bs.clashState.y, "#ffffff", Math.random() * Math.PI * 2);
        triggerShake(7, 0.08);
      }
      if (bs.clashState.timer <= 0) {
        const cx = bs.clashState.x;
        const cy = bs.clashState.y;
        bs.clashState = null;

        bs.playerFish.aiState = "CIRCLING";
        bs.rivalFish.aiState = "CIRCLING";
        bs.playerFish.aiTimer = 0.65;
        bs.rivalFish.aiTimer = 0.65;
        bs.playerFish.vx = -440;
        bs.rivalFish.vx = 440;

        if (bs.playerFish.fishClass === "TANKER" || bs.playerFish.fishClass === "BOSS") {
          applyDamage(bs.playerFish, bs.rivalFish, Math.round(bs.playerFish.atk * 0.6), true, "🛡️ ÁP ĐẢO ĐỌ LỰC!");
        } else if (bs.rivalFish.fishClass === "TANKER" || bs.rivalFish.fishClass === "BOSS") {
          applyDamage(bs.rivalFish, bs.playerFish, Math.round(bs.rivalFish.atk * 0.6), true, "🛡️ ÁP ĐẢO ĐỌ LỰC!");
        }

        bs.hitStopTimer = 0.06;
        triggerFlash("#fde047", 0.45);
        triggerShake(18, 0.38);
        spawnShockwave(cx, cy, "#ffffff", 190);
        spawnParticles(cx, cy, "#facc15", 42, 1.5);
        spawnFloatingText(cx, cy - 38, "⚡ ĐỌ LỰC BÙNG NỔ! ⚡", "#fde047", 21);
        spawnGlassCrack(cx, cy);
      }
      updateHUD();
      return;
    }

    updateSingleFish(bs.playerFish, bs.rivalFish, dt);
    updateSingleFish(bs.rivalFish, bs.playerFish, dt);

    if (!bs.gameOver) {
      const dist = Math.hypot(bs.playerFish.x - bs.rivalFish.x, bs.playerFish.y - bs.rivalFish.y);
      if (dist < 78) {
        if (bs.playerFish.aiState === "DASH_ATTACK" && bs.rivalFish.aiState === "DASH_ATTACK") {
          const midX = (bs.playerFish.x + bs.rivalFish.x) / 2;
          const midY = (bs.playerFish.y + bs.rivalFish.y) / 2;
          bs.playerFish.x = midX - 34;
          bs.rivalFish.x = midX + 34;
          bs.playerFish.vx = 0;
          bs.rivalFish.vx = 0;
          bs.playerFish.aiState = "CLASH";
          bs.rivalFish.aiState = "CLASH";
          bs.clashState = { x: midX, y: midY, timer: 0.72 };
          sayQuote(bs.playerFish, "GỪ... KHÔNG LÙI BƯỚC!");
          sayQuote(bs.rivalFish, "AI MẠNH HƠN BIẾT LIỀN!");
        } else if (bs.playerFish.aiState === "DASH_ATTACK") {
          bs.playerFish.aiState = "CIRCLING";
          bs.playerFish.aiTimer = 0.6 + Math.random() * 0.4;
          bs.playerFish.vx = -250;
          const mult = bs.playerFish.activeSkill?.powerMult || 1.25;
          const critChance = bs.playerFish.fishClass === "ASSASSIN" ? 0.42 : 0.24;
          const isCrit = bs.playerFish.powerBuff > 1.15 || Math.random() < critChance;
          const dmg = Math.round(bs.playerFish.atk * mult * bs.playerFish.powerBuff * (isCrit ? 1.35 : 1));
          bs.playerFish.powerBuff = 1.0;
          spawnSlashArc(bs.rivalFish.x, bs.rivalFish.y, bs.playerFish.auraColor, 0.35);
          applyDamage(bs.playerFish, bs.rivalFish, dmg, isCrit);
        } else if (bs.rivalFish.aiState === "DASH_ATTACK") {
          bs.rivalFish.aiState = "CIRCLING";
          bs.rivalFish.aiTimer = 0.6 + Math.random() * 0.4;
          bs.rivalFish.vx = 250;
          const mult = bs.rivalFish.activeSkill?.powerMult || 1.25;
          const critChance = bs.rivalFish.fishClass === "ASSASSIN" ? 0.42 : 0.24;
          const isCrit = bs.rivalFish.powerBuff > 1.15 || Math.random() < critChance;
          const dmg = Math.round(bs.rivalFish.atk * mult * bs.rivalFish.powerBuff * (isCrit ? 1.35 : 1));
          bs.rivalFish.powerBuff = 1.0;
          spawnSlashArc(bs.playerFish.x, bs.playerFish.y, bs.rivalFish.auraColor, -0.35);
          applyDamage(bs.rivalFish, bs.playerFish, dmg, isCrit);
        }
      }
    }
    updateHUD();
  }

  function updateSingleFish(fish: any, opponent: any, dt: number) {
    const bs = battleRef.current;
    fish.swimPhase += dt * (fish.aiState === "CHARGING" ? 20 : 8);
    if (fish.flashTimer > 0) fish.flashTimer = Math.max(0, fish.flashTimer - dt);
    fish.currentScale += (fish.baseScale - fish.currentScale) * 5 * dt;

    if (fish.speechTimer > 0) {
      fish.speechTimer -= dt;
      if (fish.speechTimer <= 0) fish.speech = null;
    }

    if (!bs.gameOver && fish.aiState === "TELEPORT_COMBO") {
      fish.comboTimer -= dt;
      if (fish.comboTimer <= 0) {
        fish.comboStep++;
        const maxSteps = fish.comboMaxSteps || 3;
        if (fish.comboStep <= maxSteps) {
          const side = fish.comboStep % 2 === 1 ? -1 : 1;
          const offsetY = (fish.comboStep - 2) * 32;
          fish.x = opponent.x + side * 62;
          fish.y = opponent.y + offsetY;
          fish.dir = -side;

          bs.afterimages.push({
            x: fish.x,
            y: fish.y,
            dir: fish.dir,
            scale: fish.currentScale,
            filename: fish.filename,
            color: fish.auraColor,
            life: 0.26,
            maxLife: 0.26,
          });

          const mult = fish.activeSkill?.powerMult || 1.45;
          const hitDmg = Math.round((fish.atk * mult * fish.powerBuff) / maxSteps);
          const isFinisher = fish.comboStep === maxSteps;
          spawnSlashArc(opponent.x, opponent.y, fish.auraColor, side * 0.6);
          applyDamage(
            fish,
            opponent,
            isFinisher ? Math.round(hitDmg * 1.45) : hitDmg,
            isFinisher,
            isFinisher ? `⚡ KẾT LIỄU -${Math.round(hitDmg * 1.45)}!` : `⚔️ -${hitDmg}`
          );
          fish.comboTimer = 0.16;
        } else {
          fish.powerBuff = 1.0;
          fish.aiState = "CIRCLING";
          fish.aiTimer = 0.52;
          fish.vx = (fish.isPlayer ? -1 : 1) * 320;
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
    }

    if (!bs.gameOver) {
      fish.ki = Math.min(fish.maxKi, fish.ki + fish.kiGain * dt);
      fish.aiTimer -= dt;
      if (fish.aiTimer <= 0) {
        if (fish.aiState !== "CIRCLING") {
          fish.aiState = "CIRCLING";
          fish.aiTimer = 0.45 + Math.random() * 0.42;
        } else {
          decideNextAiAction(fish, opponent);
        }
      }
    }

    if (fish.aiState !== "DASH_ATTACK") {
      const bobX = Math.cos(fish.swimPhase * 0.6) * 20;
      const bobY = Math.sin(fish.swimPhase * 0.9) * 22;
      const targetX = fish.homeX + bobX;
      const targetY = fish.homeY + bobY;

      fish.vx += (targetX - fish.x) * 8 * dt;
      fish.vy += (targetY - fish.y) * 8 * dt;
      fish.vx *= 0.85;
      fish.vy *= 0.85;
      fish.dir = opponent.x >= fish.x ? 1 : -1;
    }

    fish.x += fish.vx * dt;
    fish.y += fish.vy * dt;

    const marginX = 65;
    const marginY = 60;
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
      rayGrad.addColorStop(0, "rgba(186, 230, 253, 0.16)");
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
    drawArenaRing(ctx, time);

    for (const b of bs.bubbles) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(224, 242, 254, 0.45)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
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
        const drawW = 120;
        const drawH = drawW / (ratio || 1.33);
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      }
      ctx.restore();
    }

    if (bs.playerFish) drawFishFighter(ctx, bs.playerFish, time);
    if (bs.rivalFish) drawFishFighter(ctx, bs.rivalFish, time);

    for (const proj of bs.projectiles) {
      ctx.save();
      const grad = ctx.createRadialGradient(proj.x, proj.y, 2, proj.x, proj.y, proj.radius * 1.8);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.45, proj.color);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius * 1.8, 0, Math.PI * 2);
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
      ctx.lineWidth = 8 * alpha + 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, sl.radius, -0.9, 0.9);
      ctx.stroke();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3 * alpha + 1;
      ctx.beginPath();
      ctx.arc(0, 0, sl.radius, -0.7, 0.7);
      ctx.stroke();
      ctx.restore();
    }

    if (bs.clashState) drawClashOrb(ctx, bs.clashState, time);
    if (bs.activeUltVfx) drawUltimateVfx(ctx, bs.activeUltVfx, time);

    for (const sw of bs.shockwaves) {
      const alpha = Math.max(0, sw.life / sw.maxLife);
      ctx.save();
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 4 * alpha + 1;
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

    if (bs.playerFish && bs.playerFish.speech) drawSpeechBubble(ctx, bs.playerFish);
    if (bs.rivalFish && bs.rivalFish.speech) drawSpeechBubble(ctx, bs.rivalFish);

    for (const ft of bs.floatingTexts) {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${ft.size}px "Chakra Petch", sans-serif`;
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(2, 6, 23, 0.85)";
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    for (const crack of bs.glassCracks) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${crack.alpha})`;
      ctx.lineWidth = 1.5;
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

  function drawArenaRing(ctx: CanvasRenderingContext2D, time: number) {
    const { width, height } = battleRef.current;
    const cx = width * 0.5;
    const cy = height * 0.54;
    const rx = Math.min(width * 0.36, 230);
    const ry = Math.min(height * 0.32, 115);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.lineDashOffset = -time * 28;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawClashOrb(ctx: CanvasRenderingContext2D, clash: any, time: number) {
    ctx.save();
    ctx.translate(clash.x, clash.y);
    const pulse = 30 + Math.sin(time * 50) * 10;
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, pulse * 1.8);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.45, "#facc15");
    grad.addColorStop(1, "rgba(249, 115, 22, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, pulse * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFishFighter(ctx: CanvasRenderingContext2D, fish: any, time: number) {
    ctx.save();
    ctx.translate(fish.x, fish.y);

    const kiRatio = fish.ki / fish.maxKi;
    const isCharging = fish.aiState === "CHARGING";
    const showAura = kiRatio > 0.35 || isCharging || fish.powerBuff > 1.1;

    if (showAura) {
      const auraScale = (isCharging ? 1.42 : 0.98 + kiRatio * 0.35) * fish.currentScale;
      ctx.save();
      ctx.scale(auraScale, auraScale);

      const flameCount = 14;
      ctx.beginPath();
      for (let i = 0; i <= flameCount; i++) {
        const angle = (i / flameCount) * Math.PI * 2;
        const flicker = Math.sin(time * 26 + i * 1.7) * 11;
        const radX = 72 + flicker;
        const radY = 46 + flicker * 0.7;
        const px = Math.cos(angle) * radX;
        const py = Math.sin(angle) * radY - 6;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const auraGrad = ctx.createRadialGradient(0, 0, 12, 0, 0, 82);
      auraGrad.addColorStop(0, "#ffffff");
      auraGrad.addColorStop(0.45, fish.auraColor);
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
      const drawW = 120;
      const drawH = drawW / (ratio || 1.33);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.fillStyle = "rgba(250, 204, 21, 0.85)";
      ctx.fillRect(-40, -25, 80, 50);

      ctx.save();
      ctx.scale(-fish.dir, 1);
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(fish.name || "Cá", 0, 4);
      ctx.restore();
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
        ctx.lineWidth = 10 * alpha + 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        pts.forEach((p: any, idx: number) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4 * alpha + 1;
        ctx.beginPath();
        pts.forEach((p: any, idx: number) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
      }
      const boomR = 30 + progress * 95;
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
        ctx.lineWidth = m.r * 1.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.sx, m.sy);
        ctx.lineTo(cx, cy);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx, cy, m.r * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (vfx.type === "poison") {
      const rad = 25 + progress * 135;
      const pGrad = ctx.createRadialGradient(vfx.x2, vfx.y2, 10, vfx.x2, vfx.y2, rad);
      pGrad.addColorStop(0, "#ffffff");
      pGrad.addColorStop(0.45, "#4ade80");
      pGrad.addColorStop(0.8, "#15803d");
      pGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(vfx.x2, vfx.y2, rad, 0, Math.PI * 2);
      ctx.fill();
    } else if (vfx.type === "whirlpool") {
      ctx.translate(vfx.x2, vfx.y2);
      ctx.rotate(time * 18);
      for (let ring = 1; ring <= 4; ring++) {
        ctx.strokeStyle = ring % 2 === 0 ? "#ffffff" : vfx.color;
        ctx.lineWidth = 6 * alpha + 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, ring * 26 * (0.6 + progress * 0.5), ring * 16 * (0.6 + progress * 0.5), ring * 0.5, 0, Math.PI * 1.7);
        ctx.stroke();
      }
    } else {
      ctx.lineCap = "round";
      ctx.strokeStyle = vfx.color;
      ctx.lineWidth = 52 * alpha + 14;
      ctx.beginPath();
      ctx.moveTo(vfx.x1, vfx.y1);
      ctx.lineTo(vfx.x2, vfx.y2);
      ctx.stroke();

      ctx.strokeStyle = vfx.core || "#ffffff";
      ctx.lineWidth = 22 * alpha + 5;
      ctx.beginPath();
      ctx.moveTo(vfx.x1, vfx.y1);
      ctx.lineTo(vfx.x2, vfx.y2);
      ctx.stroke();

      const orbR = 36 * alpha + 12;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(vfx.x1, vfx.y1, orbR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSpeechBubble(ctx: CanvasRenderingContext2D, fish: any) {
    const text = fish.speech;
    if (!text) return;
    const { width } = battleRef.current;

    ctx.save();
    ctx.font = '700 12px "Inter", sans-serif';
    const padX = 10;
    const textW = ctx.measureText(text).width;
    const boxW = textW + padX * 2;
    const boxH = 26;

    let bx = fish.x - boxW / 2;
    let by = fish.y - 68;
    bx = Math.max(8, Math.min(width - boxW - 8, bx));
    by = Math.max(8, by);

    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
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

  const filteredRoster = playerRoster.filter((f) => {
    if (pickerFilter === "all") return true;
    return f._source === pickerFilter;
  });

  const activePlayerFish = playerRoster.length > 0 ? playerRoster[playerRosterIdx % playerRoster.length] : null;
  const activeTierBadge = activePlayerFish ? TIER_META[detectFishTier(activePlayerFish)].badge : "Lọc theo tầng";

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 font-sans select-none flex flex-col justify-between p-2 sm:p-3 text-white">
      {/* MODAL CHỌN CÁ TỪ KHO CÁ / HỒ CÁ (HIỂN THỊ CLASS & 4 SKILL RIÊNG) */}
      {isFishPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3">
          <div className="bg-slate-900 border-2 border-emerald-400/70 w-full max-w-4xl max-h-[88vh] rounded-3xl p-4 sm:p-6 shadow-[0_0_40px_rgba(16,185,129,0.35)] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🐟</span>
                <div>
                  <h2 className="text-base sm:text-xl font-black text-emerald-300 uppercase tracking-wider">
                    Kho Cá Chiến Đấu ({playerRoster.length} con)
                  </h2>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    Mỗi con sở hữu 4 Skill ngẫu nhiên theo Class riêng biệt!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFishPickerOpen(false)}
                className="bg-slate-800 hover:bg-rose-600 text-white font-black w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer text-sm"
              >
                ✕
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

            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredRoster.length === 0 ? (
                <div className="col-span-full text-center text-slate-400 py-12 font-bold text-sm">
                  Không có con cá nào trong mục này!
                </div>
              ) : (
                filteredRoster.map((fish) => {
                  const realIndex = playerRoster.findIndex((item) => item.id === fish.id);
                  const isActive = realIndex === playerRosterIdx % (playerRoster.length || 1);
                  const meta = CLASS_META[fish.fishClass as FishClassType] || CLASS_META.WARRIOR;
                  const fishTierLabel = TIER_META[detectFishTier(fish)].label;

                  return (
                    <div
                      key={fish.id}
                      onClick={() => {
                        setPlayerRosterIdx(realIndex);
                        setCurrentEnemyCfg(buildSameTierEnemyConfig(fish));
                        setIsFishPickerOpen(false);
                      }}
                      className={`relative bg-slate-950 rounded-2xl p-3 flex flex-col justify-between cursor-pointer border-2 transition-all hover:scale-[1.01] ${
                        isActive
                          ? "border-amber-400 ring-2 ring-amber-400/40 bg-amber-950/20"
                          : "border-slate-800 hover:border-emerald-400/60"
                      }`}
                    >
                      <div className="flex justify-between items-center gap-1 mb-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${meta.badgeBg}`}>
                          {meta.icon} {meta.label}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {fishTierLabel} • {fish.rank || "D"}
                        </span>
                      </div>

                      <div className="h-14 flex items-center justify-center my-1">
                        <img
                          src={
                            fish.filename.startsWith("http") || fish.filename.startsWith("/")
                              ? fish.filename
                              : `/assets/cauca/${fish.filename}`
                          }
                          onError={(e) => {
                            const target = e.currentTarget;
                            const step = Number(target.dataset.retryStep || 0);
                            const slug = normalizeFishSlug(fish.name);
                            if (step === 0 && slug) {
                              target.dataset.retryStep = "1";
                              target.src = `/assets/cauca/${slug}.png`;
                            } else if (step === 1) {
                              target.dataset.retryStep = "2";
                              target.src = "/assets/cauca/camaptrang.png";
                            }
                          }}
                          alt={fish.name}
                          className="max-h-full object-contain drop-shadow-md"
                        />
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-white truncate text-center mb-1.5">
                          {fish.name} {fish.gender}
                        </h4>

                        <div className="grid grid-cols-3 gap-1 text-center bg-slate-900 rounded-lg p-1 text-[10px] font-bold border border-slate-800 mb-2">
                          <span className="text-amber-300">⚖️ {formatFishWeight(fish.weight)}</span>
                          <span className="text-emerald-400">❤️ {fish.maxHp}</span>
                          <span className="text-rose-400">⚔️ {fish.atk}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-1">
                          {(fish.skills || []).slice(0, 4).map((sk: FishSkill, i: number) => (
                            <div
                              key={i}
                              className="bg-slate-900/90 border border-slate-800 rounded px-1.5 py-1 text-[9px] font-bold truncate"
                              style={{ color: sk.color }}
                              title={sk.desc}
                            >
                              ⚡ {sk.name}
                            </div>
                          ))}
                        </div>
                      </div>

                      {isActive && (
                        <div className="mt-2 text-center bg-amber-400 text-slate-950 font-black text-[10px] py-1 rounded-lg uppercase">
                          Đang Xuất Trận
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER HUDS */}
      <header className="w-full max-w-4xl mx-auto z-10 flex flex-col gap-1.5 bg-slate-900/85 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-2.5 sm:p-3 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          {/* PLAYER FISH HUD */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5 truncate">
                <Link
                  href="/caucamulti/hoca"
                  className="bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 rounded-md text-[10px] font-black border border-cyan-500/40 shrink-0"
                >
                  ← Hồ
                </Link>
                <span ref={(el) => { hudRefs.current.pDot = el; }} className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
                <span ref={(el) => { hudRefs.current.pName = el; }} className="font-arcade font-bold text-xs sm:text-base text-amber-300 truncate">
                  Cá Nhà
                </span>
                <span ref={(el) => { hudRefs.current.pClassBadge = el; }} className="text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-800 text-slate-200 border border-slate-700 shrink-0">
                  🔥 Đấu Sĩ
                </span>
              </div>
              <span ref={(el) => { hudRefs.current.pWeight = el; }} className="text-[11px] sm:text-xs font-semibold text-cyan-300 shrink-0">
                0 kg
              </span>
            </div>
            <div className="w-full h-3.5 sm:h-4 bg-slate-800 rounded-full p-0.5 border border-slate-700 overflow-hidden relative">
              <div ref={(el) => { hudRefs.current.pHpBar = el; }} className="h-full bg-gradient-to-r from-emerald-500 to-lime-400 rounded-full transition-all duration-150" style={{ width: "100%" }}></div>
              <span ref={(el) => { hudRefs.current.pHpText = el; }} className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
                1000 / 1000
              </span>
            </div>
            <div className="w-full h-2 sm:h-2.5 bg-slate-800 rounded-full mt-1 p-0.5 border border-slate-700 overflow-hidden relative">
              <div ref={(el) => { hudRefs.current.pKiBar = el; }} className="h-full bg-gradient-to-r from-amber-500 via-yellow-300 to-white rounded-full transition-all duration-100" style={{ width: "20%" }}></div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center justify-center px-1.5">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[9px] sm:text-[10px] font-arcade font-bold text-amber-300 tracking-wider">
              AUTO AI
            </span>
            <span className="font-arcade font-extrabold text-base sm:text-xl italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-red-500 leading-tight">
              VS
            </span>
            <span ref={(el) => { hudRefs.current.streakText = el; }} className="text-[10px] font-bold text-emerald-400">
              Chuỗi: {winStreak}🔥
            </span>
          </div>

          {/* ENEMY FISH HUD */}
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-baseline justify-between gap-1 mb-1 flex-row-reverse">
              <div className="flex items-center gap-1.5 truncate flex-row-reverse">
                <span ref={(el) => { hudRefs.current.eDot = el; }} className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0"></span>
                <span ref={(el) => { hudRefs.current.eName = el; }} className="font-arcade font-bold text-xs sm:text-base text-cyan-300 truncate">
                  Đối Thủ
                </span>
                <span ref={(el) => { hudRefs.current.eClassBadge = el; }} className="text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-800 text-rose-300 border border-rose-500/40 shrink-0">
                  ⚔️ Đấu Sĩ
                </span>
              </div>
              <span ref={(el) => { hudRefs.current.eWeight = el; }} className="text-[11px] sm:text-xs font-semibold text-amber-300 shrink-0">
                0 kg
              </span>
            </div>
            <div className="w-full h-3.5 sm:h-4 bg-slate-800 rounded-full p-0.5 border border-slate-700 overflow-hidden relative">
              <div ref={(el) => { hudRefs.current.eHpBar = el; }} className="h-full bg-gradient-to-l from-rose-500 to-orange-400 rounded-full transition-all duration-150 ml-auto" style={{ width: "100%" }}></div>
              <span ref={(el) => { hudRefs.current.eHpText = el; }} className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
                1000 / 1000
              </span>
            </div>
            <div className="w-full h-2 sm:h-2.5 bg-slate-800 rounded-full mt-1 p-0.5 border border-slate-700 overflow-hidden relative">
              <div ref={(el) => { hudRefs.current.eKiBar = el; }} className="h-full bg-gradient-to-l from-cyan-400 via-sky-300 to-white rounded-full transition-all duration-100 ml-auto" style={{ width: "20%" }}></div>
            </div>
          </div>
        </div>
      </header>

      {/* CANVAS CONTAINER */}
      <main ref={containerRef} className="relative flex-1 w-full max-w-4xl mx-auto my-2 rounded-2xl overflow-hidden border-2 border-cyan-400/40 shadow-[0_0_30px_rgba(6,182,212,0.2)] bg-sky-950">
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-pointer"
          onClick={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            const tapX = e.clientX - rect.left;
            const tapY = e.clientY - rect.top;
            spawnShockwave(tapX, tapY, "#bae6fd", 55);
            spawnParticles(tapX, tapY, "#fde047", 8, 0.5);
            const bs = battleRef.current;
            if (!bs.gameOver && !isScanning && bs.playerFish) {
              bs.playerFish.ki = Math.min(bs.playerFish.maxKi, bs.playerFish.ki + 6);
              spawnFloatingText(tapX, tapY - 12, "❤️ +6% Ki Cổ Vũ!", "#fde047", 14);
              updateHUD();
            }
          }}
        ></canvas>

        <div className="pointer-events-none absolute top-2.5 left-1/2 -translate-x-1/2 bg-slate-950/65 backdrop-blur-sm border border-white/15 px-3 py-1 rounded-full text-[11px] sm:text-xs text-cyan-100 whitespace-nowrap flex items-center gap-1.5">
          <span>🍿 Tự động chiến đấu!</span>
          <span className="text-amber-300 font-semibold">Gõ kính để cổ vũ +6% Ki</span>
        </div>

        {/* ULTIMATE CUT-IN BANNER */}
        <div ref={(el) => { hudRefs.current.ultCutIn = el; }} className="pointer-events-none hidden absolute inset-x-0 top-1/4 flex items-center justify-center z-10">
          <div className="px-6 py-2 bg-gradient-to-r from-transparent via-amber-500/90 to-transparent border-y-2 border-yellow-200 text-center transform -skew-x-12 shadow-2xl">
            <div ref={(el) => { hudRefs.current.ultCasterName = el; }} className="text-[11px] font-bold uppercase tracking-widest text-slate-950">
              CÁ NHÀ
            </div>
            <div ref={(el) => { hudRefs.current.ultSkillTitle = el; }} className="font-arcade font-extrabold text-xl sm:text-3xl text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
              ⚡ TUYỆT KỸ!
            </div>
          </div>
        </div>

        {/* RADAR SCANNING OVERLAY */}
        <div ref={(el) => { hudRefs.current.radarOverlay = el; }} className="hidden absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-20">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-cyan-400/60 flex items-center justify-center mb-4 bg-cyan-950/40 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
            <span className="text-3xl">📡</span>
          </div>
          <div className="font-arcade font-bold text-lg sm:text-2xl text-cyan-300 tracking-wide">ĐANG QUÉT THỦY QUÁI...</div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Tìm kiếm đối thủ xứng tầm trong đại dương</p>
        </div>

        {/* VICTORY / DEFEAT BANNER */}
        <div ref={(el) => { hudRefs.current.resultOverlay = el; }} className="hidden absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20">
          <div ref={(el) => { hudRefs.current.resultBadge = el; }} className="font-arcade font-extrabold text-3xl sm:text-5xl italic tracking-wider text-yellow-400 drop-shadow-[0_4px_16px_rgba(250,204,21,0.6)] mb-2">
            🏆 CHIẾN THẮNG!
          </div>
          <p ref={(el) => { hudRefs.current.resultSub = el; }} className="text-sm sm:text-base text-slate-200 max-w-md mb-5">
            Cá Nhà đã hạ gục đối thủ! Nhận +500 Xu &amp; +0.8 kg!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={startMatch}
              className="bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 font-arcade font-bold px-4 py-2.5 rounded-xl shadow-lg border-b-4 border-emerald-800 text-xs sm:text-sm cursor-pointer"
            >
              ⚔️ Đấu Tiếp
            </button>
            <button
              onClick={scanSameTierEnemy}
              className="bg-gradient-to-b from-cyan-400 to-blue-600 text-white font-arcade font-bold px-4 py-2.5 rounded-xl shadow-lg border-b-4 border-blue-900 text-xs sm:text-sm cursor-pointer"
            >
              📡 Quét Cùng Tầng
            </button>
            <button
              onClick={scanBossEnemy}
              className="bg-gradient-to-b from-rose-500 to-red-700 text-white font-arcade font-bold px-4 py-2.5 rounded-xl shadow-lg border-b-4 border-red-950 text-xs sm:text-sm cursor-pointer"
            >
              👑 Săn Boss (+1,500 Xu)
            </button>
            <button
              onClick={() => setIsFishPickerOpen(true)}
              className="bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 font-arcade font-bold px-4 py-2.5 rounded-xl shadow-lg border-b-4 border-orange-800 text-xs sm:text-sm cursor-pointer"
            >
              🐟 Mở Kho Cá
            </button>
          </div>
        </div>
      </main>

      {/* FOOTER CONTROLS (5 NÚT: TỐC ĐỘ, QUÉT CÙNG TẦNG, SĂN BOSS, ĐỔI CÁ NHÀ, SINH TỬ) */}
      <footer className="w-full max-w-4xl mx-auto z-10 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
        <button
          onClick={() => setSimSpeed((s) => (s === 1 ? 2 : s === 2 ? 3 : 1))}
          className="flex flex-col items-center justify-center bg-gradient-to-b from-amber-400 to-orange-500 border-b-4 border-orange-800 rounded-xl p-2 text-slate-950 shadow-lg cursor-pointer active:scale-95 transition"
        >
          <span className="text-base sm:text-lg leading-none mb-0.5">⏩</span>
          <span className="font-arcade font-bold text-xs leading-tight">Tốc Độ: {simSpeed}x</span>
          <span className="text-[9px] text-orange-950 font-bold">Chạm để tua nhanh</span>
        </button>

        <button
          onClick={scanSameTierEnemy}
          className="flex flex-col items-center justify-center bg-gradient-to-b from-cyan-400 to-blue-600 border-b-4 border-blue-900 rounded-xl p-2 text-white shadow-lg cursor-pointer active:scale-95 transition"
        >
          <span className="text-base sm:text-lg leading-none mb-0.5">📡</span>
          <span className="font-arcade font-bold text-xs leading-tight">Quét PvE Cùng Tầng</span>
          <span className="text-[9px] text-sky-100 font-semibold truncate max-w-full px-1">
            {activeTierBadge}
          </span>
        </button>

        <button
          onClick={scanBossEnemy}
          className="flex flex-col items-center justify-center bg-gradient-to-b from-rose-500 to-red-700 border-b-4 border-red-950 rounded-xl p-2 text-white shadow-lg cursor-pointer active:scale-95 transition"
        >
          <span className="text-base sm:text-lg leading-none mb-0.5">👑</span>
          <span className="font-arcade font-bold text-xs leading-tight">Săn Boss Thượng Cổ</span>
          <span className="text-[9px] text-rose-100 font-semibold">Scale máu • +1,500 Xu</span>
        </button>

        <button
          onClick={() => {
            if (isScanning) return;
            setIsFishPickerOpen(true);
          }}
          className="flex flex-col items-center justify-center bg-gradient-to-b from-emerald-400 to-teal-600 border-b-4 border-teal-900 rounded-xl p-2 text-slate-950 shadow-lg cursor-pointer active:scale-95 transition"
        >
          <span className="text-base sm:text-lg leading-none mb-0.5">🐟</span>
          <span className="font-arcade font-bold text-xs leading-tight">Đổi Cá Nhà</span>
          <span ref={(el) => { hudRefs.current.playerRosterLabel = el; }} className="text-[9px] text-teal-950 font-bold">
            {(playerRosterIdx % (playerRoster.length || 1)) + 1} / {playerRoster.length || 1} Cá Cưng
          </span>
        </button>

        <button
          onClick={() => setIsHardcoreMode(!isHardcoreMode)}
          className={`flex flex-col items-center justify-center border-b-4 rounded-xl p-2 shadow-lg cursor-pointer active:scale-95 transition col-span-2 sm:col-span-1 ${
            isHardcoreMode
              ? "bg-gradient-to-b from-rose-600 to-red-900 border-red-950 text-white animate-pulse"
              : "bg-gradient-to-b from-slate-700 to-slate-900 border-slate-950 text-slate-300"
          }`}
        >
          <span className="text-base sm:text-lg leading-none mb-0.5">💀</span>
          <span className="font-arcade font-bold text-xs leading-tight">
            Sinh Tử: {isHardcoreMode ? "BẬT" : "TẮT"}
          </span>
          <span className="text-[9px] font-semibold opacity-80">
            {isHardcoreMode ? "Thua là mất vĩnh viễn!" : "Đánh thường an toàn"}
          </span>
        </button>

        {/* 🏟️ NÚT MỞ PHÒNG REALTIME TRÊN FOOTER */}
        <button
          onClick={() => setIsRoomLobbyOpen(true)}
          className="flex flex-col items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-700 border-b-4 border-indigo-950 rounded-xl p-2 text-white shadow-lg cursor-pointer active:scale-95 transition col-span-2 sm:col-span-1"
        >
          <span className="text-base sm:text-lg leading-none mb-0.5">🏟️</span>
          <span className="font-arcade font-bold text-xs leading-tight">
            {currentRoomId ? `Phòng: ${currentRoomId}` : "Chọn Phòng Đấu"}
          </span>
          <span className="text-[9px] text-indigo-200 font-semibold">
            {currentRoomId ? "Đang kết nối" : "Đọ cá Realtime"}
          </span>
        </button>
      </footer>

      {/* 🏟️ MODAL CHỌN 3 PHÒNG REALTIME */}
      {isRoomLobbyOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-purple-500/50 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-arcade font-bold text-yellow-400">🏟️ CHỌN PHÒNG ĐỌ CÁ REALTIME</h3>
              <button 
                onClick={() => setIsRoomLobbyOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Chọn phòng để kết nối trực tiếp với các anh em khác trên Supabase[cite: 3, 4] và cùng so tài cá cưng!
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
                    <div className="text-[10px] opacity-80 font-normal">Trạng thái: Sẵn sàng kết nối</div>
                  </div>
                  <span className="text-xs bg-slate-950 px-3 py-1.5 rounded-lg text-yellow-300 font-arcade">
                    VÀO NGAY
                  </span>
                </button>
              ))}

              {currentRoomId && (
                <button
                  onClick={() => {
                    leaveMultiplayerRoom();
                    setIsRoomLobbyOpen(false);
                  }}
                  className="mt-2 p-3 bg-red-600/30 border border-red-500/50 hover:bg-red-600/50 rounded-xl font-bold text-red-300 text-xs transition cursor-pointer"
                >
                  🚪 Rời khỏi phòng hiện tại ({currentRoomId})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}